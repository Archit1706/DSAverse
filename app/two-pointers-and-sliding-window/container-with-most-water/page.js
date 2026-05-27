'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Code, Shuffle, Info, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why do we always move the pointer with the shorter bar inward?",
        options: [
            "Moving the shorter bar inward gives a chance to find a taller bar that compensates for the reduced width, whereas keeping the shorter bar can never produce a larger area",
            "The shorter bar is always at the left side of the array",
            "Moving the taller bar would skip valid solutions",
            "Both pointers always move simultaneously",
        ],
        correct: 0,
        explanation: "Area = width × min(h[L], h[R]). If we move the taller bar, width decreases while height is still bounded by the same shorter bar — area can only decrease. Moving the shorter bar reduces width but opens the possibility of finding a taller boundary that more than compensates. This greedy choice provably never skips the optimal pair.",
    },
    {
        question: "What is the time complexity of the two-pointer approach?",
        options: ["O(n²) — we check every pair", "O(n log n) — similar to sorting", "O(n) — each pointer moves at most n times total", "O(1) — constant time"],
        correct: 2,
        explanation: "Left starts at 0 and only moves right; right starts at n−1 and only moves left. Together they make at most n−1 moves, so the algorithm runs in O(n) — far better than the O(n²) brute-force of checking every pair.",
    },
    {
        question: "Can the algorithm ever miss the optimal pair of bars?",
        options: [
            "Yes, if both optimal bars are in the middle of the array",
            "No — when a pointer moves past a bar, every pair involving that bar and a remaining bar has already been proven suboptimal",
            "Yes, for arrays with all equal heights",
            "Only when the optimal pair is adjacent",
        ],
        correct: 1,
        explanation: "The invariant is: no skipped pair can beat the current maximum. When we move a pointer past a bar, we know that pairing that bar with any remaining bar produces less width and no greater height than what we've already considered. The algorithm visits every candidate that could be optimal.",
    },
];

const DEFAULT_HEIGHTS = [1, 8, 6, 2, 5, 4, 8, 3, 7];

function randomHeights() {
    const n = 7 + Math.floor(Math.random() * 4);
    return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9));
}

