"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    GitBranch, Puzzle, AlertTriangle, Lock, Replace, Grid3x3, Scale, CheckCircle,
} from 'lucide-react';

const ACTS = [
    { id: 1, label: 'is-a',      icon: GitBranch    },
    { id: 2, label: 'has-a',     icon: Puzzle       },
    { id: 3, label: 'Fragile',   icon: AlertTriangle},
    { id: 4, label: 'Rigid',     icon: Lock         },
    { id: 5, label: 'Swap',      icon: Replace      },
    { id: 6, label: 'Explosion', icon: Grid3x3      },
    { id: 7, label: 'Which?',    icon: Scale        },
    { id: 8, label: 'Recap',     icon: CheckCircle  },
];

const INH = [
    { id: 'Animal',   y: 46,  label: 'Animal',   sub: 'move(), eat()' },
    { id: 'Dog',      y: 156, label: 'Dog',      sub: 'bark()' },
    { id: 'RobotDog', y: 266, label: 'RobotDog', sub: 'recharge()' },
];

function CompStage({ step }) {
    const focus = step.focus || 'both';
    const inhOpacity = focus === 'compose' ? 0.35 : 1;
    const compOpacity = focus === 'inherit' ? 0.35 : 1;
    const affected = step.fragile;

    const inhStyle = (id) => {
        if (id === 'Animal' && step.fragile) return { fill: '#3a0d0d', stroke: '#ef4444', text: '#fca5a5' };
        if (affected && id !== 'Animal') return { fill: '#2a1207', stroke: '#f59e0b', text: '#fcd34d' };
        if (step.locked && id === 'RobotDog') return { fill: '#1e293b', stroke: '#64748b', text: '#cbd5e1' };
        return { fill: '#12203a', stroke: '#3b82f6', text: '#bfdbfe' };
    };

    return (
        <svg viewBox="0 0 760 360" width="100%" className="max-h-[400px] select-none">
            <style>{`
                .co-box { transition: fill .45s ease, stroke .45s ease, opacity .45s ease; }
                .co-fade { transition: opacity .5s ease; }
                @keyframes copulse { 0%,100%{ opacity:.55 } 50%{ opacity:1 } }
                .co-pulse { animation: copulse 1.1s ease-in-out infinite; }
                .co-swap { transition: transform .6s cubic-bezier(0.45,0,0.15,1), opacity .5s ease; }
            `}</style>
            <defs>
                <marker id="coah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ── Inheritance panel ── */}
            <g className="co-fade" style={{ opacity: inhOpacity }}>
                <text x="130" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#93c5fd" fontFamily="monospace">Inheritance — &quot;is-a&quot;</text>
                {/* is-a arrows child → parent */}
                {[['RobotDog', 'Dog'], ['Dog', 'Animal']].map(([c, p], i) => {
                    const cy = INH.find(n => n.id === c).y, py = INH.find(n => n.id === p).y;
                    const flow = step.fragile;
                    return <line key={i} x1="130" y1={cy} x2="130" y2={py + 54} stroke={flow ? '#f59e0b' : '#475569'} strokeWidth="1.8" markerEnd="url(#coah)" className={flow ? 'co-pulse' : ''} />;
                })}
                {INH.map(n => {
                    const st = inhStyle(n.id);
                    return (
                        <g key={n.id} className="co-box">
                            <rect x="55" y={n.y} width="150" height="54" rx="9" fill={st.fill} stroke={st.stroke} strokeWidth="1.6" />
                            <text x="130" y={n.y + 24} textAnchor="middle" fontSize="13" fontWeight="bold" fill={st.text} fontFamily="monospace">{n.label}</text>
                            <text x="130" y={n.y + 42} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">{n.sub}</text>
                            {step.locked && n.id === 'RobotDog' && <text x="215" y={n.y + 30} fontSize="14">🔒</text>}
                            {affected && n.id !== 'Animal' && <text x="215" y={n.y + 20} fontSize="10" fill="#f59e0b" fontFamily="monospace">!</text>}
                        </g>
                    );
                })}
                <text x="130" y="344" textAnchor="middle" fontSize="9" fill="#475569" fontFamily="monospace">RobotDog is-a Dog is-a Animal</text>
            </g>

            {/* divider */}
            <line x1="380" y1="30" x2="380" y2="330" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* ── Composition panel ── */}
            <g className="co-fade" style={{ opacity: compOpacity }}>
                <text x="565" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#86efac" fontFamily="monospace">Composition — &quot;has-a&quot;</text>
                {/* Car */}
                <rect x="475" y="46" width="180" height="52" rx="9" fill="#0f2a1a" stroke="#22c55e" strokeWidth="1.8" />
                <text x="565" y="70" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#bbf7d0" fontFamily="monospace">Car</text>
                <text x="565" y="88" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">holds parts as fields</text>

                {/* has-a arrows */}
                {[[445, 170], [565, 170], [685, 170]].map(([cx], i) => (
                    <line key={i} x1="565" y1="98" x2={cx} y2="164" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#coah)" opacity="0.7" />
                ))}

                {/* Engine (swappable) */}
                <g className="co-box">
                    <rect x="400" y="168" width="120" height="56" rx="9"
                        fill={step.engine === 'electric' ? '#3b0764' : '#2a220d'}
                        stroke={step.engine === 'electric' ? '#a855f7' : '#a16207'} strokeWidth={step.swapping ? 2.4 : 1.6} />
                    <text x="460" y="190" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">engine:</text>
                    <text x="460" y="208" textAnchor="middle" fontSize="12" fontWeight="bold"
                        fill={step.engine === 'electric' ? '#e9d5ff' : '#fcd34d'} fontFamily="monospace">{step.engine === 'electric' ? 'ElectricEngine' : 'GasEngine'}</text>
                </g>
                {/* Wheels */}
                <rect x="540" y="168" width="90" height="56" rx="9" fill="#1e293b" stroke="#475569" strokeWidth="1.4" />
                <text x="585" y="200" textAnchor="middle" fontSize="11" fill="#cbd5e1" fontFamily="monospace">Wheels×4</text>
                {/* GPS */}
                <rect x="650" y="168" width="70" height="56" rx="9" fill="#1e293b" stroke="#475569" strokeWidth="1.4" />
                <text x="685" y="200" textAnchor="middle" fontSize="11" fill="#cbd5e1" fontFamily="monospace">GPS</text>

                {step.swapping && (
                    <text x="565" y="256" textAnchor="middle" fontSize="10" fill="#c4b5fd" fontFamily="monospace">↺ engine swapped at runtime — Car code unchanged ✓</text>
                )}
                <text x="565" y="344" textAnchor="middle" fontSize="9" fill="#475569" fontFamily="monospace">Car has-a Engine, Wheels, GPS</text>
            </g>
        </svg>
    );
}

