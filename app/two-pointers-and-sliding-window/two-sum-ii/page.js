'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why does this two-pointer approach work on a sorted array but not on an unsorted one?",
        options: [
            "Because sorting makes elements unique so no duplicates are counted",
            "Because sorting guarantees that moving the left pointer right increases the sum and moving the right pointer left decreases it",
            "Because sorting allows us to use binary search to find the answer faster",
            "Because unsorted arrays have no two elements that sum to the target",
        ],
        correct: 1,
        explanation: "The two-pointer method relies on sorted order to make a definitive decision at each step. If the current sum is too small, moving left rightward always increases it; if too large, moving right leftward always decreases it. Without sorting there is no such guarantee, so you cannot eliminate half the possibilities at each step."
    },
    {
        question: "What is the space complexity of the two-pointer approach to Two Sum II?",
        options: ["O(n) — we store a copy of the array", "O(log n) — recursion stack", "O(1) — only two pointer variables are used", "O(n²) — we compare all pairs"],
        correct: 2,
        explanation: "We use only two integer pointer variables (left and right) regardless of input size. No extra arrays or hash maps are needed because the sorted order gives us all the information we need. Space complexity is O(1)."
    },
    {
        question: "What happens when the current sum is less than the target?",
        options: [
            "Move the right pointer one step to the left",
            "Move the left pointer one step to the right",
            "Move both pointers inward simultaneously",
            "Return an empty result — no pair exists",
        ],
        correct: 1,
        explanation: "When sum < target we need a larger sum. Because the array is sorted, the smallest way to increase the sum is to move the left pointer rightward to a larger value. Moving the right pointer leftward would decrease the sum, which is the wrong direction."
    },
];

function generateRandomSortedArray() {
    const size = 8 + Math.floor(Math.random() * 3); // 8–10 elements
    const set = new Set();
    while (set.size < size) {
        set.add(1 + Math.floor(Math.random() * 50));
    }
    const arr = [...set].sort((a, b) => a - b);
    // Pick two distinct indices and set target to their sum
    const i = Math.floor(Math.random() * (arr.length - 1));
    const j = i + 1 + Math.floor(Math.random() * (arr.length - i - 1));
    const tgt = arr[i] + arr[j];
    return { arr, tgt };
}

