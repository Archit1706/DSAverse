# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build (also validates all pages)
npm start        # Run production build
npm run lint     # ESLint check (must be run manually — build ignores lint errors)
```

`npm run build` first runs `prebuild`, which is `node scripts/build-learning-data.mjs`. That regenerates the four files in `data/` that the review, compare, palette and "See also" features read, so they can never drift from the pages. Run it on its own when you want the data refreshed without a full build.

`next.config.mjs` sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`, so **always run `npm run build` after changes** to catch React/JSX errors that lint won't catch.

**Stop the dev server before building.** `next dev` and `next build` share the `.next` directory — running a build while the dev server is up deletes files out from under it, producing an ENOENT storm in the dev log and leaving pages that serve HTML but never hydrate (buttons render, clicks do nothing). Recovery is `rm -rf .next` and a dev-server restart.

**Several sessions in one checkout.** `next.config.mjs` sets `distDir` from `NEXT_DIST_DIR`, defaulting to `.next` (deployments never set it). When more than one session works in this checkout at once, each builds and previews into its own directory — `NEXT_DIST_DIR=.next-os npx next build` — so they cannot corrupt each other. `.next-*/` is git-ignored and lint-ignored. Use `npx next build` rather than `npm run build` there, since `prebuild` rewrites the shared `data/` files, and check generator output with `node scripts/build-learning-data.mjs --out <dir>`.

`npm run lint` only matches `.js`/`.mjs` files: the flat config has no entry for `.jsx`, so nothing under `components/` is linted today.

## Architecture

**DSAverse** is a Next.js 15 App Router educational platform for visualizing data structures and algorithms. Live at https://dsa-verse.vercel.app.

### Tech Stack
- **Next.js 15** App Router — `"use client"` on all interactive pages
- **React 19** — hooks only (useState, useEffect, useCallback); no Redux or Context
- **Tailwind CSS 4** — utility classes only; no component library
- **Lucide React** — all icons (no emojis anywhere in the codebase)
- **React Syntax Highlighter** — via `@/components/CodeBlock`
- **KaTeX** and **three.js** (`@react-three/fiber`, `@react-three/drei`) — Math pages only, via `components/math/` (see Math Pattern)

### Directory Layout

```
app/
  layout.js                      # Root layout (no Navbar/Footer — sections handle this)
  page.js                        # Homepage
  [section]/
    layout.js                    # Section layout: Navbar + Footer + section metadata
    loading.js                   # Section-specific loading animation (dark theme)
    page.js                      # Section index page (server component, no "use client")
    [algorithm]/
      layout.js                  # Per-page metadata only (exports metadata + passthrough Layout)
      page.js                    # Algorithm visualizer ("use client")
  cheatsheet/                    # Searchable Big-O complexity reference table ("use client")
  compare/                       # Side-by-side algorithm comparison ("use client")
  review/                        # Spaced-repetition practice over every quiz ("use client")
  contact/                       # Contact / GitHub page ("use client")
  under-the-hood/                # CS-internals explainers — own track-based index + stage-model pages
components/
  Navbar.jsx                     # Mega-menu driven by algorithmCategories.js + PAGES_EXIST set
  CodeBlock.jsx                  # Syntax-highlighted code block (wraps react-syntax-highlighter)
  GraphCustomizer.jsx            # Shared modal for custom graph input (BFS/DFS/Dijkstra)
  BinaryTreeCanvas.jsx           # Inorder-index SVG layout for binary trees (BST/AVL/red-black/splay)
  BTreeCanvas.jsx                # Width-aware n-ary SVG layout for B-trees and B+ trees
  CommandPalette.jsx             # Cmd/Ctrl-K search over every page (lazily loads pageIndex)
  RelatedPages.jsx               # "See also" block, mounted from each algorithm layout
  PredictStep.jsx                # Optional "what happens next?" prompts for step-based pages
  math/                          # Tex, Plane2D, Scene3D (+ canvas and primitives), MatrixInput, ParamSlider
  Hero.jsx, Features.jsx, AlgorithmsGrid.jsx, CTA.jsx, Footer.jsx
data/
  subjects.js                    # Subjects → sections: the top level of the site (plain data)
  algorithmCategories.js         # Single source of truth for nav categories and algorithm names
  quizBank.js                    # GENERATED — every quiz question on the site
  pageIndex.js                   # GENERATED — every page's metadata
  related.js                     # GENERATED — sibling links per route
  learningStats.js               # GENERATED — headline counts
lib/
  progress.js                    # localStorage: visited pages + spaced-repetition schedule
  random.js                      # Seeded RNG (mulberry32) for reproducible simulations
scripts/
  build-learning-data.mjs        # Emits the four generated data files (runs on prebuild)
```

### Subjects

The site has three levels: **subject → section → page**. `data/subjects.js` is the top level, and the only place that decides which subject a section belongs to:

```js
export const SUBJECTS = [
    { id: 'dsa', name: 'Data Structures & Algorithms', shortName: 'DSA', tagline: '…', sections: ['basics', 'recursion', …, 'indexing'] },
    { id: 'cs-core', name: 'CS Core', shortName: 'CS Core', tagline: '…', sections: ['operating-systems', 'computer-networks', 'database-systems', 'under-the-hood'] },
    { id: 'math', name: 'Mathematics', shortName: 'Math', tagline: '…', sections: ['combinatorics', 'probability-and-statistics', 'vectors', 'linear-algebra', 'differential-calculus', 'integral-calculus'] },
];
export function subjectOfSection(sectionSlug) { … }   // 'sorting' → 'dsa'
export function subjectOfPath(pathname) { … }         // '/sorting/bubble-sort' → 'dsa'
```

Sections are listed by their `app/` directory name, in display order. The file is **plain data — no icons, JSX or imports** — because the Node generator reads it as well as the app.

Everything that groups by subject reads it:

