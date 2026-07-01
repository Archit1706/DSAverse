"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    GitBranch, Diamond, ListOrdered, Search, ArrowUp, CheckCircle,
} from 'lucide-react';

const ACTS = [
    { id: 1, label: 'Inherit',    icon: GitBranch   },
    { id: 2, label: 'Diamond',    icon: Diamond     },
    { id: 3, label: 'MRO',        icon: ListOrdered },
    { id: 4, label: 'C3',         icon: ListOrdered },
    { id: 5, label: 'Lookup',     icon: Search      },
    { id: 6, label: 'super()',    icon: ArrowUp      },
    { id: 7, label: 'Recap',      icon: CheckCircle },
];

const NODES = {
    A: { x: 150, y: 55,  methods: ['greet'] },
    B: { x: 68,  y: 170, methods: [] },
    C: { x: 232, y: 170, methods: ['greet'] },
    D: { x: 150, y: 285, methods: [] },
};
const EDGES = [['D', 'B'], ['D', 'C'], ['B', 'A'], ['C', 'A']];
const MRO = ['D', 'B', 'C', 'A', 'object'];

function InheritStage({ step }) {
    const show = step.nodes || ['A', 'B', 'C', 'D'];
    const nodeState = (id) => {
        if (step.found === id) return { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0' };
        if (step.lookupAt === id) return { fill: '#3f3f46', stroke: '#e4e4e7', text: '#ffffff' };
        if (step.superTo === id) return { fill: '#3b0764', stroke: '#a855f7', text: '#e9d5ff' };
        return { fill: '#1e293b', stroke: '#475569', text: '#cbd5e1' };
    };
    const tokIdx = step.lookupIdx;
    const ty = tokIdx != null ? 70 + tokIdx * 46 + 19 : -60;

    return (
        <svg viewBox="0 0 740 380" width="100%" className="max-h-[400px] select-none">
            <style>{`
                .in-node { transition: fill .4s ease, stroke .4s ease; }
                .in-fade { transition: opacity .5s ease; }
            `}</style>
            <defs>
                <marker id="inah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* edges (child → parent, arrow up) */}
            {EDGES.filter(([c, p]) => show.includes(c) && show.includes(p)).map(([c, p], i) => {
                const a = NODES[c], b = NODES[p];
                const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
                const ux = dx / len, uy = dy / len, r = 26;
                return <line key={i} x1={a.x + ux * r} y1={a.y + uy * r} x2={b.x - ux * r} y2={b.y - uy * r}
                    stroke="#475569" strokeWidth="1.6" markerEnd="url(#inah)" />;
            })}

            {/* nodes */}
            {show.map(id => {
                const n = NODES[id], st = nodeState(id);
                return (
                    <g key={id} className="in-node">
                        <circle cx={n.x} cy={n.y} r="26" fill={st.fill} stroke={st.stroke} strokeWidth={step.lookupAt === id || step.found === id || step.superTo === id ? 2.4 : 1.5} />
                        <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="16" fontWeight="bold" fill={st.text} fontFamily="monospace">{id}</text>
                        {n.methods.includes('greet') && (
                            <text x={n.x} y={n.y + 42} textAnchor="middle" fontSize="9" fill={step.found === id ? '#4ade80' : '#64748b'} fontFamily="monospace">greet()</text>
                        )}
                    </g>
                );
            })}
            <text x="150" y="360" textAnchor="middle" fontSize="9" fill="#475569" fontFamily="monospace">arrows point child → parent</text>

            {/* MRO list */}
            {step.mro && (
                <g className="in-fade">
                    <text x="530" y="46" textAnchor="middle" fontSize="11" fill="#93c5fd" fontFamily="monospace">D.__mro__  (linear order)</text>
                    {MRO.map((m, i) => {
                        if (i >= step.mroReveal) return null;
                        const isCur = step.lookupIdx === i;
                        const isFound = step.found === m;
                        return (
                            <g key={m} className="in-node">
                                <rect x="440" y={70 + i * 46} width="180" height="38" rx="8"
                                    fill={isFound ? '#14532d' : isCur ? '#3f3f46' : '#1e293b'}
                                    stroke={isFound ? '#22c55e' : isCur ? '#e4e4e7' : '#334155'} strokeWidth={isCur || isFound ? 2.2 : 1.3} />
                                <text x="458" y={94 + i * 46} fontSize="13" fontWeight="bold" fill={isFound ? '#bbf7d0' : '#e2e8f0'} fontFamily="monospace">{i}. {m}</text>
                                {NODES[m]?.methods.includes('greet') && <text x="602" y={94 + i * 46} textAnchor="end" fontSize="9" fill={isFound ? '#4ade80' : '#64748b'} fontFamily="monospace">greet</text>}
                                {i < step.mroReveal - 1 && i < MRO.length - 1 && <line x1="530" y1={108 + i * 46} x2="530" y2={70 + (i + 1) * 46} stroke="#334155" strokeWidth="1.2" />}
                            </g>
                        );
                    })}
                    {/* walking token */}
                    <g style={{ transform: `translate(420px, ${ty}px)`, transition: 'transform 0.6s cubic-bezier(0.45,0,0.15,1)', opacity: tokIdx != null ? 1 : 0 }}>
                        <circle r="12" fill="#0369a1" stroke="#e2e8f0" strokeWidth="1.4" />
                        <text y="3" textAnchor="middle" fontSize="12" fill="#f8fafc">▶</text>
                    </g>
                </g>
            )}

            {/* super arrow note */}
            {step.superTo && (
                <text x="530" y="350" textAnchor="middle" fontSize="10" fill="#c4b5fd" fontFamily="monospace">super() → next in MRO → {step.superTo}</text>
            )}
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
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    s(1, 'Inheritance', { nodes: ['A', 'B'] },
        'Inheritance lets one class build on another. Here B inherits from A (B is-a A), so a B instance automatically has A\'s methods — greet() lives on A, but b.greet() works. If B defines its own greet(), it overrides A\'s. Simple, single-parent inheritance is a straight chain: B → A → object.');

    s(2, 'The Diamond Problem', { nodes: ['A', 'B', 'C', 'D'] },
        'Multiple inheritance creates the classic diamond: D inherits from both B and C, and both B and C inherit from A. Now a hard question: when you call d.greet(), and both C and A define greet(), which one wins? And is A\'s __init__ run once or twice? Naive "depth-first" traversal gives inconsistent, buggy answers. Python needs a single, well-defined order.');

    s(3, 'Method Resolution Order', { nodes: ['A', 'B', 'C', 'D'], mro: true, mroReveal: 5 },
        'Python answers with a Method Resolution Order (MRO): one flat, linear list of classes to search, computed once per class. For D it is [D, B, C, A, object]. Every attribute lookup simply scans this list left to right and stops at the first match. No ambiguity, and each class appears exactly once — so A\'s __init__ runs once, not twice.');

    s(4, 'C3 Linearization', { nodes: ['A', 'B', 'C', 'D'], mro: true, mroReveal: 5 },
        'The MRO is built by the C3 linearization algorithm. Intuitively: a class always comes before its parents, and the order of parents in the class definition is preserved. C3 merges the parents\' MROs while respecting both rules — which is why D comes first, then B and C (in declaration order), then their shared A, then object. If C3 cannot find a consistent order, Python refuses to even create the class (a TypeError).');

    s(5, 'Lookup Walks the MRO', { nodes: ['A', 'B', 'C', 'D'], mro: true, mroReveal: 5, lookupIdx: 0, lookupAt: 'D' },
        'Let\'s resolve d.greet() with C overriding greet(). The lookup starts at the front of the MRO: D. Does D define greet()? No — keep going.');
    s(5, 'Lookup Walks the MRO', { nodes: ['A', 'B', 'C', 'D'], mro: true, mroReveal: 5, lookupIdx: 1, lookupAt: 'B' },
        'Next, B. No greet() here either. On to the next entry.');
    s(5, 'Lookup Walks the MRO', { nodes: ['A', 'B', 'C', 'D'], mro: true, mroReveal: 5, lookupIdx: 2, lookupAt: 'C', found: 'C' },
        'Next, C — and C defines greet(). Found! The search stops immediately; C\'s greet() runs, even though A also has one. Because C precedes A in the MRO, C wins. This is the entire rule: first match along the MRO. Change the inheritance order and the MRO — and the winner — can change.');

    s(6, 'super() Follows the MRO', { nodes: ['A', 'B', 'C', 'D'], mro: true, mroReveal: 5, lookupAt: 'C', superTo: 'A' },
        'super() is widely misunderstood as "call my parent". It actually means "call the NEXT class in the MRO, after me". Inside C\'s greet(), super().greet() does not blindly go to C\'s declared base — it goes to whatever follows C in the CURRENT object\'s MRO, which here is A. This is what makes cooperative multiple inheritance work: each class calls super() and the whole diamond gets visited once, in MRO order, with no class skipped or repeated.');

    s(7, 'Recap', {
        recap: true,
        wins: [
            { t: 'MRO = one linear search order', d: 'Every class has a single, precomputed list (its __mro__) that attribute lookup scans front to back.' },
            { t: 'C3 linearization builds it', d: 'Children before parents, declaration order preserved; inconsistent hierarchies are rejected at class-creation time.' },
            { t: 'First match wins', d: 'd.greet() stops at the first class in the MRO that defines greet() — order, not depth, decides.' },
            { t: 'super() = next in MRO', d: 'Not "the parent" — the next class after the current one, enabling cooperative multiple inheritance.' },
        ],
    }, 'Inheritance in Python is governed by the MRO: a single linear order, computed by C3 linearization, that turns a tangled diamond into an unambiguous search list. Attribute lookup takes the first match along it; super() steps to the next entry rather than a fixed parent. Understand the MRO and multiple inheritance stops being mysterious — you can read any resolution straight off the list.');

    return steps;
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) return <RecapCards wins={step.wins} />;
    return <InheritStage step={step} />;
}

const QUIZ = [
    {
        question: 'For class D(B, C) where B(A) and C(A), what is D\'s MRO?',
        options: ['[D, A, B, C, object]', '[D, B, A, C, A, object]', '[D, B, C, A, object]', '[D, C, B, A, object]'],
        correct: 2,
        explanation: 'C3 linearization gives [D, B, C, A, object]: the class first, then its parents in declaration order (B before C), then their shared ancestor A once, then object. A appears a single time — so its __init__ runs once.',
    },
    {
        question: 'Both C and A define greet(). With MRO [D, B, C, A, object], which runs for d.greet()?',
        options: ['A.greet — it is the original', 'C.greet — C precedes A in the MRO', 'Both run, A then C', 'It raises an ambiguity error'],
        correct: 1,
        explanation: 'Lookup scans the MRO front to back and stops at the first match. C comes before A, so C.greet() runs and the search stops. Order in the MRO, not depth in the tree, decides the winner.',
    },
    {
        question: 'What does super() actually refer to inside a method?',
        options: [
            'The class\'s directly declared base class, always',
            'The next class after the current one in the object\'s MRO',
            'The root of the hierarchy (object)',
            'A copy of the parent instance',
        ],
        correct: 1,
        explanation: 'super() delegates to the next class in the current instance\'s MRO — not a fixed parent. This is what makes cooperative multiple inheritance work: each class\'s super() call chains to the next entry, visiting the whole diamond once in MRO order.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you can read any MRO now!' : 'Review the explanations to reinforce the concepts.'}
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

export default function InheritanceAndMROPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Inheritance &amp; MRO</h1>
                            <p className="text-zinc-300 text-sm mt-1">The diamond problem, C3 linearization, how attribute lookup walks the MRO, and what super() really does</p>
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
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Act {step?.act} of 7</span>
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Resolution</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2], label: 'Diamond', note: 'ambiguity' },
                                    { acts: [3, 4], label: 'MRO', note: '[D,B,C,A,object]' },
                                    { acts: [5], label: 'Lookup', note: 'first match wins' },
                                    { acts: [6], label: 'super()', note: 'next in MRO' },
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
