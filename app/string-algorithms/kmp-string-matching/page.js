'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Shuffle, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does the failure function (LPS array) store at position i?",
        options: [
            "The index where the next mismatch occurs",
            "The length of the longest proper prefix of pattern[0..i] that is also a suffix",
            "The number of characters matched so far",
            "The position in the text where the pattern was last found",
        ],
        correct: 1,
        explanation: "LPS stands for Longest Proper Prefix which is also Suffix. LPS[i] tells us how far we can shift the pattern on a mismatch at position i+1 — we jump j to LPS[j-1] instead of restarting from 0.",
    },
    {
        question: "When a mismatch occurs at pattern[j] during matching, what does KMP do next?",
        options: [
            "Increments the text pointer i and restarts j at 0",
            "Decrements i by j positions and sets j = 0",
            "Sets j = LPS[j−1] without moving i (or sets j=0 and increments i if j was already 0)",
            "Shifts the pattern by one position regardless of LPS",
        ],
        correct: 2,
        explanation: "On a mismatch, KMP never goes backwards in the text. If j > 0, it sets j = LPS[j−1], effectively sliding the pattern to the right so the already-matched prefix lines up. Only if j = 0 does it increment i. This guarantees O(n+m) total work.",
    },
    {
        question: "Why is KMP O(n + m) instead of O(n × m)?",
        options: [
            "It uses hashing to skip comparisons",
            "The text pointer i never moves backward, so each character is compared at most twice (once in LPS build, once in matching)",
            "It divides the text into blocks of size m",
            "It only compares characters when the first characters match",
        ],
        correct: 1,
        explanation: "The key insight is that i only moves forward. Even though j can jump backward (via LPS), i never does. This bounds the total number of comparisons: O(m) for the LPS build and O(n) for the matching scan — giving O(n + m) overall.",
    },
];

const PRESETS = [
    { text: 'AABAACAADAABAABA', pattern: 'AABA' },
    { text: 'ABABCABABCABAB', pattern: 'ABABCABAB' },
    { text: 'AAAAABAAABA', pattern: 'AAAA' },
    { text: 'ABCABCABC', pattern: 'ABC' },
];

function buildLPS(pattern) {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    let len = 0;
    let i = 1;
    while (i < m) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else if (len !== 0) {
            len = lps[len - 1];
        } else {
            lps[i] = 0;
            i++;
        }
    }
    return lps;
}

function generateSteps(text, pattern) {
    const steps = [];
    const n = text.length;
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    const matches = [];

    // Phase 1: Build LPS
    steps.push({
        phase: 'lps', lps: [...lps], lpsI: 0, lpsLen: 0,
        textI: -1, patJ: -1, matches: [],
        explanation: `Phase 1: Build the failure function (LPS array) for pattern "${pattern}". LPS[i] = length of the longest prefix of pattern[0..i] that is also a suffix.`,
    });

    let len = 0;
    let i = 1;
    while (i < m) {
        steps.push({
            phase: 'lps', lps: [...lps], lpsI: i, lpsLen: len,
            textI: -1, patJ: -1, matches: [],
            explanation: `LPS build: comparing pattern[${i}]='${pattern[i]}' with pattern[${len}]='${pattern[len]}'. ${pattern[i] === pattern[len] ? 'Match! Extend prefix.' : len > 0 ? `Mismatch. Fall back: len = LPS[${len - 1}] = ${lps[len - 1]}.` : `Mismatch and len=0. LPS[${i}] = 0.`}`,
        });
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            steps.push({
                phase: 'lps', lps: [...lps], lpsI: i, lpsLen: len - 1,
                textI: -1, patJ: -1, matches: [],
                explanation: `Match: LPS[${i}] = ${len}. Move forward: i = ${i + 1}, len = ${len}.`,
            });
            i++;
        } else if (len !== 0) {
            len = lps[len - 1];
        } else {
            lps[i] = 0;
            i++;
        }
    }

    steps.push({
        phase: 'lps_done', lps: [...lps], lpsI: -1, lpsLen: 0,
        textI: -1, patJ: -1, matches: [],
        explanation: `LPS array complete: [${lps.join(', ')}]. Phase 2: Slide the pattern across the text and use LPS to skip re-comparisons on mismatch.`,
    });

    // Phase 2: Matching
    let ti = 0, pj = 0;
    steps.push({
        phase: 'matching', lps: [...lps], lpsI: -1, lpsLen: 0,
        textI: ti, patJ: pj, matches: [...matches],
        explanation: `Phase 2: Start matching. text[0]='${text[0]}', pattern[0]='${pattern[0]}'.`,
    });

    while (ti < n) {
        if (text[ti] === pattern[pj]) {
            steps.push({
                phase: 'matching', lps: [...lps], lpsI: -1, lpsLen: 0,
                textI: ti, patJ: pj, matches: [...matches],
                explanation: `Match: text[${ti}]='${text[ti]}' == pattern[${pj}]='${pattern[pj]}'. Advance both pointers.`,
            });
            ti++;
            pj++;
        }
        if (pj === m) {
            const start = ti - pj;
            matches.push(start);
            steps.push({
                phase: 'found', lps: [...lps], lpsI: -1, lpsLen: 0,
                textI: ti - 1, patJ: pj - 1, matchStart: start, matches: [...matches],
                explanation: `Pattern found at index ${start}! text[${start}..${ti - 1}]. Using LPS: shift pattern by ${m - lps[m - 1]} positions, set j = LPS[${m - 1}] = ${lps[m - 1]}.`,
            });
            pj = lps[pj - 1];
        } else if (ti < n && text[ti] !== pattern[pj]) {
            if (pj !== 0) {
                steps.push({
                    phase: 'mismatch', lps: [...lps], lpsI: -1, lpsLen: 0,
                    textI: ti, patJ: pj, matches: [...matches],
                    explanation: `Mismatch: text[${ti}]='${text[ti]}' != pattern[${pj}]='${pattern[pj]}'. Jump j to LPS[${pj - 1}] = ${lps[pj - 1]}. Text pointer stays at ${ti}.`,
                });
                pj = lps[pj - 1];
            } else {
                steps.push({
                    phase: 'mismatch', lps: [...lps], lpsI: -1, lpsLen: 0,
                    textI: ti, patJ: pj, matches: [...matches],
                    explanation: `Mismatch at text[${ti}]='${text[ti]}', j=0. No fallback possible — advance text pointer to ${ti + 1}.`,
                });
                ti++;
            }
        }
    }

    steps.push({
        phase: 'complete', lps: [...lps], lpsI: -1, lpsLen: 0,
        textI: -1, patJ: -1, matches: [...matches],
        explanation: `Search complete! Found ${matches.length} match${matches.length !== 1 ? 'es' : ''} at position${matches.length !== 1 ? 's' : ''}: ${matches.length > 0 ? matches.join(', ') : 'none'}.`,
    });

    return steps;
}

