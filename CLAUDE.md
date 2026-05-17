# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm start        # Run production build
npm run lint     # ESLint check
```

## Architecture

**DSAverse** is a Next.js 15 App Router educational platform for visualizing data structures and algorithms. Live at https://dsa-verse.vercel.app.

### Tech Stack
- **Next.js 15** with App Router and `"use client"` directives on all interactive pages
- **React 19** — hooks only, no Redux or Context API
- **Tailwind CSS 4** — utility classes only, no component library
- **Lucide React** — icons (Play, Pause, RotateCcw, SkipForward, etc.)
- **React Syntax Highlighter** — code display in algorithm detail pages

### Directory Layout
```
app/
  page.js                    # Homepage
  layout.js                  # Root layout with SEO/metadata
  globals.css                # Tailwind import + CSS variables
  sorting/                   # Each category is a subdirectory
  searching/
  recursion/
  dynamic-programming/
  basics/
  heap-like-data-structures/
  contact/
components/
  Navbar.jsx                 # Dropdown nav driven by algorithmCategories.js
  Hero.jsx, Features.jsx, AlgorithmsGrid.jsx, CTA.jsx, Footer.jsx
data/
  algorithmCategories.js     # Single source of truth for all categories/algorithms
```

### Algorithm Visualizer Pattern

Every algorithm page follows the same pattern — understand this before creating or editing any visualizer:

1. **Pre-generate all steps** — a `generate<Name>Steps(arr)` function runs the full algorithm, capturing state at each comparison/swap into a `steps[]` array. Each step object contains: `{ array, comparisons, swaps, sorted, explanation, ... }`.

2. **Drive animation from `currentStep` index** — `stepHistory[currentStep]` gives the current visual state. Play mode advances the index via `setInterval`/`setTimeout` at the configured speed.

3. **Bar colors encode state:**
   - Default: unsorted
   - Yellow: currently being compared (`comparisons` indices)
   - Red: being swapped (`swaps` indices)
   - Green: fully sorted (`sorted` indices)

4. **Page layout** — two-column: left = bar chart visualization, right = sidebar with complexity info, explanation text, and toggleable code example.

5. **Controls** — Play/Pause, Step Forward/Back, Reset, Randomize, and "Original Array" buttons; speed slider (200–2000 ms delay).

### `algorithmCategories.js`

Central config for all 8 categories (Basics, Recursion, Sorting, Searching, Dynamic Programming, Heap-Like, Graph). The Navbar reads this to build its dropdown. Algorithm names in this file are converted to kebab-case slugs for routing — keep names consistent with their page directory names.

### Build Config Notes

`next.config.mjs` ignores TypeScript and ESLint errors during builds (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). This means linting must be run manually via `npm run lint`.
