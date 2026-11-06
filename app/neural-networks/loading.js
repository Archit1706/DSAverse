"use client";
import { useEffect, useState } from 'react';

/* Three layers of units with signal pulsing through them, layer by layer —
   the forward pass every page in this section starts from. */
const LAYERS = [[-40, 0, 40], [-60, -20, 20, 60], [-20, 20]];
const X = [-70, 0, 70];

export default function NeuralNetworksLoading() {
    const [lit, setLit] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setLit(k => (k + 1) % (LAYERS.length + 1)), 550);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-orange-50 text-sm font-semibold tracking-widest uppercase mb-1">Neural Networks</p>
                <p className="text-white text-2xl font-bold">Running the forward pass…</p>
            </div>

            <svg viewBox="-95 -80 190 160" width="220">
                {LAYERS.slice(0, -1).map((ys, l) => ys.map(y => LAYERS[l + 1].map(y2 => (
                    <line key={`${l}:${y}:${y2}`} x1={X[l]} y1={y} x2={X[l + 1]} y2={y2}
                        stroke={lit > l ? '#fb923c' : '#334155'} strokeWidth={1.2} style={{ transition: 'stroke 0.4s ease' }} />
                ))))}
                {LAYERS.map((ys, l) => ys.map(y => (
                    <circle key={`${l}:${y}`} cx={X[l]} cy={y} r={9} fill={lit > l ? '#f97316' : '#1e293b'} stroke="#fb923c" strokeWidth={1.5}
                        style={{ transition: 'fill 0.4s ease' }} />
                )))}
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, k) => (
                    <span key={k} className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${k < lit ? 'bg-orange-400' : 'bg-slate-700'}`} />
                ))}
            </div>
        </div>
    );
}
