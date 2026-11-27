"""Benchmark continuous template scans on the original development and held-out scenes.
Run with Python 3.12, NumPy and Node. No model fitting, Torch, browser or GPU required.
"""
import argparse
import json
from pathlib import Path
import platform
import subprocess
import tempfile

import numpy as np
from evaluate import choose, matches, metrics
from scenes import RATE, ROOT, SPLIT_SIZE, Recordings


def enrollment(source, profile):
    if profile == "station":
        takes = [r for r in source.rows if r["id"] in {"36838", "36839"}]
    else:
        takes = [r for r in source.rows if r["kind"] == "buckle" and r["split"] == "train"]
    bank = {"rate": RATE, "anchor": 240, "takes": []}
    for row in takes:
        anchor = row["anchor_sample"]
        clip = source.signals[row["key"]][anchor-240:anchor+400]
        assert len(clip) == 640
        bank["takes"].append({"source":row["id"], "pcm":np.rint(clip*32768).astype(int).tolist()})
    return bank


def stream(rows, folder, profile, method):
    model = ROOT / "results" / profile / "model.json"
    command = ["node", str(ROOT/"lab/template_run.mjs"), str(folder/"rows.json"),
               str(model), str(folder/"bank.json"), method]
    out = subprocess.run(command, check=True, capture_output=True, text=True)
    records = [json.loads(line) for line in out.stdout.splitlines()]
    assert len(records) == len(rows)
    return records


def overlapping_hits(rows, legacy, proposal, threshold):
    counts = dict(both=0, onlyEnergy=0, onlyTemplate=0, neither=0)
    for row, old, new in zip(rows, legacy, proposal, strict=True):
        truth = row["targets"]
        before = {i for i,_ in matches(truth,old["events"])}
        after = {i for i,_ in matches(truth,[e for e in new["events"] if e["score"] >= threshold])}
        counts["both"] += len(before & after)
        counts["onlyEnergy"] += len(before - after)
        counts["onlyTemplate"] += len(after - before)
        counts["neither"] += len(truth) - len(before | after)
    return counts


def equal_recall(rows, output, key):
    """Descriptive held-out ranking only. These cutoffs never enter the deployed bank."""
    scores = sorted({e[key] for r in output for e in r["events"]})
    n = sum(len(r["targets"]) for r in rows)
    result = {}
    for percent in (80, 90):
        target = (n*percent + 99)//100
        lo, hi = 0, len(scores)
        while lo < hi:
            mid = (lo+hi)//2
            if metrics(rows,output,key,scores[mid])["tp"] >= target:
                lo = mid+1
            else:
                hi = mid
        value = metrics(rows,output,key,scores[lo-1]) if lo else None
        result[str(percent)] = {k:value[k] for k in ("tp","fp","fn")} if value else None
    return result


def evaluate(profile, output):
    source = Recordings()
    bank = enrollment(source, profile)
    frozen = json.loads((ROOT/"results"/profile/"benchmark.json").read_text())
    model = json.loads((ROOT/"results"/profile/"model.json").read_text())
    thresholds, report = {}, {}
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        (folder/"bank.json").write_text(json.dumps(bank))
        for split in ("dev","test"):
            rows = []
            for i in range(SPLIT_SIZE[split]):
                pcm, row = source.scene(split, i, profile=profile)
                path = folder/(row["id"]+".pcm")
                pcm.tofile(path)
                rows.append({**row,"path":str(path)})
            (folder/"rows.json").write_text(json.dumps(rows))
            seconds = sum(r["duration"] for r in rows)
            legacy = stream(rows,folder,profile,"legacy")
            base = metrics(rows,legacy,"gateDb",float("-inf"))
            gate = metrics(rows,legacy,"gateDb",model["gateThresholdDb"])
            verified = metrics(rows,legacy,"score",model["scoreThreshold"])
            for key, measured in (("gate",gate),("verifier",verified)):
                for count in ("tp","fp","fn"):
                    assert measured[count] == frozen["metrics"][split][key][count]
            result = dict(seconds=seconds, energyProposals=base, gate=gate, verifier=verified,
                          legacyRtf=sum(r["computeMs"] for r in legacy)/(1000*seconds))
            if split == "test":
                result["equalRecall"] = {name:equal_recall(rows,legacy,key)
                                         for name,key in (("gate","gateDb"),("verifier","score"))}
            for method in ("coherent","spectral"):
                proposals = stream(rows,folder,profile,method)
                if split == "dev":
                    sensitive, quiet = choose(rows,proposals,"score")
                    values = sorted((e["score"] for r in proposals for e in r["events"]), reverse=True)
                    budget = base["tp"]+base["fp"]
                    boundary = values[min(len(values),budget)-1]
                    thresholds[method] = dict(sensitive=sensitive, quiet=quiet, budget=boundary)
                t = thresholds[method]
                result[method] = {k:metrics(rows,proposals,"score",v) for k,v in t.items()}
                result[method]["budgetOverlap"] = overlapping_hits(rows,legacy,proposals,t["budget"])
                result[method]["rtf"] = sum(r["computeMs"] for r in proposals)/(1000*seconds)
                cascade = method+"Verified"
                bank["thresholds"] = thresholds
                (folder/"bank.json").write_text(json.dumps(bank))
                scored = stream(rows,folder,profile,cascade)
                if split == "dev":
                    sensitive, quiet = choose(rows,scored,"score")
                    thresholds[cascade] = dict(sensitive=sensitive, quiet=quiet)
                result[cascade] = {k:metrics(rows,scored,"score",v) for k,v in thresholds[cascade].items()}
                result[cascade]["originalThreshold"] = metrics(rows,scored,"score",model["scoreThreshold"])
                result[cascade]["rtf"] = sum(r["computeMs"] for r in scored)/(1000*seconds)
                result[cascade]["proposalsScored"] = sum(len(r["events"]) for r in scored)
                if split == "test":
                    result["equalRecall"][method] = equal_recall(rows,proposals,"score")
                    result["equalRecall"][cascade] = equal_recall(rows,scored,"score")
            report[split] = result
    bank["thresholds"] = thresholds
    (output/(profile+"-templates.json")).write_text(json.dumps(bank,separators=(",",":"))+"\n")
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out",type=Path,required=True)
    args = p.parse_args()
    args.out.mkdir(exist_ok=True,parents=True)
    report = {"sampleRate":RATE, "environment":{"arch":platform.machine(), "node":subprocess.check_output(
        ["node","--version"],text=True).strip(), "cpu":subprocess.check_output(
        ["node","-p","require('os').cpus()[0].model"],text=True).strip()},
        "profiles":{p:evaluate(p,args.out) for p in ("station","unseen")}}
    (args.out/"frontends.json").write_text(json.dumps(report,indent=2)+"\n")
