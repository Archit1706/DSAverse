'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Shuffle, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const BITS = 8;
const toBin = (n) => (n >>> 0).toString(2).padStart(BITS, '0');

const quizQuestions = [
    {
        question: "Why does n & (n−1) always clear the lowest set bit of n?",
        options: [
            "Because subtracting 1 shifts every bit right by one position",
            "Because n−1 flips all bits from the lowest set bit downward, so AND-ing with n zeroes out that bit and those below it",
            "Because AND always sets bits to 0",
            "Because n and n−1 share no bits in common",
        ],
        correct: 1,
        explanation: "Subtracting 1 from n flips the lowest set bit to 0 and turns all lower 0-bits to 1. When you AND this with the original n, the lowest set bit becomes 0 and all the lower bits (now 1 in n−1) were already 0 in n — so they stay 0. Every higher bit is unchanged.",
    },
    {
        question: "How many iterations does Brian Kernighan's algorithm take for n = 12 (binary 1100)?",
        options: ["4 (one per bit position)", "2 (one per set bit)", "3", "12"],
        correct: 1,
        explanation: "12 in binary is 1100, which has exactly 2 set bits. Brian Kernighan's algorithm iterates once per set bit, not once per total bit width. For n=12: first iteration gives 12 & 11 = 8 (1000), second gives 8 & 7 = 0. Done in 2 steps.",
    },
    {
        question: "What is the worst-case time complexity of Brian Kernighan's algorithm for a 32-bit integer?",
        options: ["O(1)", "O(32) = O(1) constant", "O(n) where n is the integer value", "O(log n)"],
        correct: 1,
        explanation: "A 32-bit integer can have at most 32 set bits. The algorithm runs in at most 32 iterations regardless of the value of n — it's bounded by the word size, not the magnitude of n. This is conventionally written O(1) or O(log n) where log n is the number of bits.",
    },
];

const PRESETS = [7, 12, 15, 23, 100, 127, 170, 204];

function generateSteps(n) {
    const steps = [];
    let cur = n;
    let count = 0;

    steps.push({
        n, cur, count, nMinus1: null, cleared: null, phase: 'init',
        explanation: `Start: n = ${n} (binary: ${toBin(n)}). Count set bits by repeatedly clearing the lowest set bit using n & (n−1).`,
    });

    while (cur > 0) {
        const nMinus1 = cur - 1;
        const cleared = cur & nMinus1;
        steps.push({
            n, cur, count, nMinus1, cleared, phase: 'computing',
            explanation: `n = ${cur} (${toBin(cur)}). n−1 = ${nMinus1} (${toBin(nMinus1)}). n & (n−1) = ${cleared} (${toBin(cleared)}). This clears the lowest set bit.`,
        });
        count++;
        cur = cleared;
        steps.push({
            n, cur, count, nMinus1, cleared, phase: 'updated',
            explanation: `Set bit cleared! Count is now ${count}. New n = ${cur}.${cur > 0 ? ' Continuing...' : ' n = 0, we are done.'}`,
        });
    }

    steps.push({
        n, cur: 0, count, nMinus1: null, cleared: null, phase: 'complete',
        explanation: `Done! ${n} (${toBin(n)}) has ${count} set bit${count !== 1 ? 's' : ''}.`,
    });

    return steps;
}

const codeStr = `function countSetBits(n) {
    let count = 0;
    while (n > 0) {
        n = n & (n - 1); // clear lowest set bit
        count++;
    }
    return count;
}`;

