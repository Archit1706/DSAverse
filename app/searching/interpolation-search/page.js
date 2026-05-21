'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What type of data gives interpolation search its best-case O(log log n) performance?",
        options: ["Any sorted array", "Uniformly distributed sorted data", "Arrays with all distinct elements", "Arrays sorted in reverse order"],
        correct: 1,
        explanation: "When values are uniformly distributed (evenly spaced), the probe formula accurately estimates the target's position. The estimated position is close to actual, so the range shrinks doubly logarithmically — O(log log n). Non-uniform data degrades performance to O(n) in the worst case."
    },
    {
        question: "What is the worst-case time complexity of interpolation search?",
        options: ["O(log n)", "O(log log n)", "O(√n)", "O(n)"],
        correct: 3,
        explanation: "If data is highly non-uniform (e.g., exponentially distributed), the probe formula gives terrible estimates and the search degrades to O(n) — similar to linear search. This is why interpolation search is only preferred when data is known to be uniformly distributed."
    },
    {
        question: "The probe position formula pos = low + (target - arr[low]) × (high - low) / (arr[high] - arr[low]) works like:",
        options: ["The mid formula in binary search", "Telephone directory lookup — guess position by value proportion", "A random hash function", "The jump size formula in jump search"],
        correct: 1,
        explanation: "The formula is linear interpolation: it estimates where the target lies between arr[low] and arr[high] proportionally by value. If target is 70% of the way from arr[low] to arr[high] by value, the probe is at 70% of the index range. This is exactly how you'd search a phone book by last name."
    }
];

