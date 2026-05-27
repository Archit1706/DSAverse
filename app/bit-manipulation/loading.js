"use client";
import React, { useState, useEffect } from 'react';

const BitLoader = () => {
    const [bits, setBits] = useState(() => Array(16).fill(0));
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Bit Manipulation...",
        "Flipping Bits...",
        "Computing XOR Operations...",
        "Counting Set Bits...",
        "Checking Powers of Two..."
    ];

    useEffect(() => {
        const t = setInterval(() => {
            setBits(prev => {
                const next = [...prev];
                const idx = Math.floor(Math.random() * 16);
                next[idx] = next[idx] === 0 ? 1 : 0;
                return next;
            });
        }, 200);
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
                        <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-cyan-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Bit Manipulation</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                            style={{ animation: 'bitProgress 2s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        Binary Register
                    </p>
                    <div className="grid grid-cols-8 gap-1.5">
                        {bits.map((bit, i) => (
                            <div key={i}
                                className={`h-8 rounded flex items-center justify-center text-xs font-mono font-bold border transition-all duration-150 ${
                                    bit === 1
                                        ? 'bg-teal-500 border-teal-400 text-white scale-105'
                                        : 'bg-slate-700/50 border-slate-700 text-slate-500'
                                }`}>
                                {bit}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-slate-600">
                        <span>bit 15</span>
                        <span>bit 0</span>
                    </div>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-teal-500/60"
                            style={{ animation: `bitBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes bitProgress {
                    0% { width: 10%; }
                    50% { width: 85%; }
                    100% { width: 45%; }
                }
                @keyframes bitBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default BitLoader;
