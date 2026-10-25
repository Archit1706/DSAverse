"use client";
import { useEffect, useState } from 'react';

/* A secant through P and Q on a parabola, with Q sliding in towards P until
   the line settles on the tangent — the picture the whole section starts from. */
const W = 320, H = 190;
const X0 = -0.5, X1 = 4.5, Y0 = -0.6, Y1 = 4.6;
const sx = (x) => ((x - X0) / (X1 - X0)) * W;
const sy = (y) => H - ((y - Y0) / (Y1 - Y0)) * H;
const f = (x) => 0.25 * x * x;
const P = 1.5;
const HS = [2.5, 1.8, 1.2, 0.7, 0.35, 0.12, 0.01];

const CURVE = Array.from({ length: 61 }, (_, i) => {
    const x = X0 + ((X1 - X0) * i) / 60;
    return `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`;
}).join('');

export default function DifferentialCalculusLoading() {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setFrame(k => (k + 1) % (HS.length + 2)), 420);
        return () => clearInterval(id);
    }, []);

    const h = HS[Math.min(frame, HS.length - 1)];
    const q = P + h;
    const slope = (f(q) - f(P)) / h;
    const line = (x) => f(P) + slope * (x - P);
    const tangent = frame >= HS.length - 1;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-emerald-50 text-sm font-semibold tracking-widest uppercase mb-1">Differential Calculus</p>
                <p className="text-white text-2xl font-bold">Letting h go to zero…</p>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} width="340" className="overflow-visible">
                <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} stroke="#334155" strokeWidth="1.5" />
                <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} stroke="#334155" strokeWidth="1.5" />
                <path d={CURVE} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1={sx(X0)} y1={sy(line(X0))} x2={sx(X1)} y2={sy(line(X1))}
                    stroke={tangent ? '#34d399' : '#fbbf24'} strokeWidth="2"
                    style={{ transition: 'all 0.35s ease' }} />
                <circle cx={sx(P)} cy={sy(f(P))} r="5" fill="#34d399" />
                <circle cx={sx(q)} cy={sy(f(q))} r="5" fill="#fbbf24" style={{ transition: 'all 0.35s ease' }} />
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