| Reader | What it does with subjects |
|---|---|
| `components/Navbar.jsx` | Mega-menu tabs, one per subject, opening on the subject of the current page; mobile panel headings |
| `components/AlgorithmsGrid.jsx` | One homepage block per subject, then a "Practice and reference" row (Cheatsheet, Review, Compare). Within a subject the cards keep the grid's own learning order, not `subjects.js` order |
| `components/Footer.jsx` | One link column per subject |
| `app/review/page.js` | Section progress grouped by subject, plus "Practise all of <subject>" (`buildQueue` takes `{ subject }` as well as `{ section }`) |
| `app/compare/page.js` | Subject filter chips in the picker |
| `components/RelatedPages.jsx` | Splits topical matches by subject — a link into another subject is headed "Related in <subject name>" |
| `scripts/build-learning-data.mjs` | Stamps `subject` on every `pageIndex` and `quizBank` entry, and counts pages per section and subject |

URLs do **not** carry the subject: pages stay at `/sorting/bubble-sort`, not `/dsa/sorting/bubble-sort`. Moving them would break every canonical URL in the sitemap and every inbound link.

A section with pages but no entry in `subjects.js` is never silently dropped: the generator prints a warning, and the Navbar and Review put it in a trailing "More" group. Only list a section once its index page exists.

### Two-Layout Pattern

Every section uses **two levels of layout.js**:

1. **Section layout** (`app/[section]/layout.js`) — server component that wraps with `<Navbar />`, `<main className="pt-16">`, `<Footer />`, and exports section-wide metadata with a title template:
   ```js
   export const metadata = { title: { template: "%s – Sorting | DSAverse", default: "..." } }
   export default function Layout({ children }) { return <><Navbar /><main className="pt-16">{children}</main><Footer /></> }
   ```

2. **Algorithm layout** (`app/[section]/[algorithm]/layout.js`) — exports per-page metadata only; just passes children through:
   ```js
   export const metadata = { title: "Bubble Sort Visualizer – ...", description: "...", keywords: [...] }
   export default function Layout({ children }) { return children; }
   ```

### Section Index Page Pattern

Section index pages (`app/[section]/page.js`) are **server components** (no `"use client"`). They follow this exact layout:

1. **Gradient header** matching the section's color theme
2. **Algorithm grid** — `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with equal-height cards:
   - Each `<Link>` has `className="h-full flex flex-col"`
   - Inner `<div>` has `h-full flex flex-col`
   - Card header: `bg-gradient-to-br from-[color] to-[color2]` containing icon + algorithm name
   - Card body: `flex-1 flex flex-col` with description, then `mt-auto` complexity rows
   - Complexity rows use `flex justify-between` with `<code className="bg-[color]/15 text-[color] ...">` badges
   - Difficulty badge with `getDifficultyColor()` helper
   - "Start Visualization" button at the bottom
3. **Info section** at the bottom — `bg-slate-900/70 border-t border-slate-700/50` with 3-column "Why Learn" grid

**Coming-soon cards**: Section indexes use an `available` boolean on each algorithm entry. When `available: false`, the card renders with reduced opacity, a "Coming Soon" label instead of the button, and the `<Link>` wrapper is replaced with a plain `<div>`. This lets you list planned algorithms without broken links.

### Section Color Themes

| Section | Gradient | Accent |
|---|---|---|
| Sorting | `from-orange-600 to-amber-700` | `orange-400` / `orange-500` |
| Searching | `from-red-600 to-rose-700` | `red-400` / `red-500` |
| Dynamic Programming | `from-rose-600 to-pink-700` | `rose-400` / `rose-500` |
| Graph Algorithms | `from-cyan-600 to-sky-700` | `cyan-400` / `cyan-500` |
| Heap-like Data Structures | `from-amber-500 to-orange-600` | `amber-400` / `amber-500` |
| Recursion | `from-green-600 to-emerald-700` | `green-400` |
| Basics | `from-blue-600 to-indigo-700` | `blue-400` |
| Two Pointers and Sliding Window | `from-violet-600 to-purple-700` | `violet-400` / `violet-500` |
| Bit Manipulation | `from-teal-600 to-cyan-700` | `teal-400` / `teal-500` |
| String Algorithms | `from-fuchsia-600 to-pink-700` | `fuchsia-400` / `fuchsia-500` |
| Backtracking | `from-indigo-600 to-purple-700` | `indigo-400` / `indigo-500` |
| Trees | `from-lime-600 to-green-700` | `lime-400` / `lime-500` |
| Divide and Conquer | `from-sky-600 to-blue-700` | `sky-400` / `sky-500` |
| Union-Find | `from-purple-600 to-violet-700` | `purple-400` / `violet-400` |
| Under the Hood | `from-zinc-600 to-slate-700` | `zinc-300` / `zinc-400` |
| Indexing | `from-emerald-600 to-teal-700` | `emerald-400` / `emerald-500` |
| Operating Systems | `from-yellow-500 to-amber-600` | `yellow-400` / `yellow-500` |
| Computer Networks | `from-pink-500 to-rose-600` | `pink-400` / `pink-500` |
| Database Systems | `from-blue-500 to-teal-600` | `blue-400` / `blue-500` |
| Combinatorics | `from-fuchsia-500 to-purple-600` | `fuchsia-400` / `fuchsia-500` |
| Probability and Statistics | `from-rose-500 to-red-600` | `rose-400` / `rose-500` |
| Vectors | `from-sky-500 to-blue-600` | `sky-400` / `sky-500` |
| Linear Algebra | `from-violet-500 to-indigo-600` | `violet-400` / `violet-500` |
| Differential Calculus | `from-emerald-500 to-green-600` | `emerald-400` / `emerald-500` |
| Integral Calculus | `from-teal-500 to-cyan-600` | `teal-400` / `teal-500` |

> **Note:** `Indexing` covers all 13 topics of the original curriculum, in two states: **9 built in the section**, and **4 cross-linked** to where they already live (Binary and Linear Search → `/searching/…`, Binary Search Trees / AVL Trees / Trie → `/trees/…`). Cross-linked cards carry an `href` that overrides the default `/indexing/${slug}` plus a `coveredIn` label; the card footer reads "Open in Trees →" rather than "Start Visualization →".
>
> **`data/algorithmCategories.js` lists only the 9 pages built inside the section**, not the 4 cross-linked ones — those already appear under Searching and Trees, and listing them here would point the nav at `/indexing/…` routes that do not exist. The Navbar links every entry of a `PAGES_EXIST` category without checking, so only add a name here once its page is in place.

> **CS Core sections** (Operating Systems, Computer Networks, Database Systems — 10 pages each) use the same cross-link pattern for topics that already live elsewhere: Operating Systems links seven Under the Hood explainers (Processes vs Threads, Virtual Memory and Paging, …), Computer Networks five, and Database Systems links How a Database Query Executes plus B Trees and B+ Trees in Indexing. Where Big-O does not describe a topic, the index card's `time` / `space` hold a short descriptor instead ("1.5 RTT to open", "Per-level read rules"), as Under the Hood does. Two Networks names need `SLUG_OVERRIDES` entries because `toSlug()` keeps `/` and `.`: `OSI and TCP/IP Layers` and `HTTP/1.1 vs HTTP/2 vs HTTP/3`.

### Algorithm Visualizer Pattern

Every algorithm page (`"use client"`) follows this structure:

**Step generation** — pre-generate ALL steps upfront, never incrementally:
```js
// Option A: module-level function (preferred for pages where inputs are passed as args)
const generateSteps = (input) => {
    const steps = [];
    steps.push({ ...state, explanation: '...', phase: '...' });
    return steps;
};
useEffect(() => { setStepHistory(generateSteps(arr)); setCurrentStep(0); }, [arr]);

