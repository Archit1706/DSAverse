'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why is the sliding window approach O(n) instead of O(n*k)?",
        options: [
            "Because we use a hash map to cache sums",
            "Because we only compute the first window's sum directly; every subsequent sum reuses the previous one by removing one element and adding one",
            "Because the array is sorted so we can skip elements",
            "Because we only look at elements at even indices",
        ],
        correct: 1,
        explanation: "The brute-force approach recomputes the sum from scratch for every window — O(k) per window, O(n*k) total. The sliding window avoids this: each step subtracts the element leaving the window and adds the element entering it. Each element is touched exactly twice (once added, once removed), giving O(n) overall."
    },
    {
        question: "What is the key operation when the window slides one position to the right?",
        options: [
            "Re-sort the window elements",
            "Compute the sum of all k elements from scratch",
            "Subtract the leftmost element of the old window and add the new rightmost element",
            "Binary search for the maximum element in the window",
        ],
        correct: 2,
        explanation: "When the window shifts by one position: window_sum = window_sum - arr[i-1] + arr[i+k-1]. We subtract the element that just left the left edge and add the element that just entered the right edge. This constant-time update is the core insight of the sliding window pattern."
    },
    {
        question: "What is the space complexity of the sliding window maximum sum algorithm?",
        options: ["O(k) — we store the current window", "O(n) — we store all window sums", "O(1) — we only track a few variables", "O(log n) — recursion depth"],
        correct: 2,
        explanation: "We only need a constant number of variables: window_sum, max_sum, max_start, and a loop counter. No additional array or data structure is needed regardless of n or k. Space complexity is O(1)."
    },
];

