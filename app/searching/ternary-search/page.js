'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Square, ChevronLeft, ChevronRight, RotateCcw, Code, Target, Zap, Search } from 'lucide-react';

const TernarySearchPage = () => {
    const [array, setArray] = useState([1, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    const [originalArray] = useState([1, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    const [target, setTarget] = useState(25);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);

    const generateSteps = useCallback(() => {
        const steps = [];
        let left = 0;
        let right = array.length - 1;
        let found = false;
        let foundIndex = -1;

        steps.push({
            array: [...array],
            left: left,
            right: right,
            mid1: -1,
            mid2: -1,
            found: false,
            foundIndex: -1,
            phase: 'initial',
            explanation: `Starting Ternary Search for target ${target}. Search space: entire sorted array.`,
            comparisons: 0
        });

        let comparisons = 0;

        while (left <= right && !found) {
            const mid1 = left + Math.floor((right - left) / 3);
            const mid2 = right - Math.floor((right - left) / 3);

            steps.push({
                array: [...array],
                left: left,
                right: right,
                mid1: mid1,
                mid2: mid2,
                found: false,
                foundIndex: -1,
                phase: 'dividing',
                explanation: `Divide into thirds: mid1=${mid1} (${array[mid1]}), mid2=${mid2} (${array[mid2]})`,
                comparisons: comparisons
            });

            comparisons++;
            if (array[mid1] === target) {
                found = true;
                foundIndex = mid1;
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    mid1: mid1,
                    mid2: mid2,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    explanation: `🎯 Target ${target} found at mid1 (index ${mid1})!`,
                    comparisons: comparisons
                });
                break;
            }

            comparisons++;
            if (array[mid2] === target) {
                found = true;
                foundIndex = mid2;
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    mid1: mid1,
                    mid2: mid2,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    explanation: `🎯 Target ${target} found at mid2 (index ${mid2})!`,
                    comparisons: comparisons
                });
                break;
            }

            if (target < array[mid1]) {
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    mid1: mid1,
                    mid2: mid2,
                    found: false,
                    foundIndex: -1,
                    phase: 'left_third',
                    explanation: `${target} < ${array[mid1]}. Search left third: [${left}, ${mid1 - 1}]`,
                    comparisons: comparisons
                });
                right = mid1 - 1;
            } else if (target > array[mid2]) {
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    mid1: mid1,
                    mid2: mid2,
                    found: false,
                    foundIndex: -1,
                    phase: 'right_third',
                    explanation: `${target} > ${array[mid2]}. Search right third: [${mid2 + 1}, ${right}]`,
                    comparisons: comparisons
                });
                left = mid2 + 1;
            } else {
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    mid1: mid1,
                    mid2: mid2,
                    found: false,
                    foundIndex: -1,
                    phase: 'middle_third',
                    explanation: `${array[mid1]} < ${target} < ${array[mid2]}. Search middle third: [${mid1 + 1}, ${mid2 - 1}]`,
                    comparisons: comparisons
                });
                left = mid1 + 1;
                right = mid2 - 1;
            }
        }

        if (!found) {
            steps.push({
                array: [...array],
                left: left,
                right: right,
                mid1: -1,
                mid2: -1,
                found: false,
                foundIndex: -1,
                phase: 'not_found',
                explanation: `❌ Target ${target} not found in the array.`,
                comparisons: comparisons
            });
        }

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

    const currentState = stepHistory[currentStep] || {
        array: array,
        left: 0,
        right: array.length - 1,
        mid1: -1,
        mid2: -1,
        found: false,
        foundIndex: -1,
        phase: 'initial',
        explanation: 'Click Start to begin Ternary Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.found && index === currentState.foundIndex) return 'bg-green-500 border-green-600 shadow-green-300';
        if (index === currentState.mid1 || index === currentState.mid2) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (index < currentState.left || index > currentState.right) return 'bg-gray-400 border-gray-500 opacity-50';
        if (index === currentState.left || index === currentState.right) return 'bg-red-400 border-red-500 shadow-red-300';
        return 'bg-red-300 border-red-400';
    };

    const codeExample = `def ternary_search(arr, target, left=0, right=None):
    if right is None:
        right = len(arr) - 1
    
    if left > right:
        return -1
    
    # Divide array into three parts
    mid1 = left + (right - left) // 3
    mid2 = right - (right - left) // 3
    
    # Check if target is at mid1 or mid2
    if arr[mid1] == target:
        return mid1
    if arr[mid2] == target:
        return mid2
    
    # Search in appropriate third
    if target < arr[mid1]:
        return ternary_search(arr, target, left, mid1 - 1)
    elif target > arr[mid2]:
        return ternary_search(arr, target, mid2 + 1, right)
    else:
        return ternary_search(arr, target, mid1 + 1, mid2 - 1)`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-700 to-rose-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/searching" className="flex items-center text-white hover:text-red-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Searching
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Ternary Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Ternary Search divides the array into three parts, eliminating 2/3 of the search space at each step.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(log₃ n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Requirement: Sorted Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Three-way Division</div>
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
                            </div>

                            {/* Target Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Value: {target}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={target}
                                        onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        min="0"
                                        max="100"
                                    />
                                    <select
                                        value={target}
                                        onChange={(e) => setTarget(parseInt(e.target.value))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    >
                                        {array.map(val => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Search Info */}
                            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="text-sm text-purple-800">
                                    <span className="font-semibold">Search Range:</span> [{currentState.left}, {currentState.right}] |
                                    {currentState.mid1 >= 0 && currentState.mid2 >= 0 && (
                                        <span> <span className="font-semibold">Mid Points:</span> {currentState.mid1}, {currentState.mid2} |</span>
                                    )}
                                    <span className="font-semibold"> Comparisons:</span> {currentState.comparisons}
                                </div>
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
                                    <div className="flex items-end gap-1 overflow-x-auto pb-2">
                                        {currentState.array.map((value, index) => (
                                            <div key={index} className="flex flex-col items-center">
                                                <div className="text-xs mb-1 font-medium">{index}</div>
                                                <div
                                                    className={`w-10 h-12 flex items-center justify-center text-white font-bold rounded-lg border-2 transition-all duration-500 ${getBarColor(index)}`}
                                                >
                                                    {value}
                                                </div>
                                                {index === currentState.left && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">L</div>
                                                )}
                                                {index === currentState.right && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">R</div>
                                                )}
                                                {index === currentState.mid1 && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">M1</div>
                                                )}
                                                {index === currentState.mid2 && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">M2</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Search Info */}
                                <div className="text-center mt-4">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold">Target:</span> {target} |
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
                                Ternary Search
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Complexity:</span>
                                    <span className="font-semibold">O(log₃ n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Space Complexity:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Comparisons:</span>
                                    <span className="font-semibold">2 per iteration</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Division:</span>
                                    <span className="font-semibold">Three parts</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Color Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm">Mid Points (M1, M2)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-400 border border-red-500 rounded mr-3"></div>
                                    <span className="text-sm">Search Boundaries (L, R)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-3"></div>
                                    <span className="text-sm">Target Found</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Active Search Space</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-gray-400 border border-gray-500 rounded mr-3 opacity-50"></div>
                                    <span className="text-sm">Eliminated Space</span>
                                </div>
                            </div>
                        </div>

                        {/* Comparison with Binary Search */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">vs Binary Search</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Ternary:</span>
                                    <span className="font-semibold">2 comparisons/step</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Binary:</span>
                                    <span className="font-semibold">1 comparison/step</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Elimination:</span>
                                    <span className="font-semibold">2/3 vs 1/2</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    Despite eliminating more space, ternary search typically performs more total comparisons than binary search.
                                </p>
                            </div>
                        </div>

                        {/* Algorithm Steps */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">How It Works</h3>
                            <ol className="space-y-2 text-sm text-gray-700">
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                                    <span>Divide array into three equal parts</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                                    <span>Check both mid points (mid1, mid2)</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                                    <span>Eliminate 2/3 of search space</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                                    <span>Repeat on remaining 1/3</span>
                                </li>
                            </ol>
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
                                <li>• Finding peaks in unimodal functions</li>
                                <li>• Optimization problems in mathematics</li>
                                <li>• Game theory and decision trees</li>
                                <li>• Scientific computing simulations</li>
                                <li>• When elimination rate matters more</li>
                                <li>• Educational purposes for algorithm analysis</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TernarySearchPage;