"use client";

import React from 'react';
import { FlaskConical, Database, PenLine, Cpu } from 'lucide-react';

/* Every AI page says where its numbers come from. A learner should never
   have to wonder whether a heatmap was computed or drawn. */
const KINDS = {
    toy: { icon: FlaskConical, tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200' },
    real: { icon: Database, tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' },
    live: { icon: Cpu, tone: 'border-sky-500/40 bg-sky-500/10 text-sky-200' },
    illustrative: { icon: PenLine, tone: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
};

/**
 *   <SourceChip kind="toy">Tiny GPT · 195K parameters · trained on simple stories</SourceChip>
 *   <SourceChip kind="real">GloVe word vectors · Stanford NLP</SourceChip>
 *   <SourceChip kind="live">Trained live in your browser</SourceChip>
 *   <SourceChip kind="illustrative">Hand-written example</SourceChip>
 */
export default function SourceChip({ kind = 'toy', children, className = '' }) {
    const { icon: Icon, tone } = KINDS[kind] ?? KINDS.toy;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone} ${className}`}>
            <Icon className="h-3 w-3 flex-shrink-0" />
            {children}
        </span>
    );
}
