"use client";
import { useEffect, useState } from 'react';

/* A line settling onto a scatter of points — the picture every page in this
   section starts from: guess, measure, adjust. */
const POINTS = [[-60, 34], [-42, 30], [-30, 12], [-14, 10], [0, -4], [14, -2], [28, -20], [44, -22], [58, -38]];
const LINES = [[0.6, -20], [0.1, 10], [-0.3, 4], [-0.55, 1], [-0.62, 0]];

export default function MachineLearningLoading() {
    const [i, setI] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setI(k => (k + 1) % LINES.length), 650);
        return () => clearInterval(id);
    }, []);

    const [w, b] = LINES[i];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-lime-500 to-green-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-lime-50 text-sm font-semibold tracking-widest uppercase mb-1">Machine Learning</p>
                <p className="text-white text-2xl font-bold">Fitting the model…</p>
            </div>

            <svg viewBox="-90 -60 180 120" width="220" className="overflow-visible">
                <g style={{ transform: `translateY(${b}px) rotate(${Math.round(Math.atan(w) * 1800 / Math.PI) / 10}deg)`, transition: 'transform 0.55s ease' }}>
                    <line x1={-85} y1={0} x2={85} y2={0} stroke="#a3e635" strokeWidth={3} strokeLinecap="round" />
                </g>
                {POINTS.map(([x, y]) => (
                    <circle key={x} cx={x} cy={y} r={4} fill="#38bdf8" stroke="#020617" strokeWidth={1.5} />
                ))}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, k) => (
                    <div
                        key={k}
                        className="w-2 h-2 rounded-full bg-lime-500 animate-bounce"
                        style={{ animationDelay: `${k * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
