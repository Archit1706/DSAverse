'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Square, ChevronLeft, ChevronRight, RotateCcw, Code, Target, Zap } from 'lucide-react';

const BlockSearchPage = () => {
    const [array, setArray] = useState([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]);
    const [originalArray] = useState([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]);
    const [target, setTarget] = useState(13);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);

    const generateSteps = useCallback(() => {
        const steps = [];
        const n = array.length;
        const blockSize = Math.floor(Math.sqrt(n));
        let blockStart = 0;
        let found = false;
        let foundIndex = -1;

        steps.push({
            array: [...array],
            blockSize: blockSize,
            blockStart: 0,
            blockEnd: -1,
            currentIndex: -1,
            found: false,
            foundIndex: -1,
            phase: 'setup',
            searchingBlock: [],
            explanation: `Starting Block Search for target ${target}. Block size = √${n} = ${blockSize}`,
            comparisons: 0
        });

        let comparisons = 0;

        // Find the appropriate block
        while (blockStart < n) {
            const blockEnd = Math.min(blockStart + blockSize - 1, n - 1);

            steps.push({
                array: [...array],
                blockSize: blockSize,
                blockStart: blockStart,
                blockEnd: blockEnd,
                currentIndex: blockEnd,
                found: false,
                foundIndex: -1,
                phase: 'finding_block',
                searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i),
                explanation: `Checking block [${blockStart}, ${blockEnd}]. Is ${array[blockEnd]} >= ${target}?`,
                comparisons: comparisons
            });

            comparisons++;
            if (array[blockEnd] >= target) {
                steps.push({
                    array: [...array],
                    blockSize: blockSize,
                    blockStart: blockStart,
                    blockEnd: blockEnd,
                    currentIndex: blockEnd,
                    found: false,
                    foundIndex: -1,
                    phase: 'found_block',
                    searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i),
                    explanation: `Found target block! ${array[blockEnd]} >= ${target}. Linear search within block [${blockStart}, ${blockEnd}].`,
                    comparisons: comparisons
                });
                break;
            } else {
                steps.push({
                    array: [...array],
                    blockSize: blockSize,
                    blockStart: blockStart,
                    blockEnd: blockEnd,
                    currentIndex: blockEnd,
                    found: false,
                    foundIndex: -1,
                    phase: 'block_too_small',
                    searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i),
                    explanation: `${array[blockEnd]} < ${target}. Move to next block.`,
                    comparisons: comparisons
                });
                blockStart += blockSize;
            }
        }

        if (blockStart >= n) {
            steps.push({
                array: [...array],
                blockSize: blockSize,
                blockStart: blockStart,
                blockEnd: -1,
                currentIndex: -1,
                found: false,
                foundIndex: -1,
                phase: 'not_found',
                searchingBlock: [],
                explanation: `❌ Reached end of array. Target ${target} not found.`,
                comparisons: comparisons
            });
            return steps;
        }

        // Linear search within the block
        const blockEnd = Math.min(blockStart + blockSize - 1, n - 1);
        for (let i = blockStart; i <= blockEnd; i++) {
            comparisons++;
            steps.push({
                array: [...array],
                blockSize: blockSize,
                blockStart: blockStart,
                blockEnd: blockEnd,
                currentIndex: i,
                found: false,
                foundIndex: -1,
                phase: 'linear_search',
                searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, idx) => blockStart + idx),
                explanation: `Linear search: Check array[${i}] = ${array[i]} ${array[i] === target ? '==' : '!='} ${target}`,
                comparisons: comparisons
            });

            if (array[i] === target) {
                found = true;
                foundIndex = i;
                steps.push({
                    array: [...array],
                    blockSize: blockSize,
                    blockStart: blockStart,
                    blockEnd: blockEnd,
                    currentIndex: i,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, idx) => blockStart + idx),
                    explanation: `🎯 Target ${target} found at index ${i}!`,
                    comparisons: comparisons
                });
                break;
            }

            if (array[i] > target) {
                steps.push({
                    array: [...array],
                    blockSize: blockSize,
                    blockStart: blockStart,
                    blockEnd: blockEnd,
                    currentIndex: i,
                    found: false,
                    foundIndex: -1,
                    phase: 'passed_target',
                    searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, idx) => blockStart + idx),
                    explanation: `❌ ${array[i]} > ${target}. Target not in array.`,
                    comparisons: comparisons
                });
                break;
            }
        }

        if (!found && blockStart < n) {
            steps.push({
                array: [...array],
                blockSize: blockSize,
                blockStart: blockStart,
                blockEnd: blockEnd,
                currentIndex: -1,
                found: false,
                foundIndex: -1,
                phase: 'not_found_in_block',
                searchingBlock: Array.from({ length: blockEnd - blockStart + 1 }, (_, idx) => blockStart + idx),
                explanation: `❌ Target ${target} not found in block [${blockStart}, ${blockEnd}].`,
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
        blockSize: Math.floor(Math.sqrt(array.length)),
        blockStart: 0,
        blockEnd: -1,
        currentIndex: -1,
        found: false,
        foundIndex: -1,
        phase: 'setup',
        searchingBlock: [],
        explanation: 'Click Start to begin Block Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.found && index === currentState.foundIndex) return 'bg-green-500 border-green-600 shadow-green-300';
        if (index === currentState.currentIndex) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (currentState.searchingBlock.includes(index)) return 'bg-red-300 border-red-400';
        return 'bg-gray-300 border-gray-400';
    };

    const codeExample = `import math

def block_search(arr, target):
    n = len(arr)
    block_size = int(math.sqrt(n))
    block_start = 0
    
    # Find the appropriate block
    while block_start < n:
        block_end = min(block_start + block_size - 1, n - 1)
        
        if arr[block_end] >= target:
            # Linear search within the block
            for i in range(block_start, block_end + 1):
                if arr[i] == target:
                    return i
                elif arr[i] > target:
                    return -1
            return -1
        
        block_start += block_size
    
    return -1`;

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
                            Block Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Block Search divides the array into blocks and performs linear search within the appropriate block.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(√n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Requirement: Sorted Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Block + Linear</div>
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
                                        max="50"
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

                            {/* Algorithm Info */}
                            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-sm text-blue-800">
                                    <span className="font-semibold">Block Size:</span> √{array.length} = {currentState.blockSize} |
                                    <span className="font-semibold"> Phase:</span> {currentState.phase.replace('_', ' ').toUpperCase()} |
                                    <span className="font-semibold"> Comparisons:</span> {currentState.comparisons}
                                    {currentState.blockStart >= 0 && currentState.blockEnd >= 0 && (
                                        <span> | <span className="font-semibold">Current Block:</span> [{currentState.blockStart}, {currentState.blockEnd}]</span>
                                    )}
                                </div>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Animation Speed: {speed === 800 ? 'Fast' : speed === 1200 ? 'Normal' : 'Slow'}
                                </label>
                                <input
                                    type="range"
                                    min="800"
                                    max="2000"
                                    step="400"
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
                                                    className={`w-8 h-12 flex items-center justify-center text-white font-bold rounded-lg border-2 transition-all duration-500 ${getBarColor(index)}`}
                                                >
                                                    {value}
                                                </div>
                                                {index === currentState.currentIndex && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">👆</div>
                                                )}
                                                {index === currentState.blockStart && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">START</div>
                                                )}
                                                {index === currentState.blockEnd && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">END</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Block Visualization */}
                                {currentState.searchingBlock.length > 0 && (
                                    <div className="text-center mt-2">
                                        <div className="text-sm text-red-600 font-semibold">
                                            Current Block: [{currentState.blockStart} - {currentState.blockEnd}] (size: {currentState.searchingBlock.length})
                                        </div>
                                    </div>
                                )}

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
                                <Zap className="h-5 w-5 mr-2 text-red-500" />
                                Block Search
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Complexity:</span>
                                    <span className="font-semibold">O(√n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Space Complexity:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Block Size:</span>
                                    <span className="font-semibold">√n</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-semibold">Hybrid</span>
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
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Current Block</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-3"></div>
                                    <span className="text-sm">Target Found</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded mr-3"></div>
                                    <span className="text-sm">Not in Current Block</span>
                                </div>
                            </div>
                        </div>

                        {/* Comparison with Jump Search */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">vs Jump Search</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Block Search:</span>
                                    <span className="font-semibold">Fixed block size</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Jump Search:</span>
                                    <span className="font-semibold">Variable jump size</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Both:</span>
                                    <span className="font-semibold">O(√n) complexity</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    Block search is conceptually simpler and easier to implement than jump search.
                                </p>
                            </div>
                        </div>

                        {/* Algorithm Steps */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">How It Works</h3>
                            <ol className="space-y-2 text-sm text-gray-700">
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                                    <span>Divide array into blocks of size √n</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                                    <span>Find block containing the target</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                                    <span>Perform linear search within block</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                                    <span>Return index if found, -1 otherwise</span>
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
                                <li>• Simple alternative to jump search</li>
                                <li>• Educational purposes for algorithm study</li>
                                <li>• Memory block organization</li>
                                <li>• File system block searching</li>
                                <li>• Cache-friendly data structure searches</li>
                                <li>• When simplicity over optimization matters</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlockSearchPage;
