# Contributing to DSAverse

Welcome to DSAverse! 🚀 We're excited that you're interested in contributing to our interactive visualizations of data structures, algorithms and core computer science. This guide covers how the project is put together and how to add to it.

## Table of Contents

-   [Code of Conduct](#code-of-conduct)
-   [How Can I Contribute?](#how-can-i-contribute)
-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [How the Site Is Organized](#how-the-site-is-organized)
-   [Adding a Page](#adding-a-page)
-   [Adding a Section](#adding-a-section)
-   [Checking Your Work](#checking-your-work)
-   [Pull Request Process](#pull-request-process)
-   [Issue Guidelines](#issue-guidelines)
-   [Style Guidelines](#style-guidelines)
-   [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please be respectful, inclusive, and constructive in all interactions.

## How Can I Contribute?

There are many ways to contribute to DSAverse:

### 🐛 Bug Reports

-   Report bugs and issues you encounter
-   Provide clear steps to reproduce the problem
-   Include screenshots or recordings if applicable

### 💡 Feature Requests

-   Suggest new algorithms, data structures or CS topics
-   Propose new visualization techniques
-   Request UI/UX improvements

### 🔧 Code Contributions

-   Build new visualizer pages
-   Improve existing animations and explanations
-   Add "what happens next?" prompts to pages that do not have them yet
-   Optimize performance
-   Fix bugs

### 📚 Documentation

-   Improve the README and this guide
-   Add code comments
-   Sharpen step explanations and quiz questions

### 🎨 Design Contributions

-   Improve visual design and user interface
-   Enhance user experience
-   Design responsive layouts

## Getting Started

### Prerequisites

Before you begin, ensure you have:

-   Node.js 18.18 or higher (required by Next.js 15)
-   npm
-   Git
-   A code editor (VS Code recommended)

### Fork and Clone

1. Fork the DSAverse repository
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/DSAverse.git
cd DSAverse
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/Archit1706/DSAverse.git
```

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

4. Make your changes and test them locally

The scripts you will use:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Regenerates the learning data in `data/`, then builds for production |
| `npm start` | Serves the production build |
| `npm run lint` | ESLint over the `.js` / `.mjs` files |

Stop the dev server before running `npm run build` — the two share the `.next` directory, and building underneath a running dev server leaves pages that render but never respond to clicks. If that happens, delete `.next` and restart the dev server.

## How the Site Is Organized

The site has three levels: **subject → section → page**.

-   **Subjects** are listed in `data/subjects.js`: *Data Structures & Algorithms* and *CS Core*. A subject is a list of section directories.
-   **Sections** are top-level directories under `app/` — `app/sorting/`, `app/operating-systems/` and so on. Each has a `layout.js` (Navbar, Footer and section metadata), a `loading.js` and a `page.js` index listing its pages.
-   **Pages** live one level down — `app/sorting/bubble-sort/` — with a `layout.js` for metadata and a `"use client"` `page.js` for the visualizer.

URLs never include the subject: a page is `/sorting/bubble-sort`, not `/dsa/sorting/bubble-sort`.

```
DSAverse/
├── app/
│   ├── page.js, layout.js, globals.css
│   ├── sitemap.js, robots.js      # SEO routes
│   ├── cheatsheet/, compare/, review/, contact/
│   └── [section]/
│       ├── layout.js, loading.js, page.js
│       └── [algorithm]/
│           ├── layout.js          # Metadata, canonical, See also
│           └── page.js            # The visualizer
├── components/                    # Navbar, CodeBlock, PredictStep, RelatedPages, ...
├── data/
│   ├── subjects.js                # Subjects → sections
│   ├── algorithmCategories.js     # Nav menu: sections → page names
│   └── quizBank.js, pageIndex.js,
│       related.js, learningStats.js  # Generated — never edit by hand
├── lib/progress.js                # localStorage: visited pages + review schedule
└── scripts/build-learning-data.mjs   # Generates the data files on every build
```

**Generated data.** `npm run build` runs `scripts/build-learning-data.mjs` first. It reads every page's quiz and every section index, and writes the quiz bank, page index, "See also" links and page counts into `data/`. Review, Compare, the ⌘K search and the homepage counts all read those files, so a new page shows up in all of them automatically. Never edit them by hand — rerun the script instead.

[`CLAUDE.md`](CLAUDE.md) is the full architecture guide: every pattern, colour theme and convention in detail. Read it before building a page.

## Adding a Page

Every visualizer follows the same shape.

**Steps are generated up front.** A function turns the input into the complete list of steps before anything plays, and the page just moves an index through that list. Never compute the next step while animating.

```javascript
const generateSteps = (arr) => {
    const steps = [];
    const a = [...arr];
    for (let i = 0; i < a.length - 1; i++) {
        for (let j = 0; j < a.length - i - 1; j++) {
            steps.push({
                array: [...a], comparing: [j, j + 1],
                explanation: `Comparing ${a[j]} and ${a[j + 1]}.`,
            });
            if (a[j] > a[j + 1]) {
                [a[j], a[j + 1]] = [a[j + 1], a[j]];
                steps.push({
                    array: [...a], swapped: [j, j + 1],
                    explanation: `${a[j + 1]} > ${a[j]}, so they swap.`,
                });
            }
        }
    }
    return steps;
};
```

Every step carries its own `explanation`, which is shown beside the animation.

**Animation uses `setTimeout`, never `setInterval`**, driven from the current step index, with the standard controls: play/pause, step back, step forward, reset, a speed slider, and Shuffle or presets for new input.

**Every page has a 3-question quiz** in an array named `quizQuestions`. The build collects these into the site-wide quiz bank, so use that exact name.

**Prompts are optional.** `components/PredictStep.jsx` can pause at each decision and ask what happens next. Only add one where the answer is genuinely decided by what is on screen, and check that always clicking the same button does not win.

### Checklist

1. `app/<section>/<slug>/layout.js` — metadata, `openGraph`, and `alternates: { canonical: "/<section>/<slug>" }`, plus the `RelatedPages` mount. Copy an existing page's layout.
2. `app/<section>/<slug>/page.js` — the `"use client"` visualizer.
3. Add the page's name to its section in `data/algorithmCategories.js`. The name must turn into the directory name through the Navbar's `toSlug()`; if it does not, add a `SLUG_OVERRIDES` entry in `components/Navbar.jsx`.
4. Add a card to the section index (`app/<section>/page.js`).
5. Add the slug to the section's list in `app/sitemap.js`.
6. Run `npm run build` and `npm run lint`.

New pages go in as three commits, in this order, so a half-finished page is never linked from the site:

```
Add <Name> layout metadata
Build <Name> visualizer
Mark <Name> as available in <Section> index
```

## Adding a Section

1. Create `app/<section>/` with `layout.js`, `loading.js` and an index `page.js` — copy an existing section such as `app/indexing/`.
2. Add the directory name to its subject in `data/subjects.js`.
3. Add the category and its page names to `data/algorithmCategories.js`.
4. In `components/Navbar.jsx`, add the name to `PAGES_EXIST` and an icon and gradient to `CAT_META`.
5. Add a card to `components/AlgorithmsGrid.jsx` for the homepage, and a link in `components/Footer.jsx`.
6. Add the section and its pages to `app/sitemap.js`.
7. Pick a colour theme that is not already taken — the table is in [`CLAUDE.md`](CLAUDE.md).

## Checking Your Work

There is no unit-test runner in this project. Before opening a pull request:

-   `npm run build` must succeed. Next.js is configured not to fail on lint or type errors, so the build is what catches broken JSX.
-   `npm run lint` must report no errors.
-   Step through every page you changed in the browser, to the end, with no console errors, at desktop and phone widths.
-   For a new algorithm, check the step generator against an independent implementation on a few hundred random inputs — for example, that a sort's final array is sorted, or that a shortest-path page agrees with a direct computation. A short Node script is enough; include what you checked in the pull request.

## Pull Request Process

1. **Create a new branch** for your feature:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following the conventions above

3. **Check your changes**:

```bash
npm run build
npm run lint
```

4. **Commit your changes** with a short, imperative message that says what changed:

```bash
git commit -m "Build Bubble Sort visualizer"
```

5. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request** from your fork to the main repository

### Pull Request Guidelines

-   Use a clear and descriptive title
-   Include a description of your changes and how you checked them
-   Reference any related issues
-   Add screenshots or GIFs for visual changes
-   Make sure the build and lint pass
-   Update documentation if necessary

## Issue Guidelines

### Creating Issues

When creating an issue, please:

1. **Search existing issues** first to avoid duplicates
2. **Use a clear and descriptive title**
3. **Provide detailed information**:
    - Steps to reproduce (for bugs)
    - Expected vs actual behavior
    - Screenshots or recordings
    - Browser and OS information
    - Error messages or console logs

### Issue Labels

We use labels to categorize issues:

-   `bug` - Something isn't working
-   `enhancement` - New feature or improvement
-   `good first issue` - Good for newcomers
-   `help wanted` - Extra attention needed
-   `documentation` - Documentation related
-   `visualization` - Visualization improvements

## Style Guidelines

### Code Style

-   **JavaScript**, not TypeScript — the project has no TypeScript
-   **4-space indentation**, matching the existing files
-   **Tailwind CSS** utility classes only — no component library or custom CSS files per page
-   **Lucide React** for every icon — no emojis in the interface
-   **React hooks only** — no Redux or Context
-   Dark theme throughout, using each section's colour theme from [`CLAUDE.md`](CLAUDE.md)
-   Meaningful names, small focused functions, and comments that explain *why*

### Commit Messages

Write commit messages as short imperative sentences that describe the change, matching the history:

-   `Build Page Replacement visualizer`
-   `Add Dining Philosophers layout metadata`
-   `Fix the swap highlight lingering after reset`
-   `Document the subject layer`

Keep each commit to one logical change.

### Visualization Guidelines

When creating visualizations:

1. **Make the picture carry the idea** — a Gantt chart that grows, frames that fill, packets that move — not just a table with highlighted cells
2. **Use the shared colour conventions** for active, found, eliminated and in-range elements
3. **Explain every step** in plain language
4. **Include the standard controls** and keep them consistent with other pages
5. **Make it responsive** — no horizontal scrolling on a phone; draw graphs in an SVG `viewBox` with `width="100%"`
6. **Add accessibility features** (ARIA labels, keyboard support where it fits)

## Community

### Getting Help

-   Check existing **issues**
-   Reach out via **email**: architrathod77@gmail.com

## Resources

### Learning Resources

-   [Algorithm Visualizations](https://visualgo.net/)
-   [Data Structures Reference](https://www.geeksforgeeks.org/data-structures/)
-   [React Documentation](https://react.dev/)
-   [Next.js Documentation](https://nextjs.org/docs)
-   [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tools

-   [VS Code](https://code.visualstudio.com/) - Recommended editor
-   [React Developer Tools](https://react.dev/learn/react-developer-tools)
-   [Git](https://git-scm.com/) - Version control

## Questions?

If you have any questions about contributing, feel free to:

-   Open an issue with the `question` label
-   Contact the maintainer directly

Thank you for contributing to DSAverse! 🎉 Your contributions help make computer science education more accessible and engaging for everyone.

---

**Happy Coding!** 🚀
