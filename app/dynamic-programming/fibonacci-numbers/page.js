"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const FibonacciPage = () => {
    const [n, setN] = useState(6);
    const [originalN] = useState(6);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateFibonacciSteps = (num) => {
        const steps = [];
        const memo = {};
        const callStack = [];
        const computedValues = {};

        steps.push({
            memo: { ...memo },
            callStack: [...callStack],
            computed: { ...computedValues },
            currentCall: -1,
            result: null,
            explanation: `🎯 Starting Fibonacci calculation for F(${num}) using memoization. We'll store computed values to avoid redundant calculations.`,
            phase: 'start',
            sequence: Array.from({ length: num + 1 }, () => null)
        });

        const fibHelper = (n, depth = 0) => {
            callStack.push({ n, depth, id: Math.random() });

            steps.push({
                memo: { ...memo },
                callStack: [...callStack],
                computed: { ...computedValues },
                currentCall: n,
                result: null,
                explanation: `📞 Calling fibonacci(${n}) at depth ${depth}`,
                phase: 'call',
                sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] || null)
            });

            if (n <= 1) {
                memo[n] = n;
                computedValues[n] = n;
                const result = n;

                steps.push({
                    memo: { ...memo },
                    callStack: [...callStack],
                    computed: { ...computedValues },
                    currentCall: n,
                    result: result,
                    explanation: `✅ Base case: F(${n}) = ${n}. Storing in memoization table.`,
                    phase: 'base_case',
                    sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] || null)
                });

                callStack.pop();
                return result;
            }

            if (memo[n] !== undefined) {
                const result = memo[n];

                steps.push({
                    memo: { ...memo },
                    callStack: [...callStack],
                    computed: { ...computedValues },
                    currentCall: n,
                    result: result,
                    explanation: `🎯 Memoization hit! F(${n}) = ${result} (already computed)`,
                    phase: 'memo_hit',
                    sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] || null)
                });

                callStack.pop();
                return result;
            }

            steps.push({
                memo: { ...memo },
                callStack: [...callStack],
                computed: { ...computedValues },
                currentCall: n,
                result: null,
                explanation: `🔄 Computing F(${n}) = F(${n - 1}) + F(${n - 2}). Need to calculate both subproblems.`,
                phase: 'computing',
                sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] || null)
            });

            const result1 = fibHelper(n - 1, depth + 1);
            const result2 = fibHelper(n - 2, depth + 1);
            const result = result1 + result2;

            memo[n] = result;
            computedValues[n] = result;

            steps.push({
                memo: { ...memo },
                callStack: [...callStack],
                computed: { ...computedValues },
                currentCall: n,
                result: result,
                explanation: `✨ Computed F(${n}) = F(${n - 1}) + F(${n - 2}) = ${result1} + ${result2} = ${result}. Storing in memo table.`,
                phase: 'computed',
                sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] || null)
            });

            callStack.pop();
            return result;
        };

        fibHelper(num);

        steps.push({
            memo: { ...memo },
            callStack: [],
            computed: { ...computedValues },
            currentCall: -1,
            result: memo[num],
            explanation: `🎉 Fibonacci calculation complete! F(${num}) = ${memo[num]}. Memoization reduced time complexity from O(2^n) to O(n).`,
            phase: 'complete',
            sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] || null)
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateFibonacciSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [n]);

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

    const generateNewN = () => {
        const newN = Math.floor(Math.random() * 8) + 3; // 3-10
        setN(newN);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setN(originalN);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        memo: {},
        callStack: [],
        computed: {},
        currentCall: -1,
        result: null,
        explanation: 'Click Start to begin the Fibonacci visualization',
        phase: 'start',
        sequence: Array.from({ length: n + 1 }, () => null)
    };

    const getSequenceColor = (index, value) => {
        if (value === null) return 'bg-gray-200 text-gray-500';
        if (index === currentState.currentCall) return 'bg-rose-500 text-white border-rose-600 transform scale-110';
        if (currentState.computed[index] !== undefined) return 'bg-rose-400 text-white border-rose-500';
        return 'bg-rose-200 text-rose-800 border-rose-300';
    };

    const getMemoColor = (index, value) => {
        if (value === undefined) return 'bg-gray-100 text-gray-400';
        if (index === currentState.currentCall) return 'bg-rose-600 text-white';
        return 'bg-rose-500 text-white';
    };

    const codeExample = `def fibonacci(n, memo={}):
    # Base cases
    if n <= 1:
        return n
    
    # Check if already computed (memoization)
    if n in memo:
        return memo[n]
    
    # Compute and store result
    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo)
    return memo[n]

# Time Complexity: O(n) with memoization vs O(2^n) without
# Space Complexity: O(n) for memoization table + O(n) for recursion stack

# Iterative approach (bottom-up DP)
def fibonacci_iterative(n):
    if n <= 1:
        return n
    
    dp = [0] * (n + 1)
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    
    return dp[n]`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Fibonacci Numbers Visualizer
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch how memoization transforms the exponential Fibonacci algorithm into a linear time solution by storing computed values.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n) with memo</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Without memo: O(2^n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Top-down DP</div>
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
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium"
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
                                    onClick={generateNewN}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                >
                                    Random N
                                </button>

                                <button
                                    onClick={resetToOriginal}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                >
                                    Original N
                                </button>
                            </div>

                            {/* Input Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Calculate Fibonacci of: {n}
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="12"
                                    value={n}
                                    onChange={(e) => setN(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>F(3)</span>
                                    <span>F(12)</span>
                                </div>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Animation Speed: {speed}ms
                                </label>
                                <input
                                    type="range"
                                    min="300"
                                    max="2000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (300ms)</span>
                                    <span>Slow (2000ms)</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Progress: Step {currentStep + 1} of {stepHistory.length}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Phase: {currentState.phase}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Fibonacci Sequence Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Fibonacci Sequence</h3>
                                <div className="flex flex-wrap gap-2 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    {currentState.sequence.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className="text-xs text-gray-600 mb-1">F({index})</div>
                                            <div
                                                className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${getSequenceColor(index, value)}`}
                                            >
                                                {value !== null ? value : '?'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Call Stack */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Call Stack</h3>
                                <div className="bg-rose-50 rounded-lg p-4 border-2 border-rose-200 min-h-[120px]">
                                    {currentState.callStack.length === 0 ? (
                                        <div className="text-gray-500 text-center py-8">Call stack is empty</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {currentState.callStack.slice().reverse().map((call, index) => (
                                                <div
                                                    key={call.id}
                                                    className="bg-white p-3 rounded border-l-4 border-rose-400 shadow-sm"
                                                    style={{ marginLeft: `${call.depth * 15}px` }}
                                                >
                                                    <div className="font-mono text-rose-700 font-semibold">fibonacci({call.n})</div>
                                                    <div className="text-sm text-rose-500">Depth: {call.depth}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Memoization Table */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Memoization Table</h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    {Array.from({ length: n + 1 }, (_, i) => i).map((i) => (
                                        <div key={i} className="text-center">
                                            <div className="text-xs text-gray-600 mb-1">memo[{i}]</div>
                                            <div className={`w-full h-12 rounded border flex items-center justify-center text-sm font-bold transition-all duration-500 ${getMemoColor(i, currentState.memo[i])}`}>
                                                {currentState.memo[i] !== undefined ? currentState.memo[i] : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Current Step Explanation */}
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-800 mb-2">Current Step:</h3>
                                        <p className="text-rose-700 leading-relaxed">{currentState.explanation}</p>
                                        {currentState.result !== null && (
                                            <div className="mt-2 p-2 bg-rose-100 rounded text-rose-800 font-medium">
                                                Result: F({n}) = {currentState.result}
                                            </div>
                                        )}
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
                                <Clock className="h-5 w-5 text-rose-600" />
                                <h3 className="font-bold text-gray-900">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">With Memoization:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Without Memoization:</span>
                                    <code className="bg-red-100 text-red-800 px-2 py-1 rounded">O(2^n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Type:</span>
                                    <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded">Top-down DP</span>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Financial modeling and compound interest</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Population growth in biology</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Computer graphics and spiral patterns</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Algorithm optimization techniques</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Nature patterns (flowers, pinecones, shells)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Optimization Insights */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Memoization Benefits</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Eliminates redundant calculations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Transforms exponential to linear time</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Preserves natural recursive structure</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Easy to implement and understand</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span>Trade-off: Uses O(n) extra space</span>
                                </li>
                            </ul>
                        </div>

                        {/* Code Toggle */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium"
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

export default FibonacciPage;