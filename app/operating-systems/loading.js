"use client";
import { useEffect, useState } from 'react';

/* A Gantt chart growing one time slice at a time, with the CPU handed
   back and forth between three processes — the shape this section opens with. */
const SLICES = [
    { pid: 'P1', len: 2 },
    { pid: 'P2', len: 3 },
    { pid: 'P1', len: 1 },
    { pid: 'P3', len: 2 },
    { pid: 'P2', len: 1 },
    { pid: 'P3', len: 2 },
    { pid: 'P1', len: 1 },
];
const SHADE = { P1: '#eab308', P2: '#f59e0b', P3: '#a16207' };
const UNIT = 30;

export default function OperatingSystemsLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= SLICES.length ? 0 : v + 1));
        }, 360);
        return () => clearInterval(id);
    }, []);

    let x = 20;
    const blocks = SLICES.map((s, i) => {
        const block = { ...s, x, i };
        x += s.len * UNIT;
        return block;
    });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-yellow-50 text-sm font-semibold tracking-widest uppercase mb-1">Operating Systems</p>
                <p className="text-white text-2xl font-bold">Scheduling your processes…</p>
            </div>

            <svg viewBox="0 0 400 120" width="340" className="overflow-visible">
                {/* time axis */}
                <line x1="20" y1="78" x2="380" y2="78" stroke="#334155" strokeWidth="2" />
                {Array.from({ length: 13 }).map((_, t) => (
                    <g key={t}>
                        <line x1={20 + t * UNIT} y1="78" x2={20 + t * UNIT} y2="84" stroke="#475569" strokeWidth="1" />
                        <text x={20 + t * UNIT} y="96" textAnchor="middle" fontSize="9" fill="#475569">{t}</text>
                    </g>
                ))}
                {blocks.map(b => {
                    const shown = b.i < visible;
                    const isNew = b.i === visible - 1;
                    return (
                        <g key={b.i} style={{ transition: 'opacity 0.3s ease', opacity: shown ? 1 : 0 }}>
                            <rect x={b.x + 1} y={isNew ? 30 : 36} width={b.len * UNIT - 2} height={isNew ? 46 : 40} rx="6"
                                fill={SHADE[b.pid]} stroke={isNew ? '#fef08a' : '#713f12'} strokeWidth="2"
                                style={{ transition: 'all 0.3s ease' }} />
                            <text x={b.x + (b.len * UNIT) / 2} y={isNew ? 57 : 60} textAnchor="middle"
                                fontSize="12" fontWeight="700" fill="#1c1917">{b.pid}</text>
                        </g>
                    );
                })}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