function BitRow({ label, value, highlight, highlightMask, color }) {
    const bin = toBin(value);
    const maskBin = highlightMask !== undefined ? toBin(highlightMask) : null;
    return (
        <div className="flex items-center gap-2">
            <span className="text-slate-400 w-28 text-right text-xs shrink-0">{label} ({value})</span>
            <div className="flex gap-1">
                {bin.split('').map((bit, i) => {
                    const isSet = bit === '1';
                    const isHighlighted = maskBin && maskBin[i] !== bin[i] && highlight;
                    return (
                        <div key={i} className={`w-9 h-8 rounded flex items-center justify-center text-sm font-bold font-mono transition-all duration-300
                            ${isHighlighted ? 'bg-red-500 text-white scale-110 ring-2 ring-red-400' :
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

export default function CountSetBitsPage() {
    const [n, setN] = useState(23);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);
    const [presetIdx, setPresetIdx] = useState(3);

    useEffect(() => {
        const steps = generateSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [n]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { n, cur: n, count: 0, nMinus1: null, cleared: null, phase: 'init', explanation: '' };
    const { cur, count, nMinus1, cleared, phase } = state;

    const shuffle = () => {
        const next = (presetIdx + 1) % PRESETS.length;
        setPresetIdx(next);
        setN(PRESETS[next]);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/bit-manipulation" className="flex items-center text-white hover:text-teal-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Bit Manipulation
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Count Set Bits</h1>
                        <p className="text-xl text-teal-100 mb-6 max-w-3xl mx-auto">
                            Brian Kernighan's algorithm counts 1-bits in O(set bits) time by repeatedly clearing the lowest set bit with <code className="bg-white/20 px-2 rounded">n & (n−1)</code>.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Time: O(set bits)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Bit Clearing</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Number input */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">Input Number (1–255)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number" min={1} max={255} value={n}
                                    onChange={e => { const v = Math.max(1, Math.min(255, parseInt(e.target.value) || 1)); setN(v); }}
                                    className="w-28 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-mono font-bold text-xl focus:outline-none focus:border-teal-500"
                                />
                                <div className="text-slate-400 text-sm">Binary: <span className="font-mono text-teal-300">{toBin(n)}</span></div>
                                <div className="text-slate-400 text-sm">Set bits: <span className="font-bold text-white">{n.toString(2).split('1').length - 1}</span></div>
                            </div>
                        </div>

                        {/* Binary register */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Binary Register</h3>
                            <div className="space-y-3 overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    <span className="w-28 shrink-0" />
                                    <div className="flex gap-1">
                                        {Array.from({ length: BITS }, (_, i) => (
                                            <div key={i} className="w-9 text-center text-xs text-slate-500">{BITS - 1 - i}</div>
                                        ))}
                                    </div>
                                </div>

                                <BitRow label="current n" value={cur} color="teal"
                                    highlight={phase === 'computing' && nMinus1 !== null}
                                    highlightMask={nMinus1 !== null ? nMinus1 : undefined} />

                                {nMinus1 !== null && (
                                    <BitRow label="n − 1" value={nMinus1} color="yellow" />
                                )}
                                {nMinus1 !== null && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-28 text-right text-xs font-bold text-teal-400 shrink-0">AND ↓</span>
                                        <div className="h-px bg-teal-500/40 flex-1" />
                                    </div>
                                )}
                                {cleared !== null && (
                                    <BitRow label="n & (n−1)" value={cleared} color={phase === 'complete' ? 'green' : 'teal'} />
                                )}
                                {phase === 'complete' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="w-28 shrink-0" />
                                        <div className="flex gap-1">
                                            {toBin(0).split('').map((b, i) => (
                                                <div key={i} className="w-9 h-8 rounded flex items-center justify-center text-sm font-bold font-mono bg-slate-700 text-slate-400">0</div>
                                            ))}
                                        </div>
                                        <span className="text-slate-500 text-xs ml-2">n = 0 → done</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Count display */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-slate-400 text-sm">Set bits cleared so far</div>
                                <div className={`text-4xl font-bold font-mono transition-all duration-300 ${phase === 'complete' ? 'text-green-400' : 'text-teal-400'}`}>{count}</div>
                            </div>
                            <div className="flex gap-2 mt-3 flex-wrap">
                                {Array.from({ length: n.toString(2).split('1').length - 1 }, (_, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < count ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                        {i + 1}
                                    </div>
                                ))}
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
                                <button onClick={shuffle} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="Next example"><Shuffle className="h-4 w-4" /></button>
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
                                    <span className="text-slate-400">Original n</span>
                                    <span className="text-slate-300 font-mono">{n}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Current n</span>
                                    <span className="text-teal-400 font-mono font-bold">{cur}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Bits cleared</span>
                                    <span className="text-teal-300 font-bold">{count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Iteration</span>
                                    <span className="text-slate-300">{currentStep + 1} / {stepHistory.length}</span>
                                </div>
                                {phase === 'complete' && (
                                    <div className="flex justify-between border-t border-slate-700 pt-2 mt-1">
                                        <span className="text-slate-400">Answer</span>
                                        <span className="text-green-400 font-bold">{count} set bits</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-3">Why n & (n−1)?</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Subtracting 1 flips the rightmost 1-bit to 0 and turns all trailing 0s to 1s. AND-ing with the original n zeroes out exactly that one set bit, leaving all higher bits untouched.
                            </p>
                            <div className="mt-3 font-mono text-xs space-y-1">
                                <div className="text-slate-300">Example: n = 12 (1100)</div>
                                <div className="text-yellow-400">n−1 = 11 (1011)</div>
                                <div className="text-teal-400">AND →  8 (1000) ✓</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
