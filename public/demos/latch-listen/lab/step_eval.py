"""Replay the frozen weights on the original mixtures. Requires only NumPy and Node."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from scenes import RATE, ROOT, SPLIT_SIZE, Recordings


def evaluate():
    bank = Recordings()
    result = {"sampleRate": RATE, "collarMs": 50, "threshold": "sensitive", "profiles": {}}
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        for profile in ("station", "unseen"):
            results = {}
            for split in ("dev", "test"):
                rows = []
                for i in range(SPLIT_SIZE[split]):
                    pcm, metadata = bank.scene(split, i, profile=profile)
                    path = folder / (metadata["id"] + ".pcm")
                    np.asarray(pcm, dtype="<i2").tofile(path)
                    rows.append({**metadata, "path": str(path)})
                manifest = folder / "rows.json"
                manifest.write_text(json.dumps(rows))
                scores = subprocess.run(
                    ["node", str(ROOT/"lab/run.mjs"), str(manifest), str(ROOT/"results"/profile/"model.json")],
                    check=True, capture_output=True, text=True)
                lab = [{**row, "events": json.loads(line)["events"]} for row, line in zip(
                    rows, scores.stdout.splitlines(), strict=True)]
                scored = subprocess.run(
                    ["node", str(ROOT/"lab/score_steps.mjs"), profile],
                    input=json.dumps(lab), check=True, capture_output=True, text=True)
                metrics = json.loads(scored.stdout)
                original = json.loads((ROOT/"results"/profile/"benchmark.json").read_text())
                for key in ("tp", "fp", "fn"):
                    assert metrics["eventCheck"][key] == original["metrics"][split]["verifier"][key], (
                        f"{profile}/{split}: the replay differs from the original detector benchmark")
                results[split] = metrics
            result["profiles"][profile] = results
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path)
    args = p.parse_args()
    content = json.dumps(evaluate(), indent=2) + "\n"
    if args.out:
        args.out.write_text(content)
    else:
        print(content, end="")
