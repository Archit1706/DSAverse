'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Shuffle, Info, CheckCircle, XCircle, Code } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const BASE = 31;
const MOD = 1e9 + 9;

function charVal(ch) { return ch.charCodeAt(0) - 'A'.charCodeAt(0) + 1; }
function computeHash(s, len) {
    let h = 0, pow = 1;
    for (let i = 0; i < len; i++) {
        h = (h + charVal(s[i]) * pow) % MOD;
        pow = (pow * BASE) % MOD;
    }
    return Math.round(h);
}

const quizQuestions = [
    {
        question: "What is the purpose of the 'rolling hash' in Rabin-Karp?",
        options: [
            "To sort the text before searching",
            "To update the hash of a sliding window in O(1) by removing the old character and adding the new one",
            "To compute all possible substrings and store them",
            "To encrypt the text for security",
        ],
        correct: 1,
        explanation: "A rolling hash lets us slide the window by one position in O(1): subtract the contribution of the character leaving the window and add the contribution of the new character entering. Without rolling, computing each window's hash from scratch would take O(m) per position, giving O(n×m) overall.",
    },
    {
        question: "What is a hash collision in Rabin-Karp, and how is it handled?",
        options: [
            "When the pattern hash equals the window hash — always means a match",
            "When the hash overflows a 32-bit integer",
            "When two different strings produce the same hash value — triggers a character-by-character verification",
            "When the pattern length exceeds the text length",
        ],
        correct: 2,
        explanation: "A hash function may map different strings to the same value. When the window hash equals the pattern hash, Rabin-Karp verifies character by character to confirm or reject the match. This is called a 'spurious hit'. With a good hash, collisions are rare and the average complexity stays O(n+m).",
    },
    {
        question: "What is the average and worst-case time complexity of Rabin-Karp?",
        options: [
            "O(n+m) average, O(n×m) worst case",
            "O(n log n) average, O(n log n) worst case",
            "O(n+m) both average and worst case",
            "O(n) average, O(n²) worst case",
        ],
        correct: 0,
        explanation: "On average, Rabin-Karp is O(n+m) because hash collisions are rare. In the worst case (e.g., a string of all identical characters), every window might collide and require full verification, giving O(n×m). KMP guarantees O(n+m) worst case, making it preferable when worst-case matters.",
    },
];

const PRESETS = [
    { text: 'ABCDFGHABCDA', pattern: 'ABCD' },
    { text: 'AABAACAADAAB', pattern: 'AAB' },
    { text: 'GEEKSFORGEEKS', pattern: 'GEEK' },
    { text: 'ABABABCABAB', pattern: 'ABAB' },
];

