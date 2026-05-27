"use client";
import React, { useState, useEffect } from 'react';

const HeapLoader = () => {
    const [heap, setHeap] = useState([90, 72, 85, 41, 63, 51, 68]);
    const [activeNode, setActiveNode] = useState(null);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Heap Structures...",
        "Building Max Heap...",
        "Preparing Priority Queue...",
        "Configuring Heapify...",
        "Setting up Visualizations..."
    ];

    const treePos = [
        { x: 50, y: 12 },
        { x: 25, y: 35 },
        { x: 75, y: 35 },
        { x: 12, y: 58 },
        { x: 38, y: 58 },
        { x: 62, y: 58 },
        { x: 88, y: 58 },
    ];

    useEffect(() => {
        const t = setInterval(() => {
            const i = Math.floor(Math.random() * heap.length);
            setActiveNode(i);
            setTimeout(() => {
                setHeap(prev => {
                    const next = [...prev];
                    const parent = Math.floor((i - 1) / 2);
                    if (parent >= 0 && next[i] > next[parent]) {
                        [next[i], next[parent]] = [next[parent], next[i]];
                    }
                    return next;
                });
                setActiveNode(null);
            }, 400);
        }, 900);
        return () => clearInterval(t);
    }, [heap.length]);

    useEffect(() => {
        const t = setInterval(() => setCurrentMsg(p => (p + 1) % messages.length), 1500);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Heap-like Data Structures</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                            style={{ animation: 'heapProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Max Heap
                        </p>
                        <span className="text-xs text-amber-500/70">root: {heap[0]}</span>
                    </div>
                    <svg className="w-full" viewBox="0 0 100 72" height="120">
                        {[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].map(([p, c], i) => (
                            <line key={i}
                                x1={treePos[p].x} y1={treePos[p].y}
                                x2={treePos[c].x} y2={treePos[c].y}
                                stroke={activeNode === p || activeNode === c ? '#f59e0b' : '#1e293b'}
                                strokeWidth="1.5"
                                className="transition-all duration-300" />
                        ))}
                        {treePos.map((pos, i) => (
                            <circle key={i} cx={pos.x} cy={pos.y} r="7"
                                fill={activeNode === i ? '#f59e0b' : i === 0 ? '#d97706' : '#334155'}
                                className="transition-all duration-400" />
                        ))}
                        {heap.map((val, i) => (
                            <text key={i} x={treePos[i].x} y={treePos[i].y + 1}
                                textAnchor="middle" dominantBaseline="middle"
                                fill={activeNode === i || i === 0 ? '#0f172a' : '#94a3b8'}
                                fontSize="4" fontWeight="bold">{val}</text>
                        ))}
                    </svg>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-amber-500/60"
                            style={{ animation: `heapBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes heapProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes heapBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default HeapLoader;
