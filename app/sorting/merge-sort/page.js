"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is Merge Sort's space complexity?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: 2,
        explanation: "Merge Sort requires O(n) auxiliary space to hold the temporary subarrays during the merge step, making it not in-place unlike Heap or Quick Sort."
    },
    {
        question: "What algorithmic paradigm does Merge Sort use?",
        options: ["Greedy", "Dynamic Programming", "Divide and Conquer", "Backtracking"],
        correct: 2,
        explanation: "Merge Sort uses divide-and-conquer: divide the array in half, recursively sort each half, then merge the two sorted halves back together."
    },
    {
        question: "Is Merge Sort stable?",
        options: ["No", "Yes, always", "Only for small inputs", "Only with extra memory"],
        correct: 1,
        explanation: "Merge Sort is stable because the merge step preserves the relative order of equal elements — when two elements are equal it takes from the left subarray first."
    }
];

const MergeSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateMergeSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            leftSection: [], rightSection: [], merging: [], sorted: [],
            currentLeft: -1, currentRight: -1,
            phase: 'start',
            explanation: "Starting Merge Sort: Using divide-and-conquer. First divide the array into halves, then merge them back in sorted order.",
            level: 0, totalLevels: Math.ceil(Math.log2(n))
        });

        function mergeSort(arr, left, right, level, steps) {
            if (left >= right) return;
            const mid = Math.floor((left + right) / 2);

            steps.push({
                array: [...tempArr],
                leftSection: Array.from({ length: mid - left + 1 }, (_, i) => left + i),
                rightSection: Array.from({ length: right - mid }, (_, i) => mid + 1 + i),
                merging: [], sorted: [],
                currentLeft: left, currentRight: right,
                phase: 'divide',
                explanation: `Dividing array from index ${left} to ${right}. Split at index ${mid}. Left: [${left}...${mid}], Right: [${mid + 1}...${right}]`,
                level, totalLevels: Math.ceil(Math.log2(n))
            });

            mergeSort(arr, left, mid, level + 1, steps);
            mergeSort(arr, mid + 1, right, level + 1, steps);
            merge(arr, left, mid, right, level, steps);
        }

        function merge(arr, left, mid, right, level, steps) {
            const leftArr = [];
            const rightArr = [];
            for (let i = left; i <= mid; i++) leftArr.push(tempArr[i]);
            for (let i = mid + 1; i <= right; i++) rightArr.push(tempArr[i]);

            steps.push({
                array: [...tempArr],
                leftSection: Array.from({ length: mid - left + 1 }, (_, i) => left + i),
                rightSection: Array.from({ length: right - mid }, (_, i) => mid + 1 + i),
                merging: Array.from({ length: right - left + 1 }, (_, i) => left + i),
                sorted: [], currentLeft: -1, currentRight: -1,
                phase: 'merge_start',
                explanation: `Starting merge of left [${leftArr.join(', ')}] and right [${rightArr.join(', ')}]`,
                level, totalLevels: Math.ceil(Math.log2(n))
            });

            let i = 0, j = 0, k = left;
            while (i < leftArr.length && j < rightArr.length) {
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [], currentLeft: left + i, currentRight: mid + 1 + j,
                    phase: 'merging',
                    explanation: `Comparing ${leftArr[i]} (left) with ${rightArr[j]} (right). ${leftArr[i] <= rightArr[j] ? `${leftArr[i]} ≤ ${rightArr[j]}, take from left` : `${leftArr[i]} > ${rightArr[j]}, take from right`}`,
                    level, totalLevels: Math.ceil(Math.log2(n))
                });

                if (leftArr[i] <= rightArr[j]) { tempArr[k] = leftArr[i]; i++; }
                else { tempArr[k] = rightArr[j]; j++; }

                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [k], currentLeft: left + i, currentRight: mid + 1 + j,
                    phase: 'placing',
                    explanation: `Placed ${tempArr[k]} at position ${k}`,
                    level, totalLevels: Math.ceil(Math.log2(n))
                });
                k++;
            }

            while (i < leftArr.length) {
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [], currentLeft: left + i, currentRight: -1,
                    phase: 'copying_left',
                    explanation: `Copying remaining element ${leftArr[i]} from left subarray to position ${k}`,
                    level, totalLevels: Math.ceil(Math.log2(n))
                });
                tempArr[k] = leftArr[i];
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [k], currentLeft: -1, currentRight: -1,
                    phase: 'placed',
                    explanation: `Placed ${tempArr[k]} at position ${k}`,
                    level, totalLevels: Math.ceil(Math.log2(n))
                });
                i++; k++;
            }

            while (j < rightArr.length) {
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [], currentLeft: -1, currentRight: mid + 1 + j,
                    phase: 'copying_right',
                    explanation: `Copying remaining element ${rightArr[j]} from right subarray to position ${k}`,
                    level, totalLevels: Math.ceil(Math.log2(n))
                });
                tempArr[k] = rightArr[j];
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [k], currentLeft: -1, currentRight: -1,
                    phase: 'placed',
                    explanation: `Placed ${tempArr[k]} at position ${k}`,
                    level, totalLevels: Math.ceil(Math.log2(n))
                });
                j++; k++;
            }

            steps.push({
                array: [...tempArr],
                leftSection: [], rightSection: [], merging: [],
                sorted: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                currentLeft: -1, currentRight: -1,
                phase: 'merge_complete',
                explanation: `Merge complete! Subarray from ${left} to ${right} is now sorted: [${tempArr.slice(left, right + 1).join(', ')}]`,
                level, totalLevels: Math.ceil(Math.log2(n))
            });
        }

        mergeSort(tempArr, 0, n - 1, 0, steps);

        steps.push({
            array: [...tempArr],
            leftSection: [], rightSection: [], merging: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            currentLeft: -1, currentRight: -1,
            phase: 'complete',
            explanation: "Merge Sort complete! The entire array is now sorted through the divide-and-conquer approach.",
            level: Math.ceil(Math.log2(n)), totalLevels: Math.ceil(Math.log2(n))
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateMergeSortSteps(array);
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
        array, leftSection: [], rightSection: [], merging: [], sorted: [],
        currentLeft: -1, currentRight: -1,
        phase: 'start',
        explanation: 'Click Play to begin the Merge Sort visualization',
        level: 0, totalLevels: 0
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.currentLeft === index) return 'bg-blue-500 border-blue-600 transform scale-110';
        if (currentState.currentRight === index) return 'bg-purple-500 border-purple-600 transform scale-110';
        if (currentState.leftSection.includes(index)) return 'bg-cyan-400 border-cyan-500';
        if (currentState.rightSection.includes(index)) return 'bg-pink-400 border-pink-500';
        if (currentState.merging.includes(index)) return 'bg-yellow-400 border-yellow-500';
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

    const codeExample = `def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    # Divide the array into two halves
    mid = len(arr) // 2
    left_sorted = merge_sort(arr[:mid])
    right_sorted = merge_sort(arr[mid:])

    return merge(left_sorted, right_sorted)

def merge(left, right):
    result = []
    i = j = 0

    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    result.extend(left[i:])
    result.extend(right[j:])
    return result`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Merge Sort Visualizer</h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Merge Sort uses divide-and-conquer to split the array into halves and merge them back in sorted order.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Divide &amp; Conquer</div>
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
                                    <span className="text-sm text-slate-500">Level {currentState.level} of {currentState.totalLevels} | Phase: {currentState.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}></div>
                                </div>
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
                                    {[['bg-orange-400 border-orange-500', 'Unsorted'], ['bg-cyan-400 border-cyan-500', 'Left Section'], ['bg-pink-400 border-pink-500', 'Right Section'], ['bg-blue-500 border-blue-600', 'Left Pointer'], ['bg-purple-500 border-purple-600', 'Right Pointer'], ['bg-yellow-400 border-yellow-500', 'Merging'], ['bg-green-500 border-green-600', 'Sorted']].map(([color, label]) => (
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
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Worst Case:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n log n)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Stable:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">In-place:</span><span className="bg-red-500/15 text-red-400 px-2 py-1 rounded">No</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use Merge Sort</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Large datasets requiring guaranteed O(n log n)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>When stability is required</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>External sorting (data doesn&apos;t fit in memory)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Parallel processing applications</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Memory-constrained environments</span></li>
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

export default MergeSortPage;
