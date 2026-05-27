"use client";
import React, { useState, useEffect } from 'react';

const BasicsLoader = () => {
    const [array, setArray] = useState([12, 5, 8, 3, 17, 9]);
    const [activeIdx, setActiveIdx] = useState(null);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Data Structures...",
        "Preparing Arrays & Lists...",
        "Configuring Stacks & Queues...",
        "Setting up Linked Lists...",
        "Initializing Basics..."
    ];

    useEffect(() => {
        const t = setInterval(() => {
            const i = Math.floor(Math.random() * array.length);
            setActiveIdx(i);
            setTimeout(() => setActiveIdx(null), 400);
        }, 700);
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
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Basics & Data Structures</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            style={{ animation: 'basicsProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        Array Access
                    </p>
                    <div className="flex justify-center gap-1">
                        {array.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-mono font-bold border transition-all duration-300 ${
                                    activeIdx === i
                                        ? 'bg-blue-500 border-blue-400 text-white scale-110'
                                        : 'bg-slate-700 border-slate-600 text-slate-200'
                                }`}>
                                    {val}
                                </div>
                                <span className="text-xs text-slate-600">{i}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-slate-600">
                        <span>array[0..{array.length - 1}]</span>
                        <span className="text-blue-500/70">
                            {activeIdx !== null ? `accessing [${activeIdx}]` : 'indexed access'}
                        </span>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    {['Array', 'Stack', 'Queue'].map((ds, i) => (
                        <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-2 text-center">
                            <p className="text-xs text-slate-500">{ds}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-blue-500/60"
                            style={{ animation: `basicsBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes basicsProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes basicsBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default BasicsLoader;
