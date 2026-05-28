'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Shuffle, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const BITS = 8;

const toBin = (n) => (n >>> 0).toString(2).padStart(BITS, '0');

const quizQuestions = [
    {
        question: "Why does XOR-ing all elements find the single non-repeated number?",
        options: [
            "XOR counts the frequency of each bit position",
            "XOR is commutative and associative, and a ^ a = 0, so all pairs cancel out leaving only the unique element",
            "XOR adds all numbers and divides by 2",
            "XOR flips all bits so duplicates become zero",
        ],
        correct: 1,
        explanation: "a ^ a = 0 means any value XOR'd with itself produces 0. Since XOR is commutative and associative, all duplicate pairs cancel to 0 regardless of order, leaving only the element with no pair.",
    },
    {
        question: "What is the time and space complexity of the XOR approach?",
        options: ["O(n) time, O(n) space", "O(n log n) time, O(1) space", "O(n) time, O(1) space", "O(1) time, O(1) space"],
        correct: 2,
        explanation: "We make a single linear pass through the array (O(n) time) and use only one accumulator variable (O(1) space). No hash map or sorting is needed.",
    },
    {
        question: "If the array is [3, 5, 3, 7, 5], what does XOR-ing all elements return?",
        options: ["3", "5", "7", "0"],
        correct: 2,
        explanation: "3 ^ 3 = 0 and 5 ^ 5 = 0. The accumulator becomes 0 ^ 7 = 7. The unique number is 7.",
    },
];

