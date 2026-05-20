"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "How many swaps does Selection Sort perform in the worst case?",
        options: ["O(n²)", "O(n log n)", "O(n)", "O(1)"],
        correct: 2,
        explanation: "Selection Sort performs at most n-1 swaps (one per pass), regardless of input. This makes it efficient when write operations are costly."
    },
    {
        question: "Is Selection Sort a stable sorting algorithm?",
        options: ["Yes, always stable", "No, it can change the relative order of equal elements", "Only with additional memory", "It depends on the data type"],
        correct: 1,
        explanation: "Selection Sort is not stable. When swapping the minimum to its position, equal elements can change their relative order."
    },
    {
        question: "What is the time complexity of Selection Sort in all cases?",
        options: ["O(n) best, O(n²) worst", "O(n log n) in all cases", "O(n²) in all cases", "O(n) average, O(n²) worst"],
        correct: 2,
        explanation: "Selection Sort always scans the entire unsorted portion to find the minimum — regardless of input order — so it's O(n²) in best, average, and worst cases."
    }
];

const SelectionSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateSelectionSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            comparisons: [], swaps: [], sorted: [],
            minIndex: -1, currentIndex: -1,
            explanation: "Starting Selection Sort: We'll find the smallest element in the unsorted portion and place it at the beginning of that section.",
            currentPass: 0, totalPasses: n - 1
        });

        for (let i = 0; i < n - 1; i++) {
            let minIdx = i;

            steps.push({
                array: [...tempArr],
                comparisons: [], swaps: [],
                sorted: Array.from({ length: i }, (_, k) => k),
                minIndex: minIdx, currentIndex: i,
                explanation: `Pass ${i + 1}: Starting search from position ${i}. Current minimum candidate is ${tempArr[minIdx]} at position ${minIdx}.`,
                currentPass: i + 1, totalPasses: n - 1
            });

            for (let j = i + 1; j < n; j++) {
                steps.push({
                    array: [...tempArr],
                    comparisons: [minIdx, j], swaps: [],
                    sorted: Array.from({ length: i }, (_, k) => k),
                    minIndex: minIdx, currentIndex: j,
                    explanation: `Comparing current minimum ${tempArr[minIdx]} with ${tempArr[j]} at position ${j}. ${tempArr[j] < tempArr[minIdx] ? 'Found smaller element!' : `${tempArr[minIdx]} is still the minimum.`}`,
                    currentPass: i + 1, totalPasses: n - 1
                });

                if (tempArr[j] < tempArr[minIdx]) {
                    minIdx = j;
                    steps.push({
                        array: [...tempArr],
                        comparisons: [], swaps: [],
                        sorted: Array.from({ length: i }, (_, k) => k),
                        minIndex: minIdx, currentIndex: j,
                        explanation: `New minimum found! ${tempArr[minIdx]} at position ${minIdx} is now the smallest element in the unsorted portion.`,
                        currentPass: i + 1, totalPasses: n - 1
                    });
                }
            }

            if (minIdx !== i) {
                [tempArr[i], tempArr[minIdx]] = [tempArr[minIdx], tempArr[i]];
                steps.push({
                    array: [...tempArr],
                    comparisons: [], swaps: [i, minIdx],
                    sorted: Array.from({ length: i + 1 }, (_, k) => k),
                    minIndex: -1, currentIndex: -1,
                    explanation: `Swapping! Moving ${tempArr[i]} from position ${minIdx} to position ${i}. Element ${tempArr[i]} is now in its final sorted position.`,
                    currentPass: i + 1, totalPasses: n - 1
                });
            } else {
                steps.push({
                    array: [...tempArr],
                    comparisons: [], swaps: [],
                    sorted: Array.from({ length: i + 1 }, (_, k) => k),
                    minIndex: -1, currentIndex: -1,
                    explanation: `No swap needed! Element ${tempArr[i]} at position ${i} is already the minimum and in its correct position.`,
                    currentPass: i + 1, totalPasses: n - 1
                });
            }
        }

        steps.push({
            array: [...tempArr],
            comparisons: [], swaps: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            minIndex: -1, currentIndex: -1,
            explanation: "Selection Sort complete! All elements are now sorted. We made " + (n - 1) + " passes and found the minimum element in each pass.",
            currentPass: n - 1, totalPasses: n - 1
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateSelectionSortSteps(array);
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
        array, comparisons: [], swaps: [], sorted: [],
        minIndex: -1, currentIndex: -1,
        explanation: 'Click Play to begin the Selection Sort visualization',
        currentPass: 0, totalPasses: 0
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.swaps.includes(index)) return 'bg-red-500 border-red-600 animate-pulse';
        if (currentState.comparisons.includes(index)) return 'bg-yellow-400 border-yellow-500 transform scale-110';
        if (currentState.minIndex === index) return 'bg-purple-500 border-purple-600 transform scale-105';
        if (currentState.currentIndex === index) return 'bg-blue-500 border-blue-600';
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

    const codeExample = `def selection_sort(arr):
    n = len(arr)

    # Traverse through all array elements
    for i in range(n - 1):
        # Find the minimum element in remaining unsorted array
        min_idx = i

        for j in range(i + 1, n):
            # If we found an element smaller than current minimum
            if arr[j] < arr[min_idx]:
                min_idx = j

        # Swap the found minimum element with the first element
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]

    return arr`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Selection Sort Visualizer</h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Selection Sort finds the minimum element in each pass and places it in the correct position.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
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
                                <input type="range" min="200" max="2000" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-orange-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (200ms)</span><span>Slow (2000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Progress: Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Pass {currentState.currentPass} of {currentState.totalPasses}</span>
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
                                <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
                                    {[['bg-orange-400 border-orange-500', 'Unsorted'], ['bg-blue-500 border-blue-600', 'Current Position'], ['bg-purple-500 border-purple-600', 'Current Minimum'], ['bg-yellow-400 border-yellow-500', 'Comparing'], ['bg-red-500 border-red-600', 'Swapping'], ['bg-green-500 border-green-600', 'Sorted']].map(([color, label]) => (
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
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Best Case:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Average Case:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Worst Case:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(1)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Stable:</span><span className="bg-red-500/15 text-red-400 px-2 py-1 rounded">No</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">In-place:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use Selection Sort</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Small datasets where simplicity matters</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>When memory writes are costly (fewer swaps than Bubble Sort)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Educational purposes to understand algorithms</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Large datasets (poor time complexity)</span></li>
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

export default SelectionSortPage;
