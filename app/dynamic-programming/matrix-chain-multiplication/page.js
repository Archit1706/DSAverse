"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Layers, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "Why does MCM fill the DP table diagonally?",
        options: ["It's faster than row-by-row", "Subproblems of length l depend only on subproblems of length < l", "To avoid cache misses", "Diagonal cells are independent of each other"],
        correct: 1,
        explanation: "m[i][j] for a chain of length l = j-i+1 depends on m[i][k] and m[k+1][j], which are shorter chains. So we must fill shorter chains before longer ones — diagonally."
    },
    {
        question: "For matrix Ai (p[i-1] × p[i]) times Aj (p[j-1] × p[j]) split at k, what is the multiplication cost?",
        options: ["p[i-1] × p[j]", "p[i-1] × p[k] × p[j]", "p[i] × p[k] × p[j]", "p[i-1] × p[k-1] × p[j]"],
        correct: 1,
        explanation: "Multiplying (Ai..Ak) which is p[i-1]×p[k] by (Ak+1..Aj) which is p[k]×p[j] costs p[i-1]×p[k]×p[j] scalar multiplications."
    },
    {
        question: "What is the time complexity of the MCM DP algorithm?",
        options: ["O(n)", "O(n²)", "O(n³)", "O(2ⁿ)"],
        correct: 2,
        explanation: "Three nested loops: chain lengths (n), starting points (n), and split points (n) — giving O(n³). Much better than the Catalan-number-exponential naive approach."
    }
];

const INF = Infinity;

const buildParens = (s, i, j) => {
    if (i === j) return `M${i}`;
    return `(${buildParens(s, i, s[i][j])}×${buildParens(s, s[i][j] + 1, j)})`;
};

const generateSteps = (dims) => {
    const steps = [];
    const n = dims.length - 1;
    const dp = Array(n + 1).fill(null).map(() => Array(n + 1).fill(INF));
    const s = Array(n + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= n; i++) dp[i][i] = 0;

    steps.push({
        dp: dp.map(r => [...r]), s: s.map(r => [...r]),
        currentI: -1, currentJ: -1, currentK: -1,
        phase: 'initialize', chainLen: 1,
        explanation: `${n} matrices: ${dims.map((d, idx) => idx < n ? `M${idx + 1}(${dims[idx]}×${dims[idx + 1]})` : '').filter(Boolean).join(', ')}. Diagonal dp[i][i]=0 — a single matrix costs 0 to "multiply".`,
        parenthesization: ''
    });

    for (let l = 2; l <= n; l++) {
        steps.push({
            dp: dp.map(r => [...r]), s: s.map(r => [...r]),
            currentI: -1, currentJ: -1, currentK: -1,
            phase: 'chain_length', chainLen: l,
            explanation: `Chain length ${l}: computing minimum cost to multiply any ${l} consecutive matrices.`,
            parenthesization: ''
        });

        for (let i = 1; i <= n - l + 1; i++) {
            const j = i + l - 1;

            steps.push({
                dp: dp.map(r => [...r]), s: s.map(r => [...r]),
                currentI: i, currentJ: j, currentK: -1,
                phase: 'subproblem', chainLen: l,
                explanation: `Subproblem: M${i}…M${j} (${l} matrices, dims ${dims[i - 1]}×${dims[j]}). Trying all ${l - 1} split points…`,
                parenthesization: ''
            });

            for (let k = i; k < j; k++) {
                const left = dp[i][k] === INF ? INF : dp[i][k];
                const right = dp[k + 1][j] === INF ? INF : dp[k + 1][j];
                const mul = dims[i - 1] * dims[k] * dims[j];
                const cost = left === INF || right === INF ? INF : left + right + mul;
                const isBetter = cost < dp[i][j];

                if (isBetter) { dp[i][j] = cost; s[i][j] = k; }

                const fmtL = left === INF ? '∞' : left.toLocaleString();
                const fmtR = right === INF ? '∞' : right.toLocaleString();
                const fmtC = cost === INF ? '∞' : cost.toLocaleString();

                steps.push({
                    dp: dp.map(r => [...r]), s: s.map(r => [...r]),
                    currentI: i, currentJ: j, currentK: k,
                    phase: isBetter ? 'update' : 'compare', chainLen: l,
                    explanation: `Split k=${k}: (M${i}…M${k}) × (M${k + 1}…M${j}). Cost = ${fmtL} + ${fmtR} + ${dims[i - 1]}×${dims[k]}×${dims[j]} = ${fmtC}.${isBetter ? ` New best for M${i}…M${j}!` : ' Not better.'}`,
                    parenthesization: ''
                });
            }

            steps.push({
                dp: dp.map(r => [...r]), s: s.map(r => [...r]),
                currentI: i, currentJ: j, currentK: s[i][j],
                phase: 'confirmed', chainLen: l,
                explanation: `Optimal for M${i}…M${j}: split at k=${s[i][j]}, min cost = ${dp[i][j].toLocaleString()}.`,
                parenthesization: ''
            });
        }
    }

    const parens = n > 1 ? buildParens(s, 1, n) : 'M1';
    steps.push({
        dp: dp.map(r => [...r]), s: s.map(r => [...r]),
        currentI: 1, currentJ: n, currentK: -1,
        phase: 'complete', chainLen: n,
        explanation: `Done! Minimum scalar multiplications = ${dp[1][n].toLocaleString()}. Optimal order: ${parens}.`,
        parenthesization: parens
    });

    return steps;
};

