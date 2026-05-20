"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the time complexity of naive recursive Fibonacci (no memoization)?",
        options: ["O(n)", "O(n log n)", "O(2ⁿ)", "O(n²)"],
        correct: 2,
        explanation: "Without memoization every call to fib(n) spawns two more calls — fib(n-1) and fib(n-2). The resulting recursion tree has ~2ⁿ nodes, giving O(2ⁿ) time."
    },
    {
        question: "What is the time complexity WITH memoization?",
        options: ["O(2ⁿ)", "O(n log n)", "O(n)", "O(log n)"],
        correct: 2,
        explanation: "With memoization each unique value fib(0)…fib(n) is computed exactly once and cached. Every subsequent lookup is O(1), giving O(n) total."
    },
    {
        question: "Which DP paradigm does memoization belong to?",
        options: ["Bottom-up tabulation", "Top-down memoization", "Greedy approach", "Divide and conquer"],
        correct: 1,
        explanation: "Memoization is top-down DP — we start at the original problem, recurse toward base cases, and cache results along the way."
    }
];

const FibonacciPage = () => {
    const [n, setN] = useState(6);
    const [originalN] = useState(6);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateFibonacciSteps = (num) => {
        const steps = [];
        const memo = {};
        const callStack = [];
        const computedValues = {};

        steps.push({
            memo: { ...memo }, callStack: [...callStack], computed: { ...computedValues },
            currentCall: -1, result: null,
            explanation: `Starting Fibonacci calculation for F(${num}) using memoization. Computed values will be stored to avoid redundant recursion.`,
            phase: 'start',
            sequence: Array.from({ length: num + 1 }, () => null)
        });

        const fibHelper = (n, depth = 0) => {
            callStack.push({ n, depth, id: Math.random() });
            steps.push({
                memo: { ...memo }, callStack: [...callStack], computed: { ...computedValues },
                currentCall: n, result: null,
                explanation: `Calling fibonacci(${n}) at recursion depth ${depth}.`,
                phase: 'call',
                sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] !== undefined ? memo[i] : null)
            });

            if (n <= 1) {
                memo[n] = n;
                computedValues[n] = n;
                steps.push({
                    memo: { ...memo }, callStack: [...callStack], computed: { ...computedValues },
                    currentCall: n, result: n,
                    explanation: `Base case: F(${n}) = ${n}. Storing in memo table.`,
                    phase: 'base_case',
                    sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] !== undefined ? memo[i] : null)
                });
                callStack.pop();
                return n;
            }

            if (memo[n] !== undefined) {
                steps.push({
                    memo: { ...memo }, callStack: [...callStack], computed: { ...computedValues },
                    currentCall: n, result: memo[n],
                    explanation: `Memo hit! F(${n}) = ${memo[n]} (already computed — no recursion needed).`,
                    phase: 'memo_hit',
                    sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] !== undefined ? memo[i] : null)
                });
                callStack.pop();
                return memo[n];
            }

            steps.push({
                memo: { ...memo }, callStack: [...callStack], computed: { ...computedValues },
                currentCall: n, result: null,
                explanation: `Computing F(${n}) = F(${n - 1}) + F(${n - 2}). Recursing into both subproblems.`,
                phase: 'computing',
                sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] !== undefined ? memo[i] : null)
            });

            const r1 = fibHelper(n - 1, depth + 1);
            const r2 = fibHelper(n - 2, depth + 1);
            const result = r1 + r2;
            memo[n] = result;
            computedValues[n] = result;

            steps.push({
                memo: { ...memo }, callStack: [...callStack], computed: { ...computedValues },
                currentCall: n, result,
                explanation: `Computed F(${n}) = F(${n - 1}) + F(${n - 2}) = ${r1} + ${r2} = ${result}. Stored in memo table.`,
                phase: 'computed',
                sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] !== undefined ? memo[i] : null)
            });
            callStack.pop();
            return result;
        };

        fibHelper(num);
        steps.push({
            memo: { ...memo }, callStack: [], computed: { ...computedValues },
            currentCall: -1, result: memo[num],
            explanation: `Fibonacci complete! F(${num}) = ${memo[num]}. Memoization reduced time from O(2ⁿ) to O(n).`,
            phase: 'complete',
            sequence: Array.from({ length: num + 1 }, (_, i) => memo[i] !== undefined ? memo[i] : null)
        });

        return steps;
    };

    useEffect(() => {
        setStepHistory(generateFibonacciSteps(n));
        setCurrentStep(0);
    }, [n]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const currentState = stepHistory[currentStep] || {
        memo: {}, callStack: [], computed: {}, currentCall: -1, result: null,
        explanation: 'Click Play to begin', phase: 'start',
        sequence: Array.from({ length: n + 1 }, () => null)
    };

    const getSeqColor = (index, value) => {
        if (value === null) return 'bg-slate-700 text-slate-500 border-slate-600';
        if (index === currentState.currentCall) return 'bg-rose-500 text-white border-rose-400 transform scale-110';
        if (currentState.computed[index] !== undefined) return 'bg-rose-600 text-white border-rose-500';
        return 'bg-rose-900/60 text-rose-300 border-rose-800';
    };

    const getMemoColor = (index) => {
        const val = currentState.memo[index];
        if (val === undefined) return 'bg-slate-700 text-slate-500 border-slate-600';
        if (index === currentState.currentCall) return 'bg-rose-500 text-white border-rose-400';
        return 'bg-rose-700 text-rose-100 border-rose-600';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `def fibonacci(n, memo={}):
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo)
    return memo[n]

# Iterative (bottom-up tabulation)
def fibonacci_iterative(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]

# Space-optimized O(1) space
def fibonacci_optimal(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Fibonacci Numbers Visualizer</h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch how memoization eliminates redundant calls in the Fibonacci recursion tree, transforming O(2ⁿ) into O(n).
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">With memo: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Without memo: O(2ⁿ)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Top-down DP</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => isPlaying ? setIsPlaying(false) : setIsPlaying(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium" disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}>
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}>
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={() => { setN(Math.floor(Math.random() * 8) + 3); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    Random N
                                </button>
                                <button onClick={() => { setN(originalN); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">
                                    Original N
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Calculate Fibonacci of: {n}</label>
                                <input type="range" min="3" max="12" value={n} onChange={e => setN(Number(e.target.value))} className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>F(3)</span><span>F(12)</span></div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (300ms)</span><span>Slow (2000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Progress: Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Phase: {currentState.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Fibonacci Sequence */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Fibonacci Sequence</h3>
                                <div className="flex flex-wrap gap-2 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {currentState.sequence.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className="text-xs text-slate-500 mb-1">F({index})</div>
                                            <div className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${getSeqColor(index, value)}`}>
                                                {value !== null ? value : '?'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Call Stack */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Recursion Stack</h3>
                                <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/60 min-h-[100px]">
                                    {currentState.callStack.length === 0 ? (
                                        <div className="text-slate-500 text-center py-6 text-sm">Call stack is empty</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {[...currentState.callStack].reverse().map((call, index) => (
                                                <div key={call.id} className="bg-slate-800 p-2.5 rounded border-l-4 border-rose-400" style={{ marginLeft: `${call.depth * 12}px` }}>
                                                    <span className="font-mono text-rose-300 text-sm font-semibold">fibonacci({call.n})</span>
                                                    <span className="text-slate-500 text-xs ml-2">depth {call.depth}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Memo Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Memoization Cache</h3>
                                <div className="grid grid-cols-4 md:grid-cols-7 gap-2 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {Array.from({ length: n + 1 }, (_, i) => i).map(i => (
                                        <div key={i} className="text-center">
                                            <div className="text-xs text-slate-500 mb-1">memo[{i}]</div>
                                            <div className={`h-10 rounded border flex items-center justify-center text-sm font-bold transition-all duration-500 ${getMemoColor(i)}`}>
                                                {currentState.memo[i] !== undefined ? currentState.memo[i] : '—'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Step explanation */}
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-300 mb-1">Current Step</h3>
                                        <p className="text-rose-200 text-sm leading-relaxed">{currentState.explanation}</p>
                                        {currentState.result !== null && currentState.phase === 'complete' && (
                                            <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 font-medium text-sm">
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
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">With Memo:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Without Memo:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(2ⁿ)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded">Top-down DP</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Memoization Benefits</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Eliminates redundant calculations</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Transforms exponential to linear time</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Preserves natural recursive structure</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Trade-off: uses O(n) extra space</span></li>
                            </ul>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-rose-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FibonacciPage;
