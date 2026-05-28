"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function bruteClosest(pts) {
    let best = Infinity, p1 = null, p2 = null;
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const d = dist(pts[i], pts[j]);
            if (d < best) { best = d; p1 = pts[i]; p2 = pts[j]; }
        }
    }
    return { d: best, p1, p2 };
}

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(pts) {
    const steps = [];
    const sorted = [...pts].sort((a, b) => a.x - b.x);

    // Track global best pair across recursion
    let globalBest = { d: Infinity, p1: null, p2: null };

    steps.push({
        phase: 'start',
        points: pts,
        divideX: null,
        stripX: null,
        delta: null,
        highlight: [],
        bestPair: null,
        leftGroup: [],
        rightGroup: [],
        stripGroup: [],
        explanation: `Starting Closest Pair on ${pts.length} points. We'll sort by x, recursively split, find local minimums, then check the δ-strip for cross-half pairs.`,
    });

    function solve(subPts, depth) {
        if (subPts.length <= 3) {
            const { d, p1, p2 } = bruteClosest(subPts);
            if (d < globalBest.d) {
                globalBest = { d, p1, p2 };
            }
            steps.push({
                phase: 'brute',
                points: pts,
                divideX: null,
                stripX: null,
                delta: Math.round(d * 100) / 100,
                highlight: subPts.map(p => p.id),
                bestPair: { p1, p2, d: Math.round(d * 100) / 100 },
                leftGroup: [],
                rightGroup: [],
                stripGroup: [],
                depth,
                explanation: `Base case (≤3 points): brute-force among [${subPts.map(p => `P${p.id}`).join(', ')}]. Closest = P${p1.id}–P${p2.id} (d=${Math.round(d * 100) / 100}).`,
            });
            return d;
        }

        const mid = Math.floor(subPts.length / 2);
        const midPt = subPts[mid];
        const left = subPts.slice(0, mid);
        const right = subPts.slice(mid);

        steps.push({
            phase: 'divide',
            points: pts,
            divideX: midPt.x,
            stripX: null,
            delta: null,
            highlight: [],
            bestPair: globalBest.p1 ? { ...globalBest, d: Math.round(globalBest.d * 100) / 100 } : null,
            leftGroup: left.map(p => p.id),
            rightGroup: right.map(p => p.id),
            stripGroup: [],
            depth,
            explanation: `Dividing ${subPts.length} points at x=${midPt.x.toFixed(1)}. Left: [${left.map(p => `P${p.id}`).join(', ')}], Right: [${right.map(p => `P${p.id}`).join(', ')}].`,
        });

        const dLeft = solve(left, depth + 1);
        const dRight = solve(right, depth + 1);
        const delta = Math.min(dLeft, dRight);

        // Check strip
        const strip = subPts.filter(p => Math.abs(p.x - midPt.x) < delta);

        steps.push({
            phase: 'strip',
            points: pts,
            divideX: midPt.x,
            stripX: delta,
            delta: Math.round(delta * 100) / 100,
            highlight: [],
            bestPair: globalBest.p1 ? { ...globalBest, d: Math.round(globalBest.d * 100) / 100 } : null,
            leftGroup: left.map(p => p.id),
            rightGroup: right.map(p => p.id),
            stripGroup: strip.map(p => p.id),
            depth,
            explanation: `After recursion: δ=min(${Math.round(dLeft * 100) / 100}, ${Math.round(dRight * 100) / 100})=${Math.round(delta * 100) / 100}. Checking the ${delta.toFixed(2)}-wide strip (${strip.length} points) for cross-half pairs closer than δ.`,
        });

        // Strip check
        const stripY = [...strip].sort((a, b) => a.y - b.y);
        let stripBest = delta;
        let sp1 = globalBest.p1, sp2 = globalBest.p2;
        for (let i = 0; i < stripY.length; i++) {
            for (let j = i + 1; j < stripY.length && (stripY[j].y - stripY[i].y) < stripBest; j++) {
                const d2 = dist(stripY[i], stripY[j]);
                if (d2 < stripBest) {
                    stripBest = d2;
                    sp1 = stripY[i]; sp2 = stripY[j];
                    if (d2 < globalBest.d) globalBest = { d: d2, p1: sp1, p2: sp2 };
                    steps.push({
                        phase: 'strip_pair',
                        points: pts,
                        divideX: midPt.x,
                        stripX: delta,
                        delta: Math.round(stripBest * 100) / 100,
                        highlight: [sp1.id, sp2.id],
                        bestPair: { p1: sp1, p2: sp2, d: Math.round(d2 * 100) / 100 },
                        leftGroup: left.map(p => p.id),
                        rightGroup: right.map(p => p.id),
                        stripGroup: strip.map(p => p.id),
                        depth,
                        explanation: `Strip pair found! P${sp1.id}–P${sp2.id} (d=${Math.round(d2 * 100) / 100}) is closer than current δ=${Math.round(delta * 100) / 100}. New best!`,
                    });
                }
            }
        }

        return stripBest;
    }

    solve(sorted, 0);

    steps.push({
        phase: 'done',
        points: pts,
        divideX: null,
        stripX: null,
        delta: Math.round(globalBest.d * 100) / 100,
        highlight: [globalBest.p1?.id, globalBest.p2?.id].filter(Boolean),
        bestPair: globalBest.p1 ? { ...globalBest, d: Math.round(globalBest.d * 100) / 100 } : null,
        leftGroup: [],
        rightGroup: [],
        stripGroup: [],
        explanation: `Done! Closest pair: P${globalBest.p1?.id}–P${globalBest.p2?.id} with distance ${Math.round(globalBest.d * 100) / 100}.`,
    });

    return steps;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const quizQuestions = [
    {
        question: 'What is the time complexity of the D&C closest pair algorithm?',
        options: ['O(n²)', 'O(n log² n)', 'O(n log n)', 'O(n)'],
        correct: 2,
        explanation: 'With careful strip handling (at most 8 comparisons per point due to the δ-packing argument), the strip check is O(n) per level, giving O(n log n) overall.',
    },
    {
        question: 'Why do we only need to check at most 7 other points for each point in the strip?',
        options: [
            'The strip is always width 7',
            'Each δ×2δ rectangle can hold at most 8 points (δ packing argument)',
            'We sort by y and stop after 7 steps',
            'Hashing limits collisions to 7',
        ],
        correct: 1,
        explanation: 'In each δ×2δ block of the strip, any two points are at least δ apart (otherwise we\'d have a closer pair), which limits the block to ≤8 points — bounding comparisons.',
    },
    {
        question: 'What must be true about points in the strip for them to be candidates for the closest cross-half pair?',
        options: [
            'Their distance to each other must be < δ',
            'Their x-coordinate must be within δ of the dividing line',
            'They must be in sorted order',
            'They must have distinct y-coordinates',
        ],
        correct: 1,
        explanation: 'Only points within δ of the midline x-coordinate can possibly form a pair closer than δ. Points farther away have x-distance ≥ δ already.',
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

// ─── Point presets ────────────────────────────────────────────────────────────

let _idCounter = 0;
function mkPt(x, y) { return { id: _idCounter++, x, y }; }

const PRESETS = [
    [mkPt(2,3), mkPt(12,30), mkPt(40,50), mkPt(5,1), mkPt(12,10), mkPt(3,4), mkPt(20,8), mkPt(35,20)],
    [mkPt(1,1), mkPt(3,4), mkPt(5,2), mkPt(8,6), mkPt(11,9), mkPt(14,3), mkPt(17,11), mkPt(19,7)],
    [mkPt(2,15), mkPt(4,3), mkPt(7,8), mkPt(10,14), mkPt(13,2), mkPt(15,9), mkPt(18,11), mkPt(20,5), mkPt(23,17)],
];

function randomPoints() {
    _idCounter = 0;
    const n = 7 + Math.floor(Math.random() * 5);
    const pts = [];
    for (let i = 0; i < n; i++) {
        pts.push({ id: _idCounter++, x: 2 + Math.random() * 36, y: 2 + Math.random() * 26 });
    }
    return pts;
}

// Canvas dimensions (logical)
const W = 400, H = 280;

function toSvg(p) {
    // Map x:[0,40]→[20,380], y:[0,30]→[260,20] (flip y)
    return {
        cx: 20 + (p.x / 40) * 360,
        cy: 260 - (p.y / 30) * 240,
    };
}

export default function ClosestPairPage() {
    const [pts, setPts] = useState(PRESETS[0]);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((p) => {
        const steps = generateSteps(p);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { rebuild(pts); }, [pts, rebuild]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const step = stepHistory[currentStep] || {};

    function ptColor(pt) {
        const id = pt.id;
        if (step.highlight && step.highlight.includes(id)) return '#facc15'; // yellow = active comparison
        if (step.phase === 'done' && step.bestPair && (id === step.bestPair.p1?.id || id === step.bestPair.p2?.id)) return '#22c55e';
        if (step.stripGroup && step.stripGroup.includes(id)) return '#38bdf8'; // strip = sky
        if (step.leftGroup && step.leftGroup.includes(id)) return '#818cf8';  // left = indigo
        if (step.rightGroup && step.rightGroup.includes(id)) return '#f472b6'; // right = pink
        return '#94a3b8'; // default slate
    }

    const divideXSvg = step.divideX !== null && step.divideX !== undefined
        ? 20 + (step.divideX / 40) * 360 : null;

    const stripLeft = (step.divideX !== null && step.divideX !== undefined && step.stripX)
        ? 20 + ((step.divideX - step.stripX) / 40) * 360 : null;
    const stripRight = (step.divideX !== null && step.divideX !== undefined && step.stripX)
        ? 20 + ((step.divideX + step.stripX) / 40) * 360 : null;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 py-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <p className="text-sky-200 text-sm font-semibold uppercase tracking-widest mb-1">Divide &amp; Conquer</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Closest Pair of Points</h1>
                    <p className="text-sky-100 text-base max-w-2xl">
                        Divide the point set with a vertical line, recurse on each half, then check the δ-wide strip for cross-half pairs that might beat the recursive minimum.
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
                        <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={currentStep >= stepHistory.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                        <button onClick={() => { _idCounter = 0; setPts(randomPoints()); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><Shuffle className="h-4 w-4" /></button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-sky-500" />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setPts(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${pts === p ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                Preset {i + 1} ({p.length} pts)
                            </button>
                        ))}
                    </div>

                    <span className="text-xs text-slate-500">Step {currentStep + 1}/{stepHistory.length}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SVG canvas */}
                    <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Point Plane</h2>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: '#0f172a', borderRadius: 12, minHeight: 220 }}>
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map(f => (
                                <g key={f}>
                                    <line x1={20 + f * 360} y1={20} x2={20 + f * 360} y2={260} stroke="#1e293b" strokeWidth="1" />
                                    <line x1={20} y1={20 + f * 240} x2={380} y2={20 + f * 240} stroke="#1e293b" strokeWidth="1" />
                                </g>
                            ))}

                            {/* Strip shading */}
                            {stripLeft !== null && stripRight !== null && (
                                <rect x={Math.max(20, stripLeft)} y={20}
                                    width={Math.min(380, stripRight) - Math.max(20, stripLeft)}
                                    height={240}
                                    fill="#0ea5e9" fillOpacity="0.08" />
                            )}

                            {/* Divide line */}
                            {divideXSvg !== null && (
                                <line x1={divideXSvg} y1={20} x2={divideXSvg} y2={260}
                                    stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,3" />
                            )}

                            {/* Strip bounds */}
                            {stripLeft !== null && (
                                <line x1={stripLeft} y1={20} x2={stripLeft} y2={260}
                                    stroke="#38bdf8" strokeWidth="1" strokeDasharray="4,3" />
                            )}
                            {stripRight !== null && (
                                <line x1={stripRight} y1={20} x2={stripRight} y2={260}
                                    stroke="#38bdf8" strokeWidth="1" strokeDasharray="4,3" />
                            )}

                            {/* Best pair line */}
                            {step.bestPair?.p1 && step.bestPair?.p2 && (() => {
                                const a = toSvg(step.bestPair.p1);
                                const b = toSvg(step.bestPair.p2);
                                const col = step.phase === 'done' ? '#22c55e' : '#facc15';
                                return <line x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={col} strokeWidth="2" strokeDasharray="5,3" />;
                            })()}

                            {/* Points */}
                            {pts.map(p => {
                                const { cx, cy } = toSvg(p);
                                const col = ptColor(p);
                                const isBest = step.phase === 'done' && step.bestPair && (p.id === step.bestPair.p1?.id || p.id === step.bestPair.p2?.id);
                                const isHighlight = step.highlight && step.highlight.includes(p.id);
                                const r = isBest || isHighlight ? 7 : 5;
                                return (
                                    <g key={p.id}>
                                        <circle cx={cx} cy={cy} r={r} fill={col} />
                                        <text x={cx + 8} y={cy - 4} fontSize="9" fill={col} opacity="0.8">P{p.id}</text>
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Legend */}
                        <div className="flex gap-4 mt-3 flex-wrap">
                            {[
                                { color: 'bg-indigo-400', label: 'Left half' },
                                { color: 'bg-pink-400', label: 'Right half' },
                                { color: 'bg-sky-400', label: 'Strip' },
                                { color: 'bg-yellow-400', label: 'Comparing' },
                                { color: 'bg-green-500', label: 'Best pair' },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <div className={`w-3 h-3 rounded-full ${color}`} /> {label}
                                </div>
                            ))}
                            {divideXSvg && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <div className="w-6 h-0.5 border-t-2 border-dashed border-yellow-400" /> Midline
                                </div>
                            )}
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
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Best</p>
                            {step.bestPair?.p1 ? (
                                <div className="space-y-1.5 text-sm">
                                    <div className={`font-bold ${step.phase === 'done' ? 'text-green-400' : 'text-yellow-300'}`}>
                                        P{step.bestPair.p1.id} — P{step.bestPair.p2.id}
                                    </div>
                                    <div className="text-slate-400 text-xs">
                                        distance = <span className="text-slate-200 font-mono">{step.bestPair.d}</span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-500 text-sm">Not yet found</span>
                            )}

                            <div className="mt-3 space-y-1 text-xs text-slate-400">
                                <div className="flex justify-between"><span>Phase</span>
                                    <span className={`font-semibold capitalize ${step.phase === 'done' ? 'text-green-300' : step.phase === 'strip' || step.phase === 'strip_pair' ? 'text-sky-300' : step.phase === 'divide' ? 'text-indigo-300' : 'text-slate-300'}`}>
                                        {step.phase === 'start' ? 'Setup' : step.phase === 'divide' ? 'Divide' : step.phase === 'brute' ? 'Brute (base)' : step.phase === 'strip' ? 'Strip check' : step.phase === 'strip_pair' ? 'Strip hit!' : 'Complete'}
                                    </span>
                                </div>
                                {step.delta !== null && step.delta !== undefined && (
                                    <div className="flex justify-between"><span>δ</span><span className="text-slate-300 font-mono">{step.delta}</span></div>
                                )}
                                <div className="flex justify-between"><span>Points</span><span className="text-slate-300">{pts.length}</span></div>
                                <div className="flex justify-between"><span>Strip pts</span><span className="text-slate-300">{step.stripGroup?.length ?? '—'}</span></div>
                            </div>
                        </div>

                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
