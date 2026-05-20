"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "When does Bucket Sort achieve its best O(n + k) performance?",
        options: ["When the array is already sorted", "When data is uniformly distributed across the value range", "When all elements are the same", "When there are many duplicate values"],
        correct: 1,
        explanation: "Bucket Sort performs best when input is uniformly distributed — each bucket receives roughly the same number of elements, making the per-bucket sorting trivially fast."
    },
    {
        question: "What sorting algorithm is typically used to sort elements within individual buckets?",
        options: ["Merge Sort", "Quick Sort", "Insertion Sort", "Heap Sort"],
        correct: 2,
        explanation: "Insertion Sort is commonly used for individual buckets because buckets typically contain few elements, and Insertion Sort is efficient for small arrays."
    },
    {
        question: "What is Bucket Sort's worst case time complexity?",
        options: ["O(n log n)", "O(n + k)", "O(n²)", "O(k²)"],
        correct: 2,
        explanation: "In the worst case, all elements fall into the same bucket. Sorting that single bucket with Insertion Sort takes O(n²), making the overall worst case O(n²)."
    }
];

const BucketSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateBucketSortSteps = (arr) => {
        const steps = [];
        let tempArr = [...arr];
        const n = tempArr.length;

        const bucketCount = Math.max(3, Math.min(n, 5));
        const minVal = Math.min(...tempArr);
        const maxVal = Math.max(...tempArr);
        const range = maxVal - minVal + 1;
        const bucketSize = Math.ceil(range / bucketCount);

        const buckets = Array(bucketCount).fill().map(() => []);
        const bucketRanges = Array(bucketCount).fill().map((_, i) => ({
            min: minVal + i * bucketSize,
            max: minVal + (i + 1) * bucketSize - 1
        }));

        steps.push({
            array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
            phase: 'start', highlightedElements: [], activeBucket: -1, sortingBucket: -1,
            explanation: `Starting Bucket Sort: Creating ${bucketCount} buckets with range ${minVal}-${maxVal}. Each bucket covers ~${bucketSize} values.`,
            currentElement: -1, bucketCount
        });

        steps.push({
            array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
            phase: 'buckets_created', highlightedElements: [], activeBucket: -1, sortingBucket: -1,
            explanation: `Created ${bucketCount} buckets: ${Array(bucketCount).fill().map((_, i) => `Bucket ${i}: [${minVal + i * bucketSize}-${minVal + (i + 1) * bucketSize - 1}]`).join(', ')}`,
            currentElement: -1, bucketCount
        });

        for (let i = 0; i < tempArr.length; i++) {
            const element = tempArr[i];
            const bucketIndex = Math.min(Math.floor((element - minVal) / bucketSize), bucketCount - 1);

            steps.push({
                array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
                phase: 'distributing', highlightedElements: [i], activeBucket: bucketIndex, sortingBucket: -1,
                explanation: `Element ${element} goes to bucket ${bucketIndex} (range: ${minVal + bucketIndex * bucketSize}-${minVal + (bucketIndex + 1) * bucketSize - 1})`,
                currentElement: element, bucketCount
            });

            buckets[bucketIndex].push({ value: element, originalIndex: i });

            steps.push({
                array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
                phase: 'distributed', highlightedElements: [], activeBucket: bucketIndex, sortingBucket: -1,
                explanation: `Added ${element} to bucket ${bucketIndex}. Bucket now contains: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                currentElement: element, bucketCount
            });
        }

        steps.push({
            array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
            phase: 'distribution_complete', highlightedElements: [], activeBucket: -1, sortingBucket: -1,
            explanation: `Distribution complete! All elements are in their respective buckets. Next, we'll sort each non-empty bucket individually.`,
            currentElement: -1, bucketCount
        });

        for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
            if (buckets[bucketIndex].length > 0) {
                steps.push({
                    array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
                    phase: 'sorting_bucket', highlightedElements: [], activeBucket: bucketIndex, sortingBucket: bucketIndex,
                    explanation: `Sorting bucket ${bucketIndex} with ${buckets[bucketIndex].length} elements: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                    currentElement: -1, bucketCount
                });

                const bucket = buckets[bucketIndex];
                for (let i = 1; i < bucket.length; i++) {
                    const key = bucket[i];
                    let j = i - 1;
                    while (j >= 0 && bucket[j].value > key.value) {
                        bucket[j + 1] = bucket[j];
                        j--;
                    }
                    bucket[j + 1] = key;
                }

                steps.push({
                    array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
                    phase: 'bucket_sorted', highlightedElements: [], activeBucket: bucketIndex, sortingBucket: -1,
                    explanation: `Bucket ${bucketIndex} sorted: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                    currentElement: -1, bucketCount
                });
            }
        }

        steps.push({
            array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
            phase: 'all_buckets_sorted', highlightedElements: [], activeBucket: -1, sortingBucket: -1,
            explanation: `All buckets sorted! Now concatenating buckets in order to form the final sorted array.`,
            currentElement: -1, bucketCount
        });

        let arrayIndex = 0;
        for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
            if (buckets[bucketIndex].length > 0) {
                steps.push({
                    array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
                    phase: 'concatenating', highlightedElements: [], activeBucket: bucketIndex, sortingBucket: -1,
                    explanation: `Concatenating bucket ${bucketIndex}: [${buckets[bucketIndex].map(item => item.value).join(', ')}] to the final array`,
                    currentElement: -1, bucketCount
                });

                for (let item of buckets[bucketIndex]) {
                    tempArr[arrayIndex] = item.value;
                    arrayIndex++;

                    steps.push({
                        array: [...tempArr], buckets: buckets.map(b => [...b]), bucketRanges,
                        phase: 'concatenating_element', highlightedElements: [arrayIndex - 1], activeBucket: bucketIndex, sortingBucket: -1,
                        explanation: `Moved ${item.value} from bucket ${bucketIndex} to position ${arrayIndex - 1} in the final array`,
                        currentElement: item.value, bucketCount
                    });
                }
            }
        }

        steps.push({
            array: [...tempArr], buckets: Array(bucketCount).fill().map(() => []), bucketRanges,
            phase: 'complete',
            highlightedElements: Array.from({ length: tempArr.length }, (_, i) => i),
            activeBucket: -1, sortingBucket: -1,
            explanation: `Bucket Sort complete! All elements have been sorted through distribution, individual bucket sorting, and concatenation.`,
            currentElement: -1, bucketCount
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateBucketSortSteps(array);
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
    const generateNewArray = () => { setArray(Array.from({ length: 7 }, () => Math.floor(Math.random() * 80) + 10)); setIsPlaying(false); setCurrentStep(0); };
    const resetToOriginal = () => { setArray([...originalArray]); setIsPlaying(false); setCurrentStep(0); };

    const currentState = stepHistory[currentStep] || {
        array, buckets: Array(3).fill().map(() => []), bucketRanges: [],
        phase: 'start', highlightedElements: [], activeBucket: -1, sortingBucket: -1,
        explanation: 'Click Play to begin the Bucket Sort visualization',
        currentElement: -1, bucketCount: 3
    };

    const getBarColor = (index) => {
        if (currentState.phase === 'complete') return 'bg-green-500 border-green-600';
        if (currentState.highlightedElements.includes(index)) return 'bg-red-500 border-red-600 transform scale-110';
        return 'bg-orange-400 border-orange-500';
    };

    const getBucketColor = (bucketIndex) => {
        if (currentState.sortingBucket === bucketIndex) return 'bg-purple-500/15 border-purple-500/40 shadow-lg';
        if (currentState.activeBucket === bucketIndex) return 'bg-blue-500/15 border-blue-500/40 shadow-lg';
        return 'bg-slate-800/60 border-slate-700/50';
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

    const codeExample = `def bucket_sort(arr):
    if len(arr) == 0:
        return arr

    bucket_count = len(arr)
    min_val, max_val = min(arr), max(arr)

    # Create empty buckets
    buckets = [[] for _ in range(bucket_count)]

    # Distribute elements into buckets
    for num in arr:
        bucket_index = int((num - min_val) * bucket_count / (max_val - min_val + 1))
        bucket_index = min(bucket_index, bucket_count - 1)
        buckets[bucket_index].append(num)

    # Sort individual buckets and concatenate
    sorted_array = []
    for bucket in buckets:
        insertion_sort(bucket)
        sorted_array.extend(bucket)

    return sorted_array

def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Bucket Sort Visualizer</h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Bucket Sort distributes elements into buckets, sorts each bucket individually, and concatenates them for the final result.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n + k) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n + k)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Distribution-based</div>
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
                                <input type="range" min="600" max="3000" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-orange-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (600ms)</span><span>Slow (3000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Progress: Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Phase: {currentState.phase} | Buckets: {currentState.bucketCount}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}></div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold mb-3 text-slate-300">Current Array</h3>
                                <div className="flex items-end justify-center gap-2 h-48 p-4 bg-slate-800/60 rounded-lg border-2 border-slate-700/60">
                                    {currentState.array.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className={`w-16 transition-all duration-500 border-2 rounded-t-lg flex items-end justify-center ${getBarColor(index)}`} style={{ height: `${(value / maxValue) * 160}px` }}>
                                                <span className="text-white font-bold text-sm mb-1">{value}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 mt-1">{index}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold mb-3 text-slate-300">Buckets</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {currentState.buckets.map((bucket, bucketIndex) => (
                                        <div key={bucketIndex} className={`${getBucketColor(bucketIndex)} border-2 rounded-lg p-3 transition-all duration-300`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold text-slate-300 text-sm">Bucket {bucketIndex}</div>
                                                {currentState.bucketRanges[bucketIndex] && (
                                                    <div className="text-xs text-slate-400">
                                                        Range: {currentState.bucketRanges[bucketIndex].min}-{currentState.bucketRanges[bucketIndex].max}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1 flex-wrap min-h-8">
                                                {bucket.map((item, itemIndex) => (
                                                    <div key={itemIndex} className="bg-orange-400 text-white text-sm rounded px-3 py-1 text-center font-medium">
                                                        {item.value}
                                                    </div>
                                                ))}
                                                {bucket.length === 0 && <div className="text-slate-500 text-sm italic">Empty</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
                                {[['bg-orange-400 border-orange-500', 'Array Elements'], ['bg-red-500 border-red-600', 'Currently Processing'], ['bg-blue-500/15 border-blue-500/40', 'Active Bucket'], ['bg-purple-500/15 border-purple-500/40', 'Sorting Bucket'], ['bg-green-500 border-green-600', 'Sorted']].map(([color, label]) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <div className={`w-4 h-4 ${color} border rounded`}></div>
                                        <span className="text-slate-300">{label}</span>
                                    </div>
                                ))}
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
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Best Case:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n + k)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Average Case:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n + k)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Worst Case:</span><code className="bg-red-500/15 text-red-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n + k)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Stable:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">In-place:</span><span className="bg-red-500/15 text-red-400 px-2 py-1 rounded">No</span></div>
                            </div>
                            <div className="mt-3 text-xs text-slate-400">
                                <p><strong className="text-slate-300">n</strong> = number of elements</p>
                                <p><strong className="text-slate-300">k</strong> = number of buckets</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use Bucket Sort</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Uniformly distributed data</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Known range of input values</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Floating-point numbers in [0,1)</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Skewed or clustered data distribution</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Unknown or very large value ranges</span></li>
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

export default BucketSortPage;
