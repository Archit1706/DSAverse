"use client";

import React from 'react';

/**
 * A probability distribution as horizontal bars — the next-token
 * distribution, a classifier's output, a softmax.
 *
 *   <ProbBars items={[{ label: ' ball', p: 0.62, kept: true }, …]} chosen={0} />
 *
 * `kept: false` greys a bar out (cut by top-k or top-p); `chosen` marks the
 * token that was actually picked. Labels keep their leading space as a dot.
 */
export default function ProbBars({ items, chosen = null, accent = '#38bdf8', max, digits = 3, ariaLabel = 'Probabilities' }) {
    const top = max ?? Math.max(1e-9, ...items.map(i => i.p));
    return (
        <ul aria-label={ariaLabel} className="space-y-1">
            {items.map((it, k) => {
                const cut = it.kept === false;
                const isChosen = chosen === k;
                const label = String(it.label ?? '');
                const lead = label.startsWith(' ');
                return (
                    <li key={k} className="grid grid-cols-[minmax(4.5rem,8rem)_1fr_3.5rem] items-center gap-2 text-xs">
                        <span className={`font-mono truncate text-right whitespace-pre ${isChosen ? 'text-white font-semibold' : cut ? 'text-slate-600' : 'text-slate-300'}`}>
                            {lead && <span className="opacity-40">·</span>}{(lead ? label.slice(1) : label).replace(/\n/g, '↵') || '␣'}
                        </span>
                        <span className="h-3.5 rounded bg-slate-800 overflow-hidden">
                            <span className="block h-full rounded transition-[width] duration-300"
                                style={{ width: `${(100 * it.p) / top}%`, background: cut ? '#334155' : accent, opacity: isChosen || chosen === null ? 1 : 0.7 }} />
                        </span>
                        <span className={`font-mono tabular-nums ${cut ? 'text-slate-600 line-through' : 'text-slate-400'}`}>{it.p.toFixed(digits)}</span>
                    </li>
                );
            })}
        </ul>
    );
}
