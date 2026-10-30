// Builds the tiny GPT's tokenizer and token stream. Dev-only: the site
// build never runs this.
//
//   node scripts/ml/export-corpus.mjs [workDir]
//
// Generates the story corpus (lib/ml/stories.js), trains a 640-token
// byte-level BPE on it (lib/ml/bpe.js) and writes:
//   public/models/tiny-gpt/tokenizer.json   the merges the browser loads
//   <workDir>/tokens.u16                    the corpus as little-endian uint16 ids
//   <workDir>/meta.json                     sizes, for train_tiny_gpt.py
// Running the tokenizer in JS here is what guarantees the model was trained
// on exactly the ids the browser will produce.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { storyCorpus } = await imp('lib/ml/stories.js');
const { trainBPE, makeTokenizer } = await imp('lib/ml/bpe.js');

const VOCAB_SIZE = 640;
const STORIES = 12000;
const SEED = 2026;

const workDir = process.argv[2] ?? join(tmpdir(), 'dsaverse-ml');
mkdirSync(workDir, { recursive: true });

const corpus = storyCorpus(STORIES, SEED);
const { merges } = trainBPE(corpus, VOCAB_SIZE);
const tok = makeTokenizer(merges);
const ids = tok.encode(corpus);
if (tok.decode(ids) !== corpus) throw new Error('tokenizer does not round-trip the corpus');

const outDir = join(root, 'public', 'models', 'tiny-gpt');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'tokenizer.json'), JSON.stringify({
    kind: 'byte-level-bpe',
    vocabSize: tok.vocabSize,
    corpus: { stories: STORIES, seed: SEED },
    merges: merges.map(m => [m.a, m.b]),
}) + '\n');

const buf = Buffer.alloc(ids.length * 2);
ids.forEach((id, i) => buf.writeUInt16LE(id, i * 2));
writeFileSync(join(workDir, 'tokens.u16'), buf);
// Prompts the training script samples from at each checkpoint (for the
// "How LLMs Are Trained" page) and checks parity on, pre-encoded here so the
// Python side never needs a tokenizer of its own.
const PROMPTS = [
    'One day,',
    'Mia found a red ball under a tree. She',
    'Sam lost his blue kite. He asked Ava for help. Ava',
];
writeFileSync(join(workDir, 'meta.json'), JSON.stringify({
    vocabSize: tok.vocabSize,
    tokens: ids.length,
    chars: corpus.length,
    prompts: PROMPTS.map(text => ({ text, ids: tok.encode(text) })),
}, null, 2));
console.log(`vocab ${tok.vocabSize}, ${ids.length} tokens from ${corpus.length} characters → ${workDir}`);