const PRESETS = {
    clrs: { dims: [30, 35, 15, 5, 10], label: 'CLRS example' },
    classic: { dims: [10, 100, 5, 50], label: '3 matrices' },
    simple: { dims: [5, 10, 3, 12, 5, 50], label: '5 matrices' },
    equal: { dims: [10, 10, 10, 10], label: 'Square matrices' },
};

const codeExample = `def matrix_chain(p):
    n = len(p) - 1  # number of matrices
    m = [[0] * (n + 1) for _ in range(n + 1)]
    s = [[0] * (n + 1) for _ in range(n + 1)]

    # l = chain length
    for l in range(2, n + 1):
        for i in range(1, n - l + 2):
            j = i + l - 1
            m[i][j] = float('inf')
            for k in range(i, j):
                cost = m[i][k] + m[k+1][j] + p[i-1]*p[k]*p[j]
                if cost < m[i][j]:
                    m[i][j] = cost
                    s[i][j] = k

    return m[1][n], s

def optimal_parens(s, i, j):
    if i == j: return f"M{i}"
    return f"({optimal_parens(s,i,s[i][j])}×{optimal_parens(s,s[i][j]+1,j)})"`;

export default function MCMPage() {
    const [dims, setDims] = useState([30, 35, 15, 5, 10]);
    const [inputText, setInputText] = useState('30, 35, 15, 5, 10');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((d) => {
        setStepHistory(generateSteps(d));
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { rebuild(dims); }, []);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const applyInput = () => {
        const parsed = inputText.split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n > 0).slice(0, 7);
        if (parsed.length >= 3) { setDims(parsed); rebuild(parsed); }
    };

    const shuffle = () => {
        const count = Math.floor(Math.random() * 3) + 3;
        const newDims = Array.from({ length: count + 1 }, () => Math.floor(Math.random() * 50) + 5);
        setDims(newDims);
        setInputText(newDims.join(', '));
        rebuild(newDims);
    };

    const applyPreset = (key) => {
        const { dims: d } = PRESETS[key];
        setDims(d);
        setInputText(d.join(', '));
        rebuild(d);
    };

    const cur = stepHistory[currentStep] || {
        dp: [], s: [], currentI: -1, currentJ: -1, currentK: -1,
        phase: 'start', chainLen: 0, explanation: 'Click Play to begin.', parenthesization: ''
    };

    const n = dims.length - 1;

    const getCellStyle = (i, j) => {
        if (j < i) return 'bg-slate-900/50 text-slate-700 border-slate-800';
        if (i === j) return 'bg-slate-700/70 text-slate-400 border-slate-600';

        const isCurCell = i === cur.currentI && j === cur.currentJ;
        const isLeftPart = cur.currentK >= 0 && i === cur.currentI && j === cur.currentK;
        const isRightPart = cur.currentK >= 0 && i === cur.currentK + 1 && j === cur.currentJ;
        const val = cur.dp[i]?.[j];
        const isFilled = val !== undefined && val !== INF;

        if (isCurCell) {
            if (cur.phase === 'confirmed' || cur.phase === 'complete') return 'bg-green-600 text-white border-green-500 scale-110';
            if (cur.phase === 'update') return 'bg-amber-500 text-white border-amber-400 scale-110';
            return 'bg-rose-500 text-white border-rose-400 scale-110';
        }
        if (isLeftPart) return 'bg-blue-600 text-white border-blue-500';
        if (isRightPart) return 'bg-orange-500 text-white border-orange-400';
        if (cur.phase === 'complete' && i === 1 && j === n) return 'bg-green-700 text-green-100 border-green-600';
        if (isFilled) return 'bg-rose-900/60 text-rose-200 border-rose-800';
        return 'bg-slate-800 text-slate-600 border-slate-700';
    };

    const fmtVal = (i, j) => {
        if (j < i) return '';
        if (i === j) return '0';
        const val = cur.dp[i]?.[j];
        if (val === undefined || val === INF) return '∞';
        if (val >= 1000000) return `${(val / 1000).toFixed(0)}k`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
        return String(val);
    };

    const matrixColors = ['bg-blue-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500'];

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1)
            setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Layers className="h-10 w-10" />Matrix Chain Multiplication
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Find the optimal parenthesization to minimize scalar multiplications.
                            Watch the DP table fill diagonally as subproblems of increasing chain length are solved.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n³)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Interval DP</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Optimal Parenthesization</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(p => Math.max(0, p - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
                                    <SkipBack size={18} />Back
                                </button>
                                <button onClick={() => setCurrentStep(p => Math.min(stepHistory.length - 1, p + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                                    <SkipForward size={18} />Forward
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random
                                </button>
                            </div>

                            {/* Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1 text-slate-300">
                                    Dimension array <span className="text-slate-500">(n+1 values for n matrices — e.g. "30 35 15 5" = M1:30×35, M2:35×15, M3:15×5)</span>
                                </label>
                                <div className="flex gap-2">
                                    <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && applyInput()}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono" />
                                    <button onClick={applyInput} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Apply</button>
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {Object.entries(PRESETS).map(([key, { label }]) => (
                                    <button key={key} onClick={() => applyPreset(key)}
                                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 hover:text-white transition-colors">
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Speed */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast</span><span>Slow</span></div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} / {stepHistory.length}</span>
                                    {cur.chainLen > 1 && <span className="text-sm text-slate-500">Chain length: {cur.chainLen}</span>}
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Matrix chain display */}
                            <div className="mb-6 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Matrix chain</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {Array.from({ length: n }, (_, idx) => {
                                        const matIdx = idx + 1;
                                        const isLeft = cur.currentK >= 0 && matIdx >= cur.currentI && matIdx <= cur.currentK;
                                        const isRight = cur.currentK >= 0 && matIdx >= cur.currentK + 1 && matIdx <= cur.currentJ;
                                        const isCurrent = cur.currentI >= 0 && matIdx >= cur.currentI && matIdx <= cur.currentJ;
                                        const color = matrixColors[idx % matrixColors.length];
                                        let border = 'border-transparent';
                                        if (isLeft) border = 'border-blue-400 ring-2 ring-blue-400/50';
                                        else if (isRight) border = 'border-orange-400 ring-2 ring-orange-400/50';
                                        else if (isCurrent) border = 'border-rose-400';
                                        return (
                                            <React.Fragment key={idx}>
                                                <div className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all duration-300 ${color} bg-opacity-20 ${border}`}>
                                                    <span className="font-bold text-white text-sm">M{matIdx}</span>
                                                    <span className="text-xs text-white/80">{dims[idx]}×{dims[idx + 1]}</span>
                                                </div>
                                                {idx < n - 1 && <span className="text-slate-500 text-sm">×</span>}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                                {cur.currentK >= 0 && (
                                    <div className="flex gap-4 mt-3 text-xs">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-600" /><span className="text-slate-400">Left group (M{cur.currentI}…M{cur.currentK})</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-500" /><span className="text-slate-400">Right group (M{cur.currentK + 1}…M{cur.currentJ})</span></div>
                                    </div>
                                )}
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">DP Table — m[i][j] = min cost for M<sub>i</sub>…M<sub>j</sub></h3>
                                <div className="overflow-auto p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {cur.dp.length > 0 && (
                                        <table className="border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="w-10 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-500">i\j</th>
                                                    {Array.from({ length: n }, (_, j) => (
                                                        <th key={j} className="w-16 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-300 font-bold">M{j + 1}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.from({ length: n }, (_, ri) => {
                                                    const i = ri + 1;
                                                    return (
                                                        <tr key={i}>
                                                            <th className="w-10 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-300 font-bold">M{i}</th>
                                                            {Array.from({ length: n }, (_, ci) => {
                                                                const j = ci + 1;
                                                                return (
                                                                    <td key={j} className={`w-16 h-8 text-center border border-slate-700 text-xs font-bold transition-all duration-300 ${getCellStyle(i, j)}`}>
                                                                        {fmtVal(i, j)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                                    {[
                                        ['bg-rose-500', 'Active cell'],
                                        ['bg-amber-500', 'New best'],
                                        ['bg-blue-600', 'Left subgroup'],
                                        ['bg-orange-500', 'Right subgroup'],
                                        ['bg-green-600', 'Optimal'],
                                    ].map(([color, label]) => (
                                        <div key={label} className="flex items-center gap-1.5">
                                            <div className={`w-4 h-4 rounded ${color}`} /><span>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Result parenthesization */}
                            {cur.parenthesization && (
                                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <h3 className="text-sm font-semibold text-green-400 mb-1">Optimal Parenthesization</h3>
                                    <p className="text-green-200 font-mono text-sm">{cur.parenthesization}</p>
                                </div>
                            )}

                            {/* Explanation */}
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-rose-200 text-sm leading-relaxed">{cur.explanation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n³)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded text-xs">Interval DP</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Fill order:</span><span className="bg-purple-500/15 text-purple-400 px-2 py-1 rounded text-xs">By chain length</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-slate-200">Recurrence:</strong> m[i][j] = min over k: m[i][k] + m[k+1][j] + p[i-1]·p[k]·p[j]</span>
                                </li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-slate-200">Base case:</strong> m[i][i] = 0</span>
                                </li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-slate-200">Fill order:</strong> chain length l = 2, 3, …, n</span>
                                </li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-slate-200">Answer:</strong> m[1][n] with parenthesization from s[i][j]</span>
                                </li>
                            </ul>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-rose-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