export default function MaximumSumSubarrayPage() {
    const [array, setArray] = useState([2, 1, 5, 1, 3, 2]);
    const [k, setK] = useState(3);
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
        const kk = Math.min(Math.max(1, k), n);

        if (n < kk) {
            steps.push({
                windowStart: 0, windowEnd: kk - 1,
                windowSum: 0, maxSum: 0, maxStart: 0, maxEnd: kk - 1,
                done: false,
                explanation: `Array length ${n} is less than window size ${kk}. Cannot form a window.`,
            });
            return steps;
        }

        // Initial window
        let windowSum = arr.slice(0, kk).reduce((a, b) => a + b, 0);
        let maxSum = windowSum;
        let maxStart = 0;
        const maxEnd = kk - 1;

        steps.push({
            windowStart: 0, windowEnd: kk - 1,
            windowSum, maxSum, maxStart, maxEnd,
            done: false,
            explanation: `Initial window [0..${kk - 1}] = [${arr.slice(0, kk).join(', ')}]. Sum = ${windowSum}. This is our first maximum.`,
        });

        for (let i = 1; i <= n - kk; i++) {
            const prev = windowSum;
            windowSum = windowSum - arr[i - 1] + arr[i + kk - 1];
            const updated = windowSum > maxSum;
            if (updated) {
                maxSum = windowSum;
                maxStart = i;
            }
            steps.push({
                windowStart: i, windowEnd: i + kk - 1,
                windowSum, maxSum, maxStart, maxEnd: maxStart + kk - 1,
                done: false,
                explanation: `Slide window to [${i}..${i + kk - 1}]: remove arr[${i - 1}]=${arr[i - 1]}, add arr[${i + kk - 1}]=${arr[i + kk - 1]}. New sum = ${prev} - ${arr[i - 1]} + ${arr[i + kk - 1]} = ${windowSum}.${updated ? ` New maximum!` : ` Max still ${maxSum}.`}`,
            });
        }

        steps.push({
            windowStart: maxStart, windowEnd: maxStart + kk - 1,
            windowSum: maxSum, maxSum, maxStart, maxEnd: maxStart + kk - 1,
            done: true,
            explanation: `Done! Maximum sum subarray of length ${kk} is [${arr.slice(maxStart, maxStart + kk).join(', ')}] (indices ${maxStart}–${maxStart + kk - 1}) with sum ${maxSum}.`,
        });

        return steps;
    }, [array, k]);

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); }, [generateSteps]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const generateRandom = () => {
        const size = 8 + Math.floor(Math.random() * 3);
        const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 20));
        setArray(arr);
        setK(3);
        setIsPlaying(false);
        setCurrentStep(0);
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

    const cur = stepHistory[currentStep] || {
        windowStart: 0, windowEnd: Math.min(k - 1, array.length - 1),
        windowSum: 0, maxSum: 0, maxStart: 0, maxEnd: k - 1,
        done: false,
        explanation: 'Ready — press Play or step through.',
    };

    const getBoxColor = (i) => {
        if (cur.done) {
            if (i >= cur.maxStart && i <= cur.maxStart + Math.min(k, array.length) - 1) return 'bg-green-500 border-green-400 text-white scale-105';
            return 'bg-slate-700 border-slate-600 text-slate-100';
        }
        if (i >= cur.windowStart && i <= cur.windowEnd) return 'bg-violet-800/50 border-violet-700 text-slate-200';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const code = `def maxSumSubarray(arr, k):
    n = len(arr)
    if n < k:
        return -1
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(1, n - k + 1):
        window_sum = window_sum - arr[i-1] + arr[i+k-1]
        max_sum = max(max_sum, window_sum)
    return max_sum

arr = [2, 1, 5, 1, 3, 2]
print(maxSumSubarray(arr, 3))  # 9  (subarray [2,1,5] → wait, [5,1,3]=9)`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Maximum Sum Subarray</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Slide a fixed-size window of length k across the array. Update the sum in O(1) per step
                            by removing the outgoing element and adding the incoming one.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left column */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Visualization</h2>

                            {/* Controls row */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-slate-400 whitespace-nowrap">Window k:</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={array.length}
                                        value={k}
                                        onChange={e => { setK(Math.max(1, Math.min(array.length, parseInt(e.target.value) || 1))); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-16 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <button onClick={generateRandom}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
                                    <Shuffle className="h-4 w-4" /> Random
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm transition-colors">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            {/* Playback controls */}
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
                                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                    disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs text-slate-400">Speed</span>
                                    <input type="range" min={150} max={2000} step={50} value={2000 - speed}
                                        onChange={e => setSpeed(2000 - Number(e.target.value))}
                                        className="w-24 accent-violet-500" />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-violet-400">{cur.windowSum}</div>
                                    <div className="text-xs text-slate-400">Current Sum</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-green-400">{cur.maxSum}</div>
                                    <div className="text-xs text-slate-400">Max Sum</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-slate-300">{cur.windowStart}–{cur.windowEnd}</div>
                                    <div className="text-xs text-slate-400">Window</div>
                                </div>
                            </div>

                            {/* Array visualization */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {array.map((val, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-slate-500">{i}</span>
                                            <div className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 font-bold text-sm transition-all duration-300 ${getBoxColor(i)}`}>
                                                {val}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {!cur.done && (
                                    <p className="text-center text-xs text-slate-400 mt-3">
                                        Window [{cur.windowStart}..{cur.windowEnd}] = [{array.slice(cur.windowStart, cur.windowEnd + 1).join(', ')}]
                                    </p>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[
                                    ['bg-violet-800/50 border-violet-700', 'Current window'],
                                    ['bg-green-500', 'Maximum window (final)'],
                                    ['bg-slate-700', 'Outside window'],
                                ].map(([cls, label]) => (
                                    <span key={label} className="flex items-center gap-1.5">
                                        <span className={`w-3 h-3 rounded border border-slate-600 inline-block ${cls}`} />{label}
                                    </span>
                                ))}
                            </div>

                            {/* Explanation */}
                            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-violet-300 text-sm leading-relaxed">{cur.explanation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Time', 'O(n)', 'violet'], ['Space', 'O(1)', 'green'], ['Initial Sum', 'O(k)', 'yellow'], ['Per Slide', 'O(1)', 'green']].map(([label, val, color]) => (
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
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">1</span><span>Compute the sum of the first k elements — this is the initial window sum and initial max</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">2</span><span>Slide one step right: subtract the element leaving the left and add the element entering the right</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">3</span><span>Update the maximum sum if the new window sum is larger</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">4</span><span>Repeat until the window reaches the right end of the array</span></li>
                            </ol>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Applications</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Finding the busiest k-hour window in server logs</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Stock price analysis: best k-day gain window</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Image processing: sliding average filters (box blur)</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Network throughput: maximum bandwidth in any k-second window</span></li>
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
                                                    !quizState.answered
                                                        ? 'border-slate-600 bg-slate-800 hover:border-violet-500 hover:bg-violet-500/10 text-slate-200'
                                                        : idx === quizQuestions[quizState.current].correct
                                                            ? 'border-green-500 bg-green-500/10 text-green-300'
                                                            : idx === quizState.selected
                                                                ? 'border-red-500 bg-red-500/10 text-red-300'
                                                                : 'border-slate-700 bg-slate-800/50 text-slate-500'
                                                }`}>
                                                <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                                            </button>
                                        ))}
                                    </div>
                                    {quizState.answered && (
                                        <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${quizState.selected === quizQuestions[quizState.current].correct ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                                            {quizState.selected === quizQuestions[quizState.current].correct
                                                ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                                            <span>{quizQuestions[quizState.current].explanation}</span>
                                        </div>
                                    )}
                                    {quizState.answered && (
                                        <button onClick={nextQuestion} className="mt-3 text-sm text-violet-400 hover:text-violet-300">
                                            {quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                                    <div className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : quizState.score >= 2 ? 'Well done!' : 'Keep practicing!'}</div>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="text-sm text-violet-400 hover:text-violet-300">Retry quiz</button>
                                </div>
                            )}
                        </div>

                        {/* Code */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(v => !v)}
                                className="flex items-center gap-2 text-lg font-bold text-slate-100 w-full mb-3 hover:text-violet-400 transition-colors">
                                <Code className="h-5 w-5 text-violet-400" /> Implementation
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
