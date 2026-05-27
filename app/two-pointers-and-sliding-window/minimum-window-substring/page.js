'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why can we check window validity in O(1) instead of re-scanning the window each time?",
        options: [
            "Because the window is always sorted",
            "We maintain a 'formed' counter that tracks how many distinct characters from t are satisfied — incrementing/decrementing it with each pointer move keeps it accurate in constant time",
            "Because we only need to check the character at the right pointer",
            "Because we use binary search on the frequency map",
        ],
        correct: 1,
        explanation: "We precompute how many unique characters in t are needed ('required'). The 'formed' counter increments when a character's window count exactly meets its target, and decrements when it falls below. When formed == required the window is valid — no scanning needed. Each pointer move updates at most one character's count and possibly formed by 1.",
    },
    {
        question: "What is the time complexity of the sliding window approach?",
        options: ["O(n·m) — for each position we scan t", "O(n + m) — each character in s and t is processed a constant number of times", "O(n²) — the left pointer may scan the whole string for each right step", "O(m²) — dominated by the frequency map"],
        correct: 1,
        explanation: "The right pointer advances through s exactly once (O(n)). The left pointer also advances through s at most once in total (O(n)). Building and querying the frequency map takes O(m) for the pattern. Total: O(n + m). No position is visited more than twice.",
    },
    {
        question: "When should we advance the left pointer?",
        options: [
            "After every step of the right pointer",
            "Only when the window becomes longer than the current minimum",
            "Whenever the window is valid — we shrink from the left to find the tightest window while validity holds",
            "When the right pointer's character is already in the window",
        ],
        correct: 2,
        explanation: "Once the window satisfies all character requirements (formed == required), we record it as a candidate minimum, then advance the left pointer one step to try shrinking it. We keep shrinking as long as the window remains valid, since a shorter valid window is always better. The moment validity breaks we resume expanding from the right.",
    },
];

const EXAMPLES = [
    { s: 'ADOBECODEBANC', t: 'ABC' },
    { s: 'AAABBBCCC', t: 'ABC' },
    { s: 'abcdef', t: 'ace' },
    { s: 'ABCBA', t: 'AB' },
];

