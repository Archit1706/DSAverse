"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Clock, Code, TrendingUp, Zap, Hash,
    ArrowDown, ArrowUp, Brain, CheckCircle, XCircle, Info, Database, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why is naive Fibonacci O(2^n) time complexity?",
        options: [
            "It uses nested loops internally",
            "Each call spawns two more calls, creating an exponential tree of redundant computations",
            "It allocates a new array for each call",
            "The Fibonacci numbers grow exponentially"
        ],
        correct: 1,
        explanation: "fib(n) calls fib(n-1) and fib(n-2). Each of those spawns two more calls. The call tree doubles at each level, making total calls roughly 2^n."
    },
    {
        question: "What does memoization cache in the Fibonacci algorithm?",
        options: [
            "The entire call stack at each step",
            "Previously computed fib(k) values so they never get recomputed",
            "Only the final answer",
            "The path taken through the call tree"
        ],
        correct: 1,
        explanation: "Memoization stores fib(0), fib(1), fib(2)... as they're computed. Any future call for a cached value returns instantly — turning O(2^n) into O(n)."
    },
    {
        question: "How many unique calls does memoized fib(n) make?",
        options: ["2^n calls — same as naive", "n+1 calls — one per unique value 0 through n", "log(n) calls", "n² calls"],
        correct: 1,
        explanation: "Memoized fib computes each value fib(0) through fib(n) exactly once — n+1 unique calls — regardless of how many times each would be needed naively."
    }
];

