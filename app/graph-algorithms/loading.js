"use client";
import React, { useState, useEffect } from 'react';

const GraphLoader = () => {
    const [visited, setVisited] = useState(new Set());
    const [currentMsg, setCurrentMsg] = useState(0);

    const messages = [
        "Loading Graph Algorithms...",
        "Preparing BFS Traversal...",
        "Configuring Dijkstra's...",
        "Setting up DFS...",
        "Building Graph Visualizer..."
    ];

    const nodes = Array.from({ length: 7 }, (_, i) => {
        const angle = (i * (360 / 7) - 90) * (Math.PI / 180);
        return { x: 50 + 38 * Math.cos(angle), y: 50 + 38 * Math.sin(angle) };
    });

    const edges = [[0,1],[0,2],[1,3],[2,3],[3,4],[4,5],[5,6],[6,0],[1,4],[2,5]];

    useEffect(() => {
        const order = [0, 1, 2, 3, 4, 5, 6];
        let i = 0;
        const t = setInterval(() => {
            if (i < order.length) {
                setVisited(prev => new Set([...prev, order[i]]));
                i++;
            } else {
                i = 0;
                setVisited(new Set());
            }
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
                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 to-sky-700 rounded-lg flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/80 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                            <p className="text-xs text-slate-500">Graph Algorithms</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm h-5">{messages[currentMsg]}</p>
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 rounded-full"
                            style={{ animation: 'graphProgress 2.5s ease-in-out infinite' }} />
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            BFS Traversal
                        </p>
                        <span className="text-xs text-cyan-500/70">visited: {visited.size} / 7</span>
                    </div>
                    <svg className="w-full" viewBox="0 0 100 100" height="140">
                        {edges.map(([a, b], i) => (
                            <line key={i}
                                x1={nodes[a].x} y1={nodes[a].y}
                                x2={nodes[b].x} y2={nodes[b].y}
                                stroke={visited.has(a) && visited.has(b) ? '#0891b2' : '#1e293b'}
                                strokeWidth="1.5"
                                className="transition-all duration-300" />
                        ))}
                        {nodes.map((pos, i) => (
                            <circle key={i} cx={pos.x} cy={pos.y} r="6"
                                fill={visited.has(i) ? '#06b6d4' : '#334155'}
                                className="transition-all duration-400" />
                        ))}
                        {nodes.map((pos, i) => (
                            <text key={i} x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                                fill={visited.has(i) ? '#0f172a' : '#94a3b8'}
                                fontSize="4" fontWeight="bold">{i}</text>
                        ))}
                    </svg>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-cyan-500/60"
                            style={{ animation: `graphBounce 1.2s ease-in-out ${i * 0.15}s infinite alternate` }} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes graphProgress {
                    0% { width: 15%; }
                    50% { width: 80%; }
                    100% { width: 52%; }
                }
                @keyframes graphBounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default GraphLoader;
