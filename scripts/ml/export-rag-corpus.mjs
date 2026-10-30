// Freezes the RAG pages' corpus: one short document per DSAverse page, plus
// labelled queries and demo sentences. Dev-only.
//
//   node scripts/ml/export-rag-corpus.mjs
//
// Writes public/data/ml/rag-corpus.json. It is a snapshot on purpose: the
// precomputed sentence embeddings (scripts/ml/build_embeddings.py) describe
// exactly these documents, so the corpus must not change when pages are
// added. Re-run both scripts together to refresh it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { pageIndex } = await import(pathToFileURL(join(root, 'data', 'pageIndex.js')).href);

// Queries for retrieval, reranking and evaluation. Relevance is graded:
// 2 = answers the question, 1 = related. Some are paraphrases (where
// embeddings shine), some bare names or acronyms (where keywords do).
const QUERIES = [
    ['shortest path when edges can have negative weights', { 'graph-algorithms/floyd-warshall': 2, 'graph-algorithms/dijkstras-shortest-path': 1 }],
    ['cheapest way to connect every city with roads', { 'graph-algorithms/prims-minimum-spanning-tree': 2, 'graph-algorithms/kruskal-minimum-spanning-tree': 2 }],
    ['why is 0.1 + 0.2 not equal to 0.3', { 'under-the-hood/floating-point-and-ieee-754': 2 }],
    ['sort numbers by repeatedly swapping neighbours', { 'sorting/bubble-sort': 2, 'sorting/insertion-sort': 1 }],
    ['how does a database survive a crash', { 'database-systems/write-ahead-logging': 2, 'database-systems/lsm-trees': 1 }],
    ['two transactions read and write the same row at once', { 'database-systems/transaction-isolation-levels': 2, 'database-systems/mvcc': 2, 'database-systems/two-phase-locking': 1, 'database-systems/serializability': 1 }],
    ['chance of having a disease after a positive test', { 'probability-and-statistics/bayes-theorem': 2, 'probability-and-statistics/conditional-probability': 1 }],
    ['how many people until two share a birthday', { 'probability-and-statistics/birthday-paradox': 2 }],
    ['area under a curve', { 'integral-calculus/the-definite-integral': 2, 'integral-calculus/riemann-sums': 2, 'integral-calculus/numerical-integration': 1, 'integral-calculus/fundamental-theorem-of-calculus': 1 }],
    ['rolling downhill to find the minimum of a function', { 'differential-calculus/gradient-descent': 2, 'differential-calculus/optimization': 1 }],
    ['KMP', { 'string-algorithms/kmp-string-matching': 2 }],
    ['LRU', { 'operating-systems/page-replacement': 2 }],
    ['what happens when I type a website address into the browser', { 'under-the-hood/what-happens-when-you-search-a-url': 2, 'computer-networks/dns-resolution': 1, 'computer-networks/tcp-handshake': 1, 'under-the-hood/https-and-tls': 1 }],
    ['threads waiting on each other forever', { 'operating-systems/deadlock-detection': 2, 'operating-systems/dining-philosophers': 1, 'operating-systems/bankers-algorithm': 1 }],
    ['vectors that keep their direction when a matrix stretches space', { 'linear-algebra/eigenvectors-and-eigenvalues': 2 }],
    ['ways to choose a team of 5 from 12 people', { 'combinatorics/combinations': 2, 'combinatorics/pascals-triangle': 1, 'combinatorics/binomial-theorem': 1 }],
    ['self-balancing binary search tree with rotations', { 'trees/avl-tree': 2, 'indexing/red-black-trees': 2, 'indexing/splay-trees': 1 }],
    ['prefix search for autocomplete', { 'trees/trie': 2, 'indexing/radix-tree': 1, 'indexing/ternary-search-tree': 1 }],
    ['garbage collector', { 'under-the-hood/garbage-collection': 2, 'under-the-hood/python-memory-model': 1 }],
    ['TCP slow start', { 'computer-networks/tcp-congestion-control': 2 }],
    ['split an IP network into smaller networks', { 'computer-networks/subnetting-and-cidr': 2 }],
    ['longest common subsequence of two strings', { 'dynamic-programming/longest-common-subsequence': 2, 'dynamic-programming/edit-distance': 1 }],
    ['averages of many samples look like a bell curve', { 'probability-and-statistics/central-limit-theorem': 2, 'probability-and-statistics/normal-distribution': 1, 'probability-and-statistics/law-of-large-numbers': 1 }],
    ['angle between two vectors', { 'vectors/dot-product': 2, 'vectors/norms-and-unit-vectors': 1 }],
    ['fit a straight line through noisy points', { 'linear-algebra/least-squares': 2 }],
    ['how does git store commits', { 'under-the-hood/how-git-works-internally': 2 }],
    ['Dijkstra', { 'graph-algorithms/dijkstras-shortest-path': 2 }],
    ['merge groups and check whether two items are in the same group', { 'union-find/quick-find': 2, 'union-find/quick-union': 2, 'union-find/union-by-rank': 2, 'union-find/path-compression': 2, 'graph-algorithms/connected-components': 1 }],
];

// Pairs for the Sentence Embeddings page: word order, negation, paraphrase,
// and one word with two meanings.
const DEMO_SENTENCES = [
    'The dog bit the man.', 'The man bit the dog.',
    'I love this movie.', 'I do not love this movie.',
    'How do I reset my password?', 'I forgot my login details.',
    'The bank raised interest rates.', 'We sat on the river bank.',
    'A cat sat on the mat.', 'A kitten rested on the rug.',
    'Sorting puts items in order.', 'Quick sort picks a pivot.',
];

const byRoute = new Map(pageIndex.map(p => [p.route, p]));
const docs = pageIndex.map((p, id) => ({
    id,
    route: p.route,
    section: p.section,
    subject: p.subject,
    title: p.name,
    text: `${p.name}. ${p.description}`,
}));
const queries = QUERIES.map(([text, rel], id) => {
    const relevant = {};
    for (const [route, grade] of Object.entries(rel)) {
        const full = `/${route}`;
        if (!byRoute.has(full)) throw new Error(`query "${text}": no page at ${full}`);
        relevant[full] = grade;
    }
    return { id, text, relevant };
});

const out = join(root, 'public', 'data', 'ml');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'rag-corpus.json'), JSON.stringify({
    about: 'A frozen snapshot of DSAverse page descriptions, used as the RAG and Vector Search corpus.',
    docs,
    queries,
    demoSentences: DEMO_SENTENCES,
}) + '\n');
console.log(`${docs.length} documents, ${queries.length} queries, ${DEMO_SENTENCES.length} demo sentences`);
