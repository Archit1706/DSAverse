"use client";
import { useEffect, useState } from 'react';

const STAGES = [
    { label: 'DNS', sub: 'resolving host', color: '#a1a1aa' },
    { label: 'TCP', sub: 'connecting', color: '#71717a' },
    { label: 'TLS', sub: 'handshake', color: '#52525b' },
    { label: 'HTTP', sub: 'requesting', color: '#3f3f46' },
];

export default function UnderTheHoodLoading() {
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setActiveIdx(i => (i + 1) % STAGES.length), 500);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-zinc-300 text-sm font-semibold tracking-widest uppercase mb-1">Under the Hood</p>
                <p className="text-white text-2xl font-bold">Loading visualizer…</p>
            </div>

            <div className="flex items-center gap-2">
                {STAGES.map((stage, i) => (
                    <div key={stage.label} className="flex items-center gap-2">
                        <div className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all duration-300 ${
                            i === activeIdx
                                ? 'border-zinc-400 bg-zinc-800/80 scale-110'
                                : i < activeIdx
                                ? 'border-zinc-700 bg-zinc-900/40 opacity-50'
                                : 'border-zinc-800 bg-slate-900/40 opacity-30'
                        }`}>
                            <span className="text-sm font-bold text-zinc-200">{stage.label}</span>
                            <span className="text-[10px] text-zinc-500">{stage.sub}</span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={`w-6 h-px transition-all duration-300 ${
                                i < activeIdx ? 'bg-zinc-400' : 'bg-zinc-800'
                            }`} />
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
        </div>
    );
}
