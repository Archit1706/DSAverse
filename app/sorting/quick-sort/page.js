"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is Quick Sort's average case time complexity?",
        options: ["O(n)", "O(n²)", "O(n log n)", "O(log n)"],
        correct: 2,
        explanation: "On average, Quick Sort's partitioning splits the array into two roughly equal halves each time, resulting in O(n log n) comparisons."
    },
    {
        question: "When does Quick Sort degrade to O(n²)?",
        options: ["When data is uniformly distributed", "When the pivot is always the median", "When the pivot is always the smallest or largest element", "When the array has duplicates"],
        correct: 2,
        explanation: "If the pivot is always the minimum or maximum element (e.g., already sorted array with last-element pivot), partitioning creates one subarray of size n-1 and one empty — leading to O(n²)."
    },
    {
        question: "Is Quick Sort a stable sorting algorithm?",
        options: ["Yes, always", "No, equal elements can change relative order", "Only with random pivot selection", "Only in the average case"],
        correct: 1,
        explanation: "Quick Sort is not stable. During partitioning, equal elements can be moved past each other, changing their relative order."
    }
];

const QuickSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateQuickSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            pivot: -1, partitionStart: -1, partitionEnd: -1, i: -1, j: -1,
            comparing: [], swapping: [], sorted: [], leftPartition: [], rightPartition: [],
            phase: 'start',
            explanation: "Starting Quick Sort: Using divide-and-conquer by selecting a pivot and partitioning the array around it.",
            level: 0, callStack: [`quickSort(0, ${n - 1})`]
        });

        function partition(arr, low, high, level, steps, callStack) {
            const pivot = arr[high];
            let i = low - 1;

            steps.push({
                array: [...tempArr],
                pivot: high, partitionStart: low, partitionEnd: high, i, j: low,
                comparing: [], swapping: [], sorted: [], leftPartition: [], rightPartition: [],
                phase: 'pivot_selected',
                explanation: `Selected pivot: ${pivot} at position ${high}. Now partitioning array from ${low} to ${high}.`,
                level, callStack: [...callStack]
            });

            for (let j = low; j < high; j++) {
                steps.push({
                    array: [...tempArr],
                    pivot: high, partitionStart: low, partitionEnd: high, i, j,
                    comparing: [j], swapping: [], sorted: [],
                    leftPartition: Array.from({ length: Math.max(0, i - low + 1) }, (_, idx) => low + idx),
                    rightPartition: Array.from({ length: j - Math.max(low, i + 1) }, (_, idx) => Math.max(low, i + 1) + idx),
                    phase: 'comparing',
                    explanation: `Comparing ${arr[j]} at position ${j} with pivot ${pivot}. ${arr[j] <= pivot ? `${arr[j]} ≤ ${pivot}, goes to left partition.` : `${arr[j]} > ${pivot}, stays in right partition.`}`,
                    level, callStack: [...callStack]
                });

                if (arr[j] <= pivot) {
                    i++;
                    if (i !== j) {
                        steps.push({
                            array: [...tempArr],
                            pivot: high, partitionStart: low, partitionEnd: high, i, j,
                            comparing: [], swapping: [i, j], sorted: [],
                            leftPartition: Array.from({ length: i - low }, (_, idx) => low + idx),
                            rightPartition: Array.from({ length: j - i }, (_, idx) => i + 1 + idx),
                            phase: 'swapping',
                            explanation: `Swapping ${arr[i]} and ${arr[j]} to move ${arr[j]} to the left partition.`,
                            level, callStack: [...callStack]
                        });

                        [arr[i], arr[j]] = [arr[j], arr[i]];
                        tempArr = [...arr];

                        steps.push({
                            array: [...tempArr],
                            pivot: high, partitionStart: low, partitionEnd: high, i, j,
                            comparing: [], swapping: [], sorted: [],
                            leftPartition: Array.from({ length: i - low + 1 }, (_, idx) => low + idx),
                            rightPartition: Array.from({ length: j - i }, (_, idx) => i + 1 + idx),
                            phase: 'swapped',
                            explanation: `Swapped! ${arr[i]} is now in the left partition.`,
                            level, callStack: [...callStack]
                        });
                    } else {
                        steps.push({
                            array: [...tempArr],
                            pivot: high, partitionStart: low, partitionEnd: high, i, j,
                            comparing: [], swapping: [], sorted: [],
                            leftPartition: Array.from({ length: i - low + 1 }, (_, idx) => low + idx),
                            rightPartition: Array.from({ length: j - i }, (_, idx) => i + 1 + idx),
                            phase: 'no_swap_needed',
                            explanation: `${arr[j]} is already in correct position in left partition.`,
                            level, callStack: [...callStack]
                        });
                    }
                }
            }

            steps.push({
                array: [...tempArr],
                pivot: high, partitionStart: low, partitionEnd: high, i, j: -1,
                comparing: [], swapping: [i + 1, high], sorted: [],
                leftPartition: Array.from({ length: Math.max(0, i - low + 1) }, (_, idx) => low + idx),
                rightPartition: Array.from({ length: high - i - 1 }, (_, idx) => i + 2 + idx),
                phase: 'placing_pivot',
                explanation: `Placing pivot ${pivot} in its correct position by swapping with element at position ${i + 1}.`,
                level, callStack: [...callStack]
            });

            [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
            tempArr = [...arr];

            steps.push({
                array: [...tempArr],
                pivot: -1, partitionStart: -1, partitionEnd: -1, i: -1, j: -1,
                comparing: [], swapping: [], sorted: [i + 1],
                leftPartition: Array.from({ length: Math.max(0, i - low + 1) }, (_, idx) => low + idx),
                rightPartition: Array.from({ length: high - i - 1 }, (_, idx) => i + 2 + idx),
                phase: 'pivot_placed',
                explanation: `Pivot ${arr[i + 1]} is now in its final sorted position ${i + 1}! Left side has elements ≤ ${arr[i + 1]}, right side has elements > ${arr[i + 1]}.`,
                level, callStack: [...callStack]
            });

            return i + 1;
        }

        function quickSort(arr, low, high, level, steps, callStack) {
            if (low < high) {
                const newCallStack = [...callStack, `quickSort(${low}, ${high})`];
                const pi = partition(arr, low, high, level, steps, newCallStack);

                const allSorted = [];
                for (let step of steps) allSorted.push(...step.sorted);
                const uniqueSorted = [...new Set(allSorted)];

                if (low < pi - 1) {
                    steps.push({
                        array: [...tempArr],
                        pivot: -1, partitionStart: low, partitionEnd: pi - 1, i: -1, j: -1,
                        comparing: [], swapping: [], sorted: uniqueSorted,
                        leftPartition: Array.from({ length: pi - low }, (_, idx) => low + idx),
                        rightPartition: [],
                        phase: 'recursive_left',
                        explanation: `Recursively sorting left subarray from ${low} to ${pi - 1}.`,
                        level: level + 1, callStack: [...newCallStack, `quickSort(${low}, ${pi - 1})`]
                    });
                    quickSort(arr, low, pi - 1, level + 1, steps, [...newCallStack, `quickSort(${low}, ${pi - 1})`]);
                }

                if (pi + 1 < high) {
                    steps.push({
                        array: [...tempArr],
                        pivot: -1, partitionStart: pi + 1, partitionEnd: high, i: -1, j: -1,
                        comparing: [], swapping: [], sorted: uniqueSorted,
                        leftPartition: [],
                        rightPartition: Array.from({ length: high - pi }, (_, idx) => pi + 1 + idx),
                        phase: 'recursive_right',
                        explanation: `Recursively sorting right subarray from ${pi + 1} to ${high}.`,
                        level: level + 1, callStack: [...newCallStack, `quickSort(${pi + 1}, ${high})`]
                    });
                    quickSort(arr, pi + 1, high, level + 1, steps, [...newCallStack, `quickSort(${pi + 1}, ${high})`]);
                }
            }
        }

        quickSort(tempArr, 0, n - 1, 0, steps, []);

        steps.push({
            array: [...tempArr],
            pivot: -1, partitionStart: -1, partitionEnd: -1, i: -1, j: -1,
            comparing: [], swapping: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            leftPartition: [], rightPartition: [],
            phase: 'complete',
            explanation: "Quick Sort complete! All elements are now in their correct sorted positions through partitioning.",
            level: 0, callStack: []
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateQuickSortSteps(array);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [array]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const timer = setTimeout(() => setCurrentStep(prev => prev + 1), speed);
            return () => clearTimeout(timer);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, currentStep, stepHistory, speed]);

    const startVisualization = () => setIsPlaying(true);
    const pauseVisualization = () => setIsPlaying(false);
    const resetVisualization = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(prev => prev + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const generateNewArray = () => { setArray(Array.from({ length: 7 }, () => Math.floor(Math.random() * 90) + 10)); setIsPlaying(false); setCurrentStep(0); };
    const resetToOriginal = () => { setArray([...originalArray]); setIsPlaying(false); setCurrentStep(0); };

    const currentState = stepHistory[currentStep] || {
        array, pivot: -1, partitionStart: -1, partitionEnd: -1, i: -1, j: -1,
        comparing: [], swapping: [], sorted: [], leftPartition: [], rightPartition: [],
        phase: 'start',
        explanation: 'Click Play to begin the Quick Sort visualization',
        level: 0, callStack: []
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.pivot === index) return 'bg-red-500 border-red-600 transform scale-110';
        if (currentState.swapping.includes(index)) return 'bg-purple-500 border-purple-600 animate-pulse';
        if (currentState.comparing.includes(index)) return 'bg-yellow-400 border-yellow-500 transform scale-105';
        if (currentState.i === index || currentState.j === index) return 'bg-blue-500 border-blue-600';
        if (currentState.leftPartition.includes(index)) return 'bg-cyan-400 border-cyan-500';
        if (currentState.rightPartition.includes(index)) return 'bg-pink-400 border-pink-500';
        if (index >= currentState.partitionStart && index <= currentState.partitionEnd && currentState.partitionStart !== -1) return 'bg-amber-300 border-amber-400';
        return 'bg-orange-400 border-orange-500';
    };

    const maxValue = Math.max(...currentState.array);

    const handleQuizAnswer = (optionIndex) => {
        if (quizState.answered) return;
        const correct = optionIndex === quizQuestions[quizState.current].correct;
        setQuizState(prev => ({ ...prev, selected: optionIndex, answered: true, score: correct ? prev.score + 1 : prev.score }));
    };

    const nextQuestion = () => {
        if (quizState.current < quizQuestions.length - 1) {
            setQuizState(prev => ({ ...prev, current: prev.current + 1, selected: null, answered: false }));
        } else {
            setQuizState(prev => ({ ...prev, complete: true }));
        }
    };

    const resetQuiz = () => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const codeExample = `def quick_sort(arr, low=0, high=None):
    if high is None:
        high = len(arr) - 1

    if low < high:
        pivot_index = partition(arr, low, high)
        quick_sort(arr, low, pivot_index - 1)
        quick_sort(arr, pivot_index + 1, high)

def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1

    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/sorting" className="flex items-center text-white hover:text-orange-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Sorting
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Quick Sort Visualizer</h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Quick Sort uses divide-and-conquer by partitioning around a pivot element to efficiently sort the array.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n log n) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: No</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">In-place: Yes</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={isPlaying ? pauseVisualization : startVisualization} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium" disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={stepBackward} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}>
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={stepForward} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}>
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={resetVisualization} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={generateNewArray} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Randomize
                                </button>
                                <button onClick={resetToOriginal} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">
                                    Original Array
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="500" max="3000" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-orange-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (500ms)</span><span>Slow (3000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Progress: Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Level {currentState.level} | Phase: {currentState.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}></div>
                                </div>
                                {currentState.callStack.length > 0 && (
                                    <div className="mt-3 p-2 bg-slate-800/60 rounded text-xs text-slate-300">
                                        <strong>Call Stack:</strong> {currentState.callStack.join(' → ')}
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <div className="flex items-end justify-center gap-2 h-64 p-4 bg-slate-800/60 rounded-lg border-2 border-slate-700/60">
                                    {currentState.array.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className={`w-12 transition-all duration-500 border-2 rounded-t-lg ${getBarColor(index)}`} style={{ height: `${(value / maxValue) * 200}px` }} />
                                            <span className="text-sm mt-2 font-medium text-slate-300">{value}</span>
                                            <span className="text-xs text-slate-500">{index}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
                                    {[['bg-orange-400 border-orange-500', 'Unsorted'], ['bg-red-500 border-red-600', 'Pivot'], ['bg-amber-300 border-amber-400', 'Partition Range'], ['bg-cyan-400 border-cyan-500', 'Left (≤ pivot)'], ['bg-pink-400 border-pink-500', 'Right (> pivot)'], ['bg-blue-500 border-blue-600', 'Pointers'], ['bg-yellow-400 border-yellow-500', 'Comparing'], ['bg-purple-500 border-purple-600', 'Swapping'], ['bg-green-500 border-green-600', 'Sorted']].map(([color, label]) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <div className={`w-4 h-4 ${color} border rounded`}></div>
                                            <span className="text-slate-300">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-orange-300 mb-1">Current Step</h3>
                                        <p className="text-orange-200 leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-orange-500" />
                                <h3 className="font-bold text-white">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Best Case:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n log n)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Average Case:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n log n)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Worst Case:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(log n)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Stable:</span><span className="bg-red-500/15 text-red-400 px-2 py-1 rounded">No</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">In-place:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use Quick Sort</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Large datasets with good pivot selection</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Memory-constrained environments (in-place)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Cache-efficient sorting needed</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>When worst-case O(n²) is unacceptable</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>When stability is required</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
                                    <button onClick={resetQuiz} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((option, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-orange-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleQuizAnswer(i)} className={cls}>{option}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(!showCode)} className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium">
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

export default QuickSortPage;
