"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward,
    Shuffle, Info, Brain, CheckCircle, XCircle, Code, Navigation, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// 1 = open, 0 = wall
const PRESETS = [
    {
        label: "Classic",
        maze: [
            [1, 0, 0, 0, 0],
            [1, 1, 0, 1, 0],
            [0, 1, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 1, 1],
        ],
    },
    {
        label: "Winding",
        maze: [
            [1, 1, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 1, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 1, 1],
        ],
    },
    {
        label: "Dead Ends",
        maze: [
            [1, 0, 0, 1, 0],
            [1, 1, 0, 1, 0],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 1, 0],
            [0, 1, 0, 1, 1],
        ],
    },
    {
        label: "Two Paths",
        maze: [
            [1, 1, 0, 0, 0],
            [1, 1, 1, 1, 0],
            [0, 0, 0, 1, 0],
            [0, 1, 1, 1, 1],
            [0, 1, 0, 0, 1],
        ],
    },
];

const DIRS = [[1,0],[0,1],[-1,0],[0,-1]];
const DIR_NAMES = ['Down','Right','Up','Left'];

const generateSteps = (maze) => {
    const steps = [];
    const n = maze.length;
    const deadEnds = new Set();
    let foundPath = null;

    const dfs = (r, c, path) => {
        if (foundPath) return;
        const key = `${r}-${c}`;
        const newPath = [...path, [r, c]];
        const pathKeySet = new Set(newPath.map(([pr, pc]) => `${pr}-${pc}`));

        if (r === n - 1 && c === n - 1) {
            foundPath = newPath;
            steps.push({
                currentCell: [r, c],
                pathCells: newPath,
                deadEndKeys: new Set(deadEnds),
                action: 'found',
                explanation: `Reached exit at (${r},${c})! Solution path found in ${newPath.length} steps.`,
            });
            return;
        }

        steps.push({
            currentCell: [r, c],
            pathCells: newPath,
            deadEndKeys: new Set(deadEnds),
            action: 'explore',
            explanation: `Exploring (${r},${c}) — trying all ${DIRS.length} directions.`,
        });

        let moved = false;
        for (let i = 0; i < DIRS.length; i++) {
            if (foundPath) break;
            const [dr, dc] = DIRS[i];
            const nr = r + dr;
            const nc = c + dc;
            const nkey = `${nr}-${nc}`;

            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            if (maze[nr][nc] === 0) {
                steps.push({
                    currentCell: [nr, nc],
                    pathCells: newPath,
                    deadEndKeys: new Set(deadEnds),
                    action: 'wall',
                    explanation: `${DIR_NAMES[i]} from (${r},${c}) → (${nr},${nc}) is a wall — blocked.`,
                });
                continue;
            }
            if (pathKeySet.has(nkey)) continue;

            moved = true;
            dfs(nr, nc, newPath);
        }

        if (!foundPath) {
            deadEnds.add(key);
            steps.push({
                currentCell: [r, c],
                pathCells: path,
                deadEndKeys: new Set(deadEnds),
                action: 'backtrack',
                explanation: `Dead end at (${r},${c}) — all exits blocked or visited. Backtracking.`,
            });
        }
    };

    dfs(0, 0, []);

    if (!foundPath) {
        steps.push({
            currentCell: null,
            pathCells: [],
            deadEndKeys: new Set(deadEnds),
            action: 'no_solution',
            explanation: 'No path exists from start (0,0) to exit.',
        });
    }

    return steps;
};

const quizQuestions = [
    {
        question: "In what order does the standard Rat in a Maze algorithm try moves?",
        options: [
            "Left, Right, Up, Down",
            "Random order each step",
            "Down, Right, Up, Left (or similar fixed order)",
            "It tries the direction closest to the goal first"
        ],
        correct: 2,
        explanation: "The standard recursive implementation uses a fixed direction order — commonly Down and Right first. This is a depth-first search: it fully explores one direction before trying alternatives, which is why you see the rat move in straight lines before backtracking."
    },
    {
        question: "What is the base case that signals a solution is found?",
        options: [
            "When the rat has visited all cells",
            "When the rat reaches cell (n-1, n-1)",
            "When no backtracking steps remain",
            "When all walls have been checked"
        ],
        correct: 1,
        explanation: "The recursion terminates with success when r == n-1 && c == n-1. At that point the current path from (0,0) to (n-1,n-1) is a valid solution."
    },
    {
        question: "What distinguishes Rat in a Maze from BFS shortest-path finding?",
        options: [
            "Backtracking finds all solutions; BFS finds only one",
            "BFS explores level by level and guarantees the shortest path; backtracking uses DFS and finds a path but not necessarily the shortest",
            "Backtracking is faster for large mazes",
            "They are identical algorithms with different names"
        ],
        correct: 1,
        explanation: "BFS explores cells level by level and guarantees the shortest path. Backtracking uses depth-first search — it finds a valid path quickly but may not be the shortest. Backtracking shines when you need all solutions or when the constraint space is complex."
    }
];

