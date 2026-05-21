'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Target, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the time complexity of linear search in the worst case (target not present)?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        correct: 2,
        explanation: "Linear search must check every element when the target is absent, making n comparisons. Worst case is O(n). Best case is O(1) when the target is the first element."
    },
    {
        question: "What key advantage does linear search have over binary search?",
        options: ["It is always faster", "It requires O(n) extra space", "It works on unsorted arrays", "It uses divide and conquer"],
        correct: 2,
        explanation: "Linear search makes no assumption about element ordering — it works on any array (sorted or not), any data structure with sequential access (linked lists), and can find all occurrences in a single pass."
    },
    {
        question: "In a linear search that finds all occurrences (not just the first), how many comparisons are made for an array of n elements?",
        options: ["Exactly 1", "At most log n", "Exactly n", "It depends on the target"],
        correct: 2,
        explanation: "To guarantee finding all occurrences, the full array must be scanned from start to end. Exactly n comparisons are always made regardless of the target's presence — making average and worst case both O(n)."
    }
];

export default function LinearSearchPage() {
    const [array, setArray] = useState([45, 23, 78, 12, 67, 34, 89, 56, 23, 91]);
    const [target, setTarget] = useState(23);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const arr = array;
        const foundIndices = [];

        steps.push({
            currentIndex: -1, foundIndices: [], checked: [],
            explanation: `Linear search for target ${target}. Will check each element from left to right — no sorting required.`,
            comparisons: 0
        });

        for (let i = 0; i < arr.length; i++) {
            const isMatch = arr[i] === target;
            steps.push({
                currentIndex: i,
                foundIndices: [...foundIndices],
                checked: Array.from({ length: i }, (_, j) => j),
                explanation: `Index ${i}: ${arr[i]} ${isMatch ? '==' : '!='} ${target}${isMatch ? ' — match!' : ''}`,
                comparisons: i + 1
            });
            if (isMatch) {
                foundIndices.push(i);
                steps.push({
                    currentIndex: i,
                    foundIndices: [...foundIndices],
                    checked: Array.from({ length: i + 1 }, (_, j) => j),
                    explanation: `Target ${target} found at index ${i}. Continuing scan to find all occurrences.`,
                    comparisons: i + 1
                });
            }
        }

        steps.push({
            currentIndex: -1,
            foundIndices,
            checked: Array.from({ length: arr.length }, (_, i) => i),
            explanation: foundIndices.length > 0
                ? `Search complete. Found ${foundIndices.length} occurrence(s) of ${target} at index(es): [${foundIndices.join(', ')}].`
                : `Search complete. Target ${target} not found in the array after ${arr.length} comparisons.`,
            comparisons: arr.length
        });

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
        const arr = Array.from({ length: 10 }, () => Math.floor(Math.random() * 90) + 5);
        setArray(arr);
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

    const cur = stepHistory[currentStep] || { currentIndex: -1, foundIndices: [], checked: [], explanation: 'Ready — click Play or step through manually.', comparisons: 0 };

    const getColor = (i) => {
        if (cur.foundIndices.includes(i)) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.currentIndex) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (cur.checked.includes(i)) return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const code = `def linear_search_all(arr, target):
    """Find ALL occurrences — O(n) time, O(1) space"""
    found = []
    for i, val in enumerate(arr):
        if val == target:
            found.append(i)
    return found if found else -1

def linear_search_first(arr, target):
    """Find FIRST occurrence only"""
    for i, val in enumerate(arr):
        if val == target:
            return i
    return -1

# Example
arr = [45, 23, 78, 12, 67, 34, 89, 56, 23, 91]
print(linear_search_all(arr, 23))   # [1, 8]
print(linear_search_first(arr, 23)) # 1`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Linear Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            Check every element one by one until the target is found — or the array ends.
                            Simple, universal, finds all occurrences in a single pass.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* ── Left: Visualization ── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Visualization</h2>

                            {/* Inputs */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-slate-400 whitespace-nowrap">Target:</label>
                                    <input type="number" value={target}
                                        onChange={e => { setTarget(parseInt(e.target.value) || 0); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                                </div>
                                <button onClick={generateRandom}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm">
                                    <Shuffle className="h-4 w-4" /> Random
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            {/* Playback */}
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                    disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs text-slate-400">Speed</span>
                                    <input type="range" min={150} max={1800} step={50} value={1950 - speed}
                                        onChange={e => setSpeed(1950 - Number(e.target.value))}
                                        className="w-24 accent-red-500" />
                                </div>
                            </div>

                            {/* Array */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {array.map((val, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-slate-500">{i}</span>
                                            <div className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 font-bold text-sm transition-all duration-300 ${getColor(i)}`}>
                                                {val}
                                            </div>
                                            {i === cur.currentIndex && <div className="w-2 h-1 bg-yellow-400 rounded" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[['bg-yellow-400', 'Currently checking'], ['bg-green-500', 'Found'], ['bg-slate-800', 'Already checked'], ['bg-slate-700', 'Unchecked']].map(([cls, label]) => (
                                    <span key={label} className="flex items-center gap-1.5">
                                        <span className={`w-3 h-3 rounded ${cls} border border-slate-600 inline-block`} />{label}
                                    </span>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['Target', target], ['Comparisons', cur.comparisons], ['Step', `${currentStep + 1}/${stepHistory.length}`]].map(([label, val]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className="text-base font-bold text-red-400">{val}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Explanation */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-300 text-sm leading-relaxed">{cur.explanation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Info ── */}
                    <div className="space-y-5">
                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Best Case', 'O(1)', 'green'], ['Worst Case', 'O(n)', 'red'], ['Average', 'O(n)', 'yellow'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-base font-bold text-${color}-400`}>{val}</div>
                                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* When to use */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">When to Use</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Unsorted arrays or linked lists (no random access)</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Finding <strong>all occurrences</strong> in one pass</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Small arrays where simplicity beats optimization</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>When sorting overhead is not justified</span></li>
                                <li className="flex gap-2"><span className="text-red-400">•</span><span>Searching text, patterns, or custom objects</span></li>
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
                                    {quizState.answered && (
                                        <button onClick={nextQuestion} className="mt-3 text-sm text-red-400 hover:text-red-300">
                                            {quizState.current + 1 < quizQuestions.length ? 'Next question →' : 'See results →'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                                    <div className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : quizState.score >= 2 ? 'Well done!' : 'Keep practicing!'}</div>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="text-sm text-red-400 hover:text-red-300">Retry quiz</button>
                                </div>
                            )}
                        </div>

                        {/* Code */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(v => !v)}
                                className="flex items-center gap-2 text-lg font-bold text-slate-100 w-full mb-3 hover:text-red-400 transition-colors">
                                <Code className="h-5 w-5 text-red-400" />
                                Implementation
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