export default function InterpolationSearchPage() {
    const [array, setArray] = useState([10, 12, 13, 16, 18, 19, 20, 21, 22, 23, 24, 33, 35, 42, 47]);
    const [target, setTarget] = useState(18);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const arr = array;
        let low = 0, high = arr.length - 1, found = false, foundIndex = -1, comparisons = 0;

        steps.push({
            low, high, pos: -1, found: false, foundIndex: -1,
            explanation: `Interpolation search for ${target} in sorted uniform array. Uses value proportions to estimate target position — like searching a phone book.`,
            formula: '', comparisons: 0
        });

        while (low <= high && target >= arr[low] && target <= arr[high]) {
            if (low === high) {
                comparisons++;
                if (arr[low] === target) {
                    found = true; foundIndex = low;
                    steps.push({ low, high, pos: low, found: true, foundIndex, explanation: `Single element range. arr[${low}]=${arr[low]} equals ${target}. Found!`, formula: '', comparisons });
                } else {
                    steps.push({ low, high, pos: low, found: false, foundIndex: -1, explanation: `Single element arr[${low}]=${arr[low]} != ${target}. Not found.`, formula: '', comparisons });
                }
                break;
            }

            const range = arr[high] - arr[low];
            const pos = low + Math.floor(((target - arr[low]) * (high - low)) / range);
            const formula = `pos = ${low} + floor((${target}-${arr[low]}) × (${high}-${low}) / (${arr[high]}-${arr[low]})) = ${pos}`;
            comparisons++;

            steps.push({
                low, high, pos, found: false, foundIndex: -1,
                explanation: `Range [${low}, ${high}]. Probe estimate: ${formula}. Checking arr[${pos}]=${arr[pos]}.`,
                formula, comparisons
            });

            if (arr[pos] === target) {
                found = true; foundIndex = pos;
                steps.push({ low, high, pos, found: true, foundIndex, explanation: `arr[${pos}]=${arr[pos]} equals ${target}. Found at index ${pos}!`, formula, comparisons });
                break;
            } else if (arr[pos] < target) {
                steps.push({ low, high, pos, found: false, foundIndex: -1, explanation: `arr[${pos}]=${arr[pos]} < ${target}. Target must be to the right. Set low = ${pos + 1}.`, formula, comparisons });
                low = pos + 1;
            } else {
                steps.push({ low, high, pos, found: false, foundIndex: -1, explanation: `arr[${pos}]=${arr[pos]} > ${target}. Target must be to the left. Set high = ${pos - 1}.`, formula, comparisons });
                high = pos - 1;
            }
        }

        if (!found && !steps.some(s => s.found)) {
            steps.push({ low, high, pos: -1, found: false, foundIndex: -1, explanation: `Target ${target} not in range [arr[${low}], arr[${high}]]. Not found after ${comparisons} comparisons.`, formula: '', comparisons });
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
        const arr = Array.from({ length: 15 }, (_, i) => 10 + i * (Math.floor(Math.random() * 4) + 2)).slice(0, 15);
        const unique = [...new Set(arr)].sort((a, b) => a - b).slice(0, 15);
        setArray(unique); setIsPlaying(false); setCurrentStep(0);
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
        low: 0, high: array.length - 1, pos: -1, found: false, foundIndex: -1,
        explanation: 'Ready — press Play or step through manually.', formula: '', comparisons: 0
    };

    const getColor = (i) => {
        if (i === cur.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.pos && cur.pos !== -1) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i >= cur.low && i <= cur.high && cur.low !== -1)
            return 'bg-red-800/50 border-red-700 text-slate-200';
        return 'bg-slate-800 border-slate-700 text-slate-500';
    };

    const getLabelBelow = (i) => {
        if (i === cur.foundIndex) return { text: 'FOUND', cls: 'text-green-400' };
        if (i === cur.pos && cur.pos !== -1) return { text: 'PROBE', cls: 'text-yellow-400' };
        if (i === cur.low && i !== cur.high) return { text: 'L', cls: 'text-orange-400' };
        if (i === cur.high && i !== cur.low) return { text: 'H', cls: 'text-orange-400' };
        return null;
    };

    const code = `def interpolation_search(arr, target):
    """
    O(log log n) avg for uniform data, O(n) worst case.
    Like searching a phone book: estimate position by value.
    """
    low, high = 0, len(arr) - 1

    while low <= high and arr[low] <= target <= arr[high]:
        if low == high:
            return low if arr[low] == target else -1

        # Probe: estimate target's position by value proportion
        pos = low + int(
            (target - arr[low]) * (high - low)
            / (arr[high] - arr[low])
        )

        if arr[pos] == target:
            return pos
        elif arr[pos] < target:
            low = pos + 1   # target in right portion
        else:
            high = pos - 1  # target in left portion

    return -1  # out of range

# Example — uniform distribution works best
arr = [10, 12, 13, 16, 18, 19, 20, 21, 22, 23, 24, 33, 35, 42, 47]
print(interpolation_search(arr, 18))   # 4
print(interpolation_search(arr, 100))  # -1`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Interpolation Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            Estimates target position using value proportions — like a phone book lookup.
                            O(log log n) for uniform data; degrades to O(n) for skewed distributions.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ── Left ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Visualization</h2>

                            <div className="flex flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-slate-400">Target:</label>
                                    <input type="number" value={target}
                                        onChange={e => { setTarget(parseInt(e.target.value) || 0); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                                </div>
                                <button onClick={generateRandom} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm">
                                    <Shuffle className="h-4 w-4" /> Random Uniform
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs text-slate-400">Speed</span>
                                    <input type="range" min={150} max={1800} step={50} value={1950 - speed}
                                        onChange={e => setSpeed(1950 - Number(e.target.value))} className="w-24 accent-red-500" />
                                </div>
                            </div>

                            {/* Probe formula display */}
                            {cur.formula && (
                                <div className="mb-3 bg-slate-800/60 rounded-lg px-3 py-2 font-mono text-xs text-yellow-300 break-all">
                                    {cur.formula}
                                </div>
                            )}

                            {/* Array */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 overflow-x-auto">
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {array.map((val, i) => {
                                        const lbl = getLabelBelow(i);
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <span className="text-xs text-slate-500">{i}</span>
                                                <div className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 font-bold text-xs transition-all duration-300 ${getColor(i)}`}>
                                                    {val}
                                                </div>
                                                {lbl && <span className={`text-xs font-bold ${lbl.cls}`}>{lbl.text}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[['bg-yellow-400', 'Probe (est. pos)'], ['bg-green-500', 'Found'], ['bg-red-800/50 border-red-700', 'Search range'], ['bg-slate-800', 'Eliminated']].map(([cls, label]) => (
                                    <span key={label} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded border border-slate-600 inline-block ${cls}`} />{label}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['Target', target], ['Comparisons', cur.comparisons], ['Step', `${currentStep + 1}/${stepHistory.length}`]].map(([label, val]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-base font-bold text-red-400">{val}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-300 text-sm leading-relaxed">{cur.explanation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right ── */}
                    <div className="space-y-5">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Best Case', 'O(1)', 'green'], ['Average (uniform)', 'O(log log n)', 'green'], ['Worst (skewed)', 'O(n)', 'red'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-sm font-bold text-${color}-400`}>{val}</div>
                                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">The Probe Formula</h2>
                            <div className="bg-slate-800/60 rounded-lg p-3 font-mono text-xs text-yellow-300 mb-3 break-all">
                                pos = low + floor((target - arr[low]) × (high - low) / (arr[high] - arr[low]))
                            </div>
                            <ul className="space-y-1.5 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>If target is 30% between arr[low] and arr[high] by value, probe at 30% of the index range</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Works perfectly when values are evenly spaced</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Degrades when values cluster or have large gaps</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">When to Use</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-green-400">✓</span><span>Uniformly distributed numeric data (database indices, phone numbers)</span></li>
                                <li className="flex gap-2"><span className="text-green-400">✓</span><span>When O(log log n) vs O(log n) matters at very large scale</span></li>
                                <li className="flex gap-2"><span className="text-red-400">✗</span><span>Clustered, exponential, or unknown distributions</span></li>
                                <li className="flex gap-2"><span className="text-red-400">✗</span><span>Non-numeric data (cannot interpolate strings directly)</span></li>
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
                                                    !quizState.answered ? 'border-slate-600 bg-slate-800 hover:border-red-500 hover:bg-red-500/10 text-slate-200'
                                                    : idx === quizQuestions[quizState.current].correct ? 'border-green-500 bg-green-500/10 text-green-300'
                                                    : idx === quizState.selected ? 'border-red-500 bg-red-500/10 text-red-300'
                                                    : 'border-slate-700 bg-slate-800/50 text-slate-500'
                                                }`}>
                                                <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                                            </button>
                                        ))}
                                    </div>
                                    {quizState.answered && (
                                        <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${quizState.selected === quizQuestions[quizState.current].correct ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                                            {quizState.selected === quizQuestions[quizState.current].correct ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                                            <span>{quizQuestions[quizState.current].explanation}</span>
                                        </div>
                                    )}
                                    {quizState.answered && <button onClick={nextQuestion} className="mt-3 text-sm text-red-400 hover:text-red-300">{quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}</button>}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                                    <div className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : quizState.score >= 2 ? 'Well done!' : 'Keep practicing!'}</div>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="text-sm text-red-400 hover:text-red-300">Retry quiz</button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(v => !v)} className="flex items-center gap-2 text-lg font-bold text-slate-100 w-full mb-3 hover:text-red-400 transition-colors">
                                <Code className="h-5 w-5 text-red-400" /> Implementation
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
