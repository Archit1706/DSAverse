/**
 * Generates data/quizBank.js and data/pageIndex.js from the pages themselves.
 *
 * The 368 quiz questions and all the per-page metadata already live inside the
 * 121 visualizer pages, but they are not addressable from anywhere else. This
 * collects them so /review, /compare, the command palette and the "See also"
 * blocks can use them, without duplicating content by hand.
 *
 * Runs from the `prebuild` script, so a new page is picked up automatically and
 * the generated files cannot drift.
 *
 *   node scripts/build-learning-data.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const APP = join(ROOT, 'app');

/* Identifiers like `icon: TreePine` are not defined when we evaluate a literal
   out of context, so resolve every free identifier to null instead. */
function evalLiteral(src) {
    const sandbox = new Proxy({}, {
        has: () => true,
        get: (_t, key) => (key === Symbol.unscopables ? undefined : null),
    });
    return new Function('__s', `with (__s) { return (${stripJsx(src)}); }`)(sandbox);
}

/* Most section indexes write `icon: TreePine`, but Basics and Heap-like Data
   Structures write `icon: <List className="h-7 w-7" />`. JSX is not valid JS,
   so evaluating those literals threw and the whole array was skipped — which
   quietly cost those 14 pages their complexity and difficulty metadata. Self-
   closing elements are the only JSX these arrays contain; swap them for null. */
function stripJsx(src) {
    return src.replace(/<[A-Z][\w.]*(?:\s[^<>]*?)?\/>/g, 'null');
}

/** Slices a balanced [...] or {...} starting at `open`, respecting strings and comments. */
function sliceBalanced(src, open) {
    const openCh = src[open];
    const closeCh = openCh === '[' ? ']' : '}';
    let depth = 0, inStr = null, inLine = false, inBlock = false;
    for (let i = open; i < src.length; i++) {
        const c = src[i], n = src[i + 1];
        if (inLine) { if (c === '\n') inLine = false; continue; }
        if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
        if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
        if (c === '/' && n === '/') { inLine = true; i++; continue; }
        if (c === '/' && n === '*') { inBlock = true; i++; continue; }
        if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
        if (c === openCh) depth++;
        else if (c === closeCh) { depth--; if (depth === 0) return src.slice(open, i + 1); }
    }
    return null;
}

function findArray(src, names) {
    for (const name of names) {
        const m = new RegExp(`const\\s+${name}\\s*=\\s*\\[`).exec(src);
        if (!m) continue;
        const open = src.indexOf('[', m.index);
        const literal = sliceBalanced(src, open);
        if (literal) return literal;
    }
    return null;
}

/* Section indexes each name their array differently (sortingAlgorithms,
   basicDataStructures, tracks, …) and some nest entries inside category
   groups. Rather than enumerate the names, take any top-level array whose
   literal mentions `slug:`. */
