"""Trains the tiny GPT that the Transformers and Language Models pages run.

Dev-only; the site build never trains anything. Run the corpus export first:

    node scripts/ml/export-corpus.mjs
    python scripts/ml/train_tiny_gpt.py [workDir]

The model is a GPT-2-style decoder (pre-LayerNorm blocks, learned positions,
tanh-GELU, embedding tied to the output layer), written out by hand rather
than with nn.Linear so that every weight is an [in, out] matrix and the
browser's forward pass in lib/ml/tinyGpt.js can mirror it line for line.

Writes to public/models/tiny-gpt/:
    model.json          config, tensor layout and training summary
    weights.bin         every tensor as little-endian float16, in model.json order
    training-log.json   loss curves and the samples at each checkpoint
and scripts/ml/fixtures/tiny-gpt-reference.json, the logits the JS forward
pass is tested against (computed from the float16-rounded weights).
"""
import json
import math
import os
import sys
import tempfile
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), "dsaverse-ml")
OUT = os.path.join(ROOT, "public", "models", "tiny-gpt")
FIXTURES = os.path.join(ROOT, "scripts", "ml", "fixtures")

CONFIG = {"vocab": 640, "ctx": 64, "d": 64, "heads": 4, "layers": 3, "ffn": 256}
STEPS = int(os.environ.get("TINY_GPT_STEPS", 6000))
BATCH = 32
PEAK_LR = 3e-3
WARMUP = 200
SEED = 1706
CHECKPOINTS = [0, 50, 150, 400, 1000, 2500, STEPS]

torch.manual_seed(SEED)
torch.set_num_threads(max(1, os.cpu_count() or 1))
rng = np.random.default_rng(SEED)

meta = json.load(open(os.path.join(WORK, "meta.json")))
assert meta["vocabSize"] == CONFIG["vocab"], meta
ids = np.fromfile(os.path.join(WORK, "tokens.u16"), dtype="<u2").astype(np.int64)
split = int(len(ids) * 0.95)
train_ids, val_ids = ids[:split], ids[split:]

merges = json.load(open(os.path.join(OUT, "tokenizer.json")))["merges"]
vocab_bytes = [bytes([i]) for i in range(256)]
for a, b in merges:
    vocab_bytes.append(vocab_bytes[a] + vocab_bytes[b])


def decode(seq):
    return b"".join(vocab_bytes[i] for i in seq).decode("utf-8", errors="replace")


def param(*shape, std=0.02):
    return nn.Parameter(torch.randn(*shape) * std)


class Block(nn.Module):
    def __init__(self, c):
        super().__init__()
        d, f, L = c["d"], c["ffn"], c["layers"]
        self.heads = c["heads"]
        self.ln1_g, self.ln1_b = nn.Parameter(torch.ones(d)), nn.Parameter(torch.zeros(d))
        self.wq, self.bq = param(d, d), nn.Parameter(torch.zeros(d))
        self.wk, self.bk = param(d, d), nn.Parameter(torch.zeros(d))
        self.wv, self.bv = param(d, d), nn.Parameter(torch.zeros(d))
        # Output projections start smaller, GPT-2 style, so the residual
        # stream does not grow with depth at initialisation.
        self.wo, self.bo = param(d, d, std=0.02 / math.sqrt(2 * L)), nn.Parameter(torch.zeros(d))
        self.ln2_g, self.ln2_b = nn.Parameter(torch.ones(d)), nn.Parameter(torch.zeros(d))
        self.w1, self.b1 = param(d, f), nn.Parameter(torch.zeros(f))
        self.w2, self.b2 = param(f, d, std=0.02 / math.sqrt(2 * L)), nn.Parameter(torch.zeros(d))

    def forward(self, x, attn_out=None):
        B, T, d = x.shape
        hd = d // self.heads
        h = F.layer_norm(x, (d,), self.ln1_g, self.ln1_b, 1e-5)

        def heads(t):
            return t.view(B, T, self.heads, hd).transpose(1, 2)

        q, k, v = heads(h @ self.wq + self.bq), heads(h @ self.wk + self.bk), heads(h @ self.wv + self.bv)
        att = (q @ k.transpose(-2, -1)) / math.sqrt(hd)
        mask = torch.triu(torch.ones(T, T, dtype=torch.bool, device=x.device), 1)
        att = att.masked_fill(mask, float("-inf")).softmax(-1)
        if attn_out is not None:
            attn_out.append(att.detach())
        y = (att @ v).transpose(1, 2).reshape(B, T, d)
        x = x + y @ self.wo + self.bo
        h = F.layer_norm(x, (d,), self.ln2_g, self.ln2_b, 1e-5)
        return x + F.gelu(h @ self.w1 + self.b1, approximate="tanh") @ self.w2 + self.b2


