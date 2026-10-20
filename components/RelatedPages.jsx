"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Repeat2, Layers, Compass, Shuffle } from 'lucide-react';
import { related } from '@/data/related';
import { markVisited } from '@/lib/progress';

/* Mirrors the kinds emitted by scripts/build-learning-data.mjs. Numeric order
   is display order there too, so sorting the groups descending is enough. */
const KIND = {
    3: { label: 'The same algorithm, another angle', icon: Repeat2, tone: 'text-amber-400' },
    2: { label: 'Same pattern', icon: Compass, tone: 'text-emerald-400' },
    1: { label: 'Related elsewhere on the site', icon: Shuffle, tone: 'text-indigo-400' },
    0: { label: 'More in this section', icon: Layers, tone: 'text-slate-400' },
};

/**
 * Sibling links at the foot of a visualizer, plus the visit record that the
 * review dashboard reads. Rendered from the algorithm layout, so the 121 pages
 * themselves stay untouched.
 */
export default function RelatedPages({ route }) {
    useEffect(() => { markVisited(route); }, [route]);

    const entry = related.map?.[route];
    if (!entry || !entry.length) return null;

    // Group by kind so each heading is accurate rather than a generic "related".
    const groups = new Map();
    for (const [idx, kind] of entry) {
        if (!groups.has(kind)) groups.set(kind, []);
        groups.get(kind).push({
            route: related.routes[idx],
            title: related.titles[idx],
        });
    }
    const ordered = [...groups.entries()].sort((a, b) => b[0] - a[0]);

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                    See also
                </h2>
                <div className="space-y-5">
                    {ordered.map(([kind, items]) => {
                        const meta = KIND[kind] ?? KIND[0];
                        const Icon = meta.icon;
                        return (
                            <div key={kind}>
                                <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide mb-2 ${meta.tone}`}>
                                    <Icon className="h-3 w-3" />{meta.label}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                    {items.map(it => (
                                        <Link key={it.route} href={it.route}
                                            className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/60 transition-colors">
                                            <span className="text-sm text-slate-300 group-hover:text-white truncate">{it.title}</span>
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