// Option B: useCallback (when step gen closes over component state)
const generateSteps = useCallback(() => { ... }, [dep1, dep2]);
useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); }, [generateSteps]);
```

**Animation — always `setTimeout`, never `setInterval`:**
```js
useEffect(() => {
    if (!isPlaying || stepHistory.length === 0) return;
    if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
    const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
    return () => clearTimeout(t);
}, [isPlaying, currentStep, stepHistory, speed]);
```

**Controls** (standard set across all pages):
- `SkipBack` / `SkipForward` for manual stepping
- Play/Pause toggle
- Reset (`RotateCcw`) — resets to step 0
- Shuffle (`Shuffle`) — generates new random input
- Speed: `<input type="range" min="200" max="2000" value={speed}>` — higher = slower

**Layout** — two common variants:
- Simple: `lg:grid-cols-2` (left = visualization, right = sidebar)
- Wider viz: `lg:grid-cols-3` with `lg:col-span-2` on the visualization panel and `col-span-1` on the sidebar

**Element color conventions (dark theme):**

| State | Classes |
|---|---|
| Default / unchecked | `bg-slate-700 border-slate-600 text-slate-100` |
| Active / comparing | `bg-yellow-400 border-yellow-300 text-slate-900 scale-110` |
| Found / complete | `bg-green-500 border-green-400 text-white scale-105` |
| Eliminated / checked | `bg-slate-800 border-slate-700 text-slate-500` |
| In search range / window | `bg-[section-color]-800/50 border-[section-color]-700 text-slate-200` |
| Left pointer (two-pointer pages) | `bg-blue-500 border-blue-400 text-white scale-110` |
| Right pointer (two-pointer pages) | `bg-orange-500 border-orange-400 text-white scale-110` |
| Mismatch / duplicate | `bg-red-500/30 border-red-500 text-red-300` |

**Step explanation box:**
```jsx
<div className="bg-[color]-500/10 border border-[color]-500/20 rounded-lg p-4">
    <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-[color]-400 mt-0.5 flex-shrink-0" />
        <p className="text-[color]-300 text-sm leading-relaxed">{currentState.explanation}</p>
    </div>
</div>
```

### Active Recall Quiz Pattern

Every algorithm page includes a 3-question quiz in the right sidebar. Standard implementation:

```js
const quizQuestions = [{ question, options: [4 strings], correct: 0|1|2|3, explanation }];
const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

const handleQuizAnswer = (idx) => {
    if (quizState.answered) return;
    const correct = idx === quizQuestions[quizState.current].correct;
    setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
};
const nextQuestion = () => {
    if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
    else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
};
```

Button states: unanswered → `hover:border-[color]-500`; correct → `border-green-500 bg-green-500/10 text-green-300`; wrong → `border-red-500 bg-red-500/10 text-red-300`; other → `text-slate-500`.

### Bit Manipulation Binary Register Pattern

Bit manipulation pages display numbers as 8-bit registers using a `toBin` helper and a `BitRow` sub-component:

```js
const BITS = 8;
const toBin = (n) => (n >>> 0).toString(2).padStart(BITS, '0');

