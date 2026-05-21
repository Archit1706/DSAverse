'use client';
import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the optimal block/jump size for jump search on an array of size n?",
        options: ["n / 2", "log n", "√n", "n / 3"],
        correct: 2,
        explanation: "Block size √n minimises total comparisons. Phase 1 takes at most √n jumps; phase 2 takes at most √n steps. Total: O(√n). Mathematically, minimising n/k + k (block scan + linear scan) gives k = √n as the optimal point."
    },
    {
        question: "After finding the right block in phase 1, what technique does phase 2 use?",
        options: ["Another jump search", "Binary search", "Linear search", "Interpolation"],
        correct: 2,
        explanation: "Phase 2 uses linear search within the identified block. Since the block has at most √n elements, the linear scan is O(√n). Combined with O(√n) block scan, total complexity is O(√n)."
    },
    {
        question: "Jump search requires the input array to be:",
        options: ["Unsorted", "Sorted", "Sorted with no duplicates", "Stored as a linked list"],
        correct: 1,
        explanation: "Jump search requires a sorted array. It compares the target with block endpoints (arr[step-1], arr[2*step-1],...) to decide which block to search. Without sorted order, endpoint comparisons give no information about where the target lies."
    }
];

export default function JumpSearchPage() {
    const [array, setArray] = useState([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
    const [target, setTarget] = useState(15);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const arr = array;
        const n = arr.length;
        const jumpSize = Math.floor(Math.sqrt(n));
        let step = jumpSize, prev = 0, found = false, foundIndex = -1, comparisons = 0;

        steps.push({
            jumpSize, currentIndex: -1, blockStart: 0, blockEnd: -1,
            phase: 'jump', found: false, foundIndex: -1,
            explanation: `Array size n=${n}. Jump size = floor(sqrt(${n})) = ${jumpSize}. Phase 1: jump to block endpoints to find the target block.`,
            comparisons: 0
        });

        while (step <= n && arr[Math.min(step, n) - 1] < target) {
            const checkIdx = Math.min(step, n) - 1;
            comparisons++;
            steps.push({
                jumpSize, currentIndex: checkIdx, blockStart: prev, blockEnd: checkIdx,
                phase: 'jump', found: false, foundIndex: -1,
                explanation: `Jump to index ${checkIdx}: arr[${checkIdx}]=${arr[checkIdx]} < ${target}. Target not in this block. Jump forward.`,
                comparisons
            });
            prev = step;
            step += jumpSize;
        }

        const blockStart = prev;
        const blockEnd = Math.min(step, n) - 1;
        comparisons++;

        steps.push({
            jumpSize, currentIndex: blockEnd, blockStart, blockEnd,
            phase: 'linear', found: false, foundIndex: -1,
            explanation: `arr[${blockEnd}]=${arr[blockEnd]} >= ${target}. Target is in block [${blockStart}, ${blockEnd}]. Phase 2: linear scan within block.`,
            comparisons
        });

        for (let i = blockStart; i <= Math.min(step - 1, n - 1); i++) {
            comparisons++;
            const isMatch = arr[i] === target;
            steps.push({
                jumpSize, currentIndex: i, blockStart, blockEnd,
                phase: 'linear', found: false, foundIndex: -1,
                explanation: `Linear scan index ${i}: arr[${i}]=${arr[i]} ${isMatch ? '== ' : '!='} ${target}${isMatch ? ' — match found!' : ''}`,
                comparisons
            });
            if (isMatch) {
                found = true; foundIndex = i;
                steps.push({
                    jumpSize, currentIndex: i, blockStart, blockEnd,
                    phase: 'done', found: true, foundIndex,
                    explanation: `Target ${target} found at index ${foundIndex} after ${comparisons} comparisons.`,
                    comparisons
                });
                break;
            }
            if (arr[i] > target) break;
        }

        if (!found) {
            steps.push({
                jumpSize, currentIndex: -1, blockStart, blockEnd,
                phase: 'done', found: false, foundIndex: -1,
                explanation: `Target ${target} not found after ${comparisons} comparisons.`,
                comparisons
            });
        }
        return steps;
    }, [array, target]);

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); }, [generateSteps]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const generateRandom = () => {
        const base = Array.from({ length: 15 }, (_, i) => (i + 1) * (Math.floor(Math.random() * 3) + 1) + i);
        const arr = [...new Set(base)].sort((a, b) => a - b).slice(0, 15);
        setArray(arr); setIsPlaying(false); setCurrentStep(0);
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

    const jSize = Math.floor(Math.sqrt(array.length));
    const cur = stepHistory[currentStep] || {
        jumpSize: jSize, currentIndex: -1, blockStart: 0, blockEnd: -1,
        phase: 'jump', found: false, foundIndex: -1,
        explanation: 'Ready — press Play or step through manually.', comparisons: 0
    };

    const getColor = (i) => {
        if (i === cur.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.currentIndex) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (cur.phase === 'linear' && i >= cur.blockStart && i <= cur.blockEnd)
            return 'bg-orange-700/40 border-orange-600 text-slate-200';
        if (cur.blockStart > 0 && i < cur.blockStart) return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const code = `import math

def jump_search(arr, target):
    """O(√n) time, O(1) space — requires sorted array"""
    n = len(arr)
    step = int(math.sqrt(n))  # optimal block size
    prev = 0

    # Phase 1: find block containing target
    while step <= n and arr[min(step, n) - 1] < target:
        prev = step
        step += int(math.sqrt(n))

    # Phase 2: linear scan within the identified block
    for i in range(prev, min(step, n)):
        if arr[i] == target:
            return i
        if arr[i] > target:
            break

    return -1  # not found

arr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]
print(jump_search(arr, 15))  # 7`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Jump Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            Jump ahead in steps of √n to find the right block, then scan linearly within it.
                            O(√n) — faster than linear, simpler than binary.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ── Left ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Visualization</h2>

                            <div className="flex flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-slate-400">Target:</label>
                                    <input type="number" value={target}
                                        onChange={e => { setTarget(parseInt(e.target.value) || 0); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                                </div>
                                <button onClick={generateRandom} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm">
                                    <Shuffle className="h-4 w-4" /> Random
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs text-slate-400">Speed</span>
                                    <input type="range" min={150} max={1800} step={50} value={1950 - speed}
                                        onChange={e => setSpeed(1950 - Number(e.target.value))} className="w-24 accent-red-500" />
                                </div>
                            </div>

                            {/* Phase badges */}
                            <div className="flex gap-2 mb-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cur.phase === 'jump' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                    Phase 1: Jump
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cur.phase === 'linear' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                    Phase 2: Linear
                                </span>
                                {cur.found && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30">Found</span>}
                            </div>

                            {/* Array */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 overflow-x-auto">
                                <div className="flex gap-1 min-w-fit justify-center">
                                    {array.map((val, i) => {
                                        const isBlockBoundary = cur.jumpSize > 0 && (i + 1) % cur.jumpSize === 0 && i < array.length - 1;
                                        return (
                                            <React.Fragment key={i}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs text-slate-500">{i}</span>
                                                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 font-bold text-xs transition-all duration-300 ${getColor(i)}`}>
                                                        {val}
                                                    </div>
                                                    {i === cur.currentIndex && <div className="w-2 h-1 bg-yellow-400 rounded" />}
                                                </div>
                                                {isBlockBoundary && <div className="w-px self-stretch bg-red-500/40 mx-0.5" />}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                                <p className="text-center text-xs text-slate-500 mt-2">
                                    Jump size = sqrt({array.length}) = {cur.jumpSize} | Red lines = block boundaries
                                </p>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[['bg-yellow-400', 'Active check'], ['bg-green-500', 'Found'], ['bg-orange-700/40', 'Active block'], ['bg-slate-800', 'Eliminated']].map(([cls, label]) => (
                                    <span key={label} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded border border-slate-600 inline-block ${cls}`} />{label}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['Target', target], ['Comparisons', cur.comparisons], ['Jump Size', cur.jumpSize]].map(([label, val]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-base font-bold text-red-400">{val}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-300 text-sm leading-relaxed">{cur.explanation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right ── */}
                    <div className="space-y-5">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Best Case', 'O(1)', 'green'], ['Worst / Avg', 'O(√n)', 'yellow'], ['Space', 'O(1)', 'green'], ['Requires', 'Sorted', 'slate']].map(([label, val, color]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-base font-bold text-${color}-400`}>{val}</div>
                                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Why √n Is Optimal</h2>
                            <p className="text-sm text-slate-300 mb-3">If block size = k:</p>
                            <ul className="space-y-1.5 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Phase 1 (block scan): at most n/k jumps</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Phase 2 (linear scan): at most k steps</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Total: n/k + k — minimised when k = √n</span></li>
                            </ul>
                            <div className="mt-3 bg-slate-800/60 rounded p-3 text-xs text-slate-400 font-mono">
                                n=100 → block size = 10<br />Phase 1: ~10 jumps | Phase 2: ~10 steps
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Active Recall Quiz</h2>
                            {!quizState.complete ? (
                                <div>
                                    <p className="text-xs text-slate-400 mb-3">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, idx) => (
                                            <button key={idx} onClick={() => handleQuizAnswer(idx)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                                                    !quizState.answered ? 'border-slate-600 bg-slate-800 hover:border-red-500 hover:bg-red-500/10 text-slate-200'
                                                    : idx === quizQuestions[quizState.current].correct ? 'border-green-500 bg-green-500/10 text-green-300'
                                                    : idx === quizState.selected ? 'border-red-500 bg-red-500/10 text-red-300'
                                                    : 'border-slate-700 bg-slate-800/50 text-slate-500'
                                                }`}>
                                                <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                                            </button>
                                        ))}
                                    </div>
                                    {quizState.answered && (
                                        <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${quizState.selected === quizQuestions[quizState.current].correct ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                                            {quizState.selected === quizQuestions[quizState.current].correct ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                                            <span>{quizQuestions[quizState.current].explanation}</span>
                                        </div>
                                    )}
                                    {quizState.answered && <button onClick={nextQuestion} className="mt-3 text-sm text-red-400 hover:text-red-300">{quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}</button>}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                                    <div className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : quizState.score >= 2 ? 'Well done!' : 'Keep practicing!'}</div>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="text-sm text-red-400 hover:text-red-300">Retry quiz</button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(v => !v)} className="flex items-center gap-2 text-lg font-bold text-slate-100 w-full mb-3 hover:text-red-400 transition-colors">
                                <Code className="h-5 w-5 text-red-400" /> Implementation
                                <span className="text-xs text-slate-500 ml-auto">{showCode ? 'hide' : 'show'}</span>
                            </button>
                            {showCode && <CodeBlock code={code} language="python" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
