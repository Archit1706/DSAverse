"use client";
import { useEffect, useState } from 'react';

// Animate a union-find tree merging: start as singletons, progressively union
const PHASES = [
    { label: 'Initialize', nodes: [0,1,2,3,4,5,6,7], parents: [0,1,2,3,4,5,6,7] },
    { label: 'union(0,1)', nodes: [0,1,2,3,4,5,6,7], parents: [1,1,2,3,4,5,6,7] },
    { label: 'union(2,3)', nodes: [0,1,2,3,4,5,6,7], parents: [1,1,3,3,4,5,6,7] },
    { label: 'union(4,5)', nodes: [0,1,2,3,4,5,6,7], parents: [1,1,3,3,5,5,6,7] },
    { label: 'union(6,7)', nodes: [0,1,2,3,4,5,6,7], parents: [1,1,3,3,5,5,7,7] },
    { label: 'union(1,3)', nodes: [0,1,2,3,4,5,6,7], parents: [1,3,3,3,5,5,7,7] },
    { label: 'union(5,7)', nodes: [0,1,2,3,4,5,6,7], parents: [1,3,3,3,5,7,7,7] },
    { label: 'union(3,7)', nodes: [0,1,2,3,4,5,6,7], parents: [1,3,3,7,5,7,7,7] },
];

const COLORS = ['#a78bfa','#818cf8','#c084fc','#7c3aed','#8b5cf6','#a855f7','#9333ea','#7e22ce'];

export default function UnionFindLoading() {
    const [phaseIdx, setPhaseIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setPhaseIdx(i => (i + 1) % PHASES.length), 600);
        return () => clearInterval(id);
    }, []);

    const phase = PHASES[phaseIdx];
    const parents = phase.parents;

    // Build connected components
    function findRoot(i) {
        while (parents[i] !== i) i = parents[i];
        return i;
    }
    const roots = phase.nodes.map(n => findRoot(n));
    const uniqueRoots = [...new Set(roots)];
    const colorMap = {};
    uniqueRoots.forEach((r, i) => { colorMap[r] = COLORS[i % COLORS.length]; });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-purple-600 to-violet-700 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-purple-100 text-sm font-semibold tracking-widest uppercase mb-1">Union-Find</p>
                <p className="text-white text-2xl font-bold">Loading visualizer…</p>
            </div>

            <div className="flex flex-col items-center gap-4">
                <p className="text-purple-400 text-xs font-semibold tracking-widest uppercase">{phase.label}</p>
                {/* Parent array */}
                <div className="flex gap-1.5">
                    {phase.nodes.map(n => (
                        <div key={n} className="flex flex-col items-center gap-0.5">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-slate-900"
                                style={{ background: colorMap[roots[n]], transition: 'background 0.4s ease' }}>
                                {parents[n]}
                            </div>
                            <span className="text-[9px] text-slate-500">{n}</span>
                        </div>
                    ))}
                </div>
                {/* Component groups */}
                <div className="flex gap-3 flex-wrap justify-center">
                    {uniqueRoots.map(r => {
                        const members = phase.nodes.filter(n => roots[n] === r);
                        return (
                            <div key={r} className="flex gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-900/60"
                                style={{ borderColor: colorMap[r] + '60' }}>
                                {members.map(m => (
                                    <div key={m} className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-slate-900"
                                        style={{ background: colorMap[r] }}>{m}</div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
        </div>
    );
}
