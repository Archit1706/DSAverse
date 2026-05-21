'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why do we check `char_map[s[right]] >= left` instead of just checking `s[right] in char_map`?",
        options: [
            "To avoid an index out of bounds error",
            "Because characters can appear multiple times; we only care if the previous occurrence is INSIDE the current window (>= left), not somewhere we already shrunk past",
            "To make the algorithm work on Unicode strings",
            "Because the hash map stores indices starting from 1, not 0",
        ],
        correct: 1,
        explanation: "The character map remembers the last-seen index of every character, even those the left pointer has already passed. If the previous occurrence is to the LEFT of our current left pointer, it is outside the window and harmless — we can safely extend. Only when the previous occurrence is still inside the window (index >= left) must we advance the left pointer."
    },
    {
        question: "What data structure tracks character positions in this algorithm?",
        options: [
            "A sorted array of (char, index) pairs",
            "A stack",
            "A hash map (dictionary) mapping each character to its most recent index",
            "A linked list",
        ],
        correct: 2,
        explanation: "A hash map (Python dict / JavaScript object) provides O(1) average-case lookup and update. We store each character as a key and its most recent position as the value. This lets us instantly find whether a character is in the window and where to move the left pointer."
    },
    {
        question: "What is the time complexity of the longest substring without repeating characters algorithm?",
        options: ["O(n²) — nested loops over characters", "O(n log n) — sorting involved", "O(n) — each character is processed at most twice", "O(n * |alphabet|) — depends on character set size"],
        correct: 2,
        explanation: "The right pointer visits each character exactly once as it moves left to right. The left pointer only moves right, so it also visits each position at most once. Total operations are O(2n) = O(n). Hash map lookups are O(1) average, so overall time complexity is O(n)."
    },
];

const SAMPLE_STRINGS = ["pwwkew", "bbbbb", "abcabcbb", "dvdf", "tmmzuxt", "abba"];

