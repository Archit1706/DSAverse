"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Shuffle, SkipBack, SkipForward,
    Info, Brain, CheckCircle, XCircle, ChevronRight, Code, GitFork
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "How many subsets does a set of n elements have?",
        options: ["n subsets", "n² subsets", "2^n subsets", "n! subsets"],
        correct: 2,
        explanation: "Every element independently contributes a binary choice: include or exclude. With n independent binary choices, there are 2^n total subsets. For 3 elements: 2³ = 8 subsets."
    },
    {
        question: "In the binary decision tree, what does each level represent?",
        options: [
            "A comparison between two elements",
            "An include/exclude decision for one element",
            "A complete subset being built",
            "A backtrack step removing an element"
        ],
        correct: 1,
        explanation: "Each level in the binary decision tree corresponds to one element. At level k we decide whether to include or exclude the k-th element. The left branch = exclude, right branch = include."
    },
    {
        question: "What is the time complexity of generating all subsets?",
        options: ["O(n log n)", "O(n²)", "O(2^n)", "O(n · 2^n)"],
        correct: 3,
        explanation: "There are 2^n subsets, and we spend O(n) work per subset (copying it into the result). So the overall time complexity is O(n · 2^n). Generating each subset takes O(n) time."
    }
];

const nodeDecisions = (level, index) => {
    const d = new Array(level);
    let j = index;
    for (let i = level - 1; i >= 0; i--) {
        d[i] = (j & 1) ? 'include' : 'exclude';
        j >>= 1;
    }
    return d;
};

const generateSteps = (arr) => {
    const steps = [];
    const allSubsets = [];

    const backtrack = (index, current, decisions) => {
        if (index === arr.length) {
            const snap = [...current];
            allSubsets.push(snap);
            steps.push({
                index, currentSubset: snap,
                decisions: [...decisions],
                allSubsets: allSubsets.map(s => [...s]),
                action: 'found',
                explanation: `Found subset: ${snap.length === 0 ? '∅ (empty set)' : '[' + snap.join(', ') + ']'} — recording it.`
            });
            return;
        }

        steps.push({
            index, currentSubset: [...current],
            decisions: [...decisions, 'exclude'],
            allSubsets: allSubsets.map(s => [...s]),
            action: 'exclude',
            explanation: `Element ${arr[index]}: choosing EXCLUDE — recursing without it. Current subset: [${current.join(', ')}]`
        });
        backtrack(index + 1, current, [...decisions, 'exclude']);

        current.push(arr[index]);
        steps.push({
            index, currentSubset: [...current],
            decisions: [...decisions, 'include'],
            allSubsets: allSubsets.map(s => [...s]),
            action: 'include',
            explanation: `Element ${arr[index]}: choosing INCLUDE — recursing with it added. Current subset: [${current.join(', ')}]`
        });
        backtrack(index + 1, current, [...decisions, 'include']);
        current.pop();
    };

    steps.push({
        index: 0, currentSubset: [],
        decisions: [],
        allSubsets: [],
        action: 'start',
        explanation: `Starting power set generation for [${arr.join(', ')}]. For each element we choose: include or exclude.`
    });
    backtrack(0, [], []);
    return steps;
};

