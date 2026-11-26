"""CPU PyTorch training and export of a 401-parameter station model."""
import numpy as np
import torch
from torch import nn


def train_head(scaler, features, labels):
    torch.set_num_threads(1)
    torch.manual_seed(919)
    X = torch.from_numpy(scaler.transform(features).astype("float32")).cpu()
    y = torch.tensor(labels, dtype=torch.float32, device="cpu")
    net = nn.Sequential(nn.Linear(X.shape[1], 16), nn.ReLU(), nn.Linear(16, 1)).cpu()
    loss = nn.BCEWithLogitsLoss(pos_weight=(1-y).sum()/y.sum())
    optimizer = torch.optim.AdamW(net.parameters(), lr=.008, weight_decay=.012)
    for _ in range(180):
        optimizer.zero_grad(set_to_none=True)
        loss(net(X).squeeze(1), y).backward()
        optimizer.step()
    with torch.no_grad():
        first, last = net[0], net[2]
        w = first.weight.numpy().astype(float)/scaler.scale_[None, :]
        b = first.bias.numpy() - w @ scaler.mean_
        out = last.weight.numpy()[0].tolist()
        exported = dict(hiddenWeights=w.tolist(), hiddenBias=b.tolist(), weights=out,
                        bias=float(last.bias.item()))
        logits = np.maximum(0, np.asarray(features) @ w.T + b) @ np.array(out) + exported["bias"]
        np.testing.assert_allclose(logits, net(X).numpy().ravel(), rtol=2e-5, atol=2e-5)
    return exported
