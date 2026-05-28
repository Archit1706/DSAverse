"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// ─── Strassen formulas ────────────────────────────────────────────────────────
// For 2×2 matrices A and B split into quarters: A = [[a,b],[c,d]], B = [[e,f],[g,h]]

const M_FORMULAS = [
    { id: 1, expr: 'M₁ = (a+d)·(e+h)', desc: 'Top-left+bottom-right of A  ×  top-left+bottom-right of B' },
    { id: 2, expr: 'M₂ = (c+d)·e',     desc: 'Left column sum of A  ×  top-left of B' },
    { id: 3, expr: 'M₃ = a·(f−h)',      desc: 'Top-left of A  ×  top-right difference of B' },
    { id: 4, expr: 'M₄ = d·(g−e)',      desc: 'Bottom-right of A  ×  left column difference of B' },
    { id: 5, expr: 'M₅ = (a+b)·h',     desc: 'Top row sum of A  ×  bottom-right of B' },
    { id: 6, expr: 'M₆ = (c−a)·(e+f)', desc: 'Left column difference of A  ×  top row sum of B' },
    { id: 7, expr: 'M₇ = (b−d)·(g+h)', desc: 'Right column difference of A  ×  bottom row sum of B' },
];

const C_FORMULAS = [
    { id: 'c11', expr: 'C₁₁ = M₁+M₄−M₅+M₇', uses: [1, 4, 5, 7] },
    { id: 'c12', expr: 'C₁₂ = M₃+M₅',        uses: [3, 5] },
    { id: 'c21', expr: 'C₂₁ = M₂+M₄',        uses: [2, 4] },
    { id: 'c22', expr: 'C₂₂ = M₁−M₂+M₃+M₆',  uses: [1, 2, 3, 6] },
];

