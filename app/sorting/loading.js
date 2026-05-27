"use client";
import React, { useState, useEffect } from 'react';

const SortingLoader = () => {
    const [bars, setBars] = useState([45, 75, 25, 90, 55, 80, 35, 65]);
    const [comparing, setComparing] = useState([]);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Sorting Algorithms...",
        "Preparing Bubble Sort...",
        "Configuring Merge Sort...",
        "Initializing Quick Sort...",
        "Setting up Visualizations..."
    ];

    useEffect(() => {
        const t = setInterval(() => {
            const i = Math.floor(Math.random() * bars.length);
            const j = Math.floor(Math.random() * bars.length);
            setComparing([i, j]);
            setTimeout(() => {
                setBars(prev => {
                    const next = [...prev];
                    [next[i], next[j]] = [next[j], next[i]];
                    return next;
                });
                setComparing([]);
            }, 350);
        }, 900);
        return () => clearInterval(t);
    }, [bars.length]);

    useEffect(() => {
        const t = setInterval(() => setCurrentMsg(p => (p + 1) % messages.length), 1500);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-amber-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Sorting Algorithms</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                            style={{ animation: 'sortProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        Sorting Visualization
                    </p>
                    <div className="flex items-end justify-center gap-2 h-32">
                        {bars.map((h, i) => (
                            <div key={i}
                                className={`flex-1 rounded-t transition-all duration-500 ease-in-out ${
                                    comparing.includes(i)
                                        ? 'bg-yellow-400 scale-110'
                                        : 'bg-gradient-to-t from-orange-600 to-amber-500'
                                }`}
                                style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-slate-600">
                        <span>n = {bars.length} elements</span>
                        <span className="text-orange-500/70">comparing...</span>
                    </div>
                </div>

                <div className="mt-5 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-orange-500/60"
                            style={{ animation: `sortBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes sortProgress {
                    0% { width: 15%; }
                    50% { width: 82%; }
                    100% { width: 50%; }
                }
                @keyframes sortBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SortingLoader;
