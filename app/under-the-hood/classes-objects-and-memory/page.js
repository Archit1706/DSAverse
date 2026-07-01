"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    FileCode, Box, Layers, Search, ArrowUp, Cpu, Boxes, CheckCircle,
} from 'lucide-react';

const ACTS = [
    { id: 1, label: 'Blueprint',  icon: FileCode   },
    { id: 2, label: 'Instance',   icon: Box        },
    { id: 3, label: '__dict__',   icon: Layers     },
    { id: 4, label: 'Lookup',     icon: Search     },
    { id: 5, label: 'Chain',      icon: ArrowUp     },
    { id: 6, label: 'self',       icon: Cpu        },
    { id: 7, label: 'Many',       icon: Boxes      },
    { id: 8, label: 'Recap',      icon: CheckCircle},
];

// instance layouts
const ONE = [{ id: 'p', name: 'p', x: 285, dict: { x: '1', y: '2' } }];
const THREE = [
    { id: 'p1', name: 'p1', x: 40,  dict: { x: '1', y: '2' } },
    { id: 'p2', name: 'p2', x: 290, dict: { x: '5', y: '9' } },
    { id: 'p3', name: 'p3', x: 540, dict: { x: '0', y: '0' } },
];

function ClassMemStage({ step }) {
    const insts = step.instances === 3 ? THREE : ONE;
    const showInsts = step.instances > 0;
    const foundClass = step.lookup && step.lookup.found === 'class' && step.lookup.at === 'class';
    const foundInst  = step.lookup && step.lookup.found === 'instance' && step.lookup.at === 'instance';

    // token position
    const tok = step.lookup && step.lookup.at;
    const tx = tok === 'class' ? 370 : tok === 'instance' ? (insts[0].x + 80) : -60;
    const ty = tok === 'class' ? 150 : tok === 'instance' ? 250 : -60;

    return (
        <svg viewBox="0 0 740 380" width="100%" className="max-h-[400px] select-none">
            <style>{`
                .cm-fade { transition: opacity .5s ease; }
                .cm-box { transition: fill .4s ease, stroke .4s ease; }
                @keyframes cmdash { to { stroke-dashoffset: -16; } }
                .cm-flow { stroke-dasharray: 5 4; animation: cmdash .6s linear infinite; }
            `}</style>
            <defs>
                <marker id="cmah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* Class object */}
            <rect x="250" y="34" width="240" height="132" rx="10" fill="#12203a" stroke={foundClass ? '#22c55e' : '#3b82f6'} strokeWidth={foundClass ? 2.4 : 1.6} className="cm-box" />
            <text x="370" y="26" textAnchor="middle" fontSize="11" fill="#93c5fd" fontFamily="monospace">class Point  (one class object)</text>
            <text x="266" y="58" fontSize="10" fill="#64748b" fontFamily="monospace">methods (shared):</text>
            {['__init__(self, x, y)', 'move(self, dx, dy)'].map((m, i) => {
                const hot = foundClass && step.lookup.attr === 'move' && m.startsWith('move');
                return (
                    <g key={i}>
                        <rect x="264" y={66 + i * 26} width="212" height="22" rx="4" className="cm-box"
                            fill={hot ? '#14532d' : '#0b1220'} stroke={hot ? '#22c55e' : '#334155'} strokeWidth={hot ? 1.8 : 1} />
                        <text x="272" y={81 + i * 26} fontSize="10" fill={hot ? '#bbf7d0' : '#cbd5e1'} fontFamily="monospace">{m}</text>
                    </g>
                );
            })}
            <text x="266" y="138" fontSize="10" fill="#64748b" fontFamily="monospace">kind = &quot;2D&quot;  (class attribute)</text>
            <text x="266" y="156" fontSize="9" fill="#475569" fontFamily="monospace">defined once · never copied per object</text>

            {/* Instances */}
            <g className="cm-fade" style={{ opacity: showInsts ? 1 : 0 }}>
                {insts.map(inst => {
                    const isLookupInst = step.lookup && step.lookup.at === 'instance' && inst.id === insts[0].id;
                    return (
                        <g key={inst.id}>
                            {/* __class__ arrow up to class */}
                            <line x1={inst.x + 80} y1="248" x2={Math.min(Math.max(inst.x + 80, 300), 440)} y2="168"
                                stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#cmah)" opacity="0.7" className={step.act === 5 && isLookupInst ? 'cm-flow' : ''} />

                            <rect x={inst.x} y="248" width="160" height="118" rx="10" fill="#0f172a"
                                stroke={foundInst && inst.id === insts[0].id ? '#22c55e' : '#475569'} strokeWidth={foundInst && inst.id === insts[0].id ? 2.2 : 1.4} className="cm-box" />
                            <text x={inst.x + 80} y="266" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#e2e8f0" fontFamily="monospace">{inst.name}  (instance)</text>
                            <text x={inst.x + 10} y="286" fontSize="9" fill="#64748b" fontFamily="monospace">__class__ → Point</text>
                            <text x={inst.x + 10} y="304" fontSize="9" fill="#64748b" fontFamily="monospace">__dict__ (own data):</text>
                            {Object.entries(inst.dict).map(([k, v], i) => {
                                const hot = foundInst && inst.id === insts[0].id && step.lookup.attr === k;
                                return (
                                    <g key={k}>
                                        <rect x={inst.x + 12} y={312 + i * 24} width="136" height="20" rx="4" className="cm-box"
                                            fill={hot ? '#14532d' : '#1e293b'} stroke={hot ? '#22c55e' : '#334155'} strokeWidth={hot ? 1.8 : 1} />
                                        <text x={inst.x + 20} y={326 + i * 24} fontSize="10" fill={hot ? '#bbf7d0' : '#cbd5e1'} fontFamily="monospace">{k} = {v}</text>
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </g>

            {/* self binding note */}
            {step.selfBind && (
                <g>
                    <rect x="60" y="188" width="620" height="34" rx="8" fill="#3b0764" stroke="#a855f7" strokeWidth="1.4" />
                    <text x="370" y="209" textAnchor="middle" fontSize="12" fill="#e9d5ff" fontFamily="monospace">p.move(3, 4)   ≡   Point.move(p, 3, 4)   — self = p</text>
                </g>
            )}

            {/* lookup token */}
            <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform 0.7s cubic-bezier(0.45,0,0.15,1)', opacity: tok ? 1 : 0 }}>
                <circle r="15" fill="#0369a1" stroke="#e2e8f0" strokeWidth="1.5" />
                <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">.{step.lookup ? step.lookup.attr : ''}</text>
            </g>
        </svg>
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
    const s = (act, actName, data, explanation) => steps.push({ act, actName, instances: 0, ...data, explanation });

    s(1, 'The Blueprint', { instances: 0 },
        'When Python runs a class statement, it creates ONE object in memory: the class itself. A class is not a template that gets stamped out — it is a live object that holds the shared machinery: the methods, and any class-level attributes. Here Point holds __init__, move, and a class attribute kind.');
    s(1, 'The Blueprint', { instances: 0 },
        'The key idea to hold onto: methods live on the class, defined exactly once, no matter how many objects you later create. The class is the single home for behavior. Instances, which we build next, hold only data.');

    s(2, 'Creating an Instance', { instances: 1 },
        'p = Point(1, 2) creates an instance. It is a small, separate object with two special links: __class__, a pointer back to the Point class object (so it knows its type and where to find methods), and __dict__, its own private dictionary of attributes. __init__ ran and stored x=1, y=2 into that dict.');
    s(2, 'Creating an Instance', { instances: 1 },
        'Notice what the instance does NOT contain: any copy of move or __init__. Those stay on the class. The instance is essentially just its __dict__ plus a __class__ pointer. This is why creating objects is cheap and why all instances stay in sync if you change a method on the class.');

    s(3, 'Data vs Behavior', { instances: 1, lookup: null },
        'This split is the whole memory model in one picture: instance __dict__ holds the per-object DATA (x, y — different for every object); the class holds the shared BEHAVIOR (methods — one copy for all). Attributes you assign like self.x land in the instance dict; def-ined methods land on the class.');

    s(4, 'Attribute Lookup — instance', { instances: 1, lookup: { attr: 'x', at: 'instance', found: 'instance' } },
        'What actually happens when you write p.x? Python performs an attribute lookup. Step one: check the instance\'s own __dict__. x is there (value 1) — found immediately. Instance data shadows everything else, so per-object attributes win.');

    s(5, 'Attribute Lookup — the chain', { instances: 1, lookup: { attr: 'move', at: 'instance', found: 'class' } },
        'Now p.move. Step one again: check the instance __dict__ — but there is no "move" there, only x and y. Miss. So the lookup does not give up…');
    s(5, 'Attribute Lookup — the chain', { instances: 1, lookup: { attr: 'move', at: 'class', found: 'class' } },
        '…it follows the __class__ pointer up to Point and searches there. move is found on the class. (If it were missing, Python would keep walking up the base classes in MRO order — the subject of the Inheritance visualizer.) This instance-then-class chain is exactly why one method definition serves every object.');

    s(6, 'Methods and self', { instances: 1, selfBind: true },
        'A method found on the class is just a function. p.move(3, 4) is really Point.move(p, 3, 4): Python automatically passes the instance as the first argument, which the method calls self. That is the entire mystery of self — it is simply the object the method was looked up on, threaded in for you. The method lives once on the class; self is how it knows which instance\'s data to work on.');

    s(7, 'Many Objects, One Class', { instances: 3 },
        'Create three points and the economy of the model is obvious: three instances, each with its own small __dict__ (its own x and y), but all three share the single Point class and its single copy of move. A million instances would be a million little dicts plus exactly one method table.');
    s(7, 'Many Objects, One Class', { instances: 3 },
        'This is why per-instance memory is tiny and why patching a method on the class instantly affects every existing object — they all resolve move through the same class. (For huge numbers of instances, __slots__ can drop even the per-instance __dict__ and store attributes in a fixed compact layout.)');

    s(8, 'Recap', {
        recap: true,
        wins: [
            { t: 'A class is one live object', d: 'It holds the methods and class attributes — defined once, shared by all instances.' },
            { t: 'An instance = __dict__ + __class__', d: 'Its own data dictionary plus a pointer to its class. No method copies.' },
            { t: 'Lookup walks instance → class → bases', d: 'Instance data shadows class attributes; methods are found by following __class__.' },
            { t: 'self is just the instance', d: 'p.move() ≡ Point.move(p); the method lives on the class, self picks the object.' },
        ],
    }, 'That is the Python object model. A class is a single object holding shared behavior; each instance is a lightweight bundle of its own data (__dict__) with a link (__class__) to its class. Attribute access walks instance-first, then the class, then bases. Methods live once and receive the instance as self. Simple pieces — dicts and pointers — compose into the whole of Python OOP.');

    return steps;
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) return <RecapCards wins={step.wins} />;
    return <ClassMemStage step={step} />;
}

const QUIZ = [
    {
        question: 'Where do an instance\'s methods physically live?',
        options: [
            'Copied into each instance\'s __dict__',
            'On the class object — one copy, shared by all instances',
            'In a global method table keyed by object id',
            'Inline in the machine code of each call site',
        ],
        correct: 1,
        explanation: 'Methods are defined once on the class object. Instances hold only their own data (__dict__) plus a __class__ pointer. p.move() is found by following that pointer to the class — which is why patching a method affects every instance instantly.',
    },
    {
        question: 'When you access p.x, what does Python check first?',
        options: [
            'The class attributes',
            'The base classes (MRO)',
            'The instance\'s own __dict__',
            'A global variable named x',
        ],
        correct: 2,
        explanation: 'Attribute lookup checks the instance __dict__ first, so per-object data shadows class attributes. Only on a miss does it follow __class__ to the class and then up the base classes.',
    },
    {
        question: 'What is self, really?',
        options: [
            'A special keyword the interpreter reserves',
            'A copy of the class',
            'Just the instance the method was looked up on, passed as the first argument',
            'A pointer to the method\'s bytecode',
        ],
        correct: 2,
        explanation: 'p.move(3,4) is sugar for Point.move(p, 3, 4). The method is an ordinary function on the class; Python passes the instance as the first argument, conventionally named self. That is how one shared method knows which object\'s data to use.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — the object model is yours!' : 'Review the explanations to reinforce the concepts.'}
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

export default function ClassesObjectsAndMemoryPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Classes, Objects &amp; Memory</h1>
                            <p className="text-zinc-300 text-sm mt-1">How Python classes and instances live in memory — __dict__, the __class__ pointer, and the method-lookup chain</p>
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Object model</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1], label: 'Class object', note: 'holds methods' },
                                    { acts: [2], label: 'Instance', note: '__dict__ + __class__' },
                                    { acts: [3, 4], label: 'Instance data', note: 'shadows class' },
                                    { acts: [5], label: 'Lookup chain', note: 'instance → class' },
                                    { acts: [6], label: 'self', note: '= the instance' },
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
