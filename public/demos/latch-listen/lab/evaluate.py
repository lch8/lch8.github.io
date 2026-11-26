"""Fit a small linear verifier, choose thresholds on dev, and score continuous audio."""
import argparse
import json
import os
import platform
from pathlib import Path
import subprocess
import tempfile
import time
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from scenes import DURATION, RATE, ROOT, SPLIT_SIZE, Recordings

COLLAR = .050
RECALL_GOAL = .90


def save(path, data):
    Path(path).write_text(json.dumps(data, indent=2, allow_nan=False) + "\n")


def read_engine(rows, model="-", features=False):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as f:
        json.dump(rows, f); f.flush()
        p = subprocess.run(["node", str(ROOT/"lab/run.mjs"), f.name, str(model),
                            "features" if features else "scores"], check=True, capture_output=True, text=True)
    return [json.loads(line) for line in p.stdout.splitlines()]


def matches(truth, events):
    """Chronological, one-to-one collar matching. Both inputs are time ordered."""
    i = j = 0
    paired = []
    while i < len(truth) and j < len(events):
        delta = events[j]["time"] - truth[i]["time"]
        if delta < -COLLAR: j += 1
        elif delta > COLLAR: i += 1
        else:
            paired.append((i, j))
            i += 1
            j += 1
    return paired


def metrics(rows, output, key, threshold, context=False):
    tp = fp = fn = 0
    delays, observed, found = [], {}, {}
    for row, result in zip(rows, output, strict=True):
        events = [e for e in result["events"] if e[key] >= threshold and
                  (not context or any(a <= e["time"] <= b for a, b in row["windows"]))]
        truth = row["targets"]
        pairs = matches(truth, events)
        for item in truth:
            level = str(item["snrDb"])
            observed[level] = observed.get(level, 0) + 1
        for i, j in pairs:
            level = str(truth[i]["snrDb"])
            found[level] = found.get(level, 0) + 1
            delays.append(1000*(events[j]["decision"]-truth[i]["time"]))
        tp += len(pairs); fp += len(events)-len(pairs); fn += len(truth)-len(pairs)
    seconds = sum(r["duration"] for r in rows)
    return dict(tp=tp, fp=fp, fn=fn, recall=tp/max(1, tp+fn), precision=tp/max(1, tp+fp),
                fpPerHour=fp*3600/seconds, p50DelayMs=float(np.median(delays)) if delays else None,
                p95DelayMs=float(np.percentile(delays, 95)) if delays else None,
                bySnr={k: [found.get(k, 0), observed[k]] for k in sorted(observed, key=int)})


def choose(rows, out, key):
    # Sweep a fixed grid of validation quantiles; include the all-candidates endpoint.
    values = np.array([e[key] for r in out for e in r["events"]])
    thresholds = np.unique(np.append(np.quantile(values, np.linspace(0, 1, 151)),
                                     np.nextafter(values.max(), np.inf)))
    trials = [(float(t), metrics(rows, out, key, t)) for t in thresholds]
    feasible = [item for item in trials if item[1]["recall"] >= RECALL_GOAL]
    if not feasible:
        best = max(m["recall"] for _, m in trials)
        feasible = [(t, m) for t, m in trials if m["recall"] == best]
    sensitive = min(feasible, key=lambda x: (x[1]["fp"], -x[1]["recall"], -x[0]))
    quiet = max((item for item in trials if item[1]["fp"] <= 1),
                key=lambda x: (x[1]["recall"], -x[1]["fp"], x[0]))
    return sensitive[0], quiet[0]


def fit(rows, out, profile):
    X, y = [], []
    for r, o in zip(rows, out, strict=True):
        good = {j for _, j in matches(r["targets"], o["events"])}
        for j, e in enumerate(o["events"]):
            X.append(e["features"]); y.append(j in good)
    start = time.perf_counter()
    scaler = StandardScaler().fit(X)
    if profile == "station":
        from station_head import train_head
        model = train_head(scaler, X, y)
    else:
        lr = LogisticRegression(C=.12, max_iter=300, class_weight="balanced", solver="liblinear",
                                random_state=0).fit(scaler.transform(X), y)
        w = lr.coef_[0] / scaler.scale_
        model = dict(weights=w.tolist(), bias=float(lr.intercept_[0] - w @ scaler.mean_))
    model.update(rate=RATE, profile=profile)
    return model, {"fitSeconds": time.perf_counter()-start, "positives": int(sum(y)), "candidates": len(y)}


def run(destination, profile, demos=False):
    started = time.perf_counter()
    destination.mkdir(parents=True, exist_ok=True)
    bank = Recordings()
    results = {}
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        for split, count in SPLIT_SIZE.items():
            rows = []
            for i in range(count):
                pcm, r = bank.scene(split, i, profile=profile)
                path = folder / (r["id"] + ".pcm")
                pcm.tofile(path); r["path"] = str(path); rows.append(r)
            if split == "train":
                out = read_engine(rows, features=True)
                model, training = fit(rows, out, profile)
                save(folder/"model.json", model)
                training["throughFitSeconds"] = time.perf_counter()-started
                continue
            out = read_engine(rows, folder/"model.json")
            if split == "dev":
                gate, quiet_gate = choose(rows, out, "gateDb")
                score, quiet_score = choose(rows, out, "score")
                model.update(scoreThreshold=score, gateThresholdDb=gate,
                             quietScoreThreshold=quiet_score, quietGateThresholdDb=quiet_gate)
                save(destination/"model.json", model)
            results[split] = {
                "scenes": count, "minutes": count*DURATION/60,
                "gate": metrics(rows, out, "gateDb", gate),
                "verifier": metrics(rows, out, "score", score),
                "withStepWindows": metrics(rows, out, "score", score, True),
                "strictVerifier": metrics(rows, out, "score", quiet_score),
                "strictGate": metrics(rows, out, "gateDb", quiet_gate),
                "proposalRecall": metrics(rows, out, "gateDb", -100)["recall"],
            }
            if split == "test":
                elapsed = sum(row["computeMs"] for row in out)
                n = sum(len(row["events"]) for row in out)
                seconds = sum(row["duration"] for row in out)
                results[split].update(candidates=n, verifiedAudioFraction=n*.05/seconds,
                                      detectorRtf=elapsed/(1000*seconds))
        result = dict(training=training, metrics=results, environment={"platform": platform.platform(),
                      "machine":platform.machine(), "node":subprocess.check_output(["node","-v"],text=True).strip(),
                      "python":platform.python_version(), "blasThreads":os.environ.get("OPENBLAS_NUM_THREADS")},
                      totalSeconds=time.perf_counter()-started)
        save(destination/"benchmark.json", result)
        if demos:
            from scipy.io import wavfile
            examples = [(0, "mixed"), (1, "tools")] if profile == "station" else [(2, "unseen")]
            for idx, name in examples:
                pcm, r = bank.scene("demo", idx, name, profile)
                wavfile.write(folder/"scene.wav", RATE, pcm)
                subprocess.run(["ffmpeg","-v","error","-y","-i",str(folder/"scene.wav"),"-c:a","flac",
                                str(ROOT/f"audio/{name}.flac")], check=True)
                save(ROOT/f"audio/{name}.json", r)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["station", "unseen"], default="station")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--render-demos", action="store_true", help="requires ffmpeg")
    args = parser.parse_args()
    run(args.out or ROOT/"results"/args.profile, args.profile, args.render_demos)
