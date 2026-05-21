'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What precondition is required for binary search to work correctly?",
        options: ["The array must have an even number of elements", "The array must be sorted", "The array must contain unique elements", "The array must be stored in a hash table"],
        correct: 1,
        explanation: "Binary search relies on the sorted order to decide which half to keep. If the array is unsorted, comparing with the middle element gives no information about where the target is — the algorithm would be incorrect."
    },
    {
        question: "How does binary search reduce the search space on each step?",
        options: ["It eliminates one element at a time", "It eliminates all elements smaller than the target", "It eliminates roughly half the remaining elements", "It sorts the remaining elements before the next step"],
        correct: 2,
        explanation: "Each comparison with the midpoint eliminates either the left half or the right half of the current search range. After k steps, at most n / 2^k elements remain — this is why the time complexity is O(log n)."
    },
    {
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
        correct: 2,
        explanation: "Binary search halves the search space each step. Starting with n elements, after log₂n halvings only 1 remains. Total comparisons: O(log n). It's O(1) best case (target is the first midpoint checked)."
    }
];

export default function BinarySearchPage() {
    const [array, setArray] = useState([2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 78]);
    const [target, setTarget] = useState(23);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const arr = array;
        let left = 0, right = arr.length - 1;
        let found = false, foundIndex = -1, comparisons = 0;

        steps.push({ left, right, mid: -1, found: false, foundIndex: -1, explanation: `Binary search for ${target} in sorted array [${arr.join(', ')}]. Search range: [0, ${arr.length - 1}].`, comparisons: 0 });

        while (left <= right && !found) {
            const mid = Math.floor((left + right) / 2);
            comparisons++;

            steps.push({ left, right, mid, found: false, foundIndex: -1, explanation: `Range [${left}, ${right}]. Mid = floor((${left}+${right})/2) = ${mid}. Checking arr[${mid}] = ${arr[mid]}.`, comparisons });

            if (arr[mid] === target) {
                found = true; foundIndex = mid;
                steps.push({ left, right, mid, found: true, foundIndex, explanation: `arr[${mid}] = ${arr[mid]} equals target ${target}. Found at index ${mid}!`, comparisons });
            } else if (arr[mid] < target) {
                steps.push({ left, right, mid, found: false, foundIndex: -1, explanation: `arr[${mid}] = ${arr[mid]} < ${target}. Target must be in right half. Move left to ${mid + 1}.`, comparisons });
                left = mid + 1;
            } else {
                steps.push({ left, right, mid, found: false, foundIndex: -1, explanation: `arr[${mid}] = ${arr[mid]} > ${target}. Target must be in left half. Move right to ${mid - 1}.`, comparisons });
                right = mid - 1;
            }
        }

        if (!found) {
            steps.push({ left, right, mid: -1, found: false, foundIndex: -1, explanation: `Search space empty (left ${left} > right ${right}). Target ${target} not found after ${comparisons} comparisons.`, comparisons });
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
        const arr = Array.from({ length: 11 }, (_, i) => (i + 1) * Math.floor(Math.random() * 8 + 3)).sort((a, b) => a - b);
        const unique = [...new Set(arr)].slice(0, 11);
        setArray(unique);
        setIsPlaying(false); setCurrentStep(0);
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

    const cur = stepHistory[currentStep] || { left: 0, right: array.length - 1, mid: -1, found: false, foundIndex: -1, explanation: 'Ready — press Play or step through.', comparisons: 0 };

    const getColor = (i) => {
        if (i === cur.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.mid && cur.mid !== -1) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i >= cur.left && i <= cur.right && cur.left !== -1 && !cur.found)
            return 'bg-red-800/50 border-red-700 text-slate-200';
        return 'bg-slate-800 border-slate-700 text-slate-500';
    };

    const getLabelBelow = (i) => {
        if (cur.foundIndex === i) return { text: 'FOUND', cls: 'text-green-400' };
        if (i === cur.mid && cur.mid !== -1) return { text: 'M', cls: 'text-yellow-400' };
        if (i === cur.left && cur.left === cur.right) return { text: 'L=R', cls: 'text-orange-400' };
        if (i === cur.left) return { text: 'L', cls: 'text-orange-400' };
        if (i === cur.right) return { text: 'R', cls: 'text-orange-400' };
        return null;
    };

    const code = `def binary_search(arr, target):
    """O(log n) time, O(1) space — requires sorted array"""
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2  # integer division

        if arr[mid] == target:
            return mid          # found at index mid
        elif arr[mid] < target:
            left = mid + 1      # target in right half
        else:
            right = mid - 1     # target in left half

    return -1  # not found

# Recursive version
def binary_search_recursive(arr, target, left=0, right=None):
    if right is None:
        right = len(arr) - 1
    if left > right:
        return -1
    mid = (left + right) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        return binary_search_recursive(arr, target, mid + 1, right)
    else:
        return binary_search_recursive(arr, target, left, mid - 1)

arr = [2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 78]
print(binary_search(arr, 23))  # 5`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Binary Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            Repeatedly halve the search space by comparing the target with the middle element.
                            Requires a sorted array but finds in O(log n) — the gold standard for sorted data.
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
                                    <label className="text-sm text-slate-400 whitespace-nowrap">Target:</label>
                                    <input type="number" value={target}
                                        onChange={e => { setTarget(parseInt(e.target.value) || 0); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                                </div>
                                <button onClick={generateRandom}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm">
                                    <Shuffle className="h-4 w-4" /> Random Sorted
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                    disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs text-slate-400">Speed</span>
                                    <input type="range" min={150} max={1800} step={50} value={1950 - speed}
                                        onChange={e => setSpeed(1950 - Number(e.target.value))}
                                        className="w-24 accent-red-500" />
                                </div>
                            </div>

                            {/* Array with labels */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {array.map((val, i) => {
                                        const lbl = getLabelBelow(i);
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <span className="text-xs text-slate-500">{i}</span>
                                                <div className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 font-bold text-sm transition-all duration-300 ${getColor(i)}`}>
                                                    {val}
                                                </div>
                                                {lbl && <span className={`text-xs font-bold ${lbl.cls}`}>{lbl.text}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Range indicator */}
                                {cur.left !== -1 && !cur.found && cur.mid !== -1 && (
                                    <p className="text-center text-xs text-slate-400 mt-3">
                                        Search range: [{cur.left}, {cur.right}] — Mid = {cur.mid}
                                    </p>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[['bg-yellow-400', 'Midpoint (M)'], ['bg-green-500', 'Found'], ['bg-red-800/50 border-red-700', 'Search range'], ['bg-slate-800', 'Eliminated']].map(([cls, label]) => (
                                    <span key={label} className="flex items-center gap-1.5">
                                        <span className={`w-3 h-3 rounded border border-slate-600 inline-block ${cls}`} />{label}
                                    </span>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['Target', target], ['Comparisons', cur.comparisons], ['Step', `${currentStep + 1}/${stepHistory.length}`]].map(([label, val]) => (
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
                                {[['Best Case', 'O(1)', 'green'], ['Worst Case', 'O(log n)', 'green'], ['Average', 'O(log n)', 'green'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-base font-bold text-${color}-400`}>{val}</div>
                                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">How It Works</h2>
                            <ol className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold">1</span><span>Set left=0, right=n-1 (entire array in range)</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold">2</span><span>Compute mid = floor((left + right) / 2)</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold">3</span><span>If arr[mid] == target: done. If arr[mid] &lt; target: left = mid+1. Else: right = mid-1</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold">4</span><span>Repeat until left &gt; right (not found) or target located</span></li>
                            </ol>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Applications</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Database index lookups (B-tree search)</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Standard library: Python bisect, Java Arrays.binarySearch</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Finding insertion points in sorted lists</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Answer binary search (search on answer space, not array)</span></li>
                            </ul>
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
                                    {quizState.answered && (
                                        <button onClick={nextQuestion} className="mt-3 text-sm text-red-400 hover:text-red-300">
                                            {quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}
                                        </button>
                                    )}
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
                            <button onClick={() => setShowCode(v => !v)}
                                className="flex items-center gap-2 text-lg font-bold text-slate-100 w-full mb-3 hover:text-red-400 transition-colors">
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
