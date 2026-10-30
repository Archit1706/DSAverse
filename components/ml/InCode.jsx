"use client";

import React, { useState } from 'react';
import { Code2, ChevronDown } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

/**
 * The "In code" panel: the idea the page just animated, as a few lines of
 * NumPy or PyTorch, collapsed until asked for.
 *
 *   <InCode title="Self-attention in PyTorch" code={SNIPPET} />
 */
export default function InCode({ code, title = 'In code', language = 'python', defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60">
            <button onClick={() => setOpen(o => !o)} aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
                <span className="flex items-center gap-2"><Code2 className="h-4 w-4 text-slate-400" />{title}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="px-4 pb-4"><CodeBlock code={code} language={language} /></div>}
        </div>
    );
}
