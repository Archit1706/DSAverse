"use client";
import { useEffect, useState } from 'react';

/* Rows committing into a table one at a time, each first appearing as an
   uncommitted (dashed) write and then settling — the life of every row this
   section is about. */
const ROWS = [
    ['1', 'Ana', '100'],
    ['2', 'Ben', '250'],
    ['3', 'Cara', '75'],
    ['4', 'Dev', '310'],
    ['5', 'Eli', '180'],
];

export default function DatabaseSystemsLoading() {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick(t => (t >= ROWS.length * 2 + 1 ? 0 : t + 1)), 320);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-blue-500 to-teal-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-blue-100 text-sm font-semibold tracking-widest uppercase mb-1">Database Systems</p>
                <p className="text-white text-2xl font-bold">Committing your transactions…</p>
            </div>

            <svg viewBox="0 0 300 200" width="300" className="overflow-visible">
                {/* header */}
                <rect x="0" y="0" width="300" height="28" rx="6" fill="#1e3a8a" />
                {['id', 'name', 'balance'].map((h, c) => (
                    <text key={h} x={20 + c * 100} y="18" fontSize="11" fontWeight="700" fill="#bfdbfe">{h}</text>
                ))}
                {ROWS.map((row, i) => {
                    const written = tick > i * 2;
                    const committed = tick > i * 2 + 1;
                    return (
                        <g key={i} style={{ transition: 'opacity 0.3s ease' }} opacity={written ? 1 : 0.15}>
                            <rect x="0" y={34 + i * 32} width="300" height="28" rx="5"
                                fill={committed ? '#0f2a4a' : '#1e293b'}
                                stroke={committed ? '#14b8a6' : '#60a5fa'}
                                strokeDasharray={committed ? undefined : '4 3'}
                                strokeWidth="1.5" />
                            {row.map((v, c) => (
                                <text key={c} x={20 + c * 100} y={52 + i * 32} fontSize="11"
                                    fill={committed ? '#e2e8f0' : '#93c5fd'}>{v}</text>
                            ))}
                        </g>
                    );
                })}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
