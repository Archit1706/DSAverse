"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Is Radix Sort a comparison-based sorting algorithm?",
        options: ["Yes, it compares digits", "No, it distributes elements by digit value", "It depends on the implementation", "Yes, it compares full numbers"],
        correct: 1,
        explanation: "Radix Sort is non-comparison based. Instead of comparing elements, it distributes them into buckets based on individual digit values, allowing it to break the O(n log n) barrier."
    },
    {
        question: "What does 'd' represent in Radix Sort's O(d×(n+k)) complexity?",
        options: ["The depth of recursion", "The number of digits in the maximum value", "The number of distinct elements", "The data type size"],
        correct: 1,
        explanation: "In Radix Sort, 'd' is the number of digits (passes needed), 'n' is the number of elements, and 'k' is the base (10 for decimal). Each pass processes one digit position."
    },
    {
        question: "In LSD (Least Significant Digit) Radix Sort, which digit is processed first?",
        options: ["Most significant (leftmost)", "Least significant (rightmost)", "Middle digit", "Random digit"],
        correct: 1,
        explanation: "LSD Radix Sort starts from the rightmost (least significant) digit and works left. This ensures stability is preserved and the final pass produces a correctly sorted array."
    }
];

const RadixSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateRadixSortSteps = (arr) => {
        const steps = [];
        let tempArr = [...arr];

        const maxNum = Math.max(...tempArr);
        const maxDigits = maxNum.toString().length;

        steps.push({
            array: [...tempArr],
            buckets: Array(10).fill().map(() => []),
            currentDigit: 0, digitPosition: 'units',
            phase: 'start',
            highlightedElements: [], bucketHighlight: -1,
            explanation: `Starting Radix Sort: We'll sort by each digit position from right to left. Maximum number is ${maxNum} with ${maxDigits} digits.`,
            currentPass: 0, totalPasses: maxDigits
        });

        const getDigit = (num, digitPos) => Math.floor(num / Math.pow(10, digitPos)) % 10;
        const getDigitName = (pos) => (['units', 'tens', 'hundreds', 'thousands'][pos] || `10^${pos}`);

        for (let digitPos = 0; digitPos < maxDigits; digitPos++) {
            const buckets = Array(10).fill().map(() => []);

            steps.push({
                array: [...tempArr],
                buckets: Array(10).fill().map(() => []),
                currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                phase: 'digit_start',
                highlightedElements: [], bucketHighlight: -1,
                explanation: `Pass ${digitPos + 1}: Sorting by the ${getDigitName(digitPos)} digit (position ${digitPos}). Distributing elements into buckets 0-9.`,
                currentPass: digitPos + 1, totalPasses: maxDigits
            });

            for (let i = 0; i < tempArr.length; i++) {
                const digit = getDigit(tempArr[i], digitPos);

                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                    phase: 'distributing',
                    highlightedElements: [i], bucketHighlight: digit,
                    explanation: `Element ${tempArr[i]}: ${getDigitName(digitPos)} digit is ${digit}. Placing into bucket ${digit}.`,
                    currentPass: digitPos + 1, totalPasses: maxDigits
                });

                buckets[digit].push({ value: tempArr[i], originalIndex: i });

                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                    phase: 'distributed',
                    highlightedElements: [], bucketHighlight: digit,
                    explanation: `Placed ${tempArr[i]} in bucket ${digit}. Bucket ${digit} now has: [${buckets[digit].map(item => item.value).join(', ')}]`,
                    currentPass: digitPos + 1, totalPasses: maxDigits
                });
            }

            steps.push({
                array: [...tempArr],
                buckets: buckets.map(bucket => [...bucket]),
                currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                phase: 'buckets_filled',
                highlightedElements: [], bucketHighlight: -1,
                explanation: `All elements distributed! Now collecting from buckets 0-9 in order to form the new array arrangement.`,
                currentPass: digitPos + 1, totalPasses: maxDigits
            });

            let arrayIndex = 0;
            for (let bucketIndex = 0; bucketIndex < 10; bucketIndex++) {
                if (buckets[bucketIndex].length > 0) {
                    steps.push({
                        array: [...tempArr],
                        buckets: buckets.map(bucket => [...bucket]),
                        currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                        phase: 'collecting',
                        highlightedElements: [], bucketHighlight: bucketIndex,
                        explanation: `Collecting from bucket ${bucketIndex}: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                        currentPass: digitPos + 1, totalPasses: maxDigits
                    });

                    for (let item of buckets[bucketIndex]) {
                        tempArr[arrayIndex] = item.value;
                        arrayIndex++;

                        steps.push({
                            array: [...tempArr],
                            buckets: buckets.map(bucket => [...bucket]),
                            currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                            phase: 'collecting_item',
                            highlightedElements: [arrayIndex - 1], bucketHighlight: bucketIndex,
                            explanation: `Collected ${item.value} from bucket ${bucketIndex} to position ${arrayIndex - 1}`,
                            currentPass: digitPos + 1, totalPasses: maxDigits
                        });
                    }
                }
            }

            steps.push({
                array: [...tempArr],
                buckets: Array(10).fill().map(() => []),
                currentDigit: digitPos, digitPosition: getDigitName(digitPos),
                phase: 'pass_complete',
                highlightedElements: [], bucketHighlight: -1,
                explanation: `Pass ${digitPos + 1} complete! Array after sorting by ${getDigitName(digitPos)} digit: [${tempArr.join(', ')}]`,
                currentPass: digitPos + 1, totalPasses: maxDigits
            });
        }

        steps.push({
            array: [...tempArr],
            buckets: Array(10).fill().map(() => []),
            currentDigit: maxDigits, digitPosition: 'complete',
            phase: 'complete',
            highlightedElements: Array.from({ length: tempArr.length }, (_, i) => i), bucketHighlight: -1,
            explanation: `Radix Sort complete! All ${maxDigits} digit positions have been processed. The array is now fully sorted.`,
            currentPass: maxDigits, totalPasses: maxDigits
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateRadixSortSteps(array);
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
    const generateNewArray = () => { setArray(Array.from({ length: 7 }, () => Math.floor(Math.random() * 99) + 1)); setIsPlaying(false); setCurrentStep(0); };
    const resetToOriginal = () => { setArray([...originalArray]); setIsPlaying(false); setCurrentStep(0); };

    const currentState = stepHistory[currentStep] || {
        array, buckets: Array(10).fill().map(() => []),
        currentDigit: 0, digitPosition: 'units',
        phase: 'start', highlightedElements: [], bucketHighlight: -1,
        explanation: 'Click Play to begin the Radix Sort visualization',
        currentPass: 0, totalPasses: 0
    };

    const getBarColor = (index) => {
        if (currentState.phase === 'complete') return 'bg-green-500 border-green-600';
        if (currentState.highlightedElements.includes(index)) return 'bg-red-500 border-red-600 transform scale-110';
        return 'bg-orange-400 border-orange-500';
    };

    const getBucketColor = (bucketIndex) => {
        if (currentState.bucketHighlight === bucketIndex) return 'bg-blue-500/15 border-blue-500/40 shadow-lg';
        return 'bg-slate-800/60 border-slate-700/50';
    };

    const maxValue = Math.max(...currentState.array);

    const highlightDigit = (number, digitPos) => {
        const numStr = number.toString().padStart(3, ' ');
        const chars = numStr.split('');
        const targetPos = chars.length - 1 - digitPos;
        return chars.map((char, index) => (
            <span key={index} className={index === targetPos ? 'text-red-400 font-bold bg-red-500/20 px-0.5 rounded' : 'text-white'}>
                {char}
            </span>
        ));
    };

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

    const codeExample = `def radix_sort(arr):
    max_num = max(arr)

    # Do counting sort for every digit
    exp = 1  # exp is 10^i for current digit
    while max_num // exp > 0:
        counting_sort_by_digit(arr, exp)
        exp *= 10

def counting_sort_by_digit(arr, exp):
    n = len(arr)
    output = [0] * n
    count = [0] * 10

    # Store count of occurrences of each digit
    for i in range(n):
        digit = (arr[i] // exp) % 10
        count[digit] += 1

    # Change count[i] to actual position in output[]
    for i in range(1, 10):
        count[i] += count[i - 1]

    # Build the output array (right-to-left for stability)
    i = n - 1
    while i >= 0:
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]
        count[digit] -= 1
        i -= 1

    for i in range(n):
        arr[i] = output[i]`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Radix Sort Visualizer</h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Radix Sort uses non-comparison based sorting by processing individual digits from least to most significant.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(d × (n + k))</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n + k)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Non-comparison</div>
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
                                    <span className="text-sm text-slate-500">Pass {currentState.currentPass} of {currentState.totalPasses} | Digit: {currentState.digitPosition}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}></div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold mb-3 text-slate-300">
                                    Current Array {currentState.digitPosition !== 'complete' && currentState.digitPosition !== 'units' && `(Sorted by ${currentState.digitPosition} digit)`}
                                </h3>
                                <div className="flex items-end justify-center gap-2 h-48 p-4 bg-slate-800/60 rounded-lg border-2 border-slate-700/60">
                                    {currentState.array.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className={`w-16 transition-all duration-500 border-2 rounded-t-lg flex items-end justify-center ${getBarColor(index)}`} style={{ height: `${(value / maxValue) * 160}px` }}>
                                                <span className="font-bold text-sm mb-1">
                                                    {currentState.currentDigit >= 0 && currentState.phase !== 'complete'
                                                        ? highlightDigit(value, currentState.currentDigit)
                                                        : <span className="text-white">{value}</span>
                                                    }
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500 mt-1">{index}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold mb-3 text-slate-300">Buckets (0-9)</h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {currentState.buckets.map((bucket, bucketIndex) => (
                                        <div key={bucketIndex} className={`${getBucketColor(bucketIndex)} border-2 rounded-lg p-2 min-h-24 transition-all duration-300`}>
                                            <div className="text-center font-bold text-slate-300 mb-2 text-xs">Bucket {bucketIndex}</div>
                                            <div className="flex flex-col gap-1">
                                                {bucket.map((item, itemIndex) => (
                                                    <div key={itemIndex} className="bg-orange-400 text-white text-xs rounded px-2 py-1 text-center font-medium">
                                                        {item.value}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
                                {[['bg-orange-400 border-orange-500', 'Array Elements'], ['bg-red-500 border-red-600', 'Currently Processing'], ['bg-blue-500/15 border-blue-500/40', 'Active Bucket'], ['bg-green-500 border-green-600', 'Sorted']].map(([color, label]) => (
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
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(d×(n+k))</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Space:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n + k)</code></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Stable:</span><span className="bg-green-500/15 text-green-400 px-2 py-1 rounded">Yes</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">In-place:</span><span className="bg-red-500/15 text-red-400 px-2 py-1 rounded">No</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-300">Type:</span><span className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">Non-comparison</span></div>
                            </div>
                            <div className="mt-3 text-xs text-slate-400">
                                <p><strong className="text-slate-300">d</strong> = number of digits</p>
                                <p><strong className="text-slate-300">n</strong> = number of elements</p>
                                <p><strong className="text-slate-300">k</strong> = range of input (10 for decimal)</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">When to Use Radix Sort</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Sorting integers with fixed number of digits</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>When n is large and d is small</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Sorting strings of equal length</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Floating-point numbers</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Variable-length strings</span></li>
                                <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span>Memory-severely-limited environments</span></li>
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

export default RadixSortPage;
