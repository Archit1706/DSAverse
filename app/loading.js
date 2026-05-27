"use client";
import React, { useState, useEffect } from 'react';

const DSALoader = () => {
    const [sortingBars, setSortingBars] = useState([40, 70, 30, 90, 50, 80, 60]);
    const [activeTreeNodes, setActiveTreeNodes] = useState(new Set());
    const [graphNodes, setGraphNodes] = useState([]);
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Initializing Sorting Algorithms...",
        "Loading Graph Traversal...",
        "Preparing Binary Trees...",
        "Setting up Dynamic Programming...",
        "Configuring Data Structures...",
        "Optimizing Visualizations..."
    ];

    useEffect(() => {
        const t = setInterval(() => {
            setSortingBars(prev => {
                const next = [...prev];
                const i = Math.floor(Math.random() * next.length);
                const j = Math.floor(Math.random() * next.length);
                [next[i], next[j]] = [next[j], next[i]];
                return next;
            });
        }, 800);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setInterval(() => {
            setActiveTreeNodes(() => {
                const s = new Set();
                const n = Math.floor(Math.random() * 7);
                s.add(n);
                if (n > 0) s.add(Math.floor((n - 1) / 2));
                if (n * 2 + 1 < 7) s.add(n * 2 + 1);
                if (n * 2 + 2 < 7) s.add(n * 2 + 2);
                return s;
            });
        }, 1200);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setInterval(() => {
            setGraphNodes(Array.from({ length: 6 }, (_, i) => ({
                id: i,
                active: Math.random() > 0.5,
            })));
        }, 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setCurrentMsg(p => (p + 1) % messages.length), 1500);
        return () => clearInterval(t);
    }, []);

    const treePos = [
        { x: 50, y: 15 },
        { x: 25, y: 38 },
        { x: 75, y: 38 },
        { x: 12, y: 62 },
        { x: 38, y: 62 },
        { x: 62, y: 62 },
        { x: 88, y: 62 },
    ];

    const graphPos = Array.from({ length: 6 }, (_, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        return { x: 50 + 36 * Math.cos(angle), y: 50 + 36 * Math.sin(angle) };
    });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 max-w-3xl w-full shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                            DSAverse
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                            style={{ animation: 'dsaProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Sorting</p>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 h-28 flex items-end justify-center gap-1">
                            {sortingBars.map((h, i) => (
                                <div key={i}
                                    className="w-5 bg-gradient-to-t from-orange-500 to-amber-400 rounded-t transition-all duration-700 ease-in-out"
                                    style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Trees</p>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 h-28">
                            <svg className="w-full h-full" viewBox="0 0 100 80">
                                {[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].map(([p, c], i) => (
                                    <line key={i}
                                        x1={treePos[p].x} y1={treePos[p].y}
                                        x2={treePos[c].x} y2={treePos[c].y}
                                        stroke="#334155" strokeWidth="1.5" />
                                ))}
                                {treePos.map((pos, i) => (
                                    <circle key={i} cx={pos.x} cy={pos.y} r="5"
                                        className="transition-all duration-500"
                                        fill={activeTreeNodes.has(i) ? '#f97316' : '#334155'} />
                                ))}
                            </svg>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Graphs</p>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 h-28">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                {graphPos.map((pos, i) => {
                                    const next = graphPos[(i + 1) % 6];
                                    return <line key={i} x1={pos.x} y1={pos.y} x2={next.x} y2={next.y} stroke="#334155" strokeWidth="1.5" />;
                                })}
                                {graphPos.map((pos, i) => i < 3 && (
                                    <line key={`x${i}`} x1={pos.x} y1={pos.y} x2={graphPos[i+3].x} y2={graphPos[i+3].y} stroke="#1e293b" strokeWidth="1" />
                                ))}
                                {graphPos.map((pos, i) => (
                                    <circle key={i} cx={pos.x} cy={pos.y} r="5"
                                        className="transition-all duration-700"
                                        fill={graphNodes[i]?.active ? '#06b6d4' : '#334155'} />
                                ))}
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-orange-500/60"
                            style={{ animation: `dsaBounce 1.2s ease-in-out ${i * 0.12}s infinite alternate` }} />
                    ))}
                </div>

                <p className="text-center text-xs text-slate-600 mt-4">
                    Preparing interactive visualizations...
                </p>
            </div>

            <style jsx>{`
                @keyframes dsaProgress {
                    0% { width: 15%; }
                    50% { width: 82%; }
                    100% { width: 55%; }
                }
                @keyframes dsaBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default DSALoader;