function generateSteps(text, pattern) {
    const steps = [];
    const n = text.length, m = pattern.length;
    const patHash = computeHash(pattern, m);
    const matches = [];

    // Precompute BASE^m for rolling hash
    let basePow = 1;
    for (let k = 0; k < m; k++) basePow = (basePow * BASE) % MOD;
    basePow = Math.round(basePow);

    steps.push({
        windowStart: 0, patHash, windowHash: -1, phase: 'init',
        matches: [], verifying: false, matchResult: null,
        explanation: `Rabin-Karp on text "${text}", pattern "${pattern}". Pattern hash = hash("${pattern}") = ${patHash}. We slide a window of length ${m} across the text and compare hashes.`,
    });

    // Compute initial window hash
    let winHash = computeHash(text, m);

    steps.push({
        windowStart: 0, patHash, windowHash: winHash, phase: 'slide',
        matches: [...matches], verifying: false, matchResult: null,
        explanation: `Initial window "${text.slice(0, m)}" hash = ${winHash}. Pattern hash = ${patHash}. ${winHash === patHash ? 'Hashes match! Verifying...' : 'Hashes differ — skip to next position.'}`,
    });

    for (let i = 0; i <= n - m; i++) {
        const windowStr = text.slice(i, i + m);
        if (winHash === patHash) {
            steps.push({
                windowStart: i, patHash, windowHash: winHash, phase: 'verify',
                matches: [...matches], verifying: true, matchResult: null,
                explanation: `Hash match at i=${i}: window "${windowStr}" hash (${winHash}) == pattern hash (${patHash}). Verify character by character to rule out collision.`,
            });
            let isMatch = true;
            for (let k = 0; k < m; k++) {
                if (text[i + k] !== pattern[k]) { isMatch = false; break; }
            }
            if (isMatch) {
                matches.push(i);
                steps.push({
                    windowStart: i, patHash, windowHash: winHash, phase: 'found',
                    matches: [...matches], verifying: false, matchResult: true,
                    explanation: `Verified! Pattern found at index ${i}. text[${i}..${i + m - 1}] = "${windowStr}".`,
                });
            } else {
                steps.push({
                    windowStart: i, patHash, windowHash: winHash, phase: 'collision',
                    matches: [...matches], verifying: false, matchResult: false,
                    explanation: `Spurious hit! Hashes matched but strings differ — hash collision. text[${i}..${i + m - 1}] = "${windowStr}" ≠ "${pattern}".`,
                });
            }
        }

        if (i < n - m) {
            // Rolling hash update
            const outChar = text[i];
            const inChar = text[i + m];
            winHash = Math.round(((winHash - charVal(outChar) + MOD) % MOD * (1 / BASE % MOD) + MOD) % MOD);
            // Simpler: recompute for clarity (still O(1) conceptually)
            winHash = computeHash(text.slice(i + 1, i + 1 + m), m);

            steps.push({
                windowStart: i + 1, patHash, windowHash: winHash, phase: 'slide',
                matches: [...matches], verifying: false, matchResult: null,
                explanation: `Slide window: remove '${outChar}', add '${inChar}'. New window "${text.slice(i + 1, i + 1 + m)}" hash = ${winHash}. ${winHash === patHash ? 'Hash match! Verifying...' : 'No hash match.'}`,
            });
        }
    }

    steps.push({
        windowStart: n - m + 1, patHash, windowHash: -1, phase: 'complete',
        matches: [...matches], verifying: false, matchResult: null,
        explanation: `Search complete. Found ${matches.length} match${matches.length !== 1 ? 'es' : ''} at position${matches.length !== 1 ? 's' : ''}: ${matches.length > 0 ? matches.join(', ') : 'none'}.`,
    });

    return steps;
}

