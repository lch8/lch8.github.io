"""Build continuous mixes from disjoint, credited field recordings."""
from pathlib import Path
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 16_000
DURATION = 15
SPLIT_SEED = {"train": 10421, "dev": 20421, "test": 30421, "demo": 40421}
SPLIT_SIZE = {"train": 72, "dev": 36, "test": 60}


class Recordings:
    def __init__(self):
        self.rows = json.loads((ROOT / "lab/sources.json").read_text())
        with np.load(ROOT / "lab/sources.npz") as bank:
            self.signals = {k: bank[k].astype(float) / 32768 for k in bank.files}

    def scene(self, split, index, presentation=None, profile="unseen"):
        source_split = "test" if split == "demo" else split
        rows = [r for r in self.rows if r["split"] == source_split]
        positives = [r for r in rows if r["kind"] == "buckle"]
        if profile == "station":
            take_ids = {"train": {"36838", "36839"}, "dev": {"36840"}, "test": {"36841"}}
            positives = [r for r in self.rows if r["id"] in take_ids[source_split]]
        negatives = [r for r in rows if r["kind"] not in ("buckle", "room")]
        bed = self.signals[next(r["key"] for r in rows if r["kind"] == "room")]
        seed = SPLIT_SEED[split] + (70831 if profile == "station" else 0)
        rng = np.random.default_rng(np.random.SeedSequence([seed, index]))
        n = RATE * DURATION
        start = rng.integers(0, len(bed) - n + 1)
        room = bed[start:start+n].copy()
        room /= max(1e-6, np.sqrt(np.mean(room ** 2)))
        room += rng.uniform(.06, .45) * rng.standard_normal(n)
        t = np.arange(n) / RATE
        room *= .055 * (1 + rng.uniform(.05, .4) * np.sin(2*np.pi*rng.uniform(.08, .25)*t))
        signal = room.copy()

        # The schedule exists before sound placement. A small fraction of targets
        # land outside their cue, and some cues have no target.
        centers = np.arange(1.5, DURATION-1, 2.8) + rng.uniform(-.18, .18, 5)
        windows = [[round(c-.55, 5), round(c+.55, 5)] for c in centers]
        targets, clutter = [], []

        def insert(row, at, snr):
            src = self.signals[row["key"]]
            speed = rng.uniform(.89, 1.11)
            warped = np.interp(np.arange(0, len(src)-1, speed), np.arange(len(src)), src)
            anchor = round(row["anchor_sample"] / speed)
            # The same fade, gain law and microphone coloration apply to both classes.
            warped[:32] *= np.linspace(0, 1, 32)
            warped[-96:] *= np.linspace(1, 0, 96)
            hf = rng.uniform(-.30, .25)
            warped[1:] += hf * (warped[1:] - warped[:-1])
            at_sample = round(at * RATE)
            lo, hi = max(0, anchor-160), min(len(warped), anchor+240)
            base = at_sample - anchor
            bg_rms = np.sqrt(np.mean(room[base+lo:base+hi]**2))
            gain = bg_rms * 10**(snr/20) / max(1e-7, np.sqrt(np.mean(warped[lo:hi]**2)))
            signal[base:base+len(warped)] += gain * warped
            return {"time": at_sample/RATE, "kind": row["kind"], "source": row["id"], "snrDb": snr}

        empty = index % 7 == 0 if presentation is None else presentation == "tools"
        for c in centers:
            if empty or rng.random() > (.90 if presentation else .78):
                continue
            jitter = rng.uniform(-.35, .35)
            if rng.random() < .10: jitter = rng.choice([-1, 1]) * rng.uniform(.59, .81)
            level = int(rng.choice([-3, 3, 9, 15]))
            targets.append(insert(rng.choice(positives), c + jitter, level))
        times = list(rng.uniform(.55, DURATION-.45, size=rng.integers(7, 13)))
        for target in targets:
            if rng.random() < .20:
                times.append(target["time"] + rng.uniform(-.035, .035))
        for at in sorted(times):
            clutter.append(insert(rng.choice(negatives), at, int(rng.choice([-3, 3, 9, 15]))))
        signal *= min(1, .96 / max(.01, np.max(np.abs(signal))))
        pcm = np.round(signal*32767).astype("<i2")
        return pcm, {"id": f"{split}-{index:03d}", "duration": DURATION,
                     "targets": sorted(targets, key=lambda x: x["time"]),
                     "clutter": clutter, "windows": windows}
