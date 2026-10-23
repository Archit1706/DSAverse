"use client";
import { useEffect, useState } from 'react';

/* Eight segments leaving one by one, with the third and sixth picking up
   extra headers on the way down the stack — encapsulation, the shape every
   page in this section starts from. */
const SLOTS = [
    { seq: '01', headers: 0 },
    { seq: '02', headers: 0 },
    { seq: '03', headers: 1 },
    { seq: '04', headers: 0 },
    { seq: '05', headers: 0 },
    { seq: '06', headers: 2 },
    { seq: '07', headers: 0 },
    { seq: '08', headers: 0 },
];

export default function ComputerNetworksLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= SLOTS.length ? 0 : v + 1));
        }, 360);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-pink-100 text-sm font-semibold tracking-widest uppercase mb-1">Computer Networks</p>
                <p className="text-white text-2xl font-bold">Opening a connection…</p>
            </div>

            <svg viewBox="0 0 400 200" width="340" className="overflow-visible">
                {SLOTS.map((s, i) => {
                    const x = 14 + i * 47;
                    const filled = i < visible;
                    const isNew = i === visible - 1;
                    return (
                        <g key={i} style={{ transition: 'all 0.3s ease' }}>
                            {/* segment */}
                            <rect x={x} y={40} width={38} height={38} rx="7"
                                fill={filled ? (isNew ? '#ec4899' : '#831843') : '#1e293b'}
                                stroke={filled ? (isNew ? '#f9a8d4' : '#ec4899') : '#334155'}
                                strokeWidth="2" />
                            {filled && (
                                <text x={x + 19} y={59} textAnchor="middle" dominantBaseline="middle"
                                    fontSize="12" fontWeight="700" fill="white">{s.seq}</text>
                            )}
                            <text x={x + 19} y={28} textAnchor="middle" fontSize="9" fill="#475569">{i}</text>

                            {/* headers stacked under the segment as it descends the stack */}
                            {filled && Array.from({ length: s.headers }).map((_, c) => (
                                <g key={c}>
                                    <line x1={x + 19} y1={78 + c * 34} x2={x + 19} y2={88 + c * 34}
                                        stroke="#ec4899" strokeWidth="2" opacity="0.6" />
                                    <rect x={x + 3} y={88 + c * 34} width={32} height={28} rx="6"
                                        fill="#4c0519" stroke="#f43f5e" strokeWidth="2" />
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
                        className="w-2 h-2 rounded-full bg-pink-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