const codeStr = `function kmpSearch(text, pattern) {
    const n = text.length, m = pattern.length;
    const lps = buildLPS(pattern);
    const matches = [];
    let i = 0, j = 0;
    while (i < n) {
        if (text[i] === pattern[j]) { i++; j++; }
        if (j === m) {
            matches.push(i - j);
            j = lps[j - 1];
        } else if (i < n && text[i] !== pattern[j]) {
            j = j !== 0 ? lps[j - 1] : (i++, 0);
        }
    }
    return matches;
}
function buildLPS(pattern) {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    let len = 0, i = 1;
    while (i < m) {
        if (pattern[i] === pattern[len]) { lps[i++] = ++len; }
        else if (len) { len = lps[len - 1]; }
        else { lps[i++] = 0; }
    }
    return lps;
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

export default function KMPPage() {
    const [preset, setPreset] = useState(0);
    const [text, setText] = useState(PRESETS[0].text);
    const [pattern, setPattern] = useState(PRESETS[0].pattern);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(700);
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

    const state = stepHistory[currentStep] || { phase: 'init', lps: [], lpsI: -1, textI: -1, patJ: -1, matches: [], explanation: '' };
    const { phase, lps, lpsI, textI, patJ, matches, matchStart } = state;
    const m = pattern.length;

    const shuffle = () => {
        const next = (preset + 1) % PRESETS.length;
        setPreset(next);
        setText(PRESETS[next].text);
        setPattern(PRESETS[next].pattern);
    };

    const offset = phase === 'matching' || phase === 'mismatch' || phase === 'found' ? textI - patJ : -1;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/string-algorithms" className="flex items-center text-white hover:text-fuchsia-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to String Algorithms
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">KMP String Matching</h1>
                        <p className="text-xl text-fuchsia-100 mb-6 max-w-3xl mx-auto">
                            Knuth-Morris-Pratt uses a precomputed failure function to skip re-scanning characters already matched. O(n + m) guaranteed.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Time: O(n + m)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Space: O(m)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Failure Function</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Inputs */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 space-y-3">
                            <div className="flex gap-3 flex-wrap">
                                <div className="flex-1 min-w-40">
                                    <label className="text-xs text-slate-400 mb-1 block">Text</label>
                                    <input value={text} onChange={e => setText(e.target.value.toUpperCase().slice(0, 30))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500" />
                                </div>
                                <div className="flex-1 min-w-32">
                                    <label className="text-xs text-slate-400 mb-1 block">Pattern</label>
                                    <input value={pattern} onChange={e => setPattern(e.target.value.toUpperCase().slice(0, 10))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500" />
                                </div>
                            </div>
                        </div>

                        {/* Phase indicator */}
                        <div className="flex gap-2">
                            {['lps', 'lps_done', 'matching', 'mismatch', 'found', 'complete'].includes(phase) && (
                                <>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${['lps', 'lps_done'].includes(phase) ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        Phase 1: Build LPS
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${['matching', 'mismatch', 'found', 'complete'].includes(phase) ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        Phase 2: Match
                                    </div>
                                </>
                            )}
                        </div>

                        {/* LPS build visualization */}
                        {['lps', 'lps_done', 'init'].includes(phase) && (
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Failure Function (LPS Array)</h3>
                                <div className="overflow-x-auto">
                                    <div className="flex gap-1.5 mb-1 pl-16">
                                        {pattern.split('').map((_, i) => (
                                            <div key={i} className="w-9 text-center text-xs text-slate-500">i={i}</div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-xs text-slate-400 w-14 shrink-0 text-right pr-2">pattern</span>
                                        {pattern.split('').map((ch, i) => (
                                            <div key={i} className={`w-9 h-9 rounded flex items-center justify-center text-sm font-bold font-mono transition-all duration-200
                                                ${lpsI === i ? 'bg-fuchsia-600 text-white ring-2 ring-fuchsia-400' :
                                                  state.lpsLen > 0 && i < state.lpsLen ? 'bg-fuchsia-900/50 text-fuchsia-300' :
                                                  'bg-slate-700 text-slate-200'}`}>
                                                {ch}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-400 w-14 shrink-0 text-right pr-2">LPS</span>
                                        {lps.map((val, i) => (
                                            <div key={i} className={`w-9 h-9 rounded flex items-center justify-center text-sm font-bold font-mono transition-all duration-200
                                                ${lpsI === i ? 'bg-fuchsia-600 text-white' :
                                                  val > 0 ? 'bg-fuchsia-800/60 text-fuchsia-300' :
                                                  'bg-slate-800 text-slate-500'}`}>
                                                {val}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Matching visualization */}
                        {['matching', 'mismatch', 'found', 'complete', 'lps_done'].includes(phase) && (
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Pattern Matching</h3>

                                {/* LPS row (compact) */}
                                <div className="flex items-center gap-1 mb-3 flex-wrap">
                                    <span className="text-xs text-slate-500 mr-1">LPS:</span>
                                    {pattern.split('').map((ch, i) => (
                                        <span key={i} className="text-xs font-mono text-fuchsia-400">{lps[i] ?? 0}</span>
                                    ))}
                                </div>

                                {/* Text row */}
                                <div className="overflow-x-auto">
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className="text-xs text-slate-400 w-14 shrink-0 text-right pr-2">text</span>
                                        {text.split('').map((ch, i) => {
                                            const inMatch = matches.some(s => i >= s && i < s + m);
                                            const isCurrent = i === textI;
                                            const inWindow = offset >= 0 && i >= offset && i < offset + patJ + 1;
                                            return (
                                                <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold font-mono transition-all duration-200
                                                    ${phase === 'complete' && inMatch ? 'bg-green-500 text-white' :
                                                      isCurrent && phase === 'mismatch' ? 'bg-red-500/70 text-white ring-2 ring-red-400' :
                                                      isCurrent ? 'bg-yellow-400 text-slate-900 scale-110' :
                                                      inWindow ? 'bg-fuchsia-800/40 text-fuchsia-200' :
                                                      'bg-slate-700 text-slate-200'}`}>
                                                    {ch}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pattern row (aligned under text) */}
                                    {offset >= 0 && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400 w-14 shrink-0 text-right pr-2">pattern</span>
                                            {Array.from({ length: offset }, (_, k) => (
                                                <div key={`pad-${k}`} className="w-8 h-8 shrink-0" />
                                            ))}
                                            {pattern.split('').map((ch, j) => {
                                                const isActive = j === patJ;
                                                const isMatched = j < patJ;
                                                return (
                                                    <div key={j} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold font-mono transition-all duration-200
                                                        ${isActive && phase === 'mismatch' ? 'bg-red-500/70 text-white ring-2 ring-red-400' :
                                                          isActive ? 'bg-yellow-400 text-slate-900 scale-110' :
                                                          isMatched && phase !== 'mismatch' ? 'bg-fuchsia-600 text-white' :
                                                          'bg-slate-800 text-slate-400'}`}>
                                                        {ch}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Matches summary */}
                                {matches.length > 0 && (
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-slate-400">Matches found:</span>
                                        {matches.map(s => (
                                            <span key={s} className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded font-mono">index {s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

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
                                    <span className="text-slate-400">Phase</span>
                                    <span className="text-fuchsia-400 capitalize">{phase.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Text pointer i</span>
                                    <span className="text-slate-300 font-mono">{textI >= 0 ? textI : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Pattern pointer j</span>
                                    <span className="text-slate-300 font-mono">{patJ >= 0 ? patJ : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Matches found</span>
                                    <span className="text-green-400 font-bold">{matches.length}</span>
                                </div>
                                {matches.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">At indices</span>
                                        <span className="text-green-300 text-xs font-mono">[{matches.join(', ')}]</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="font-semibold text-white mb-3">Color Legend</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-yellow-400" /><span className="text-slate-400">Current comparison</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-fuchsia-600" /><span className="text-slate-400">Matched characters</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-500/70" /><span className="text-slate-400">Mismatch</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-green-500" /><span className="text-slate-400">Pattern found</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