function computeStrassen(A, B) {
    const [a, b, c, d] = [A[0][0], A[0][1], A[1][0], A[1][1]];
    const [e, f, g, h] = [B[0][0], B[0][1], B[1][0], B[1][1]];
    const M = [
        null,
        (a + d) * (e + h),
        (c + d) * e,
        a * (f - h),
        d * (g - e),
        (a + b) * h,
        (c - a) * (e + f),
        (b - d) * (g + h),
    ];
    const C = [
        [M[1] + M[4] - M[5] + M[7], M[3] + M[5]],
        [M[2] + M[4],               M[1] - M[2] + M[3] + M[6]],
    ];
    return { M, C };
}

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(A, B) {
    const steps = [];
    const { M, C } = computeStrassen(A, B);
    const naive = [
        [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
        [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
    ];

    // Intro
    steps.push({
        phase: 'intro', activeM: [], activeC: [], M: Array(8).fill(null), C: [[null, null], [null, null]],
        explanation: "Strassen's algorithm multiplies two 2×2 matrices using only 7 scalar multiplications instead of the naive 8. We'll compute M₁–M₇, then combine them.",
    });

    // Steps for M1..M7
    for (let i = 1; i <= 7; i++) {
        const partialM = Array(8).fill(null);
        for (let j = 1; j <= i; j++) partialM[j] = M[j];
        steps.push({
            phase: 'compute_m',
            activeM: [i],
            activeC: [],
            M: [...partialM],
            C: [[null, null], [null, null]],
            currentMIdx: i,
            explanation: `Computing ${M_FORMULAS[i - 1].expr} = ${M[i]}. ${M_FORMULAS[i - 1].desc}.`,
        });
    }

    // Steps for C11..C22
    const cKeys = ['c11', 'c12', 'c21', 'c22'];
    const cIdx = { c11: [0, 0], c12: [0, 1], c21: [1, 0], c22: [1, 1] };
    const partialC = [[null, null], [null, null]];

    for (let ci = 0; ci < C_FORMULAS.length; ci++) {
        const cf = C_FORMULAS[ci];
        const [r, col] = cIdx[cf.id];
        partialC[r][col] = C[r][col];
        steps.push({
            phase: 'compute_c',
            activeM: cf.uses,
            activeC: [cf.id],
            M: [...M],
            C: partialC.map(row => [...row]),
            currentCId: cf.id,
            explanation: `${cf.expr} = ${C[r][col]}. Combining ${cf.uses.map(u => `M${u}`).join(', ')} to fill result cell C${cf.id.slice(1)}.`,
        });
    }

    // Done
    steps.push({
        phase: 'done',
        activeM: [],
        activeC: cKeys,
        M: [...M],
        C: C.map(row => [...row]),
        explanation: `Complete! C = [[${C[0].join(', ')}], [${C[1].join(', ')}]]. Strassen saved 1 multiplication vs. naïve (7 vs 8), and this compounds to O(n^2.807) recursively.`,
        naiveC: naive,
    });

    return { steps, M, C, naive };
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const quizQuestions = [
    {
        question: "How many scalar multiplications does Strassen's algorithm use to multiply two 2×2 matrices?",
        options: ['4', '6', '7', '8'],
        correct: 2,
        explanation: "Strassen uses exactly 7 multiplications (M₁–M₇) instead of the naive 8, at the cost of more additions/subtractions.",
    },
    {
        question: "What is the time complexity of Strassen's algorithm for n×n matrices?",
        options: ['O(n²)', 'O(n^2.807)', 'O(n³)', 'O(n log n)'],
        correct: 1,
        explanation: "By the Master Theorem with a=7, b=2: T(n) = 7T(n/2) + O(n²) → O(n^log₂7) ≈ O(n^2.807).",
    },
    {
        question: "Why isn't Strassen's algorithm always preferred over naive O(n³) multiplication in practice?",
        options: [
            'It only works on square matrices',
            'Numerical instability and high constant factors make naive faster for small n',
            "It requires O(n³) extra space",
            'It cannot be parallelized',
        ],
        correct: 1,
        explanation: "Strassen has larger constant factors and accumulates floating-point errors. For small matrices (n < ~100) the naive algorithm is faster; Strassen is preferred for very large n.",
    },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-sky-400 mb-1">{qs.score}/{quizQuestions.length}</p>
            <p className="text-slate-400 text-sm mb-4">{qs.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-colors">Retake Quiz</button>
        </div>
    );
    const q = quizQuestions[qs.current];
    return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Active Recall</span>
                <span className="text-xs text-slate-500">{qs.current + 1}/{quizQuestions.length}</span>
            </div>
            <p className="text-slate-200 text-sm font-medium leading-snug">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ';
                    if (!qs.answered) cls += 'border-slate-600 text-slate-300 hover:border-sky-500 hover:text-sky-300 cursor-pointer';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === qs.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500';
                    return <button key={i} className={cls} onClick={() => {
                        if (qs.answered) return;
                        setQs(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
                    }}>{opt}</button>;
                })}
            </div>
            {qs.answered && <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg p-3 leading-relaxed">{q.explanation}</div>}
            {qs.answered && (
                <button onClick={() => {
                    if (qs.current + 1 >= quizQuestions.length) setQs(s => ({ ...s, complete: true }));
                    else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="w-full text-xs bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-lg transition-colors">
                    {qs.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ─── Matrix cell component ─────────────────────────────────────────────────────

function MatrixCell({ value, highlight, dim }) {
    let cls = 'w-12 h-12 flex items-center justify-center rounded-lg border text-sm font-bold transition-all duration-300 ';
    if (dim) cls += 'bg-slate-800 border-slate-700 text-slate-600';
    else if (highlight === 'active') cls += 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
    else if (highlight === 'done') cls += 'bg-green-500 border-green-400 text-white';
    else if (highlight === 'uses') cls += 'bg-sky-700 border-sky-600 text-sky-100';
    else cls += 'bg-slate-700 border-slate-600 text-slate-100';
    return <div className={cls}>{value !== null && value !== undefined ? value : '?'}</div>;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
    { A: [[1, 2], [3, 4]], B: [[5, 6], [7, 8]] },
    { A: [[2, 0], [1, 3]], B: [[1, 4], [2, 1]] },
    { A: [[3, 1], [2, 4]], B: [[2, 3], [1, 2]] },
    { A: [[1, 1], [1, 0]], B: [[1, 1], [1, 0]] }, // Fibonacci matrix
];

function randomMatrix() {
    const m = () => Math.floor(Math.random() * 7) - 2;
    return [[m(), m()], [m(), m()]];
}

export default function StrassensPage() {
    const [matrices, setMatrices] = useState(PRESETS[0]);
    const [stepData, setStepData] = useState({ steps: [], M: [], C: [[null, null], [null, null]] });
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((m) => {
        const data = generateSteps(m.A, m.B);
        setStepData(data);
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { rebuild(matrices); }, [matrices, rebuild]);

    useEffect(() => {
        if (!isPlaying || stepData.steps.length === 0) return;
        if (currentStep >= stepData.steps.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepData, speed]);

    const step = stepData.steps[currentStep] || {};

    // Helper to check if a given M index is active / computed
    const isMActive = (i) => step.activeM && step.activeM.includes(i);
    const isMDone = (i) => step.M && step.M[i] !== null && !isMActive(i);
    const isCActive = (id) => step.activeC && step.activeC.includes(id);
    const isCDone = (id, r, c) => step.C && step.C[r][c] !== null && !isCActive(id);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 py-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <p className="text-sky-200 text-sm font-semibold uppercase tracking-widest mb-1">Divide &amp; Conquer</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Strassen's Matrix Multiplication</h1>
                    <p className="text-sky-100 text-base max-w-2xl">
                        7 sub-matrix products (M₁–M₇) replace the naive 8. Watch each computed, then see them combine into the 4 output cells.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Controls */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentStep(0)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                        <button onClick={() => setIsPlaying(p => !p)} className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors">
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setCurrentStep(s => Math.min(stepData.steps.length - 1, s + 1))} disabled={currentStep >= stepData.steps.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                        <button onClick={() => setMatrices({ A: randomMatrix(), B: randomMatrix() })} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><Shuffle className="h-4 w-4" /></button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-sky-500" />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setMatrices(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${JSON.stringify(matrices) === JSON.stringify(p) ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                Preset {i + 1}
                            </button>
                        ))}
                    </div>

                    <span className="text-xs text-slate-500">Step {currentStep + 1}/{stepData.steps.length}</span>
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: matrices + M values */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Input matrices */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Input Matrices</h2>
                            <div className="flex flex-wrap items-center gap-8">
                                {/* A */}
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 mb-2 font-semibold">Matrix A</p>
                                    <div className="flex gap-1">
                                        {matrices.A.map((row, r) => (
                                            <div key={r} className="flex flex-col gap-1">
                                                {row.map((v, c) => {
                                                    // Highlight A sub-cells used in active M
                                                    const hi = false; // simplified – we could highlight sub-cells
                                                    return <MatrixCell key={c} value={v} />;
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">a b / c d</div>
                                </div>

                                <span className="text-2xl text-slate-500 font-bold">×</span>

                                {/* B */}
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 mb-2 font-semibold">Matrix B</p>
                                    <div className="flex gap-1">
                                        {matrices.B.map((row, r) => (
                                            <div key={r} className="flex flex-col gap-1">
                                                {row.map((v, c) => (
                                                    <MatrixCell key={c} value={v} />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">e f / g h</div>
                                </div>

                                <span className="text-2xl text-slate-500 font-bold">=</span>

                                {/* C result */}
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 mb-2 font-semibold">Result C</p>
                                    <div className="flex gap-1">
                                        {step.C && step.C.map((row, r) => (
                                            <div key={r} className="flex flex-col gap-1">
                                                {row.map((v, c) => {
                                                    const cId = ['c11', 'c12', 'c21', 'c22'][[r * 2 + c]];
                                                    const hi = isCActive(cId) ? 'active' : isCDone(cId, r, c) ? 'done' : null;
                                                    return <MatrixCell key={c} value={v} highlight={hi} dim={v === null} />;
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* M values grid */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">7 Sub-Products (M₁–M₇)</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {M_FORMULAS.map((mf, idx) => {
                                    const mi = idx + 1;
                                    const val = step.M && step.M[mi];
                                    const active = isMActive(mi);
                                    const done = isMDone(mi);
                                    const used = step.activeM && step.activeM.includes(mi) && step.phase === 'compute_c';
                                    let cls = 'rounded-xl p-3 border transition-all duration-300 ';
                                    if (active) cls += 'border-yellow-400 bg-yellow-400/10';
                                    else if (used) cls += 'border-sky-500 bg-sky-500/10';
                                    else if (done) cls += 'border-green-600 bg-green-500/5';
                                    else cls += 'border-slate-700 bg-slate-800/40';
                                    return (
                                        <div key={mi} className={cls}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-bold ${active ? 'text-yellow-300' : used ? 'text-sky-300' : done ? 'text-green-400' : 'text-slate-500'}`}>
                                                    {mf.expr.split('=')[0].trim()}
                                                </span>
                                                <span className={`text-sm font-mono font-bold ${active ? 'text-yellow-200' : used ? 'text-sky-200' : done ? 'text-slate-200' : 'text-slate-600'}`}>
                                                    {val !== null && val !== undefined ? `= ${val}` : '= ?'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-snug">{mf.expr.split('=')[1]?.trim()}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* C formulas */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Result Assembly (C₁₁–C₂₂)</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {C_FORMULAS.map((cf) => {
                                    const cIdx2 = { c11: [0, 0], c12: [0, 1], c21: [1, 0], c22: [1, 1] };
                                    const [r, c] = cIdx2[cf.id];
                                    const val = step.C && step.C[r][c];
                                    const active = isCActive(cf.id);
                                    const done = val !== null && !active;
                                    let cls = 'rounded-xl p-3 border transition-all duration-300 ';
                                    if (active) cls += 'border-green-400 bg-green-400/10';
                                    else if (done) cls += 'border-green-700 bg-green-500/5';
                                    else cls += 'border-slate-700 bg-slate-800/40';
                                    return (
                                        <div key={cf.id} className={cls}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-bold ${active ? 'text-green-300' : done ? 'text-green-500' : 'text-slate-500'}`}>
                                                    {cf.expr.split('=')[0].trim()}
                                                </span>
                                                <span className={`text-sm font-mono font-bold ${active || done ? 'text-slate-200' : 'text-slate-600'}`}>
                                                    {val !== null && val !== undefined ? `= ${val}` : '= ?'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">{cf.expr.split('=')[1]?.trim()}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sky-300 text-sm leading-relaxed">{step.explanation || '…'}</p>
                            </div>
                        </div>

                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Progress</p>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Phase</span>
                                    <span className={`font-semibold ${step.phase === 'compute_m' ? 'text-yellow-300' : step.phase === 'compute_c' ? 'text-green-300' : step.phase === 'done' ? 'text-sky-300' : 'text-slate-400'}`}>
                                        {step.phase === 'intro' ? 'Setup' : step.phase === 'compute_m' ? `Computing M${step.currentMIdx}` : step.phase === 'compute_c' ? `Assembling ${step.currentCId?.toUpperCase()}` : 'Complete'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">M computed</span>
                                    <span className="text-slate-300">{step.M ? step.M.filter(v => v !== null).length : 0}/7</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">C cells filled</span>
                                    <span className="text-slate-300">{step.C ? step.C.flat().filter(v => v !== null).length : 0}/4</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Multiplications</span>
                                    <span className="text-green-400 font-semibold">7 (Strassen)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">vs. Naïve</span>
                                    <span className="text-red-400">8 multiplications</span>
                                </div>
                            </div>
                        </div>

                        {step.phase === 'done' && step.naiveC && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                <p className="text-xs text-green-400 font-semibold uppercase mb-2">Verification</p>
                                <p className="text-xs text-slate-400 mb-2">Naïve A×B matches Strassen:</p>
                                <div className="flex gap-1">
                                    {step.naiveC.map((row, r) => (
                                        <div key={r} className="flex flex-col gap-1">
                                            {row.map((v, c) => (
                                                <div key={c} className="w-10 h-10 flex items-center justify-center bg-green-500/20 border border-green-600 rounded text-sm font-bold text-green-200">{v}</div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
