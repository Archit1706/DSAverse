'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const INITIAL_ARRAY = [1, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65];
const INITIAL_TARGET = 25;

const quizQuestions = [
    {
        question: "Ternary search divides the search space into how many parts each iteration?",
        options: ["2", "3", "4", "log n"],
        correct: 1,
        explanation: "Ternary search uses two midpoints (mid1 and mid2) to divide the range [left, right] into three equal thirds. Depending on the comparisons, one third is eliminated each iteration."
    },
    {
        question: "How many element comparisons does ternary search make per iteration?",
        options: ["1", "2", "3", "log n"],
        correct: 1,
        explanation: "Ternary search compares the target against arr[mid1] AND arr[mid2] each iteration — 2 comparisons per step. Binary search makes only 1 comparison per step."
    },
    {
        question: "Despite dividing into 3 parts per step, ternary search is not faster than binary search. Why?",
        options: [
            "Arrays must be much larger for it to matter",
            "2 comparisons x log3(n) steps is approximately 1.26 x log2(n), worse than 1 x log2(n) for binary",
            "Ternary search has more memory overhead",
            "Ternary search cannot find elements at odd indices"
        ],
        correct: 1,
        explanation: "Total comparisons: ternary = 2 x log3(n) = 2 x 0.631 x log2(n) = 1.26 x log2(n), binary = 1 x log2(n). Ternary search actually makes MORE total comparisons despite halving fewer times. Binary search wins in practice."
    }
];

const codeString = `def ternary_search(arr, target):
    """O(log3 n) iterations, but 2 comparisons each — O(log n) overall"""
    left, right = 0, len(arr) - 1

    while left <= right:
        # Divide into three equal thirds
        third = (right - left) // 3
        mid1 = left + third
        mid2 = right - third

        if arr[mid1] == target:
            return mid1
        if arr[mid2] == target:
            return mid2

        if target < arr[mid1]:
            right = mid1 - 1        # target in left third
        elif target > arr[mid2]:
            left = mid2 + 1         # target in right third
        else:
            left = mid1 + 1         # target in middle third
            right = mid2 - 1

    return -1

# Note: Not faster than binary search in practice
# Binary: 1 comparison x log2 n steps
# Ternary: 2 comparisons x log3 n steps = 1.26 x log2 n total
arr = [1, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50]
print(ternary_search(arr, 25))  # 6`;

function generateSteps(arr, target) {
    const steps = [];
    const n = arr.length;
    let left = 0;
    let right = n - 1;

    steps.push({
        array: arr,
        left, right, mid1: -1, mid2: -1,
        found: false, foundIndex: -1,
        explanation: `Starting ternary search for ${target}. Initial range: L=${left}, R=${right}. Will divide range into 3 parts each iteration.`
    });

    while (left <= right) {
        const third = Math.floor((right - left) / 3);
        const mid1 = left + third;
        const mid2 = right - third;

        steps.push({
            array: arr, left, right, mid1, mid2,
            found: false, foundIndex: -1,
            explanation: `Range [${left}, ${right}]: third=(${right}-${left})//3=${third}. mid1=${left}+${third}=${mid1} (val=${arr[mid1]}), mid2=${right}-${third}=${mid2} (val=${arr[mid2]}).`
        });

        if (arr[mid1] === target) {
            steps.push({
                array: arr, left, right, mid1, mid2,
                found: true, foundIndex: mid1,
                explanation: `arr[${mid1}] = ${arr[mid1]} equals target ${target}. Found at index ${mid1}!`
            });
            return steps;
        }

        if (arr[mid2] === target) {
            steps.push({
                array: arr, left, right, mid1, mid2,
                found: true, foundIndex: mid2,
                explanation: `arr[${mid2}] = ${arr[mid2]} equals target ${target}. Found at index ${mid2}!`
            });
            return steps;
        }

        if (target < arr[mid1]) {
            steps.push({
                array: arr, left, right: mid1 - 1, mid1, mid2,
                found: false, foundIndex: -1,
                explanation: `${target} < arr[${mid1}]=${arr[mid1]}. Target is in the LEFT third. New range: [${left}, ${mid1 - 1}].`
            });
            right = mid1 - 1;
        } else if (target > arr[mid2]) {
            steps.push({
                array: arr, left: mid2 + 1, right, mid1, mid2,
                found: false, foundIndex: -1,
                explanation: `${target} > arr[${mid2}]=${arr[mid2]}. Target is in the RIGHT third. New range: [${mid2 + 1}, ${right}].`
            });
            left = mid2 + 1;
        } else {
            steps.push({
                array: arr, left: mid1 + 1, right: mid2 - 1, mid1, mid2,
                found: false, foundIndex: -1,
                explanation: `arr[${mid1}]=${arr[mid1]} < ${target} < arr[${mid2}]=${arr[mid2]}. Target is in the MIDDLE third. New range: [${mid1 + 1}, ${mid2 - 1}]. Note: ternary uses 2 comparisons per step vs 1 for binary search.`
            });
            left = mid1 + 1;
            right = mid2 - 1;
        }
    }

    steps.push({
        array: arr, left, right, mid1: -1, mid2: -1,
        found: false, foundIndex: -1,
        explanation: `Target ${target} not found. Search range exhausted.`
    });
    return steps;
}

