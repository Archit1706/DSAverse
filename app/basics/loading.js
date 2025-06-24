"use client";
import React, { useState, useEffect } from 'react';

const DSALoader = () => {
    const [sortingBars, setSortingBars] = useState([40, 70, 30, 90, 50, 80, 60]);
    const [activeTreeNodes, setActiveTreeNodes] = useState(new Set());
    const [graphNodes, setGraphNodes] = useState([]);
    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);

    const algorithms = [
        "Initializing Sorting Algorithms...",
        "Loading Graph Traversal...",
        "Preparing Binary Trees...",
        "Setting up Dynamic Programming...",
        "Configuring Data Structures...",
        "Optimizing Visualizations..."
    ];

    // Sorting animation
    useEffect(() => {
        const sortingInterval = setInterval(() => {
            setSortingBars(prev => {
                const newBars = [...prev];
                const randomIndex1 = Math.floor(Math.random() * newBars.length);
                const randomIndex2 = Math.floor(Math.random() * newBars.length);
                [newBars[randomIndex1], newBars[randomIndex2]] = [newBars[randomIndex2], newBars[randomIndex1]];
                return newBars;
            });
        }, 800);

        return () => clearInterval(sortingInterval);
    }, []);

    // Binary tree traversal animation
    useEffect(() => {
        const treeInterval = setInterval(() => {
            setActiveTreeNodes(prev => {
                const newSet = new Set();
                const nodeCount = 7; // Binary tree with 7 nodes
                const randomNode = Math.floor(Math.random() * nodeCount);

                // Add 2-3 connected nodes
                newSet.add(randomNode);
                if (randomNode > 0) newSet.add(Math.floor((randomNode - 1) / 2)); // Parent
                if (randomNode * 2 + 1 < nodeCount) newSet.add(randomNode * 2 + 1); // Left child
                if (randomNode * 2 + 2 < nodeCount) newSet.add(randomNode * 2 + 2); // Right child

                return newSet;
            });
        }, 1200);

        return () => clearInterval(treeInterval);
    }, []);

    // Graph nodes animation
    useEffect(() => {
        const graphInterval = setInterval(() => {
            setGraphNodes(prev => {
                const nodeCount = 6;
                return Array.from({ length: nodeCount }, (_, i) => ({
                    id: i,
                    active: Math.random() > 0.5,
                    connecting: Math.random() > 0.7
                }));
            });
        }, 1000);

        return () => clearInterval(graphInterval);
    }, []);

    // Algorithm text cycling
    useEffect(() => {
        const textInterval = setInterval(() => {
            setCurrentAlgorithm(prev => (prev + 1) % algorithms.length);
        }, 1500);

        return () => clearInterval(textInterval);
    }, []);

    // Binary tree node positions (level-order)
    const treeNodePositions = [
        { x: 50, y: 20 },  // Root
        { x: 25, y: 40 },  // Left child
        { x: 75, y: 40 },  // Right child
        { x: 12.5, y: 60 }, // Left-left
        { x: 37.5, y: 60 }, // Left-right
        { x: 62.5, y: 60 }, // Right-left
        { x: 87.5, y: 60 }  // Right-right
    ];

    // Graph node positions (circular layout)
    const graphNodePositions = Array.from({ length: 6 }, (_, i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const radius = 35;
        return {
            x: 50 + radius * Math.cos(angle),
            y: 50 + radius * Math.sin(angle)
        };
    });

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-8">
            {/* Main Loading Container */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mr-4">
                            <div className="w-6 h-6 border-2 border-white rounded animate-spin border-t-transparent"></div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            DSA Visualizer
                        </h1>
                    </div>

                    <div className="h-8 mb-6">
                        <p className="text-lg text-gray-600 animate-pulse transition-all duration-500">
                            {algorithms[currentAlgorithm]}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full animate-pulse"
                            style={{ width: '70%', animation: 'progress 3s ease-in-out infinite' }}></div>
                    </div>
                </div>

                {/* Animation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Sorting Animation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sorting Algorithm</h3>
                        <div className="bg-gray-50 rounded-lg p-4 h-32 flex items-end justify-center gap-1">
                            {sortingBars.map((height, index) => (
                                <div
                                    key={index}
                                    className="w-6 bg-gradient-to-t from-orange-500 to-amber-400 rounded-t transition-all duration-700 ease-in-out"
                                    style={{ height: `${height}%` }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Binary Tree Traversal */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Binary Tree</h3>
                        <div className="bg-gray-50 rounded-lg p-4 h-32 relative">
                            <svg className="w-full h-full" viewBox="0 0 100 80">
                                {/* Tree edges */}
                                {[
                                    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]
                                ].map(([parent, child], index) => (
                                    <line
                                        key={index}
                                        x1={treeNodePositions[parent].x}
                                        y1={treeNodePositions[parent].y}
                                        x2={treeNodePositions[child].x}
                                        y2={treeNodePositions[child].y}
                                        stroke="#d1d5db"
                                        strokeWidth="1"
                                    />
                                ))}

                                {/* Tree nodes */}
                                {treeNodePositions.map((pos, index) => (
                                    <circle
                                        key={index}
                                        cx={pos.x}
                                        cy={pos.y}
                                        r="4"
                                        className={`transition-all duration-500 ${activeTreeNodes.has(index)
                                            ? 'fill-orange-500 animate-pulse'
                                            : 'fill-gray-300'
                                            }`}
                                    />
                                ))}
                            </svg>
                        </div>
                    </div>

                    {/* Graph Traversal */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Graph Traversal</h3>
                        <div className="bg-gray-50 rounded-lg p-4 h-32 relative">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                {/* Graph edges */}
                                {graphNodePositions.map((pos, index) => {
                                    const nextIndex = (index + 1) % graphNodePositions.length;
                                    const nextPos = graphNodePositions[nextIndex];
                                    return (
                                        <line
                                            key={index}
                                            x1={pos.x}
                                            y1={pos.y}
                                            x2={nextPos.x}
                                            y2={nextPos.y}
                                            stroke="#d1d5db"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {/* Additional connecting lines for more complex graph */}
                                {graphNodePositions.map((pos, index) => {
                                    if (index < 3) {
                                        const oppositeIndex = index + 3;
                                        const oppositePos = graphNodePositions[oppositeIndex];
                                        return (
                                            <line
                                                key={`cross-${index}`}
                                                x1={pos.x}
                                                y1={pos.y}
                                                x2={oppositePos.x}
                                                y2={oppositePos.y}
                                                stroke="#d1d5db"
                                                strokeWidth="1"
                                                opacity="0.5"
                                            />
                                        );
                                    }
                                    return null;
                                })}

                                {/* Graph nodes */}
                                {graphNodePositions.map((pos, index) => (
                                    <circle
                                        key={index}
                                        cx={pos.x}
                                        cy={pos.y}
                                        r="4"
                                        className={`transition-all duration-700 ${graphNodes[index]?.active
                                            ? 'fill-cyan-500 animate-ping'
                                            : 'fill-gray-300'
                                            }`}
                                    />
                                ))}
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Algorithmic Pattern Animation */}
                <div className="mt-8 text-center">
                    <div className="flex justify-center items-center space-x-2">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={index}
                                className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                                style={{
                                    animation: `bounce 1.5s ease-in-out ${index * 0.1}s infinite alternate`
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer Text */}
                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        Preparing interactive visualizations for optimal learning experience...
                    </p>
                </div>
            </div>

            <style jsx>{`
        @keyframes progress {
          0% { width: 20%; }
          50% { width: 80%; }
          100% { width: 70%; }
        }
        
        @keyframes bounce {s
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
      `}</style>
        </div>
    );
};

export default DSALoader;