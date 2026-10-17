// Routes are listed explicitly rather than derived from
// data/algorithmCategories.js: that file drives the nav menu and its entry
// names do not all round-trip to a real directory, so generating the sitemap
// from it would advertise URLs that 404. Add new pages here as they ship.

const BASE_URL = "https://dsa-verse.vercel.app";

const SECTIONS = {
    "basics": [
        "linked-list-circular",
        "linked-list-circular-doubly",
        "linked-list-doubly",
        "lists-array",
        "lists-linked-list",
        "queues-array",
        "queues-linked-list",
        "stack-array",
        "stack-linked-list",
    ],
    "recursion": [
        "factorial",
        "fibonacci-sequence",
        "maze-solver",
        "n-queens",
        "permutations",
        "string-reversal",
        "subsets-power-set",
        "sudoku-solver",
        "tower-of-hanoi",
    ],
    "sorting": [
        "bubble-sort",
        "bucket-sort",
        "heap-sort",
        "insertion-sort",
        "merge-sort",
        "quick-sort",
        "radix-sort",
        "selection-sort",
    ],
    "searching": [
        "binary-search",
        "block-search",
        "exponential-search",
        "fibonacci-search",
        "interpolation-search",
        "jump-search",
        "linear-search",
        "ternary-search",
    ],
    "two-pointers-and-sliding-window": [
        "3sum",
        "container-with-most-water",
        "longest-substring-without-repeating-characters",
        "maximum-sum-subarray",
        "minimum-window-substring",
        "two-sum-ii",
        "valid-palindrome",
    ],
    "bit-manipulation": [
        "count-set-bits",
        "power-of-two",
        "single-number",
    ],
    "string-algorithms": [
        "kmp-string-matching",
        "rabin-karp",
        "z-algorithm",
    ],
    "trees": [
        "avl-tree",
        "binary-search-tree",
        "binary-tree-traversals",
        "segment-tree",
        "trie",
    ],
    "heap-like-data-structures": [
        "binomial-queues",
        "fibonacci-heaps",
        "heaps",
        "leftist-heaps",
        "skew-heaps",
    ],
    "divide-and-conquer": [
        "binary-search",
        "closest-pair-of-points",
        "merge-sort",
        "strassens-matrix-multiplication",
    ],
    "backtracking": [
        "n-queens",
        "rat-in-a-maze",
        "word-search",
    ],
    "dynamic-programming": [
        "0-1-knapsack",
        "edit-distance",
        "fibonacci-numbers",
        "house-robber",
        "largest-common-subsequence",
        "longest-increasing-subsequence",
        "making-change",
        "matrix-chain-multiplication",
    ],
    "graph-algorithms": [
        "breadth-first-search",
        "connected-components",
        "depth-first-search",
        "dijkstras-shortest-path",
        "floyd-warshall",
        "kruskal-minimum-spanning-tree",
        "prims-minimum-spanning-tree",
        "topological-sort-dfs",
        "topological-sort-indegree",
    ],
    "union-find": [
        "path-compression",
        "quick-find",
        "quick-union",
        "union-by-rank",
    ],
    "under-the-hood": [
        "async-await-and-event-loop",
        "classes-objects-and-memory",
        "composition-vs-inheritance",
        "cpp-execution-pipeline",
        "cpu-cache-hierarchy",
        "floating-point-and-ieee-754",
        "garbage-collection",
        "how-a-database-query-executes",
        "how-a-file-system-works",
        "how-a-rest-api-works",
        "how-containers-work",
        "how-git-works-internally",
        "how-the-browser-renders-a-page",
        "how-the-internet-routes-a-packet",
        "https-and-tls",
        "inheritance-and-mro",
        "jit-compilation",
        "multithreading",
        "polymorphism-and-virtual-dispatch",
        "processes-vs-threads",
        "python-execution-pipeline",
        "python-memory-model",
        "system-calls-and-kernel-mode",
        "unicode-and-utf-8",
        "virtual-memory-and-paging",
        "what-happens-when-you-search-a-url",
    ],
};

const STANDALONE = [
    "cheatsheet",
    "contact",
];

export default function sitemap() {
    const lastModified = new Date();

    const home = {
        url: BASE_URL,
        lastModified,
        changeFrequency: "weekly",
        priority: 1,
    };

    const standalone = STANDALONE.map((slug) => ({
        url: `${BASE_URL}/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: slug === "cheatsheet" ? 0.8 : 0.3,
    }));

    const sections = Object.keys(SECTIONS).map((section) => ({
        url: `${BASE_URL}/${section}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
    }));

    const pages = Object.entries(SECTIONS).flatMap(([section, slugs]) =>
        slugs.map((slug) => ({
            url: `${BASE_URL}/${section}/${slug}`,
            lastModified,
            changeFrequency: "monthly",
            priority: 0.7,
        }))
    );

    return [home, ...sections, ...standalone, ...pages];
}
