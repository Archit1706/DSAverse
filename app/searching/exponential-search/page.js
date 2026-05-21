'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const INITIAL_ARRAY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const INITIAL_TARGET = 18;

const quizQuestions = [
    {
        question: "What does the first phase (exponential scan) of exponential search accomplish?",
        options: [
            "It finds the target directly",
            "It establishes a range [bound/2, bound] that contains the target",
            "It sorts the array",
            "It counts the elements"
        ],
        correct: 1,
        explanation: "The exponential phase doubles the bound (1, 2, 4, 8, 16...) until arr[bound] >= target. This identifies a range [bound/2, bound] where the target must be, without knowing the array size upfront."
    },
    {
        question: "After finding the range, exponential search applies which algorithm?",
        options: [
            "Linear search",
            "Jump search",
            "Binary search",
            "Interpolation search"
        ],
        correct: 2,
        explanation: "Binary search is applied on the identified range [bound/2, min(bound, n-1)]. This gives O(log n) total time since the exponential phase also takes O(log n) doublings."
    },
    {
        question: "Why is exponential search especially useful for unbounded or infinite arrays?",
        options: [
            "It never accesses out-of-bounds indices",
            "It finds a finite range before searching, so array size is not needed upfront",
            "It works without sorting",
            "It uses O(n) extra space for bookkeeping"
        ],
        correct: 1,
        explanation: "Exponential search only needs to find a bound — it works even if you don't know how large the array is. Once the bound exceeds the target, binary search is applied within a known range."
    }
];

const codeString = `def exponential_search(arr, target):
    """O(log n) time, O(1) space — requires sorted array"""
    n = len(arr)

    if arr[0] == target:
        return 0

    # Phase 1: Find range by doubling bound
    bound = 1
    while bound < n and arr[bound] < target:
        bound *= 2

    # Phase 2: Binary search within [bound//2, min(bound, n-1)]
    left = bound // 2
    right = min(bound, n - 1)

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1

# Example
arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20]
print(exponential_search(arr, 18))  # 13`;

function generateSteps(arr, target) {
    const steps = [];
    const n = arr.length;

    steps.push({
        array: arr,
        bound: 1,
        left: -1,
        right: -1,
        mid: -1,
        found: false,
        foundIndex: -1,
        phase: 'exponential',
        currentIndex: -1,
        explanation: `Starting exponential search for ${target}. Phase 1: find range by doubling the bound.`
    });

    if (arr[0] === target) {
        steps.push({
            array: arr, bound: 1, left: -1, right: -1, mid: -1,
            found: true, foundIndex: 0, phase: 'complete', currentIndex: 0,
            explanation: `Check index 0 (value ${arr[0]}). Found target ${target} at index 0!`
        });
        return steps;
    }

    steps.push({
        array: arr, bound: 1, left: -1, right: -1, mid: -1,
        found: false, foundIndex: -1, phase: 'exponential', currentIndex: 0,
        explanation: `Check index 0 (value ${arr[0]}). ${arr[0]} !== ${target}, continue to Phase 1 exponential scan.`
    });

    let bound = 1;
    while (bound < n && arr[bound] < target) {
        const nextBound = bound * 2;
        steps.push({
            array: arr, bound: bound, left: -1, right: -1, mid: -1,
            found: false, foundIndex: -1, phase: 'exponential', currentIndex: bound,
            explanation: `Checking index ${bound} (value ${arr[bound]}). ${arr[bound]} < ${target}, doubling bound to ${nextBound}.`
        });
        bound = nextBound;
    }

    const bLeft = Math.floor(bound / 2);
    const bRight = Math.min(bound, n - 1);

    steps.push({
        array: arr, bound: bound, left: bLeft, right: bRight, mid: -1,
        found: false, foundIndex: -1, phase: 'binary', currentIndex: -1,
        explanation: `Found range! Target is between index ${bLeft} and ${bRight}. Switching to Phase 2: binary search.`
    });

    let left = bLeft;
    let right = bRight;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        steps.push({
            array: arr, bound: bound, left, right, mid,
            found: false, foundIndex: -1, phase: 'binary', currentIndex: mid,
            explanation: `Binary search: L=${left}, M=${mid}, R=${right}. Checking arr[${mid}]=${arr[mid]} vs target=${target}.`
        });

        if (arr[mid] === target) {
            steps.push({
                array: arr, bound: bound, left, right, mid,
                found: true, foundIndex: mid, phase: 'complete', currentIndex: mid,
                explanation: `Found! arr[${mid}] = ${arr[mid]} equals target ${target}. Search complete.`
            });
            return steps;
        } else if (arr[mid] < target) {
            steps.push({
                array: arr, bound: bound, left: mid + 1, right, mid,
                found: false, foundIndex: -1, phase: 'binary', currentIndex: mid,
                explanation: `arr[${mid}]=${arr[mid]} < ${target}. Move left pointer to ${mid + 1}.`
            });
            left = mid + 1;
        } else {
            steps.push({
                array: arr, bound: bound, left, right: mid - 1, mid,
                found: false, foundIndex: -1, phase: 'binary', currentIndex: mid,
                explanation: `arr[${mid}]=${arr[mid]} > ${target}. Move right pointer to ${mid - 1}.`
            });
            right = mid - 1;
        }
    }

    steps.push({
        array: arr, bound: bound, left, right, mid: -1,
        found: false, foundIndex: -1, phase: 'complete', currentIndex: -1,
        explanation: `Target ${target} not found in array.`
    });
    return steps;
}

