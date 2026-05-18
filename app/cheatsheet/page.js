"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Info, ExternalLink, BarChart2, Layers, GitBranch, Database } from 'lucide-react';

/* ──────────────────────────────────────────────────────
   Dark-mode complexity colour map
   ────────────────────────────────────────────────────── */
const COMPLEXITY_MAP = {
    'O(1)':           { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Excellent' },
    'O(log n)':       { bg: 'bg-green-500/15',   text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-400',   label: 'Great'     },
    'O(log log n)':   { bg: 'bg-teal-500/15',    text: 'text-teal-400',    border: 'border-teal-500/30',    dot: 'bg-teal-400',    label: 'Great'     },
    'O(√n)':          { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-400',     label: 'Good'      },
    'O(log₃ n)':      { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-400',     label: 'Good'      },
    'O(m)':           { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-400',     label: 'Good'      },
    'O(n)':           { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  label: 'Fair'      },
    'O(n + k)':       { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  label: 'Fair'      },
    'O(nk)':          { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  label: 'Fair'      },
    'O(V)':           { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  label: 'Fair'      },
    'O(k)':           { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  label: 'Fair'      },
    'O(n×m)':         { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  label: 'Fair'      },
    'O(n log n)':     { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  label: 'Fair'      },
    'O(V + E)':       { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  label: 'Fair'      },
    'O((V+E) log V)': { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  label: 'Fair'      },
    'O(E log E)':     { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  label: 'Fair'      },
    'O(E)':           { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  label: 'Fair'      },
    'O(n²)':          { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     label: 'Poor'      },
    'O(n^(4/3))':     { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     label: 'Poor'      },
    'O(n^(3/2))':     { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     label: 'Poor'      },
    'O(V × E)':       { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     label: 'Poor'      },
    'O(log n)  ':     { bg: 'bg-green-500/15',   text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-400',   label: 'Great'     },
    'O(log n)   ':    { bg: 'bg-green-500/15',   text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-400',   label: 'Great'     },
    'O(V²)':          { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-400',    label: 'Bad'       },
    'O(V³)':          { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-400',    label: 'Bad'       },
    'O(2ⁿ)':          { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-400',  label: 'Terrible'  },
    'O(n!)':          { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-400', label: 'Worst'     },
    'N/A':            { bg: 'bg-slate-800/60',   text: 'text-slate-500',   border: 'border-slate-700/50',   dot: 'bg-slate-600',   label: 'N/A'       },
};

const SCALE_ITEMS = [
    { c: 'O(1)',      label: 'Constant',     grade: 'Excellent', color: 'bg-emerald-400' },
    { c: 'O(log n)',  label: 'Logarithmic',  grade: 'Great',     color: 'bg-green-400'   },
    { c: 'O(√n)',     label: 'Square Root',  grade: 'Good',      color: 'bg-sky-400'     },
    { c: 'O(n)',      label: 'Linear',       grade: 'Fair',      color: 'bg-yellow-400'  },
    { c: 'O(n log n)',label: 'Linearithmic', grade: 'Fair',      color: 'bg-orange-400'  },
    { c: 'O(n²)',     label: 'Quadratic',    grade: 'Poor',      color: 'bg-red-400'     },
    { c: 'O(V³)',     label: 'Cubic',        grade: 'Bad',       color: 'bg-rose-400'    },
    { c: 'O(2ⁿ)',     label: 'Exponential',  grade: 'Terrible',  color: 'bg-purple-400'  },
    { c: 'O(n!)',     label: 'Factorial',    grade: 'Worst',     color: 'bg-fuchsia-400' },
];

/* ── shared badge + indicator ───────────────────────── */
function ComplexityBadge({ c }) {
    const s = COMPLEXITY_MAP[c] ?? { bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700/50' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}>
            {c}
        </span>
    );
}

function YesNo({ v }) {
    return v === 'Yes'
        ? <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-sm font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />Yes
          </span>
        : <span className="inline-flex items-center gap-1.5 text-red-400 font-medium text-sm font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />No
          </span>;
}

/* ── data ───────────────────────────────────────────── */
const SORTING = [
    { name: 'Bubble Sort',    slug: '/sorting/bubble-sort',    best: 'O(n)',       avg: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)',      stable: 'Yes' },
    { name: 'Selection Sort', slug: '/sorting/selection-sort', best: 'O(n²)',      avg: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)',      stable: 'No'  },
    { name: 'Insertion Sort', slug: '/sorting/insertion-sort', best: 'O(n)',       avg: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)',      stable: 'Yes' },
    { name: 'Merge Sort',     slug: '/sorting/merge-sort',     best: 'O(n log n)', avg: 'O(n log n)',  worst: 'O(n log n)',  space: 'O(n)',      stable: 'Yes' },
    { name: 'Quick Sort',     slug: '/sorting/quick-sort',     best: 'O(n log n)', avg: 'O(n log n)',  worst: 'O(n²)',       space: 'O(log n)', stable: 'No'  },
    { name: 'Heap Sort',      slug: '/sorting/heap-sort',      best: 'O(n log n)', avg: 'O(n log n)',  worst: 'O(n log n)',  space: 'O(1)',      stable: 'No'  },
    { name: 'Radix Sort',     slug: '/sorting/radix-sort',     best: 'O(nk)',      avg: 'O(nk)',       worst: 'O(nk)',       space: 'O(n + k)', stable: 'Yes' },
    { name: 'Bucket Sort',    slug: '/sorting/bucket-sort',    best: 'O(n + k)',   avg: 'O(n + k)',    worst: 'O(n²)',       space: 'O(n + k)', stable: 'Yes' },
    { name: 'Shell Sort',     slug: null,                      best: 'O(n log n)', avg: 'O(n^(4/3))', worst: 'O(n^(3/2))', space: 'O(1)',      stable: 'No'  },
    { name: 'Counting Sort',  slug: null,                      best: 'O(n + k)',   avg: 'O(n + k)',    worst: 'O(n + k)',   space: 'O(k)',      stable: 'Yes' },
    { name: 'Tim Sort',       slug: null,                      best: 'O(n)',       avg: 'O(n log n)',  worst: 'O(n log n)', space: 'O(n)',      stable: 'Yes' },
];

const SEARCHING = [
    { name: 'Linear Search',        slug: '/searching/linear-search',        best: 'O(1)', avg: 'O(n)',         worst: 'O(n)',      space: 'O(1)' },
    { name: 'Binary Search',        slug: '/searching/binary-search',        best: 'O(1)', avg: 'O(log n)',     worst: 'O(log n)', space: 'O(1)' },
    { name: 'Jump Search',          slug: '/searching/jump-search',          best: 'O(1)', avg: 'O(√n)',        worst: 'O(√n)',    space: 'O(1)' },
    { name: 'Interpolation Search', slug: '/searching/interpolation-search', best: 'O(1)', avg: 'O(log log n)', worst: 'O(n)',     space: 'O(1)' },
    { name: 'Exponential Search',   slug: '/searching/exponential-search',   best: 'O(1)', avg: 'O(log n)',     worst: 'O(log n)', space: 'O(1)' },
    { name: 'Fibonacci Search',     slug: '/searching/fibonacci-search',     best: 'O(1)', avg: 'O(log n)',     worst: 'O(log n)', space: 'O(1)' },
    { name: 'Ternary Search',       slug: '/searching/ternary-search',       best: 'O(1)', avg: 'O(log₃ n)',    worst: 'O(log₃ n)',space: 'O(1)' },
    { name: 'Block Search',         slug: '/searching/block-search',         best: 'O(1)', avg: 'O(√n)',        worst: 'O(√n)',    space: 'O(1)' },
];

const GRAPH = [
    { name: 'BFS (Breadth-First)',  type: 'Traversal',     time: 'O(V + E)',       space: 'O(V)'  },
    { name: 'DFS (Depth-First)',    type: 'Traversal',     time: 'O(V + E)',       space: 'O(V)'  },
    { name: "Dijkstra's",          type: 'Shortest Path', time: 'O((V+E) log V)', space: 'O(V)'  },
    { name: 'A* Search',           type: 'Shortest Path', time: 'O(E)',           space: 'O(V)'  },
    { name: 'Bellman-Ford',        type: 'Shortest Path', time: 'O(V × E)',       space: 'O(V)'  },
    { name: 'Floyd-Warshall',      type: 'All-Pairs SP',  time: 'O(V³)',          space: 'O(V²)' },
    { name: "Prim's MST",          type: 'MST',           time: 'O((V+E) log V)', space: 'O(V)'  },
    { name: "Kruskal's MST",       type: 'MST',           time: 'O(E log E)',     space: 'O(V)'  },
    { name: 'Topological Sort',    type: 'Ordering',      time: 'O(V + E)',       space: 'O(V)'  },
];

const DATA_STRUCTURES = [
    { name: 'Array',             access: 'O(1)',     search: 'O(n)',     insert: 'O(n)',     delete: 'O(n)',     space: 'O(n)'   },
    { name: 'Linked List',       access: 'O(n)',     search: 'O(n)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Stack',             access: 'O(n)',     search: 'O(n)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Queue',             access: 'O(n)',     search: 'O(n)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Hash Table',        access: 'N/A',      search: 'O(1)',     insert: 'O(1)',     delete: 'O(1)',     space: 'O(n)'   },
    { name: 'Binary Search Tree',access: 'O(log n)', search: 'O(log n)', insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'AVL Tree',          access: 'O(log n)', search: 'O(log n)', insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'Red-Black Tree',    access: 'O(log n)', search: 'O(log n)', insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'Heap (Min/Max)',    access: 'O(1)',     search: 'O(n)',     insert: 'O(log n)', delete: 'O(log n)', space: 'O(n)'  },
    { name: 'Trie',              access: 'O(m)',     search: 'O(m)',     insert: 'O(m)',     delete: 'O(m)',     space: 'O(n×m)'},
];

/* ── dark table primitives ──────────────────────────── */
const TH = ({ children }) => (
    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/80 first:rounded-tl-xl last:rounded-tr-xl whitespace-nowrap">
        {children}
    </th>
);
const TD = ({ children, className = '' }) => (
    <td className={`px-4 py-3.5 text-sm text-slate-300 whitespace-nowrap ${className}`}>
        {children}
    </td>
);

const TABLE_WRAP = "overflow-x-auto rounded-2xl border border-slate-700/50 shadow-2xl shadow-slate-950/50";
const TBODY = "divide-y divide-slate-800/60";
const TR    = "hover:bg-slate-800/40 transition-colors duration-150";

function AlgoLink({ slug, name }) {
    if (!slug) return <span className="font-medium text-slate-200">{name}</span>;
    return (
        <Link href={slug}
            className="group inline-flex items-center gap-1.5 font-medium text-slate-200 hover:text-indigo-400 transition-colors">
            {name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </Link>
    );
}

function TypeBadge({ type }) {
    const colors = {
        'Traversal':    'bg-blue-500/15 text-blue-400 border-blue-500/30',
        'Shortest Path':'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        'All-Pairs SP': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
        'MST':          'bg-teal-500/15 text-teal-400 border-teal-500/30',
        'Ordering':     'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[type] ?? 'bg-slate-700 text-slate-400 border-slate-600'}`}>
            {type}
        </span>
    );
}

function SortingTable({ rows }) {
    return (
        <div className={TABLE_WRAP}>
            <table className="min-w-full">
                <thead><tr><TH>Algorithm</TH><TH>Best</TH><TH>Average</TH><TH>Worst</TH><TH>Space</TH><TH>Stable</TH></tr></thead>
                <tbody className={TBODY}>
                    {rows.map(r => (
                        <tr key={r.name} className={TR}>
                            <TD><AlgoLink slug={r.slug} name={r.name} /></TD>
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
        <div className={TABLE_WRAP}>
            <table className="min-w-full">
                <thead><tr><TH>Algorithm</TH><TH>Best</TH><TH>Average</TH><TH>Worst</TH><TH>Space</TH></tr></thead>
                <tbody className={TBODY}>
                    {rows.map(r => (
                        <tr key={r.name} className={TR}>
                            <TD><AlgoLink slug={r.slug} name={r.name} /></TD>
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
        <div className={TABLE_WRAP}>
            <table className="min-w-full">
                <thead><tr><TH>Algorithm</TH><TH>Type</TH><TH>Time</TH><TH>Space</TH></tr></thead>
                <tbody className={TBODY}>
                    {rows.map(r => (
                        <tr key={r.name} className={TR}>
                            <TD className="font-medium text-slate-200">{r.name}</TD>
                            <TD><TypeBadge type={r.type} /></TD>
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
        <div className={TABLE_WRAP}>
            <table className="min-w-full">
                <thead><tr><TH>Structure</TH><TH>Access</TH><TH>Search</TH><TH>Insert</TH><TH>Delete</TH><TH>Space</TH></tr></thead>
                <tbody className={TBODY}>
                    {rows.map(r => (
                        <tr key={r.name} className={TR}>
                            <TD className="font-medium text-slate-200">{r.name}</TD>
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

/* ── section wrapper ────────────────────────────────── */
function Section({ id, icon, title, subtitle, accent, children, hidden }) {
    if (hidden) return null;
    return (
        <section id={id} className="scroll-mt-24 space-y-5">
            {/* header */}
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${accent} text-white shadow-lg`}>
                    {icon}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                    {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

/* ── gradient separator ─────────────────────────────── */
const Sep = ({ from = '#6366f1', via = '#8b5cf6', to = 'transparent' }) => (
    <div className="h-px w-full pointer-events-none"
        style={{ background: `linear-gradient(90deg,${to},${from},${via},${to})` }} />
);

/* ── main page ──────────────────────────────────────── */
const TABS = ['All', 'Sorting', 'Searching', 'Graph', 'Data Structures'];

export default function CheatsheetPage() {
    const [query, setQuery] = useState('');
    const [tab,   setTab  ] = useState('All');

    const q = query.toLowerCase().trim();

    const filteredSorting   = useMemo(() => SORTING.filter(r       => !q || r.name.toLowerCase().includes(q)), [q]);
    const filteredSearching = useMemo(() => SEARCHING.filter(r     => !q || r.name.toLowerCase().includes(q)), [q]);
    const filteredGraph     = useMemo(() => GRAPH.filter(r         => !q || r.name.toLowerCase().includes(q)), [q]);
    const filteredDS        = useMemo(() => DATA_STRUCTURES.filter(r => !q || r.name.toLowerCase().includes(q)), [q]);

    const show = s => tab === 'All' || tab === s;
    const noResults = q && [filteredSorting, filteredSearching, filteredGraph, filteredDS].every(a => a.length === 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white">

            {/* ── Immersive header ── */}
            <div className="relative overflow-hidden bg-slate-950">
                {/* Orb + grid */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-15 animate-blob"
                        style={{ background: 'radial-gradient(circle,#6366f1,#8b5cf6,transparent 70%)' }} />
                    <div className="absolute -bottom-24 right-0 w-[400px] h-[400px] rounded-full opacity-10 animate-blob"
                        style={{ background: 'radial-gradient(circle,#06b6d4,#3b82f6,transparent 70%)', animationDelay: '2s' }} />
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: 'linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)',
                            backgroundSize: '50px 50px',
                        }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 mb-6 text-sm animate-fade-in">
                        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">Home</Link>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-500">Cheatsheet</span>
                    </nav>

                    {/* Title */}
                    <div className="max-w-3xl animate-fade-in-up delay-100">
                        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-4">
                            Complexity{' '}
                            <span className="gradient-text"
                                style={{ backgroundImage: 'linear-gradient(135deg,#818cf8,#38bdf8,#34d399)' }}>
                                Cheatsheet
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg leading-relaxed mb-8">
                            Quick-reference time &amp; space complexities for every major algorithm and data structure.
                            Search, filter, and compare at a glance.
                        </p>

                        {/* Stat chips */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { icon: <BarChart2 className="w-3.5 h-3.5" />, label: '38+ Algorithms' },
                                { icon: <Layers    className="w-3.5 h-3.5" />, label: '4 Categories'   },
                                { icon: <GitBranch className="w-3.5 h-3.5" />, label: 'Graph & Trees'  },
                                { icon: <Database  className="w-3.5 h-3.5" />, label: 'Data Structures'},
                            ].map(c => (
                                <span key={c.label}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm">
                                    <span className="text-indigo-400">{c.icon}</span>
                                    {c.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* bottom separator */}
                <Sep from="#6366f1" via="#8b5cf6" />
            </div>

            {/* ── Sticky search + filter bar ── */}
            <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative w-full sm:w-72 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search algorithms…"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1.5">
                        {TABS.map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                                    tab === t
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                }`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

                {/* Complexity scale */}
                {(tab === 'All' || tab === 'Sorting') && !q && (
                    <div className="glass rounded-2xl p-6 border border-slate-700/40 animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-5">
                            <h2 className="font-bold text-white text-lg">Complexity Scale</h2>
                            <span className="text-xs text-slate-500 font-mono">Best → Worst</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {SCALE_ITEMS.map(s => (
                                <div key={s.c}
                                    className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                                    <div>
                                        <div className="font-mono text-xs font-bold text-slate-200">{s.c}</div>
                                        <div className="text-[10px] text-slate-500 leading-none mt-0.5">{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sorting */}
                {show('Sorting') && filteredSorting.length > 0 && (
                    <>
                        <Sep from="#f97316" via="#f59e0b" />
                        <Section id="sorting" icon={<BarChart2 className="w-4 h-4" />}
                            title="Sorting Algorithms" subtitle="Comparison of common sorting algorithms"
                            accent="from-orange-500 to-amber-500">
                            <SortingTable rows={filteredSorting} />
                        </Section>
                    </>
                )}

                {/* Searching */}
                {show('Searching') && filteredSearching.length > 0 && (
                    <>
                        <Sep from="#ef4444" via="#f97316" />
                        <Section id="searching" icon={<Search className="w-4 h-4" />}
                            title="Searching Algorithms" subtitle="Time complexity for finding elements"
                            accent="from-red-500 to-rose-500">
                            <SearchingTable rows={filteredSearching} />
                        </Section>
                    </>
                )}

                {/* Graph */}
                {show('Graph') && filteredGraph.length > 0 && (
                    <>
                        <Sep from="#06b6d4" via="#3b82f6" />
                        <Section id="graph" icon={<GitBranch className="w-4 h-4" />}
                            title="Graph Algorithms" subtitle="Traversal, shortest path, and MST algorithms"
                            accent="from-cyan-500 to-blue-600">
                            <GraphTable rows={filteredGraph} />
                        </Section>
                    </>
                )}

                {/* Data Structures */}
                {show('Data Structures') && filteredDS.length > 0 && (
                    <>
                        <Sep from="#8b5cf6" via="#6366f1" />
                        <Section id="ds" icon={<Database className="w-4 h-4" />}
                            title="Data Structures" subtitle="Average-case operation complexities"
                            accent="from-violet-500 to-indigo-600">
                            <DSTable rows={filteredDS} />
                        </Section>
                    </>
                )}

                {/* No results */}
                {noResults && (
                    <div className="text-center py-24">
                        <Search className="w-14 h-14 mx-auto mb-4 text-slate-700" />
                        <p className="text-xl font-medium text-slate-400">No results for &quot;{query}&quot;</p>
                        <p className="text-sm text-slate-600 mt-1">Try a different algorithm name</p>
                    </div>
                )}

                {/* Notes */}
                {!q && tab === 'All' && (
                    <>
                        <Sep from="#6366f1" via="#8b5cf6" />
                        <div className="grid sm:grid-cols-3 gap-5">
                            {[
                                { icon: <Info className="w-4 h-4" />, title: 'Big-O Notation',
                                  body: "Describes the upper bound of an algorithm's growth rate — the worst-case scenario as input size grows to infinity." },
                                { icon: <BarChart2 className="w-4 h-4" />, title: 'Time vs Space',
                                  body: 'Faster algorithms often use more memory. This fundamental trade-off shapes every design decision in algorithm engineering.' },
                                { icon: <Database className="w-4 h-4" />, title: 'Practical Tips',
                                  body: 'O(n log n) is optimal for comparison-based sorting. Use hash tables for O(1) average-case lookups. Prefer heaps for priority queues.' },
                            ].map(n => (
                                <div key={n.title}
                                    className="glass rounded-2xl p-5 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-indigo-400">{n.icon}</span>
                                        <h3 className="font-semibold text-slate-200 text-sm">{n.title}</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed">{n.body}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Footnote */}
                <p className="text-xs text-slate-600 text-center pb-6 font-mono">
                    n = input size · V = vertices · E = edges · k = range/digit count · m = string/key length · * = amortised
                </p>
            </div>
        </div>
    );
}
