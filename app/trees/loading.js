"use client";
import { useEffect, useState } from 'react';

const NODES = [
    { id: 0, cx: 200, cy: 44,  label: '50', parent: null },
    { id: 1, cx: 110, cy: 124, label: '30', parent: 0 },
    { id: 2, cx: 290, cy: 124, label: '70', parent: 0 },
    { id: 3, cx:  55, cy: 204, label: '20', parent: 1 },
    { id: 4, cx: 165, cy: 204, label: '40', parent: 1 },
    { id: 5, cx: 235, cy: 204, label: '60', parent: 2 },
    { id: 6, cx: 345, cy: 204, label: '80', parent: 2 },
];

export default function TreesLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= NODES.length ? 0 : v + 1));
        }, 380);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-lime-600 to-green-700 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-lime-100 text-sm font-semibold tracking-widest uppercase mb-1">Trees</p>
                <p className="text-white text-2xl font-bold">Building your tree…</p>
            </div>

            <svg viewBox="0 0 400 260" width="320" className="overflow-visible">
                {NODES.map(n => {
                    if (n.parent === null) return null;
                    const p = NODES[n.parent];
                    if (n.id >= visible) return null;
                    return (
                        <line
                            key={`e-${n.id}`}
                            x1={p.cx} y1={p.cy}
                            x2={n.cx} y2={n.cy}
                            stroke="#4ade80" strokeWidth="2" opacity="0.5"
                        />
                    );
                })}
                {NODES.map(n => {
                    if (n.id >= visible) return null;
                    const isNew = n.id === visible - 1;
                    return (
                        <g key={n.id} transform={`translate(${n.cx},${n.cy})`}
                            style={{ transition: 'all 0.3s ease' }}>
                            <circle r="22" fill={isNew ? '#84cc16' : '#166534'}
                                stroke={isNew ? '#d9f99d' : '#4ade80'} strokeWidth="2" />
                            <text textAnchor="middle" dominantBaseline="middle"
                                fontSize="13" fontWeight="700" fill="white">{n.label}</text>
                        </g>
                    );
                })}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-lime-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
