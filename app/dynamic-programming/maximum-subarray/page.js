"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, BarChart2, Shuffle, Trophy } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What decision does Kadane's algorithm make at each element?",
        options: [
            "Whether to sort the element into place",
            "Whether to extend the current subarray or restart from this element",
            "Whether to skip the element entirely",
            "Whether to swap it with the running maximum"
        ],
        correct: 1,
        explanation: "At index i the running sum becomes max(nums[i], currentSum + nums[i]). If the sum carried in is negative it can only hurt, so the algorithm drops it and restarts the subarray at i."
    },
    {
        question: "Why must maxSum start at nums[0] rather than 0?",
        options: [
            "To save one loop iteration",
            "Because 0 is not a valid array index",
            "So an all-negative array returns its largest element instead of 0",
            "Because the array is always sorted"
        ],
        correct: 2,
        explanation: "Starting maxSum at 0 would return 0 for an all-negative array, implying an empty subarray. Seeding it with nums[0] guarantees the answer is a real, non-empty subarray."
    },
    {
        question: "What are Kadane's time and space complexities?",
        options: [
            "O(n²) time, O(1) space",
            "O(n log n) time, O(n) space",
            "O(n) time, O(n) space",
            "O(n) time, O(1) space"
        ],
        correct: 3,
        explanation: "One pass over the array gives O(n) time, and only two numbers need to be carried — the running sum and the best sum — so space is O(1)."
    }
];

const DEFAULT_ARRAY = [-2, 1, -3, 4, -1, 2, 1, -5, 4];

const generateKadaneSteps = (nums) => {
    const steps = [];
    const n = nums.length;
    if (n === 0) return steps;

    const dp = new Array(n).fill(null);

    steps.push({
        index: -1, currentSum: 0, maxSum: null,
        curStart: 0, curEnd: -1, bestStart: -1, bestEnd: -1,
        dp: [...dp], decision: null, phase: 'initialize',
        explanation: `Starting Kadane's algorithm on [${nums.join(', ')}]. Goal: find the contiguous subarray with the largest sum in a single pass.`
    });

    let currentSum = nums[0];
    let maxSum = nums[0];
    let curStart = 0;
    let bestStart = 0;
    let bestEnd = 0;
    dp[0] = currentSum;

    steps.push({
        index: 0, currentSum, maxSum,
        curStart: 0, curEnd: 0, bestStart, bestEnd,
        dp: [...dp], decision: null, phase: 'base_case',
        explanation: `Base case: both the running sum and the best sum start at nums[0] = ${nums[0]}. Seeding with the first element (not 0) is what makes an all-negative array return its largest element.`
    });

    for (let i = 1; i < n; i++) {
        const extend = currentSum + nums[i];
        const restart = nums[i];
        const chosen = restart > extend ? 'restart' : 'extend';

        steps.push({
            index: i, currentSum, maxSum,
            curStart, curEnd: i - 1, bestStart, bestEnd,
            dp: [...dp], phase: 'comparing',
            decision: { extend, restart, chosen },
            explanation: `Element ${i} (${nums[i]}): extend the current subarray to ${currentSum} + ${nums[i]} = ${extend}, or restart from ${nums[i]} alone? Take the larger.`
        });

        if (restart > extend) {
            currentSum = restart;
            curStart = i;
        } else {
            currentSum = extend;
        }
        dp[i] = currentSum;

        steps.push({
            index: i, currentSum, maxSum,
            curStart, curEnd: i, bestStart, bestEnd,
            dp: [...dp], phase: 'decision_made',
            decision: { extend, restart, chosen },
            explanation: chosen === 'restart'
                ? `Restart. The sum carried in (${extend - nums[i]}) was dragging the total down, so the subarray now begins at index ${i}. Running sum = ${currentSum}.`
                : `Extend. Keeping the previous sum is better, so the subarray now spans indices ${curStart}–${i}. Running sum = ${currentSum}.`
        });

        if (currentSum > maxSum) {
            maxSum = currentSum;
            bestStart = curStart;
            bestEnd = i;
            steps.push({
                index: i, currentSum, maxSum,
                curStart, curEnd: i, bestStart, bestEnd,
                dp: [...dp], decision: null, phase: 'new_best',
                explanation: `New best. The running sum ${currentSum} beats the previous best, so the answer is now indices ${bestStart}–${bestEnd} with sum ${maxSum}.`
            });
        }
    }

    steps.push({
        index: -1, currentSum, maxSum,
        curStart, curEnd: n - 1, bestStart, bestEnd,
        dp: [...dp], decision: null, phase: 'complete',
        explanation: `Done in one pass. The maximum subarray is [${nums.slice(bestStart, bestEnd + 1).join(', ')}] spanning indices ${bestStart}–${bestEnd}, with sum ${maxSum}.`
    });

    return steps;
};

