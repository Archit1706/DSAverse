"use client";

import React from 'react';

/**
 * A tensor's shape as a small badge: `[T, d] = [7, 64]`.
 *
 *   <ShapeTag names={['T', 'd']} shape={[7, 64]} />
 *   <ShapeTag shape={q} />              // a lib/ml/tensor matrix works too
 *
 * Keeping shapes on screen is the single biggest help in following a
 * transformer: most confusion is "which axis is this?".
 */
export default function ShapeTag({ shape, names, label, className = '' }) {
    const dims = Array.isArray(shape) ? shape : [shape.rows, shape.cols];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-300 ${className}`}>
            {label && <span className="text-slate-400">{label}</span>}
            {names && <span className="text-slate-400">[{names.join(', ')}] =</span>}
            <span className="text-slate-100">[{dims.join(', ')}]</span>
        </span>
    );
}