export default function SubsetsPowerSetVisualizer() {
    const [arr, setArr] = useState([1, 2, 3]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(800);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(arr));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [arr]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const currentState = stepHistory[currentStep] || {
        index: 0, currentSubset: [], decisions: [], allSubsets: [], action: 'start',
        explanation: 'Click Play to begin subset generation.'
    };

    const visitedPaths = useMemo(() => {
        const visited = new Set();
        for (let i = 0; i <= currentStep && i < stepHistory.length; i++) {
            const d = stepHistory[i]?.decisions || [];
            for (let j = 0; j <= d.length; j++) {
                visited.add(d.slice(0, j).join(','));
            }
        }
        return visited;
    }, [stepHistory, currentStep]);

    const shuffle = () => {
        const vals = Array.from({ length: 3 }, () => Math.floor(Math.random() * 9) + 1);
        setArr(vals);
    };

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) setCurrentStep(0);
        setIsPlaying(p => !p);
    };
    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(s => s + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const q = quizQuestions[quizState.current];
        const correct = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) {
            setQuizState(s => ({ ...s, complete: true }));
        } else {
            setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
        }
    };

    const renderTree = useCallback(() => {
        const n = 3;
        const W = 480;
        const LH = 72;
        const H = n * LH + 90;
        const radii = [17, 15, 13, 11];

        const pos = (level, idx) => ({
            x: (idx + 0.5) * W / Math.pow(2, level),
            y: level * LH + 38
        });

        const cd = currentState.decisions;

        const isOnPath = (d) => d.length <= cd.length && d.every((v, i) => v === cd[i]);
        const isCurrent = (d) => d.length === cd.length && d.every((v, i) => v === cd[i]);

        const nodeFill = (d) => {
            if (isCurrent(d)) return '#eab308';
            if (isOnPath(d)) return '#22c55e';
            if (visitedPaths.has(d.join(','))) return '#14532d';
            return '#1e293b';
        };
        const nodeStroke = (d) => {
            if (isCurrent(d)) return '#ca8a04';
            if (isOnPath(d)) return '#16a34a';
            if (visitedPaths.has(d.join(','))) return '#166534';
            return '#334155';
        };

        const elems = [];

        for (let lv = 0; lv < n; lv++) {
            const count = Math.pow(2, lv);
            for (let idx = 0; idx < count; idx++) {
                const p = pos(lv, idx);
                const lc = pos(lv + 1, idx * 2);
                const rc = pos(lv + 1, idx * 2 + 1);
                const dLeft = nodeDecisions(lv + 1, idx * 2);
                const dRight = nodeDecisions(lv + 1, idx * 2 + 1);
                const activL = isOnPath(dLeft);
                const activR = isOnPath(dRight);

                elems.push(
                    <line key={`el-${lv}-${idx}`} x1={p.x} y1={p.y} x2={lc.x} y2={lc.y}
                        stroke={activL ? '#22c55e' : '#334155'} strokeWidth={activL ? 2 : 1} />,
                    <text key={`etl-${lv}-${idx}`} x={(p.x * 2 + lc.x) / 3} y={(p.y * 2 + lc.y) / 3 - 4}
                        fontSize="8" fill={activL ? '#86efac' : '#475569'} textAnchor="middle">E</text>,
                    <line key={`er-${lv}-${idx}`} x1={p.x} y1={p.y} x2={rc.x} y2={rc.y}
                        stroke={activR ? '#22c55e' : '#334155'} strokeWidth={activR ? 2 : 1} />,
                    <text key={`etr-${lv}-${idx}`} x={(p.x * 2 + rc.x) / 3} y={(p.y * 2 + rc.y) / 3 - 4}
                        fontSize="8" fill={activR ? '#86efac' : '#475569'} textAnchor="middle">I</text>
                );
            }
        }

        for (let lv = 0; lv <= n; lv++) {
            const count = Math.pow(2, lv);
            for (let idx = 0; idx < count; idx++) {
                const p = pos(lv, idx);
                const d = nodeDecisions(lv, idx);
                const r = radii[lv] || 9;
                const fill = nodeFill(d);
                const stroke = nodeStroke(d);
                const isLeaf = lv === n;
                const isFound = isLeaf && currentState.allSubsets.some(s => {
                    const expected = d.map((dec, i) => dec === 'include' ? arr[i] : null).filter(v => v !== null);
                    return s.length === expected.length && s.every((v, i) => v === expected[i]);
                });

                elems.push(
                    <circle key={`n-${lv}-${idx}`} cx={p.x} cy={p.y} r={r}
                        fill={isFound ? '#15803d' : fill}
                        stroke={isFound ? '#22c55e' : stroke}
                        strokeWidth="2" />
                );

                if (isLeaf) {
                    const subset = d.map((dec, i) => dec === 'include' ? arr[i] : null).filter(v => v !== null);
                    const label = subset.length === 0 ? '∅' : `{${subset.join(',')}}`;
                    elems.push(
                        <text key={`nl-${lv}-${idx}`} x={p.x} y={p.y + r + 13}
                            fontSize="8.5" fill={isFound ? '#4ade80' : '#64748b'} textAnchor="middle">{label}</text>
                    );
                }
            }
        }

        return (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
                {elems}
            </svg>
        );
    }, [currentState, visitedPaths, arr]);

    const actionColor = {
        start: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
        exclude: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
        include: 'bg-green-500/10 border-green-500/20 text-green-300',
        found: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    };

    const q = quizQuestions[quizState.current];

    const codeExample = `def subsets(nums):
    result = []

    def backtrack(index, current):
        if index == len(nums):
            result.append(current[:])   # record subset
            return
        # Exclude nums[index]
        backtrack(index + 1, current)
        # Include nums[index]
        current.append(nums[index])
        backtrack(index + 1, current)
        current.pop()                   # backtrack

    backtrack(0, [])
    return result

# [${arr.join(', ')}] → ${Math.pow(2, arr.length)} subsets`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/recursion" className="flex items-center text-white/80 hover:text-white transition-colors text-sm">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Recursion
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Subsets / Power Set</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            At each element, make a binary choice — include or exclude. Watch the decision tree grow as all 2ⁿ subsets emerge.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><GitFork className="h-4 w-4" /> Binary Decision Tree</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Code className="h-4 w-4" /> O(n · 2ⁿ) time</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Brain className="h-4 w-4" /> {Math.pow(2, arr.length)} subsets for n={arr.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Visualization panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <GitFork className="h-5 w-5 text-green-400" /> Binary Decision Tree
                                </h3>
                                <div className="flex gap-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> current</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> on path</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-900 border border-green-700 inline-block" /> visited</span>
                                </div>
                            </div>

                            {/* Array header */}
                            <div className="flex justify-center gap-3 mb-4">
                                {arr.map((v, i) => {
                                    const dec = currentState.decisions[i];
                                    const isIncluded = dec === 'include';
                                    const isExcluded = dec === 'exclude';
                                    const isCurrent = i === currentState.index && currentState.action !== 'found' && currentState.action !== 'start';
                                    return (
                                        <div key={i} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition-all duration-300
                                            ${isCurrent ? 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110' :
                                                isIncluded ? 'bg-green-500 border-green-400 text-white' :
                                                    isExcluded ? 'bg-slate-800 border-slate-700 text-slate-500' :
                                                        'bg-slate-700 border-slate-600 text-slate-100'}`}>
                                            {v}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center text-xs text-slate-500 gap-3 mb-5">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> included</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-700 inline-block" /> excluded</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400 inline-block" /> deciding</span>
                            </div>

                            {/* SVG Tree */}
                            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                                <div className="flex justify-between text-xs text-slate-500 mb-1 px-1">
                                    <span>E = exclude &nbsp; I = include</span>
                                    <span>Leaves show resulting subset</span>
                                </div>
                                {renderTree()}
                            </div>

                            {/* Current subset */}
                            <div className={`mt-4 rounded-lg p-3 border ${actionColor[currentState.action] || actionColor.start}`}>
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                                    <p className="text-sm leading-relaxed">{currentState.explanation}</p>
                                </div>
                            </div>
                        </div>

                        {/* Found subsets */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-base font-bold text-white mb-3">
                                Subsets Found: <span className="text-green-400">{currentState.allSubsets.length}</span>
                                <span className="text-slate-500 font-normal text-sm ml-2">/ {Math.pow(2, arr.length)} total</span>
                            </h3>
                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                                {currentState.allSubsets.length === 0 && (
                                    <span className="text-slate-600 text-sm italic">None found yet...</span>
                                )}
                                {currentState.allSubsets.map((s, i) => (
                                    <span key={i} className="bg-green-500/15 border border-green-500/30 text-green-300 px-2.5 py-1 rounded-lg text-xs font-mono">
                                        {s.length === 0 ? '∅' : `{${s.join(',')}}`}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Code className="h-5 w-5 text-green-400" /> Recursive Backtracking (Python)
                            </h3>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Controls */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Array: [{arr.join(', ')}]
                                    </label>
                                    <button onClick={shuffle} disabled={isPlaying}
                                        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Shuffle className="h-4 w-4" /> Shuffle Values
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms / step</label>
                                    <input type="range" min="200" max="2000" step="100" value={speed}
                                        onChange={e => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>Fast</span><span>Slow</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handlePlay}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center font-medium">
                                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button onClick={handleReset}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center">
                                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={stepBackward} disabled={currentStep === 0 || isPlaying}
                                        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm">
                                        <SkipBack className="h-4 w-4 mr-1" /> Prev
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep === stepHistory.length - 1 || isPlaying}
                                        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm">
                                        Next <SkipForward className="h-4 w-4 ml-1" />
                                    </button>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span><span>{currentStep + 1} / {stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${stepHistory.length ? ((currentStep + 1) / stepHistory.length) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step info */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Current State</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Element index</span>
                                    <span className="text-green-300 font-mono">{currentState.index} / {arr.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Current subset</span>
                                    <span className="text-green-300 font-mono">
                                        {currentState.currentSubset.length === 0 ? '∅' : `{${currentState.currentSubset.join(',')}}`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Action</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                                        ${currentState.action === 'include' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                                            currentState.action === 'exclude' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                                                currentState.action === 'found' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                                                    'bg-slate-700 text-slate-400'}`}>
                                        {currentState.action.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Depth</span>
                                    <span className="text-green-300 font-mono">{currentState.decisions.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Complexity</h3>
                            <div className="space-y-2">
                                {[
                                    ['Time', 'O(n · 2ⁿ)', 'green'],
                                    ['Space', 'O(n · 2ⁿ)', 'emerald'],
                                    ['Subsets', `2^${arr.length} = ${Math.pow(2, arr.length)}`, 'purple'],
                                ].map(([label, val, color]) => (
                                    <div key={label} className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">{label}</span>
                                        <code className={`text-${color}-400 text-xs bg-${color}-500/10 px-2 py-0.5 rounded`}>{val}</code>
                                    </div>
                                ))}
                                <div className="mt-3 text-xs text-slate-500 leading-relaxed">
                                    <ChevronRight className="h-3 w-3 inline text-green-500 mr-1" />Used in: combination sum, letter combos, unique paths, interview problems requiring all combinations.
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-green-500/30 shadow-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="h-5 w-5 text-green-400" />
                                <h3 className="text-base font-bold text-white">Test Yourself</h3>
                                {!quizState.complete && (
                                    <span className="ml-auto text-xs text-slate-500">Q{quizState.current + 1}/{quizQuestions.length}</span>
                                )}
                            </div>
                            {quizState.complete ? (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-green-400 mb-2">{quizState.score}/{quizQuestions.length}</div>
                                    <p className="text-slate-400 text-sm mb-3">
                                        {quizState.score === quizQuestions.length ? 'Perfect! You understand power sets.' : 'Good effort! Review the tree visualization.'}
                                    </p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="bg-green-700 hover:bg-green-600 text-white py-1.5 px-4 rounded-lg text-xs font-medium transition-colors">
                                        Retry Quiz
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
                                    <div className="space-y-1.5 mb-3">
                                        {q.options.map((opt, idx) => {
                                            let cls = 'bg-slate-800 border-slate-600 text-slate-300 hover:border-green-500';
                                            if (quizState.answered) {
                                                if (idx === q.correct) cls = 'bg-green-500/20 border-green-400 text-green-300';
                                                else if (idx === quizState.selected) cls = 'bg-red-500/20 border-red-400 text-red-300';
                                                else cls = 'bg-slate-800 border-slate-700 text-slate-500 opacity-50';
                                            }
                                            return (
                                                <button key={idx} onClick={() => handleQuizAnswer(idx)} disabled={quizState.answered}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>
                                                    <span className="font-mono opacity-60 mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <>
                                            <div className={`rounded-lg p-3 mb-2 ${quizState.selected === q.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {quizState.selected === q.correct
                                                        ? <CheckCircle className="h-4 w-4 text-green-400" />
                                                        : <XCircle className="h-4 w-4 text-red-400" />}
                                                    <span className={`text-xs font-semibold ${quizState.selected === q.correct ? 'text-green-300' : 'text-red-300'}`}>
                                                        {quizState.selected === q.correct ? 'Correct!' : 'Not quite.'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                            </div>
                                            <button onClick={nextQuestion} className="w-full bg-green-700 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">
                                                {quizState.current + 1 >= quizQuestions.length ? 'See Score' : 'Next Question'}
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
