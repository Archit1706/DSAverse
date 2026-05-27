"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Shuffle, SkipBack, SkipForward,
    Info, Brain, CheckCircle, XCircle, Code, ArrowLeftRight, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "How many permutations does an array of n distinct elements have?",
        options: ["2^n", "n²", "n!", "n·(n-1)"],
        correct: 2,
        explanation: "n! (n factorial). For position 0 there are n choices, for position 1 there are n-1 remaining choices, and so on: n × (n-1) × … × 1 = n!. For [1,2,3]: 3! = 6 permutations."
    },
    {
        question: "In swap-based backtracking, why do we swap back after recursing?",
        options: [
            "To find duplicates in the array",
            "To restore the array to its original order before trying the next choice",
            "To sort the array at each level",
            "Because the swap was incorrect"
        ],
        correct: 1,
        explanation: "We swap back (backtrack) to restore the array to the state before the choice was made. This lets the next loop iteration try a different element in the current position without interference from earlier choices."
    },
    {
        question: "At recursion depth d (0-indexed), how many elements are still 'free' to be placed?",
        options: ["d elements", "n - d elements", "n elements", "d + 1 elements"],
        correct: 1,
        explanation: "At depth d, positions 0..d-1 are already fixed (locked in by previous swaps). Only positions d..n-1 remain free. So there are n - d elements still available, matching the number of recursive calls made at that level."
    }
];

const generateSteps = (input) => {
    const steps = [];
    const allPerms = [];
    const arr = [...input];

    const permute = (arr, start) => {
        if (start === arr.length) {
            allPerms.push([...arr]);
            steps.push({
                arr: [...arr], start,
                swapA: -1, swapB: -1,
                allPerms: allPerms.map(p => [...p]),
                action: 'found',
                explanation: `Permutation found: [${arr.join(', ')}] — all positions filled.`
            });
            return;
        }

        for (let i = start; i < arr.length; i++) {
            if (i === start) {
                steps.push({
                    arr: [...arr], start,
                    swapA: start, swapB: i,
                    allPerms: allPerms.map(p => [...p]),
                    action: 'hold',
                    explanation: `Position ${start}: keeping ${arr[i]} here (no swap needed). Recurse into position ${start + 1}.`
                });
            } else {
                steps.push({
                    arr: [...arr], start,
                    swapA: start, swapB: i,
                    allPerms: allPerms.map(p => [...p]),
                    action: 'swap',
                    explanation: `Position ${start}: swapping arr[${start}]=${arr[start]} ↔ arr[${i}]=${arr[i]} to try ${arr[i]} here.`
                });
                [arr[start], arr[i]] = [arr[i], arr[start]];
                steps.push({
                    arr: [...arr], start,
                    swapA: start, swapB: i,
                    allPerms: allPerms.map(p => [...p]),
                    action: 'swapped',
                    explanation: `Swapped: [${arr.join(', ')}]. Position ${start} = ${arr[start]}. Recursing into position ${start + 1}.`
                });
            }

            permute(arr, start + 1);

            if (i !== start) {
                [arr[start], arr[i]] = [arr[i], arr[start]];
                steps.push({
                    arr: [...arr], start,
                    swapA: start, swapB: i,
                    allPerms: allPerms.map(p => [...p]),
                    action: 'backtrack',
                    explanation: `Backtrack: swapping back arr[${start}] ↔ arr[${i}]. Array restored: [${arr.join(', ')}].`
                });
            }
        }
    };

    steps.push({
        arr: [...arr], start: 0,
        swapA: -1, swapB: -1,
        allPerms: [],
        action: 'start',
        explanation: `Starting permutations of [${arr.join(', ')}]. We fix positions left-to-right by trying each remaining element.`
    });
    permute(arr, 0);
    return steps;
};

