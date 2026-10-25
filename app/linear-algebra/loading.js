"use client";
import { useEffect, useState } from 'react';

/* A grid carried through a few matrices in turn — shear, rotate, stretch,
   back to the identity — the picture every page in this section starts from. */
const MATRICES = [
    [1, 0, 0, 1],
    [1, 0, 0.6, 1],
    [0.8, 0.6, -0.6, 0.8],
    [1.3, 0, 0, 0.7],
    [1, 0.4, 0.4, 1],
];

export default function LinearAlgebraLoading() {
    const [i, setI] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setI(k => (k + 1) % MATRICES.length), 650);
        return () => clearInterval(id);
    }, []);

    const [a, c, b, d] = MATRICES[i];
    const lines = [];
    for (let k = -3; k <= 3; k++) {
        lines.push(<line key={`v${k}`} x1={k * 22} y1={-66} x2={k * 22} y2={66} stroke={k === 0 ? '#a78bfa' : '#5b21b6'} strokeWidth={k === 0 ? 2 : 1} />);
        lines.push(<line key={`h${k}`} x1={-66} y1={k * 22} x2={66} y2={k * 22} stroke={k === 0 ? '#a78bfa' : '#5b21b6'} strokeWidth={k === 0 ? 2 : 1} />);
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-violet-100 text-sm font-semibold tracking-widest uppercase mb-1">Linear Algebra</p>
                <p className="text-white text-2xl font-bold">Transforming the plane…</p>
            </div>

            <svg viewBox="-110 -110 220 220" width="220" className="overflow-visible">
                {/* y is flipped so the matrices read the way they do on the pages */}
                <g transform="scale(1,-1)">
                    <g style={{ transform: `matrix(${a}, ${c}, ${b}, ${d}, 0, 0)`, transition: 'transform 0.55s ease' }}>
                        {lines}
                        <line x1={0} y1={0} x2={22} y2={0} stroke="#4ade80" strokeWidth={4} strokeLinecap="round" />
                        <line x1={0} y1={0} x2={0} y2={22} stroke="#f87171" strokeWidth={4} strokeLinecap="round" />
                    </g>
                </g>
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, k) => (
                    <div
                        key={k}
                        className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                        style={{ animationDelay: `${k * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
