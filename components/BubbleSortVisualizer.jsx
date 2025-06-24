import React, { useState, useEffect } from 'react';

const BubbleSortVisualizer = () => {
    const [animationStep, setAnimationStep] = useState(0);
    const [sortingArray, setSortingArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [comparing, setComparing] = useState([]);
    const [sorted, setSorted] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep((prev) => (prev + 1) % 8);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const steps = [
            { array: [64, 34, 25, 12, 22, 11, 90], comparing: [0, 1], sorted: [] },
            { array: [34, 64, 25, 12, 22, 11, 90], comparing: [1, 2], sorted: [] },
            { array: [34, 25, 64, 12, 22, 11, 90], comparing: [2, 3], sorted: [] },
            { array: [34, 25, 12, 64, 22, 11, 90], comparing: [3, 4], sorted: [] },
            { array: [34, 25, 12, 22, 64, 11, 90], comparing: [4, 5], sorted: [] },
            { array: [34, 25, 12, 22, 11, 64, 90], comparing: [5, 6], sorted: [] },
            { array: [34, 25, 12, 22, 11, 64, 90], comparing: [], sorted: [6] },
            { array: [11, 12, 22, 25, 34, 64, 90], comparing: [], sorted: [0, 1, 2, 3, 4, 5, 6] }
        ];
        const currentStep = steps[animationStep];
        setSortingArray(currentStep.array);
        setComparing(currentStep.comparing);
        setSorted(currentStep.sorted);
    }, [animationStep]);

    return (
        <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Bubble Sort Visualization</h3>
                    <div className="flex items-end justify-center space-x-2 h-32">
                        {sortingArray.map((value, index) => (
                            <div
                                key={index}
                                className={`flex flex-col items-center transition-all duration-500 ${comparing.includes(index)
                                    ? 'transform scale-110'
                                    : sorted.includes(index)
                                        ? 'opacity-75'
                                        : ''
                                    }`}
                            >
                                <div
                                    className={`w-8 rounded-t transition-all duration-500 ${comparing.includes(index)
                                        ? 'bg-red-400'
                                        : sorted.includes(index)
                                            ? 'bg-green-400'
                                            : 'bg-blue-300'
                                        }`}
                                    style={{ height: `${value}px` }}
                                />
                                <span className="text-xs mt-1 text-blue-100">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="text-center">
                    <span className="text-sm text-blue-200">
                        {comparing.length > 0 ? `Comparing ${sortingArray[comparing[0]]} and ${sortingArray[comparing[1]]}` :
                            sorted.length === sortingArray.length ? 'Sorting Complete!' : 'Starting sort...'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BubbleSortVisualizer;