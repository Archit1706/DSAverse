'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const INITIAL_ARRAY = [2, 3, 4, 10, 40, 43, 56, 67, 78, 89, 99];
const INITIAL_TARGET = 10;

const quizQuestions = [
    {
        question: "What is the key advantage of Fibonacci search over binary search in terms of operations used?",
        options: [
            "It finds the target in fewer comparisons",
            "It uses addition/subtraction instead of division to compute the probe index",
            "It works on unsorted arrays",
            "It uses less memory"
        ],
        correct: 1,
        explanation: "Fibonacci search computes the probe index using offset + fibM2 (addition only). Binary search uses (left+right)//2 (division). On older hardware without a hardware divider, avoiding division gave a real performance benefit."
    },
    {
        question: "What is the time complexity of Fibonacci search?",
        options: [
            "O(1)",
            "O(log n)",
            "O(sqrt(n))",
            "O(n)"
        ],
        correct: 1,
        explanation: "Fibonacci search is O(log n) — the Fibonacci numbers grow exponentially, so the algorithm eliminates a constant fraction of the remaining search space each step, just like binary search."
    },
    {
        question: "After each comparison in Fibonacci search, the eliminated portion is approximately what fraction of the remaining space?",
        options: [
            "1/2",
            "1/3",
            "1/phi^2 approx 38% or 62%",
            "1/4"
        ],
        correct: 2,
        explanation: "Because fibM2/fibM = 1/phi^2 = 0.382 and fibM1/fibM = 1/phi = 0.618, Fibonacci search eliminates roughly 38% or 62% of the remaining range per step (depending on comparison result), compared to binary search's exact 50%."
    }
];

const codeString = `def fibonacci_search(arr, target):
    """O(log n) time, O(1) space — uses addition instead of division"""
    n = len(arr)

    # Find smallest Fibonacci >= n
    fib_m2, fib_m1, fib_m = 0, 1, 1
    while fib_m < n:
        fib_m2, fib_m1 = fib_m1, fib_m
        fib_m = fib_m2 + fib_m1

    offset = -1  # marks eliminated left portion

    while fib_m > 1:
        # Probe index: offset + fib_m2 (uses only addition!)
        i = min(offset + fib_m2, n - 1)

        if arr[i] < target:
            fib_m, fib_m1, fib_m2 = fib_m1, fib_m2, fib_m1 - fib_m2
            offset = i          # eliminate left up to i
        elif arr[i] > target:
            fib_m, fib_m1, fib_m2 = fib_m2, fib_m1 - fib_m2, fib_m - fib_m1
        else:
            return i            # found!

    # Check last element
    if fib_m1 and offset + 1 < n and arr[offset + 1] == target:
        return offset + 1

    return -1`;

function buildInitialFibs(n) {
    let fm2 = 0, fm1 = 1, fm = 1;
    while (fm < n) {
        const next = fm2 + fm1;
        fm2 = fm1;
        fm1 = fm;
        fm = next;
    }
    return { fm2, fm1, fm };
}

