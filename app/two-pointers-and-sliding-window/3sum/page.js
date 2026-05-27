'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why must the array be sorted before applying the two-pointer technique in 3Sum?",
        options: [
            "Sorting makes duplicate removal easier by grouping equal values together",
            "Sorting allows skipping the pivot entirely",
            "Both A and the fact that sorted order lets us make a definitive decision (move left or right) at each step based on the current sum",
            "Sorting is only needed to print the triplets in order",
        ],
        correct: 2,
        explanation: "Sorting serves two purposes: (1) it groups duplicates so we can skip them with a simple neighbour-check, and (2) it gives the two-pointer technique its decision rule — if the sum is too small, moving left rightward increases it; if too large, moving right leftward decreases it. Without sorting neither property holds.",
    },
    {
        question: "What is the overall time complexity of the 3Sum algorithm?",
        options: ["O(n) — one pass with two pointers", "O(n log n) — dominated by sorting", "O(n²) — outer pivot loop × inner two-pointer sweep", "O(n³) — three nested loops"],
        correct: 2,
        explanation: "Sorting costs O(n log n). The outer loop runs O(n) times; for each pivot the two-pointer sweep runs O(n). Total: O(n²). This is a significant improvement over the brute-force O(n³) approach of trying every triplet.",
    },
    {
        question: "Why do we skip a pivot when nums[i] == nums[i-1]?",
        options: [
            "To avoid an index-out-of-bounds error",
            "Because a repeated pivot would generate the same set of triplets already found in the previous iteration",
            "Because equal pivots always produce a sum greater than zero",
            "To improve average-case performance only — correctness is unaffected",
        ],
        correct: 1,
        explanation: "If the current pivot equals the previous one, the remaining sub-array to its right is identical. Any triplet the current pivot could form was already found (or rejected) when the previous identical pivot ran. Skipping prevents duplicate triplets in the output.",
    },
];

const DEFAULT_ARRAY = [-4, -1, -1, 0, 1, 2];

function randomArray() {
    const n = 6 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: n }, () => Math.floor(Math.random() * 13) - 6);
    return arr.sort((a, b) => a - b);
}

