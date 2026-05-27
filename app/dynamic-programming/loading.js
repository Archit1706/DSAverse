"use client";
import React, { useState, useEffect } from 'react';

const DPLoader = () => {
    const [grid, setGrid] = useState(() => Array(3).fill(null).map(() => Array(5).fill(false)));
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Dynamic Programming...",
        "Building Memoization Tables...",
        "Configuring State Transitions...",
        "Preparing DP Visualizations...",
        "Optimizing Subproblems..."
    ];

    useEffect(() => {
        let row = 0;
        let col = 0;
        const t = setInterval(() => {
            setGrid(prev => {
                const next = prev.map(r => [...r]);
                next[row][col] = true;
                return next;
            });
            col++;
            if (col >= 5) { col = 0; row++; }
            if (row >= 3) {
                row = 0;
                col = 0;
                setGrid(Array(3).fill(null).map(() => Array(5).fill(false)));
            }
        }, 300);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setCurrentMsg(p => (p + 1) % messages.length), 1500);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-rose-600 to-pink-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Dynamic Programming</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                            style={{ animation: 'dpProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        DP Table Filling
                    </p>
                    <div className="space-y-1.5">
                        {grid.map((row, ri) => (
                            <div key={ri} className="flex gap-1.5 justify-center">
                                {row.map((filled, ci) => (
                                    <div key={ci}
                                        className={`w-10 h-8 rounded flex items-center justify-center text-xs font-mono font-bold border transition-all duration-300 ${
                                            filled
                                                ? 'bg-rose-500 border-rose-400 text-white scale-105'
                                                : 'bg-slate-700/50 border-slate-700 text-slate-600'
                                        }`}>
                                        {filled ? `f${ri * 5 + ci}` : '?'}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-slate-600">
                        <span>subproblems</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-rose-500/70">O(2^n)</span>
                            <span>→</span>
                            <span className="text-xs text-green-500/70">O(n)</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-rose-500/60"
                            style={{ animation: `dpBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes dpProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes dpBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default DPLoader;