function generateSteps(arr, target) {
    const steps = [];
    const n = arr.length;

    const initial = buildInitialFibs(n);
    let fm2 = initial.fm2;
    let fm1 = initial.fm1;
    let fm = initial.fm;
    let offset = -1;

    steps.push({
        array: arr,
        fibM: fm,
        fibM1: fm1,
        fibM2: fm2,
        offset: offset,
        compareIndex: -1,
        found: false,
        foundIndex: -1,
        explanation: `Starting Fibonacci search for ${target}. Built Fibonacci numbers up to ${fm} (>= array length ${n}). fibM2=${fm2}, fibM1=${fm1}, fibM=${fm}.`
    });

    while (fm > 1) {
        const i = Math.min(offset + fm2, n - 1);

        steps.push({
            array: arr,
            fibM: fm,
            fibM1: fm1,
            fibM2: fm2,
            offset: offset,
            compareIndex: i,
            found: false,
            foundIndex: -1,
            explanation: `Compare index: offset(${offset}) + fibM2(${fm2}) = ${i}. Checking arr[${i}]=${arr[i]} vs target=${target}.`
        });

        if (arr[i] === target) {
            steps.push({
                array: arr,
                fibM: fm,
                fibM1: fm1,
                fibM2: fm2,
                offset: offset,
                compareIndex: i,
                found: true,
                foundIndex: i,
                explanation: `Found! arr[${i}] = ${arr[i]} equals target ${target}. Search complete.`
            });
            return steps;
        } else if (arr[i] < target) {
            const newFm = fm1;
            const newFm1 = fm2;
            const newFm2 = fm1 - fm2;
            steps.push({
                array: arr,
                fibM: newFm,
                fibM1: newFm1,
                fibM2: newFm2,
                offset: i,
                compareIndex: i,
                found: false,
                foundIndex: -1,
                explanation: `arr[${i}]=${arr[i]} < ${target}. Eliminate left portion. Move offset to ${i}. New fibM2=${newFm2}, fibM1=${newFm1}, fibM=${newFm}.`
            });
            fm = newFm;
            fm1 = newFm1;
            fm2 = newFm2;
            offset = i;
        } else {
            const newFm = fm2;
            const newFm1 = fm1 - fm2;
            const newFm2 = fm - fm1;
            steps.push({
                array: arr,
                fibM: newFm,
                fibM1: newFm1,
                fibM2: newFm2,
                offset: offset,
                compareIndex: i,
                found: false,
                foundIndex: -1,
                explanation: `arr[${i}]=${arr[i]} > ${target}. Eliminate right portion. New fibM2=${newFm2}, fibM1=${newFm1}, fibM=${newFm}.`
            });
            fm = newFm;
            fm1 = newFm1;
            fm2 = newFm2;
        }
    }

    // Check last element
    if (fm1 && offset + 1 < n && arr[offset + 1] === target) {
        steps.push({
            array: arr,
            fibM: fm,
            fibM1: fm1,
            fibM2: fm2,
            offset: offset,
            compareIndex: offset + 1,
            found: true,
            foundIndex: offset + 1,
            explanation: `Checking final element at index ${offset + 1} (value ${arr[offset + 1]}). Found target ${target}!`
        });
        return steps;
    }

    steps.push({
        array: arr,
        fibM: fm,
        fibM1: fm1,
        fibM2: fm2,
        offset: offset,
        compareIndex: -1,
        found: false,
        foundIndex: -1,
        explanation: `Target ${target} not found in array.`
    });
    return steps;
}