export default function PermutationsVisualizer() {
    const [inputArr, setInputArr] = useState([1, 2, 3]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(inputArr));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [inputArr]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const currentState = stepHistory[currentStep] || {
        arr: inputArr, start: 0, swapA: -1, swapB: -1,
        allPerms: [], action: 'start',
        explanation: 'Click Play to begin permutation generation.'
    };

    const shuffle = () => {
        const n = inputArr.length;
        const pool = Array.from({ length: 9 }, (_, i) => i + 1);
        const picked = [];
        while (picked.length < n) {
            const idx = Math.floor(Math.random() * pool.length);
            picked.push(pool.splice(idx, 1)[0]);
        }
        setInputArr(picked);
    };

    const setSize = (n) => {
        const base = [1, 2, 3, 4];
        setInputArr(base.slice(0, n));
    };

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) setCurrentStep(0);
        setIsPlaying(p => !p);
    };
    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(s => s + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const q = quizQuestions[quizState.current];
        const correct = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) {
            setQuizState(s => ({ ...s, complete: true }));
        } else {
            setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
        }
    };

    const getCellClass = (i) => {
        const { start, swapA, swapB, action } = currentState;
        if (action === 'found') return 'bg-purple-500 border-purple-400 text-white scale-105';
        if (i === swapA || i === swapB) {
            if (action === 'swap') return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
            if (action === 'swapped') return 'bg-orange-500 border-orange-400 text-white scale-110';
            if (action === 'backtrack') return 'bg-red-500/70 border-red-400 text-white scale-105';
            if (action === 'hold') return 'bg-blue-500 border-blue-400 text-white scale-110';
        }
        if (i < start) return 'bg-green-600 border-green-500 text-white';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const actionBadge = {
        start: 'bg-slate-700 text-slate-300',
        hold: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        swap: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
        swapped: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
        backtrack: 'bg-red-500/15 text-red-400 border border-red-500/30',
        found: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    };

    const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);

    const q = quizQuestions[quizState.current];

    const codeExample = `def permutations(nums):
    result = []

    def backtrack(start):
        if start == len(nums):
            result.append(nums[:])  # found a permutation
            return
        for i in range(start, len(nums)):
            nums[start], nums[i] = nums[i], nums[start]  # swap
            backtrack(start + 1)
            nums[start], nums[i] = nums[i], nums[start]  # swap back

    backtrack(0)
    return result

# [${inputArr.join(', ')}] → ${factorial(inputArr.length)} permutations`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Permutations</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Fix each position left-to-right via swaps, recurse, then swap back. Watch n! permutations emerge from systematic backtracking.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><ArrowLeftRight className="h-4 w-4" /> Swap-based backtracking</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Code className="h-4 w-4" /> O(n · n!) time</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Brain className="h-4 w-4" /> {factorial(inputArr.length)} permutations for n={inputArr.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Visualization */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <ArrowLeftRight className="h-5 w-5 text-green-400" /> Array State
                            </h3>

                            {/* Main array */}
                            <div className="flex justify-center gap-3 mb-6">
                                {currentState.arr.map((v, i) => (
                                    <div key={i} className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-bold text-lg transition-all duration-300 ${getCellClass(i)}`}>
                                        <span>{v}</span>
                                        <span className="text-xs font-normal opacity-60">[{i}]</span>
                                    </div>
                                ))}
                            </div>

                            {/* Position markers */}
                            <div className="flex justify-center gap-3 mb-6">
                                {currentState.arr.map((_, i) => {
                                    const isFixed = i < currentState.start;
                                    const isCurPos = i === currentState.start;
                                    return (
                                        <div key={i} className="w-14 text-center">
                                            <div className={`text-xs font-medium ${isFixed ? 'text-green-400' : isCurPos ? 'text-yellow-400' : 'text-slate-600'}`}>
                                                {isFixed ? '✓ fixed' : isCurPos ? '▲ here' : 'free'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Swap arrow visualization */}
                            {currentState.swapA !== -1 && currentState.swapB !== -1 && currentState.swapA !== currentState.swapB && (
                                <div className="flex justify-center mb-4">
                                    <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 flex items-center gap-2">
                                        <span className="text-yellow-400 font-mono">arr[{currentState.swapA}]</span>
                                        <ArrowLeftRight className="h-4 w-4 text-slate-500" />
                                        <span className="text-orange-400 font-mono">arr[{currentState.swapB}]</span>
                                    </div>
                                </div>
                            )}

                            {/* Explanation */}
                            <div className={`rounded-lg p-3 border ${currentState.action === 'backtrack' ? 'bg-red-500/10 border-red-500/20' :
                                currentState.action === 'found' ? 'bg-purple-500/10 border-purple-500/20' :
                                    'bg-green-500/10 border-green-500/20'}`}>
                                <div className="flex items-start gap-2">
                                    <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.action === 'backtrack' ? 'text-red-400' :
                                        currentState.action === 'found' ? 'text-purple-400' : 'text-green-400'}`} />
                                    <p className={`text-sm leading-relaxed ${currentState.action === 'backtrack' ? 'text-red-300' :
                                        currentState.action === 'found' ? 'text-purple-300' : 'text-green-300'}`}>
                                        {currentState.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Color Legend */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Color Legend</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {[
                                    ['bg-green-600 border-green-500', 'Fixed position'],
                                    ['bg-blue-500 border-blue-400', 'Hold (no swap)'],
                                    ['bg-yellow-400 border-yellow-300', 'Before swap'],
                                    ['bg-orange-500 border-orange-400', 'After swap'],
                                    ['bg-red-500/70 border-red-400', 'Backtrack (swap back)'],
                                    ['bg-purple-500 border-purple-400', 'Permutation found'],
                                ].map(([cls, label]) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${cls}`} />
                                        <span className="text-xs text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Found Permutations */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-base font-bold text-white mb-3">
                                Permutations Found: <span className="text-purple-400">{currentState.allPerms.length}</span>
                                <span className="text-slate-500 font-normal text-sm ml-2">/ {factorial(inputArr.length)} total</span>
                            </h3>
                            <div className="flex flex-wrap gap-2 min-h-[36px]">
                                {currentState.allPerms.length === 0 && (
                                    <span className="text-slate-600 text-sm italic">None found yet...</span>
                                )}
                                {currentState.allPerms.map((p, i) => (
                                    <span key={i} className="bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-lg text-xs font-mono">
                                        [{p.join(',')}]
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Code className="h-5 w-5 text-green-400" /> Swap-Based Backtracking (Python)
                            </h3>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Array size</label>
                                    <div className="flex gap-2">
                                        {[2, 3, 4].map(n => (
                                            <button key={n} onClick={() => setSize(n)} disabled={isPlaying}
                                                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${inputArr.length === n ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                                n={n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={shuffle} disabled={isPlaying}
                                    className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <Shuffle className="h-4 w-4" /> Shuffle Values
                                </button>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms / step</label>
                                    <input type="range" min="200" max="2000" step="100" value={speed}
                                        onChange={e => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Fast</span><span>Slow</span></div>
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
                                        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm">
                                        <SkipBack className="h-4 w-4 mr-1" /> Prev
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep === stepHistory.length - 1 || isPlaying}
                                        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm">
                                        Next <SkipForward className="h-4 w-4 ml-1" />
                                    </button>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span><span>{currentStep + 1} / {stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${stepHistory.length ? ((currentStep + 1) / stepHistory.length) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step info */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Current State</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Fixing position</span>
                                    <span className="text-green-300 font-mono">{currentState.start}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Fixed so far</span>
                                    <span className="text-green-300 font-mono">
                                        {currentState.start === 0 ? 'none' : `[${currentState.arr.slice(0, currentState.start).join(',')}]`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Action</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionBadge[currentState.action] || 'bg-slate-700 text-slate-400'}`}>
                                        {currentState.action.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Found</span>
                                    <span className="text-purple-300 font-mono">{currentState.allPerms.length} / {factorial(inputArr.length)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Complexity</h3>
                            <div className="space-y-2">
                                {[
                                    ['Time', 'O(n · n!)', 'green'],
                                    ['Space', 'O(n)', 'emerald'],
                                    ['Permutations', `${inputArr.length}! = ${factorial(inputArr.length)}`, 'purple'],
                                ].map(([label, val, color]) => (
                                    <div key={label} className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">{label}</span>
                                        <code className={`text-${color}-400 text-xs bg-${color}-500/10 px-2 py-0.5 rounded`}>{val}</code>
                                    </div>
                                ))}
                                <div className="mt-3 text-xs text-slate-500 leading-relaxed">
                                    <ChevronRight className="h-3 w-3 inline text-green-500 mr-1" />Used in: scheduling tasks, anagram generation, brute-force search, combinatorics problems.
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-green-500/30 shadow-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="h-5 w-5 text-green-400" />
                                <h3 className="text-base font-bold text-white">Test Yourself</h3>
                                {!quizState.complete && (
                                    <span className="ml-auto text-xs text-slate-500">Q{quizState.current + 1}/{quizQuestions.length}</span>
                                )}
                            </div>
                            {quizState.complete ? (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-green-400 mb-2">{quizState.score}/{quizQuestions.length}</div>
                                    <p className="text-slate-400 text-sm mb-3">
                                        {quizState.score === quizQuestions.length ? 'Perfect! You understand permutation backtracking.' : 'Good effort! Watch the swap steps carefully.'}
                                    </p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="bg-green-700 hover:bg-green-600 text-white py-1.5 px-4 rounded-lg text-xs font-medium transition-colors">
                                        Retry Quiz
                                    </button>
                                </div>
                            ) : (
                                <>
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
                                        <>
                                            <div className={`rounded-lg p-3 mb-2 ${quizState.selected === q.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {quizState.selected === q.correct
                                                        ? <CheckCircle className="h-4 w-4 text-green-400" />
                                                        : <XCircle className="h-4 w-4 text-red-400" />}
                                                    <span className={`text-xs font-semibold ${quizState.selected === q.correct ? 'text-green-300' : 'text-red-300'}`}>
                                                        {quizState.selected === q.correct ? 'Correct!' : 'Not quite.'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                            </div>
                                            <button onClick={nextQuestion} className="w-full bg-green-700 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">
                                                {quizState.current + 1 >= quizQuestions.length ? 'See Score' : 'Next Question'}
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
