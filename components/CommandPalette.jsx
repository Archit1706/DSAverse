"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { totalPages } from '@/data/learningStats';

/* Static destinations that are not visualizer pages. */
const EXTRAS = [
    { route: '/review', title: 'Review', section: 'practice', description: 'Spaced repetition over every question on the site' },
    { route: '/compare', title: 'Compare Algorithms', section: 'reference', description: 'Put two or three algorithms side by side' },
    { route: '/cheatsheet', title: 'Complexity Cheatsheet', section: 'reference', description: 'Time and space bounds for every structure' },
    { route: '/', title: 'Home', section: '', description: '' },
    { route: '/contact', title: 'Contact', section: '', description: '' },
];

const SECTION_LABEL = (s) => (s || '').replace(/-/g, ' ');

/** Subsequence match with a crude score: earlier and tighter matches rank higher. */
function score(haystack, needle) {
    if (!needle) return 0;
    const h = haystack.toLowerCase();
    const n = needle.toLowerCase();
    const direct = h.indexOf(n);
    if (direct !== -1) return 1000 - direct - (h.length - n.length) * 0.1;

    let hi = 0, matched = 0, firstAt = -1, gaps = 0, lastHit = -1;
    for (let ni = 0; ni < n.length; ni++) {
        const c = n[ni];
        while (hi < h.length && h[hi] !== c) hi++;
        if (hi >= h.length) return -1;
        if (firstAt === -1) firstAt = hi;
        if (lastHit !== -1) gaps += hi - lastHit - 1;
        lastHit = hi;
        matched++;
        hi++;
    }
    return matched === n.length ? 400 - firstAt - gaps * 0.5 : -1;
}

export default function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [pages, setPages] = useState(null);     // lazily imported
    const inputRef = useRef(null);
    const listRef = useRef(null);

    /* The page index is ~47 KB. The palette lives in the Navbar, which is on
       every page, so the data is fetched only when the palette first opens
       rather than being bundled into every route. */
    useEffect(() => {
        if (!open || pages) return;
        let cancelled = false;
        import('@/data/pageIndex')
            .then(m => { if (!cancelled) setPages(m.pageIndex); })
            .catch(() => { if (!cancelled) setPages([]); });
        return () => { cancelled = true; };
    }, [open, pages]);

    const toggle = useCallback(() => setOpen(o => !o), []);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                toggle();
            } else if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggle]);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            // focus after the dialog paints
            const t = setTimeout(() => inputRef.current?.focus(), 30);
            return () => clearTimeout(t);
        }
    }, [open]);

    const results = useMemo(() => {
        const all = [...EXTRAS, ...(pages ?? []).map(p => ({
            route: p.route, title: p.name || p.title, section: p.section, description: p.description,
        }))];
        if (!query.trim()) {
            return all.filter(r => EXTRAS.some(e => e.route === r.route)).concat(all.slice(EXTRAS.length, EXTRAS.length + 6));
        }
        return all
            .map(r => ({ r, s: Math.max(score(r.title, query), score(SECTION_LABEL(r.section) + ' ' + r.title, query) - 50) }))
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 12)
            .map(x => x.r);
    }, [query, pages]);

    useEffect(() => { setActive(0); }, [query]);

    const go = useCallback((route) => {
        setOpen(false);
        router.push(route);
    }, [router]);

    const onInputKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active].route); }
    };

    useEffect(() => {
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [active, results]);

    return (
        <>
            <button
                onClick={toggle}
                aria-label="Search the site"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:border-indigo-500/60 hover:text-slate-200 transition-colors text-xs">
                <Search className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Search</span>
                <kbd className="hidden lg:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500">⌘K</kbd>
            </button>

            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
                    onClick={() => setOpen(false)}>
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Search pages"
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-950/80 overflow-hidden">

                        <div className="flex items-center gap-3 px-4 border-b border-slate-800">
                            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={onInputKey}
                                placeholder={`Search ${totalPages} visualizers…`}
                                className="flex-1 bg-transparent py-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                                spellCheck={false}
                            />
                            {!pages && <Loader2 className="w-4 h-4 text-slate-600 animate-spin flex-shrink-0" />}
                        </div>

                        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
                            {results.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-slate-600">
                                    {pages ? `Nothing matches “${query}”` : 'Loading…'}
                                </p>
                            ) : results.map((r, i) => (
                                <button
                                    key={r.route}
                                    data-active={i === active}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => go(r.route)}
                                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${i === active ? 'bg-indigo-500/15' : 'hover:bg-slate-800/60'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm truncate ${i === active ? 'text-white' : 'text-slate-200'}`}>{r.title}</div>
                                        {r.description && (
                                            <div className="text-[11px] text-slate-500 truncate mt-0.5">{r.description}</div>
                                        )}
                                    </div>
                                    {r.section && (
                                        <span className="text-[10px] uppercase tracking-wide text-slate-600 flex-shrink-0 mt-1">
                                            {SECTION_LABEL(r.section)}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-800 text-[10px] text-slate-600">
                            <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" />navigate</span>
                            <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" />open</span>
                            <span className="ml-auto">esc to close</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
