"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    Columns3, Search, X, Plus, ArrowRight, Info, Scale,
    Clock, HardDrive, Gauge, Tag, BookOpen, Shuffle, Sigma, Layers,
} from 'lucide-react';
import { pageIndex } from '@/data/pageIndex';
import { SUBJECTS } from '@/data/subjects';

const BY_ROUTE = Object.fromEntries(pageIndex.map(p => [p.route, p]));
const MAX_COLUMNS = 3;

/* Comparisons worth reaching for, so the page is useful before you pick
   anything. These are the questions the section indexes cannot answer,
   because the two pages sit in different sections. */
const PRESETS = [
    { label: 'Quick vs Merge vs Heap', routes: ['/sorting/quick-sort', '/sorting/merge-sort', '/sorting/heap-sort'] },
    { label: 'BFS vs DFS', routes: ['/graph-algorithms/breadth-first-search', '/graph-algorithms/depth-first-search'] },
    { label: 'Hash table vs B-tree', routes: ['/indexing/open-hash-tables', '/indexing/b-trees'] },
    { label: 'Open vs closed hashing', routes: ['/indexing/open-hash-tables', '/indexing/closed-hash-tables'] },
    { label: 'Dijkstra vs Floyd-Warshall', routes: ['/graph-algorithms/dijkstras-shortest-path', '/graph-algorithms/floyd-warshall'] },
    { label: 'AVL vs Red-Black vs Splay', routes: ['/trees/avl-tree', '/indexing/red-black-trees', '/indexing/splay-trees'] },
    { label: 'Kadane vs sliding window', routes: ['/dynamic-programming/maximum-subarray', '/two-pointers-and-sliding-window/maximum-sum-subarray'] },
    { label: 'Prim vs Kruskal', routes: ['/graph-algorithms/prims-minimum-spanning-tree', '/graph-algorithms/kruskal-minimum-spanning-tree'] },
    { label: 'KMP vs Rabin-Karp vs Z', routes: ['/string-algorithms/kmp-string-matching', '/string-algorithms/rabin-karp', '/string-algorithms/z-algorithm'] },
    { label: 'Array vs linked list', routes: ['/basics/lists-array', '/basics/lists-linked-list'] },
];

/* Ranks complexity so a column can be marked as the cheaper one. Anything
   unrecognised sorts last and simply never wins the badge — better than
   guessing, since these strings are prose like "O(1) access". */
