"""Window classification on the published automotive feature table.

Download DataSet.csv from Mendeley Data DOI 10.17632/2p4ng7zz3s.1, then
pass its local path. Class IDs are reported exactly as supplied.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import time
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, confusion_matrix, roc_auc_score
from sklearn.preprocessing import StandardScaler

EXPECTED = "3fee0517e19f88099c46b4fc3f381e726b78cb0b4563b3322847c69a24163746"


def run(path):
    with path.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    if digest != EXPECTED:
        raise ValueError("Expected the unmodified DataSet.csv from version 1 of the deposit")
    with path.open(newline="") as f:
        header = next(csv.reader(f))
    data = np.loadtxt(path, delimiter=",", skiprows=1)
    assert header[-1] == "Class" and len(header) == data.shape[1] == 214
    X, y = np.ascontiguousarray(data[:, :-1]), data[:, -1].astype(int)
    # Same feature values can repeat. Remove ambiguous vectors and retain just
    # their earliest occurrence before assigning contiguous original-row ranges.
    _, first, group = np.unique(X, axis=0, return_index=True, return_inverse=True)
    pos = np.bincount(group, weights=y)
    count = np.bincount(group)
    ambiguous = (pos > 0) & (pos < count)
    kept = np.sort(first[~ambiguous])
    a, b = int(.60*len(y)), int(.80*len(y))
    train = kept[kept < a-100]
    dev = kept[(kept >= a+100) & (kept < b-100)]
    test = kept[kept >= b+100]
    # Cap the number of rows for a quick, deterministic CPU reference fit.
    rng = np.random.default_rng(952)
    fit = np.sort(rng.choice(train, min(len(train), 12000), replace=False))
    start = time.perf_counter()
    scaler = StandardScaler().fit(X[fit])
    clf = LogisticRegression(C=.1, class_weight="balanced", max_iter=300, random_state=0)
    clf.fit(scaler.transform(X[fit]), y[fit])
    seconds = time.perf_counter()-start
    validation = clf.decision_function(scaler.transform(X[dev]))
    levels = np.quantile(validation, np.linspace(0, 1, 201))
    t = max(levels, key=lambda q: balanced_accuracy_score(y[dev], validation >= q))
    preds = clf.decision_function(scaler.transform(X[test]))
    return dict(sha256=digest, rows=len(y), features=X.shape[1],
                rawClassCounts=np.bincount(y).tolist(),
                duplicateFeatureRows=int(len(y)-len(first)), conflictingVectors=int(ambiguous.sum()),
                retainedUnique=int(len(kept)), trainAvailable=len(train), trainUsed=len(fit), dev=len(dev),
                test=len(test), purgedAtEachSide=100, fitSeconds=seconds, threshold=float(t),
                confusionTrueRowsPredictedColumns=confusion_matrix(y[test],preds>=t,labels=[0,1]).tolist(),
                balancedAccuracy=float(balanced_accuracy_score(y[test], preds>=t)),
                rocAucClass1=float(roc_auc_score(y[test], preds)),
                majorityBalancedAccuracy=float(balanced_accuracy_score(y[test], np.full(len(test), np.bincount(y[fit]).argmax()))))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("csv", type=Path)
    p.add_argument("--out", type=Path)
    args = p.parse_args()
    s = json.dumps(run(args.csv), indent=2)
    if args.out: args.out.write_text(s+"\n")
    print(s)