export default function FibonacciVisualizer() {
    const [n, setN] = useState(5);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(800);
    const [useMemoization, setUseMemoization] = useState(false);

    const generateSteps = (num, withMemo = false) => {
        const steps = [];
        const memo = {};
        let callCount = 0;

        const fibNaive = (n, depth = 0, path = []) => {
            callCount++;
            const currentPath = [...path, `fib(${n})`];
            steps.push({
                currentCall: `fib(${n})`, depth, path: currentPath,
                explanation: n <= 1 ? `Base case: fib(${n}) = ${n}` : `Computing fib(${n}) = fib(${n - 1}) + fib(${n - 2})`,
                callTree: [...currentPath], result: null, phase: 'forward',
                memoUsed: false, totalCalls: callCount, useMemoization: false, memoTable: {}
            });
            if (n <= 1) {
                steps.push({
                    currentCall: `fib(${n})`, depth, path: currentPath,
                    explanation: `Returning: fib(${n}) = ${n}`,
                    callTree: [...currentPath], result: n, phase: 'backward',
                    memoUsed: false, totalCalls: callCount, useMemoization: false, memoTable: {}
                });
                return n;
            }
            const left = fibNaive(n - 1, depth + 1, currentPath);
            const right = fibNaive(n - 2, depth + 1, currentPath);
            const result = left + right;
            steps.push({
                currentCall: `fib(${n})`, depth, path: currentPath,
                explanation: `Combining: fib(${n}) = ${left} + ${right} = ${result}`,
                callTree: [...currentPath], result, phase: 'backward',
                memoUsed: false, totalCalls: callCount, useMemoization: false, memoTable: {}
            });
            return result;
        };

        const fibMemo = (n, depth = 0, path = []) => {
            callCount++;
            const currentPath = [...path, `fib(${n})`];
            if (memo[n] !== undefined) {
                steps.push({
                    currentCall: `fib(${n})`, depth, path: currentPath,
                    explanation: `Cache hit! fib(${n}) = ${memo[n]} (already computed — skipping recomputation)`,
                    callTree: [...currentPath], result: memo[n], phase: 'cached',
                    memoUsed: true, memoTable: { ...memo }, totalCalls: callCount, useMemoization: true
                });
                return memo[n];
            }
            steps.push({
                currentCall: `fib(${n})`, depth, path: currentPath,
                explanation: n <= 1 ? `Base case: fib(${n}) = ${n}, storing in cache` : `Computing fib(${n}) = fib(${n - 1}) + fib(${n - 2}), will cache result`,
                callTree: [...currentPath], result: null, phase: 'forward',
                memoUsed: false, memoTable: { ...memo }, totalCalls: callCount, useMemoization: true
            });
            if (n <= 1) {
                memo[n] = n;
                steps.push({
                    currentCall: `fib(${n})`, depth, path: currentPath,
                    explanation: `Cached: fib(${n}) = ${n}`,
                    callTree: [...currentPath], result: n, phase: 'backward',
                    memoUsed: true, memoTable: { ...memo }, totalCalls: callCount, useMemoization: true
                });
                return n;
            }
            const left = fibMemo(n - 1, depth + 1, currentPath);
            const right = fibMemo(n - 2, depth + 1, currentPath);
            const result = left + right;
            memo[n] = result;
            steps.push({
                currentCall: `fib(${n})`, depth, path: currentPath,
                explanation: `Cached: fib(${n}) = ${left} + ${right} = ${result}`,
                callTree: [...currentPath], result, phase: 'backward',
                memoUsed: true, memoTable: { ...memo }, totalCalls: callCount, useMemoization: true
            });
            return result;
        };

        callCount = 0;
        if (withMemo) fibMemo(num); else fibNaive(num);
        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n, useMemoization);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [n, useMemoization]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => setCurrentStep(p => p + 1), speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(!isPlaying); };
    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

    const currentState = stepHistory[currentStep] || {
        currentCall: '', path: [], explanation: 'Click Play to begin.',
        callTree: [], result: null, phase: 'forward', memoUsed: false, memoTable: {}, totalCalls: 0
    };

    const fibResult = (num) => { if (num <= 1) return num; let a = 0, b = 1; for (let i = 2; i <= num; i++) [a, b] = [b, a + b]; return b; };
    const naiveCallCount = (num) => { if (num <= 1) return 1; return naiveCallCount(num - 1) + naiveCallCount(num - 2) + 1; };

    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const handleQuizAnswer = (idx) => { if (quizState.answered) return; setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct }); };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `def fibonacci_naive(n):
    if n <= 1:
        return n
    return fibonacci_naive(n-1) + fibonacci_naive(n-2)

def fibonacci_memo(n, memo={}):
    if n in memo:
        return memo[n]    # Cache hit!
    if n <= 1:
        memo[n] = n
        return n
    memo[n] = fibonacci_memo(n-1, memo) + fibonacci_memo(n-2, memo)
    return memo[n]

# fib(${n}) = ${fibResult(n)}
# Naive calls: ${naiveCallCount(n)} vs Memoized: ${n + 1}`;

    const jsCode = `function fibNaive(n) {
    if (n <= 1) return n;
    return fibNaive(n-1) + fibNaive(n-2);
}

function fibMemo(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) { memo[n] = n; return n; }
    memo[n] = fibMemo(n-1, memo) + fibMemo(n-2, memo);
    return memo[n];
}
// fib(${n}) = ${fibResult(n)}`;

    const q = quizQuestions[currentQuestion];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/recursion" className="flex items-center text-white/80 hover:text-white transition-colors text-sm">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Recursion
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Fibonacci Sequence</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Compare naive recursion's explosive growth with memoization's dramatic efficiency — same result, radically fewer calls.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><TrendingUp className="h-4 w-4" /> Exponential vs Linear</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> O(2^n) vs O(n)</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Zap className="h-4 w-4" /> Memoization</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">n = {n} &nbsp; (fib({n}) = {fibResult(n)})</label>
                                    <input type="range" min="1" max="8" value={n}
                                        onChange={(e) => { setN(parseInt(e.target.value)); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        disabled={isPlaying} />
                                </div>

                                <div className="border border-slate-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-300">Algorithm Mode</span>
                                        <button onClick={() => { setUseMemoization(!useMemoization); setIsPlaying(false); setCurrentStep(0); }}
                                            disabled={isPlaying}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${useMemoization ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {useMemoization ? 'Memoized' : 'Naive'}
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-slate-400">
                                        {useMemoization
                                            ? <><Database className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />Cache avoids repeated computations</>
                                            : <><TrendingUp className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />Recalculates everything from scratch</>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="300" max="1500" step="100" value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handlePlay}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center font-medium">
                                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button onClick={handleReset}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center">
                                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={stepBackward} disabled={currentStep === 0 || isPlaying}
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm disabled:opacity-40">
                                        <ArrowUp className="h-4 w-4 mr-1" /> Prev
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep === stepHistory.length - 1 || isPlaying}
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm disabled:opacity-40">
                                        Next <ArrowDown className="h-4 w-4 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Performance Stats */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3 flex items-center">
                                <Hash className="h-5 w-5 mr-2 text-green-400" /> Performance
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Current calls:</span>
                                    <span className="text-lg font-bold text-green-300">{currentState.totalCalls}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Naive total:</span>
                                    <span className="text-lg font-bold text-red-400">{naiveCallCount(n)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Memo total:</span>
                                    <span className="text-lg font-bold text-green-400">{n + 1}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-700 bg-green-500/10 rounded-lg p-2 text-center">
                                    <span className="text-green-300 font-bold">{Math.round(naiveCallCount(n) / (n + 1))}x</span>
                                    <span className="text-slate-400 text-xs ml-1">faster with memoization</span>
                                </div>
                            </div>
                        </div>

                        {/* Step info */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span>
                                        <span>{currentStep + 1}/{stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Current call:</span>
                                    <span className="font-mono text-green-300">{currentState.currentCall}</span>
                                </div>
                                {currentState.result !== null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Result:</span>
                                        <span className="font-bold text-green-300">{currentState.result}</span>
                                    </div>
                                )}
                                <div className={`rounded-lg p-3 ${currentState.phase === 'cached'
                                    ? 'bg-blue-500/10 border border-blue-500/20'
                                    : currentState.phase === 'forward'
                                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                                        : 'bg-green-500/10 border border-green-500/20'}`}>
                                    <div className="flex items-start gap-2">
                                        <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.phase === 'cached' ? 'text-blue-400' : currentState.phase === 'forward' ? 'text-yellow-400' : 'text-green-400'}`} />
                                        <p className="text-slate-200 text-xs leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-green-500/30 shadow-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="h-5 w-5 text-green-400" />
                                <h3 className="text-base font-bold text-white">Test Yourself</h3>
                                <span className="ml-auto text-xs text-slate-500">Q{currentQuestion + 1}/{quizQuestions.length}</span>
                            </div>
                            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
                            <div className="space-y-1.5 mb-3">
                                {q.options.map((opt, idx) => {
                                    let cls = 'bg-slate-800 border-slate-600 text-slate-300 hover:border-green-500';
                                    if (quizState.answered) {
                                        if (idx === q.correct) cls = 'bg-green-500/20 border-green-400 text-green-300';
                                        else if (idx === quizState.selected) cls = 'bg-red-500/20 border-red-400 text-red-300';
                                        else cls = 'bg-slate-800 border-slate-700 text-slate-500 opacity-50';
                                    }
                                    return (
                                        <button key={idx} onClick={() => handleQuizAnswer(idx)} disabled={quizState.answered}
                                            className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>
                                            <span className="font-mono opacity-60 mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                                        </button>
                                    );
                                })}
                            </div>
                            {quizState.answered && (
                                <div className={`rounded-lg p-3 mb-2 ${quizState.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {quizState.correct ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                                        <span className={`text-xs font-semibold ${quizState.correct ? 'text-green-300' : 'text-red-300'}`}>{quizState.correct ? 'Correct!' : 'Not quite.'}</span>
                                    </div>
                                    <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                </div>
                            )}
                            {quizState.answered && (
                                <button onClick={nextQuestion} className="w-full bg-green-700 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">Next Question</button>
                            )}
                        </div>
                    </div>

                    {/* Call Tree + Memo Table */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <TrendingUp className="h-5 w-5 mr-2 text-green-400" /> Call Tree
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${useMemoization ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    {useMemoization ? 'MEMOIZED' : 'NAIVE'}
                                </span>
                            </div>

                            <div className="max-h-80 overflow-y-auto bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-5">
                                {currentState.callTree.length === 0 ? (
                                    <p className="text-slate-500 text-center py-10 text-sm">Click Play to see the call tree</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {currentState.callTree.map((call, index) => (
                                            <div key={index}
                                                className={`font-mono text-sm p-2.5 rounded-lg transition-all duration-300 ${index === currentState.callTree.length - 1
                                                    ? currentState.phase === 'cached'
                                                        ? 'bg-blue-500/20 border-2 border-blue-400 text-blue-300 animate-pulse'
                                                        : currentState.phase === 'forward'
                                                            ? 'bg-yellow-500/20 border-2 border-yellow-400 text-yellow-300 animate-pulse'
                                                            : 'bg-green-500/20 border-2 border-green-400 text-green-300'
                                                    : 'bg-slate-700/50 text-slate-400'}`}
                                                style={{ marginLeft: `${Math.min(index * 16, 120)}px` }}>
                                                <span className="font-bold">{call}</span>
                                                {index === currentState.callTree.length - 1 && currentState.result !== null && (
                                                    <span className="ml-3 text-green-400"> → {currentState.result}</span>
                                                )}
                                                {index === currentState.callTree.length - 1 && currentState.memoUsed && (
                                                    <span className="ml-2 text-blue-400 text-xs">[cached]</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Phase legend */}
                            <div className="bg-slate-800/40 rounded-lg p-3 mb-5">
                                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                                <div className="flex flex-wrap gap-3 text-xs">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-400"></span><span className="text-slate-300">Computing</span></span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/30 border border-green-400"></span><span className="text-slate-300">Returning</span></span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-400"></span><span className="text-slate-300">Cache hit</span></span>
                                </div>
                            </div>

                            {/* Memoization Table */}
                            {useMemoization && Object.keys(currentState.memoTable || {}).length > 0 && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                    <h4 className="text-base font-semibold text-blue-300 mb-3 flex items-center">
                                        <Database className="h-4 w-4 mr-2" /> Memoization Cache
                                    </h4>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {Object.entries(currentState.memoTable).map(([key, value]) => (
                                            <div key={key} className="bg-slate-800 border border-blue-500/30 rounded-lg p-2 text-center">
                                                <div className="font-mono text-xs text-blue-400">fib({key})</div>
                                                <div className="font-bold text-white text-sm">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                        <h4 className="font-bold text-red-400 text-sm mb-2">Naive Recursion</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-red-400" /> Time: O(2^n) exponential</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-red-400" /> {naiveCallCount(n)} calls for fib({n})</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-red-400" /> Recalculates same values repeatedly</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-red-400" /> Unusable for n &gt; 35</li>
                                        </ul>
                                    </div>
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Memoized</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Time: O(n) linear</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Only {n + 1} calls for fib({n})</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Each value computed once</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> {Math.round(naiveCallCount(n) / (n + 1))}x faster here</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-green-400 text-sm mb-3">Real-World Applications</h4>
                                    <ul className="text-slate-400 text-xs space-y-1.5">
                                        {[
                                            'Dynamic programming foundations',
                                            'Nature: flower petals, spiral shells',
                                            'Finance: Elliott wave theory',
                                            'Art: golden rectangle proportions',
                                            'Algorithm analysis: recursive trees',
                                            'Biology: population growth models'
                                        ].map(a => (
                                            <li key={a} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Code */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-green-400" /> Python</h3>
                        <CodeBlock code={codeExample} language="python" />
                    </div>
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-green-400" /> JavaScript</h3>
                        <CodeBlock code={jsCode} language="javascript" />
                    </div>
                </div>
            </div>
        </div>
    );
}
