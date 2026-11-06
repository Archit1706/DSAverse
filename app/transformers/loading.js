"use client";
import { useEffect, useState } from 'react';

/* A row of tokens, each in turn looking back at the ones before it: the
   picture every page in this section is about. */
const N = 7;
const WEIGHTS = [[1], [0.3, 0.7], [0.2, 0.2, 0.6], [0.5, 0.1, 0.1, 0.3], [0.1, 0.4, 0.1, 0.1, 0.3], [0.1, 0.1, 0.5, 0.1, 0.1, 0.1], [0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2]];

export default function TransformersLoading() {
    const [i, setI] = useState(1);

    useEffect(() => {
        const id = setInterval(() => setI(k => (k + 1) % N), 520);
        return () => clearInterval(id);
    }, []);

    const W = 46, Y = 92;
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-indigo-50 text-sm font-semibold tracking-widest uppercase mb-1">Transformers</p>
                <p className="text-white text-2xl font-bold">Paying attention…</p>
            </div>

            <svg viewBox={`0 0 ${N * W} 120`} width="300" className="overflow-visible">
                {WEIGHTS[i].map((w, j) => {
                    const x1 = i * W + W / 2, x0 = j * W + W / 2;
                    const lift = 18 + Math.abs(x1 - x0) * 0.35;
                    return (
                        <path key={`${i}-${j}`} d={`M ${x1} ${Y - 14} Q ${(x0 + x1) / 2} ${Y - 14 - lift} ${x0} ${Y - 14}`}
                            fill="none" stroke="#a5b4fc" strokeWidth={1 + 6 * w} strokeOpacity={0.25 + 0.75 * w} strokeLinecap="round" />
                    );
                })}
                {Array.from({ length: N }, (_, k) => (
                    <rect key={k} x={k * W + 6} y={Y - 12} width={W - 12} height={24} rx={5}
                        fill={k === i ? '#6366f1' : k < i ? '#312e81' : '#1e293b'} style={{ transition: 'fill 0.25s ease' }} />
                ))}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, k) => (
                    <div key={k} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${k * 0.15}s` }} />
                ))}
            </div>
        </div>
    );
}
