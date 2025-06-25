'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Square, ChevronLeft, ChevronRight, RotateCcw, Code, Target, Zap, Search } from 'lucide-react';

const LinearSearchPage = () => {
    const [array, setArray] = useState([45, 23, 78, 12, 67, 34, 89, 56, 23, 91]);
    const [originalArray] = useState([45, 23, 78, 12, 67, 34, 89, 56, 23, 91]);
    const [target, setTarget] = useState(23);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);

    const generateSteps = useCallback(() => {
        const steps = [];
        let found = false;
        let foundIndices = [];

        steps.push({
            array: [...array],
            currentIndex: -1,
            found: false,
            foundIndices: [],
            checked: [],
            explanation: `Starting Linear Search for target ${target}. Will check each element sequentially.`,
            comparisons: 0
        });

        let comparisons = 0;
        for (let i = 0; i < array.length; i++) {
            comparisons++;

            steps.push({
                array: [...array],
                currentIndex: i,
                found: false,
                foundIndices: [...foundIndices],
                checked: Array.from({ length: i }, (_, idx) => idx),
                explanation: `Checking index ${i}: ${array[i]} ${array[i] === target ? '==' : '!='} ${target}`,
                comparisons: comparisons
            });

            if (array[i] === target) {
                found = true;
                foundIndices.push(i);
                steps.push({
                    array: [...array],
                    currentIndex: i,
                    found: true,
                    foundIndices: [...foundIndices],
                    checked: Array.from({ length: i + 1 }, (_, idx) => idx),
                    explanation: `🎯 Target ${target} found at index ${i}! Continuing to find all occurrences.`,
                    comparisons: comparisons
                });
            }
        }

        steps.push({
            array: [...array],
            currentIndex: -1,
            found: foundIndices.length > 0,
            foundIndices: foundIndices,
            checked: Array.from({ length: array.length }, (_, idx) => idx),
            explanation: foundIndices.length > 0
                ? `✅ Search complete! Found ${foundIndices.length} occurrence(s) of ${target} at index(es): ${foundIndices.join(', ')}`
                : `❌ Search complete! Target ${target} not found in the array.`,
            comparisons: comparisons
        });

        return steps;
    }, [array, target]);

    useEffect(() => {
        const steps = generateSteps();
        setStepHistory(steps);
        setCurrentStep(0);
    }, [generateSteps]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => {
                setCurrentStep(prev => Math.min(prev + 1, stepHistory.length - 1));
            }, speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) {
            setCurrentStep(0);
        }
        setIsPlaying(true);
    };

    const handlePause = () => setIsPlaying(false);
    const handleStop = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const handleNext = () => {
        if (currentStep < stepHistory.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const resetArray = () => {
        setArray([...originalArray]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const generateRandomArray = () => {
        const newArray = Array.from({ length: 10 }, () => Math.floor(Math.random() * 100));
        setArray(newArray);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        array: array,
        currentIndex: -1,
        found: false,
        foundIndices: [],
        checked: [],
        explanation: 'Click Start to begin Linear Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.foundIndices.includes(index)) return 'bg-green-500 border-green-600 shadow-green-300';
        if (index === currentState.currentIndex) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (currentState.checked.includes(index)) return 'bg-gray-400 border-gray-500';
        return 'bg-red-300 border-red-400';
    };

    const codeExample = `def linear_search(arr, target):
    found_indices = []
    
    for i in range(len(arr)):
        if arr[i] == target:
            found_indices.append(i)
    
    return found_indices if found_indices else -1

# For finding first occurrence only:
def linear_search_first(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/searching" className="flex items-center text-white hover:text-red-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Searching
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Linear Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Linear Search checks each element sequentially until the target is found or the array ends.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">No Prerequisites</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Sequential Access</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button
                                    onClick={isPlaying ? handlePause : handlePlay}
                                    className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    <Square className="h-4 w-4 mr-2" />
                                    Stop
                                </button>
                                <button
                                    onClick={handlePrevious}
                                    disabled={currentStep === 0}
                                    className="flex items-center px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={currentStep >= stepHistory.length - 1}
                                    className="flex items-center px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </button>
                                <button
                                    onClick={resetArray}
                                    className="flex items-center px-4 py-2 bg-red-300 text-white rounded-lg hover:bg-red-400 transition-colors"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </button>
                                <button
                                    onClick={generateRandomArray}
                                    className="flex items-center px-4 py-2 bg-red-300 text-white rounded-lg hover:bg-red-400 transition-colors"
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Random
                                </button>
                            </div>

                            {/* Target Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Value: {target}
                                </label>
                                <input
                                    type="number"
                                    value={target}
                                    onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    min="0"
                                    max="100"
                                />
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Animation Speed: {speed === 500 ? 'Fast' : speed === 1000 ? 'Normal' : 'Slow'}
                                </label>
                                <input
                                    type="range"
                                    min="500"
                                    max="2000"
                                    step="500"
                                    value={speed}
                                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>

                            {/* Array Visualization */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <div className="flex items-center justify-center mb-4">
                                    <div className="flex items-end gap-2 overflow-x-auto pb-2">
                                        {currentState.array.map((value, index) => (
                                            <div key={index} className="flex flex-col items-center">
                                                <div className="text-xs mb-1 font-medium">{index}</div>
                                                <div
                                                    className={`w-12 h-16 flex items-center justify-center text-white font-bold rounded-lg border-2 transition-all duration-500 ${getBarColor(index)}`}
                                                >
                                                    {value}
                                                </div>
                                                {index === currentState.currentIndex && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">👆</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Search Info */}
                                <div className="text-center mt-4">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold">Target:</span> {target} |
                                        <span className="font-semibold"> Comparisons:</span> {currentState.comparisons} |
                                        <span className="font-semibold"> Step:</span> {currentStep + 1} of {stepHistory.length}
                                    </div>
                                </div>
                            </div>

                            {/* Step Explanation */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-semibold text-red-800 mb-2">Current Step:</h3>
                                <p className="text-red-700">{currentState.explanation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-6">
                        {/* Algorithm Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <Search className="h-5 w-5 mr-2 text-red-500" />
                                Linear Search
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Complexity:</span>
                                    <span className="font-semibold">O(n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Space Complexity:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Best Case:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Worst Case:</span>
                                    <span className="font-semibold">O(n)</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Color Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm">Currently Checking</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-3"></div>
                                    <span className="text-sm">Target Found</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-gray-400 border border-gray-500 rounded mr-3"></div>
                                    <span className="text-sm">Already Checked</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Not Yet Checked</span>
                                </div>
                            </div>
                        </div>

                        {/* Code Example */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Code className="h-5 w-5 mr-2 text-red-500" />
                                Python Implementation
                            </h3>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                                {codeExample}
                            </pre>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Target className="h-5 w-5 mr-2 text-red-500" />
                                Real-world Applications
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>• Searching unsorted data collections</li>
                                <li>• Finding all occurrences of an element</li>
                                <li>• Small dataset searches where simplicity matters</li>
                                <li>• Searching linked lists (no random access)</li>
                                <li>• Finding patterns in text processing</li>
                                <li>• Initial validation and testing scenarios</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinearSearchPage;