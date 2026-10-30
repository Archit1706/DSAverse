"""Trains the small CNN behind "A CNN Reads a Digit". Dev-only.

    python scripts/ml/train_digit_cnn.py [workDir]

Downloads MNIST (Yann LeCun and Corinna Cortes, CC BY-SA 3.0) through
torchvision into workDir on first run. The network is deliberately small
enough to draw every feature map:

    28×28 → conv 3×3, 8 channels → ReLU → max-pool 2
          → conv 3×3, 16 channels → ReLU → max-pool 2
          → 784 → dense 32 → ReLU → dense 10

Training uses small random rotations, shifts and zooms, because digits drawn
with a mouse are less tidy than MNIST's.

Writes to public/models/digit-cnn/:
    model.json     layout, normalisation, test accuracy
    weights.bin    float16 tensors in PyTorch layout ([out, in, kh, kw] and [out, in])
    samples.json   40 MNIST test digits (uint8, 28×28) with their labels
and scripts/ml/fixtures/digit-cnn-reference.json for the JS parity test.
"""
import base64
import json
import os
import sys
import tempfile
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import datasets, transforms

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), "dsaverse-ml")
OUT = os.path.join(ROOT, "public", "models", "digit-cnn")
FIXTURES = os.path.join(ROOT, "scripts", "ml", "fixtures")
MEAN, STD = 0.1307, 0.3081
EPOCHS = 5
SEED = 1706

torch.manual_seed(SEED)
torch.set_num_threads(max(1, os.cpu_count() or 1))


class DigitCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 8, 3, padding=1)
        self.conv2 = nn.Conv2d(8, 16, 3, padding=1)
        self.fc1 = nn.Linear(16 * 7 * 7, 32)
        self.fc2 = nn.Linear(32, 10)

    def forward(self, x):
        x = F.max_pool2d(F.relu(self.conv1(x)), 2)
        x = F.max_pool2d(F.relu(self.conv2(x)), 2)
        x = F.relu(self.fc1(x.flatten(1)))
        return self.fc2(x)


norm = transforms.Normalize((MEAN,), (STD,))
train_tf = transforms.Compose([
    transforms.RandomAffine(degrees=12, translate=(0.1, 0.1), scale=(0.85, 1.1)),
    transforms.ToTensor(), norm,
])
test_tf = transforms.Compose([transforms.ToTensor(), norm])
train = datasets.MNIST(WORK, train=True, download=True, transform=train_tf)
test = datasets.MNIST(WORK, train=False, download=True, transform=test_tf)
train_loader = torch.utils.data.DataLoader(train, batch_size=128, shuffle=True, generator=torch.Generator().manual_seed(SEED))
test_loader = torch.utils.data.DataLoader(test, batch_size=1000)

model = DigitCNN()
opt = torch.optim.Adam(model.parameters(), lr=2e-3)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=4e-3, total_steps=EPOCHS * len(train_loader))
started = time.time()


@torch.no_grad()
def evaluate():
    model.eval()
    right = sum((model(x).argmax(1) == y).sum().item() for x, y in test_loader)
    model.train()
    return right / len(test)


for epoch in range(EPOCHS):
    for x, y in train_loader:
        loss = F.cross_entropy(model(x), y)
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()
    print(f"epoch {epoch + 1}: test accuracy {evaluate():.4f}  {time.time() - started:.0f}s", flush=True)

with torch.no_grad():
    for p in model.parameters():
        p.copy_(p.half().float())
accuracy = evaluate()

os.makedirs(OUT, exist_ok=True)
layout, offset, chunks = [], 0, []
for name, p in model.named_parameters():
    arr = p.detach().numpy().astype("<f2")
    layout.append({"name": name, "shape": list(p.shape), "offset": offset})
    offset += arr.size
    chunks.append(arr.tobytes())
with open(os.path.join(OUT, "weights.bin"), "wb") as fh:
    fh.write(b"".join(chunks))
json.dump({
    "architecture": "conv3x3(8)-relu-maxpool2-conv3x3(16)-relu-maxpool2-dense(32)-relu-dense(10)",
    "input": {"size": 28, "mean": MEAN, "std": STD},
    "tensors": layout,
    "dtype": "float16",
    "params": sum(p.numel() for p in model.parameters()),
    "testAccuracy": round(accuracy, 4),
    "trainedOn": "MNIST training set (60,000 digits) with random rotation, shift and zoom",
    "dataset": "MNIST, Yann LeCun and Corinna Cortes, CC BY-SA 3.0",
}, open(os.path.join(OUT, "model.json"), "w"), indent=1)

raw_test = datasets.MNIST(WORK, train=False, download=False)
picks = []
for digit in range(10):   # four of each digit, the first ones in the test set
    picks += [i for i in range(len(raw_test)) if int(raw_test.targets[i]) == digit][:4]
samples = [{"label": int(raw_test.targets[i]), "pixels": base64.b64encode(raw_test.data[i].numpy().astype(np.uint8).tobytes()).decode()} for i in picks]
json.dump({"about": "MNIST test digits, 28×28 uint8, row-major, base64.", "licence": "CC BY-SA 3.0", "samples": samples},
          open(os.path.join(OUT, "samples.json"), "w"))

model64 = model.double().eval()
refs = []
with torch.no_grad():
    for s in samples[:10]:
        img = np.frombuffer(base64.b64decode(s["pixels"]), dtype=np.uint8).reshape(1, 1, 28, 28) / 255.0
        x = torch.tensor((img - MEAN) / STD)
        c1 = F.relu(model64.conv1(x))
        refs.append({"label": s["label"], "logits": model64(x)[0].numpy().round(6).tolist(),
                     "conv1Relu": c1[0, 0].numpy().round(6).tolist()})
os.makedirs(FIXTURES, exist_ok=True)
json.dump({"references": refs}, open(os.path.join(FIXTURES, "digit-cnn-reference.json"), "w"))
print(f"params {sum(p.numel() for p in model.parameters())}, float16 test accuracy {accuracy:.4f}, {time.time() - started:.0f}s")
