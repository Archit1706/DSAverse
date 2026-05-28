'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Shuffle, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const BITS = 8;
const toBin = (n) => (n >>> 0).toString(2).padStart(BITS, '0');

const quizQuestions = [
    {
        question: "Why does n & (n−1) == 0 imply n is a power of two?",
        options: [
            "Powers of two always have an even binary representation",
            "Powers of two have exactly one set bit; subtracting 1 flips all lower bits, so AND-ing gives 0",
            "Dividing by 2 repeatedly always gives 1 for powers of two",
            "n & (n−1) equals 0 for all even numbers",
        ],
        correct: 1,
        explanation: "A power of two has exactly one 1-bit (e.g., 8 = 1000). Subtracting 1 flips that bit to 0 and turns all lower bits to 1 (7 = 0111). The AND of these two values is 0000. Any non-power-of-two has at least two set bits, so n−1 still shares at least one set bit with n and the AND is non-zero.",
    },
    {
        question: "What is the time complexity of the n & (n−1) == 0 check?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
        correct: 2,
        explanation: "The check is a single bitwise AND followed by a comparison — both are O(1) hardware operations regardless of the value of n. There are no loops or recursion.",
    },
    {
        question: "Why must we add the condition n > 0 before checking n & (n−1) == 0?",
        options: [
            "Because 0 would cause an overflow",
            "Because 0 & (0−1) = 0 & 4294967295 = 0, which would incorrectly report 0 as a power of two",
            "Because negative numbers are always powers of two",
            "Because the formula only works for odd numbers",
        ],
        correct: 1,
        explanation: "0 − 1 wraps to 0xFFFFFFFF (all 1s) in 32-bit unsigned arithmetic. 0 AND 0xFFFFFFFF = 0, which passes the test — but 0 is not a power of two. Adding n > 0 as a guard eliminates this false positive.",
    },
];

const EXAMPLES = [
    { n: 1, note: '2⁰' }, { n: 2, note: '2¹' }, { n: 3, note: 'not' }, { n: 4, note: '2²' },
    { n: 6, note: 'not' }, { n: 8, note: '2³' }, { n: 12, note: 'not' }, { n: 16, note: '2⁴' },
    { n: 24, note: 'not' }, { n: 32, note: '2⁵' }, { n: 64, note: '2⁶' }, { n: 100, note: 'not' },
];

function generateSteps(n) {
    const steps = [];
    const nMinus1 = n - 1;
    const andResult = n & nMinus1;
    const isPow = n > 0 && andResult === 0;

    steps.push({
        n, nMinus1: null, andResult: null, phase: 'init',
        explanation: `Checking if ${n} is a power of two. Step 1: verify n > 0. ${n > 0 ? `${n} > 0 ✓. Proceed to compute n & (n−1).` : `${n} is not positive — immediately false.`}`,
    });
    if (n <= 0) {
        steps.push({ n, nMinus1: null, andResult: null, phase: 'complete', isPow: false, explanation: `${n} ≤ 0, so it cannot be a power of two.` });
        return steps;
    }
    steps.push({
        n, nMinus1, andResult: null, phase: 'subtract',
        explanation: `Step 2: compute n−1 = ${n}−1 = ${nMinus1}. In binary: ${toBin(nMinus1)}. Notice how the lowest set bit in n flips to 0 and all trailing 0s become 1s.`,
    });
    steps.push({
        n, nMinus1, andResult, phase: 'and',
        explanation: `Step 3: compute n & (n−1) = ${n} & ${nMinus1} = ${andResult}. Binary: ${toBin(n)} AND ${toBin(nMinus1)} = ${toBin(andResult)}.`,
    });
    steps.push({
        n, nMinus1, andResult, phase: 'complete', isPow,
        explanation: `Result: ${andResult} ${andResult === 0 ? '==' : '!='} 0, so ${n} ${isPow ? 'IS' : 'is NOT'} a power of two.${isPow ? ` (${n} = 2^${Math.log2(n)})` : ''}`,
    });
    return steps;
}

const codeStr = `function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
    // Powers of 2 have exactly one set bit.
    // n-1 flips all bits at and below that bit,
    // so n & (n-1) is 0 iff n has one set bit.
}`;