function findSlugArray(src) {
    const re = /const\s+[A-Za-z_$][\w$]*\s*=\s*\[/g;
    let m;
    while ((m = re.exec(src))) {
        const open = src.indexOf('[', m.index);
        const literal = sliceBalanced(src, open);
        if (literal && /\bslug:/.test(literal)) return literal;
    }
    return null;
}

/** Flattens category/track groups down to the entries that carry a slug. */
function flattenEntries(value, out = []) {
    if (Array.isArray(value)) {
        for (const v of value) flattenEntries(v, out);
        return out;
    }
    if (!value || typeof value !== 'object') return out;
    if (typeof value.slug === 'string') out.push(value);
    for (const key of ['algorithms', 'items', 'entries', 'structures', 'pages']) {
        if (Array.isArray(value[key])) flattenEntries(value[key], out);
    }
    return out;
}

/* ── walk the pages ─────────────────────────────────────── */
const pages = [];
for (const section of readdirSync(APP, { withFileTypes: true })) {
    if (!section.isDirectory()) continue;
    const sectionDir = join(APP, section.name);
    for (const entry of readdirSync(sectionDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = join(sectionDir, entry.name, 'page.js');
        if (existsSync(file)) pages.push({ section: section.name, slug: entry.name, file });
    }
}

/* ── section index metadata (difficulty / pattern / complexity) ── */
const meta = {};           // "/section/slug" -> { name, description, difficulty, pattern, time, space }
for (const section of readdirSync(APP, { withFileTypes: true })) {
    if (!section.isDirectory()) continue;
    const indexFile = join(APP, section.name, 'page.js');
    if (!existsSync(indexFile)) continue;
    const src = readFileSync(indexFile, 'utf8');

    const literal = findSlugArray(src);
    if (!literal) continue;

    let parsed;
    try { parsed = evalLiteral(literal); } catch { continue; }

    for (const a of flattenEntries(parsed)) {
        const route = a.href ?? `/${section.name}/${a.slug}`;
        meta[route] = {
            name: a.name ?? a.slug,
            description: a.description ?? '',
            difficulty: a.difficulty ?? null,
            // `pattern` is the common key; some sections call it `type`,
            // `category` or `tag`, and Under the Hood reuses `complexity`
            // for time.
            pattern: a.pattern ?? a.type ?? a.category ?? a.tag ?? null,
            time: a.time ?? a.timeComplexity ?? a.complexity ?? null,
            space: a.space ?? a.spaceComplexity ?? null,
            coveredIn: a.coveredIn ?? null,
        };
    }
}

/* ── page prose (corpus for relatedness) ────────────────── */
/* A page's metadata is only ~40 words, which turned out to be too thin to rank
   siblings by: scoring on it alone put the array-list page next to the CPU
   cache page. The page body is far richer — every step carries a hand-written
   explanation string — so the corpus is drawn from the page's own prose.
   Tailwind class strings are stripped first; without that, the shared utility
   vocabulary swamps the signal and every page looks alike. */
const TAILWIND = /(^|[\s:])(bg|text|border|from|to|via|ring|fill|stroke|shadow|flex|grid|gap|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min|max|inset|top|left|right|bottom|z|opacity|scale|translate|rotate|transition|duration|delay|ease|hover|focus|group|sm|md|lg|xl|space|items|justify|self|col|row|overflow|cursor|font|leading|tracking|uppercase|whitespace|truncate|absolute|relative|sticky|fixed|block|inline|hidden)-/;

function pageProse(src) {
    const cleaned = src
        // class attributes, including the template-literal class lists
        .replace(/className\s*=\s*\{?\s*`[\s\S]*?`\s*\}?/g, ' ')
        .replace(/className\s*=\s*"[^"]*"/g, ' ')
        .replace(/className\s*=\s*'[^']*'/g, ' ')
        .replace(/className\s*=\s*\{[^{}]*\}/g, ' ')
        // import specifiers contribute component names, not topic words
        .replace(/^\s*import[^\n]*$/gm, ' ');

    const out = [];
    const literal = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;
    let m;
    while ((m = literal.exec(cleaned)) !== null) {
        const text = m[1] ?? m[2] ?? m[3] ?? '';
        // Prose, not identifiers or leftover class fragments: a couple of
        // spaces at minimum, and nothing that looks like a utility-class list.
        if (text.length < 12) continue;
        if ((text.match(/ /g) ?? []).length < 2) continue;
        if (TAILWIND.test(text)) continue;
        out.push(text);
    }
    return out.join(' ');
}

/* ── collect ────────────────────────────────────────────── */
const QUIZ_NAMES = ['quizQuestions', 'QUIZ', 'QS', 'QUIZ_QUESTIONS'];
/* Metadata fields are always written at four-space indent in these layouts. */
const TITLE_RE = /\n {4}title:\s*(['"])([\s\S]*?)\1/;
const DESC_RE = /\n {4}description:\s*(['"])([\s\S]*?)\1/;
const KEYWORDS_RE = /\n {4}keywords:\s*\[([\s\S]*?)\]/;
const bank = [];
const index = [];
const skipped = [];
const corpus = {};       // "/section/slug" -> prose used only for relatedness scoring

for (const { section, slug, file } of pages) {
    const route = `/${section}/${slug}`;
    const src = readFileSync(file, 'utf8');

    // Title comes from the sibling layout's metadata, which is the clean name.
    const layoutFile = join(APP, section, slug, 'layout.js');
    let title = meta[route]?.name ?? slug;
    let layoutText = '';
    if (existsSync(layoutFile)) {
        const ls = readFileSync(layoutFile, 'utf8');
        const lm = TITLE_RE.exec(ls);
        if (lm) title = lm[2];
        // A layout's description and keywords are the richest prose the repo
        // has about a page, and they feed the relatedness scoring below. They
        // are deliberately not copied into pageIndex: the command palette
        // fetches that file on its first keypress, so it stays lean.
        const dm = DESC_RE.exec(ls);
        const km = KEYWORDS_RE.exec(ls);
        layoutText = [lm ? lm[2] : '', dm ? dm[2] : '', km ? km[1] : ''].join(' ');
    }

    const m = meta[route] ?? {};
    // The metadata is counted twice so that a page's own framing still
    // outweighs any single line of body prose.
    const metaText = [title, m.name || '', m.description || '', m.pattern || '', layoutText].join(' ');
    corpus[route] = [metaText, metaText, pageProse(src)].join(' ');
    index.push({
        route, section, slug, title,
        name: m.name ?? title,
        description: m.description ?? '',
        difficulty: m.difficulty ?? null,
        pattern: m.pattern ?? null,
        time: m.time ?? null,
        space: m.space ?? null,
    });

    const literal = findArray(src, QUIZ_NAMES);
    if (!literal) { skipped.push(route + ' (no quiz array found)'); continue; }

    let questions;
    try { questions = evalLiteral(literal); } catch (e) { skipped.push(route + ' (' + e.message.split('\n')[0] + ')'); continue; }
    if (!Array.isArray(questions)) { skipped.push(route + ' (not an array)'); continue; }

    questions.forEach((q, i) => {
        if (!q || typeof q.question !== 'string' || !Array.isArray(q.options)) {
            skipped.push(`${route}#${i} (malformed)`);
            return;
        }
        bank.push({
            id: `${section}/${slug}#${i}`,
            route, section, title,
            question: q.question,
            options: q.options,
            correct: q.correct ?? 0,
            explanation: q.explanation ?? '',
        });
    });
}

/* ── emit ───────────────────────────────────────────────── */
const dataDir = join(ROOT, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir);

const header = (what) =>
    `// GENERATED by scripts/build-learning-data.mjs — do not edit by hand.\n` +
    `// Regenerate with \`npm run build\` (prebuild) or \`node scripts/build-learning-data.mjs\`.\n` +
    `// ${what}\n\n`;

/* ── relatedness ────────────────────────────────────────── */
/* Precomputed so a visualizer page does not have to ship the whole index just
   to show a few sibling links. Index-encoded: routes and titles are listed
   once and each relation is a pair of integers into them. Storing the strings
   per relation made this file 44 KB, far too much to ship on every page. */
const routes = index.map(p => p.route);
const titles = index.map(p => p.name || p.title);
const routeAt = new Map(routes.map((r, i) => [r, i]));

/* Relation kinds, strongest first — the numeric order is also the display
   order, so the component can just sort descending.
     3 = the same algorithm taught under another section (rare but the most
         interesting link on the site: merge sort as a sort vs. as divide-and-conquer)
     2 = shares this page's pattern tag
     1 = a topical match in a different section
     0 = a topical match within the same section */
const KIND_SAME_ALGO = 3, KIND_PATTERN = 2, KIND_CROSS = 1, KIND_SECTION = 0;

/* Ranking by shared vocabulary rather than by section order.
   The first cut of this file fell back to "first four siblings in the same
   section", which is alphabetical: bubble sort pointed at bucket/heap/insertion
   /merge sort, and the CPU cache page pointed at the event loop. Under the Hood
   made the problem obvious — 26 unrelated explainers in one section, so the
   fallback was pure noise. Scoring the pages against each other by their own
   prose (title, index blurb, pattern tag, and the layout's description and
   keywords) puts caches next to virtual memory instead. */
const STOP = new Set(('a an and are as at be by for from how in into is it its of on or that the their then '
    + 'this to via what when where which why with you your step steps interactive interactively visualize '
    + 'visualizer visualization visualisation animation animated animations watch see understand understanding '
    + 'learn learning explained explainer example examples code python real time dsaverse algorithm algorithms '
    + 'data structure structures page pages using use used').split(' '));

const tokenize = (text) => (text.toLowerCase().match(/[a-z][a-z+]*/g) ?? [])
    .filter(w => w.length > 2 && !STOP.has(w));

/* Term frequencies per route, and document frequencies across the corpus. */
const tf = new Map();
const df = new Map();
for (const p of index) {
    const counts = new Map();
    for (const w of tokenize(corpus[p.route] ?? '')) counts.set(w, (counts.get(w) ?? 0) + 1);
    tf.set(p.route, counts);
    for (const w of counts.keys()) df.set(w, (df.get(w) ?? 0) + 1);
}

/* L2-normalised tf-idf vectors, so cosine similarity is just a dot product. */
const N = index.length;
const vec = new Map();
for (const p of index) {
    const v = new Map();
    let norm = 0;
    for (const [w, c] of tf.get(p.route)) {
        const weight = (1 + Math.log(c)) * Math.log(N / df.get(w));
        if (weight <= 0) continue;          // a term in every document carries nothing
        v.set(w, weight);
        norm += weight * weight;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [w, weight] of v) v.set(w, weight / norm);
    vec.set(p.route, v);
}

const cosine = (a, b) => {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let dot = 0;
    for (const [w, weight] of small) {
        const other = large.get(w);
        if (other !== undefined) dot += weight * other;
    }
    return dot;
};

const PER_PAGE = 4;
/* A cross-section link has to clear a real similarity bar; a same-section one
   does not, since "more in this section" is a defensible thing to offer even
   when the wording does not overlap. */
const CROSS_MIN = 0.07;

const relatedMap = {};
for (const page of index) {
    const mine = vec.get(page.route);
    const scored = [];

    for (const p of index) {
        if (p.route === page.route) continue;

        const sim = cosine(mine, vec.get(p.route));
        const sameSection = p.section === page.section;
        const samePattern = Boolean(page.pattern) && p.pattern === page.pattern;
        const sameAlgo = p.slug === page.slug;

        let kind;
        if (sameAlgo) kind = KIND_SAME_ALGO;
        else if (samePattern) kind = KIND_PATTERN;
        else if (sameSection) kind = KIND_SECTION;
        else if (sim >= CROSS_MIN) kind = KIND_CROSS;
        else continue;

        // The bonuses order the kinds; similarity breaks ties within a kind.
        const bonus = sameAlgo ? 10 : samePattern ? 1 : 0;
        scored.push({ route: p.route, kind, score: bonus + sim });
    }

    scored.sort((a, b) => b.score - a.score || a.route.localeCompare(b.route));
    const picked = scored.slice(0, PER_PAGE).map(x => [routeAt.get(x.route), x.kind]);
    if (picked.length) relatedMap[page.route] = picked;
}

const related = { routes, titles, map: relatedMap };

// JSON is emitted compact: these files are generated, and quizBank in
// particular is large enough that pretty-printing bloats the route chunk.
writeFileSync(join(dataDir, 'quizBank.js'),
    header(`${bank.length} questions collected from ${pages.length} visualizer pages.`) +
    'export const quizBank = ' + JSON.stringify(bank) + ';\n');

writeFileSync(join(dataDir, 'pageIndex.js'),
    header(`${index.length} pages with their section-index metadata.`) +
    'export const pageIndex = ' + JSON.stringify(index) + ';\n');

writeFileSync(join(dataDir, 'related.js'),
    header(`Up to 4 sibling pages per route, ranked by shared vocabulary.`) +
    'export const related = ' + JSON.stringify(related) + ';\n');

/* Just the headline counts. The review page renders its shell before the
   225 KB bank has loaded, and these are the only two numbers it needs up
   front — small enough to import synchronously, and generated so they cannot
   drift away from the bank the way a hardcoded "363" would. */
writeFileSync(join(dataDir, 'learningStats.js'),
    header('Headline counts for shells that render before the quiz bank loads.') +
    `export const totalQuestions = ${bank.length};\n` +
    `export const totalPages = ${index.length};\n`);

console.log(`quizBank:  ${bank.length} questions from ${pages.length} pages`);
console.log(`pageIndex: ${index.length} pages, ${index.filter(p => p.pattern).length} with a pattern tag`);
console.log(`related:   ${Object.keys(relatedMap).length} routes with sibling links`);
if (skipped.length) {
    console.log(`skipped ${skipped.length}:`);
    skipped.slice(0, 12).forEach(s => console.log('  ' + s));
    if (skipped.length > 12) console.log(`  ... and ${skipped.length - 12} more`);
}