export default function ContainerWithMostWaterPage() {
    const [heights, setHeights] = useState(DEFAULT_HEIGHTS);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const [showCode, setShowCode] = useState(false);

    const generateSteps = useCallback(() => {
        const steps = [];
        const h = heights;
        const n = h.length;
        let left = 0, right = n - 1;
        let maxArea = 0, maxLeft = -1, maxRight = -1;

        steps.push({
            left, right, maxArea, maxLeft, maxRight, currentArea: 0,
            explanation: `Container With Most Water: ${n} bars. Left pointer at index 0 (height ${h[0]}), right pointer at index ${n - 1} (height ${h[n - 1]}).`,
            phase: 'init',
        });

        while (left < right) {
            const w = right - left;
            const minH = Math.min(h[left], h[right]);
            const area = w * minH;
            const newMax = area > maxArea;
            if (newMax) { maxArea = area; maxLeft = left; maxRight = right; }

            steps.push({
                left, right, maxArea, maxLeft, maxRight, currentArea: area,
                explanation: `Width = ${right}−${left} = ${w}. Min height = min(${h[left]}, ${h[right]}) = ${minH}. Area = ${w}×${minH} = ${area}.${newMax ? ' New maximum!' : ` Max remains ${maxArea}.`}`,
                phase: 'compare',
            });

            if (h[left] <= h[right]) {
                steps.push({
                    left, right, maxArea, maxLeft, maxRight, currentArea: area,
                    explanation: `h[${left}]=${h[left]} ≤ h[${right}]=${h[right]}. Left bar is the bottleneck. Move left pointer right to seek a taller bar.`,
                    phase: 'move',
                });
                left++;
            } else {
                steps.push({
                    left, right, maxArea, maxLeft, maxRight, currentArea: area,
                    explanation: `h[${left}]=${h[left]} > h[${right}]=${h[right]}. Right bar is the bottleneck. Move right pointer left to seek a taller bar.`,
                    phase: 'move',
                });
                right--;
            }
        }

        steps.push({
            left, right, maxArea, maxLeft, maxRight, currentArea: 0,
            explanation: `Pointers met at index ${left}. Maximum container area = ${maxArea} (bars at indices ${maxLeft} and ${maxRight}, heights ${h[maxLeft]} and ${h[maxRight]}).`,
            phase: 'done',
        });

        return steps;
    }, [heights]);

    useEffect(() => { setStepHistory(generateSteps()); setCurrentStep(0); }, [generateSteps]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

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
        left: 0, right: heights.length - 1, maxArea: 0, maxLeft: -1, maxRight: -1,
        currentArea: 0, explanation: 'Ready — press Play or step through.', phase: 'init',
    };

    // SVG layout
    const VW = 500, VH = 200, PL = 10, PR = 10, PT = 18, PB = 36;
    const n = heights.length;
    const barW = (VW - PL - PR) / n;
    const maxH = Math.max(...heights, 1);
    const yScale = (VH - PT - PB) / maxH;

    const barFill = (i) => {
        if (cur.phase === 'done' && (i === cur.maxLeft || i === cur.maxRight)) return '#22c55e';
        if (i === cur.left && i === cur.right) return '#facc15';
        if (i === cur.left) return '#3b82f6';
        if (i === cur.right) return '#f97316';
        if (i < cur.left) return '#1e293b';
        return '#475569';
    };

    const waterMinH = (cur.left < cur.right && cur.left >= 0 && cur.right < n)
        ? Math.min(heights[cur.left], heights[cur.right]) * yScale
        : 0;
    const waterY = VH - PB - waterMinH;
    const waterX = PL + cur.left * barW;
    const waterW = (cur.right - cur.left + 1) * barW;

    const code = `def maxArea(height):
    left, right = 0, len(height) - 1
    max_area = 0
    while left < right:
        w = right - left
        h = min(height[left], height[right])
        max_area = max(max_area, w * h)
        if height[left] <= height[right]:
            left += 1   # move the shorter (bottleneck) bar
        else:
            right -= 1
    return max_area

print(maxArea([1,8,6,2,5,4,8,3,7]))  # 49`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/two-pointers-and-sliding-window" className="inline-flex items-center text-violet-200 hover:text-white mb-5 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Two Pointers and Sliding Window
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Container With Most Water</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Two pointers start at opposite ends and converge inward, always moving the shorter bar.
                            The water area and current maximum update live at every step.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left column — visualization */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-5">Visualization</h2>

                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <button onClick={() => { setHeights(randomHeights()); setIsPlaying(false); setCurrentStep(0); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
                                    <Shuffle className="h-4 w-4" /> Random
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm transition-colors">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>

                            {/* Playback */}
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0 || isPlaying}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition-colors">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(v => !v); }}
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

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-violet-400">{cur.currentArea}</div>
                                    <div className="text-xs text-slate-400">Current area</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-green-400">{cur.maxArea}</div>
                                    <div className="text-xs text-slate-400">Max area</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                    <div className="text-base font-bold text-slate-300">{cur.right - cur.left}</div>
                                    <div className="text-xs text-slate-400">Width</div>
                                </div>
                            </div>

                            {/* SVG bar chart */}
                            <div className="bg-slate-800/60 rounded-lg p-3 mb-4 overflow-hidden">
                                <svg viewBox={`0 0 ${VW} ${VH}`} width="100%">
                                    {/* Water fill between pointers */}
                                    {cur.left < cur.right && waterMinH > 0 && (
                                        <rect x={waterX} y={waterY} width={waterW} height={waterMinH}
                                            fill="#3b82f6" opacity="0.18" className="transition-all duration-300" />
                                    )}

                                    {/* Best-so-far tint (faint green) */}
                                    {cur.maxLeft !== -1 && cur.phase !== 'done' && (
                                        <rect
                                            x={PL + cur.maxLeft * barW}
                                            y={VH - PB - Math.min(heights[cur.maxLeft], heights[cur.maxRight]) * yScale}
                                            width={(cur.maxRight - cur.maxLeft + 1) * barW}
                                            height={Math.min(heights[cur.maxLeft], heights[cur.maxRight]) * yScale}
                                            fill="#22c55e" opacity="0.07"
                                        />
                                    )}

                                    {/* Bars */}
                                    {heights.map((h, i) => {
                                        const bx = PL + i * barW;
                                        const bh = h * yScale;
                                        const by = VH - PB - bh;
                                        return (
                                            <g key={i}>
                                                <rect x={bx + 2} y={by} width={barW - 4} height={bh}
                                                    fill={barFill(i)} rx={3}
                                                    className="transition-all duration-300" />
                                                <text x={bx + barW / 2} y={by - 3}
                                                    textAnchor="middle" fill="#94a3b8" fontSize="10">{h}</text>
                                                <text x={bx + barW / 2} y={VH - PB + 13}
                                                    textAnchor="middle" fill="#64748b" fontSize="10">{i}</text>
                                                {i === cur.left && (
                                                    <text x={bx + barW / 2} y={VH - PB + 26}
                                                        textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">L</text>
                                                )}
                                                {i === cur.right && i !== cur.left && (
                                                    <text x={bx + barW / 2} y={VH - PB + 26}
                                                        textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="bold">R</text>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/* Area label inside water */}
                                    {cur.left < cur.right && waterMinH > 18 && cur.currentArea > 0 && (
                                        <text x={waterX + waterW / 2} y={waterY + waterMinH / 2 + 4}
                                            textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="bold">
                                            {cur.currentArea}
                                        </text>
                                    )}
                                </svg>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                                {[
                                    ['#3b82f6', 'Left pointer (L)'],
                                    ['#f97316', 'Right pointer (R)'],
                                    ['#22c55e', 'Max container'],
                                    ['#3b82f640', 'Water fill'],
                                ].map(([color, label]) => (
                                    <span key={label} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded inline-block border border-slate-600"
                                            style={{ backgroundColor: color }} />
                                        {label}
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
                                {[['Best Case', 'O(1)', 'green'], ['Worst Case', 'O(n)', 'violet'], ['Average', 'O(n)', 'violet'], ['Space', 'O(1)', 'green']].map(([label, val, color]) => (
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
                                    'Place left at 0, right at n−1',
                                    'Compute area = (right − left) × min(h[left], h[right])',
                                    'Update maxArea if current area is larger',
                                    'Move the pointer at the shorter bar inward (it is the bottleneck)',
                                    'Repeat until left meets right',
                                ].map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
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