export default function TwoSumIIPage() {
    const [array, setArray] = useState([2, 7, 11, 15, 18, 22, 30, 40]);
    const [target, setTarget] = useState(9);
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
        let left = 0, right = n - 1;
        let comparisons = 0;
        let foundLeft = -1, foundRight = -1;

        steps.push({
            left, right, foundLeft, foundRight,
            explanation: `Two Sum II: searching sorted array [${arr.join(', ')}] for target ${target}. Place left pointer at index 0 and right pointer at index ${n - 1}.`,
            comparisons,
            status: 'searching',
        });

        while (left < right) {
            const sum = arr[left] + arr[right];
            comparisons++;

            if (sum === target) {
                foundLeft = left;
                foundRight = right;
                steps.push({
                    left, right, foundLeft, foundRight,
                    explanation: `arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} = target ${target}. Pair found at indices ${left + 1} and ${right + 1} (1-indexed)!`,
                    comparisons,
                    status: 'found',
                });
                break;
            } else if (sum < target) {
                steps.push({
                    left, right, foundLeft: -1, foundRight: -1,
                    explanation: `arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} < ${target}. Sum too small — move left pointer right to increase it.`,
                    comparisons,
                    status: 'searching',
                });
                left++;
            } else {
                steps.push({
                    left, right, foundLeft: -1, foundRight: -1,
                    explanation: `arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} > ${target}. Sum too large — move right pointer left to decrease it.`,
                    comparisons,
                    status: 'searching',
                });
                right--;
            }
        }

        if (foundLeft === -1) {
            steps.push({
                left, right, foundLeft: -1, foundRight: -1,
                explanation: `Pointers crossed (left=${left} >= right=${right}). No pair sums to ${target} after ${comparisons} comparisons.`,
                comparisons,
                status: 'notfound',
            });
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
        const { arr, tgt } = generateRandomSortedArray();
        setArray(arr);
        setTarget(tgt);
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
        left: 0, right: array.length - 1, foundLeft: -1, foundRight: -1,
        explanation: 'Ready — press Play or step through.', comparisons: 0, status: 'searching',
    };

    const getBoxColor = (i) => {
        if (i === cur.foundLeft || i === cur.foundRight) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.left && i === cur.right) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i === cur.left) return 'bg-blue-500 border-blue-400 text-white scale-110';
        if (i === cur.right) return 'bg-orange-500 border-orange-400 text-white scale-110';
        if (i > cur.left && i < cur.right && cur.foundLeft === -1) return 'bg-violet-800/50 border-violet-700 text-slate-200';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const getLabelBelow = (i) => {
        if (i === cur.foundLeft && i === cur.foundRight) return { text: 'L=R', cls: 'text-green-400' };
        if (i === cur.foundLeft) return { text: 'L', cls: 'text-green-400' };
        if (i === cur.foundRight) return { text: 'R', cls: 'text-green-400' };
        if (i === cur.left && i === cur.right) return { text: 'L=R', cls: 'text-yellow-400' };
        if (i === cur.left) return { text: 'L', cls: 'text-blue-400' };
        if (i === cur.right) return { text: 'R', cls: 'text-orange-400' };
        return null;
    };

    const statusText = cur.status === 'found' ? 'Found' : cur.status === 'notfound' ? 'Not Found' : 'Searching';
    const statusColor = cur.status === 'found' ? 'text-green-400' : cur.status === 'notfound' ? 'text-red-400' : 'text-violet-400';

    const currentSum = cur.foundLeft !== -1
        ? `${array[cur.foundLeft]} + ${array[cur.foundRight]} = ${array[cur.foundLeft] + array[cur.foundRight]}`
        : (cur.left < array.length && cur.right >= 0 && cur.left <= cur.right)
            ? `${array[cur.left]} + ${array[cur.right]} = ${array[cur.left] + array[cur.right]}`
            : '—';

    const code = `def twoSum(numbers, target):
    left, right = 0, len(numbers) - 1
    while left < right:
        s = numbers[left] + numbers[right]
        if s == target:
            return [left + 1, right + 1]   # 1-indexed result
        elif s < target:
            left += 1   # need a larger sum
        else:
            right -= 1  # need a smaller sum
    return []

numbers = [2, 7, 11, 15]
print(twoSum(numbers, 9))  # [1, 2]`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Two Sum II</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Use two pointers starting at opposite ends of a sorted array. Converge inward based on
                            whether the current sum is too small or too large — O(n) time, O(1) space.
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
                                    <label className="text-sm text-slate-400 whitespace-nowrap">Target:</label>
                                    <input
                                        type="number"
                                        value={target}
                                        onChange={e => { setTarget(parseInt(e.target.value) || 0); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-violet-500"
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
                                    <div className="text-base font-bold text-violet-400">{cur.comparisons}</div>
                                    <div className="text-xs text-slate-400">Comparisons</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className={`text-base font-bold ${statusColor}`}>{statusText}</div>
                                    <div className="text-xs text-slate-400">Status</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-slate-300 font-mono text-sm">{currentSum}</div>
                                    <div className="text-xs text-slate-400">Current Sum</div>
                                </div>
                            </div>

                            {/* Array visualization */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {array.map((val, i) => {
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

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[
                                    ['bg-blue-500', 'Left pointer (L)'],
                                    ['bg-orange-500', 'Right pointer (R)'],
                                    ['bg-green-500', 'Found pair'],
                                    ['bg-violet-800/50 border-violet-700', 'Between pointers'],
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
                                {[['Best Case', 'O(1)', 'green'], ['Worst Case', 'O(n)', 'violet'], ['Average', 'O(n)', 'violet'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
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
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">1</span><span>Place left pointer at index 0, right pointer at index n-1</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">2</span><span>Compute sum = arr[left] + arr[right]</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">3</span><span>If sum == target: return [left+1, right+1]. If sum &lt; target: left++. If sum &gt; target: right--</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">4</span><span>Repeat until left &gt;= right (not found) or pair located</span></li>
                            </ol>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Why Sorted Order is Required</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Sorted order gives a decision rule: sum too small means move left right; sum too large means move right left</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Without sorting the same sum could be achieved by many pairs, so no single pointer move is safe</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>The problem name "Two Sum II" refers to LeetCode 167 where the input is guaranteed sorted</span></li>
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
