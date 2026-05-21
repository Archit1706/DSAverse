'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why do we skip non-alphanumeric characters when checking for a palindrome?",
        options: [
            "Because non-alphanumeric characters slow down the algorithm",
            "To match real-world definitions: 'A man, a plan, a canal: Panama' should be a valid palindrome despite spaces and punctuation",
            "Because the algorithm cannot compare punctuation characters",
            "To reduce the string length so it runs in O(log n) time",
        ],
        correct: 1,
        explanation: "The real-world definition of a palindrome ignores spaces, punctuation, and case. Stripping non-alphanumeric characters lets the algorithm match natural language phrases like 'Was it a car or a cat I saw' while still correctly rejecting strings like 'hello'."
    },
    {
        question: "What is the time complexity of the two-pointer palindrome check?",
        options: ["O(n²) — we compare every pair of characters", "O(n log n) — similar to sorting", "O(n) — each character is visited at most once", "O(1) — constant time with the right hash"],
        correct: 2,
        explanation: "Each character is visited at most once: the left pointer moves right and the right pointer moves left until they meet or cross. Total work is proportional to the length of the cleaned string — O(n)."
    },
    {
        question: "When can we conclude the string IS a palindrome?",
        options: [
            "When we find the first matching pair",
            "When the left pointer passes the middle of the string",
            "When the left pointer meets or passes the right pointer without finding a mismatch",
            "When all characters are the same",
        ],
        correct: 2,
        explanation: "We can only declare the string a palindrome after checking ALL symmetric pairs. If the left pointer reaches or crosses the right pointer without encountering a mismatch, every pair has been confirmed equal and the string is a palindrome."
    },
];

const SAMPLE_STRINGS = [
    "racecar",
    "hello",
    "Was it a car or a cat I saw",
    "level",
    "OpenAI",
    "A man a plan a canal Panama",
];

