"use client";
import { useEffect, useState } from 'react';

/* Pascal's triangle filling in row by row, each cell the sum of the two
   above it — the shape most of this section comes back to. */
const ROWS = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]];
const CELLS = ROWS.flatMap((row, n) => row.map((v, k) => ({ n, k, v })));

export default function CombinatoricsLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= CELLS.length ? 0 : v + 1));
        }, 220);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-fuchsia-100 text-sm font-semibold tracking-widest uppercase mb-1">Combinatorics</p>
                <p className="text-white text-2xl font-bold">Counting the ways…</p>
            </div>

            <svg viewBox="0 0 300 200" width="300" className="overflow-visible">
                {CELLS.map((c, i) => {
                    const x = 150 + (c.k - c.n / 2) * 46;
                    const y = 20 + c.n * 40;
                    const filled = i < visible;
                    const isNew = i === visible - 1;
                    return (
                        <g key={i} style={{ transition: 'all 0.3s ease' }}>
                            <circle cx={x} cy={y} r={17}
                                fill={filled ? (isNew ? '#d946ef' : '#701a75') : '#1e293b'}
                                stroke={filled ? (isNew ? '#f0abfc' : '#c026d3') : '#334155'}
                                strokeWidth="2" />
                            {filled && (
                                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                                    fontSize="13" fontWeight="700" fill="white">{c.v}</text>
                            )}
                        </g>
                    );
                })}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