function BitRow({ label, value, color, highlight, highlightMask }) { /* ... */ }
```

The three-row layout shows `n`, `n-1`, and `n & (n-1)` stacked with a labelled divider (`AND ↓`). Bits that changed between rows use `bg-orange-500 text-white scale-105` to call out the operation. These pages use `type="number"` inputs (1–255) or a `PRESETS` array cycled by the Shuffle button, rather than random-array shuffle.

### String Algorithm Input & Two-Phase Pattern

String algorithm pages (KMP, Rabin-Karp, Z-Algorithm) share a different input model:

```js
const PRESETS = [{ text: '...', pattern: '...' }, ...];
// Input fields: toUpperCase(), slice to max length
<input value={text} onChange={e => setText(e.target.value.toUpperCase().slice(0, 25))} />
```

Step generation often has two phases in the same `stepHistory` array, distinguished by the `phase` field:

```js
// KMP example — phase drives which panel is rendered
steps.push({ phase: 'lps', lps: [...], ... });   // Phase 1: build failure function
steps.push({ phase: 'matching', textI, patJ, ... }); // Phase 2: search
```

Conditional rendering uses `['lps', 'lps_done'].includes(phase)` guards so only the relevant visualization panel is shown at each step.

### Quiz Panel Extraction

When the quiz logic is complex, it is extracted as a local `QuizPanel` component within the page file (not a shared component). Pass `quizState` and `setQuizState` as props:

```jsx
function QuizPanel({ quizState, setQuizState }) { /* ... */ }
// Usage inside the page:
<QuizPanel quizState={quizState} setQuizState={setQuizState} />
```

This keeps the quiz reusable within the file without polluting the global component namespace.

### DP Table Visualization Pattern

2D DP table pages (LCS, Edit Distance, Knapsack, Matrix Chain Multiplication) share a common rendering approach:

- Table headers show string characters or matrix labels; row 0 / col 0 show base-case values
- A `getCellColor(i, j, val)` function returns Tailwind classes based on: current cell, backtrack path membership, fill phase, and value magnitude
- `Infinity` values display as `∞`; large numbers use `.toLocaleString()` or abbreviations (`12k`)
- Backtrack / optimal path cells use `bg-purple-700` (or `bg-purple-800` during animation)
- The `phase` field in each step object drives color: `'comparing'`, `'match'`, `'no_match'`, `'backtracking'`, `'complete'`

### Tree Visualizer SVG Pattern

Binary tree pages share **`components/BinaryTreeCanvas.jsx`** — an inorder-index layout (x = inorder position, y = depth) so nodes never overlap whatever shape the tree takes, including a fully degenerate spine. Pages pass a `styleFor(node)` callback instead of re-deriving geometry:

```jsx
import BinaryTreeCanvas from '@/components/BinaryTreeCanvas';

<BinaryTreeCanvas
    tree={step.tree}
    yGap={78} minXGap={52} maxXGap={84} widthBudget={600}
    styleFor={(node) => ({ fill, stroke, text, radius, strokeWidth })}
    subLabelFor={(node) => ({ text: `bf=${bf(node)}`, fill })}   // optional second line
    edgeStrokeFor={(parent, child) => '#334155'}                 // optional
/>
```

Used by `binary-search-tree`, `avl-tree` (balance factors via `subLabelFor`), `red-black-trees` (colour via `styleFor`) and `splay-trees`. It also exports `computeLayout`, `nodeCount` and `treeHeight`.

**`components/BTreeCanvas.jsx`** is the n-ary counterpart for B-trees and B+ trees: nodes are sized by key count and a parent is centred over the span of its children, which the binary helper cannot express. It takes `showLeafLinks` for the B+ leaf chain and `scanRange` / `foundKeys` for range scans.

Pages with their own node model (`trie`, `radix-tree`, `ternary-search-tree`, `segment-tree`) keep a local SVG, since edge labels and three-way branching do not fit either shared canvas.

**Tree page specifics:**
- BST (`binary-search-tree`) — search + insert operations with traversal path highlighting; `visited[]` array tracks path, `current` is the node being compared; "Keep this tree" button lets user chain inserts
- AVL (`avl-tree`) — preset insertion sequences demonstrating all 4 rotation types; `bf` (balance factor) stored on each node; rotation type detected by checking the naive-BST-insert tree before rebalancing
- Traversals (`binary-tree-traversals`) — fixed 8-node tree; 4 modes (Inorder/Preorder/Postorder/Level-Order); call-stack panel shown for DFS modes; visit order row at bottom
- Segment Tree (`segment-tree`) — array-backed 1-indexed tree (`tree[1]` = root); nodes 1–15 shown for up to 8-element arrays; build + range-query modes; query highlights out/in/partial nodes differently
- Trie (`trie`) — characters as edge labels (rendered as `<text>` on each `<line>`); `isEnd` nodes get double-circle; insert mode shows step-by-step edge creation; search shows found/not-found path coloring

### Graph-Specific Patterns

**SVG visualization** — always use `viewBox="0 0 W H"` with `width="100%"` so the graph scales to its container without horizontal scrolling. Never use fixed pixel widths like `width={800}`.

**GraphCustomizer** (`components/GraphCustomizer.jsx`) — shared modal for BFS, DFS, Dijkstra. Exports:
- `layoutNodes(nodeCount)` — arranges n nodes in a circle
- `parseGraphInput(text, format, weighted)` — parses edge list / adjacency list / matrix
- `GraphCustomizer` — the modal component (`weighted` prop for Dijkstra)

Usage pattern in graph pages:
```js
const [customGraph, setCustomGraph] = useState(null);
const nodes = customGraph ? layoutNodes(customGraph.nodeCount) : DEFAULT_NODES;
const edges = customGraph ? customGraph.edges : DEFAULT_EDGES;
const adj   = customGraph ? customGraph.adj   : DEFAULT_ADJ;

// Clamp startNode when switching to a smaller custom graph
useEffect(() => { setStartNode(prev => Math.min(prev, nodes.length - 1)); }, [nodes.length]);
```

### "Under the Hood" Section (CS Internals Explainers)

The `under-the-hood` section is **not** an algorithm category — it's a set of conceptual, multi-act animated explainers (Python execution pipeline, memory model, event loop, multithreading, "what happens when you search a URL", etc.). It follows its own conventions:

**Index page** (`app/under-the-hood/page.js`) — unlike other section indexes, it is **not a flat algorithm grid**. It groups entries into `tracks` (Language Runtimes, Concurrency, The Web, Object-Oriented Programming, Systems). Each track has `{ id, name, desc, icon, color: 'zinc', algorithms: [...] }`, and each entry carries `{ name, slug, description, complexity, space, pattern, difficulty, available }`. The whole section uses the **zinc/slate** theme (`from-zinc-600 to-slate-700`) regardless of track. `available: false` entries render with `Construction` icon, `opacity-60`, and a "Coming Soon" label instead of a `<Link>`.

**Visualizer pages** follow the same `generateSteps()` + `setTimeout` + standard-controls skeleton as algorithm pages, but with a **multi-act model** instead of a single algorithm run. There is no shuffle/random input — every step is hand-authored with its own explanation string, so these pages run 400–1300 lines.

Two generations of this pattern exist in the tree. **Write new pages in the Act style** (below); the older `STAGES` + `phase` style (`python-execution-pipeline`, `python-memory-model`, `async-await-and-event-loop`, `what-happens-when-you-search-a-url`) is legacy and only differs in naming and in re-rendering a fresh scene per phase.

**Act model + persistent animated stage** (`cpu-cache-hierarchy`, `virtual-memory-and-paging`, `processes-vs-threads`, `https-and-tls` are the reference implementations):

```js
const ACTS = [{ id: 1, label: 'Speed Gap', icon: Gauge }, ...];   // 6–8 acts, each with a Lucide icon