function generateArray() {
    const unique = 1 + Math.floor(Math.random() * 9);
    const pairs = [];
    const used = new Set([unique]);
    const pairCount = 2 + Math.floor(Math.random() * 3);
    while (pairs.length < pairCount) {
        const v = 1 + Math.floor(Math.random() * 9);
        if (!used.has(v)) { used.add(v); pairs.push(v, v); }
    }
    const arr = [...pairs, unique];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateSteps(arr) {
    const steps = [];
    let acc = 0;

    steps.push({
        arr, currentIdx: -1, acc, prevAcc: 0, currentVal: null, phase: 'init',
        explanation: `Array: [${arr.join(', ')}]. Accumulator starts at 0. We XOR every element — all pairs cancel to 0, leaving the unique number.`,
    });

    for (let i = 0; i < arr.length; i++) {
        const val = arr[i];
        const prevAcc = acc;
        steps.push({
            arr, currentIdx: i, acc: prevAcc, prevAcc, currentVal: val, phase: 'comparing',
            explanation: `Processing arr[${i}] = ${val}. Compute ${prevAcc} XOR ${val}: ${toBin(prevAcc)} XOR ${toBin(val)} = ${toBin(prevAcc ^ val)}.`,
        });
        acc ^= val;
        steps.push({
            arr, currentIdx: i, acc, prevAcc, currentVal: val, phase: 'updated',
            explanation: `Accumulator updated: ${prevAcc} ^ ${val} = ${acc}. ${acc === 0 ? 'Accumulator is 0 — a pair just cancelled out.' : `New accumulator = ${acc}.`}`,
        });
    }

    steps.push({
        arr, currentIdx: arr.length, acc, prevAcc: acc, currentVal: null, phase: 'complete',
        explanation: `Done! All pairs cancelled to 0. The single non-repeated number is ${acc}.`,
    });

    return steps;
}

const codeStr = `function singleNumber(nums) {
    let acc = 0;
    for (const num of nums) {
        acc ^= num; // pairs cancel: a ^ a = 0
    }
    return acc; // only unique element remains
}`;

function BitRow({ label, value, color, changed }) {
    const bin = toBin(value);
    return (
        <div className="flex items-center gap-2">
            <span className="text-slate-400 w-24 text-right text-xs shrink-0">{label} ({value})</span>
            <div className="flex gap-1">
                {bin.split('').map((bit, i) => {
                    const isSet = bit === '1';
                    const highlight = changed && changed[i];
                    return (
                        <div key={i} className={`w-9 h-8 rounded flex items-center justify-center text-sm font-bold font-mono transition-all duration-300
                            ${highlight ? 'bg-orange-500 text-white scale-110' :
                              color === 'teal' ? (isSet ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400') :
                              color === 'yellow' ? (isSet ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-400') :
                              color === 'green' ? (isSet ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400') :
                              isSet ? 'bg-slate-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {bit}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    const handleAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    if (quizState.complete) return (
        <div className="text-center py-4">
            <div className={`text-3xl font-bold mb-2 ${quizState.score === quizQuestions.length ? 'text-green-400' : quizState.score >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                {quizState.score}/{quizQuestions.length}
            </div>
            <p className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
            <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm transition-colors">Retry</button>
        </div>
    );
    return (
        <>
            <div className="text-xs text-slate-500 mb-2">Question {quizState.current + 1}/{quizQuestions.length}</div>
            <p className="text-slate-200 text-sm mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, idx) => {
                    let cls = 'border-slate-600 text-slate-300 hover:border-teal-500';
                    if (quizState.answered) {
                        if (idx === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (idx === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-700 text-slate-500';
                    }
                    return <button key={idx} onClick={() => handleAnswer(idx)} className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>;
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <div className="flex items-start gap-2 mb-3">
                        {quizState.selected === q.correct ? <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
                        <p className="text-xs text-slate-400 leading-relaxed">{q.explanation}</p>
                    </div>
                    <button onClick={next} className="w-full px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm transition-colors">
                        {quizState.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                    </button>
                </div>
            )}
        </>
    );
}

export default function SingleNumberPage() {
    const [arr, setArr] = useState([4, 1, 2, 1, 2]);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    useEffect(() => {
        const steps = generateSteps(arr);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [arr]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { arr, currentIdx: -1, acc: 0, prevAcc: 0, currentVal: null, phase: 'init', explanation: '' };
    const { arr: dispArr, currentIdx, acc, prevAcc, currentVal, phase } = state;

    const changedBits = (phase === 'updated' && currentVal !== null)
        ? toBin(prevAcc ^ currentVal).split('').map((b, i) => b !== toBin(acc)[i] ? false : toBin(prevAcc)[i] !== toBin(acc)[i])
        : null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/bit-manipulation" className="flex items-center text-white hover:text-teal-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Bit Manipulation
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Single Number (XOR)</h1>
                        <p className="text-xl text-teal-100 mb-6 max-w-3xl mx-auto">
                            Find the element that appears only once by XOR-ing every number. Duplicate pairs cancel to 0, revealing the unique value.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">XOR Trick</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Array */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Input Array</h3>
                            <div className="flex flex-wrap gap-3 justify-center">
                                {dispArr.map((val, idx) => {
                                    let cls = 'bg-slate-700 border-slate-600 text-slate-100';
                                    if (phase === 'complete' && val === acc) cls = 'bg-green-500 border-green-400 text-white scale-110';
                                    else if (idx === currentIdx && (phase === 'comparing' || phase === 'updated')) cls = 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
                                    else if (idx < currentIdx) cls = 'bg-slate-800 border-slate-700 text-slate-500';
                                    return (
                                        <div key={idx} className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300 ${cls}`}>
                                            <span className="font-bold text-lg">{val}</span>
                                            <span className="text-xs opacity-60">[{idx}]</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Binary register */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Binary Register</h3>
                            <div className="space-y-3 overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    <span className="w-24 shrink-0" />
                                    <div className="flex gap-1">
                                        {Array.from({ length: BITS }, (_, i) => (
                                            <div key={i} className="w-9 text-center text-xs text-slate-500">{BITS - 1 - i}</div>
                                        ))}
                                    </div>
                                </div>
                                <BitRow label="acc" value={prevAcc} color="teal" />
                                {currentVal !== null && (
                                    <BitRow label={`val`} value={currentVal} color="yellow" />
                                )}
                                {currentVal !== null && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-right text-xs font-bold text-teal-400 shrink-0">XOR ↓</span>
                                        <div className="h-px bg-teal-500/40 flex-1" />
                                    </div>
                                )}
                                <BitRow
                                    label={phase === 'complete' ? 'answer' : 'new acc'}
                                    value={acc}
                                    color={phase === 'complete' ? 'green' : 'teal'}
                                    changed={changedBits}
                                />
                            </div>
                        </div>

                        {/* Explanation */}
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                                <p className="text-teal-300 text-sm leading-relaxed">{state.explanation}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="Reset"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                                <button onClick={() => setArr(generateArray())} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="Shuffle"><Shuffle className="h-4 w-4" /></button>
                            </div>
                            <div className="flex items-center gap-3 mt-3 justify-center">
                                <span className="text-slate-400 text-xs">Fast</span>
                                <input type="range" min={200} max={2000} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-32 accent-teal-500" />
                                <span className="text-slate-400 text-xs">Slow</span>
                                <span className="text-slate-500 text-xs ml-4">Step {currentStep + 1} / {stepHistory.length}</span>
                            </div>
                        </div>

                        {/* Code */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                <Code className="h-4 w-4" />{showCode ? 'Hide' : 'Show'} Code
                            </button>
                            {showCode && <div className="mt-3"><CodeBlock code={codeStr} language="javascript" /></div>}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-4">Active Recall Quiz</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-3">Current State</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Accumulator</span>
                                    <span className="text-teal-400 font-mono font-bold">{acc}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Binary</span>
                                    <span className="text-teal-300 font-mono text-xs">{toBin(acc)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Elements processed</span>
                                    <span className="text-slate-300">{Math.max(0, currentIdx + (phase === 'updated' ? 1 : 0))} / {arr.length}</span>
                                </div>
                                {phase === 'complete' && (
                                    <div className="flex justify-between border-t border-slate-700 pt-2 mt-1">
                                        <span className="text-slate-400">Answer</span>
                                        <span className="text-green-400 font-bold">{acc}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-3">XOR Properties</h3>
                            <div className="space-y-2 text-xs text-slate-400 font-mono">
                                <div className="flex justify-between"><span>a ^ a</span><span className="text-teal-400">= 0 (cancels)</span></div>
                                <div className="flex justify-between"><span>a ^ 0</span><span className="text-teal-400">= a (identity)</span></div>
                                <div className="flex justify-between"><span>a ^ b</span><span className="text-teal-400">= b ^ a (commutative)</span></div>
                                <div className="flex justify-between"><span>(a^b)^c</span><span className="text-teal-400">= a^(b^c)</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