const MaximumSubarrayPage = () => {
    const [nums, setNums] = useState(DEFAULT_ARRAY);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateKadaneSteps(nums));
        setCurrentStep(0);
    }, [nums]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const randomize = () => {
        const len = Math.floor(Math.random() * 4) + 7;
        setNums(Array.from({ length: len }, () => Math.floor(Math.random() * 17) - 7));
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        index: -1, currentSum: 0, maxSum: null, curStart: 0, curEnd: -1,
        bestStart: -1, bestEnd: -1, dp: Array(nums.length).fill(null),
        decision: null, phase: 'start', explanation: 'Click Play to begin'
    };

    const inBest = (i) =>
        currentState.bestStart >= 0 && i >= currentState.bestStart && i <= currentState.bestEnd;
    const inCurrent = (i) =>
        currentState.curEnd >= currentState.curStart && i >= currentState.curStart && i <= currentState.curEnd;

    const getCellColor = (i) => {
        if (i === currentState.index) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (currentState.phase === 'complete' && inBest(i)) return 'bg-green-500 border-green-400 text-white scale-105';
        if (inBest(i) && inCurrent(i)) return 'bg-green-600/80 border-green-500 text-white';
        if (inBest(i)) return 'bg-green-800/60 border-green-700 text-green-200';
        if (inCurrent(i)) return 'bg-rose-800/50 border-rose-700 text-slate-200';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const maxAbs = Math.max(...nums.map(v => Math.abs(v)), 1);

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `def max_subarray(nums):
    # Seed with nums[0], not 0, so an all-negative
    # array returns its largest element.
    current_sum = max_sum = nums[0]

    for num in nums[1:]:
        # Extend the running subarray, or restart at num.
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)

    return max_sum


# Variant that also reports which subarray won
def max_subarray_with_bounds(nums):
    current_sum = max_sum = nums[0]
    cur_start = best_start = best_end = 0

    for i in range(1, len(nums)):
        if nums[i] > current_sum + nums[i]:
            current_sum = nums[i]
            cur_start = i          # the carried sum hurt, so drop it
        else:
            current_sum += nums[i]

        if current_sum > max_sum:
            max_sum = current_sum
            best_start, best_end = cur_start, i

    return max_sum, (best_start, best_end)`;

    const jsExample = `function maxSubarray(nums) {
    let currentSum = nums[0];
    let maxSum = nums[0];

    for (let i = 1; i < nums.length; i++) {
        // Either the previous sum helps, or it does not.
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }

    return maxSum;
}`;

    const best = currentState.bestStart >= 0
        ? nums.slice(currentState.bestStart, currentState.bestEnd + 1)
        : [];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <BarChart2 className="h-10 w-10" />Maximum Subarray
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Kadane&apos;s algorithm finds the contiguous subarray with the largest sum in a single pass, by asking one question at every element: extend, or start over?
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Optimized DP</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Running Sum</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => setIsPlaying(p => !p)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium" disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}><SkipBack size={18} />Step Back</button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}><SkipForward size={18} />Step Forward</button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"><RotateCcw size={18} />Reset</button>
                                <button onClick={randomize} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"><Shuffle size={18} />Randomize</button>
                                <button onClick={() => { setNums([...DEFAULT_ARRAY]); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">Original</button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Array (comma-separated, negatives welcome):</label>
                                <input type="text" value={nums.join(', ')}
                                    onChange={e => {
                                        const v = e.target.value.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                                        if (v.length > 0) setNums(v.slice(0, 14));
                                    }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" placeholder="-2, 1, -3, 4, -1, 2, 1, -5, 4" />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (300ms)</span><span>Slow (2000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Phase: {currentState.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {/* Running registers */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-rose-700/50 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Running Sum</div>
                                    <div className="text-3xl font-bold text-rose-300">{currentState.currentSum}</div>
                                    <div className="text-xs text-slate-500 mt-1">max ending here</div>
                                </div>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-green-700/50 text-center">
                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Best Sum</div>
                                    <div className="text-3xl font-bold text-green-400">{currentState.maxSum === null ? '—' : currentState.maxSum}</div>
                                    <div className="text-xs text-slate-500 mt-1">answer so far</div>
                                </div>
                            </div>

                            {/* Signed bar chart */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Array</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    <div className="flex justify-center items-center gap-2 h-40">
                                        {nums.map((v, i) => (
                                            <div key={i} className="flex flex-col items-center justify-center h-full" style={{ width: '44px' }}>
                                                <div className="flex-1 flex flex-col justify-end w-full">
                                                    {v > 0 && (
                                                        <div className={`w-full rounded-t border-2 transition-all duration-500 ${getCellColor(i)}`}
                                                            style={{ height: `${(Math.abs(v) / maxAbs) * 100}%`, minHeight: '8px' }} />
                                                    )}
                                                </div>
                                                <div className="w-full h-px bg-slate-600" />
                                                <div className="flex-1 flex flex-col justify-start w-full">
                                                    {v < 0 && (
                                                        <div className={`w-full rounded-b border-2 transition-all duration-500 ${getCellColor(i)}`}
                                                            style={{ height: `${(Math.abs(v) / maxAbs) * 100}%`, minHeight: '8px' }} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center gap-2 mt-2">
                                        {nums.map((v, i) => (
                                            <div key={i} className="text-center" style={{ width: '44px' }}>
                                                <div className={`rounded border-2 py-1 font-bold text-sm transition-all duration-500 ${getCellColor(i)}`}>{v}</div>
                                                <div className="text-[10px] text-slate-500 mt-1">{i}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />current element</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-rose-800 inline-block" />running subarray</span>
                                        <span className="flex items-center gap-1 text-slate-400"><span className="w-3 h-3 rounded bg-green-600 inline-block" />best so far</span>
                                    </div>
                                </div>
                            </div>

                            {/* Extend vs restart */}
                            {currentState.decision && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Extend or Restart?</h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <div className={`p-3 rounded border-2 text-center transition-all ${currentState.decision.chosen === 'extend' ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                            <div className="font-semibold text-sm text-slate-200 mb-1">Extend</div>
                                            <div className="text-2xl font-bold text-green-400">{currentState.decision.extend}</div>
                                            <div className="text-xs text-slate-500 mt-1">running sum + nums[{currentState.index}]</div>
                                        </div>
                                        <div className={`p-3 rounded border-2 text-center transition-all ${currentState.decision.chosen === 'restart' ? 'border-orange-400 bg-orange-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                            <div className="font-semibold text-sm text-slate-200 mb-1">Restart</div>
                                            <div className="text-2xl font-bold text-orange-400">{currentState.decision.restart}</div>
                                            <div className="text-xs text-slate-500 mt-1">nums[{currentState.index}] alone</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* dp row */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Max Ending Here — the running sum at each index</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    <div className="flex justify-center gap-2 flex-wrap">
                                        {currentState.dp.map((val, i) => (
                                            <div key={i} className="text-center">
                                                <div className="text-[10px] text-slate-500 mb-1">dp[{i}]</div>
                                                <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${val === null
                                                    ? 'bg-slate-700 border-slate-600 text-slate-500'
                                                    : i === currentState.index
                                                        ? 'bg-yellow-400 border-yellow-300 text-slate-900'
                                                        : val === currentState.maxSum
                                                            ? 'bg-green-600 border-green-500 text-white'
                                                            : 'bg-rose-900/70 border-rose-800 text-rose-200'}`}>
                                                    {val === null ? '—' : val}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-300 mb-1">Current Step</h3>
                                        <p className="text-rose-200 text-sm leading-relaxed">{currentState.explanation}</p>
                                        {currentState.phase === 'complete' && (
                                            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-green-300 text-sm font-medium flex items-center gap-2">
                                                <Trophy className="h-4 w-4 flex-shrink-0" />
                                                Maximum subarray [{best.join(', ')}] — sum {currentState.maxSum}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Passes:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">1</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded">Optimized DP</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Recurrence:</strong> cur = max(nums[i], cur + nums[i])</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Insight:</strong> a negative carried sum can only hurt, so drop it</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Seed:</strong> start both sums at nums[0], never 0</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Why it is DP:</strong> dp[i] is the best subarray ending exactly at i</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-rose-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Code
                            </button>
                            {showCode && (
                                <div className="mt-4 space-y-4">
                                    <CodeBlock code={codeExample} language="python" />
                                    <CodeBlock code={jsExample} language="javascript" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaximumSubarrayPage;
