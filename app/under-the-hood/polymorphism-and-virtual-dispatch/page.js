"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Shapes, GitCompare, Table2, MousePointer2, Zap, Repeat, Gauge, CheckCircle,
} from 'lucide-react';

const ACTS = [
    { id: 1, label: 'Polymorphism', icon: Shapes           },
    { id: 2, label: 'Dispatch',     icon: GitCompare },
    { id: 3, label: 'vtable',       icon: Table2           },
    { id: 4, label: 'vptr',         icon: MousePointer2    },
    { id: 5, label: 'The Call',     icon: Zap              },
    { id: 6, label: 'Override',     icon: Repeat           },
    { id: 7, label: 'Cost',         icon: Gauge            },
    { id: 8, label: 'Recap',        icon: CheckCircle      },
];

// geometry for target-dependent anchors
const GEO = {
    circle: { objY: 92,  vtY: 92,  fnY: 82  },
    square: { objY: 262, vtY: 262, fnY: 252 },
};

function VtableStage({ step }) {
    const t = step.target;                 // 'circle' | 'square' | null
    const g = t ? GEO[t] : GEO.circle;
    const hop = step.hop;                  // 'ptr' | 'vptr' | 'vtable' | 'fn' | null
    const dimObj = (which) => t && step.dimOther && which !== t;

    // token anchor per hop
    const anchors = {
        ptr:    [128, 200],
        vptr:   [290, g.objY],
        vtable: [455, g.vtY],
        fn:     [652, g.fnY],
    };
    const [tx, ty] = hop ? anchors[hop] : [-60, -60];

    const objBox = (which, y, data) => {
        const active = t === which && (hop === 'vptr' || step.act >= 5);
        const dim = dimObj(which);
        return (
            <g opacity={dim ? 0.4 : 1} className="pv-fade">
                <rect x="150" y={y} width="150" height="80" rx="8" fill="#0f172a" stroke={active ? '#e4e4e7' : '#475569'} strokeWidth={active ? 2.2 : 1.4} className="pv-box" />
                <text x="225" y={y - 6} textAnchor="middle" fontSize="10" fill="#cbd5e1" fontFamily="monospace">{which === 'circle' ? 'Circle c' : 'Square s'} (object)</text>
                <rect x="158" y={y + 10} width="134" height="26" rx="4" fill={step.showVptr ? '#12203a' : '#1e293b'} stroke={step.showVptr ? '#3b82f6' : '#334155'} strokeWidth="1.3" />
                <text x="166" y={y + 27} fontSize="10" fill="#93c5fd" fontFamily="monospace">vptr ●</text>
                <text x="284" y={y + 27} textAnchor="end" fontSize="8" fill="#64748b" fontFamily="monospace">(hidden)</text>
                <rect x="158" y={y + 44} width="134" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="166" y={y + 60} fontSize="10" fill="#cbd5e1" fontFamily="monospace">{data}</text>
            </g>
        );
    };

    const vtBox = (which, y) => {
        const active = t === which && (hop === 'vtable' || hop === 'fn');
        const dim = dimObj(which);
        const drawHot = active;
        return (
            <g opacity={dim ? 0.4 : 1} className="pv-fade" style={{ opacity: step.showVtable ? (dim ? 0.4 : 1) : 0 }}>
                <rect x="380" y={y} width="150" height="80" rx="8" fill="#0b1f16" stroke={active ? '#22c55e' : '#334155'} strokeWidth={active ? 2.2 : 1.4} className="pv-box" />
                <text x="455" y={y - 6} textAnchor="middle" fontSize="10" fill="#86efac" fontFamily="monospace">{which === 'circle' ? 'Circle' : 'Square'} vtable</text>
                <rect x="388" y={y + 10} width="134" height="26" rx="4" fill={drawHot ? '#14532d' : '#1e293b'} stroke={drawHot ? '#22c55e' : '#334155'} strokeWidth={drawHot ? 1.8 : 1} />
                <text x="396" y={y + 27} fontSize="9" fill={drawHot ? '#bbf7d0' : '#cbd5e1'} fontFamily="monospace">[0] draw → {which === 'circle' ? 'C' : 'S'}::draw</text>
                <rect x="388" y={y + 44} width="134" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="396" y={y + 60} fontSize="9" fill="#94a3b8" fontFamily="monospace">[1] area → {which === 'circle' ? 'C' : 'S'}::area</text>
            </g>
        );
    };

    return (
        <svg viewBox="0 0 760 360" width="100%" className="max-h-[400px] select-none">
            <style>{`
                .pv-box { transition: fill .4s ease, stroke .4s ease; }
                .pv-fade { transition: opacity .5s ease; }
                @keyframes pvdash { to { stroke-dashoffset: -16; } }
                .pv-flow { stroke-dasharray: 5 4; animation: pvdash .55s linear infinite; }
            `}</style>
            <defs>
                <marker id="pvah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* Base pointer */}
            <rect x="24" y="172" width="100" height="56" rx="8" fill="#12203a" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="74" y="196" textAnchor="middle" fontSize="11" fill="#93c5fd" fontFamily="monospace">Shape* s</text>
            <text x="74" y="214" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">s-&gt;draw()</text>
            {/* pointer → target object */}
            {t && (
                <line x1="124" y1="200" x2="148" y2={g.objY + 40} stroke={hop === 'ptr' ? '#e4e4e7' : '#475569'} strokeWidth="1.8" markerEnd="url(#pvah)" className={hop === 'ptr' ? 'pv-flow' : ''} />
            )}

            {objBox('circle', 52, 'radius = 5')}
            {objBox('square', 222, 'side = 3')}

            {/* vptr → vtable arrows */}
            {step.showVptr && ['circle', 'square'].map(which => {
                const y = which === 'circle' ? 92 : 262;
                const on = t === which && (hop === 'vptr' || hop === 'vtable' || hop === 'fn');
                return <line key={which} x1="300" y1={y} x2="378" y2={y} stroke={on ? '#e4e4e7' : '#3b82f6'} strokeWidth="1.8" markerEnd="url(#pvah)" opacity={dimObj(which) ? 0.4 : 0.85} className={on && hop === 'vptr' ? 'pv-flow' : ''} />;
            })}

            {vtBox('circle', 52)}
            {vtBox('square', 222)}

            {/* vtable slot → function arrows */}
            {step.showFns && ['circle', 'square'].map(which => {
                const y = which === 'circle' ? 82 : 252;
                const on = t === which && hop === 'fn';
                return <line key={which} x1="530" y1={y + 10} x2="578" y2={y} stroke={on ? '#22c55e' : '#334155'} strokeWidth="1.8" markerEnd="url(#pvah)" opacity={dimObj(which) ? 0.4 : 1} className={on ? 'pv-flow' : ''} />;
            })}

            {/* Functions */}
            {step.showFns && ['circle', 'square'].map(which => {
                const y = which === 'circle' ? 62 : 232;
                const on = t === which && hop === 'fn';
                return (
                    <g key={which} className="pv-fade" opacity={dimObj(which) ? 0.4 : 1}>
                        <rect x="578" y={y} width="150" height="40" rx="6" fill={on ? '#14532d' : '#0b1220'} stroke={on ? '#22c55e' : '#334155'} strokeWidth={on ? 2 : 1.3} className="pv-box" />
                        <text x="653" y={y + 18} textAnchor="middle" fontSize="10" fontWeight="bold" fill={on ? '#bbf7d0' : '#cbd5e1'} fontFamily="monospace">{which === 'circle' ? 'Circle::draw' : 'Square::draw'}</text>
                        <text x="653" y={y + 32} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">draws a {which}</text>
                    </g>
                );
            })}

            {/* dispatch banner */}
            {step.dispatch && (
                <g>
                    <rect x="470" y="150" width="260" height="60" rx="8" fill={step.dispatch === 'dynamic' ? '#3b0764' : '#1e293b'} stroke={step.dispatch === 'dynamic' ? '#a855f7' : '#475569'} strokeWidth="1.4" />
                    <text x="600" y="172" textAnchor="middle" fontSize="11" fontWeight="bold" fill={step.dispatch === 'dynamic' ? '#e9d5ff' : '#cbd5e1'} fontFamily="monospace">{step.dispatch === 'dynamic' ? 'DYNAMIC dispatch' : 'STATIC dispatch'}</text>
                    <text x="600" y="192" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">{step.dispatch === 'dynamic' ? 'resolved at runtime by actual type' : 'resolved at compile time (fixed)'}</text>
                </g>
            )}

            {/* moving token */}
            <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform 0.65s cubic-bezier(0.45,0,0.15,1)', opacity: hop ? 1 : 0 }}>
                <circle r="12" fill="#0369a1" stroke="#e2e8f0" strokeWidth="1.4" />
                <text y="3" textAnchor="middle" fontSize="11" fill="#f8fafc">▶</text>
            </g>
        </svg>
    );
}