export default function ThreeSumPage() {
    const [inputArray, setInputArray] = useState(DEFAULT_ARRAY);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(800);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const nums = [...inputArray].sort((a, b) => a - b);
        const n = nums.length;
        const triplets = [];

        steps.push({
            nums, pivot: -1, left: -1, right: -1, triplets: [],
            explanation: `Sorted array: [${nums.join(', ')}]. Now fix each pivot from left to right and run a two-pointer sweep on the remaining elements.`,
            phase: 'init', currentSum: null,
        });

        for (let i = 0; i <= n - 3; i++) {
            // Skip duplicate pivot
            if (i > 0 && nums[i] === nums[i - 1]) {
                steps.push({
                    nums, pivot: i, left: i + 1, right: n - 1, triplets: [...triplets],
                    explanation: `nums[${i}]=${nums[i]} equals previous pivot — skip to avoid duplicate triplets.`,
                    phase: 'skip_pivot', currentSum: null,
                });
                continue;
            }

            steps.push({
                nums, pivot: i, left: i + 1, right: n - 1, triplets: [...triplets],
                explanation: `Pivot = nums[${i}] = ${nums[i]}. Set left = ${i + 1}, right = ${n - 1}. Sweep inward to find pairs summing to ${-nums[i]}.`,
                phase: 'pivot', currentSum: null,
            });

            let left = i + 1, right = n - 1;
            while (left < right) {
                const sum = nums[i] + nums[left] + nums[right];

                steps.push({
                    nums, pivot: i, left, right, triplets: [...triplets],
                    explanation: `nums[${i}]+nums[${left}]+nums[${right}] = ${nums[i]}+${nums[left]}+${nums[right]} = ${sum}.${sum === 0 ? ' Triplet found!' : sum < 0 ? ' Sum too small — move left right.' : ' Sum too large — move right left.'}`,
                    phase: 'compare', currentSum: sum,
                });

                if (sum === 0) {
                    triplets.push([nums[i], nums[left], nums[right]]);
                    steps.push({
                        nums, pivot: i, left, right, triplets: [...triplets],
                        explanation: `Found triplet [${nums[i]}, ${nums[left]}, ${nums[right]}]. Skip duplicate values on both sides.`,
                        phase: 'found', currentSum: 0,
                    });
                    while (left < right && nums[left] === nums[left + 1]) left++;
                    while (left < right && nums[right] === nums[right - 1]) right--;
                    left++; right--;
                } else if (sum < 0) {
                    left++;
                } else {
                    right--;
                }
            }
        }

        steps.push({
            nums, pivot: n, left: -1, right: -1, triplets: [...triplets],
            explanation: `Done. Found ${triplets.length} unique triplet${triplets.length !== 1 ? 's' : ''}: ${triplets.map(t => `[${t.join(', ')}]`).join(', ') || 'none'}.`,
            phase: 'done', currentSum: null,
        });

        return steps;
    }, [inputArray]);

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); }, [generateSteps]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

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
        nums: [...inputArray].sort((a, b) => a - b),
        pivot: -1, left: -1, right: -1, triplets: [],
        explanation: 'Ready — press Play or step through.', phase: 'init', currentSum: null,
    };

    const getBoxColor = (i) => {
        if (cur.phase === 'found' && (i === cur.pivot || i === cur.left || i === cur.right))
            return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.pivot) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i === cur.left) return 'bg-blue-500 border-blue-400 text-white scale-110';
        if (i === cur.right) return 'bg-orange-500 border-orange-400 text-white scale-110';
        if (cur.pivot >= 0 && i < cur.pivot) return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const getLabelBelow = (i) => {
        if (i === cur.pivot) return { text: 'P', cls: 'text-yellow-400' };
        if (i === cur.left && i === cur.right) return { text: 'L=R', cls: 'text-slate-300' };
        if (i === cur.left) return { text: 'L', cls: 'text-blue-400' };
        if (i === cur.right) return { text: 'R', cls: 'text-orange-400' };
        return null;
    };

    const sumColor = cur.currentSum === null ? 'text-slate-400'
        : cur.currentSum === 0 ? 'text-green-400'
        : cur.currentSum < 0 ? 'text-blue-400'
        : 'text-orange-400';

    const code = `def threeSum(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue  # skip duplicate pivot
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return result

print(threeSum([-1, 0, 1, 2, -1, -4]))  # [[-1,-1,2],[-1,0,1]]`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">3Sum</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Sort the array, fix a pivot (yellow), then sweep two pointers from both ends of the
                            remaining subarray. Duplicates are skipped automatically to keep triplets unique.
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

                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <button onClick={() => { setInputArray(randomArray()); setIsPlaying(false); setCurrentStep(0); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
                                    <Shuffle className="h-4 w-4" /> Random
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm transition-colors">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            {/* Playback */}
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
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
                                    <div className="text-base font-bold text-yellow-400">
                                        {cur.pivot >= 0 && cur.pivot < cur.nums.length ? cur.nums[cur.pivot] : '—'}
                                    </div>
                                    <div className="text-xs text-slate-400">Pivot</div>
                                </div>
                                <div className={`bg-slate-800/60 rounded-lg p-3 text-center`}>
                                    <div className={`text-base font-bold font-mono ${sumColor}`}>
                                        {cur.currentSum === null ? '—' : cur.currentSum}
                                    </div>
                                    <div className="text-xs text-slate-400">Current sum</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-green-400">{cur.triplets.length}</div>
                                    <div className="text-xs text-slate-400">Triplets found</div>
                                </div>
                            </div>

                            {/* Array visualization */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {cur.nums.map((val, i) => {
                                        const lbl = getLabelBelow(i);
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <span className="text-xs text-slate-500">{i}</span>
                                                <div className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 font-bold text-sm transition-all duration-300 ${getBoxColor(i)}`}>
                                                    {val}
                                                </div>
                                                {lbl
                                                    ? <span className={`text-xs font-bold ${lbl.cls}`}>{lbl.text}</span>
                                                    : <span className="text-xs text-transparent select-none">–</span>
                                                }
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Triplets panel */}
                            {cur.triplets.length > 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-green-400 font-semibold mb-2">Found triplets</p>
                                    <div className="flex flex-wrap gap-2">
                                        {cur.triplets.map((t, i) => (
                                            <span key={i} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-mono">
                                                [{t.join(', ')}]
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[
                                    ['bg-yellow-400', 'Pivot (P)'],
                                    ['bg-blue-500', 'Left pointer (L)'],
                                    ['bg-orange-500', 'Right pointer (R)'],
                                    ['bg-green-500', 'Triplet found'],
                                    ['bg-slate-800', 'Already processed'],
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
                                {[['Best Case', 'O(n²)', 'violet'], ['Worst Case', 'O(n²)', 'violet'], ['Sorting', 'O(n log n)', 'yellow'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
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
                                {[
                                    'Sort the array so duplicates are adjacent and two-pointer decisions are valid',
                                    'Fix pivot i from 0 to n−3; skip if nums[i] == nums[i−1]',
                                    'Set left = i+1, right = n−1. Compute sum = nums[i]+nums[left]+nums[right]',
                                    'If sum == 0: record triplet, skip duplicate left/right values, move both inward',
                                    'If sum < 0: left++ (need larger). If sum > 0: right-- (need smaller)',
                                ].map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
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
