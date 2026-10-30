"""Builds the word vectors and sentence embeddings the AI pages load. Dev-only.

    node scripts/ml/export-rag-corpus.mjs
    python scripts/ml/build_embeddings.py [path/to/glove-wiki-gigaword-100.gz]

Inputs (all used offline, from local caches):
  - GloVe 6B, 100 dimensions (Stanford NLP, Public Domain Dedication and
    License), in gensim-data's word2vec text format.
  - sentence-transformers/all-MiniLM-L6-v2 and
    cross-encoder/ms-marco-MiniLM-L-6-v2 (both Apache-2.0).

Writes to public/data/ml/:
  glove.json + glove.bin       the 8,000 most frequent words plus every word
                               the RAG corpus and demos use; int8 vectors with
                               one scale per word
  rag-minilm.json + .bin       MiniLM embeddings of the corpus documents,
                               queries and demo sentences (int8, unit length),
                               plus cross-encoder scores for each query's
                               top 30 documents (the Reranking page)
"""
import gzip
import json
import os
import re
import sys

import numpy as np

os.environ.setdefault("HF_HUB_OFFLINE", "1")   # use the local model cache only
from sentence_transformers import CrossEncoder, SentenceTransformer  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "data", "ml")
GLOVE = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/gensim-data/glove-wiki-gigaword-100/glove-wiki-gigaword-100.gz")
TOP_WORDS = 8000
WORD = re.compile(r"[a-z][a-z'-]*$")

# Words the Word Embeddings and Embedding Arithmetic pages use, kept even if
# they fall outside the most frequent 8,000.
DEMO_WORDS = """king queen man woman prince princess boy girl father mother son daughter uncle aunt
paris france berlin germany rome italy tokyo japan madrid spain london england moscow russia
walk walked walking swim swam swimming run ran running go went going eat ate eating
big bigger biggest small smaller smallest good better best fast faster fastest
cat dog kitten puppy horse cow sheep lion tiger wolf fox bird eagle fish shark
apple banana orange grape mango car bus train plane boat bicycle doctor nurse teacher engineer
programmer scientist chef pilot red green blue yellow purple happy sad angry calm
monday tuesday january february summer winter one two three four five""".split()


def quantize(mat):
    """int8 per row: scale = max |x| / 127, so a row is q · scale."""
    scales = np.abs(mat).max(axis=1) / 127.0
    scales[scales == 0] = 1.0
    q = np.clip(np.round(mat / scales[:, None]), -127, 127).astype(np.int8)
    return q, scales.astype(np.float32)


corpus = json.load(open(os.path.join(OUT, "rag-corpus.json"), encoding="utf-8"))
texts = [d["text"] for d in corpus["docs"]] + [q["text"] for q in corpus["queries"]] + corpus["demoSentences"]

# ---- GloVe subset -----------------------------------------------------------
needed = set(DEMO_WORDS)
for t in texts:
    needed.update(re.findall(r"[a-z]+", t.lower()))

words, ranks, vecs = [], [], []
with gzip.open(GLOVE, "rt", encoding="utf-8") as fh:
    first = fh.readline().split()
    if len(first) != 2:   # no word2vec header line: the first line is a vector
        fh.seek(0)
    kept_frequent = 0
    for rank, line in enumerate(fh):
        parts = line.rstrip().split(" ")
        w = parts[0]
        frequent = kept_frequent < TOP_WORDS and WORD.match(w)
        if frequent or w in needed:
            words.append(w)
            ranks.append(rank)
            vecs.append(np.asarray(parts[1:], dtype=np.float32))
            if frequent:
                kept_frequent += 1
glove = np.stack(vecs)
gq, gscales = quantize(glove)

# How much does int8 change what the pages show? Compare nearest neighbours.
def unit(m):
    return m / np.linalg.norm(m, axis=1, keepdims=True)
full, approx = unit(glove), unit(gq.astype(np.float32) * gscales[:, None])
idx = {w: i for i, w in enumerate(words)}
agree = 0
probe = [w for w in DEMO_WORDS if w in idx]
for w in probe:
    a = np.argsort(-(full @ full[idx[w]]))[1:6]
    b = np.argsort(-(approx @ approx[idx[w]]))[1:6]
    agree += len(set(a) & set(b))
print(f"GloVe: {len(words)} words; int8 keeps {agree / (5 * len(probe)):.1%} of top-5 neighbours")
missing = sorted(w for w in needed if w not in idx)
print(f"  {len(missing)} corpus words have no GloVe vector (e.g. {missing[:8]})")

json.dump({
    "about": "GloVe 6B 100d word vectors, a subset: the 8,000 most frequent words plus every word the AI pages use.",
    "source": "Pennington, Socher and Manning (2014), https://nlp.stanford.edu/projects/glove/",
    "licence": "Public Domain Dedication and License v1.0 (PDDL)",
    "dims": int(glove.shape[1]),
    "encoding": "int8 per word, row-major in glove.bin; value = byte * scale",
    "words": words,
    "ranks": ranks,
    "scales": [float(f"{s:.6g}") for s in gscales],
}, open(os.path.join(OUT, "glove.json"), "w", encoding="utf-8"), ensure_ascii=False)
gq.tofile(os.path.join(OUT, "glove.bin"))

# ---- Sentence embeddings and reranking scores -------------------------------
bi = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device="cpu")
emb = bi.encode(texts, normalize_embeddings=True, convert_to_numpy=True, batch_size=64)
mq, mscales = quantize(emb)

n_docs, n_q = len(corpus["docs"]), len(corpus["queries"])
doc_emb, q_emb = emb[:n_docs], emb[n_docs:n_docs + n_q]
cross = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu")
rerank = []
for qi, q in enumerate(corpus["queries"]):
    sims = doc_emb @ q_emb[qi]
    top = np.argsort(-sims)[:30]
    scores = cross.predict([(q["text"], corpus["docs"][int(d)]["text"]) for d in top])
    rerank.append([{"doc": int(d), "bi": round(float(sims[d]), 5), "cross": round(float(s), 4)} for d, s in zip(top, scores)])

json.dump({
    "about": "all-MiniLM-L6-v2 embeddings of rag-corpus.json (documents, then queries, then demo sentences), and ms-marco-MiniLM-L-6-v2 cross-encoder scores for each query's top 30 documents.",
    "models": {
        "biEncoder": "sentence-transformers/all-MiniLM-L6-v2 (Apache-2.0)",
        "crossEncoder": "cross-encoder/ms-marco-MiniLM-L-6-v2 (Apache-2.0)",
    },
    "dims": int(emb.shape[1]),
    "counts": {"docs": n_docs, "queries": n_q, "sentences": len(corpus["demoSentences"])},
    "encoding": "int8 per text, row-major in rag-minilm.bin; value = byte * scale; vectors were unit length before quantising",
    "scales": [float(f"{s:.6g}") for s in mscales],
    "rerank": rerank,
}, open(os.path.join(OUT, "rag-minilm.json"), "w", encoding="utf-8"), ensure_ascii=False)
mq.tofile(os.path.join(OUT, "rag-minilm.bin"))
print(f"MiniLM: {len(texts)} texts x {emb.shape[1]} dims; cross-encoder scored {n_q} queries")
