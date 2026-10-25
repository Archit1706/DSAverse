"use client";
import { useEffect, useState } from 'react';

/* A Galton board's bins filling into a bell shape, one bar at a time — the
   picture this section keeps coming back to. */
const BARS = [1, 4, 9, 14, 16, 14, 9, 4, 1];

export default function ProbabilityAndStatisticsLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= BARS.length ? 0 : v + 1));
        }, 260);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-rose-100 text-sm font-semibold tracking-widest uppercase mb-1">Probability and Statistics</p>
                <p className="text-white text-2xl font-bold">Rolling the dice…</p>
            </div>

            <svg viewBox="0 0 320 180" width="300" className="overflow-visible">
                <line x1={10} y1={170} x2={310} y2={170} stroke="#334155" strokeWidth="2" />
                {BARS.map((h, i) => {
                    const filled = i < visible;
                    const isNew = i === visible - 1;
                    const height = h * 9;
                    return (
                        <rect key={i} x={22 + i * 32} y={170 - height} width={24} height={height} rx="4"
                            fill={filled ? (isNew ? '#f43f5e' : '#9f1239') : '#1e293b'}
                            stroke={filled ? (isNew ? '#fda4af' : '#e11d48') : '#334155'} strokeWidth="2"
                            style={{ transition: 'all 0.3s ease' }} />
                    );
                })}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-rose-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
