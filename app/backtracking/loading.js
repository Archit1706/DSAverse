"use client";
import React, { useState, useEffect } from 'react';

const BacktrackingLoader = () => {
    const SIZE = 4;
    const [grid, setGrid] = useState(() => Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Backtracking...",
        "Exploring Search Space...",
        "Pruning Dead Ends...",
        "Placing Queens...",
        "Navigating the Maze..."
    ];

    useEffect(() => {
        let queens = [];
        let row = 0;
        const t = setInterval(() => {
            if (row < SIZE) {
                const col = Math.floor(Math.random() * SIZE);
                queens = [...queens, [row, col]];
                row++;
            } else {
                queens = [];
                row = 0;
            }
            setGrid(Array(SIZE).fill(null).map((_, r) =>
                Array(SIZE).fill(null).map((_, c) =>
                    queens.some(([qr, qc]) => qr === r && qc === c) ? 'Q'
                    : queens.some(([qr, qc]) => qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c)) ? 'x'
                    : null
                )
            ));
        }, 350);
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
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Backtracking</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{ animation: 'btProgress 2s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        N-Queens Board
                    </p>
                    <div className="grid grid-cols-4 gap-1 max-w-[160px] mx-auto">
                        {grid.map((row, ri) =>
                            row.map((cell, ci) => (
                                <div key={`${ri}-${ci}`}
                                    className={`w-9 h-9 rounded flex items-center justify-center text-sm font-bold border transition-all duration-300 ${
                                        cell === 'Q' ? 'bg-indigo-500 border-indigo-400 text-white scale-105'
                                        : cell === 'x' ? 'bg-red-900/40 border-red-800 text-red-500 text-xs'
                                        : (ri + ci) % 2 === 0 ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-800/60 border-slate-700'
                                    }`}>
                                    {cell === 'Q' ? '♛' : cell === 'x' ? '×' : ''}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-indigo-500/60"
                            style={{ animation: `btBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes btProgress {
                    0% { width: 10%; }
                    50% { width: 85%; }
                    100% { width: 45%; }
                }
                @keyframes btBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default BacktrackingLoader;
