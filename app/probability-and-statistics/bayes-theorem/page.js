"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Users, Repeat,
} from 'lucide-react';
import Tex, { texNum } from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Natural frequencies: of `sick` people a share `sens` test positive (true
   positives); of `healthy` people a share `fpr` test positive too (false
   positives). Among everyone who tests positive, the sick fraction is
   TP / (TP + FP) — Bayes' theorem, counted instead of computed. */
const tally = ({ sick, healthy, sens, fpr }) => {
    const tp = Math.round(sick * sens);
    const fp = Math.round(healthy * fpr);
    return { tp, fn: sick - tp, fp, tn: healthy - fp, pos: tp + fp };
};
/** Exact P(sick | positive) from the rates, without rounding people. */
const posterior = (prior, sens, fpr) => {
    const num = sens * prior;
    const den = num + fpr * (1 - prior);
    return den > 0 ? num / den : 0;
};
const pct = (x) => `${Math.round(x * 100)}%`;

/* ── guided tour ───────────────────────────────────────── */

const BASE = { sick: 10, healthy: 990, sens: 0.9, fpr: 0.09 };

const generateSteps = () => {
    const steps = [];
    let ask = 0;
    const push = (pop, show, explanation, extra = {}) => steps.push({ ...BASE, ...pop, show, round: 1, explanation, question: null, ask: null, ...extra });
    push({}, 'people', 'A town of 1,000 people. A condition affects 1% of them, and there is a test for it. Each dot is a person.');
    push({}, 'sick', 'Ten of the 1,000 have the condition (rose). That 1% is the base rate — the probability of being sick before any test.');
    push({}, 'testSick', 'Test the 10 sick people. The test catches 90% of real cases (its sensitivity): 9 test positive, 1 is missed.');
    push({}, 'testSick', 'The test is not perfect on healthy people either: it wrongly flags 9% of them.', { question: 'fp', ask: ask++ });
    push({}, 'all', '9% of 990 is 89 false positives (amber). There are now 9 + 89 = 98 positive tests in town.');
    push({}, 'positives', 'Keep only the people who tested positive. You are one of these 98 dots.', { question: 'posterior', ask: ask++ });
    push({}, 'positives', 'Only 9 of the 98 positives are sick: 9 / 98 ≈ 9%. A positive result from a 90%-sensitive test leaves you 91% likely to be healthy, because healthy people outnumber sick ones 99 to 1 and even a small false-positive rate among so many swamps the true cases.');
    push({}, 'positives', 'Bayes\' theorem says the same with rates: P(sick | +) = P(+ | sick) P(sick) / P(+) = (0.9 × 0.01) / (0.9 × 0.01 + 0.09 × 0.99) ≈ 0.092. The counts are that formula with the people left in.');
    push({ sick: 100, healthy: 900 }, 'all', 'Same test, but now 10% of people are sick — say, a patient with symptoms, not a random member of the public.', { question: 'posterior', ask: ask++ });
    push({ sick: 100, healthy: 900 }, 'positives', '90 true positives against 81 false ones: 90 / 171 ≈ 53%. The test did not change — the base rate did, and the answer moved from 9% to 53%.');
    push({ sick: 9, healthy: 89 }, 'all', 'Back to the 1% town. Take the 98 people who tested positive and test them again, independently. Their 9% chance of being sick is now the starting point.',
        { round: 2, question: 'posterior', ask: ask++ });
    push({ sick: 9, healthy: 89 }, 'positives', 'About 8 sick and 8 healthy people test positive twice: 8 / 16 = 50%. Yesterday\'s posterior is today\'s prior — that is how evidence accumulates.', { round: 2 });
    push({ sick: 9, healthy: 89 }, 'positives', 'Posterior = sensitivity × prior, divided by everyone who tests positive. When the condition is rare, the denominator is mostly false positives. Switch to Explore to set your own base rate, sensitivity and false-positive rate.', { round: 2 });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   How many false positives (not the 9 true ones, not 99, not the negatives),
   and the share of positives who are sick — against the classic confusion of
   P(sick | +) with the test's sensitivity, and against the base rate. */
const predictFor = (step) => {
    if (!step || !step.question) return null;
    const t = tally(step);
    let correct, candidates, question, because;
    if (step.question === 'fp') {
        correct = String(t.fp);
        candidates = [String(t.tp), String(Math.round(step.healthy * 0.1)), String(t.tn), String(t.fp + t.tp)];
        question = `How many of the ${step.healthy} healthy people test positive?`;
        because = `${Math.round(step.fpr * 100)}% of ${step.healthy} is ${texNum(step.healthy * step.fpr, 1)}, about ${t.fp} people.`;
    } else {
        correct = pct(t.tp / t.pos);
        candidates = [pct(step.sens), pct(step.sick / (step.sick + step.healthy)), '99%', '50%', '1%', '90%'];
        question = step.round === 2
            ? `They are tested again. Of those who test positive a second time, what share is sick?`
            : `Pick one person who tested positive. How likely is it that they are sick?`;
        because = `${t.tp} sick people test positive and ${t.fp} healthy people do: ${t.tp} / ${t.pos} ≈ ${correct}.`;
    }
    const seen = new Set([correct]);
    const wrong = [];
    for (const c of candidates) {
        if (wrong.length === 3) break;
        if (seen.has(c)) continue;
        seen.add(c);
        wrong.push(c);
    }
    const slot = (step.ask * 3 + 1) % 4;
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { question, options: ordered, correct: slot, because };
};

const quizQuestions = [
    {
        question: 'A disease affects 1 in 1,000 people. A test catches every case and has a 5% false-positive rate. You test positive. Roughly how likely are you to have the disease?',
        options: ['95%', 'About 2%', '50%', '99.9%'],
        correct: 1,
        explanation: 'Out of 1,000 people: 1 sick person tests positive, and about 50 of the 999 healthy ones do too. 1 / 51 ≈ 2%.',
    },
    {
        question: 'Which change raises P(sick | positive) the most when the condition is rare?',
        options: [
            'Raising the sensitivity from 90% to 99%',
            'Testing more people at random',
            'Lowering the false-positive rate',
            'Rounding the result',
        ],
        correct: 2,
        explanation: 'When most people are healthy, false positives dominate the positives. Cutting the false-positive rate shrinks that crowd directly; better sensitivity adds only a few true positives.',
    },
    {
        question: 'In Bayes\' theorem, what does P(E) in the denominator stand for in the test example?',
        options: [
            'The chance of being sick',
            'The test\'s sensitivity',
            'The share of the population that tests positive, sick or not',
            'The chance of a false positive',
        ],
        correct: 2,
        explanation: 'P(+) = P(+ | sick) P(sick) + P(+ | healthy) P(healthy): every positive test, true or false. Dividing by it is what turns the count of true positives into a share.',
    },
];

const codeExample = `def posterior(prior, sensitivity, false_positive_rate):
    """P(sick | positive test), by Bayes' theorem."""
    true_pos = sensitivity * prior
    false_pos = false_positive_rate * (1 - prior)
    return true_pos / (true_pos + false_pos)

p = posterior(0.01, 0.90, 0.09)
print(round(p, 3))                      # 0.092 -- most positives are healthy

print(round(posterior(0.10, 0.90, 0.09), 3))   # 0.526 with a 10% base rate

# A second, independent test: the posterior becomes the new prior
print(round(posterior(p, 0.90, 0.09), 3))       # 0.503

# The same with natural frequencies
sick, healthy = 10, 990
tp, fp = round(sick * 0.90), round(healthy * 0.09)
print(tp, fp, tp / (tp + fp))           # 9 89 0.0918...`;

/* ── picture ───────────────────────────────────────────── */

const W = 640, COLS = 40, GAP = 15.6;
const COLORS = { tp: '#e11d48', fn: '#fb7185', fp: '#f59e0b', tn: '#334155', sick: '#e11d48', healthy: '#475569' };

/**
 * Every person as a dot, the sick first. What a dot shows depends on how far
 * the story has got: just people, who is sick, the test results, or only the
 * positives. Clicking (or dragging across) the grid sets how many are sick.
 */
function Population({ sick, healthy, sens, fpr, show, onSick }) {
    const svgRef = useRef(null);
    const dragging = useRef(false);
    const total = sick + healthy;
    const t = tally({ sick, healthy, sens, fpr });
    const rows = Math.ceil(total / COLS);
    const H = 24 + rows * GAP + 12;
    const indexAt = (e) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const col = Math.min(Math.max(Math.round((p.x - 16) / GAP), 0), COLS - 1);
        const row = Math.min(Math.max(Math.round((p.y - 30) / GAP), 0), rows - 1);
        return row * COLS + col;
    };
    const pick = (e) => { const i = indexAt(e); if (i !== null && onSick) onSick(Math.min(i + 1, total)); };
    const dots = [];
    for (let i = 0; i < total; i++) {
        const isSick = i < sick;
        const positive = isSick ? i < t.tp : i - sick < t.fp;
        let fill = '#64748b', stroke = 'none', opacity = 0.9;
        if (show === 'sick') fill = isSick ? COLORS.sick : COLORS.healthy;
        if (show === 'testSick') { fill = isSick ? (positive ? COLORS.tp : '#020617') : COLORS.healthy; stroke = isSick && !positive ? COLORS.fn : 'none'; }
        if (show === 'all' || show === 'positives') {
            fill = isSick ? (positive ? COLORS.tp : '#020617') : positive ? COLORS.fp : COLORS.tn;
            stroke = isSick && !positive ? COLORS.fn : 'none';
            if (show === 'positives' && !positive) opacity = 0.12;
        }
        dots.push(<circle key={i} cx={16 + (i % COLS) * GAP} cy={30 + Math.floor(i / COLS) * GAP} r={5.4} fill={fill} stroke={stroke} strokeWidth={1.6} opacity={opacity}
            style={{ transition: 'fill .4s ease, opacity .4s ease' }} />);
    }
    return (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${total} people, ${sick} of them sick`} className="block select-none"
            style={{ touchAction: onSick ? 'none' : undefined, cursor: onSick ? 'crosshair' : 'default' }}
            onPointerDown={onSick ? (e) => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); pick(e); } : undefined}
            onPointerMove={onSick ? (e) => { if (dragging.current) pick(e); } : undefined}
            onPointerUp={onSick ? () => { dragging.current = false; } : undefined}>
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            <text x={10} y={16} fontSize={11} fill="#94a3b8">{total.toLocaleString('en-US')} people{onSick ? ' · click or drag to set how many are sick' : ''}</text>
            <text x={W - 10} y={16} fontSize={11} fill="#fda4af" textAnchor="end">
                {show === 'people' ? '' : show === 'sick' || show === 'testSick' ? `${sick} sick` : `${t.pos} positive: ${t.tp} sick, ${t.fp} healthy`}
            </text>
            {dots}
        </svg>
    );
}

/** The natural-frequency tree: everyone → sick / healthy → positive / negative. */
function FrequencyTree({ sick, healthy, sens, fpr, hide }) {
    const t = tally({ sick, healthy, sens, fpr });
    const node = (x, y, label, value, color) => (
        <g transform={`translate(${x}, ${y})`}>
            <rect x={-62} y={-17} width={124} height={34} rx={8} fill="#0f172a" stroke={color} strokeWidth={1.5} />
            <text y={-3} textAnchor="middle" fontSize={10} fill="#94a3b8">{label}</text>
            <text y={12} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{hide ? '?' : value}</text>
        </g>
    );
    const edge = (x1, y1, x2, y2, label) => (
        <g>
            <line x1={x1} y1={y1 + 17} x2={x2} y2={y2 - 17} stroke="#475569" strokeWidth={1.5} />
            <text x={(x1 + x2) / 2 + (x2 > x1 ? 8 : -8)} y={(y1 + y2) / 2 + 4} textAnchor={x2 > x1 ? 'start' : 'end'} fontSize={10} fill="#64748b">{label}</text>
        </g>
    );
    return (
        <svg viewBox={`0 0 ${W} 210`} width="100%" role="img" aria-label="Natural frequency tree" className="block select-none">
            {edge(320, 26, 170, 100, pct(sick / (sick + healthy)))}
            {edge(320, 26, 470, 100, pct(healthy / (sick + healthy)))}
            {edge(170, 100, 90, 180, `${pct(sens)} +`)}
            {edge(170, 100, 250, 180, '−')}
            {edge(470, 100, 390, 180, `${pct(fpr)} +`)}
            {edge(470, 100, 550, 180, '−')}
            {node(320, 26, 'everyone', (sick + healthy).toLocaleString('en-US'), '#e2e8f0')}
            {node(170, 100, 'sick', sick, COLORS.sick)}
            {node(470, 100, 'healthy', healthy, '#94a3b8')}
            {node(90, 180, 'sick, test +', t.tp, COLORS.tp)}
            {node(250, 180, 'sick, test −', t.fn, COLORS.fn)}
            {node(390, 180, 'healthy, test +', t.fp, COLORS.fp)}
            {node(550, 180, 'healthy, test −', t.tn, '#64748b')}
        </svg>
    );
}

/* ── page ──────────────────────────────────────────────── */

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white">Retake</button>
            </div>
        );
    }
    const answer = (idx) => {
        if (quizState.answered) return;
        const right = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: right ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm text-slate-200 mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let tone = 'border-slate-700 text-slate-300 hover:border-rose-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={opt} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-start gap-2 ${tone}`}>
                            {quizState.answered && i === q.correct && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            {quizState.answered && i === quizState.selected && i !== q.correct && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            <span>{opt}</span>
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function BayesTheoremPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1800);
    const [ex, setEx] = useState({ ...BASE, round: 1, show: 'all' });
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    const hiding = mode === 'guided' && predict.hideExplanation;

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const s = mode === 'guided' ? step : ex;
    const { sick, healthy, sens, fpr } = s;
    const total = sick + healthy;
    const prior = sick / total;
    const t = tally(s);
    const exact = posterior(prior, sens, fpr);
    const revealed = mode === 'explore' || ['all', 'positives'].includes(step.show);

    const base = () => {
        if (mode !== 'guided') return ex;
        setMode('explore'); setIsPlaying(false);
        return { sick: step.sick, healthy: step.healthy, sens: step.sens, fpr: step.fpr, round: step.round, show: 'all' };
    };
    const update = (fn) => setEx(fn(base()));
    const setSick = (v) => update(x => { const n = x.sick + x.healthy; const sk = Math.min(Math.max(Math.round(v), 0), n); return { ...x, sick: sk, healthy: n - sk }; });
    const retest = () => update(x => { const tt = tally(x); return { ...x, sick: tt.tp, healthy: tt.fp, round: x.round + 1 }; });
    const restart = () => setEx(x => ({ ...x, sick: Math.round((x.sick / (x.sick + x.healthy)) * 1000), healthy: 1000 - Math.round((x.sick / (x.sick + x.healthy)) * 1000), round: 1 }));

    const formula = String.raw`P(\text{sick} \mid +) = \frac{P(+ \mid \text{sick})\,P(\text{sick})}{P(+)} = \frac{${texNum(sens, 2)} \times ${texNum(prior, 4)}}{${texNum(sens, 2)} \times ${texNum(prior, 4)} + ${texNum(fpr, 2)} \times ${texNum(1 - prior, 4)}} = \mathbf{${texNum(exact, 3)}}`
        + String.raw` \\[6pt] \text{counting people: } \frac{\text{TP}}{\text{TP} + \text{FP}} = \frac{${t.tp}}{${t.tp} + ${t.fp}} = ${t.pos ? texNum(t.tp / t.pos, 3) : '\\text{no positives}'}`;

    const explanation = mode === 'guided' ? step.explanation
        : t.pos === 0
            ? 'Nobody tests positive with these settings, so there is nothing to update on.'
            : `${sick} of ${total} are sick (${pct(prior)}). ${t.tp} of them test positive, and so do ${t.fp} healthy people, so a positive result means a ${pct(t.tp / t.pos)} chance of being sick (exactly ${texNum(exact * 100, 1)}% from the rates). ${exact < 0.5 ? 'Most positives are false alarms: the healthy crowd is so large that a small false-positive rate outweighs the true cases.' : 'Most positives are real now — the base rate is high enough, or the false-positive rate low enough.'}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/probability-and-statistics" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Probability and Statistics
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Bayes&apos; Theorem</h1>
                    <p className="text-rose-100 max-w-3xl">
                        How should a test result change what you believe? Count the people: when a condition is rare, most positive tests come from the healthy majority, however good the test.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore') setEx(base()); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">
                                {mode === 'guided' ? `Step ${currentStep + 1} of ${stepHistory.length}` : `Test round ${ex.round}`}
                            </span>
                        </div>

                        <Population sick={sick} healthy={healthy} sens={sens} fpr={fpr} show={mode === 'guided' ? step.show : ex.show} onSick={setSick} />
                        <div className="flex flex-wrap gap-3 text-xs mt-3">
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.tp }} />sick, tests positive</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: COLORS.fn }} />sick, missed</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.fp }} />healthy, false positive</span>
                            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.tn }} />healthy, negative</span>
                        </div>

                        {mode === 'guided' ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(x => Math.max(x - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(x => Math.min(x + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="rose" />
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-rose-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {[['all', 'Everyone'], ['positives', 'Only positive tests']].map(([key, label]) => (
                                    <button key={key} onClick={() => setEx(x => ({ ...x, show: key }))} aria-pressed={ex.show === key}
                                        className={`text-xs px-3 py-1.5 rounded-lg border ${ex.show === key ? 'border-rose-500 text-rose-200 bg-rose-500/10' : 'border-slate-700 text-slate-400 hover:border-rose-500'}`}>{label}</button>
                                ))}
                                <button onClick={retest} disabled={t.pos === 0}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500 disabled:opacity-40">
                                    <Repeat className="h-3.5 w-3.5" />Test the positives again
                                </button>
                                <button onClick={restart} disabled={ex.round === 1}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-500 disabled:opacity-40">
                                    <Users className="h-3.5 w-3.5" />Back to 1,000 people
                                </button>
                            </div>
                        )}
                    </div>

                    {mode === 'guided' && predict.prompt && <PredictPrompt predict={predict} accent="rose" />}

                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                            <p className="text-rose-200 text-sm leading-relaxed">
                                {hiding ? 'Make your prediction above to reveal this step.' : explanation}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                        <FrequencyTree sick={sick} healthy={healthy} sens={sens} fpr={fpr} hide={hiding || !revealed} />
                        <div className="text-slate-100 text-sm sm:text-base">
                            {hiding || !revealed ? <p className="text-sm text-slate-500">The formula fills in once everyone has been tested.</p> : <Tex block>{formula}</Tex>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ParamSlider label="Sick (base rate)" accent="rose" min={0} max={total} step={1} value={sick} onChange={setSick}
                                format={(v) => `${v} of ${total} (${texNum((v / total) * 100, 1)}%)`} />
                            <ParamSlider label="Sensitivity P(+ | sick)" accent="rose" min={0.5} max={1} step={0.01} value={sens}
                                format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update(x => ({ ...x, sens: v }))} />
                            <ParamSlider label="False positives P(+ | healthy)" accent="rose" min={0} max={0.3} step={0.01} value={fpr}
                                format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update(x => ({ ...x, fpr: v }))} />
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 min-w-0">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The pieces of Bayes</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-rose-300 font-semibold">Prior P(H)</span> — the base rate, before the evidence.</li>
                            <li><span className="text-sky-300 font-semibold">Likelihood P(E | H)</span> — how often the evidence appears when H is true: the sensitivity.</li>
                            <li><span className="text-amber-300 font-semibold">Evidence P(E)</span> — every positive, true or false.</li>
                            <li><span className="text-green-300 font-semibold">Posterior P(H | E)</span> — the prior, re-weighted by the evidence. It becomes the next prior.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(x => !x)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-rose-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