function BitRow({ label, value, color, mask }) {
    const bin = toBin(value);
    const maskBin = mask !== undefined ? toBin(mask) : null;
    return (
        <div className="flex items-center gap-2">
            <span className="text-slate-400 w-24 text-right text-xs shrink-0">{label} ({value})</span>
            <div className="flex gap-1">
                {bin.split('').map((bit, i) => {
                    const isSet = bit === '1';
                    const differs = maskBin && maskBin[i] !== bin[i];
                    return (
                        <div key={i} className={`w-9 h-8 rounded flex items-center justify-center text-sm font-bold font-mono transition-all duration-300
                            ${differs ? 'bg-orange-500 text-white scale-105' :
                              color === 'teal' ? (isSet ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400') :
                              color === 'yellow' ? (isSet ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-400') :
                              color === 'green' ? (isSet ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400') :
                              color === 'red' ? (isSet ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400') :
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

export default function PowerOfTwoPage() {
    const [n, setN] = useState(16);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);
    const [exIdx, setExIdx] = useState(7);

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

    const state = stepHistory[currentStep] || { n, nMinus1: null, andResult: null, phase: 'init', isPow: false, explanation: '' };
    const { nMinus1, andResult, phase, isPow } = state;

    const shuffle = () => {
        const next = (exIdx + 1) % EXAMPLES.length;
        setExIdx(next);
        setN(EXAMPLES[next].n);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/bit-manipulation" className="flex items-center text-white hover:text-teal-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Bit Manipulation
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Power of Two</h1>
                        <p className="text-xl text-teal-100 mb-6 max-w-3xl mx-auto">
                            Check if a number is a power of two in O(1) with <code className="bg-white/20 px-2 rounded">n {'>'} 0 && n & (n−1) == 0</code>. Powers of two have exactly one set bit.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Time: O(1)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Single Set Bit</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Input */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">Input Number (1–255)</label>
                            <div className="flex items-center gap-4 flex-wrap">
                                <input
                                    type="number" min={1} max={255} value={n}
                                    onChange={e => { const v = Math.max(1, Math.min(255, parseInt(e.target.value) || 1)); setN(v); }}
                                    className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-mono font-bold text-xl focus:outline-none focus:border-teal-500"
                                />
                                <div className="text-slate-400 text-sm">Binary: <span className="font-mono text-teal-300">{toBin(n)}</span></div>
                                <div className="text-slate-400 text-sm">Set bits: <span className="font-bold text-white">{n.toString(2).split('1').length - 1}</span></div>
                            </div>
                        </div>

                        {/* Binary register */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Bit-Level Computation</h3>
                            <div className="space-y-3 overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    <span className="w-24 shrink-0" />
                                    <div className="flex gap-1">
                                        {Array.from({ length: BITS }, (_, i) => (
                                            <div key={i} className="w-9 text-center text-xs text-slate-500">{BITS - 1 - i}</div>
                                        ))}
                                    </div>
                                </div>

                                <BitRow label="n" value={n} color="teal" />

                                {(phase === 'subtract' || phase === 'and' || phase === 'complete') && nMinus1 !== null && (
                                    <BitRow label="n − 1" value={nMinus1} color="yellow" mask={n} />
                                )}

                                {(phase === 'and' || phase === 'complete') && andResult !== null && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="w-24 text-right text-xs font-bold text-teal-400 shrink-0">AND ↓</span>
                                            <div className="h-px bg-teal-500/40 flex-1" />
                                        </div>
                                        <BitRow
                                            label="n & (n−1)"
                                            value={andResult}
                                            color={phase === 'complete' ? (isPow ? 'green' : 'red') : 'teal'}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Result badge */}
                        {phase === 'complete' && (
                            <div className={`rounded-xl border p-6 text-center transition-all duration-500 ${isPow ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className={`text-5xl font-bold mb-2 ${isPow ? 'text-green-400' : 'text-red-400'}`}>
                                    {isPow ? '✓ Power of Two' : '✗ Not a Power of Two'}
                                </div>
                                <div className="text-slate-400 text-sm">
                                    {n} & {n - 1} = {andResult} {andResult === 0 ? '== 0 → yes' : '!= 0 → no'}
                                    {isPow && ` (${n} = 2^${Math.log2(n)})`}
                                </div>
                            </div>
                        )}

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
                            <h3 className="font-semibold text-white mb-3">Powers of 2 (8-bit)</h3>
                            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                                {[1,2,4,8,16,32,64,128].map((p, i) => (
                                    <button key={p} onClick={() => setN(p)} className={`py-1.5 px-2 rounded flex justify-between items-center transition-colors ${n === p ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                                        <span>2^{i}</span><span className="text-slate-400">{p}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-3">Try Non-Powers</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {[3,5,6,7,9,10,12,14,15].map(v => (
                                    <button key={v} onClick={() => setN(v)} className={`px-2 py-1 rounded text-xs font-mono transition-colors ${n === v ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{v}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
