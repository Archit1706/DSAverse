"use client";
import React, { useState, useEffect } from 'react';

const TwoPointersLoader = () => {
    const [array] = useState([2, 7, 11, 15, 1, 8, 3, 9, 4, 6]);
    const [left, setLeft] = useState(0);
    const [right, setRight] = useState(9);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Two Pointers...",
        "Preparing Sliding Window...",
        "Configuring Pointer Techniques...",
        "Setting up Visualizations...",
        "Initializing Window Patterns..."
    ];

    useEffect(() => {
        let l = 0;
        let r = 9;
        const t = setInterval(() => {
            const sum = array[l] + array[r];
            const target = 10;
            if (sum < target) { l = Math.min(l + 1, r - 1); }
            else if (sum > target) { r = Math.max(r - 1, l + 1); }
            else { l = 0; r = array.length - 1; }
            setLeft(l);
            setRight(r);
        }, 600);
        return () => clearInterval(t);
    }, [array]);

    useEffect(() => {
        const t = setInterval(() => setCurrentMsg(p => (p + 1) % messages.length), 1500);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-purple-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Two Pointers & Sliding Window</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                            style={{ animation: 'tpProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Two Sum Pattern
                        </p>
                        <span className="text-xs text-violet-500/70">
                            {array[left]} + {array[right]} = {array[left] + array[right]}
                        </span>
                    </div>
                    <div className="flex justify-center gap-1 flex-wrap">
                        {array.map((val, i) => (
                            <div key={i}
                                className={`w-8 h-8 flex items-center justify-center rounded text-xs font-mono font-bold border transition-all duration-400 ${
                                    i === left
                                        ? 'bg-blue-500 border-blue-400 text-white scale-110'
                                        : i === right
                                            ? 'bg-orange-500 border-orange-400 text-white scale-110'
                                            : i > left && i < right
                                                ? 'bg-violet-800/50 border-violet-700 text-slate-300'
                                                : 'bg-slate-700 border-slate-600 text-slate-400'
                                }`}>
                                {val}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-3 text-xs">
                        <span className="text-blue-400/70">L={left}</span>
                        <span className="text-slate-600">target: 10</span>
                        <span className="text-orange-400/70">R={right}</span>
                    </div>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-violet-500/60"
                            style={{ animation: `tpBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes tpProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes tpBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default TwoPointersLoader;
