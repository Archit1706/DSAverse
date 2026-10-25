"use client";
import { useEffect, useState } from 'react';

/* Four arrows laid tip to tail one at a time, then their sum drawn straight
   from the start to the finish — vector addition, the idea every page in this
   section builds on. */
const ARROWS = [[60, -20], [50, 40], [-30, 45], [70, 10]];
const START = [40, 150];

export default function VectorsLoading() {
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(v => (v >= ARROWS.length + 2 ? 0 : v + 1));
        }, 380);
        return () => clearInterval(id);
    }, []);

    const tips = [START];
    for (const [dx, dy] of ARROWS) {
        const [x, y] = tips[tips.length - 1];
        tips.push([x + dx, y - dy]);
    }
    const end = tips[tips.length - 1];
    const showSum = visible > ARROWS.length;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl px-8 py-6 text-center shadow-xl">
                <p className="text-sky-100 text-sm font-semibold tracking-widest uppercase mb-1">Vectors</p>
                <p className="text-white text-2xl font-bold">Adding up the arrows…</p>
            </div>

            <svg viewBox="0 0 300 200" width="300" className="overflow-visible">
                {ARROWS.map((_, i) => {
                    const [x1, y1] = tips[i];
                    const [x2, y2] = tips[i + 1];
                    const shown = i < visible;
                    const isNew = i === visible - 1;
                    return (
                        <g key={i} style={{ transition: 'opacity 0.3s ease', opacity: shown ? 1 : 0 }}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={isNew ? '#38bdf8' : '#0369a1'} strokeWidth="4" strokeLinecap="round" />
                            <circle cx={x2} cy={y2} r="5" fill={isNew ? '#7dd3fc' : '#0ea5e9'} />
                        </g>
                    );
                })}
                <circle cx={START[0]} cy={START[1]} r="5" fill="#64748b" />
                <line x1={START[0]} y1={START[1]} x2={end[0]} y2={end[1]}
                    stroke="#f472b6" strokeWidth="3" strokeDasharray="7 5" strokeLinecap="round"
                    style={{ transition: 'opacity 0.3s ease', opacity: showSum ? 1 : 0 }} />
            </svg>

            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-sky-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}
