"use client";

import React, { useEffect, useState } from 'react';

/**
 * An editable matrix, bound both ways to whatever the page draws.
 *
 *   <MatrixInput value={M} onChange={setM} columnColors={[MATH_COLORS.i, MATH_COLORS.j]} />
 *
 * `value` is an array of rows. Each column can take a colour, so the entries
 * of the column that is î′ are drawn in î's green — the link between "the
 * first column" and "where î lands" is the whole idea of a matrix.
 *
 * Cells keep their own text while you type, so "-" or "1." are allowed
 * mid-edit; the matrix only changes when the text parses as a number.
 */
export default function MatrixInput({ value, onChange, columnColors = [], step = 0.1, min = -10, max = 10, label, readOnly = false, digits = 2 }) {
    const fmt = (v) => String(Math.round(v * 10 ** digits) / 10 ** digits);
    const [draft, setDraft] = useState(() => value.map(r => r.map(fmt)));

    // Follow outside changes (a drag on the plane, a preset) unless the text
    // already means the same number.
    useEffect(() => {
        setDraft(d => value.map((r, i) => r.map((v, j) => {
            const cur = d[i]?.[j];
            return cur !== undefined && Number(cur) === Math.round(v * 10 ** digits) / 10 ** digits ? cur : fmt(v);
        })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const edit = (i, j, text) => {
        setDraft(d => d.map((r, ri) => r.map((c, ci) => (ri === i && ci === j ? text : c))));
        const n = Number(text);
        if (text.trim() === '' || !Number.isFinite(n)) return;
        const clamped = Math.min(Math.max(n, min), max);
        onChange?.(value.map((r, ri) => r.map((c, ci) => (ri === i && ci === j ? clamped : c))));
    };

    const cols = value[0]?.length ?? 0;
    return (
        <div className="inline-flex items-center gap-2">
            {label && <span className="text-sm font-semibold text-slate-300">{label} =</span>}
            <div className="relative px-2 py-1">
                <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1.5 border-l-2 border-t-2 border-b-2 border-slate-400 rounded-l" />
                <span aria-hidden className="absolute right-0 top-0 bottom-0 w-1.5 border-r-2 border-t-2 border-b-2 border-slate-400 rounded-r" />
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {draft.map((row, i) => row.map((text, j) => (
                        <input
                            key={`${i}-${j}`}
                            type="number"
                            inputMode="decimal"
                            step={step}
                            min={min}
                            max={max}
                            value={text}
                            readOnly={readOnly}
                            onChange={e => edit(i, j, e.target.value)}
                            aria-label={`Row ${i + 1}, column ${j + 1}`}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1 text-center font-mono text-sm focus:outline-none focus:border-slate-400"
                            style={{ color: columnColors[j] ?? '#e2e8f0' }}
                        />
                    )))}
                </div>
            </div>
        </div>
    );
}
