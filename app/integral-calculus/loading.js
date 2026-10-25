"use client";
import { useEffect, useState } from 'react';

/* Rectangles under a curve, doubling in number until they fill the area —
   the Riemann sum the whole section is built on. */
const W = 320, H = 180;
const X0 = 0, X1 = 4, Y1 = 4.4;
const sx = (x) => 16 + ((x - X0) / (X1 - X0)) * (W - 32);
const sy = (y) => H - 14 - (y / Y1) * (H - 28);
const f = (x) => 1 + 0.6 * x + 0.5 * Math.sin(2 * x);
const NS = [2, 4, 8, 16, 32];

const CURVE = Array.from({ length: 81 }, (_, i) => {
    const x = X0 + ((X1 - X0) * i) / 80;
    return `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`;
}).join('');

export default function IntegralCalculusLoading() {
    const [k, setK] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setK(v => (v + 1) % NS.length), 520);
        return () => clearInterval(id);
    }, []);

    const n = NS[k];
    const dx = (X1 - X0) / n;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-teal-50 text-sm font-semibold tracking-widest uppercase mb-1">Integral Calculus</p>
                <p className="text-white text-2xl font-bold">Adding up the rectangles…</p>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} width="340" className="overflow-visible">
                {Array.from({ length: n }, (_, i) => {
                    const x = X0 + (i + 0.5) * dx;
                    // toFixed: Math.sin can differ in its last bit between server and browser
                    const top = +sy(f(x)).toFixed(2);
                    return (
                        <rect key={`${n}-${i}`} x={+sx(X0 + i * dx).toFixed(2)} y={top} width={+(sx(dx) - sx(0)).toFixed(2)} height={+(sy(0) - top).toFixed(2)}
                            fill="#14b8a6" fillOpacity={0.35} stroke="#2dd4bf" strokeWidth={n > 16 ? 0.5 : 1} />
                    );
                })}
                <line x1={sx(X0)} y1={sy(0)} x2={sx(X1)} y2={sy(0)} stroke="#334155" strokeWidth="1.5" />
                <path d={CURVE} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