export default function RatInAMazeVisualizer() {
    const [presetIdx, setPresetIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(500);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const maze = PRESETS[presetIdx].maze;
    const n = maze.length;

    const rebuild = useCallback((idx) => {
        const steps = generateSteps(PRESETS[idx].maze);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { rebuild(presetIdx); }, [presetIdx, rebuild]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(s => s + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };
    const handleShuffle = () => setPresetIdx(i => (i + 1) % PRESETS.length);

    const state = stepHistory[currentStep] || {
        currentCell: null, pathCells: [], deadEndKeys: new Set(),
        action: 'start', explanation: 'Click Play to begin.',
    };

    const pathSet = new Set(state.pathCells.map(([r, c]) => `${r}-${c}`));
    const isFound = state.action === 'found';

    const getCellClass = (r, c) => {
        const key = `${r}-${c}`;
        const isStart = r === 0 && c === 0;
        const isEnd = r === n - 1 && c === n - 1;
        const isCurrent = state.currentCell?.[0] === r && state.currentCell?.[1] === c;

        if (maze[r][c] === 0) return 'bg-slate-800 border-slate-700 text-slate-600';

        if (isFound && pathSet.has(key)) return 'bg-green-500 border-green-400 text-white scale-105';

        if (isCurrent) {
            if (state.action === 'backtrack') return 'bg-orange-400 border-orange-300 text-slate-900 scale-110';
            if (state.action === 'wall') return 'bg-slate-800 border-red-600 text-slate-600';
            return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        }
        if (pathSet.has(key)) return 'bg-indigo-500 border-indigo-400 text-white';
        if (state.deadEndKeys?.has(key)) return 'bg-red-900/60 border-red-800 text-red-400';

        return 'bg-slate-700 border-slate-600 text-slate-300';
    };

    const getCellContent = (r, c) => {
        const isStart = r === 0 && c === 0;
        const isEnd = r === n - 1 && c === n - 1;
        if (maze[r][c] === 0) return null;
        if (isStart) return <span className="text-xs font-bold">S</span>;
        if (isEnd) return <span className="text-xs font-bold">E</span>;
        return null;
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const q = quizQuestions[quizState.complete ? quizQuestions.length - 1 : quizState.current];

    const code = `def solve_maze(maze):
    n = len(maze)
    path = []

    def dfs(r, c):
        # Out of bounds, wall, or already visited
        if (r < 0 or r >= n or c < 0 or c >= n
                or maze[r][c] == 0
                or (r, c) in set(path)):
            return False

        path.append((r, c))

        if r == n - 1 and c == n - 1:
            return True  # reached exit

        # Try Down, Right, Up, Left
        for dr, dc in [(1,0),(0,1),(-1,0),(0,-1)]:
            if dfs(r + dr, c + dc):
                return True

        path.pop()  # backtrack
        return False

    if dfs(0, 0):
        return path   # solution path
    return None       # no solution`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/backtracking" className="flex items-center text-white/80 hover:text-white text-sm mb-6 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Backtracking
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Navigation className="h-10 w-10" /> Rat in a Maze
                        </h1>
                        <p className="text-xl text-indigo-100 mb-6 max-w-3xl mx-auto">
                            Navigate from the top-left to the bottom-right of a binary maze.
                            Backtracking explores all paths, marking visited cells and retreating from dead ends.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(2^(n²))</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Path Finding</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Intermediate</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Controls</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Maze Preset</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {PRESETS.map((p, i) => (
                                            <button key={p.label} onClick={() => setPresetIdx(i)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${i === presetIdx ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="100" max="2000" step="100" value={speed}
                                        onChange={e => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(p => !p); }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">
                                        {isPlaying ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Play</>}
                                    </button>
                                    <button onClick={handleReset}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                        <RotateCcw className="h-4 w-4" /> Reset
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={stepBackward} disabled={currentStep === 0 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-2 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors">
                                        <SkipBack className="h-4 w-4" />
                                    </button>
                                    <button onClick={handleShuffle} disabled={isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-2 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors">
                                        <Shuffle className="h-4 w-4" />
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-2 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors">
                                        <SkipForward className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-1.5">
                                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                        style={{ width: stepHistory.length ? `${((currentStep + 1) / stepHistory.length) * 100}%` : '0%' }} />
                                </div>
                                <p className="text-xs text-slate-500 text-center">{currentStep + 1} / {stepHistory.length}</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-base font-bold text-white mb-3">Legend</h3>
                            <div className="space-y-2">
                                {[
                                    ['bg-green-500 border-green-400', 'Solution path'],
                                    ['bg-yellow-400 border-yellow-300', 'Current cell'],
                                    ['bg-orange-400 border-orange-300', 'Backtracking from'],
                                    ['bg-indigo-500 border-indigo-400', 'Active path'],
                                    ['bg-red-900/60 border-red-800', 'Dead end (backtracked)'],
                                    ['bg-slate-700 border-slate-600', 'Open, unvisited'],
                                    ['bg-slate-800 border-slate-700', 'Wall'],
                                ].map(([cls, label]) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${cls}`} />
                                        <span className="text-sm text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-base font-bold text-white mb-2">Status</h3>
                            <div className="space-y-2 mb-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Position:</span>
                                    <span className="text-indigo-300 font-mono">
                                        {state.currentCell ? `(${state.currentCell[0]},${state.currentCell[1]})` : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Path cells:</span>
                                    <span className="text-indigo-300 font-bold">{state.pathCells.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Dead ends:</span>
                                    <span className="text-red-400 font-bold">{state.deadEndKeys?.size ?? 0}</span>
                                </div>
                            </div>
                            <div className={`rounded-lg p-3 ${
                                state.action === 'found' ? 'bg-green-500/10 border border-green-500/20'
                                : state.action === 'backtrack' ? 'bg-red-500/10 border border-red-500/20'
                                : state.action === 'wall' ? 'bg-slate-700/50 border border-slate-600/50'
                                : 'bg-indigo-500/10 border border-indigo-500/20'
                            }`}>
                                <div className="flex items-start gap-2">
                                    <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                        state.action === 'found' ? 'text-green-400'
                                        : state.action === 'backtrack' ? 'text-red-400'
                                        : 'text-indigo-400'
                                    }`} />
                                    <p className="text-slate-200 text-xs leading-relaxed">{state.explanation}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-indigo-500/30 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="h-5 w-5 text-indigo-400" />
                                <h3 className="text-base font-bold text-white">Test Yourself</h3>
                                {!quizState.complete && <span className="ml-auto text-xs text-slate-500">Q{quizState.current + 1}/{quizQuestions.length}</span>}
                            </div>
                            {quizState.complete ? (
                                <div className="text-center py-3">
                                    <p className="text-indigo-300 font-bold text-lg">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 text-sm mt-1">Quiz complete!</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="mt-3 bg-indigo-700 hover:bg-indigo-600 text-white py-1.5 px-4 rounded-lg text-xs font-medium transition-colors">
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
                                    <div className="space-y-1.5 mb-3">
                                        {q.options.map((opt, idx) => {
                                            let cls = 'bg-slate-800 border-slate-600 text-slate-300 hover:border-indigo-500';
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
                                                    {quizState.selected === q.correct ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                                                    <span className={`text-xs font-semibold ${quizState.selected === q.correct ? 'text-green-300' : 'text-red-300'}`}>
                                                        {quizState.selected === q.correct ? 'Correct!' : 'Not quite.'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                            </div>
                                            <button onClick={nextQuestion} className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">
                                                Next Question
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Main area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Navigation className="h-5 w-5 text-indigo-400" /> {n}×{n} Maze — S to E
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                    isFound ? 'bg-green-500/15 text-green-300 border-green-500/30'
                                    : state.action === 'backtrack' ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                }`}>{isFound ? 'SOLVED' : state.action?.replace('_', ' ').toUpperCase()}</span>
                            </div>

                            <div className="flex justify-center mb-6">
                                <div className="grid gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30"
                                    style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, maxWidth: '380px', width: '100%' }}>
                                    {maze.map((row, r) =>
                                        row.map((cell, c) => (
                                            <div key={`${r}-${c}`}
                                                className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-all duration-200 ${getCellClass(r, c)}`}
                                                style={{ minWidth: '52px' }}>
                                                {getCellContent(r, c)}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-sm">
                                <div>
                                    <span className="text-slate-400 text-xs block">Rat Position</span>
                                    <span className="text-indigo-300 font-bold font-mono">
                                        {state.currentCell ? `(${state.currentCell[0]},${state.currentCell[1]})` : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block">Path Length</span>
                                    <span className="text-indigo-300 font-bold">{state.pathCells.length}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block">Dead Ends Hit</span>
                                    <span className="text-red-400 font-bold">{state.deadEndKeys?.size ?? 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-indigo-400 text-sm mb-2">Complexity</h4>
                                    <ul className="text-slate-400 text-xs space-y-1">
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Time: O(2^(n²)) worst case</li>
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Space: O(n²) for path tracking</li>
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Walls prune the search space heavily</li>
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> BFS preferred for shortest path</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-indigo-400 text-sm mb-2">Variants</h4>
                                    <ul className="text-slate-400 text-xs space-y-1.5">
                                        {[
                                            'Find all paths (not just first)',
                                            'Shortest path via BFS instead',
                                            'Weighted cells (cost-aware)',
                                            'Multiple exits / start points',
                                            'Diagonal movement allowed',
                                        ].map(v => (
                                            <li key={v} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400 flex-shrink-0" />{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Code className="h-5 w-5 text-indigo-400" /> Backtracking (Python)
                            </h3>
                            <CodeBlock code={code} language="python" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