function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });
    s(1, 'The Speed Gap', { ladder: true }, 'A modern CPU core executes billions of…');
    return steps;
}
const STEPS = generateSteps();   // module-level constant — inputs never change
```

Key structural pieces:

- **One persistent `<svg>` stage component** (e.g. `CacheStage`, `PagingStage`) that stays mounted across all steps in its acts. Geometry lives in module-level constants (`LEVELS`, `ANCHOR`, `WIRES`); the step object only sets *state* (`active`, `hit`, `missed`, `token`, `activeWire`). Transitions come from CSS (`transition: fill .4s ease`) and a `translate()` on a moving token `<g>` — never from re-mounting elements. Staggered reveals use `style={{ transitionDelay: \`${i * 55}ms\` }}`.
- **A `VisualizationPanel({ step })` router** that picks the scene: special one-off scenes (an intro ladder, a recap grid) short-circuit on a boolean flag in the step; everything else falls through to the persistent stage.
  ```js
  function VisualizationPanel({ step }) {
      if (!step) return null;
      if (step.ladder) return <LadderScene emphasizeHuman={step.emphasizeHuman} />;
      if (step.recap)  return <RecapCards wins={step.wins} />;
      return <CacheStage step={step} />;
  }
  ```
- **Act timeline chips** in the gradient header — clickable, jump to `STEPS.findIndex(s => s.act === act.id)` and pause. Current act `bg-white/20 text-white border-white/30`; completed `bg-white/5 text-zinc-400`; future `text-zinc-600 border-transparent`.
- **Progress bar** under the header: `<div className="h-0.5 bg-slate-800">` with an inner `bg-gradient-to-r from-zinc-500 to-slate-400` at `width: ${pct}%`.
- **Panel chrome** — `Act {step.act} of 8 · {step.actName}` on the left of the viz header, `step {n}` on the right; the viz body is `min-h-[420px] flex items-center` so scenes of different heights don't jolt the layout.
- **Controls** — Reset / SkipBack / Play-Pause / SkipForward + speed slider. **No Shuffle button** (no random input to generate).
- **Sidebar** — explanation box (`bg-zinc-500/10 border-zinc-500/20`), then a small reference table whose rows highlight when the current act is in their `acts: [...]` list, then the quiz.

Because inputs are fixed, the animation effect drops `stepHistory` from its deps: `}, [isPlaying, currentStep, speed]);`.

### Math Pattern (manipulation, formulas and 3D)

The **Math** subject (`math` in `data/subjects.js`) has six sections, 51 pages in all: Combinatorics, Probability and Statistics, Vectors, Linear Algebra, Differential Calculus and Integral Calculus. Its pages need what step playback alone cannot give: **direct manipulation** (drag a vector, slide `n`), **typeset formulas**, and occasionally **3D**. The shared pieces live in `components/math/` and `lib/random.js`, and every Math page uses them rather than inventing its own.

**Reference implementations** — read both before building a Math page:

- `app/linear-algebra/matrix-as-a-transformation/` — the 2D pattern: draggable vectors, a `MappedGrid`, `MatrixInput` bound both ways, a live formula, a Guided/Explore toggle sharing one picture, and predict prompts.
- `app/linear-algebra/determinant/` — the same plus a 3D tab: `Scene3D` with a `Parallelepiped`, snap views, a WebGL fallback, and three.js loaded only when the 3D tab opens.

**Components**

| Import | What it is |
|---|---|
| `Tex` from `@/components/math/Tex` | KaTeX: `<Tex>{source}</Tex>` inline, `<Tex block>` for display. Pass the source as a `String.raw` template literal so backslashes survive. Also exports `texNum(x, digits)` and `texMatrix(rows)` for substituting live values |
| `Plane2D` from `@/components/math/Plane2D` | SVG coordinate plane in world units (`xRange`, `yRange`, `grid`), scales to its container. Children: `Vector`, `Point`, `Segment`, `Polygon`, `FunctionPlot`, `ShadeUnder`, `Label`, `MappedGrid`. `onDrag` on `Vector`/`Point` makes the tip a handle (mouse, touch, and arrow keys; `snap` rounds). `usePlane()` gives `toScreen`/`toWorld` for custom shapes. `MATH_COLORS` is the shared palette |
| `Scene3D` from `@/components/math/Scene3D` | Orbitable 3D scene, maths coordinates (z up). Children are a **render prop** receiving the primitives: `{(P) => <P.Arrow3D to={[1,0,0]} />}` — `Arrow3D`, `Point3D`, `Line3D`, `Label3D`, `Plane3D`, `Polygon3D`, `Parallelepiped`, `Surface3D`, `THREE`. Iso/Top/Front/Side snap views, +/− zoom (wheel zoom is off so the page still scrolls), and a `fallback` prop shown when WebGL is unavailable |
| `MatrixInput` from `@/components/math/MatrixInput` | Editable 2×2/3×3 matrix (`value` as rows, `onChange`), with per-column colours so a column reads as "where î lands" |
| `ParamSlider` from `@/components/math/ParamSlider` | Labelled slider with its live value; `accent` is one of the Math colours |
| `createRng(seed)` from `@/lib/random` | Seeded generator (mulberry32) with `next`, `int`, `chance`, `pick`, `shuffle`, `normal`. Every simulation uses it, with the seed kept in state, so a run can be replayed, stepped backwards and tested. `randomSeed()` makes a new seed for Shuffle |

`MATH_COLORS` gives every page the same meanings: `i` green, `j` red, `k` blue (the basis vectors), `a` amber and `b` purple (generic inputs), `result` pink (an output), `curve` sky and `curve2` orange (f and f′ or g), `area` yellow, `negative` rose (negative area, flipped orientation).

**Rules every Math page follows**

- **The picture and the numbers are bound both ways.** Dragging changes the numbers; typing a number moves the picture. Grabbing a handle during the guided tour switches to Explore, starting from what is on screen.
- **Each formula is shown with the current values substituted in**, next to the picture — `(2)(1) − (1.5)(0) = 2`, not only `ad − bc`.
- **Guided and Explore share one picture.** Guided pre-generates steps with the standard controls, the explanation box and predict prompts; Explore lets the learner manipulate freely.
- **3D only where the idea is three-dimensional** (cross products, volumes, planes, surfaces), with the numbers always visible alongside.
- **Quiz questions, step explanations and index cards use plain Unicode maths** — n!, √, ∑, x², ≤, θ — never LaTeX. Review and the ⌘K palette show those strings as plain text, so `\frac` would appear raw.
- **Index cards** carry `formula` (the key formula in Unicode, e.g. `C(n, k) = n! / (k! (n − k)!)`) and `prereq` (the page it builds on) in place of time and space; the generator copies both into `pageIndex`, and Compare shows them as "Key formula" and "Builds on".
- **`page.js` exports only its default component.** Keep `generateSteps`, `predictFor` and presets as module-level constants without `export`; property tests read them from the source.

**Why the 3D pieces are built the way they are**

- three.js, `@react-three/fiber` and `@react-three/drei` load only on the client and only when a scene mounts: `Scene3D` imports its canvas with `next/dynamic` (`ssr: false`), and pages receive the primitives through the render prop instead of importing them. A non-Math page ships none of it, and the Determinant page fetches three.js only when its 3D tab opens.
- 3D labels are canvas-texture sprites. drei's `<Html>` creates a separate React root per label and unmounts it synchronously, which under React 19 throws `removeChild` errors on re-render; drei's `<Text>` fetches its font from a CDN.
- The canvas renders on demand (`frameloop="demand"`), so a still scene costs nothing.
- KaTeX adds about 75 KB gzipped to a Math page. It runs on the client because the formulas update as you drag.

**Testing.** Property-test the maths against independent identities, not against the page's own helpers: nCr against Pascal's triangle, Bayes against enumeration, determinants against the shoelace formula and cofactor expansion, `det(MN) = det(M)·det(N)`, `Av = λv` for every eigenpair, Riemann sums converging to the exact integral, derivatives against finite differences. Predict prompts follow the rules in Learning Features, including the best-fixed-button and best-fixed-label rates. The reference pages' suite is in `%TEMP%\dsaverse-math-tests\linear-algebra\reference-pages.test.mjs` — it slices the real pure code out of `page.js` (everything above `quizQuestions`, imports stripped) and runs 16,000+ checks.

### Navbar — Adding a New Section

`components/Navbar.jsx` has a `PAGES_EXIST` set that gates which categories appear in the dropdown:
```js
const PAGES_EXIST = new Set([
    'Basics', 'Recursion', 'Sorting', 'Searching',
    'Heap-like Data Structures', 'Dynamic Programming',
    'Graph Algorithms', 'Two Pointers and Sliding Window',
    'Bit Manipulation', 'String Algorithms', 'Backtracking', 'Trees',
    'Divide and Conquer', 'Union-Find', 'Indexing', 'Under the Hood',
    'Operating Systems', 'Computer Networks', 'Database Systems',
    'Combinatorics', 'Probability and Statistics', 'Vectors',
    'Linear Algebra', 'Differential Calculus', 'Integral Calculus',
]);
```
Add the new category name here when its section page is ready. The `toSlug()` helper converts algorithm names to URL slugs: lowercased, apostrophes stripped, spaces/colons → hyphens, parentheses removed — so `Dijkstra's Shortest Path` → `dijkstras-shortest-path` and `Subsets (Power Set)` → `subsets-power-set`. `CAT_META` in the same file maps each category name to a Lucide icon and a Tailwind gradient for the mega-menu chip — add an entry there too. Then add the section's directory name to its subject in `data/subjects.js`, which decides which mega-menu tab it appears under.

A name whose slug still does not match its directory goes in the `SLUG_OVERRIDES` map just above `toSlug()`, which short-circuits the whole derivation:

```js
const SLUG_OVERRIDES = {
    'Single Number (XOR)': 'single-number',
    'Count Set Bits (Brian Kernighan)': 'count-set-bits',
};
```

Use it rather than widening `toSlug()`: dropping parenthetical content wholesale would break `Subsets (Power Set)`, whose directory keeps it.

### `data/algorithmCategories.js`

The single source of truth for nav structure. Algorithm names here must match their directory slugs (via `toSlug()`, or an entry in `SLUG_OVERRIDES`). The Navbar filters to `PAGES_EXIST` categories, but it does **not** check that the page exists — an entry here with no directory renders a dead mega-menu link, so only list algorithms that are actually built.

### Adding a New Algorithm Page — Checklist

1. Create `app/[section]/[slug]/layout.js` — metadata + passthrough layout, **including `alternates: { canonical: "/[section]/[slug]" }`** (see SEO below)
2. Create `app/[section]/[slug]/page.js` — `"use client"` visualizer
3. Add the algorithm name to `data/algorithmCategories.js` under the correct section
4. If the section index has an `available` flag, flip it to `true` (or add the entry)
5. Add the slug to its section's array in `app/sitemap.js`
6. Run `npm run build` to confirm no errors — `prebuild` picks the new page's quiz and metadata up automatically, so `data/` needs no hand editing

The repo history commits a new page as **three separate commits**, in this order — keep it up:

```
Add <Name> layout metadata          # layout.js only
Build <Name> visualizer             # page.js only
Mark <Name> as available in <Section> index   # index page.js (+ algorithmCategories.js)
```

This keeps the index flip — the commit that actually makes the page reachable — separate from the page itself, so a half-finished visualizer is never linked from the site.

### SEO

**Every `layout.js` must set its own `alternates: { canonical: "/its/route" }`.** Next.js merges metadata shallowly and `alternates` is inherited, so a layout that omits it silently adopts its parent's canonical — which previously made all 128 routes declare the homepage as their canonical URL. Paths are relative; `metadataBase` in `app/layout.js` resolves them.

`app/sitemap.js` lists every route explicitly instead of deriving them from `data/algorithmCategories.js`. That file drives the nav menu, and several of its entry names do not round-trip through `toSlug()` to a real directory, so generating the sitemap from it would publish URLs that 404. Keep the two in sync by hand (step 5 above).

`app/robots.js` allows everything and points at `/sitemap.xml`.

### Generated Learning Data

`scripts/build-learning-data.mjs` runs on the `prebuild` npm hook, so `npm run build` always regenerates it. It walks `app/*/*/page.js`, slices the balanced array literals out of each file and evaluates them in a Proxy sandbox where every free identifier resolves to `null` — that is what lets `icon: TreePine` evaluate out of context. Self-closing JSX (`icon: <List className="h-7 w-7" />`, which Basics and Heap-like Data Structures use) is replaced with `null` first, since JSX is not valid JS; without that step those two indexes threw and silently lost their metadata.

It emits four files into `data/`, each headed with a do-not-edit warning:

| File | Size | Contents |
|---|---|---|
| `quizBank.js` | ~390 KB | All 606 quiz questions, tagged with route, section and subject |
| `pageIndex.js` | ~94 KB | Every page's name, description, difficulty, pattern, time and space (or formula and prereq) |
| `related.js` | ~26 KB | Up to 4 sibling pages per route |
| `learningStats.js` | <1 KB | `totalQuestions`, `totalPages`, `pagesBySection`, `pagesBySubject` |

**Never edit these by hand** — regenerate with `node scripts/build-learning-data.mjs`.

Every `pageIndex` and `quizBank` entry carries a `subject` as well as its `section` (see Subjects above). The homepage stats, the CTA chip and the per-section badges all read `learningStats.js`, so none of those numbers are typed by hand any more — the Hero's had drifted to half the real figures.

Three things the generator has to get right, all of which were wrong at first:

- **Cross-link cards do not describe the page.** A card with an `href` outside its own section (Indexing's "Binary Search Trees", pointing at `/trees/binary-search-tree`) is skipped when collecting metadata; the owning section's entry is the one that counts. It used to be keyed by its `href` and overwrite the owner's entry whenever its index happened to be read last — right only by alphabetical luck.
- **Field aliases.** Section indexes do not agree on key names. `pattern` is also written as `type`, `category` or `tag`; `time` as `timeComplexity` or (in Under the Hood) `complexity`; `space` as `spaceComplexity`. All are mapped.
- **Relatedness ranking.** `related.js` scores pages against each other with tf-idf over their own prose — title, index blurb, pattern tag, the layout's description and keywords, and the page body's explanation strings (Tailwind class strings are stripped first, or the shared utility vocabulary swamps everything). Ranking on metadata alone was far too thin: it put the array-list page next to the CPU cache page, and within a section it degenerated to alphabetical order, so bubble sort pointed at bucket/heap/insertion/merge sort. Relation kinds, strongest first: `3` same algorithm in another section, `2` shared pattern tag, `1` topical match elsewhere, `0` sibling in the same section.

Because `learningStats.js` is tiny it is imported synchronously, including from `metadata` objects. `quizBank.js` is not: `app/review/page.js` pulls it in with a dynamic `import()` on mount, which keeps the route chunk at ~18 KB instead of ~400 KB.

### Learning Features

Four pieces sit on top of the generated data.

**`lib/progress.js`** — the only state layer in the project. Keys `dsaverse.visited.v1` and `dsaverse.schedule.v1` in localStorage; no account, no backend. The schedule is a small SM-2 variant (intervals `[0, 1, 3, 7, 16, 35]` days, ease clamped to `[1.3, 2.8]`, a wrong answer resets the step to 0). Every read and write is wrapped in `typeof window === 'undefined'` plus try/catch, so private windows and blocked site data degrade to "no progress recorded" rather than throwing.

**`app/review/`** — spaced-repetition practice over the whole quiz bank. Three states in one page: dashboard (due/learning/known/unseen tiles, mastery bar, per-section grid), session card (15 questions, `1`–`4` keyboard shortcuts, `Enter` to advance, a link back to the visualizer), and summary. The quiz bank loads on mount, so `ready` is simply `bank !== null` and the server and first client render agree on an empty shell.

**`app/compare/`** — any two or three pages side by side, from `pageIndex`. Preset comparisons are included so the page is useful before anything is picked. The "lowest" badge on time and space uses the `COMPLEXITY_RANK` table and deliberately shows nothing when the entries tie or are unrecognised.

**`components/RelatedPages.jsx`** — the "See also" block, mounted from each algorithm `layout.js` rather than from the 202 pages:

```jsx
import RelatedPages from '@/components/RelatedPages';

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/sorting/bubble-sort" /></>);
}
```

The `route` prop is always the layout's own `alternates.canonical`. It also calls `markVisited(route)`, which is what the review dashboard reads.

**`components/CommandPalette.jsx`** — ⌘K / Ctrl+K search over every page, mounted in the Navbar. It imports `pageIndex` dynamically on first open, because the Navbar is on every route and the index is ~94 KB.

**`components/PredictStep.jsx`** — optional "what happens next?" prompts, on 88 pages: the eight below, all ten in Operating Systems and Database Systems, nine of the ten in Computer Networks (OSI and TCP/IP Layers has none — every step there is forced), and all 51 Math pages. The original eight:

| Page | The question | Decided by |
|---|---|---|
| `sorting/bubble-sort` | Does this pair swap? | `next.swaps` |
| `sorting/selection-sort` | Does the running minimum move? | `next.minIndex` |
| `sorting/insertion-sort` | Does this element shift right? | `next.swaps` |
| `searching/binary-search` | Left half, right half, or found? | `midVal` vs `target`, on the step |
| `graph-algorithms/breadth-first-search` | Which node comes off the queue? | `step.queue[0]` — FIFO |
| `graph-algorithms/depth-first-search` | Where does backtracking return to? | top of `step.stack` — LIFO |
| `trees/binary-search-tree` | Does the walk go left or right? | `step.target` vs `step.current` |
| `union-find/union-by-rank` | Which root wins the merge? | `step.rank[rootA]` vs `step.rank[rootB]` |

The page supplies `predictFor(step, nextStep)` returning `{ question, options, correct, because }` or `null`:

```jsx
const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
<PredictToggle predict={predict} accent="orange" />
{predict.prompt && <PredictPrompt predict={predict} accent="orange" />}
```

Four things this pattern depends on:

- `predictFor` lives at **module scope**, so its identity is stable across renders.
- The prompt **hides the step explanation** (`predict.hideExplanation`) until an answer is in, because these pages write the outcome into the explanation itself ("…need to swap!", "23 < 50 → go left").
- The question must be answerable from the step object alone. Insertion sort is the cautionary case: its comparison steps carry `comparisons: [j, i]`, but each shift copies a value into the key's old slot, so from the second comparison onward `step.array[i]` is no longer the key. That page's prompt therefore uses positional wording instead of quoting the key's value. Where a step genuinely lacked the data, the **generator** was given the missing field rather than the predicate inferring it: binary search's mid-check step gained `probe`/`midVal`/`target`, and the BST comparison steps gained `target`.
- When the options come from live data rather than a fixed list, their **order is derived from the step**, so "always click the first button" does not score. BFS and DFS rotate their candidates by the traversal-order length; union by rank lists the two roots by node number, which is uncorrelated with rank (listing them in find order would have put the winner first on every tie). Position is not the only leak: if one *answer* is right nearly every time ("Forward" on a switch that has already learned the MAC), shuffling cannot help — ask only when the outcome is genuinely in doubt. Test suites should print the best fixed-button rate against chance; the bar is within about ten points.

`usePredict` stores its answers together with the step stream they were given on (the `stepHistory` array identity), so Shuffle, a new preset or a different algorithm starts the new run unanswered. Pages need no reset effect of their own; this used to carry the old run's answers onto the new one.

`accent` is a key into the `ACCENTS` map of complete class strings, not an interpolated colour — Tailwind only emits classes it can see as literals. Entries exist for `orange`, `indigo`, `red`, `cyan`, `lime`, `purple`, `yellow`, `pink`, `blue`, and for Math `fuchsia`, `rose`, `sky`, `violet`, `emerald` and `teal`; add one per section colour before using it.

Before shipping a new prompt, property-test it: slice the real `generateSteps` and `predictFor` out of the page source, run them over a few hundred random inputs, and assert that `correct` matches ground truth computed independently **and** matches what the next step in the real stream actually does, with no `undefined`/`NaN` in any generated string and no duplicate option labels (`PredictPrompt` keys its buttons by label). The sorting pass checked 12,723 prompts this way, the five pages above another 6,252; both runs caught real bugs.

Pages deliberately left without prompts, because the next step is not determined by the step the learner is looking at:

- `union-find/quick-find` — the only real question ("does `id[i]` change?") compares `id[i]` with the component label the union started from, but the scan overwrites `id[p]` on the way past, so from then on the step no longer holds that label. The insertion-sort hazard again, with no positional rewording available.
- `union-find/quick-union` — the single branch is which root wins, and naive quick-union has no rule: it is `parent[rootA] = rootB` every time. Nothing on screen implies that, so the first prompt is a coin toss.
- `union-find/path-compression` — every step is forced (walk the chain, then re-point each node on it). There is no decision to predict.
- "Which neighbour does the traversal discover next?" on the graph pages — that needs the adjacency list, which the steps do not carry and whose order the drawing does not show.

### Build Status

232 routes in total: 202 visualizer and explainer pages, 25 section indexes, the homepage, and `/cheatsheet`, `/contact`, `/review` and `/compare`. Three subjects: DSA (95 pages in 15 sections), CS Core (56 pages in 4 — Operating Systems, Computer Networks and Database Systems with 10 each, Under the Hood with 26) and Math (51 pages in 6 — Combinatorics 8, Probability and Statistics 9, Vectors 7, Linear Algebra 10, Differential Calculus 9, Integral Calculus 8). Every one of the 202 pages carries a 3-question active-recall quiz, 606 questions in all.

**There are no `available: false` entries left anywhere** — every section index advertises only pages that exist. The flag and its Coming Soon rendering are still supported, so a newly planned topic can use them.

When asked to work on "what's left": check `available: false` first, then look for gaps against `data/algorithmCategories.js`. Because the listed sections are essentially complete, a new topic usually means *adding* an entry to both the section index and `algorithmCategories.js` rather than flipping an existing flag — which is a scope decision worth confirming rather than assuming.

### AGENTS.md

`AGENTS.md` at the repo root is a near-verbatim copy of this file for other coding agents. When you change architectural guidance here, mirror it there (the only intended difference is the opening line naming the tool).