export default function TernarySearchPage() {
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
        left: 0, right: arr.length - 1, mid1: -1, mid2: -1,
        found: false, foundIndex: -1, explanation: ''
    };

    const getColor = (i) => {
        if (i === currentState.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === currentState.mid1 && currentState.mid1 !== -1) return 'bg-purple-500 border-purple-400 text-white scale-110';
        if (i === currentState.mid2 && currentState.mid2 !== -1) return 'bg-orange-500 border-orange-400 text-slate-900 scale-110';
        if (i >= currentState.left && i <= currentState.right && currentState.left !== -1)
            return 'bg-red-800/50 border-red-700 text-slate-200';
        return 'bg-slate-800 border-slate-700 text-slate-500';
    };

    const getLabel = (i) => {
        if (i === currentState.foundIndex) return null;
        const labels = [];
        if (i === currentState.left && currentState.left !== -1) labels.push({ text: 'L', color: 'text-orange-400' });
        if (i === currentState.mid1 && currentState.mid1 !== -1) labels.push({ text: 'M1', color: 'text-purple-400' });
        if (i === currentState.mid2 && currentState.mid2 !== -1) labels.push({ text: 'M2', color: 'text-orange-400' });
        if (i === currentState.right && currentState.right !== -1) labels.push({ text: 'R', color: 'text-orange-400' });
        return labels.length ? labels : null;
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Ternary Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            Divides the search space into three parts per iteration using two midpoints — but is it actually faster?
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

                            {/* Range Info */}
                            {currentState.left !== undefined && currentState.left !== -1 && (
                                <div className="mb-4 text-center text-xs text-slate-400 bg-slate-800 rounded-lg py-2 px-4">
                                    Search range: [<span className="text-orange-400 font-mono">{currentState.left}</span>, <span className="text-orange-400 font-mono">{currentState.right}</span>]
                                    {currentState.mid1 !== -1 && (
                                        <span className="ml-2">— divides into 3 parts</span>
                                    )}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <div className="flex gap-1.5 pb-2 min-w-max mx-auto justify-center">
                                    {arr.map((val, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 font-mono text-xs font-bold transition-all duration-300 ${getColor(i)}`}>
                                                {val}
                                            </div>
                                            <div className="h-4 flex items-center justify-center">
                                                {i === currentState.foundIndex ? (
                                                    <div className="w-2 h-1 bg-green-400 rounded mx-auto" />
                                                ) : (
                                                    getLabel(i) && (
                                                        <div className="flex gap-0.5">
                                                            {getLabel(i).map((l, li) => (
                                                                <span key={li} className={`text-xs font-bold font-mono leading-none ${l.color}`}>{l.text}</span>
                                                            ))}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                            <span className="text-slate-600 text-xs font-mono">{i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Color Legend</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-purple-500 border border-purple-400 flex-shrink-0" /><span className="text-slate-400">M1 (first midpoint)</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500 border border-orange-400 flex-shrink-0" /><span className="text-slate-400">M2 (second midpoint)</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-800 border border-red-700 flex-shrink-0" /><span className="text-slate-400">In search range</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 flex-shrink-0" /><span className="text-slate-400">Eliminated</span></div>
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
                                <h2 className="text-lg font-semibold text-slate-100">About Ternary Search</h2>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                Ternary search splits the search range into three equal thirds using two midpoints (mid1 and mid2).
                                Each iteration makes 2 comparisons and eliminates one third of the remaining range.
                            </p>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                                <p className="text-yellow-300 text-xs leading-relaxed font-semibold mb-1">Why ternary is not faster than binary:</p>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    Binary: 1 comparison x log2(n) steps = log2(n) total<br />
                                    Ternary: 2 comparisons x log3(n) steps = 2 x 0.631 x log2(n) = 1.26 x log2(n) total<br />
                                    Ternary makes more comparisons overall despite dividing into 3 parts!
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Time Complexity</div>
                                    <div className="text-green-400 font-mono font-bold">O(log n)</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Comparisons/step</div>
                                    <div className="text-yellow-400 font-mono font-bold">2 (vs 1 binary)</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Requires</div>
                                    <div className="text-yellow-400 text-sm font-semibold">Sorted Array</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Space</div>
                                    <div className="text-green-400 font-mono font-bold">O(1)</div>
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
