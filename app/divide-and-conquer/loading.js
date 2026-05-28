"use client";
import { useEffect, useState } from 'react';

// Animate a merge sort split → merge cycle on 8 bars
const PHASES = [
    { label: 'Divide',  bars: [[1],[2],[3],[4],[5],[6],[7],[8]], color: '#38bdf8' },
    { label: 'Divide',  bars: [[1,2],[3,4],[5,6],[7,8]],        color: '#0ea5e9' },
    { label: 'Divide',  bars: [[1,2,3,4],[5,6,7,8]],            color: '#0284c7' },
    { label: 'Conquer', bars: [[1,2,3,4,5,6,7,8]],              color: '#0369a1' },
    { label: 'Merge',   bars: [[1,2,3,4],[5,6,7,8]],            color: '#0ea5e9' },
    { label: 'Merge',   bars: [[1,2],[3,4],[5,6],[7,8]],        color: '#38bdf8' },
    { label: 'Merge',   bars: [[1],[2],[3],[4],[5],[6],[7],[8]], color: '#7dd3fc' },
];

export default function DivideAndConquerLoading() {
    const [phaseIdx, setPhaseIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setPhaseIdx(i => (i + 1) % PHASES.length), 500);
        return () => clearInterval(id);
    }, []);

    const phase = PHASES[phaseIdx];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-sky-100 text-sm font-semibold tracking-widest uppercase mb-1">Divide &amp; Conquer</p>
                <p className="text-white text-2xl font-bold">Loading visualizer…</p>
            </div>

            <div className="flex flex-col items-center gap-3">
                <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase">{phase.label}</p>
                <div className="flex gap-3 flex-wrap justify-center">
                    {phase.bars.map((group, gi) => (
                        <div key={gi} className="flex gap-1 items-end px-2 py-1 rounded-lg border border-slate-700 bg-slate-900/60"
                            style={{ transition: 'all 0.4s ease' }}>
                            {group.map((v, vi) => (
                                <div key={vi} className="w-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-slate-900"
                                    style={{ height: `${v * 8 + 16}px`, background: phase.color, transition: 'all 0.4s ease' }}>
                                    {v}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-sky-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
        </div>
    );
}
