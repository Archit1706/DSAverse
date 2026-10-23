# 🚀 DSAverse - Interactive Data Structures & Algorithms Visualizer

<div align="center">

![DSAverse Logo](https://img.shields.io/badge/DSAverse-Interactive%20Learning-blue?style=for-the-badge&logo=react)

**Transform complex algorithms and systems into beautiful, interactive visualizations**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_DSAverse-success?style=for-the-badge)](https://dsa-verse.vercel.app)

<!-- [![GitHub Stars](https://img.shields.io/github/stars/Archit1706/DSAverse?style=for-the-badge&logo=github)](https://github.com/Archit1706/DSAverse/stargazers) -->
<!-- [![GitHub Forks](https://img.shields.io/github/forks/Archit1706/DSAverse?style=for-the-badge&logo=github)](https://github.com/Archit1706/DSAverse/network) -->

[![License](https://img.shields.io/github/license/Archit1706/DSAverse?style=for-the-badge)](LICENSE)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

</div>

---

## 🎯 About DSAverse

DSAverse is an **interactive web platform** that brings computer science to life through step-by-step visualizations. It started with Data Structures and Algorithms and now also covers the **CS core** every software engineer needs — operating systems, computer networks and databases. Whether you're a student learning your first sorting algorithm or a developer preparing for technical interviews, DSAverse makes complex concepts intuitive and engaging.

### 🌟 Why DSAverse?

-   **🎨 Beautiful Visualizations** - Watch algorithms and systems run step by step with smooth animations
-   **🎮 Interactive Learning** - Control playback speed, step forwards and backwards, and change the input
-   **📚 Comprehensive Coverage** - From basic sorting to TCP congestion control and database recovery
-   **🧠 Built for Recall** - Quizzes, spaced-repetition review and "what happens next?" prompts, not just animations
-   **📱 Responsive Design** - Learn anywhere, on any device
-   **🌍 Open Source** - Community-driven development and contributions

---

## ✨ Features

### 🔧 Visualizations

**151 interactive pages across 19 sections, in two subjects.**

#### Data Structures & Algorithms — 95 pages

| Section | Pages | Highlights |
| --- | --- | --- |
| **Basics** | 9 | Stacks, queues, lists, singly/doubly/circular linked lists |
| **Recursion** | 9 | Factorial, Tower of Hanoi, N-Queens, Sudoku solver, permutations |
| **Graph Algorithms** | 9 | BFS, DFS, Dijkstra, Prim, Kruskal, Floyd-Warshall, topological sort |
| **Indexing** | 9 | Hash tables, B-trees, B+ trees, red-black, splay, radix, ternary search |
| **Dynamic Programming** | 9 | LCS, 0/1 Knapsack, Edit Distance, Matrix Chain, Kadane's |
| **Sorting** | 8 | Bubble, Selection, Insertion, Merge, Quick, Heap, Radix, Bucket |
| **Searching** | 8 | Binary, Linear, Jump, Interpolation, Exponential, Fibonacci, Ternary |
| **Two Pointers & Sliding Window** | 7 | 3Sum, Container With Most Water, Minimum Window Substring |
| **Trees** | 5 | BST, AVL rotations, traversals, segment tree, trie |
| **Heap-like Structures** | 5 | Binary, binomial, Fibonacci, leftist and skew heaps |
| **Divide and Conquer** | 4 | Recursion trees, Strassen's algorithm, closest pair of points |
| **Union-Find** | 4 | Quick find, quick union, path compression, union by rank |
| **Backtracking** | 3 | N-Queens, Word Search, Rat in a Maze |
| **Bit Manipulation** | 3 | XOR single number, Brian Kernighan's bit count, power of two |
| **String Algorithms** | 3 | KMP, Rabin-Karp, Z-Algorithm |

#### CS Core — 56 pages

| Section | Pages | Highlights |
| --- | --- | --- |
| **Under the Hood** | 26 | CPU caches, virtual memory, TLS, garbage collection, how Git works |
| **Operating Systems** | 10 | CPU scheduling, page replacement and Belady's anomaly, Banker's algorithm, deadlock detection, disk scheduling, race conditions, producer-consumer, dining philosophers |
| **Computer Networks** | 10 | OSI and TCP/IP layers, TCP handshake, sliding window protocols, congestion control, DNS, subnetting, distance-vector and link-state routing, ARP, HTTP/1.1 vs 2 vs 3 |
| **Database Systems** | 10 | Isolation levels, serializability, two-phase locking, MVCC, write-ahead logging, normalization, join algorithms, SQL query order, relational algebra, LSM trees |

Plus a searchable [**complexity cheatsheet**](https://dsa-verse.vercel.app/cheatsheet) covering time and space bounds for every major data structure and algorithm.

### 🔬 Under the Hood

Alongside the step-by-step simulations, CS Core includes **26 animated CS-internals explainers** — multi-act walkthroughs of what actually happens inside a computer:

-   **Language runtimes**: Python and C++ execution pipelines, JIT compilation, garbage collection, floating point and IEEE 754, Unicode and UTF-8
-   **Concurrency**: processes vs threads, multithreading, async/await and the event loop
-   **The web**: what happens when you search a URL, HTTPS and TLS, packet routing, browser rendering, REST APIs
-   **Object orientation**: classes and memory, inheritance and MRO, virtual dispatch, composition vs inheritance
-   **Systems**: system calls and kernel mode, virtual memory and paging, CPU cache hierarchy, containers, file systems, database query execution, Git internals

The Operating Systems, Computer Networks and Database Systems sections link to these explainers wherever a topic is already covered, so nothing is taught twice.

### 🎛️ Interactive Controls

-   ⏯️ **Play/Pause/Reset** - Full control over animation playback
-   ⚡ **Speed Control** - Adjust animation speed from slow-mo to lightning fast
-   📊 **Step-by-Step Mode** - Step forwards and backwards through every operation
-   🎯 **Custom Input** - Randomize, pick a preset, or test algorithms with your own data
-   📱 **Touch-Friendly** - Optimized for mobile and tablet interactions

### 📈 Learning Tools

-   📝 **Step Explanations** - A written explanation for every single step, not just the end result
-   🔮 **Predict the Next Step** - Turn on **Predict** on 37 pages and the animation pauses at each decision so you can guess what happens before it does
-   🧠 **Active Recall Quizzes** - A 3-question quiz on every page — 453 questions in all
-   🔁 **[Review](https://dsa-verse.vercel.app/review)** - Spaced-repetition practice over every quiz on the site, by subject or by section. Questions come back just before you would forget them. Progress stays in your browser — no account, nothing sent anywhere
-   ⚖️ **[Compare](https://dsa-verse.vercel.app/compare)** - Put any two or three pages side by side: complexity, difficulty, pattern and approach
-   🔍 **Search** - Press **⌘K** / **Ctrl+K** anywhere to jump to any page
-   🧭 **See Also** - Every page ends with related pages, including links across subjects — Dijkstra and link-state routing point to each other, and serializability points to topological sort
-   ⏱️ **Complexity Analysis** - Time and space complexity on every page and in the cheatsheet
-   💡 **Code Examples** - Clean, commented implementations: Python on most pages, plus JavaScript and SQL where they fit

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

-   **Node.js** 18.18 or higher (required by Next.js 15)
-   **npm**
-   **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Archit1706/DSAverse.git
cd DSAverse
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm run dev
```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see DSAverse in action!

### Build for Production

```bash
npm run build
npm start
```

`npm run build` first regenerates the learning data in `data/` (the quiz bank, page index, related links and page counts) from the pages themselves, so Review, Compare, search and See also always match what is on the site.

### Lint

```bash
npm run lint
```

---

## 🏗️ Project Structure

```
DSAverse/
├── app/                           # Next.js App Router
│   ├── page.js                    # Homepage
│   ├── layout.js                  # Root layout, site-wide metadata, JSON-LD
│   ├── globals.css                # Global styles and theme tokens
│   ├── sitemap.js                 # Generates /sitemap.xml for all routes
│   ├── robots.js                  # Generates /robots.txt
│   ├── favicon.ico                # Served at /favicon.ico
│   ├── cheatsheet/                # Searchable Big-O reference table
│   ├── compare/                   # Side-by-side comparison of any two or three pages
│   ├── review/                    # Spaced-repetition practice over every quiz
│   ├── contact/                   # Contact / GitHub page
│   ├── under-the-hood/            # CS-internals explainers
│   └── [section]/                 # One directory per section (sorting, operating-systems, ...)
│       ├── layout.js              # Navbar + Footer + section metadata
│       ├── loading.js             # Section loading animation
│       ├── page.js                # Section index (server component)
│       └── [algorithm]/
│           ├── layout.js          # Per-page metadata, canonical and See also links
│           └── page.js            # The visualizer ("use client")
├── components/                    # Shared React components
│   ├── Navbar.jsx                 # Subject tabs and mega-menu
│   ├── CommandPalette.jsx         # ⌘K / Ctrl+K search
│   ├── RelatedPages.jsx           # "See also" links at the foot of every page
│   ├── PredictStep.jsx            # "What happens next?" prompts
│   ├── CodeBlock.jsx              # Syntax-highlighted code block
│   ├── GraphCustomizer.jsx        # Custom graph input modal
│   ├── BinaryTreeCanvas.jsx       # Shared binary-tree layout
│   ├── BTreeCanvas.jsx            # Shared B-tree / B+ tree layout
│   └── Hero.jsx, AlgorithmsGrid.jsx, Footer.jsx, ...  # Homepage sections
├── data/
│   ├── subjects.js                # Subjects → sections (DSA, CS Core)
│   ├── algorithmCategories.js     # Nav structure: sections → page names
│   └── quizBank.js, pageIndex.js,
│       related.js, learningStats.js  # Generated on every build — do not edit by hand
├── lib/
│   └── progress.js                # Visited pages and the review schedule (localStorage)
├── scripts/
│   └── build-learning-data.mjs    # Generates the data files above (runs before every build)
├── public/                        # Static assets (icons, og-image, manifest)
├── AGENTS.md / CLAUDE.md          # Architecture guide for coding agents
├── CONTRIBUTING.md                # Contribution guide
├── eslint.config.mjs              # ESLint configuration
├── jsconfig.json                  # Path aliases
├── next.config.mjs                # Next.js configuration
├── postcss.config.mjs             # PostCSS configuration
└── package.json                   # Dependencies and scripts
```

---

## 🛠️ Tech Stack

| Technology                                                                                                 | Purpose         | Version |
| ---------------------------------------------------------------------------------------------------------- | --------------- | ------- |
| ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)            | React Framework | 15.x    |
| ![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)                  | UI Library      | 19.x    |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat&logo=tailwind-css&logoColor=white) | Styling         | 4.x     |
| ![Lucide](https://img.shields.io/badge/Lucide-F56565?style=flat&logo=lucide&logoColor=white)               | Icons           | 0.5x    |
| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)               | Deployment      | -       |

## 🎓 Related Projects

### 📚 DSA-30: Master Data Structures & Algorithms

Looking for **structured learning** and **practice problems**? Check out **DSA-30**, my comprehensive 30-day program to master Data Structures and Algorithms!

[![DSA-30](https://img.shields.io/badge/🎯_DSA--30-Master_DSA_in_30_Days-orange?style=for-the-badge)](https://dsa30.vercel.app/)

**🔗 Links:**

-   **Website**: [dsa30.vercel.app](https://dsa30.vercel.app/)
-   **GitHub**: [DSA-30 Repository](https://github.com/Archit1706/DSA-30/)

**DSA-30 Features:**

-   📅 **30-Day Structured Curriculum**
-   💪 **Hands-on Coding Challenges**
-   🎯 **Interview Preparation**
-   📝 **Detailed Solutions & Explanations**
-   🏆 **Progress Tracking**

**Perfect Combination**: Use **DSAverse** for visual learning and **DSA-30** for structured practice!

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Whether you want to:

-   🐛 **Report bugs** or suggest improvements
-   ✨ **Add new algorithms**, data structures or CS topics
-   🎨 **Improve visualizations** and animations
-   📚 **Enhance documentation** and tutorials
-   🔧 **Optimize performance** and code quality

### Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

📖 **Read our detailed [Contributing Guide](CONTRIBUTING.md)** for how pages are built, the checklist for adding one, and the coding conventions.

<!-- --- -->

<!-- ## 📊 Project Stats

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Archit1706/DSAverse?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/Archit1706/DSAverse?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/Archit1706/DSAverse?style=for-the-badge)

</div> -->

---

## 🌟 Support the Project

If DSAverse has helped you learn and understand algorithms better, consider:

-   ⭐ **Starring** the repository
-   🍴 **Forking** and contributing
-   📢 **Sharing** with friends and colleagues
-   🐛 **Reporting** bugs and suggesting features

---

## 📞 Contact & Connect

<div align="center">

**Built with ❤️ by [Archit Rathod](https://github.com/Archit1706)**

[![Email](https://img.shields.io/badge/📧_Email-architrathod77@gmail.com-red?style=for-the-badge)](mailto:architrathod77@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Archit1706-black?style=for-the-badge&logo=github)](https://github.com/Archit1706)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/archit-rathod)

**Questions? Suggestions? Collaboration ideas?**
Feel free to reach out - I'd love to hear from you!

</div>

---

## 📄 License

This project is licensed under the **Apache 2.0 License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

-   Thanks to all **contributors** who help make DSAverse better
-   Inspired by the amazing **computer science education** community
-   Built with **modern web technologies** and **best practices**
-   Special thanks to **open source** libraries and tools that make this possible

---

<div align="center">

**⭐ Star this repository if you found it helpful! ⭐**

_Happy Learning! 🚀_

</div>
