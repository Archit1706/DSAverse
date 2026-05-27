"use client";
import React, { useState, useEffect } from 'react';

const RecursionLoader = () => {
    const [activeNodes, setActiveNodes] = useState(new Set([0]));
    const [callDepth, setCallDepth] = useState(1);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Recursion Visualizer...",
        "Preparing Call Stack...",
        "Building Recursion Trees...",
        "Configuring Backtracking...",
        "Setting up Base Cases..."
    ];

    const treePos = [
        { x: 50, y: 10 },
        { x: 25, y: 32 },
        { x: 75, y: 32 },
        { x: 12, y: 55 },
        { x: 38, y: 55 },
        { x: 62, y: 55 },
        { x: 88, y: 55 },
    ];

    useEffect(() => {
        const levels = [[0], [1, 2], [3, 4, 5, 6]];
        let level = 0;
        const t = setInterval(() => {
            setActiveNodes(new Set(levels[level]));
            setCallDepth(level + 1);
            level = (level + 1) % levels.length;
        }, 1000);
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
                        <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Recursion</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                            style={{ animation: 'recProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Recursion Tree
                        </p>
                        <span className="text-xs text-green-500/70">depth: {callDepth}</span>
                    </div>
                    <svg className="w-full" viewBox="0 0 100 70" height="110">
                        {[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].map(([p, c], i) => (
                            <line key={i}
                                x1={treePos[p].x} y1={treePos[p].y}
                                x2={treePos[c].x} y2={treePos[c].y}
                                stroke={activeNodes.has(p) && activeNodes.has(c) ? '#22c55e' : '#1e293b'}
                                strokeWidth="1.5"
                                className="transition-all duration-500" />
                        ))}
                        {treePos.map((pos, i) => (
                            <circle key={i} cx={pos.x} cy={pos.y} r="5"
                                fill={activeNodes.has(i) ? '#22c55e' : '#334155'}
                                className="transition-all duration-500" />
                        ))}
                    </svg>
                </div>

                <div className="mt-4 bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-mono text-center">
                        f(n) = f(n-1) + f(n-2)
                    </p>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-green-500/60"
                            style={{ animation: `recBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes recProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes recBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default RecursionLoader;
