"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const RadixSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateRadixSortSteps = (arr) => {
        const steps = [];
        let tempArr = [...arr];

        // Find the maximum number to know the number of digits
        const maxNum = Math.max(...tempArr);
        const maxDigits = maxNum.toString().length;

        steps.push({
            array: [...tempArr],
            buckets: Array(10).fill().map(() => []),
            currentDigit: 0,
            digitPosition: 'units',
            phase: 'start',
            highlightedElements: [],
            bucketHighlight: -1,
            explanation: `🎯 Starting Radix Sort: We'll sort by each digit position from right to left. Maximum number is ${maxNum} with ${maxDigits} digits.`,
            currentPass: 0,
            totalPasses: maxDigits
        });

        // Function to get digit at specific position
        const getDigit = (num, digitPos) => {
            return Math.floor(num / Math.pow(10, digitPos)) % 10;
        };

        const getDigitName = (pos) => {
            const names = ['units', 'tens', 'hundreds', 'thousands'];
            return names[pos] || `10^${pos}`;
        };

        // Perform radix sort for each digit position
        for (let digitPos = 0; digitPos < maxDigits; digitPos++) {
            const buckets = Array(10).fill().map(() => []);

            steps.push({
                array: [...tempArr],
                buckets: Array(10).fill().map(() => []),
                currentDigit: digitPos,
                digitPosition: getDigitName(digitPos),
                phase: 'digit_start',
                highlightedElements: [],
                bucketHighlight: -1,
                explanation: `🔢 Pass ${digitPos + 1}: Now sorting by the ${getDigitName(digitPos)} digit (position ${digitPos}). Distributing elements into buckets 0-9.`,
                currentPass: digitPos + 1,
                totalPasses: maxDigits
            });

            // Distribute elements into buckets based on current digit
            for (let i = 0; i < tempArr.length; i++) {
                const digit = getDigit(tempArr[i], digitPos);

                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    currentDigit: digitPos,
                    digitPosition: getDigitName(digitPos),
                    phase: 'distributing',
                    highlightedElements: [i],
                    bucketHighlight: digit,
                    explanation: `📦 Element ${tempArr[i]}: ${getDigitName(digitPos)} digit is ${digit}. Placing into bucket ${digit}.`,
                    currentPass: digitPos + 1,
                    totalPasses: maxDigits
                });

                buckets[digit].push({ value: tempArr[i], originalIndex: i });

                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    currentDigit: digitPos,
                    digitPosition: getDigitName(digitPos),
                    phase: 'distributed',
                    highlightedElements: [],
                    bucketHighlight: digit,
                    explanation: `✅ Placed ${tempArr[i]} in bucket ${digit}. Bucket ${digit} now has: [${buckets[digit].map(item => item.value).join(', ')}]`,
                    currentPass: digitPos + 1,
                    totalPasses: maxDigits
                });
            }

            // Show all buckets filled
            steps.push({
                array: [...tempArr],
                buckets: buckets.map(bucket => [...bucket]),
                currentDigit: digitPos,
                digitPosition: getDigitName(digitPos),
                phase: 'buckets_filled',
                highlightedElements: [],
                bucketHighlight: -1,
                explanation: `📊 All elements distributed! Now collecting from buckets 0-9 in order to form the new array arrangement.`,
                currentPass: digitPos + 1,
                totalPasses: maxDigits
            });

            // Collect elements back from buckets in order
            let newArray = [];
            let arrayIndex = 0;

            for (let bucketIndex = 0; bucketIndex < 10; bucketIndex++) {
                if (buckets[bucketIndex].length > 0) {
                    steps.push({
                        array: [...tempArr],
                        buckets: buckets.map(bucket => [...bucket]),
                        currentDigit: digitPos,
                        digitPosition: getDigitName(digitPos),
                        phase: 'collecting',
                        highlightedElements: [],
                        bucketHighlight: bucketIndex,
                        explanation: `🔄 Collecting from bucket ${bucketIndex}: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                        currentPass: digitPos + 1,
                        totalPasses: maxDigits
                    });

                    for (let item of buckets[bucketIndex]) {
                        newArray.push(item.value);
                        tempArr[arrayIndex] = item.value;
                        arrayIndex++;

                        steps.push({
                            array: [...tempArr],
                            buckets: buckets.map(bucket => [...bucket]),
                            currentDigit: digitPos,
                            digitPosition: getDigitName(digitPos),
                            phase: 'collecting_item',
                            highlightedElements: [arrayIndex - 1],
                            bucketHighlight: bucketIndex,
                            explanation: `➡️ Collected ${item.value} from bucket ${bucketIndex} to position ${arrayIndex - 1}`,
                            currentPass: digitPos + 1,
                            totalPasses: maxDigits
                        });
                    }
                }
            }

            steps.push({
                array: [...tempArr],
                buckets: Array(10).fill().map(() => []),
                currentDigit: digitPos,
                digitPosition: getDigitName(digitPos),
                phase: 'pass_complete',
                highlightedElements: [],
                bucketHighlight: -1,
                explanation: `🎉 Pass ${digitPos + 1} complete! Array after sorting by ${getDigitName(digitPos)} digit: [${tempArr.join(', ')}]`,
                currentPass: digitPos + 1,
                totalPasses: maxDigits
            });
        }

        steps.push({
            array: [...tempArr],
            buckets: Array(10).fill().map(() => []),
            currentDigit: maxDigits,
            digitPosition: 'complete',
            phase: 'complete',
            highlightedElements: Array.from({ length: tempArr.length }, (_, i) => i),
            bucketHighlight: -1,
            explanation: `🎉 Radix Sort Complete! All ${maxDigits} digit positions have been processed. The array is now fully sorted.`,
            currentPass: maxDigits,
            totalPasses: maxDigits
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateRadixSortSteps(array);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [array]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, currentStep, stepHistory, speed]);

    const startVisualization = () => setIsPlaying(true);
    const pauseVisualization = () => setIsPlaying(false);
    const resetVisualization = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const stepForward = () => {
        if (currentStep < stepHistory.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const stepBackward = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const generateNewArray = () => {
        const newArray = Array.from({ length: 7 }, () => Math.floor(Math.random() * 99) + 1);
        setArray(newArray);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setArray([...originalArray]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        array: array,
        buckets: Array(10).fill().map(() => []),
        currentDigit: 0,
        digitPosition: 'units',
        phase: 'start',
        highlightedElements: [],
        bucketHighlight: -1,
        explanation: 'Click Start to begin the Radix Sort visualization',
        currentPass: 0,
        totalPasses: 0
    };

    const getBarColor = (index) => {
        if (currentState.phase === 'complete') return 'bg-green-500 border-green-600';
        if (currentState.highlightedElements.includes(index)) return 'bg-red-500 border-red-600 transform scale-110';
        return 'bg-orange-400 border-orange-500';
    };

    const getBucketColor = (bucketIndex) => {
        if (currentState.bucketHighlight === bucketIndex) return 'bg-blue-100 border-blue-300 shadow-lg';
        return 'bg-gray-50 border-gray-200';
    };

    const maxValue = Math.max(...currentState.array);

    // Helper function to highlight the current digit
    const highlightDigit = (number, digitPos) => {
        const numStr = number.toString().padStart(3, ' ');
        const chars = numStr.split('');
        const targetPos = chars.length - 1 - digitPos;

        return chars.map((char, index) => (
            <span
                key={index}
                className={index === targetPos ? 'text-red-600 font-bold bg-red-100 px-1 rounded' : ''}
            >
                {char}
            </span>
        ));
    };

    const codeExample = `def radix_sort(arr):
    # Find the maximum number to know number of digits
    max_num = max(arr)
    
    # Do counting sort for every digit
    exp = 1  # exp represents 10^i where i is current digit number
    while max_num // exp > 0:
        counting_sort_by_digit(arr, exp)
        exp *= 10

def counting_sort_by_digit(arr, exp):
    n = len(arr)
    output = [0] * n
    count = [0] * 10
    
    # Store count of occurrences of each digit
    for i in range(n):
        digit = (arr[i] // exp) % 10
        count[digit] += 1
    
    # Change count[i] to actual position of this digit in output[]
    for i in range(1, 10):
        count[i] += count[i - 1]
    
    # Build the output array
    i = n - 1
    while i >= 0:
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]
        count[digit] -= 1
        i -= 1
    
    # Copy the output array to arr[]
    for i in range(n):
        arr[i] = output[i]`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/sorting" className="flex items-center text-white hover:text-orange-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Sorting
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Radix Sort Visualizer
                        </h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Radix Sort uses non-comparison based sorting by processing individual digits from least to most significant.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(d × (n + k))</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n + k)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Non-comparison</div>
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
                                    onClick={isPlaying ? pauseVisualization : startVisualization}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                                    disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                >
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>

                                <button
                                    onClick={stepBackward}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep === 0}
                                >
                                    <SkipBack size={18} />
                                    Step Back
                                </button>

                                <button
                                    onClick={stepForward}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                >
                                    <SkipForward size={18} />
                                    Step Forward
                                </button>

                                <button
                                    onClick={resetVisualization}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                                >
                                    <RotateCcw size={18} />
                                    Reset
                                </button>

                                <button
                                    onClick={generateNewArray}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                >
                                    Randomize
                                </button>

                                <button
                                    onClick={resetToOriginal}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                >
                                    Original Array
                                </button>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Animation Speed: {speed}ms
                                </label>
                                <input
                                    type="range"
                                    min="600"
                                    max="3000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-orange-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (600ms)</span>
                                    <span>Slow (3000ms)</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Progress: Step {currentStep + 1} of {stepHistory.length}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Pass {currentState.currentPass} of {currentState.totalPasses} | Digit: {currentState.digitPosition}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Array Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                                    Current Array {currentState.digitPosition !== 'complete' && currentState.digitPosition !== 'units' && `(Sorted by ${currentState.digitPosition} digit)`}
                                </h3>
                                <div className="flex items-end justify-center gap-2 h-48 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                                    {currentState.array.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div
                                                className={`w-16 transition-all duration-500 border-2 rounded-t-lg flex items-end justify-center ${getBarColor(index)}`}
                                                style={{
                                                    height: `${(value / maxValue) * 160}px`,
                                                }}
                                            >
                                                <span className="text-white font-bold text-sm mb-1">
                                                    {currentState.currentDigit >= 0 && currentState.phase !== 'complete'
                                                        ? highlightDigit(value, currentState.currentDigit)
                                                        : value
                                                    }
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1">{index}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Buckets Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800">Buckets (0-9)</h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {currentState.buckets.map((bucket, bucketIndex) => (
                                        <div key={bucketIndex} className={`${getBucketColor(bucketIndex)} border-2 rounded-lg p-2 min-h-24 transition-all duration-300`}>
                                            <div className="text-center font-bold text-gray-700 mb-2">
                                                Bucket {bucketIndex}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {bucket.map((item, itemIndex) => (
                                                    <div
                                                        key={itemIndex}
                                                        className="bg-orange-400 text-white text-xs rounded px-2 py-1 text-center font-medium"
                                                    >
                                                        {item.value}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-400 border border-orange-500 rounded"></div>
                                    <span>Array Elements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
                                    <span>Currently Processing</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                                    <span>Active Bucket</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
                                    <span>Sorted</span>
                                </div>
                            </div>

                            {/* Current Step Explanation */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-orange-800 mb-2">Current Step:</h3>
                                        <p className="text-orange-700 leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Algorithm Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-orange-600" />
                                <h3 className="font-bold text-gray-900">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Time:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(d×(n+k))</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space:</span>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(n + k)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Stable:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">In-place:</span>
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">No</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Type:</span>
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Non-comparison</span>
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-600">
                                <p><strong>d</strong> = number of digits</p>
                                <p><strong>n</strong> = number of elements</p>
                                <p><strong>k</strong> = range of input (10 for decimal)</p>
                            </div>
                        </div>

                        {/* When to Use */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">When to Use Radix Sort</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Sorting integers with fixed number of digits</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When n is large and d is small</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Sorting strings of equal length</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When stability is required</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Floating-point numbers</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Variable-length strings</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>When memory is severely limited</span>
                                </li>
                            </ul>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Sorting large datasets of integers</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Database systems with numeric keys</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Sorting IP addresses</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Counting sort variations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Suffix array construction</span>
                                </li>
                            </ul>
                        </div>

                        {/* Key Characteristics */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Key Characteristics</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Non-comparison based algorithm</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Works by processing individual digits</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Can outperform O(n log n) algorithms</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Uses counting sort as subroutine</span>
                                </li>
                            </ul>
                        </div>

                        {/* Code Toggle */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                            >
                                <Code2 className="h-5 w-5" />
                                {showCode ? 'Hide' : 'Show'} Python Code
                            </button>

                            {showCode && (
                                <div className="mt-4">
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                        <code>{codeExample}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RadixSortPage;