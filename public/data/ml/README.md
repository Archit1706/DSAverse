# AI page data

Word vectors and retrieval data for DSAverse's Language Models and RAG and
Vector Search pages, loaded by `lib/ml/embeddings.js`.

| File | Contents |
|---|---|
| `glove.json` + `glove.bin` | 8,674 GloVe word vectors, 100 dimensions: the 8,000 most frequent words plus every word the RAG corpus and demos use. int8, one scale per word |
| `rag-corpus.json` | A frozen snapshot of 202 DSAverse page descriptions, 28 queries with graded relevance labels, and 12 demo sentences |
| `rag-minilm.json` + `rag-minilm.bin` | `all-MiniLM-L6-v2` embeddings (384 dimensions, unit length, int8) of the documents, queries and sentences, plus cross-encoder scores for each query's top 30 documents |

**How it was made.** Dev-only, from local model caches:

```bash
node scripts/ml/export-rag-corpus.mjs
python scripts/ml/build_embeddings.py
```

The corpus is a snapshot on purpose: the embeddings describe exactly these
documents, so it does not change when pages are added. Re-run both scripts
together to refresh it.

**Sources and licences.**

- **GloVe** — Jeffrey Pennington, Richard Socher and Christopher D. Manning
  (2014), *GloVe: Global Vectors for Word Representation*,
  https://nlp.stanford.edu/projects/glove/. The 6B (Wikipedia 2014 +
  Gigaword 5) 100-dimension vectors, made available under the Open Data
  Commons Public Domain Dedication and License v1.0 (PDDL). This file is a
  quantised subset.
- **Sentence embeddings** — computed with `sentence-transformers/all-MiniLM-L6-v2`
  (Apache-2.0).
- **Rerank scores** — computed with `cross-encoder/ms-marco-MiniLM-L-6-v2`
  (Apache-2.0).
- **Corpus, queries and labels** — DSAverse's own page descriptions; covered
  by the repository's licence.