function ExplosionView() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
                <div className="text-sm font-bold text-red-300 mb-2">Inheritance — a class per combination</div>
                <div className="flex flex-wrap gap-1.5">
                    {['Robot', 'FlyingRobot', 'SwimmingRobot', 'FlyingSwimmingRobot', 'WalkingFlyingRobot', 'Walking­Swimming­FlyingRobot'].map((c, i) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-300">{c}</span>
                    ))}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">N behaviors → up to 2ᴺ subclasses. Combinatorial explosion.</div>
            </div>
            <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-4">
                <div className="text-sm font-bold text-green-300 mb-2">Composition — mix behaviors freely</div>
                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-mono px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-green-300">Robot { }</span>
                    {['+ Fly', '+ Swim', '+ Walk'].map((b, i) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-1 rounded border border-slate-600/50 bg-slate-800/40 text-slate-300 ml-4">behaviors.add({b.slice(2)}Behavior)</span>
                    ))}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">N behaviors → N components, mixed per object. Linear.</div>
            </div>
        </div>
    );
}

function GuidanceCards({ cols }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {cols.map((c, i) => (
                <div key={i} className={`rounded-xl border p-4 ${c.tone === 'inh' ? 'border-blue-500/40 bg-blue-500/5' : 'border-green-500/40 bg-green-500/5'}`}>
                    <div className={`flex items-center gap-2 mb-2 text-sm font-bold ${c.tone === 'inh' ? 'text-blue-300' : 'text-green-300'}`}>
                        {c.tone === 'inh' ? <GitBranch className="h-4 w-4" /> : <Puzzle className="h-4 w-4" />}{c.name}
                    </div>
                    <div className="space-y-1.5">
                        {c.pts.map((p, j) => <div key={j} className="text-[11px] text-slate-400 leading-relaxed">• {p}</div>)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function RecapCards({ wins }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {wins.map((w, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl border border-zinc-700/60 bg-slate-900/50">
                    <div className="text-xs font-semibold text-zinc-200">{w.t}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{w.d}</div>
                </div>
            ))}
        </div>
    );
}

function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, engine: 'gas', ...data, explanation });

    s(1, 'Inheritance is "is-a"', { focus: 'inherit' },
        'The two ways to reuse code. Inheritance models an is-a relationship: a subclass IS A kind of its base. RobotDog is-a Dog is-a Animal, so RobotDog automatically gets move(), eat(), and bark(). Reuse comes from extending a parent. It is powerful — and it is also a tight, permanent coupling to that parent, as we\'ll see.');

    s(2, 'Composition is "has-a"', { focus: 'compose' },
        'Composition models a has-a relationship: an object is built from other objects held as fields. A Car HAS-A Engine, HAS-A four Wheels, HAS-A GPS. The Car reuses their behavior by delegating to them (engine.start()), not by inheriting from them. A Car is emphatically not "a kind of engine" — so composition is the honest model here.');

    s(3, 'The Fragile Base Class', { focus: 'inherit', fragile: true },
        'Inheritance\'s biggest hazard: the fragile base class problem. Because subclasses depend on the internals of their parent, a change to Animal ripples down and can silently break Dog and RobotDog — even though you never touched them. The more subclasses and the deeper the hierarchy, the more far-reaching (and surprising) a small base-class edit becomes.');

    s(4, 'Inheritance is Rigid', { focus: 'inherit', locked: true },
        'A class\'s base is fixed at definition time and cannot change while the program runs. If RobotDog inherits its power behavior from a Dog base, you cannot turn one instance into a different kind at runtime — the relationship is welded in at compile time. Inheritance decides "what you are" once, forever.');

    s(5, 'Composition Swaps at Runtime', { focus: 'compose', engine: 'gas' },
        'Composition is flexible exactly where inheritance is rigid. The Car holds its Engine as a field — currently a GasEngine. Because it is just a held object that the Car delegates to, it can be replaced…');
    s(5, 'Composition Swaps at Runtime', { focus: 'compose', engine: 'electric', swapping: true },
        '…car.engine = ElectricEngine() — swapped live, with zero changes to the Car class. As long as the new component honors the same interface (start(), stop()), the Car neither knows nor cares. This is the Strategy pattern, and it is why "program to an interface, compose behaviors" is so powerful: behavior becomes pluggable data.');

    s(6, 'Combinatorial Explosion', { explosion: true },
        'Try to model many independent behaviors with inheritance and the class count detonates. A Robot that might fly, swim, and/or walk needs a subclass for every combination — FlyingRobot, SwimmingRobot, FlyingSwimmingRobot, and so on: up to 2ᴺ classes for N behaviors. Composition instead gives the Robot a list of behavior components you mix per object — N components, combined freely. Linear versus exponential.');

    s(7, 'Which Should You Use?', {
        guidance: [
            { name: 'Reach for Inheritance', tone: 'inh', pts: ['A true, stable is-a relationship exists', 'You need runtime polymorphism / a shared interface (Shape → Circle)', 'The base is designed and documented for extension', 'The hierarchy is shallow and unlikely to churn'] },
            { name: 'Reach for Composition', tone: 'comp', pts: ['A has-a relationship (Car has-a Engine)', 'You want to swap or mix behaviors at runtime', 'You want to avoid fragile-base coupling', 'You are combining many independent features'] },
        ],
    }, 'So the guidance "favor composition over inheritance" is not "never inherit" — it is "reach for the looser coupling by default". Use inheritance for genuine is-a relationships and when you need polymorphism through a shared interface. Use composition for has-a relationships, for swappable/mixable behavior, and to dodge the fragile-base and explosion problems — which is most of the time.');

    s(8, 'Recap', {
        recap: true,
        wins: [
            { t: 'is-a → inheritance', d: 'Subclass extends a base; great for genuine type hierarchies and runtime polymorphism.' },
            { t: 'has-a → composition', d: 'An object holds and delegates to other objects; reuse without a type relationship.' },
            { t: 'Inheritance is tight & fixed', d: 'Fragile base class: base edits ripple to subclasses; the relationship is set at compile time.' },
            { t: 'Composition is loose & swappable', d: 'Replace or mix components at runtime behind an interface — no explosion, no fragile coupling.' },
        ],
    }, 'Inheritance and composition are both reuse tools with opposite trade-offs. Inheritance (is-a) is expressive but couples a subclass tightly and permanently to its base — fragile and rigid. Composition (has-a) keeps parts loosely coupled and swappable, scaling linearly as features grow. Model true is-a with inheritance and lean on polymorphism there; reach for composition everywhere behavior should stay flexible. Same goal — reuse — chosen by how tightly you want the pieces bound.');

    return steps;
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) return <RecapCards wins={step.wins} />;
    if (step.guidance) return <GuidanceCards cols={step.guidance} />;
    if (step.explosion) return <ExplosionView />;
    return <CompStage step={step} />;
}

