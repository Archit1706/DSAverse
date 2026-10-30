import React from 'react';
import Link from 'next/link';
import { BrainCircuit, Network, Layers, Focus, MessageSquareText, FileSearch, ChevronRight } from 'lucide-react';

/* The AI & Machine Learning sections in learning order. Each section index
   shows this ribbon with itself marked, so a learner always sees where the
   page they are on sits on the road from a fitted line to a RAG pipeline. */
export const AI_PATH = [
    { slug: 'machine-learning', name: 'Machine Learning', icon: BrainCircuit, tone: 'text-lime-300 border-lime-400/50 bg-lime-500/15' },
    { slug: 'neural-networks', name: 'Neural Networks', icon: Network, tone: 'text-orange-300 border-orange-400/50 bg-orange-500/15' },
    { slug: 'deep-learning-architectures', name: 'Deep Learning Architectures', icon: Layers, tone: 'text-yellow-300 border-yellow-400/50 bg-yellow-500/15' },
    { slug: 'transformers', name: 'Transformers', icon: Focus, tone: 'text-indigo-300 border-indigo-400/50 bg-indigo-500/15' },
    { slug: 'language-models', name: 'Language Models', icon: MessageSquareText, tone: 'text-cyan-300 border-cyan-400/50 bg-cyan-500/15' },
    { slug: 'rag-and-vector-search', name: 'RAG and Vector Search', icon: FileSearch, tone: 'text-pink-300 border-pink-400/50 bg-pink-500/15' },
];

/**
 *   <AiPathRibbon current="transformers" />
 *
 * Server-renderable (no client state). Sections before the current one read
 * as done, the current one is lit in its own colour, later ones are dim.
 */
export default function AiPathRibbon({ current }) {
    const at = AI_PATH.findIndex(s => s.slug === current);
    return (
        <nav aria-label="AI and Machine Learning learning path" className="overflow-x-auto">
            <ol className="flex items-center gap-1.5 min-w-max text-xs">
                {AI_PATH.map((s, i) => {
                    const Icon = s.icon;
                    const here = i === at;
                    const tone = here
                        ? `${s.tone} font-semibold`
                        : i < at
                            ? 'text-slate-300 border-slate-600 bg-slate-800/60 hover:border-slate-400'
                            : 'text-slate-500 border-slate-700/60 hover:text-slate-300 hover:border-slate-500';
                    return (
                        <li key={s.slug} className="flex items-center gap-1.5">
                            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" aria-hidden="true" />}
                            <Link href={`/${s.slug}`} aria-current={here ? 'page' : undefined}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${tone}`}>
                                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                {s.name}
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
