"use client";
import { useEffect, useState } from 'react';

/* A 3×3 kernel sliding across a small image, the picture every page in this
   section starts from: the same weights, visited at every position. */
const N = 6;
const POSITIONS = [];
for (let r = 0; r <= N - 3; r++) for (let c = 0; c <= N - 3; c++) POSITIONS.push([r, c]);

export default function DeepLearningArchitecturesLoading() {
    const [i, setI] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setI(k => (k + 1) % POSITIONS.length), 260);
        return () => clearInterval(id);
    }, []);

    const [r, c] = POSITIONS[i];
    const S = 22;
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-yellow-50 text-sm font-semibold tracking-widest uppercase mb-1">Deep Learning Architectures</p>
                <p className="text-white text-2xl font-bold">Sliding the kernel…</p>
            </div>

            <svg viewBox={`0 0 ${N * S} ${N * S}`} width="150" className="overflow-visible">
                {Array.from({ length: N * N }, (_, k) => {
                    const y = Math.floor(k / N), x = k % N;
                    const inside = y >= r && y < r + 3 && x >= c && x < c + 3;
                    return <rect key={k} x={x * S + 1} y={y * S + 1} width={S - 2} height={S - 2} rx="3"
                        fill={inside ? '#eab308' : (x + y) % 3 === 0 ? '#334155' : '#1e293b'} style={{ transition: 'fill 0.2s ease' }} />;
                })}
                <rect x={c * S} y={r * S} width={3 * S} height={3 * S} rx="4" fill="none" stroke="#fde68a" strokeWidth="2.5"
                    style={{ transition: 'x 0.2s ease, y 0.2s ease' }} />
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, k) => (
                    <div
                        key={k}
                        className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
                        style={{ animationDelay: `${k * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