export default function ExponentialSearchPage() {
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
        bound: 1, left: -1, right: -1, mid: -1, found: false, foundIndex: -1,
        phase: 'exponential', currentIndex: -1, explanation: ''
    };

    const getColor = (i) => {
        if (i === currentState.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (currentState.phase === 'exponential' && i === currentState.bound && currentState.bound < arr.length)
            return 'bg-orange-500 border-orange-400 text-slate-900 scale-110';
        if (currentState.phase === 'binary' && i === currentState.mid && currentState.mid !== -1)
            return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (currentState.phase === 'binary' && i >= currentState.left && i <= currentState.right)
            return 'bg-red-800/50 border-red-700 text-slate-200';
        if (currentState.phase === 'exponential' && i < currentState.bound)
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

    const phaseLabel = currentState.phase === 'exponential'
        ? 'Phase 1: Exponential Scan'
        : currentState.phase === 'binary'
            ? 'Phase 2: Binary Search'
            : 'Complete';

    const phaseColor = currentState.phase === 'exponential'
        ? 'text-orange-400'
        : currentState.phase === 'binary'
            ? 'text-yellow-400'
            : 'text-green-400';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Exponential Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            A two-phase algorithm: exponential range-finding followed by binary search. Ideal for unbounded arrays.
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

                            <div className="mb-4 text-center">
                                <span className={`text-sm font-semibold ${phaseColor} bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700`}>
                                    {phaseLabel}
                                </span>
                                {currentState.phase === 'exponential' && (
                                    <span className="ml-3 text-slate-400 text-sm">
                                        Current bound: <span className="text-orange-400 font-mono">{currentState.bound}</span>
                                    </span>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <div className="flex gap-1.5 pb-4 min-w-max mx-auto justify-center flex-wrap">
                                    {arr.map((val, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 font-mono text-xs font-bold transition-all duration-300 ${getColor(i)}`}>
                                                {val}
                                            </div>
                                            <div className="h-3 flex items-center justify-center">
                                                {i === currentState.currentIndex && currentState.foundIndex === -1 && (
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

                            {currentState.phase === 'binary' && currentState.left !== -1 && (
                                <div className="flex gap-4 mt-2 justify-center text-xs font-mono">
                                    <span className="text-blue-400">L={currentState.left}</span>
                                    {currentState.mid !== -1 && <span className="text-yellow-400">M={currentState.mid}</span>}
                                    <span className="text-blue-400">R={currentState.right}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Color Legend</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-700 border border-slate-600 flex-shrink-0" /><span className="text-slate-400">Unchecked</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500 border border-orange-400 flex-shrink-0" /><span className="text-slate-400">Bound (phase 1)</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-300 flex-shrink-0" /><span className="text-slate-400">Mid (phase 2)</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-800 border border-red-700 flex-shrink-0" /><span className="text-slate-400">Search range</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 flex-shrink-0" /><span className="text-slate-400">Passed</span></div>
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
                                <h2 className="text-lg font-semibold text-slate-100">About Exponential Search</h2>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                Exponential search works in two phases. Phase 1 doubles a bound (1, 2, 4, 8, 16...) until the
                                array element at that position is greater than or equal to the target. Phase 2 runs binary search
                                within the found range [bound/2, min(bound, n-1)].
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                This algorithm shines for unbounded or infinite arrays because you never need to know the array
                                size — just find a range first, then search within it.
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
                                    <div className="text-xs text-slate-500 mb-1">Best For</div>
                                    <div className="text-yellow-400 text-sm font-semibold">Unbounded Arrays</div>
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
