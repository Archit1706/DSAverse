"use client";
import React, { useState, useEffect } from 'react';

const SearchingLoader = () => {
    const [array] = useState([3, 9, 14, 21, 28, 35, 47, 56, 63, 72]);
    const [pointer, setPointer] = useState(0);
    const [found, setFound] = useState(false);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Searching Algorithms...",
        "Preparing Binary Search...",
        "Configuring Linear Search...",
        "Setting up Visualizations...",
        "Initializing Search Patterns..."
    ];

    useEffect(() => {
        const t = setInterval(() => {
            setPointer(p => {
                if (p >= array.length - 1) {
                    setFound(false);
                    return 0;
                }
                if (Math.random() > 0.6) {
                    setFound(true);
                    setTimeout(() => setFound(false), 600);
                    return 0;
                }
                return p + 1;
            });
        }, 500);
        return () => clearInterval(t);
    }, [array.length]);

    useEffect(() => {
        const t = setInterval(() => setCurrentMsg(p => (p + 1) % messages.length), 1500);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Searching Algorithms</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
                            style={{ animation: 'searchProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        Search Visualization
                    </p>
                    <div className="flex justify-center gap-1.5 flex-wrap">
                        {array.map((val, i) => (
                            <div key={i}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-mono font-bold border transition-all duration-300 ${
                                    found && i === pointer
                                        ? 'bg-green-500 border-green-400 text-white scale-110'
                                        : i === pointer
                                            ? 'bg-red-500 border-red-400 text-white scale-110'
                                            : i < pointer
                                                ? 'bg-slate-800 border-slate-700 text-slate-600'
                                                : 'bg-slate-700 border-slate-600 text-slate-200'
                                }`}>
                                {val}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-slate-600">
                        <span>sorted array</span>
                        <span className="text-red-500/70">
                            {found ? 'found!' : `index ${pointer}`}
                        </span>
                    </div>
                </div>

                <div className="mt-5 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-red-500/60"
                            style={{ animation: `searchBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes searchProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes searchBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SearchingLoader;
