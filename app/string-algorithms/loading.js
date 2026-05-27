"use client";
import React, { useState, useEffect } from 'react';

const StringLoader = () => {
    const [matchPos, setMatchPos] = useState(0);
    const [currentMsg, setCurrentMsg] = useState(0);
    const text = "ABABCABAB";
    const pattern = "ABAB";

    const messages = [
        "Loading String Algorithms...",
        "Building Failure Function...",
        "Computing Rolling Hash...",
        "Constructing Z-Array...",
        "Matching Patterns..."
    ];

    useEffect(() => {
        const t = setInterval(() => {
            setMatchPos(p => (p + 1) % (text.length - pattern.length + 2));
        }, 400);
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
                        <div className="w-10 h-10 bg-gradient-to-r from-fuchsia-600 to-pink-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">String Algorithms</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full"
                            style={{ animation: 'strProgress 2s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 text-center">
                        Pattern Matching
                    </p>
                    <div className="flex gap-1 justify-center mb-3">
                        {text.split('').map((ch, i) => {
                            const inWindow = i >= matchPos && i < matchPos + pattern.length;
                            const matches = inWindow && ch === pattern[i - matchPos];
                            return (
                                <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold border transition-all duration-300 ${
                                    matches ? 'bg-fuchsia-500 border-fuchsia-400 text-white scale-105'
                                    : inWindow ? 'bg-pink-900/50 border-pink-700 text-pink-300'
                                    : 'bg-slate-700/50 border-slate-700 text-slate-400'
                                }`}>{ch}</div>
                            );
                        })}
                    </div>
                    <div className="flex gap-1 justify-center">
                        {Array.from({ length: text.length }, (_, i) => {
                            const inWindow = i >= matchPos && i < matchPos + pattern.length;
                            return (
                                <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold border transition-all duration-300 ${
                                    inWindow ? 'bg-slate-600 border-slate-500 text-slate-200' : 'opacity-0'
                                }`}>{inWindow ? pattern[i - matchPos] : ''}</div>
                            );
                        })}
                    </div>
                    <p className="text-center text-xs text-slate-600 mt-2">text / pattern</p>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-fuchsia-500/60"
                            style={{ animation: `strBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes strProgress {
                    0% { width: 10%; }
                    50% { width: 85%; }
                    100% { width: 45%; }
                }
                @keyframes strBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default StringLoader;