export default function FibonacciSearchPage() {
    const [arr] = useState(INITIAL_ARRAY);
    const [target] = useState(INITIAL_TARGET);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(arr, target));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [arr, target]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const currentState = stepHistory[currentStep] || {
        fibM: 0, fibM1: 0, fibM2: 0, offset: -1,
        compareIndex: -1, found: false, foundIndex: -1, explanation: ''
    };

    const getColor = (i) => {
        if (i === currentState.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === currentState.compareIndex && currentState.compareIndex !== -1)
            return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i <= currentState.offset && currentState.offset >= 0)
            return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };

    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const resetQuiz = () => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Fibonacci Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            A sorted-array search that uses Fibonacci numbers and only addition — no division required.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-100">Array Visualization</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-400 text-sm">Target:</span>
                                    <span className="bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1 rounded-lg font-mono font-bold">{target}</span>
                                </div>
                            </div>

                            {/* Fibonacci Trio Display */}
                            <div className="mb-4 flex gap-3 justify-center flex-wrap">
                                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono">
                                    <span className="text-slate-500">fibM2=</span>
                                    <span className="text-orange-400 font-bold">{currentState.fibM2}</span>
                                </div>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono">
                                    <span className="text-slate-500">fibM1=</span>
                                    <span className="text-yellow-400 font-bold">{currentState.fibM1}</span>
                                </div>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono">
                                    <span className="text-slate-500">fibM=</span>
                                    <span className="text-red-400 font-bold">{currentState.fibM}</span>
                                </div>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono">
                                    <span className="text-slate-500">offset=</span>
                                    <span className="text-blue-400 font-bold">{currentState.offset}</span>
                                </div>
                            </div>

                            {/* Probe index formula */}
                            {currentState.compareIndex !== -1 && (
                                <div className="mb-3 text-center text-xs text-slate-400 font-mono">
                                    Compare index: offset({currentState.offset}) + fibM2({currentState.fibM2}) = <span className="text-yellow-400">{currentState.compareIndex}</span>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <div className="flex gap-2 pb-4 min-w-max mx-auto justify-center">
                                    {arr.map((val, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 font-mono text-sm font-bold transition-all duration-300 ${getColor(i)}`}>
                                                {val}
                                            </div>
                                            <div className="h-3 flex items-center justify-center">
                                                {i === currentState.compareIndex && currentState.foundIndex === -1 && (
                                                    <div className="w-2 h-1 bg-yellow-400 rounded mx-auto" />
                                                )}
                                                {i === currentState.foundIndex && (
                                                    <div className="w-2 h-1 bg-green-400 rounded mx-auto" />
                                                )}
                                            </div>
                                            <span className="text-slate-600 text-xs font-mono">{i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fibonacci sequence reference */}
                            <div className="mt-2 bg-slate-800 rounded-lg p-3">
                                <p className="text-xs text-slate-500">Fibonacci sequence: <span className="text-slate-400 font-mono">0, 1, 1, 2, 3, 5, 8, 13, 21, ...</span></p>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Color Legend</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-700 border border-slate-600 flex-shrink-0" /><span className="text-slate-400">Unchecked</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-300 flex-shrink-0" /><span className="text-slate-400">Being compared</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 flex-shrink-0" /><span className="text-slate-400">Eliminated left</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500 border border-green-400 flex-shrink-0" /><span className="text-slate-400">Found</span></div>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <p className="text-red-300 text-sm leading-relaxed">
                                {currentState.explanation || 'Press Play to start the visualization.'}
                            </p>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-700 space-y-4">
                            <div className="flex items-center gap-2 justify-center flex-wrap">
                                <button
                                    onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                                    title="Reset"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setIsPlaying(p => !p)}
                                    className="px-6 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                    disabled={currentStep >= stepHistory.length - 1}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors"
                                    title="Stop"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </div>

                            <div>
                                <label className="text-slate-400 text-xs mb-1 block">Speed: {speed}ms delay</label>
                                <input
                                    type="range"
                                    min={200}
                                    max={2000}
                                    step={100}
                                    value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))}
                                    className="w-full accent-red-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>Fast</span><span>Slow</span>
                                </div>
                            </div>

                            <div className="text-center text-slate-400 text-xs">
                                Step {currentStep + 1} of {stepHistory.length}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="h-4 w-4 text-red-400" />
                                <h2 className="text-lg font-semibold text-slate-100">About Fibonacci Search</h2>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                Fibonacci search uses Fibonacci numbers to divide the array into unequal parts. The key insight
                                is that the probe index is computed as offset + fibM2, using only addition — no division needed.
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                After each comparison, the Fibonacci triple (fibM2, fibM1, fibM) is updated by shifting:
                                move left or right depending on whether the target is smaller or larger.
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                Each step eliminates roughly 38% or 62% of the remaining range (vs 50% for binary search), due to
                                the golden ratio properties of Fibonacci numbers.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Time Complexity</div>
                                    <div className="text-green-400 font-mono font-bold">O(log n)</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Space Complexity</div>
                                    <div className="text-green-400 font-mono font-bold">O(1)</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Requires</div>
                                    <div className="text-yellow-400 text-sm font-semibold">Sorted Array</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Key Feature</div>
                                    <div className="text-yellow-400 text-sm font-semibold">No Division</div>
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-100 mb-4">Active Recall Quiz</h2>
                            {quizState.complete ? (
                                <div className="text-center space-y-3">
                                    <CheckCircle className="h-10 w-10 text-green-400 mx-auto" />
                                    <p className="text-slate-200 font-semibold">Quiz Complete!</p>
                                    <p className="text-slate-400 text-sm">Score: {quizState.score} / {quizQuestions.length}</p>
                                    <button onClick={resetQuiz} className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm transition-colors">
                                        Retry Quiz
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-slate-500">Question {quizState.current + 1} of {quizQuestions.length}</span>
                                        <span className="text-xs text-slate-500">Score: {quizState.score}</span>
                                    </div>
                                    <p className="text-slate-200 text-sm mb-4 leading-relaxed">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, idx) => {
                                            let cls = 'w-full text-left px-4 py-3 rounded-lg text-sm border transition-all ';
                                            if (!quizState.answered) {
                                                cls += 'border-slate-700 bg-slate-800 text-slate-300 hover:border-red-500/50 hover:bg-slate-700';
                                            } else if (idx === quizQuestions[quizState.current].correct) {
                                                cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            } else if (idx === quizState.selected) {
                                                cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            } else {
                                                cls += 'border-slate-700 bg-slate-800 text-slate-500';
                                            }
                                            return (
                                                <button key={idx} className={cls} onClick={() => handleQuizAnswer(idx)}>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-slate-400 text-xs leading-relaxed">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="w-full py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm transition-colors">
                                                {quizState.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Code Block */}
                        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setShowCode(p => !p)}
                                className="w-full flex items-center justify-between px-5 py-4 text-slate-200 hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4 text-red-400" />
                                    <span className="font-semibold text-sm">Python Implementation</span>
                                </div>
                                <span className="text-slate-400 text-xs">{showCode ? 'Hide' : 'Show'}</span>
                            </button>
                            {showCode && (
                                <div className="px-5 pb-5">
                                    <CodeBlock code={codeString} language="python" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
