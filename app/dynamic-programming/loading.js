"use client";
import React, { useState, useEffect } from 'react';

const DPLoader = () => {
    const [dpValues, setDpValues] = useState([1, 1, 2, 3, 5, 8, 13]);
    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);
    const [memoTable, setMemoTable] = useState([false, false, false, false, false]);

    const algorithms = [
        "Initializing Dynamic Programming...",
        "Loading Memoization Tables...",
        "Configuring State Transitions...",
        "Optimizing Subproblem Solutions..."
    ];

    // Fibonacci-like animation
    useEffect(() => {
        const fibInterval = setInterval(() => {
            setDpValues(prev => {
                const newValues = [...prev];
                // Simulate DP table updates
                const randomIndex = Math.floor(Math.random() * newValues.length);
                newValues[randomIndex] = Math.floor(Math.random() * 20) + 1;
                return newValues;
            });
        }, 1000);

        return () => clearInterval(fibInterval);
    }, []);

    // Memoization animation
    useEffect(() => {
        const memoInterval = setInterval(() => {
            setMemoTable(prev => {
                const newTable = [...prev];
                const randomIndex = Math.floor(Math.random() * newTable.length);
                newTable[randomIndex] = !newTable[randomIndex];
                return newTable;
            });
        }, 600);

        return () => clearInterval(memoInterval);
    }, []);

    // Algorithm text cycling
    useEffect(() => {
        const textInterval = setInterval(() => {
            setCurrentAlgorithm(prev => (prev + 1) % algorithms.length);
        }, 1500);

        return () => clearInterval(textInterval);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-8">
            {/* Main Loading Container */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                            <div className="w-6 h-6 border-2 border-white rounded animate-spin border-t-transparent"></div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
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
                        <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full animate-pulse"
                            style={{ width: '75%', animation: 'progress 3s ease-in-out infinite' }}></div>
                    </div>
                </div>

                {/* Animation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* DP Table Animation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">DP Table</h3>
                        <div className="bg-rose-50 rounded-lg p-4 h-32">
                            <div className="grid grid-cols-4 gap-2 h-full">
                                {dpValues.map((value, index) => (
                                    <div
                                        key={index}
                                        className="bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded flex items-center justify-center font-bold text-sm transition-all duration-700 ease-in-out transform hover:scale-105"
                                        style={{
                                            animationDelay: `${index * 0.1}s`,
                                            animation: `fadeInScale 1s ease-in-out ${index * 0.1}s infinite alternate`
                                        }}
                                    >
                                        {value}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Memoization Animation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Memoization</h3>
                        <div className="bg-rose-50 rounded-lg p-4 h-32 flex flex-col justify-center">
                            <div className="space-y-2">
                                {memoTable.map((computed, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">f({index})</span>
                                        <div className={`w-4 h-4 rounded-full transition-all duration-500 ${computed ? 'bg-green-500 shadow-lg' : 'bg-gray-300'
                                            }`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* State Transition Animation */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">State Transitions</h3>
                        <div className="bg-rose-50 rounded-lg p-4 h-32 flex items-center justify-center">
                            <div className="flex space-x-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
                                        style={{
                                            animation: `bounce 1.5s ease-in-out ${index * 0.2}s infinite alternate`
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-8">
                    {/* Optimization Visualization */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center items-center space-x-4">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Without DP</div>
                                <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-mono">
                                    O(2^n)
                                </div>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-red-300 via-yellow-300 to-green-300"></div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">With DP</div>
                                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-mono">
                                    O(n)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Text */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Preparing interactive dynamic programming visualizations for optimal learning...
                        </p>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes progress {
                        0% { width: 20%; }
                        50% { width: 85%; }
                        100% { width: 75%; }
                    }
                    
                    @keyframes bounce {
                        0% { transform: translateY(0); }
                        100% { transform: translateY(-10px); }
                    }

                    @keyframes fadeInScale {
                        0% { transform: scale(1); opacity: 0.7; }
                        100% { transform: scale(1.05); opacity: 1; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default DPLoader;