export default function LongestSubstringPage() {
    const [inputString, setInputString] = useState("abcabcbb");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const s = inputString;
        const n = s.length;

        if (n === 0) {
            steps.push({
                left: 0, right: -1, maxLen: 0, maxStart: 0, maxEnd: -1,
                duplicateIdx: -1, done: false,
                explanation: 'Empty string — longest substring length is 0.',
            });
            return steps;
        }

        const charMap = {};
        let left = 0;
        let maxLen = 0;
        let maxStart = 0;

        steps.push({
            left: 0, right: -1, maxLen: 0, maxStart: 0, maxEnd: -1,
            duplicateIdx: -1, done: false,
            explanation: `Starting with empty window. Left pointer at 0. We will expand right one character at a time.`,
        });

        for (let right = 0; right < n; right++) {
            const ch = s[right];

            if (charMap[ch] !== undefined && charMap[ch] >= left) {
                // Duplicate inside the window
                const prevIdx = charMap[ch];
                steps.push({
                    left, right,
                    maxLen, maxStart, maxEnd: maxStart + maxLen - 1,
                    duplicateIdx: prevIdx,
                    done: false,
                    explanation: `Adding '${ch}' at index ${right}: duplicate found at index ${prevIdx} (still inside window). Move left pointer from ${left} to ${prevIdx + 1}.`,
                });
                left = prevIdx + 1;
            }

            charMap[ch] = right;
            const currentLen = right - left + 1;

            if (currentLen > maxLen) {
                maxLen = currentLen;
                maxStart = left;
                steps.push({
                    left, right,
                    maxLen, maxStart, maxEnd: maxStart + maxLen - 1,
                    duplicateIdx: -1,
                    done: false,
                    explanation: `Window [${left}..${right}] = "${s.slice(left, right + 1)}", length ${currentLen}. New maximum length: ${maxLen}!`,
                });
            } else {
                steps.push({
                    left, right,
                    maxLen, maxStart, maxEnd: maxStart + maxLen - 1,
                    duplicateIdx: -1,
                    done: false,
                    explanation: `Window [${left}..${right}] = "${s.slice(left, right + 1)}", length ${currentLen}. Max remains ${maxLen}.`,
                });
            }
        }

        steps.push({
            left: maxStart, right: maxStart + maxLen - 1,
            maxLen, maxStart, maxEnd: maxStart + maxLen - 1,
            duplicateIdx: -1,
            done: true,
            explanation: `Done! Longest substring without repeating characters: "${s.slice(maxStart, maxStart + maxLen)}" (indices ${maxStart}–${maxStart + maxLen - 1}), length ${maxLen}.`,
        });

        return steps;
    }, [inputString]);

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); }, [generateSteps]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const generateRandom = () => {
        const next = SAMPLE_STRINGS[Math.floor(Math.random() * SAMPLE_STRINGS.length)];
        setInputString(next);
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
        left: 0, right: -1, maxLen: 0, maxStart: 0, maxEnd: -1,
        duplicateIdx: -1, done: false,
        explanation: 'Ready — press Play or step through.',
    };

    const getBoxColor = (i) => {
        if (cur.done) {
            if (i >= cur.maxStart && i <= cur.maxEnd) return 'bg-green-500 border-green-400 text-white scale-105';
            return 'bg-slate-700 border-slate-600 text-slate-100';
        }
        if (i === cur.duplicateIdx) return 'bg-red-500/30 border-red-500 text-red-300';
        if (i === cur.right && cur.right >= 0) return 'bg-orange-500 border-orange-400 text-white scale-110';
        if (i === cur.left && i < cur.right) return 'bg-blue-500 border-blue-400 text-white';
        if (i > cur.left && i < cur.right && cur.right >= 0) return 'bg-violet-800/50 border-violet-700 text-slate-200';
        if (i === cur.left && i === cur.right && cur.right >= 0) return 'bg-orange-500 border-orange-400 text-white scale-110';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const getLabelBelow = (i) => {
        if (!cur.done) {
            if (i === cur.duplicateIdx) return { text: 'dup', cls: 'text-red-400' };
            if (i === cur.right && i === cur.left && cur.right >= 0) return { text: 'L=R', cls: 'text-orange-400' };
            if (i === cur.right && cur.right >= 0) return { text: 'R', cls: 'text-orange-400' };
            if (i === cur.left && cur.right >= 0) return { text: 'L', cls: 'text-blue-400' };
        }
        return null;
    };

    const currentWindow = cur.right >= cur.left && cur.right >= 0
        ? inputString.slice(cur.left, cur.right + 1)
        : '';

    const code = `def lengthOfLongestSubstring(s):
    char_map = {}
    left = 0
    max_len = 0
    for right in range(len(s)):
        if s[right] in char_map and char_map[s[right]] >= left:
            left = char_map[s[right]] + 1
        char_map[s[right]] = right
        max_len = max(max_len, right - left + 1)
    return max_len

print(lengthOfLongestSubstring("abcabcbb"))  # 3
print(lengthOfLongestSubstring("pwwkew"))    # 3
print(lengthOfLongestSubstring("bbbbb"))     # 1`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Longest Substring Without Repeating Characters</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Expand the right pointer adding characters; shrink the left pointer when a duplicate enters.
                            The window always contains a unique-character substring.
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
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <label className="text-sm text-slate-400 whitespace-nowrap">Input:</label>
                                    <input
                                        type="text"
                                        value={inputString}
                                        onChange={e => { setInputString(e.target.value); setIsPlaying(false); setCurrentStep(0); }}
                                        className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg text-sm focus:outline-none focus:border-violet-500"
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
                                    <div className="text-base font-bold text-violet-400 font-mono truncate">{currentWindow || '–'}</div>
                                    <div className="text-xs text-slate-400">Current Window</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-slate-300">{Math.max(0, cur.right - cur.left + 1)}</div>
                                    <div className="text-xs text-slate-400">Current Length</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-green-400">{cur.maxLen}</div>
                                    <div className="text-xs text-slate-400">Max Length</div>
                                </div>
                            </div>

                            {/* Character boxes */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 overflow-x-auto">
                                <div className="flex flex-wrap justify-center gap-2 min-w-max mx-auto">
                                    {inputString.split('').map((ch, i) => {
                                        const lbl = getLabelBelow(i);
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <span className="text-xs text-slate-500">{i}</span>
                                                <div className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold text-sm transition-all duration-300 ${getBoxColor(i)}`}>
                                                    {ch}
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
                                    ['bg-violet-800/50 border-violet-700', 'In window'],
                                    ['bg-red-500/30 border-red-500', 'Duplicate found'],
                                    ['bg-green-500', 'Max window (final)'],
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
                                {[['Time', 'O(n)', 'violet'], ['Space', 'O(k)', 'yellow'], ['Best Case', 'O(n)', 'violet'], ['Worst Case', 'O(n)', 'violet']].map(([label, val, color]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-base font-bold text-${color}-400`}>{val}</div>
                                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">Space is O(k) where k is the size of the character set (e.g., 26 for lowercase ASCII, 128 for full ASCII). In practice this is a small constant.</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">How It Works</h2>
                            <ol className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">1</span><span>Initialize left=0, empty char_map, maxLen=0</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">2</span><span>Expand right pointer one step. If s[right] was seen and its index is &gt;= left, move left past it</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">3</span><span>Update char_map[s[right]] = right</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">4</span><span>Update maxLen = max(maxLen, right - left + 1) and repeat</span></li>
                            </ol>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">Applications</h2>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Token stream parsing: longest run of distinct tokens</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>Password strength: finding unique-character runs</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>DNA/protein analysis: longest unique amino-acid sequence windows</span></li>
                                <li className="flex gap-2"><span className="text-violet-400">•</span><span>File deduplication: identifying non-repeating byte sequences</span></li>
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