function CostView() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-4">
                <div className="text-sm font-bold text-green-300 mb-2">Non-virtual call</div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    <div>call Circle::area</div>
                    <div className="text-slate-600">— address known at compile time</div>
                    <div className="text-slate-600">— can be inlined</div>
                </div>
                <div className="mt-2 text-xs text-green-400">direct · ~1 instruction</div>
            </div>
            <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-4">
                <div className="text-sm font-bold text-purple-300 mb-2">Virtual call</div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    <div>load vptr from object</div>
                    <div>load fn ptr from vtable[0]</div>
                    <div>call through the pointer</div>
                </div>
                <div className="mt-2 text-xs text-purple-400">indirect · +1 deref · blocks inlining</div>
            </div>
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
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    s(1, 'Polymorphism', { target: 'circle', dimOther: true },
        'Polymorphism: one interface, many behaviors. A base-class pointer Shape* s can point at any subclass object. Right now it points at a Circle, and s->draw() draws a circle. The call site never mentions "Circle" — it just says draw().');
    s(1, 'Polymorphism', { target: 'square', dimOther: true },
        'Point the SAME pointer at a Square and run the SAME line s->draw() — now it draws a square. The behavior changed with the object, not the code. The magic question: how does one fixed call site pick the right function at runtime? That mechanism is virtual dispatch.');

    s(2, 'Static vs Dynamic', { dispatch: 'static' },
        'There are two ways to resolve a call. Static (early) dispatch: for non-virtual functions, the compiler knows the exact function at compile time and bakes in a direct call — it can even inline it. Fast, but fixed: it cannot vary by runtime type.');
    s(2, 'Static vs Dynamic', { dispatch: 'dynamic' },
        'Dynamic (late) dispatch: for functions marked virtual, the target is chosen at runtime based on the object\'s ACTUAL type. This is what makes s->draw() do the right thing regardless of what s points to. C++ implements it with two small structures: the vtable and the vptr.');

    s(3, 'The vtable', { showVtable: true, showFns: true },
        'For every class that has virtual functions, the compiler builds one vtable (virtual method table): a fixed array of function pointers, one slot per virtual method. Circle\'s vtable has slot [0] draw → Circle::draw, slot [1] area → Circle::area. Square\'s vtable has the same slots, but pointing at Square\'s versions. One vtable per class, shared by all its objects.');

    s(4, 'The vptr', { showVtable: true, showVptr: true, showFns: true },
        'How does an object reach its vtable? Every polymorphic object carries a hidden pointer — the vptr — usually as its very first member, set up by the constructor. A Circle object\'s vptr points to Circle\'s vtable; a Square object\'s vptr points to Square\'s vtable. The vptr is the object\'s link to "what type am I, really".');

    s(5, 'A Virtual Call', { target: 'circle', dimOther: true, showVtable: true, showVptr: true, showFns: true, hop: 'ptr' },
        'Now watch s->draw() resolve, with s pointing at the Circle. Step 1: follow the pointer s to the object it references.');
    s(5, 'A Virtual Call', { target: 'circle', dimOther: true, showVtable: true, showVptr: true, showFns: true, hop: 'vptr' },
        'Step 2: read the object\'s vptr — it leads to Circle\'s vtable. The object itself told us its type.');
    s(5, 'A Virtual Call', { target: 'circle', dimOther: true, showVtable: true, showVptr: true, showFns: true, hop: 'vtable' },
        'Step 3: index the vtable at the fixed slot for draw (slot [0]). The slot number is known at compile time; only the vtable it lands in varies.');
    s(5, 'A Virtual Call', { target: 'circle', dimOther: true, showVtable: true, showVptr: true, showFns: true, hop: 'fn' },
        'Step 4: that slot holds a pointer to Circle::draw — call it. Done. The whole trick is pointer → vptr → vtable[slot] → function: two extra loads over a direct call, and completely automatic.');

    s(6, 'Override = Different Slot Target', { target: 'square', dimOther: true, showVtable: true, showVptr: true, showFns: true, hop: 'fn' },
        'Overriding is just a different function pointer in the same slot. Repoint s at the Square and run the identical s->draw(): follow the pointer → the Square\'s vptr → Square\'s vtable → slot [0] → Square::draw. Same call site, same slot index, different vtable, different function. That is polymorphism, mechanically.');

    s(7, 'The Cost', { cost: true },
        'Virtual dispatch is cheap but not free. A non-virtual call is a direct jump the compiler can inline. A virtual call adds two dependent memory loads (fetch the vptr, then the function pointer from the vtable) and an indirect call — a handful of cycles, and crucially it usually prevents inlining, which can matter in hot loops. That is why not everything is virtual by default in C++: you pay only where you ask for polymorphism.');

    s(8, 'Recap', {
        recap: true,
        wins: [
            { t: 'vtable per class', d: 'One array of function pointers to the class\'s virtual methods — shared by all its objects.' },
            { t: 'vptr per object', d: 'A hidden pointer (first member) linking each object to its class\'s vtable.' },
            { t: 'Call = ptr → vptr → vtable[slot] → fn', d: 'The slot index is fixed at compile time; the vtable varies with the runtime type.' },
            { t: 'Cheap, not free', d: 'Two extra loads + an indirect call, and it blocks inlining — hence virtual is opt-in.' },
        ],
    }, 'Virtual dispatch demystified: each polymorphic class gets a vtable of function pointers, each object gets a vptr to its class\'s vtable, and a virtual call follows pointer → vptr → vtable[slot] → function. The compile-time-fixed slot index combined with the runtime-chosen vtable is exactly what lets one call site invoke different overrides. It costs a couple of indirections — the price of runtime polymorphism.');

    return steps;
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) return <RecapCards wins={step.wins} />;
    if (step.cost) return <CostView />;
    return <VtableStage step={step} />;
}

