"use client";
import React, { useState, useEffect } from 'react';

const DSALoader = () => {
    const [sortingBars, setSortingBars] = useState([40, 70, 30, 90, 50, 80, 60]);
    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);

    const algorithms = [
        "Initializing Sorting Algorithms...",
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

    // Algorithm text cycling
    useEffect(() => {
        const textInterval = setInterval(() => {
            setCurrentAlgorithm(prev => (prev + 1) % algorithms.length);
        }, 1500);

        return () => clearInterval(textInterval);
    }, []);


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
        
        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
      `}</style>
            </div>
        </div>
    );
};

export default DSALoader;