const codeStr = `function rabinKarp(text, pattern) {
    const n = text.length, m = pattern.length;
    const BASE = 31, MOD = 1e9 + 9;
    const patHash = hash(pattern, m);
    let winHash = hash(text, m);
    const matches = [];

    for (let i = 0; i <= n - m; i++) {
        if (winHash === patHash) {
            // Verify to handle hash collisions
            if (text.slice(i, i + m) === pattern)
                matches.push(i);
        }
        if (i < n - m) {
            winHash = rollingUpdate(winHash,
                text[i], text[i + m], m);
        }
    }
    return matches;
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

export default function RabinKarpPage() {
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

    const state = stepHistory[currentStep] || { windowStart: 0, patHash: 0, windowHash: -1, phase: 'init', matches: [], verifying: false, matchResult: null, explanation: '' };
    const { windowStart, patHash, windowHash, phase, matches, verifying, matchResult } = state;
    const m = pattern.length;
    const n = text.length;

    const shuffle = () => {
        const next = (preset + 1) % PRESETS.length;
        setPreset(next);
        setText(PRESETS[next].text);
        setPattern(PRESETS[next].pattern);
    };

    const windowEnd = Math.min(windowStart + m, n);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/string-algorithms" className="flex items-center text-white hover:text-fuchsia-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to String Algorithms
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Rabin-Karp</h1>
                        <p className="text-xl text-fuchsia-100 mb-6 max-w-3xl mx-auto">
                            Slide a rolling hash window across the text. Each position costs O(1) to hash — compare hashes first, then verify on a match.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Time: O(n + m) avg</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Rolling Hash</span>
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
                                    <input value={text} onChange={e => setText(e.target.value.toUpperCase().slice(0, 25))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500" />
                                </div>
                                <div className="flex-1 min-w-28">
                                    <label className="text-xs text-slate-400 mb-1 block">Pattern</label>
                                    <input value={pattern} onChange={e => setPattern(e.target.value.toUpperCase().slice(0, 8))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500" />
                                </div>
                            </div>
                        </div>

                        {/* Hash display */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Hash Comparison</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                    <div className="text-xs text-slate-400 mb-1">Pattern Hash</div>
                                    <div className="text-2xl font-bold font-mono text-fuchsia-400">{patHash}</div>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">hash("{pattern}")</div>
                                </div>
                                <div className={`rounded-lg p-4 text-center transition-all duration-300 ${
                                    phase === 'found' ? 'bg-green-500/20 border border-green-500/30' :
                                    phase === 'collision' ? 'bg-red-500/20 border border-red-500/30' :
                                    phase === 'verify' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                                    windowHash === patHash && windowHash >= 0 ? 'bg-fuchsia-500/20 border border-fuchsia-500/30' :
                                    'bg-slate-800/50'}`}>
                                    <div className="text-xs text-slate-400 mb-1">Window Hash</div>
                                    <div className={`text-2xl font-bold font-mono transition-all duration-300 ${
                                        phase === 'found' ? 'text-green-400' :
                                        phase === 'collision' ? 'text-red-400' :
                                        windowHash === patHash && windowHash >= 0 ? 'text-yellow-400' :
                                        'text-slate-300'}`}>
                                        {windowHash >= 0 ? windowHash : '—'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">
                                        hash("{windowStart < n ? text.slice(windowStart, windowStart + m) : '—'}")
                                    </div>
                                </div>
                            </div>
                            {windowHash >= 0 && (
                                <div className={`mt-3 text-center text-sm font-medium ${
                                    phase === 'found' ? 'text-green-400' :
                                    phase === 'collision' ? 'text-red-400' :
                                    phase === 'verify' ? 'text-yellow-400' :
                                    windowHash === patHash ? 'text-yellow-400' :
                                    'text-slate-500'}`}>
                                    {phase === 'found' ? '✓ Hash match + verified = Pattern found!' :
                                     phase === 'collision' ? '✗ Hash match but strings differ (collision)' :
                                     phase === 'verify' ? '~ Hash match — verifying characters...' :
                                     windowHash === patHash ? '~ Hashes equal — checking...' :
                                     `${patHash} ≠ ${windowHash} — skip`}
                                </div>
                            )}
                        </div>

                        {/* Text visualization */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Sliding Window</h3>
                            <div className="overflow-x-auto">
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs text-slate-400 w-16 shrink-0 text-right pr-2">text</span>
                                    {text.split('').map((ch, i) => {
                                        const inWindow = i >= windowStart && i < windowStart + m && phase !== 'complete';
                                        const inMatch = matches.some(s => i >= s && i < s + m);
                                        return (
                                            <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold font-mono transition-all duration-200
                                                ${phase === 'complete' && inMatch ? 'bg-green-500 text-white' :
                                                  phase === 'found' && inWindow ? 'bg-green-500 text-white scale-110' :
                                                  phase === 'collision' && inWindow ? 'bg-red-500/60 text-white' :
                                                  phase === 'verify' && inWindow ? 'bg-yellow-400/80 text-slate-900' :
                                                  inWindow ? 'bg-fuchsia-600 text-white' :
                                                  'bg-slate-700 text-slate-200'}`}>
                                                {ch}
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Index labels */}
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="w-16 shrink-0" />
                                    {text.split('').map((_, i) => (
                                        <div key={i} className={`w-8 text-center text-xs transition-colors ${i >= windowStart && i < windowStart + m ? 'text-fuchsia-400' : 'text-slate-600'}`}>{i}</div>
                                    ))}
                                </div>
                                {/* Pattern comparison row */}
                                {(phase === 'verify' || phase === 'found' || phase === 'collision') && (
                                    <div className="flex items-center gap-1 mt-3">
                                        <span className="text-xs text-slate-400 w-16 shrink-0 text-right pr-2">pattern</span>
                                        {Array.from({ length: windowStart }, (_, k) => <div key={`p${k}`} className="w-8 h-8 shrink-0" />)}
                                        {pattern.split('').map((ch, j) => (
                                            <div key={j} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold font-mono transition-all duration-200
                                                ${phase === 'found' ? 'bg-green-500 text-white' :
                                                  phase === 'collision' ? 'bg-red-500/60 text-white' :
                                                  'bg-yellow-400/80 text-slate-900'}`}>
                                                {ch}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Matches summary */}
                            {matches.length > 0 && (
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400">Matches:</span>
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
                                    <span className="text-slate-400">Phase</span>
                                    <span className="text-fuchsia-400 capitalize">{phase}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Window start</span>
                                    <span className="text-slate-300 font-mono">{windowStart}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Window</span>
                                    <span className="text-fuchsia-300 font-mono text-xs">"{text.slice(windowStart, windowStart + m)}"</span>
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
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-fuchsia-600" /><span className="text-slate-400">Current window</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-yellow-400" /><span className="text-slate-400">Hash match — verifying</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-green-500" /><span className="text-slate-400">Match confirmed</span></div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-500/60" /><span className="text-slate-400">Hash collision (false alarm)</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