const QUIZ = [
    {
        question: 'What is stored in a vtable?',
        options: [
            'The values of the object\'s data members',
            'One function pointer per virtual method of the class',
            'A copy of every object of that class',
            'The class\'s inheritance tree',
        ],
        correct: 1,
        explanation: 'A vtable is a per-class array of function pointers — one slot per virtual method, pointing at that class\'s implementation. All objects of the class share the single vtable; overriding changes which function a slot points to.',
    },
    {
        question: 'During s->draw() on a virtual method, what is fixed at compile time vs decided at runtime?',
        options: [
            'Both are fixed at compile time',
            'The slot index is fixed at compile time; the vtable (via the object\'s vptr) is chosen at runtime',
            'Both are chosen at runtime',
            'The function address is fixed; only the arguments vary',
        ],
        correct: 1,
        explanation: 'The compiler knows draw() is, say, slot [0] — that index is fixed. What varies at runtime is which vtable the object\'s vptr points to, so the same slot resolves to Circle::draw or Square::draw depending on the actual object.',
    },
    {
        question: 'Why is a virtual call more expensive than a non-virtual one?',
        options: [
            'It copies the whole object first',
            'It adds two dependent memory loads (vptr, then vtable slot) plus an indirect call, and usually blocks inlining',
            'It recompiles the function each time',
            'It locks a mutex',
        ],
        correct: 1,
        explanation: 'A non-virtual call is a direct, inlinable jump. A virtual call must load the vptr from the object, load the function pointer from the vtable, then call indirectly — a few cycles, and the indirection typically prevents inlining. That overhead is why virtual is opt-in in C++.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — vtables hold no mysteries now!' : 'Review the explanations to reinforce the concepts.'}
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

export default function PolymorphismAndVirtualDispatchPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Polymorphism &amp; Virtual Dispatch</h1>
                            <p className="text-zinc-300 text-sm mt-1">C++ vtables and vptrs in memory — how one virtual call site dispatches to the right override at runtime</p>
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Dispatch chain</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2], label: 'Static vs dynamic', note: 'compile / runtime' },
                                    { acts: [3], label: 'vtable', note: 'per class' },
                                    { acts: [4], label: 'vptr', note: 'per object' },
                                    { acts: [5, 6], label: 'Call chain', note: 'ptr→vptr→slot→fn' },
                                    { acts: [7], label: 'Cost', note: '+1 deref' },
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
