"use client";
import React, { useState, useEffect } from 'react';

const HeapDataStructuresLoader = () => {
    const [heapArray, setHeapArray] = useState([90, 70, 80, 40, 50, 60, 30]);
    const [activeNodes, setActiveNodes] = useState(new Set());
    const [binomialTrees, setBinomialTrees] = useState([]);
    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);

    const algorithms = [
        "Loading Binary Heaps...",
        "Initializing Binomial Queues...",
        "Preparing Fibonacci Heaps...",
        "Setting up Leftist Heaps...",
        "Configuring Skew Heaps...",
        "Optimizing Priority Queues..."
    ];

    // Heap animation - simulate heapify
    useEffect(() => {
        const heapInterval = setInterval(() => {
            setHeapArray(prev => {
                const newHeap = [...prev];
                const randomIndex = Math.floor(Math.random() * newHeap.length);
                const parentIndex = Math.floor((randomIndex - 1) / 2);

                if (parentIndex >= 0 && randomIndex > 0) {
                    // Swap for visual effect
                    [newHeap[randomIndex], newHeap[parentIndex]] = [newHeap[parentIndex], newHeap[randomIndex]];
                }
                return newHeap;
            });
        }, 1200);

        return () => clearInterval(heapInterval);
    }, []);

    // Heap tree traversal animation
    useEffect(() => {
        const traversalInterval = setInterval(() => {
            setActiveNodes(prev => {
                const newSet = new Set();
                const nodeCount = 7;
                const randomNode = Math.floor(Math.random() * nodeCount);

                newSet.add(randomNode);
                // Add path from root
                let current = randomNode;
                while (current > 0) {
                    const parent = Math.floor((current - 1) / 2);
                    newSet.add(parent);
                    current = parent;
                }

                return newSet;
            });
        }, 1000);

        return () => clearInterval(traversalInterval);
    }, []);

    // Binomial tree animation
    useEffect(() => {
        const binomialInterval = setInterval(() => {
            setBinomialTrees(prev => {
                const treeCount = 3;
                return Array.from({ length: treeCount }, (_, i) => ({
                    id: i,
                    rank: i,
                    active: Math.random() > 0.5,
                    merging: Math.random() > 0.7
                }));
            });
        }, 1500);

        return () => clearInterval(binomialInterval);
    }, []);

    // Algorithm text cycling
    useEffect(() => {
        const textInterval = setInterval(() => {
            setCurrentAlgorithm(prev => (prev + 1) % algorithms.length);
        }, 1800);

        return () => clearInterval(textInterval);
    }, []);

    // Heap tree node positions (level-order)
    const heapNodePositions = [
        { x: 50, y: 15 },  // Root
        { x: 25, y: 35 },  // Left child
        { x: 75, y: 35 },  // Right child
        { x: 12.5, y: 55 }, // Left-left
        { x: 37.5, y: 55 }, // Left-right
        { x: 62.5, y: 55 }, // Right-left
        { x: 87.5, y: 55 }  // Right-right
    ];

    // Binomial tree visualization
    const renderBinomialTree = (rank, x, y, active) => {
        const nodeRadius = 3;
        const levelSpacing = 8;
        const nodes = [];

        // Create nodes for B_rank tree
        for (let level = 0; level <= rank; level++) {
            for (let pos = 0; pos < Math.pow(2, level); pos++) {
                nodes.push({
                    x: x + (pos - Math.pow(2, level) / 2) * 6,
                    y: y + level * levelSpacing
                });
            }
        }

        return nodes;
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-8">
            {/* Main Loading Container */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-4">
                            <div className="w-6 h-6 border-2 border-white rounded animate-spin border-t-transparent"></div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                            DSAverse
                        </h1>
                    </div>

                    <div className="h-8 mb-6">
                        <p className="text-lg text-gray-600 animate-pulse transition-all duration-500">
                            {algorithms[currentAlgorithm]}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full animate-pulse"
                            style={{ width: '70%', animation: 'progress 3s ease-in-out infinite' }}></div>
                    </div>
                </div>

                {/* Animation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Binary Heap Animation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Binary Heap</h3>
                        <div className="bg-amber-50 rounded-lg p-4 h-32 relative">
                            <svg className="w-full h-full" viewBox="0 0 100 70">
                                {/* Heap edges */}
                                {[
                                    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]
                                ].map(([parent, child], index) => (
                                    <line
                                        key={index}
                                        x1={heapNodePositions[parent].x}
                                        y1={heapNodePositions[parent].y}
                                        x2={heapNodePositions[child].x}
                                        y2={heapNodePositions[child].y}
                                        stroke="#f59e0b"
                                        strokeWidth="1.5"
                                        opacity="0.6"
                                    />
                                ))}

                                {/* Heap nodes */}
                                {heapNodePositions.map((pos, index) => (
                                    <g key={index}>
                                        <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r="4"
                                            className={`transition-all duration-500 ${activeNodes.has(index)
                                                    ? 'fill-amber-600 animate-pulse'
                                                    : 'fill-amber-400'
                                                }`}
                                        />
                                        <text
                                            x={pos.x}
                                            y={pos.y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="text-xs fill-white font-bold"
                                        >
                                            {heapArray[index]}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        </div>
                    </div>

                    {/* Binomial Trees Animation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Binomial Queue</h3>
                        <div className="bg-amber-50 rounded-lg p-4 h-32 relative">
                            <svg className="w-full h-full" viewBox="0 0 100 70">
                                {/* Render multiple binomial trees */}
                                {binomialTrees.map((tree, treeIdx) => {
                                    const baseX = 20 + treeIdx * 30;
                                    const baseY = 20;
                                    const nodes = renderBinomialTree(tree.rank, baseX, baseY, tree.active);

                                    return (
                                        <g key={tree.id}>
                                            {/* Tree label */}
                                            <text
                                                x={baseX}
                                                y={baseY - 5}
                                                textAnchor="middle"
                                                className="text-xs fill-amber-700 font-bold"
                                            >
                                                B{tree.rank}
                                            </text>

                                            {/* Tree nodes */}
                                            {nodes.map((node, nodeIdx) => (
                                                <circle
                                                    key={nodeIdx}
                                                    cx={node.x}
                                                    cy={node.y}
                                                    r="2"
                                                    className={`transition-all duration-700 ${tree.active
                                                            ? 'fill-amber-600 animate-pulse'
                                                            : 'fill-amber-400'
                                                        }`}
                                                />
                                            ))}

                                            {/* Merging indicator */}
                                            {tree.merging && (
                                                <circle
                                                    cx={baseX}
                                                    cy={baseY + 30}
                                                    r="8"
                                                    className="fill-orange-500 animate-ping"
                                                    opacity="0.6"
                                                />
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* Priority Queue Operation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Queue</h3>
                        <div className="bg-amber-50 rounded-lg p-4 h-32">
                            <div className="flex flex-col items-center justify-center h-full space-y-2">
                                {/* Priority levels */}
                                {[
                                    { priority: 1, label: "High", color: "bg-red-500" },
                                    { priority: 2, label: "Med", color: "bg-amber-500" },
                                    { priority: 3, label: "Low", color: "bg-green-500" }
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center w-full space-x-2">
                                        <div className={`w-3 h-3 ${item.color} rounded-full animate-pulse`}
                                            style={{ animationDelay: `${index * 0.2}s` }}></div>
                                        <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                                                style={{
                                                    width: `${60 + Math.sin(Date.now() / 1000 + index) * 20}%`,
                                                    animation: 'slide 2s ease-in-out infinite'
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-600 w-8">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Heap Property Visualization */}
                <div className="mt-8 text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <div className="text-sm text-gray-600 bg-amber-100 px-3 py-1 rounded-full">
                            Parent ≥ Children
                        </div>
                        <div className="flex space-x-1">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                                    style={{
                                        animation: `bounce 1.5s ease-in-out ${index * 0.1}s infinite alternate`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Text */}
                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        Preparing heap visualizations for optimal learning experience...
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes progress {
                    0% { width: 20%; }
                    50% { width: 80%; }
                    100% { width: 70%; }
                }
                
                @keyframes bounce {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-8px); }
                }
                
                @keyframes slide {
                    0%, 100% { width: 50%; }
                    50% { width: 85%; }
                }
            `}</style>
        </div>
    );
};

export default HeapDataStructuresLoader;