'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Shuffle, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does Z[i] represent in the Z-array?",
        options: [
            "The index of the next character to compare",
            "The length of the longest substring starting at position i that matches a prefix of the full string",
            "The number of mismatches at position i",
            "The distance from position i to the next occurrence of the first character",
        ],
        correct: 1,
        explanation: "Z[i] is the length of the longest substring starting at index i that is also a prefix of the entire string. For pattern matching, we build the combined string S = pattern + '$' + text, then any position in the text part where Z[i] equals the pattern length is a match.",
    },
    {
        question: "What is the Z-box [l, r] used for?",
        options: [
            "To store the positions where the pattern was found",
            "To mark the rightmost Z-interval found so far, allowing reuse of previously computed Z values instead of comparing from scratch",
            "To represent the left and right boundaries of the pattern",
            "To store the indices of characters that failed to match",
        ],
        correct: 1,
        explanation: "The Z-box [l, r] records the rightmost matching interval computed so far. When computing Z[i] for a new i inside [l, r], we can reuse Z[i-l] as a starting lower bound because S[i..r] already matches S[0..r-l]. This avoids redundant comparisons and keeps the algorithm O(n).",
    },
    {
        question: "Why do we insert '$' (or any character not in the alphabet) between the pattern and text?",
        options: [
            "To count the total length of the combined string",
            "To prevent a Z-value from spanning the pattern–text boundary, ensuring Z values in the text part cannot exceed the pattern length",
            "To make the hash computation easier",
            "To mark the end of the text for the algorithm",
        ],
        correct: 1,
        explanation: "The separator '$' is a character guaranteed not to appear in either the pattern or text. This ensures Z[i] for positions in the text half can never extend back across the '$' into the pattern, so Z values naturally cap at the pattern length. Without it, a prefix match could falsely extend into the separator.",
    },
];

const PRESETS = [
    { text: 'AABXAA', pattern: 'AA' },
    { text: 'ABABAB', pattern: 'ABAB' },
    { text: 'AAAAABAAABA', pattern: 'AAAA' },
    { text: 'ABCABCABC', pattern: 'ABC' },
];

function generateSteps(text, pattern) {
    const steps = [];
    const combined = pattern + '$' + text;
    const N = combined.length;
    const m = pattern.length;
    const Z = new Array(N).fill(0);
    const matches = [];

    steps.push({
        combined, Z: [...Z], i: 0, l: 0, r: 0, phase: 'init', matches: [],
        explanation: `Build combined string: pattern + '$' + text = "${combined}". We compute Z[i] for each position. Z[i] = length of longest prefix match starting at i. Z[0] is conventionally 0 (or N).`,
    });

    let l = 0, r = 0;
    for (let i = 1; i < N; i++) {
        if (i < r) {
            Z[i] = Math.min(r - i, Z[i - l]);
            steps.push({
                combined, Z: [...Z], i, l, r, phase: 'reuse', matches: [...matches],
                explanation: `i=${i} is inside Z-box [${l},${r}]. Reuse: Z[${i}] = min(${r}-${i}, Z[${i - l}]) = min(${r - i}, ${Z[i - l]}) = ${Z[i]}. Extend if possible.`,
            });
        } else {
            steps.push({
                combined, Z: [...Z], i, l, r, phase: 'extend', matches: [...matches],
                explanation: `i=${i} is outside Z-box. Start extending from Z[${i}]=0 by comparing combined[${i}+0]='${combined[i]}' with combined[0]='${combined[0]}'.`,
            });
        }
        while (i + Z[i] < N && combined[Z[i]] === combined[i + Z[i]]) {
            Z[i]++;
        }
        if (i + Z[i] > r) {
            l = i;
            r = i + Z[i];
        }
        // Check if this position in text is a match
        const textPos = i - m - 1;
        if (textPos >= 0 && Z[i] === m) {
            matches.push(textPos);
        }
        steps.push({
            combined, Z: [...Z], i, l, r, phase: Z[i] > 0 ? 'computed' : 'zero', matches: [...matches],
            explanation: `Z[${i}] = ${Z[i]}. ${Z[i] > 0 ? `"${combined.slice(i, i + Z[i])}" matches prefix "${combined.slice(0, Z[i])}".` : `No prefix match at position ${i}.`}${textPos >= 0 && Z[i] === m ? ` Match found in text at index ${textPos}!` : ''}${l > 0 ? ` Z-box updated to [${l}, ${r}].` : ''}`,
        });
    }

    steps.push({
        combined, Z: [...Z], i: -1, l, r, phase: 'complete', matches: [...matches],
        explanation: `Z-array complete: [${Z.join(', ')}]. Found ${matches.length} match${matches.length !== 1 ? 'es' : ''} at text position${matches.length !== 1 ? 's' : ''}: ${matches.length > 0 ? matches.join(', ') : 'none'}.`,
    });

    return steps;
}