const QUIZ = [
    {
        question: 'Which relationship is composition designed to model?',
        options: [
            '"is-a" — a subtype of another class',
            '"has-a" — an object built from other objects it holds and delegates to',
            '"calls" — one function invoking another',
            '"is-equal-to" — value equality',
        ],
        correct: 1,
        explanation: 'Composition models has-a: an object holds other objects as fields and reuses their behavior by delegating to them (Car has-a Engine). Inheritance models is-a — a subtype relationship. Choosing the honest relationship keeps designs clean.',
    },
    {
        question: 'What is the "fragile base class problem"?',
        options: [
            'Base classes use too much memory',
            'A change to a base class can silently break its subclasses that depend on its internals',
            'You cannot create instances of a base class',
            'Base classes run slower than subclasses',
        ],
        correct: 1,
        explanation: 'Subclasses are tightly coupled to their base\'s internals, so editing the base can ripple down and break subclasses you never touched. Deeper hierarchies make this worse — a key reason to prefer looser composition.',
    },
    {
        question: 'Why can composition swap a behavior at runtime when inheritance cannot?',
        options: [
            'Composition disables type checking',
            'A composed component is just a held object behind an interface, so it can be reassigned; a base class is fixed at compile time',
            'Inheritance is slower',
            'Composed objects live on the stack',
        ],
        correct: 1,
        explanation: 'A composed part is a field the object delegates to, so you can assign a different implementation of the same interface at runtime (the Strategy pattern). A class\'s base is welded in at definition time and cannot change while the program runs.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you\'ll pick the right tool every time!' : 'Review the explanations to reinforce the concepts.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">Retake Quiz</button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Question {quizState.current + 1} / {QUIZ.length}</div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-zinc-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-800 text-slate-600';
                    }
                    return (
                        <button key={i} onClick={() => {
                            if (quizState.answered) return;
                            const correct = i === q.correct;
                            setQuizState(st => ({ ...st, selected: i, answered: true, score: correct ? st.score + 1 : st.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(st => ({ ...st, complete: true }));
                    else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

const STEPS = generateSteps();

export default function CompositionVsInheritancePage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1300);
    const [quizState,   setQuizState]   = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying || STEPS.length === 0) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const step = STEPS[currentStep];
    const pct  = Math.round(((currentStep + 1) / STEPS.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link href="/under-the-hood" className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm mb-4 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4" />Back to Under the Hood
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Composition vs Inheritance</h1>
                            <p className="text-zinc-300 text-sm mt-1">is-a vs has-a, the fragile base class problem, and why a composed component swaps at runtime while deep inheritance cannot</p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">{currentStep + 1} / {STEPS.length}</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">steps</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {ACTS.map(act => {
                            const ActIcon = act.icon;
                            const isCurrent = step?.act === act.id;
                            const isDone    = step?.act > act.id;
                            return (
                                <button key={act.id} onClick={() => {
                                    const firstStepOfAct = STEPS.findIndex(s => s.act === act.id);
                                    if (firstStepOfAct >= 0) { setCurrentStep(firstStepOfAct); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent ? 'bg-white/20 text-white border border-white/30'
                                        : isDone ? 'bg-white/5 text-zinc-400 border border-white/10'
                                        : 'bg-transparent text-zinc-600 border border-transparent hover:border-white/10 hover:text-zinc-400'
                                    }`}>
                                    <ActIcon className="h-3 w-3" />{act.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="h-0.5 bg-slate-800">
                <div className="h-full bg-gradient-to-r from-zinc-500 to-slate-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Act {step?.act} of 8</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 py-4 min-h-[400px] flex items-center">
                                <VisualizationPanel step={step} />
                            </div>
                        </div>

                        <div className="mt-4 bg-slate-900/50 border border-slate-800/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Reset">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Previous">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Next">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="text-xs text-slate-500">Speed</span>
                                <input type="range" min="200" max="2000" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Trade-offs</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1], label: 'is-a', note: 'inheritance' },
                                    { acts: [2], label: 'has-a', note: 'composition' },
                                    { acts: [3], label: 'Fragile base', note: 'ripples down' },
                                    { acts: [4, 5], label: 'Flexibility', note: 'swap at runtime' },
                                    { acts: [6], label: 'Scaling', note: 'linear vs 2ᴺ' },
                                ].map(row => (
                                    <div key={row.label} className={`flex justify-between gap-2 px-2 py-1 rounded-lg transition-colors ${step && row.acts.includes(step.act) ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono text-[10px] text-right">{row.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-1">Active Recall</p>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