export default function MinimumWindowSubstringPage() {
    const [example, setExample] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const { s, t } = EXAMPLES[example];

    const generateSteps = useCallback(() => {
        const steps = [];
        const n = s.length;

        // Build need map
        const need = {};
        for (const c of t) need[c] = (need[c] || 0) + 1;
        const required = Object.keys(need).length;

        let have = {}, formed = 0;
        let left = 0;
        let minLen = Infinity, minLeft = -1, minRight = -1;

        steps.push({
            left: 0, right: -1, have: {}, formed, required,
            minLen, minLeft, minRight, need: { ...need },
            explanation: `Find minimum window in "${s}" containing all chars of t="${t}". Need: ${Object.entries(need).map(([k, v]) => `${k}×${v}`).join(', ')}.`,
            phase: 'init',
        });

        for (let right = 0; right < n; right++) {
            const c = s[right];
            have[c] = (have[c] || 0) + 1;

            if (need[c] !== undefined && have[c] === need[c]) {
                formed++;
            }

            steps.push({
                left, right, have: { ...have }, formed, required,
                minLen, minLeft, minRight, need: { ...need },
                explanation: `Expand: add s[${right}]='${c}'. Window "${s.slice(left, right + 1)}". Have ${formed}/${required} chars satisfied.`,
                phase: formed === required ? 'valid' : 'expand',
            });

            // Shrink while valid
            while (formed === required) {
                const wLen = right - left + 1;
                if (wLen < minLen) {
                    minLen = wLen;
                    minLeft = left;
                    minRight = right;
                    steps.push({
                        left, right, have: { ...have }, formed, required,
                        minLen, minLeft, minRight, need: { ...need },
                        explanation: `Valid window "${s.slice(left, right + 1)}" (length ${wLen}) — new minimum! Shrink from left.`,
                        phase: 'new_min',
                    });
                } else {
                    steps.push({
                        left, right, have: { ...have }, formed, required,
                        minLen, minLeft, minRight, need: { ...need },
                        explanation: `Valid window "${s.slice(left, right + 1)}" (length ${wLen}). Current min is ${minLen}. Shrink left to find shorter window.`,
                        phase: 'shrink',
                    });
                }

                const leftChar = s[left];
                have[leftChar]--;
                if (need[leftChar] !== undefined && have[leftChar] < need[leftChar]) {
                    formed--;
                }
                left++;
            }
        }

        const answer = minLeft === -1 ? 'No valid window found.' : `Minimum window: "${s.slice(minLeft, minRight + 1)}" (length ${minLen}, indices ${minLeft}–${minRight}).`;
        steps.push({
            left, right: n, have: { ...have }, formed, required,
            minLen, minLeft, minRight, need: { ...need },
            explanation: answer,
            phase: 'done',
        });

        return steps;
    }, [s, t]);

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); setIsPlaying(false); }, [generateSteps]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const tm = setTimeout(() => setCurrentStep(st => st + 1), speed);
        return () => clearTimeout(tm);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(st => ({ ...st, selected: idx, answered: true, score: correct ? st.score + 1 : st.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(st => ({ ...st, complete: true }));
        else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
    };

    const cur = stepHistory[currentStep] || {
        left: 0, right: -1, have: {}, formed: 0, required: Object.keys(
            t.split('').reduce((m, c) => { m[c] = (m[c] || 0) + 1; return m; }, {})
        ).length,
        minLen: Infinity, minLeft: -1, minRight: -1, need: {},
        explanation: 'Ready — press Play or step through.', phase: 'init',
    };

    const getCharColor = (i) => {
        if (cur.phase === 'done' && cur.minLeft !== -1 && i >= cur.minLeft && i <= cur.minRight)
            return 'bg-green-500 border-green-400 text-white scale-105';
        if (cur.phase === 'new_min' && i >= cur.left && i <= cur.right)
            return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === cur.left && i === cur.right)
            return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i === cur.left)
            return 'bg-blue-500 border-blue-400 text-white scale-110';
        if (i === cur.right)
            return 'bg-orange-500 border-orange-400 text-white scale-110';
        if (cur.right >= 0 && i > cur.left && i < cur.right) {
            if (cur.phase === 'valid' || cur.phase === 'shrink' || cur.phase === 'new_min')
                return 'bg-violet-600/60 border-violet-500 text-slate-100';
            return 'bg-violet-800/50 border-violet-700 text-slate-200';
        }
        if (i < cur.left) return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    // Freq map display chars — unique chars in t
    const needChars = Object.keys(cur.need || {}).sort();

    const code = `def minWindow(s, t):
    if not t or not s:
        return ""
    need = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    required = len(need)
    have, formed = {}, 0
    left = 0
    min_len, min_left, min_right = float('inf'), -1, -1

    for right in range(len(s)):
        c = s[right]
        have[c] = have.get(c, 0) + 1
        if c in need and have[c] == need[c]:
            formed += 1

        while formed == required:
            if right - left + 1 < min_len:
                min_len = right - left + 1
                min_left, min_right = left, right
            lc = s[left]
            have[lc] -= 1
            if lc in need and have[lc] < need[lc]:
                formed -= 1
            left += 1

    return s[min_left:min_right + 1] if min_left != -1 else ""

print(minWindow("ADOBECODEBANC", "ABC"))  # "BANC"`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Minimum Window Substring</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Expand the right pointer until all required characters are covered, then shrink
                            from the left to find the tightest valid window. Character frequencies update live.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left column */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Visualization</h2>

                            {/* Example selector */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {EXAMPLES.map((ex, i) => (
                                    <button key={i}
                                        onClick={() => { setExample(i); setIsPlaying(false); setCurrentStep(0); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${example === i ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                        s="{ex.s.length > 10 ? ex.s.slice(0, 10) + '…' : ex.s}" t="{ex.t}"
                                    </button>
                                ))}
                            </div>

                            {/* Current input display */}
                            <div className="flex gap-4 mb-4 text-sm">
                                <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                                    <span className="text-slate-400">s = </span>
                                    <span className="text-slate-200 font-mono">"{s}"</span>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                                    <span className="text-slate-400">t = </span>
                                    <span className="text-violet-300 font-mono">"{t}"</span>
                                </div>
                            </div>

                            {/* Playback */}
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(st => Math.max(0, st - 1))}
                                    disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
                                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(st => Math.min(stepHistory.length - 1, st + 1))}
                                    disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors">
                                    <RotateCcw className="h-4 w-4" />
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
                                    <div className={`text-base font-bold ${cur.formed === cur.required ? 'text-green-400' : 'text-violet-400'}`}>
                                        {cur.formed}/{cur.required}
                                    </div>
                                    <div className="text-xs text-slate-400">Chars satisfied</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-slate-300">
                                        {cur.right >= cur.left ? cur.right - cur.left + 1 : 0}
                                    </div>
                                    <div className="text-xs text-slate-400">Window size</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-green-400">
                                        {cur.minLen === Infinity ? '—' : cur.minLen}
                                    </div>
                                    <div className="text-xs text-slate-400">Min length</div>
                                </div>
                            </div>

                            {/* String visualization */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 overflow-x-auto">
                                <div className="flex gap-1.5 min-w-max">
                                    {s.split('').map((ch, i) => (
                                        <div key={i} className="flex flex-col items-center gap-0.5">
                                            <span className="text-xs text-slate-500">{i}</span>
                                            <div className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold text-sm transition-all duration-300 ${getCharColor(i)}`}>
                                                {ch}
                                            </div>
                                            <span className="text-xs font-bold h-3">
                                                {i === cur.left && i === cur.right ? <span className="text-yellow-400">LR</span>
                                                    : i === cur.left ? <span className="text-blue-400">L</span>
                                                    : i === cur.right ? <span className="text-orange-400">R</span>
                                                    : null}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Frequency map panel */}
                            <div className="bg-slate-800/60 rounded-lg p-3 mb-4">
                                <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wide">Character frequency tracker</p>
                                <div className="flex flex-wrap gap-2">
                                    {needChars.map(ch => {
                                        const needed = (cur.need || {})[ch] || 0;
                                        const current = (cur.have || {})[ch] || 0;
                                        const satisfied = current >= needed;
                                        return (
                                            <div key={ch}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-mono transition-all ${satisfied ? 'border-green-500/50 bg-green-500/10' : 'border-slate-600 bg-slate-700/50'}`}>
                                                <span className={`font-bold ${satisfied ? 'text-green-300' : 'text-slate-200'}`}>{ch}</span>
                                                <span className="text-slate-400 text-xs">
                                                    {current}/{needed}
                                                </span>
                                                {satisfied && <span className="text-green-400 text-xs">✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Min window so far */}
                            {cur.minLeft !== -1 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                                    <span className="text-xs text-green-400 font-semibold">Best window so far: </span>
                                    <span className="font-mono text-green-300 text-sm">"{s.slice(cur.minLeft, cur.minRight + 1)}"</span>
                                    <span className="text-xs text-slate-400 ml-2">(length {cur.minLen}, [{cur.minLeft}–{cur.minRight}])</span>
                                </div>
                            )}

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
                                {[['Time', 'O(n + m)', 'violet'], ['Space', 'O(m)', 'violet'], ['n = len(s)', 'string length', 'slate'], ['m = len(t)', 'pattern length', 'slate']].map(([label, val, color]) => (
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
                                    'Build frequency map need[] from t. Set required = distinct char count in t',
                                    'Advance right pointer, add s[right] to have[]. If have[c] == need[c]: formed++',
                                    'While formed == required: record window if it beats the minimum, then advance left (remove s[left], decrement formed if needed)',
                                    'Repeat until right reaches end of s',
                                    'Return the shortest valid window recorded, or "" if none found',
                                ].map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Key Insight: formed counter</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Instead of scanning the whole window for validity, track how many distinct characters from t are fully satisfied (have count ≥ need count)</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>formed increments only when have[c] exactly reaches need[c] — not on every addition</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>This makes validity check O(1) per pointer move instead of O(m)</span></li>
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