const codeStr = `function zSearch(text, pattern) {
    const s = pattern + '$' + text;
    const n = s.length, m = pattern.length;
    const Z = new Array(n).fill(0);
    const matches = [];
    let l = 0, r = 0;

    for (let i = 1; i < n; i++) {
        if (i < r) Z[i] = Math.min(r - i, Z[i - l]);
        while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]])
            Z[i]++;
        if (i + Z[i] > r) { l = i; r = i + Z[i]; }
        if (Z[i] === m) matches.push(i - m - 1);
    }
    return matches; // positions in original text
}`;

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
            <div className={`text-3xl font-bold mb-2 ${quizState.score === quizQuestions.length ? 'text-green-400' : quizState.score >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>{quizState.score}/{quizQuestions.length}</div>
            <p className="text-slate-400 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
            <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm transition-colors">Retry</button>
        </div>
    );
    return (
        <>
            <div className="text-xs text-slate-500 mb-2">Question {quizState.current + 1}/{quizQuestions.length}</div>
            <p className="text-slate-200 text-sm mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, idx) => {
                    let cls = 'border-slate-600 text-slate-300 hover:border-fuchsia-500';
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
                    <button onClick={next} className="w-full px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm transition-colors">
                        {quizState.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                    </button>
                </div>
            )}
        </>
    );
}

export default function ZAlgorithmPage() {
    const [preset, setPreset] = useState(0);
    const [text, setText] = useState(PRESETS[0].text);
    const [pattern, setPattern] = useState(PRESETS[0].pattern);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    useEffect(() => {
        if (text && pattern && text.length >= pattern.length) {
            setStepHistory(generateSteps(text, pattern));
            setCurrentStep(0);
            setIsPlaying(false);
        }
    }, [text, pattern]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const state = stepHistory[currentStep] || { combined: pattern + '$' + text, Z: [], i: 0, l: 0, r: 0, phase: 'init', matches: [], explanation: '' };
    const { combined, Z, i: curI, l, r, phase, matches } = state;
    const m = pattern.length;

    const shuffle = () => {
        const next = (preset + 1) % PRESETS.length;
        setPreset(next);
        setText(PRESETS[next].text);
        setPattern(PRESETS[next].pattern);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/string-algorithms" className="flex items-center text-white hover:text-fuchsia-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to String Algorithms
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Z-Algorithm</h1>
                        <p className="text-xl text-fuchsia-100 mb-6 max-w-3xl mx-auto">
                            Compute Z[i] — the longest prefix match at each position — in O(n) using a sliding Z-box to avoid redundant comparisons.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Z-Array</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Inputs */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="flex gap-3 flex-wrap">
                                <div className="flex-1 min-w-40">
                                    <label className="text-xs text-slate-400 mb-1 block">Text</label>
                                    <input value={text} onChange={e => setText(e.target.value.toUpperCase().replace(/\$/g, '').slice(0, 20))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500" />
                                </div>
                                <div className="flex-1 min-w-28">
                                    <label className="text-xs text-slate-400 mb-1 block">Pattern</label>
                                    <input value={pattern} onChange={e => setPattern(e.target.value.toUpperCase().replace(/\$/g, '').slice(0, 8))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500" />
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Combined string: <span className="font-mono text-fuchsia-400">{pattern}${text}</span></div>
                        </div>

                        {/* Combined string + Z-array visualization */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Combined String & Z-Array</h3>
                            <div className="overflow-x-auto">
                                {/* Index row */}
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs text-slate-500 w-14 shrink-0 text-right pr-2">idx</span>
                                    {combined.split('').map((_, idx) => (
                                        <div key={idx} className="w-9 text-center text-xs text-slate-500">{idx}</div>
                                    ))}
                                </div>

                                {/* Combined string row */}
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs text-slate-400 w-14 shrink-0 text-right pr-2">S</span>
                                    {combined.split('').map((ch, idx) => {
                                        const isPatternPart = idx < m;
                                        const isSeparator = idx === m;
                                        const isTextPart = idx > m;
                                        const isCurrent = idx === curI;
                                        const inZBox = idx >= l && idx < r && r > l && !isSeparator;
                                        const textPos = idx - m - 1;
                                        const isMatch = isTextPart && matches.some(mp => mp === textPos);
                                        return (
                                            <div key={idx} className={`w-9 h-9 rounded flex items-center justify-center text-xs font-bold font-mono transition-all duration-200
                                                ${isCurrent ? 'bg-yellow-400 text-slate-900 scale-110 ring-2 ring-yellow-300' :
                                                  isSeparator ? 'bg-slate-600 text-slate-300' :
                                                  phase === 'complete' && isMatch ? 'bg-green-500 text-white' :
                                                  inZBox ? 'bg-fuchsia-800/60 text-fuchsia-200 ring-1 ring-fuchsia-500/40' :
                                                  isPatternPart ? 'bg-fuchsia-900/40 text-fuchsia-300' :
                                                  'bg-slate-700 text-slate-200'}`}>
                                                {ch}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Section labels */}
                                <div className="flex items-center gap-1 mb-2">
                                    <span className="w-14 shrink-0" />
                                    {combined.split('').map((_, idx) => (
                                        <div key={idx} className={`w-9 text-center text-xs ${idx < m ? 'text-fuchsia-500' : idx === m ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {idx === 0 ? '←pat' : idx === m + 1 ? '←txt' : ''}
                                        </div>
                                    ))}
                                </div>

                                {/* Z-array row */}
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-400 w-14 shrink-0 text-right pr-2">Z</span>
                                    {Z.map((val, idx) => {
                                        const isCurrent = idx === curI;
                                        const isMatch = val === m && idx > m;
                                        return (
                                            <div key={idx} className={`w-9 h-9 rounded flex items-center justify-center text-xs font-bold font-mono transition-all duration-200
                                                ${isCurrent ? 'bg-yellow-400 text-slate-900 scale-110' :
                                                  isMatch ? 'bg-green-500 text-white' :
                                                  val > 0 ? 'bg-fuchsia-700/60 text-fuchsia-300' :
                                                  'bg-slate-800 text-slate-500'}`}>
                                                {val || '—'}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Z-box indicator */}
                            {r > l && (
                                <div className="mt-3 flex items-center gap-2 text-xs">
                                    <span className="text-slate-400">Z-box:</span>
                                    <span className="bg-fuchsia-800/40 text-fuchsia-300 px-2 py-0.5 rounded font-mono">[{l}, {r})</span>
                                    <span className="text-slate-500">= "{combined.slice(l, r)}"</span>
                                </div>
                            )}

                            {/* Matches */}
                            {matches.length > 0 && (
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400">Text matches (Z[i] = {m}):</span>
                                    {matches.map(s => (
                                        <span key={s} className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded font-mono">index {s}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Explanation */}
                        <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-fuchsia-400 mt-0.5 shrink-0" />
                                <p className="text-fuchsia-300 text-sm leading-relaxed">{state.explanation}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} className="px-6 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 transition-colors flex items-center gap-2 font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                                <button onClick={shuffle} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" title="Next example"><Shuffle className="h-4 w-4" /></button>
                            </div>
                            <div className="flex items-center gap-3 mt-3 justify-center">
                                <span className="text-slate-400 text-xs">Fast</span>
                                <input type="range" min={200} max={2000} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-32 accent-fuchsia-500" />
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
                                    <span className="text-slate-400">Position i</span>
                                    <span className="text-yellow-400 font-mono">{curI >= 0 ? curI : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Z-box [l, r)</span>
                                    <span className="text-fuchsia-400 font-mono">[{l}, {r})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Z[i]</span>
                                    <span className="text-fuchsia-300 font-bold">{curI >= 0 && Z[curI] !== undefined ? Z[curI] : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Matches found</span>
                                    <span className="text-green-400 font-bold">{matches.length}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-3">Color Legend</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-fuchsia-900/40 border border-fuchsia-500/40" /><span className="text-slate-400">Pattern section</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-yellow-400" /><span className="text-slate-400">Current position i</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-fuchsia-800/60" /><span className="text-slate-400">Inside Z-box</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-fuchsia-700/60" /><span className="text-slate-400">Non-zero Z value</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-green-500" /><span className="text-slate-400">Z[i] = pattern length → match</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