class TinyGPT(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.c = c
        self.wte = param(c["vocab"], c["d"])
        self.wpe = param(c["ctx"], c["d"])
        self.blocks = nn.ModuleList([Block(c) for _ in range(c["layers"])])
        self.lnf_g, self.lnf_b = nn.Parameter(torch.ones(c["d"])), nn.Parameter(torch.zeros(c["d"]))

    def forward(self, idx, attn_out=None):
        T = idx.shape[1]
        x = self.wte[idx] + self.wpe[:T]
        for blk in self.blocks:
            x = blk(x, attn_out)
        x = F.layer_norm(x, (self.c["d"],), self.lnf_g, self.lnf_b, 1e-5)
        return x @ self.wte.T

    def tensors(self):
        """Every weight in a fixed order with its name, for export."""
        out = [("wte", self.wte), ("wpe", self.wpe)]
        for i, b in enumerate(self.blocks):
            for n in ["ln1_g", "ln1_b", "wq", "bq", "wk", "bk", "wv", "bv", "wo", "bo",
                      "ln2_g", "ln2_b", "w1", "b1", "w2", "b2"]:
                out.append((f"h{i}.{n}", getattr(b, n)))
        out += [("lnf_g", self.lnf_g), ("lnf_b", self.lnf_b)]
        return out


def batch(data):
    starts = rng.integers(0, len(data) - CONFIG["ctx"] - 1, BATCH)
    x = np.stack([data[s:s + CONFIG["ctx"]] for s in starts])
    y = np.stack([data[s + 1:s + CONFIG["ctx"] + 1] for s in starts])
    return torch.from_numpy(x), torch.from_numpy(y)


VAL_BATCHES = [batch(val_ids) for _ in range(20)]


@torch.no_grad()
def val_loss(model):
    model.eval()
    losses = [F.cross_entropy(model(x).flatten(0, 1), y.flatten()).item() for x, y in VAL_BATCHES]
    model.train()
    return float(np.mean(losses))


@torch.no_grad()
def sample(model, prompt_ids, n=40, temperature=0.8, seed=7):
    g = torch.Generator().manual_seed(seed)
    seq = list(prompt_ids)
    for _ in range(n):
        logits = model(torch.tensor([seq[-CONFIG["ctx"]:]]))[0, -1] / temperature
        nxt = torch.multinomial(logits.softmax(-1), 1, generator=g).item()
        seq.append(nxt)
        if decode([nxt]).endswith("\n"):
            break
    return decode(seq).rstrip("\n")


model = TinyGPT(CONFIG)
n_params = sum(p.numel() for _, p in model.tensors())
decay = [p for n, p in model.named_parameters() if p.dim() == 2]
no_decay = [p for n, p in model.named_parameters() if p.dim() < 2]
opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.01}, {"params": no_decay, "weight_decay": 0.0}],
                        lr=PEAK_LR, betas=(0.9, 0.95))


def lr_at(step):
    if step < WARMUP:
        return PEAK_LR * (step + 1) / WARMUP
    t = (step - WARMUP) / max(1, STEPS - WARMUP)
    return 3e-4 + 0.5 * (PEAK_LR - 3e-4) * (1 + math.cos(math.pi * t))


log = {"steps": [], "trainLoss": [], "valSteps": [], "valLoss": [], "samples": []}
prompt = meta["prompts"][0]["ids"]
started = time.time()
ema = None
for step in range(STEPS + 1):
    if step in CHECKPOINTS:
        vl = val_loss(model)
        log["valSteps"].append(step)
        log["valLoss"].append(round(vl, 4))
        log["samples"].append({"step": step, "valLoss": round(vl, 4), "text": sample(model, prompt)})
        print(f"step {step:5d}  val {vl:.3f}  ppl {math.exp(vl):7.2f}  {time.time() - started:6.0f}s  {log['samples'][-1]['text'][:90]!r}", flush=True)
    if step == STEPS:
        break
    for g in opt.param_groups:
        g["lr"] = lr_at(step)
    x, y = batch(train_ids)
    loss = F.cross_entropy(model(x).flatten(0, 1), y.flatten())
    opt.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step()
    ema = loss.item() if ema is None else 0.95 * ema + 0.05 * loss.item()
    if step % 25 == 0:
        log["steps"].append(step)
        log["trainLoss"].append(round(ema, 4))
    if step % 250 == 0 and step not in CHECKPOINTS:
        vl = val_loss(model)
        log["valSteps"].append(step)
        log["valLoss"].append(round(vl, 4))

# Round to float16 — what ships — and compute every reference from the
# rounded weights so the browser can match them closely.
with torch.no_grad():
    for _, p in model.tensors():
        p.copy_(p.half().float())
final_val = val_loss(model)

os.makedirs(OUT, exist_ok=True)
layout, offset, chunks = [], 0, []
for name, p in model.tensors():
    arr = p.detach().numpy().astype("<f2")
    layout.append({"name": name, "shape": list(p.shape), "offset": offset})
    offset += arr.size
    chunks.append(arr.tobytes())
with open(os.path.join(OUT, "weights.bin"), "wb") as fh:
    fh.write(b"".join(chunks))

json.dump({
    "config": CONFIG,
    "dtype": "float16",
    "tensors": layout,
    "params": n_params,
    "training": {
        "steps": STEPS, "batch": BATCH, "context": CONFIG["ctx"], "peakLr": PEAK_LR, "seed": SEED,
        "trainTokens": int(len(train_ids)), "valTokens": int(len(val_ids)),
        "finalValLoss": round(final_val, 4), "finalPerplexity": round(math.exp(final_val), 3),
        "seconds": round(time.time() - started),
    },
    "corpus": "Stories from the seeded grammar in lib/ml/stories.js",
}, open(os.path.join(OUT, "model.json"), "w"), indent=1)
json.dump(log, open(os.path.join(OUT, "training-log.json"), "w"))

model64 = model.double()
refs = []
with torch.no_grad():
    for p in meta["prompts"]:
        attn = []
        logits = model64(torch.tensor([p["ids"]]), attn)[0]
        refs.append({
            "text": p["text"], "ids": p["ids"],
            "logits": logits.numpy().round(6).tolist(),
            "attention": [a[0].numpy().round(6).tolist() for a in attn],
        })
os.makedirs(FIXTURES, exist_ok=True)
json.dump({"prompts": refs}, open(os.path.join(FIXTURES, "tiny-gpt-reference.json"), "w"))
print(f"params {n_params}, final val {final_val:.4f} (ppl {math.exp(final_val):.2f}), {time.time() - started:.0f}s")
