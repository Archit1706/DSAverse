"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Info, ArrowUpDown, ExternalLink } from 'lucide-react';

/* ──────────────────────────────────────────────────────
   Complexity colour scale
   ────────────────────────────────────────────────────── */
const COMPLEXITY_MAP = {
    'O(1)':           { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500', rank: 0, label: 'Excellent' },
    'O(log n)':       { bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-300',   dot: 'bg-green-500',   rank: 1, label: 'Great'     },
    'O(log log n)':   { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-300',    dot: 'bg-teal-500',    rank: 2, label: 'Great'     },
    'O(√n)':          { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-300',     dot: 'bg-sky-500',     rank: 3, label: 'Good'      },
    'O(log₃ n)':      { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-300',     dot: 'bg-sky-500',     rank: 3, label: 'Good'      },
    'O(m)':           { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-300',     dot: 'bg-sky-500',     rank: 3, label: 'Good'      },
    'O(n)':           { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300',  dot: 'bg-yellow-500',  rank: 4, label: 'Fair'      },
    'O(n + k)':       { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300',  dot: 'bg-yellow-500',  rank: 4, label: 'Fair'      },
    'O(nk)':          { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300',  dot: 'bg-yellow-500',  rank: 4, label: 'Fair'      },
    'O(n + E)':       { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300',  dot: 'bg-yellow-500',  rank: 4, label: 'Fair'      },
    'O(V)':           { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300',  dot: 'bg-yellow-500',  rank: 4, label: 'Fair'      },
    'O(n×m)':         { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O(n log n)':     { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O(V + E)':       { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O((V+E) log V)': { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O(E log E)':     { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O(E)':           { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O(k)':           { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  rank: 5, label: 'Fair'      },
    'O(n²)':          { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300',     dot: 'bg-red-500',     rank: 6, label: 'Poor'      },
    'O(n^(4/3))':     { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300',     dot: 'bg-red-500',     rank: 6, label: 'Poor'      },
    'O(n^(3/2))':     { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300',     dot: 'bg-red-500',     rank: 6, label: 'Poor'      },
    'O(V × E)':       { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300',     dot: 'bg-red-500',     rank: 6, label: 'Poor'      },
    'O(V²)':          { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300',    dot: 'bg-rose-600',    rank: 7, label: 'Bad'       },
    'O(V³)':          { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300',    dot: 'bg-rose-600',    rank: 7, label: 'Bad'       },
    'O(2ⁿ)':          { bg: 'bg-purple-100',  text: 'text-purple-900',  border: 'border-purple-300',  dot: 'bg-purple-600',  rank: 8, label: 'Terrible'  },
    'O(n!)':          { bg: 'bg-fuchsia-100', text: 'text-fuchsia-900', border: 'border-fuchsia-300', dot: 'bg-fuchsia-600', rank: 9, label: 'Worst'     },
    'N/A':            { bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-400',    rank: -1, label: 'N/A'      },
};

const SCALE_ITEMS = [
    { c: 'O(1)',     label: 'Constant',      grade: 'Excellent', color: 'bg-emerald-500' },
    { c: 'O(log n)', label: 'Logarithmic',   grade: 'Great',     color: 'bg-green-500'   },
    { c: 'O(√n)',    label: 'Square Root',   grade: 'Good',      color: 'bg-sky-500'     },
    { c: 'O(n)',     label: 'Linear',        grade: 'Fair',      color: 'bg-yellow-500'  },
    { c: 'O(n log n)',label:'Linearithmic',  grade: 'Fair',      color: 'bg-orange-500'  },
    { c: 'O(n²)',    label: 'Quadratic',     grade: 'Poor',      color: 'bg-red-500'     },
    { c: 'O(V³)',    label: 'Cubic',         grade: 'Bad',       color: 'bg-rose-600'    },
    { c: 'O(2ⁿ)',    label: 'Exponential',   grade: 'Terrible',  color: 'bg-purple-600'  },
    { c: 'O(n!)',    label: 'Factorial',     grade: 'Worst',     color: 'bg-fuchsia-600' },
];

function ComplexityBadge({ c }) {
    const s = COMPLEXITY_MAP[c] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}>
            {c}
        </span>
    );
}

function YesNo({ v }) {
    return v === 'Yes'
        ? <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Yes</span>
        : <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />No</span>;
}

/* ──────────────────────────────────────────────────────
   Data
   ────────────────────────────────────────────────────── */
const SORTING = [
    { name: 'Bubble Sort',    slug: '/sorting/bubble-sort',    best: 'O(n)',       avg: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)',      stable: 'Yes' },
    { name: 'Selection Sort', slug: '/sorting/selection-sort', best: 'O(n²)',      avg: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)',      stable: 'No'  },
    { name: 'Insertion Sort', slug: '/sorting/insertion-sort', best: 'O(n)',       avg: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)',      stable: 'Yes' },
    { name: 'Merge Sort',     slug: '/sorting/merge-sort',     best: 'O(n log n)', avg: 'O(n log n)',  worst: 'O(n log n)',  space: 'O(n)',      stable: 'Yes' },
    { name: 'Quick Sort',     slug: '/sorting/quick-sort',     best: 'O(n log n)', avg: 'O(n log n)',  worst: 'O(n²)',       space: 'O(log n)', stable: 'No'  },
    { name: 'Heap Sort',      slug: '/sorting/heap-sort',      best: 'O(n log n)', avg: 'O(n log n)',  worst: 'O(n log n)',  space: 'O(1)',      stable: 'No'  },
    { name: 'Radix Sort',     slug: '/sorting/radix-sort',     best: 'O(nk)',      avg: 'O(nk)',       worst: 'O(nk)',       space: 'O(n + k)', stable: 'Yes' },
    { name: 'Bucket Sort',    slug: '/sorting/bucket-sort',    best: 'O(n + k)',   avg: 'O(n + k)',    worst: 'O(n²)',       space: 'O(n + k)', stable: 'Yes' },
    { name: 'Shell Sort',     slug: null,                       best: 'O(n log n)', avg: 'O(n^(4/3))', worst: 'O(n^(3/2))', space: 'O(1)',      stable: 'No'  },
    { name: 'Counting Sort',  slug: null,                       best: 'O(n + k)',   avg: 'O(n + k)',    worst: 'O(n + k)',   space: 'O(k)',      stable: 'Yes' },
    { name: 'Tim Sort',       slug: null,                       best: 'O(n)',       avg: 'O(n log n)',  worst: 'O(n log n)',  space: 'O(n)',      stable: 'Yes' },
];

const SEARCHING = [
    { name: 'Linear Search',        slug: '/searching/linear-search',        best: 'O(1)', avg: 'O(n)',        worst: 'O(n)',      space: 'O(1)' },
    { name: 'Binary Search',        slug: '/searching/binary-search',        best: 'O(1)', avg: 'O(log n)',    worst: 'O(log n)', space: 'O(1)' },
    { name: 'Jump Search',          slug: '/searching/jump-search',          best: 'O(1)', avg: 'O(√n)',       worst: 'O(√n)',    space: 'O(1)' },
    { name: 'Interpolation Search', slug: '/searching/interpolation-search', best: 'O(1)', avg: 'O(log log n)',worst: 'O(n)',     space: 'O(1)' },
    { name: 'Exponential Search',   slug: '/searching/exponential-search',   best: 'O(1)', avg: 'O(log n)',    worst: 'O(log n)', space: 'O(1)' },
    { name: 'Fibonacci Search',     slug: '/searching/fibonacci-search',     best: 'O(1)', avg: 'O(log n)',    worst: 'O(log n)', space: 'O(1)' },
    { name: 'Ternary Search',       slug: '/searching/ternary-search',       best: 'O(1)', avg: 'O(log₃ n)',   worst: 'O(log₃ n)',space: 'O(1)' },
    { name: 'Block Search',         slug: '/searching/block-search',         best: 'O(1)', avg: 'O(√n)',       worst: 'O(√n)',    space: 'O(1)' },
];

const GRAPH = [
    { name: 'BFS (Breadth-First)',     type: 'Traversal',      time: 'O(V + E)',       space: 'O(V)' },
    { name: 'DFS (Depth-First)',       type: 'Traversal',      time: 'O(V + E)',       space: 'O(V)' },
    { name: "Dijkstra's",             type: 'Shortest Path',  time: 'O((V+E) log V)', space: 'O(V)' },
    { name: 'A* Search',              type: 'Shortest Path',  time: 'O(E)',           space: 'O(V)' },
    { name: 'Bellman-Ford',           type: 'Shortest Path',  time: 'O(V × E)',       space: 'O(V)' },
    { name: 'Floyd-Warshall',         type: 'All-Pairs SP',   time: 'O(V³)',          space: 'O(V²)'},
    { name: "Prim's MST",             type: 'MST',            time: 'O((V+E) log V)', space: 'O(V)' },
    { name: "Kruskal's MST",          type: 'MST',            time: 'O(E log E)',     space: 'O(V)' },
    { name: 'Topological Sort',       type: 'Ordering',       time: 'O(V + E)',       space: 'O(V)' },
];

const DATA_STRUCTURES = [
    { name: 'Array',            access: 'O(1)',     search: 'O(n)',     insert: 'O(n)',     delete: 'O(n)',     space: 'O(n)'   },
    { name: 'Linked List',      access: 'O(n)',     search: 'O(n)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Stack',            access: 'O(n)',     search: 'O(n)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Queue',            access: 'O(n)',     search: 'O(n)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Hash Table',       access: 'N/A',      search: 'O(1)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Binary Search Tree',access:'O(log n)', search: 'O(log n)', insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'AVL Tree',         access: 'O(log n)', search: 'O(log n)', insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'Red-Black Tree',   access: 'O(log n)', search: 'O(log n)', insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'Heap (Min/Max)',   access: 'O(1)',     search: 'O(n)',     insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'Trie',             access: 'O(m)',     search: 'O(m)',     insert: 'O(m)',     delete: 'O(m)',     space: 'O(n×m)'},
];

/* ──────────────────────────────────────────────────────
   Table components
   ────────────────────────────────────────────────────── */
const TH = ({ children, className = '' }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 ${className}`}>
        {children}
    </th>
);
const TD = ({ children, className = '' }) => (
    <td className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${className}`}>
        {children}
    </td>
);

function SortingTable({ rows }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <TH>Algorithm</TH>
                        <TH>Best</TH>
                        <TH>Average</TH>
                        <TH>Worst</TH>
                        <TH>Space</TH>
                        <TH>Stable</TH>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((r) => (
                        <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                            <TD>
                                <div className="flex items-center gap-2 font-medium text-gray-900">
                                    {r.slug
                                        ? <Link href={r.slug} className="hover:text-indigo-600 hover:underline flex items-center gap-1">
                                            {r.name}<ExternalLink className="w-3 h-3 opacity-50" />
                                          </Link>
                                        : r.name}
                                </div>
                            </TD>
                            <TD><ComplexityBadge c={r.best} /></TD>
                            <TD><ComplexityBadge c={r.avg} /></TD>
                            <TD><ComplexityBadge c={r.worst} /></TD>
                            <TD><ComplexityBadge c={r.space} /></TD>
                            <TD><YesNo v={r.stable} /></TD>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SearchingTable({ rows }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <TH>Algorithm</TH>
                        <TH>Best</TH>
                        <TH>Average</TH>
                        <TH>Worst</TH>
                        <TH>Space</TH>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((r) => (
                        <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                            <TD>
                                <Link href={r.slug} className="font-medium text-gray-900 hover:text-indigo-600 hover:underline flex items-center gap-1">
                                    {r.name}<ExternalLink className="w-3 h-3 opacity-50" />
                                </Link>
                            </TD>
                            <TD><ComplexityBadge c={r.best} /></TD>
                            <TD><ComplexityBadge c={r.avg} /></TD>
                            <TD><ComplexityBadge c={r.worst} /></TD>
                            <TD><ComplexityBadge c={r.space} /></TD>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function GraphTable({ rows }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <TH>Algorithm</TH>
                        <TH>Type</TH>
                        <TH>Time</TH>
                        <TH>Space</TH>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((r) => (
                        <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                            <TD className="font-medium text-gray-900">{r.name}</TD>
                            <TD>
                                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {r.type}
                                </span>
                            </TD>
                            <TD><ComplexityBadge c={r.time} /></TD>
                            <TD><ComplexityBadge c={r.space} /></TD>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function DSTable({ rows }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <TH>Structure</TH>
                        <TH>Access</TH>
                        <TH>Search</TH>
                        <TH>Insert</TH>
                        <TH>Delete</TH>
                        <TH>Space</TH>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((r) => (
                        <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                            <TD className="font-medium text-gray-900">{r.name}</TD>
                            <TD><ComplexityBadge c={r.access} /></TD>
                            <TD><ComplexityBadge c={r.search} /></TD>
                            <TD><ComplexityBadge c={r.insert} /></TD>
                            <TD><ComplexityBadge c={r.delete} /></TD>
                            <TD><ComplexityBadge c={r.space} /></TD>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ──────────────────────────────────────────────────────
   Section wrapper
   ────────────────────────────────────────────────────── */
function Section({ id, title, subtitle, children, hidden }) {
    if (hidden) return null;
    return (
        <section id={id} className="scroll-mt-8">
            <div className="mb-5">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

/* ──────────────────────────────────────────────────────
   Main page
   ────────────────────────────────────────────────────── */
const TABS = ['All', 'Sorting', 'Searching', 'Graph', 'Data Structures'];

export default function CheatsheetPage() {
    const [query, setQuery] = useState('');
    const [tab, setTab]     = useState('All');

    const q = query.toLowerCase().trim();

    const filteredSorting     = useMemo(() => SORTING.filter(r    => !q || r.name.toLowerCase().includes(q)), [q]);
    const filteredSearching   = useMemo(() => SEARCHING.filter(r  => !q || r.name.toLowerCase().includes(q)), [q]);
    const filteredGraph       = useMemo(() => GRAPH.filter(r      => !q || r.name.toLowerCase().includes(q)), [q]);
    const filteredDS          = useMemo(() => DATA_STRUCTURES.filter(r => !q || r.name.toLowerCase().includes(q)), [q]);

    const show = (section) => tab === 'All' || tab === section;

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Header ── */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">Home</Link>
                            <span className="text-slate-600">/</span>
                            <span className="text-slate-400 text-sm">Cheatsheet</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
                            Complexity
                            <span className="ml-3 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                                Cheatsheet
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Quick-reference time & space complexities for every major algorithm and data structure.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Sticky controls ── */}
            <div className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search algorithms…"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-gray-700 placeholder-gray-400 bg-gray-50"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1.5">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                                    tab === t
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

                {/* ── Complexity scale legend ── */}
                {(tab === 'All' || tab === 'Sorting') && !q && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="font-bold text-gray-900 text-lg">Complexity Scale</h2>
                            <span className="text-xs text-gray-400 font-normal">Best → Worst</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {SCALE_ITEMS.map(s => (
                                <div key={s.c} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
                                    <div>
                                        <div className="font-mono text-xs font-bold text-gray-800">{s.c}</div>
                                        <div className="text-[10px] text-gray-500">{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Sorting ── */}
                <Section
                    id="sorting"
                    title="Sorting Algorithms"
                    subtitle="Comparison of common sorting algorithms"
                    hidden={!show('Sorting') || filteredSorting.length === 0}
                >
                    <SortingTable rows={filteredSorting} />
                </Section>

                {/* ── Searching ── */}
                <Section
                    id="searching"
                    title="Searching Algorithms"
                    subtitle="Time complexity for finding elements"
                    hidden={!show('Searching') || filteredSearching.length === 0}
                >
                    <SearchingTable rows={filteredSearching} />
                </Section>

                {/* ── Graph ── */}
                <Section
                    id="graph"
                    title="Graph Algorithms"
                    subtitle="Traversal, shortest path, and MST algorithms"
                    hidden={!show('Graph') || filteredGraph.length === 0}
                >
                    <GraphTable rows={filteredGraph} />
                </Section>

                {/* ── Data Structures ── */}
                <Section
                    id="ds"
                    title="Data Structures"
                    subtitle="Average-case operation complexities (* = amortised)"
                    hidden={!show('Data Structures') || filteredDS.length === 0}
                >
                    <DSTable rows={filteredDS} />
                </Section>

                {/* ── No results ── */}
                {q && filteredSorting.length === 0 && filteredSearching.length === 0 && filteredGraph.length === 0 && filteredDS.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No results for "{query}"</p>
                        <p className="text-sm mt-1">Try a different algorithm name</p>
                    </div>
                )}

                {/* ── Notes row ── */}
                {!q && tab === 'All' && (
                    <div className="grid sm:grid-cols-3 gap-5">
                        {[
                            { title: 'Big-O Notation',   body: "Describes the upper bound of an algorithm's growth rate — the worst-case scenario as input size grows." },
                            { title: 'Time vs Space',     body: 'Faster algorithms often use more memory. This trade-off is fundamental to algorithm design.' },
                            { title: 'Practical Tips',    body: 'O(n log n) sorts are optimal for comparison-based sorting. Use hash tables for O(1) average lookups.' },
                        ].map(n => (
                            <div key={n.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4 text-indigo-500" />
                                    <h3 className="font-semibold text-gray-900 text-sm">{n.title}</h3>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">{n.body}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Legend footnote ── */}
                <p className="text-xs text-gray-400 text-center pb-4">
                    n = input size · V = vertices · E = edges · k = range/digit count · m = string/key length · * = amortised
                </p>
            </div>
        </div>
    );
}
