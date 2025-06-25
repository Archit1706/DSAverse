"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Code, TrendingUp, Zap, Hash } from 'lucide-react';

const FibonacciVisualizer = () => {
    const [n, setN] = useState(5);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(800);
    const [useMemoization, setUseMemoization] = useState(false);
    const [memoTable, setMemoTable] = useState({});

    // Generate step history for Fibonacci visualization
    const generateSteps = (num, withMemo = false) => {
        const steps = [];
        const memo = {};
        let callCount = 0;

        const fibNaive = (n, depth = 0, path = []) => {
            callCount++;
            const currentPath = [...path, `fib(${n})`];

            steps.push({
                currentCall: `fib(${n})`,
                depth: depth,
                path: currentPath,
                explanation: n <= 1
                    ? `Base case: fib(${n}) = ${n}`
                    : `Computing fib(${n}) = fib(${n - 1}) + fib(${n - 2})`,
                callTree: [...currentPath],
                result: null,
                phase: 'forward',
                memoUsed: false,
                totalCalls: callCount,
                useMemoization: false
            });

            if (n <= 1) {
                steps.push({
                    currentCall: `fib(${n})`,
                    depth: depth,
                    path: currentPath,
                    explanation: `Returning: fib(${n}) = ${n}`,
                    callTree: [...currentPath],
                    result: n,
                    phase: 'backward',
                    memoUsed: false,
                    totalCalls: callCount,
                    useMemoization: false
                });
                return n;
            }

            const left = fibNaive(n - 1, depth + 1, currentPath);
            const right = fibNaive(n - 2, depth + 1, currentPath);
            const result = left + right;

            steps.push({
                currentCall: `fib(${n})`,
                depth: depth,
                path: currentPath,
                explanation: `Combining: fib(${n}) = ${left} + ${right} = ${result}`,
                callTree: [...currentPath],
                result: result,
                phase: 'backward',
                memoUsed: false,
                totalCalls: callCount,
                useMemoization: false
            });

            return result;
        };

        const fibMemo = (n, depth = 0, path = []) => {
            callCount++;
            const currentPath = [...path, `fib(${n})`];

            if (memo[n] !== undefined) {
                steps.push({
                    currentCall: `fib(${n})`,
                    depth: depth,
                    path: currentPath,
                    explanation: `💾 Cache hit! fib(${n}) = ${memo[n]} (already computed)`,
                    callTree: [...currentPath],
                    result: memo[n],
                    phase: 'cached',
                    memoUsed: true,
                    memoTable: { ...memo },
                    totalCalls: callCount,
                    useMemoization: true
                });
                return memo[n];
            }

            steps.push({
                currentCall: `fib(${n})`,
                depth: depth,
                path: currentPath,
                explanation: n <= 1
                    ? `Base case: fib(${n}) = ${n}, storing in cache`
                    : `Computing fib(${n}) = fib(${n - 1}) + fib(${n - 2}), will cache result`,
                callTree: [...currentPath],
                result: null,
                phase: 'forward',
                memoUsed: false,
                memoTable: { ...memo },
                totalCalls: callCount,
                useMemoization: true
            });

            if (n <= 1) {
                memo[n] = n;
                steps.push({
                    currentCall: `fib(${n})`,
                    depth: depth,
                    path: currentPath,
                    explanation: `💾 Cached: fib(${n}) = ${n}`,
                    callTree: [...currentPath],
                    result: n,
                    phase: 'backward',
                    memoUsed: true,
                    memoTable: { ...memo },
                    totalCalls: callCount,
                    useMemoization: true
                });
                return n;
            }

            const left = fibMemo(n - 1, depth + 1, currentPath);
            const right = fibMemo(n - 2, depth + 1, currentPath);
            const result = left + right;
            memo[n] = result;

            steps.push({
                currentCall: `fib(${n})`,
                depth: depth,
                path: currentPath,
                explanation: `💾 Cached: fib(${n}) = ${left} + ${right} = ${result}`,
                callTree: [...currentPath],
                result: result,
                phase: 'backward',
                memoUsed: true,
                memoTable: { ...memo },
                totalCalls: callCount,
                useMemoization: true
            });

            return result;
        };

        callCount = 0;
        if (withMemo) {
            fibMemo(num);
        } else {
            fibNaive(num);
        }

        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n, useMemoization);
        setStepHistory(steps);
        setCurrentStep(0);
        setMemoTable({});
    }, [n, useMemoization]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => {
                setCurrentStep(prev => prev + 1);
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
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const handleModeToggle = () => {
        setUseMemoization(!useMemoization);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        currentCall: '',
        path: [],
        explanation: 'Click Start to begin the Fibonacci visualization',
        callTree: [],
        result: null,
        phase: 'forward',
        memoUsed: false,
        memoTable: {},
        totalCalls: 0,
        useMemoization: false
    };

    // Calculate Fibonacci for display
    const fibResult = (num) => {
        if (num <= 1) return num;
        let a = 0, b = 1;
        for (let i = 2; i <= num; i++) {
            [a, b] = [b, a + b];
        }
        return b;
    };

    // Calculate call count for naive approach
    const naiveCallCount = (num) => {
        if (num <= 1) return 1;
        return naiveCallCount(num - 1) + naiveCallCount(num - 2) + 1;
    };

    const codeExample = `def fibonacci_naive(n):
    # Base case
    if n <= 1:
        return n
    
    # Recursive case - exponential time!
    return fibonacci_naive(n-1) + fibonacci_naive(n-2)

def fibonacci_memo(n, memo={}):
    # Check cache first
    if n in memo:
        return memo[n]
    
    # Base case
    if n <= 1:
        memo[n] = n
        return n
    
    # Compute and cache result
    memo[n] = fibonacci_memo(n-1, memo) + fibonacci_memo(n-2, memo)
    return memo[n]

# Example: fib(${n}) = ${fibResult(n)}
# Naive calls: ${naiveCallCount(n)} vs Memoized calls: ${n + 1}`;

    const javaScriptCode = `function fibonacciNaive(n) {
    if (n <= 1) return n;
    return fibonacciNaive(n-1) + fibonacciNaive(n-2);
}

function fibonacciMemo(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) {
        memo[n] = n;
        return n;
    }
    memo[n] = fibonacciMemo(n-1, memo) + fibonacciMemo(n-2, memo);
    return memo[n];
}

// Example: fib(${n}) = ${fibResult(n)}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/recursion" className="flex items-center text-white hover:text-green-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Recursion
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Fibonacci Sequence Recursion
                        </h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            See the explosive growth of naive recursion vs the efficiency of memoization in computing Fibonacci numbers.
                        </p>
                        <div className="flex justify-center items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <TrendingUp className="h-4 w-4" />
                                Exponential vs Linear
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                O(2^n) vs O(n)
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Zap className="h-4 w-4" />
                                Memoization Magic
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Controls</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fibonacci Number (n): {n}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="8"
                                        value={n}
                                        onChange={(e) => setN(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                        disabled={isPlaying}
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        fib({n}) = {fibResult(n)}
                                    </div>
                                </div>

                                <div className="border-2 border-green-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-gray-700">Algorithm Mode:</span>
                                        <button
                                            onClick={handleModeToggle}
                                            disabled={isPlaying}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${useMemoization
                                                ? 'bg-green-500 text-white'
                                                : 'bg-red-500 text-white'
                                                }`}
                                        >
                                            {useMemoization ? 'Memoized' : 'Naive'}
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {useMemoization
                                            ? '💾 Using cache to avoid repeated calculations'
                                            : '🔥 Recalculating everything from scratch'
                                        }
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Speed: {speed}ms
                                    </label>
                                    <input
                                        type="range"
                                        min="400"
                                        max="1500"
                                        step="100"
                                        value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePlay}
                                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                                    >
                                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isPlaying ? 'Pause' : 'Start'}
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Performance Stats */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <Hash className="h-5 w-5 mr-2 text-green-600" />
                                Performance Stats
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Current calls:</span>
                                    <span className="text-lg font-bold text-green-700">
                                        {currentState.totalCalls}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Naive total:</span>
                                    <span className="text-lg font-bold text-red-600">
                                        {naiveCallCount(n)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Memoized total:</span>
                                    <span className="text-lg font-bold text-green-600">
                                        {n + 1}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold">Speedup:</span> {Math.round(naiveCallCount(n) / (n + 1))}x faster with memoization!
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step Explanation */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Current Step</h3>
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600">
                                    Step {currentStep + 1} of {stepHistory.length}
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-green-800 text-sm">
                                        {currentState.explanation}
                                    </p>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Current Call: </span>
                                    <span className="font-mono text-green-700">{currentState.currentCall}</span>
                                </div>
                                {currentState.result !== null && (
                                    <div className="text-sm">
                                        <span className="font-medium text-gray-700">Result: </span>
                                        <span className="font-bold text-green-700">{currentState.result}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Call Tree Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                                Call Tree Visualization
                                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${useMemoization ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {useMemoization ? 'MEMOIZED' : 'NAIVE'}
                                </span>
                            </h3>

                            {/* Call Tree Display */}
                            <div className="mb-6">
                                <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg border">
                                    {currentState.callTree.length === 0 ? (
                                        <div className="text-gray-500 text-center py-8">
                                            Click Start to see the call tree in action
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {currentState.callTree.map((call, index) => (
                                                <div
                                                    key={index}
                                                    className={`font-mono text-sm p-2 rounded transition-all duration-300 ${index === currentState.callTree.length - 1
                                                        ? currentState.phase === 'cached'
                                                            ? 'bg-blue-100 border-2 border-blue-400 animate-pulse'
                                                            : currentState.phase === 'forward'
                                                                ? 'bg-yellow-100 border-2 border-yellow-400 animate-pulse'
                                                                : 'bg-green-100 border-2 border-green-400'
                                                        : 'bg-gray-100 border border-gray-300'
                                                        }`}
                                                    style={{ marginLeft: `${index * 20}px` }}
                                                >
                                                    <span className="font-bold">{call}</span>
                                                    {index === currentState.callTree.length - 1 && currentState.result !== null && (
                                                        <span className="ml-4 text-green-700">
                                                            → {currentState.result}
                                                        </span>
                                                    )}
                                                    {index === currentState.callTree.length - 1 && currentState.memoUsed && (
                                                        <span className="ml-2 text-blue-600">💾</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Memoization Table */}
                            {useMemoization && Object.keys(currentState.memoTable || {}).length > 0 && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                    <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                                        💾 Memoization Cache
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(currentState.memoTable).map(([key, value]) => (
                                            <div key={key} className="bg-white p-2 rounded border border-blue-300 text-center">
                                                <div className="font-mono text-sm">fib({key})</div>
                                                <div className="font-bold text-blue-700">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Code Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            Python Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                            <code>{codeExample}</code>
                        </pre>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            JavaScript Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                            <code>{javaScriptCode}</code>
                        </pre>
                    </div>
                </div>

                {/* Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Algorithm Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Naive Recursion</h4>
                            <ul className="text-gray-600 text-sm space-y-1 mb-4">
                                <li>• <strong>Time:</strong> O(2^n) - exponential growth</li>
                                <li>• <strong>Space:</strong> O(n) - recursion depth</li>
                                <li>• <strong>Calls:</strong> {naiveCallCount(n)} for fib({n})</li>
                                <li>• Recalculates same values repeatedly</li>
                                <li>• Becomes unusably slow for n &gt; 35</li>
                            </ul>

                            <h4 className="font-bold text-green-700 mb-2">With Memoization</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• <strong>Time:</strong> O(n) - linear time</li>
                                <li>• <strong>Space:</strong> O(n) - cache + recursion</li>
                                <li>• <strong>Calls:</strong> {n + 1} for fib({n})</li>
                                <li>• Each value computed only once</li>
                                <li>• Dramatically faster for large n</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Real-World Applications</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• <strong>Nature:</strong> Flower petals, spiral shells, bee genealogy</li>
                                <li>• <strong>Finance:</strong> Elliott wave theory, market analysis</li>
                                <li>• <strong>Computer Science:</strong> Algorithm analysis, golden ratio</li>
                                <li>• <strong>Art/Design:</strong> Golden rectangle, architectural proportions</li>
                                <li>• <strong>Biology:</strong> DNA structure, population growth models</li>
                                <li>• <strong>Optimization:</strong> Dynamic programming introduction</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FibonacciVisualizer;