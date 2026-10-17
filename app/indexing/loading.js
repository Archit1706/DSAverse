"use client";
import { useEffect, useState } from 'react';

/* Eight slots filling one by one, with the third and sixth colliding into
   a chain — the shape every page in this section is about. */
const SLOTS = [
    { key: '21', chain: 0 },
    { key: '07', chain: 0 },
    { key: '14', chain: 1 },
    { key: '35', chain: 0 },
    { key: '08', chain: 0 },
    { key: '42', chain: 2 },
    { key: '19', chain: 0 },
    { key: '63', chain: 0 },
];

export default function IndexingLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= SLOTS.length ? 0 : v + 1));
        }, 360);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-emerald-100 text-sm font-semibold tracking-widest uppercase mb-1">Indexing</p>
                <p className="text-white text-2xl font-bold">Hashing your keys…</p>
            </div>

            <svg viewBox="0 0 400 200" width="340" className="overflow-visible">
                {SLOTS.map((s, i) => {
                    const x = 14 + i * 47;
                    const filled = i < visible;
                    const isNew = i === visible - 1;
                    return (
                        <g key={i} style={{ transition: 'all 0.3s ease' }}>
                            {/* bucket */}
                            <rect x={x} y={40} width={38} height={38} rx="7"
                                fill={filled ? (isNew ? '#10b981' : '#065f46') : '#1e293b'}
                                stroke={filled ? (isNew ? '#6ee7b7' : '#10b981') : '#334155'}
                                strokeWidth="2" />
                            {filled && (
                                <text x={x + 19} y={59} textAnchor="middle" dominantBaseline="middle"
                                    fontSize="12" fontWeight="700" fill="white">{s.key}</text>
                            )}
                            <text x={x + 19} y={28} textAnchor="middle" fontSize="9" fill="#475569">{i}</text>

                            {/* collision chain hanging off the bucket */}
                            {filled && Array.from({ length: s.chain }).map((_, c) => (
                                <g key={c}>
                                    <line x1={x + 19} y1={78 + c * 34} x2={x + 19} y2={88 + c * 34}
                                        stroke="#10b981" strokeWidth="2" opacity="0.6" />
                                    <rect x={x + 3} y={88 + c * 34} width={32} height={28} rx="6"
                                        fill="#134e4a" stroke="#14b8a6" strokeWidth="2" />
                                </g>
                            ))}
                        </g>
                    );
                })}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