export default function ValidPalindromePage() {
    const [inputString, setInputString] = useState("A man a plan a canal Panama");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const cleanStr = inputString.toLowerCase().replace(/[^a-z0-9]/g, '');
        const n = cleanStr.length;

        steps.push({
            cleanStr,
            left: 0,
            right: n - 1,
            matched: [],
            mismatchLeft: -1,
            mismatchRight: -1,
            result: 'checking',
            charsChecked: 0,
            explanation: `Cleaned string: "${cleanStr}" (${n} chars). Setting up two pointers at positions 0 and ${n - 1}.`,
        });

        if (n === 0) {
            steps.push({
                cleanStr,
                left: 0,
                right: -1,
                matched: [],
                mismatchLeft: -1,
                mismatchRight: -1,
                result: 'palindrome',
                charsChecked: 0,
                explanation: `Empty string after cleaning — an empty string is a palindrome by definition.`,
            });
            return steps;
        }

        let left = 0, right = n - 1;
        const matched = [];
        let charsChecked = 0;
        let isPalin = true;

        while (left < right) {
            charsChecked++;
            if (cleanStr[left] === cleanStr[right]) {
                steps.push({
                    cleanStr,
                    left,
                    right,
                    matched: [...matched],
                    mismatchLeft: -1,
                    mismatchRight: -1,
                    result: 'checking',
                    charsChecked,
                    explanation: `cleanStr[${left}] = '${cleanStr[left]}' matches cleanStr[${right}] = '${cleanStr[right]}'. Move both pointers inward.`,
                });
                matched.push(left, right);
                left++;
                right--;
            } else {
                isPalin = false;
                steps.push({
                    cleanStr,
                    left,
                    right,
                    matched: [...matched],
                    mismatchLeft: left,
                    mismatchRight: right,
                    result: 'notpalindrome',
                    charsChecked,
                    explanation: `cleanStr[${left}] = '${cleanStr[left]}' does NOT match cleanStr[${right}] = '${cleanStr[right]}'. Not a palindrome!`,
                });
                break;
            }
        }

        if (isPalin) {
            steps.push({
                cleanStr,
                left,
                right,
                matched: [...matched, ...Array.from({ length: Math.max(0, right - left + 1) }, (_, i) => left + i)],
                mismatchLeft: -1,
                mismatchRight: -1,
                result: 'palindrome',
                charsChecked,
                explanation: `All ${charsChecked} symmetric pairs matched. "${inputString}" IS a palindrome!`,
            });
        }

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
        cleanStr: inputString.toLowerCase().replace(/[^a-z0-9]/g, ''),
        left: 0,
        right: 0,
        matched: [],
        mismatchLeft: -1,
        mismatchRight: -1,
        result: 'checking',
        charsChecked: 0,
        explanation: 'Ready — press Play or step through.',
    };

    const getBoxColor = (i) => {
        if (cur.mismatchLeft === i || cur.mismatchRight === i) return 'bg-red-500 border-red-400 text-white scale-110';
        if (cur.result === 'palindrome' && cur.matched.includes(i)) return 'bg-green-500 border-green-400 text-white';
        if (i === cur.left && cur.result === 'checking') return 'bg-blue-500 border-blue-400 text-white scale-110';
        if (i === cur.right && cur.result === 'checking') return 'bg-orange-500 border-orange-400 text-white scale-110';
        if (cur.matched.includes(i)) return 'bg-green-500/30 border-green-500/50 text-green-300';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const getLabelBelow = (i) => {
        if (cur.mismatchLeft === i) return { text: 'L', cls: 'text-red-400' };
        if (cur.mismatchRight === i) return { text: 'R', cls: 'text-red-400' };
        if (i === cur.left && i === cur.right && cur.result === 'checking') return { text: 'L=R', cls: 'text-yellow-400' };
        if (i === cur.left && cur.result === 'checking') return { text: 'L', cls: 'text-blue-400' };
        if (i === cur.right && cur.result === 'checking') return { text: 'R', cls: 'text-orange-400' };
        return null;
    };

    const resultText = cur.result === 'palindrome' ? 'Palindrome' : cur.result === 'notpalindrome' ? 'Not a Palindrome' : 'Checking...';
    const resultColor = cur.result === 'palindrome' ? 'text-green-400' : cur.result === 'notpalindrome' ? 'text-red-400' : 'text-violet-400';

    const code = `def isPalindrome(s):
    s = ''.join(c.lower() for c in s if c.isalnum())
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True

print(isPalindrome("A man a plan a canal Panama"))  # True
print(isPalindrome("race a car"))                   # False`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Valid Palindrome</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Clean the string, then use two pointers converging from both ends. Compare characters
                            one pair at a time — any mismatch immediately rules out a palindrome.
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
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-violet-400">{cur.charsChecked}</div>
                                    <div className="text-xs text-slate-400">Characters Checked</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className={`text-base font-bold ${resultColor}`}>{resultText}</div>
                                    <div className="text-xs text-slate-400">Result</div>
                                </div>
                            </div>

                            {/* Cleaned string label */}
                            <div className="mb-2">
                                <span className="text-xs text-slate-400">Cleaned string: </span>
                                <span className="text-xs text-slate-300 font-mono">"{cur.cleanStr}"</span>
                            </div>

                            {/* Character boxes */}
                            <div className="bg-slate-800/60 rounded-lg p-4 mb-4 overflow-x-auto">
                                <div className="flex flex-wrap justify-center gap-2 min-w-max mx-auto">
                                    {cur.cleanStr.split('').map((ch, i) => {
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
                                    ['bg-green-500/30 border-green-500/50', 'Matched pair'],
                                    ['bg-red-500', 'Mismatch'],
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
                                {[['Best Case', 'O(n)', 'violet'], ['Worst Case', 'O(n)', 'violet'], ['Average', 'O(n)', 'violet'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
                                    <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                                        <div className={`text-base font-bold text-${color}-400`}>{val}</div>
                                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">Space is O(1) extra if we use two pointers on the original string without creating a cleaned copy. The O(n) cleaning pass is unavoidable but the pointer traversal itself is O(1) space.</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-lg font-bold text-slate-100 mb-3">How It Works</h2>
                            <ol className="space-y-2 text-sm text-slate-300">
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">1</span><span>Strip non-alphanumeric characters and convert to lowercase</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">2</span><span>Place left pointer at index 0, right pointer at the last index</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">3</span><span>Compare s[left] and s[right]. If equal, move both inward. If not, return False</span></li>
                                <li className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">4</span><span>When left &gt;= right all pairs have matched — return True</span></li>
                            </ol>
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