const COMPLEXITY_RANK = [
    [/^O\(1\)/, 1], [/^O\(α\(n\)\)/, 1], [/^O\(log log n\)/, 2],
    [/^O\(log/, 3], [/^O\(√n\)/, 4], [/^O\(m\)/, 5], [/^O\(k\)/, 5],
    [/^O\(n \+ [km]\)/, 6], [/^O\(n\)/, 6], [/^O\(V\)/, 6], [/^O\(V \+ E\)/, 7],
    [/^O\(n log n\)/, 8], [/^O\(E log/, 8], [/^O\(\(V\+E\) log V\)/, 8],
    [/^O\(nk\)/, 9], [/^O\(n[×*]/, 10], [/^O\(n²\)/, 11], [/^O\(V²\)/, 11],
    [/^O\(n³\)/, 12], [/^O\(V³\)/, 12], [/^O\(2\^?n\)/, 13], [/^O\(n!\)/, 14],
];
const rankOf = (c) => {
    if (!c) return 99;
    for (const [re, r] of COMPLEXITY_RANK) if (re.test(c.trim())) return r;
    return 98;
};

const DIFFICULTY_TONE = {
    Beginner: 'bg-green-500/20 text-green-400',
    Intermediate: 'bg-yellow-500/20 text-yellow-400',
    Advanced: 'bg-red-500/20 text-red-400',
};

const SECTION_LABEL = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/* ── picker ───────────────────────────────────────────────── */

/* Only subjects that actually have pages get a filter chip. */
const PICKER_SUBJECTS = SUBJECTS.filter(s => pageIndex.some(p => p.subject === s.id));

function AlgorithmPicker({ onPick, chosen, onClose }) {
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState(null);   // null = every subject
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        return pageIndex
            .filter(p => !chosen.includes(p.route))
            .filter(p => !subject || p.subject === subject)
            .filter(p => !q || p.name.toLowerCase().includes(q)
                || p.section.includes(q.replace(/ /g, '-'))
                || (p.pattern ?? '').toLowerCase().includes(q))
            .slice(0, 60);
    }, [query, chosen, subject]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label="Choose an algorithm"
                className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 border-b border-slate-800">
                    <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name, section or pattern…"
                        className="flex-1 bg-transparent py-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                        spellCheck={false} />
                    <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {PICKER_SUBJECTS.length > 1 && (
                    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-800">
                        {[{ id: null, shortName: 'All' }, ...PICKER_SUBJECTS].map(s => (
                            <button key={s.id ?? 'all'} onClick={() => setSubject(s.id)}
                                aria-pressed={subject === s.id}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${subject === s.id
                                    ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-200'
                                    : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                {s.shortName}
                            </button>
                        ))}
                    </div>
                )}
                <div className="max-h-[55vh] overflow-y-auto py-2">
                    {results.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-600">Nothing matches &ldquo;{query}&rdquo;</p>
                    ) : results.map(p => (
                        <button key={p.route} onClick={() => { onPick(p.route); onClose(); }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-500/15 transition-colors">
                            <span className="flex-1 min-w-0 text-sm text-slate-200 truncate">{p.name}</span>
                            <span className="text-[10px] uppercase tracking-wide text-slate-600 flex-shrink-0">
                                {SECTION_LABEL(p.section)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── comparison rows ──────────────────────────────────────── */

function Row({ icon: Icon, label, children, hint }) {
    return (
        <div className="border-t border-slate-800 first:border-t-0">
            <div className="flex items-center gap-1.5 px-4 pt-3 text-[11px] uppercase tracking-wide text-slate-500">
                <Icon className="w-3 h-3" />{label}
                {hint && <span className="normal-case tracking-normal text-slate-600">· {hint}</span>}
            </div>
            <div className="px-4 pb-3 pt-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${React.Children.count(children)}, minmax(0, 1fr))` }}>
                {children}
            </div>
        </div>
    );
}

export default function ComparePage() {
    const [picked, setPicked] = useState(['/sorting/quick-sort', '/sorting/merge-sort']);
    const [pickerOpen, setPickerOpen] = useState(false);

    const cols = picked.map(r => BY_ROUTE[r]).filter(Boolean);

    const setAt = (i, route) => setPicked(p => p.map((r, n) => (n === i ? route : r)));
    const removeAt = (i) => setPicked(p => p.filter((_, n) => n !== i));
    const add = (route) => setPicked(p => (p.length < MAX_COLUMNS ? [...p, route] : p));

    const bestTime = useMemo(() => {
        const ranks = cols.map(c => rankOf(c.time));
        const min = Math.min(...ranks);
        return min >= 98 || ranks.filter(r => r === min).length === ranks.length ? -1 : ranks.indexOf(min);
    }, [cols]);

    const bestSpace = useMemo(() => {
        const ranks = cols.map(c => rankOf(c.space));
        const min = Math.min(...ranks);
        return min >= 98 || ranks.filter(r => r === min).length === ranks.length ? -1 : ranks.indexOf(min);
    }, [cols]);

    const randomPair = () => {
        const a = pageIndex[Math.floor(Math.random() * pageIndex.length)];
        let b = a;
        while (b.route === a.route) b = pageIndex[Math.floor(Math.random() * pageIndex.length)];
        setPicked([a.route, b.route]);
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 mb-6 text-sm">
                        <Link href="/" className="text-indigo-300 hover:text-indigo-200 transition-colors">Home</Link>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-400">Compare</span>
                    </nav>
                    <div className="flex items-center gap-3 mb-3">
                        <Columns3 className="h-8 w-8" />
                        <h1 className="text-4xl font-bold">Compare Algorithms</h1>
                    </div>
                    <p className="text-slate-300 max-w-2xl">
                        Two algorithms are easiest to tell apart when you see them next to each other.
                        Pick any {MAX_COLUMNS === 3 ? 'two or three' : 'few'} of the {pageIndex.length} visualizers
                        and compare what they cost and what they are for.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Presets */}
                <div className="mb-6">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                        <Scale className="w-3 h-3" />Common comparisons
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map(p => {
                            const active = p.routes.length === picked.length
                                && p.routes.every((r, i) => r === picked[i]);
                            return (
                                <button key={p.label} onClick={() => setPicked(p.routes)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active
                                        ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-200'
                                        : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:border-indigo-500/50 hover:text-slate-200'}`}>
                                    {p.label}
                                </button>
                            );
                        })}
                        <button onClick={randomPair}
                            className="text-xs px-3 py-1.5 rounded-full border border-slate-700/60 bg-slate-900 text-slate-400 hover:border-indigo-500/50 hover:text-slate-200 transition-colors flex items-center gap-1.5">
                            <Shuffle className="w-3 h-3" />Surprise me
                        </button>
                    </div>
                </div>

                {/* Column heads */}
                <div className="grid gap-3 mb-3"
                    style={{ gridTemplateColumns: `repeat(${Math.min(picked.length + (picked.length < MAX_COLUMNS ? 1 : 0), MAX_COLUMNS + 1)}, minmax(0, 1fr))` }}>
                    {cols.map((c, i) => (
                        <div key={c.route} className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 relative">
                            {picked.length > 2 && (
                                <button onClick={() => removeAt(i)} aria-label={`Remove ${c.name}`}
                                    className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                                {SECTION_LABEL(c.section)}
                            </div>
                            <Link href={c.route} className="group block">
                                <h2 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors pr-6">
                                    {c.name}
                                </h2>
                            </Link>
                        </div>
                    ))}
                    {picked.length < MAX_COLUMNS && (
                        <button onClick={() => setPickerOpen(true)}
                            className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-4 text-slate-500 hover:border-indigo-500/60 hover:text-indigo-300 transition-colors flex items-center justify-center gap-2 text-sm">
                            <Plus className="w-4 h-4" />Add a third
                        </button>
                    )}
                </div>

                {/* Comparison table */}
                <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl overflow-hidden">
                    {/* Math pages carry a key formula and a prerequisite instead of
                        complexity. Each kind of row appears only when at least one
                        column has it, so a Math-only comparison is not two rows of dashes. */}
                    {cols.some(c => c.formula) && (
                        <Row icon={Sigma} label="Key formula">
                            {cols.map(c => (
                                <div key={c.route} className="text-sm font-mono text-slate-200 break-words">
                                    {c.formula || <span className="text-slate-600">—</span>}
                                </div>
                            ))}
                        </Row>
                    )}

                    {cols.some(c => c.prereq) && (
                        <Row icon={Layers} label="Builds on">
                            {cols.map(c => (
                                <div key={c.route} className="text-sm text-slate-300">
                                    {c.prereq || <span className="text-slate-600">—</span>}
                                </div>
                            ))}
                        </Row>
                    )}

                    {cols.some(c => c.time) && (
                    <Row icon={Clock} label="Time complexity" hint="lowest highlighted">
                        {cols.map((c, i) => (
                            <div key={c.route}>
                                <code className={`text-sm px-2 py-1 rounded font-mono ${i === bestTime
                                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                    : 'bg-slate-800 text-slate-300'}`}>
                                    {c.time || '—'}
                                </code>
                            </div>
                        ))}
                    </Row>
                    )}

                    {cols.some(c => c.space) && (
                    <Row icon={HardDrive} label="Space complexity" hint="lowest highlighted">
                        {cols.map((c, i) => (
                            <div key={c.route}>
                                <code className={`text-sm px-2 py-1 rounded font-mono ${i === bestSpace
                                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                    : 'bg-slate-800 text-slate-300'}`}>
                                    {c.space || '—'}
                                </code>
                            </div>
                        ))}
                    </Row>
                    )}

                    <Row icon={Gauge} label="Difficulty">
                        {cols.map(c => (
                            <div key={c.route}>
                                {c.difficulty ? (
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_TONE[c.difficulty] ?? 'bg-slate-700 text-slate-300'}`}>
                                        {c.difficulty}
                                    </span>
                                ) : <span className="text-slate-600 text-sm">—</span>}
                            </div>
                        ))}
                    </Row>

                    <Row icon={Tag} label="Pattern">
                        {cols.map(c => (
                            <div key={c.route} className="text-sm text-slate-300">
                                {c.pattern || <span className="text-slate-600">—</span>}
                            </div>
                        ))}
                    </Row>

                    <Row icon={BookOpen} label="What it does">
                        {cols.map(c => (
                            <p key={c.route} className="text-sm text-slate-400 leading-relaxed">
                                {c.description || '—'}
                            </p>
                        ))}
                    </Row>

                    <Row icon={ArrowRight} label="Watch it run">
                        {cols.map(c => (
                            <Link key={c.route} href={c.route}
                                className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                Open visualizer <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        ))}
                    </Row>
                </div>

                {/* Swap controls */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {picked.map((r, i) => (
                        <button key={r + i} onClick={() => { setPickerOpen(i); }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900 text-slate-400 hover:border-indigo-500/50 hover:text-slate-200 transition-colors">
                            Change column {i + 1}
                        </button>
                    ))}
                </div>

                <div className="mt-6 bg-slate-500/10 border border-slate-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Complexities come from each algorithm&apos;s own page, so they match what the
                            visualizer shows. The &ldquo;lowest&rdquo; highlight compares the headline bound only — it
                            is not a verdict, since the cheaper bound often costs something else, like
                            quick sort&apos;s worst case or merge sort&apos;s extra array.
                            For the full table, see the{' '}
                            <Link href="/cheatsheet" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                complexity cheatsheet
                            </Link>.
                        </p>
                    </div>
                </div>
            </div>

            {pickerOpen !== false && (
                <AlgorithmPicker
                    chosen={picked}
                    onPick={(route) => {
                        if (typeof pickerOpen === 'number') setAt(pickerOpen, route);
                        else add(route);
                    }}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}
