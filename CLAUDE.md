# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build (also validates all pages)
npm start        # Run production build
npm run lint     # ESLint check (must be run manually — build ignores lint errors)
```

`next.config.mjs` sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`, so **always run `npm run build` after changes** to catch React/JSX errors that lint won't catch.

## Architecture

**DSAverse** is a Next.js 15 App Router educational platform for visualizing data structures and algorithms. Live at https://dsa-verse.vercel.app.

### Tech Stack
- **Next.js 15** App Router — `"use client"` on all interactive pages
- **React 19** — hooks only (useState, useEffect, useCallback); no Redux or Context
- **Tailwind CSS 4** — utility classes only; no component library
- **Lucide React** — all icons (no emojis anywhere in the codebase)
- **React Syntax Highlighter** — via `@/components/CodeBlock`

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
components/
  Navbar.jsx                     # Mega-menu driven by algorithmCategories.js + PAGES_EXIST set
  CodeBlock.jsx                  # Syntax-highlighted code block (wraps react-syntax-highlighter)
  GraphCustomizer.jsx            # Shared modal for custom graph input (BFS/DFS/Dijkstra)
  Hero.jsx, Features.jsx, AlgorithmsGrid.jsx, CTA.jsx, Footer.jsx
data/
  algorithmCategories.js         # Single source of truth for nav categories and algorithm names
```

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

### DP Table Visualization Pattern

2D DP table pages (LCS, Edit Distance, Knapsack, Matrix Chain Multiplication) share a common rendering approach:

- Table headers show string characters or matrix labels; row 0 / col 0 show base-case values
- A `getCellColor(i, j, val)` function returns Tailwind classes based on: current cell, backtrack path membership, fill phase, and value magnitude
- `Infinity` values display as `∞`; large numbers use `.toLocaleString()` or abbreviations (`12k`)
- Backtrack / optimal path cells use `bg-purple-700` (or `bg-purple-800` during animation)
- The `phase` field in each step object drives color: `'comparing'`, `'match'`, `'no_match'`, `'backtracking'`, `'complete'`

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

### Navbar — Adding a New Section

`components/Navbar.jsx` has a `PAGES_EXIST` set that gates which categories appear in the dropdown:
```js
const PAGES_EXIST = new Set([
    'Basics', 'Recursion', 'Sorting', 'Searching',
    'Heap-like Data Structures', 'Dynamic Programming',
    'Graph Algorithms', 'Two Pointers and Sliding Window',
]);
```
Add the new category name here when its section page is ready. The `toSlug()` helper converts algorithm names to URL slugs: lowercased, spaces/colons → hyphens, parentheses removed. `CAT_META` in the same file maps each category name to a Lucide icon and a Tailwind gradient for the mega-menu chip — add an entry there too.

### `data/algorithmCategories.js`

The single source of truth for nav structure. Algorithm names here must match their directory slugs (via `toSlug()`). The Navbar filters to `PAGES_EXIST` categories, so adding an algorithm to this file without adding a page won't break anything — it just won't be navigable.

### Adding a New Algorithm Page — Checklist

1. Create `app/[section]/[slug]/layout.js` — metadata + passthrough layout
2. Create `app/[section]/[slug]/page.js` — `"use client"` visualizer
3. Add the algorithm name to `data/algorithmCategories.js` under the correct section
4. If the section index has an `available` flag, flip it to `true` (or add the entry)
5. Run `npm run build` to confirm no errors
