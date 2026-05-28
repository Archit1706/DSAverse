"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward,
    Shuffle, Info, Brain, CheckCircle, XCircle, Code, FileSearch, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const PRESETS = [
    {
        label: "BACK",
        grid: [
            ['B','A','C','K','X'],
            ['X','B','A','C','K'],
            ['A','X','B','X','A'],
            ['C','A','X','B','C'],
            ['K','C','A','C','K'],
        ],
        word: "BACK",
    },
    {
        label: "PATH",
        grid: [
            ['P','A','T','H','S'],
            ['X','X','P','A','T'],
            ['T','P','A','T','H'],
            ['H','A','X','X','X'],
            ['X','T','H','P','A'],
        ],
        word: "PATH",
    },
    {
        label: "FIND",
        grid: [
            ['F','I','N','D','X'],
            ['X','F','I','N','D'],
            ['D','X','F','X','X'],
            ['N','D','X','F','I'],
            ['I','N','D','X','N'],
        ],
        word: "FIND",
    },
    {
        label: "CODE",
        grid: [
            ['C','O','D','E','X'],
            ['X','C','O','D','E'],
            ['E','X','C','X','X'],
            ['D','E','X','C','O'],
            ['O','D','E','X','D'],
        ],
        word: "CODE",
    },
];

const quizQuestions = [
    {
        question: "What does backtracking do when a grid cell doesn't match the next character of the target word?",
        options: [
            "Marks the cell permanently as visited and skips it",
            "Stops the entire search and returns not found",
            "Returns immediately without modifying any state",
            "Tries all four directions before giving up"
        ],
        correct: 2,
        explanation: "When a cell doesn't match, the algorithm returns immediately without changing any state — no path extension, no marking. The outer loop moves on to the next direction or starting cell."
    },
    {
        question: "Why must cells in the current path be marked as visited?",
        options: [
            "To speed up the search",
            "To prevent using the same cell twice in one path",
            "To mark cells that have been fully explored",
            "Required by the grid data structure"
        ],
        correct: 1,
        explanation: "A word can't reuse the same cell. Marking cells on the current path prevents cycles — without this, the search could loop back and match the same cell multiple times."
    },
    {
        question: "What is the time complexity of Word Search on an m×n grid for a word of length L?",
        options: ["O(m×n×L)", "O(m×n×4^L)", "O(m×n×log L)", "O(4^(m×n))"],
        correct: 1,
        explanation: "From each starting cell (m×n options), DFS explores up to 4 directions at each of L steps, giving O(m×n×4^L). In practice, mismatches prune most branches early."
    }
];

const generateSteps = (grid, word) => {
    const steps = [];
    const rows = grid.length;
    const cols = grid[0].length;
    const DIRS = [[-1,0],[0,1],[1,0],[0,-1]];
    const DIR_NAMES = ['Up','Right','Down','Left'];
    let foundPath = null;

    const dfs = (r, c, idx, pathKeys, pathArr) => {
        if (foundPath) return;
        const key = `${r}-${c}`;

        if (r < 0 || r >= rows || c < 0 || c >= cols || pathKeys.has(key)) return;

        if (grid[r][c] !== word[idx]) {
            steps.push({
                currentCell: [r, c],
                pathCells: [...pathArr],
                action: 'mismatch',
                wordIdx: idx,
                foundPath: null,
                explanation: `Cell (${r},${c})='${grid[r][c]}' ≠ '${word[idx]}' — mismatch, skip.`,
            });
            return;
        }

        const newPathArr = [...pathArr, [r, c]];
        const newPathKeys = new Set(pathKeys);
        newPathKeys.add(key);

        if (idx === word.length - 1) {
            foundPath = newPathArr;
            steps.push({
                currentCell: [r, c],
                pathCells: newPathArr,
                action: 'found',
                wordIdx: idx + 1,
                foundPath: newPathArr,
                explanation: `Matched '${word[idx]}' at (${r},${c}) — full word "${word}" found!`,
            });
            return;
        }

        steps.push({
            currentCell: [r, c],
            pathCells: newPathArr,
            action: 'match',
            wordIdx: idx,
            foundPath: null,
            explanation: `Matched '${word[idx]}' at (${r},${c}) — need '${word[idx + 1]}' next.`,
        });

        for (let d = 0; d < DIRS.length; d++) {
            if (foundPath) break;
            const [dr, dc] = DIRS[d];
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !newPathKeys.has(`${nr}-${nc}`)) {
                steps.push({
                    currentCell: [r, c],
                    pathCells: newPathArr,
                    action: 'try_dir',
                    wordIdx: idx,
                    foundPath: null,
                    explanation: `From (${r},${c}) trying ${DIR_NAMES[d]} → (${nr},${nc}) for '${word[idx + 1]}'.`,
                });
            }
            dfs(nr, nc, idx + 1, newPathKeys, newPathArr);
        }

        if (!foundPath) {
            steps.push({
                currentCell: [r, c],
                pathCells: [...pathArr],
                action: 'backtrack',
                wordIdx: idx,
                foundPath: null,
                explanation: `No valid continuation from (${r},${c}) for '${word[idx + 1]}' — backtracking.`,
            });
        }
    };

    for (let r = 0; r < rows && !foundPath; r++) {
        for (let c = 0; c < cols && !foundPath; c++) {
            steps.push({
                currentCell: [r, c],
                pathCells: [],
                action: 'start_cell',
                wordIdx: 0,
                foundPath: null,
                explanation: `Starting search from (${r},${c}) — checking for '${word[0]}'.`,
            });
            dfs(r, c, 0, new Set(), []);
        }
    }

    if (!foundPath) {
        steps.push({
            currentCell: null,
            pathCells: [],
            action: 'not_found',
            wordIdx: 0,
            foundPath: null,
            explanation: `Word "${word}" was not found in the grid.`,
        });
    }

    return steps;
};

export default function WordSearchVisualizer() {
    const [presetIdx, setPresetIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(400);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const preset = PRESETS[presetIdx];

    const rebuild = useCallback((idx) => {
        const p = PRESETS[idx];
        const steps = generateSteps(p.grid, p.word);
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
        currentCell: null, pathCells: [], action: 'start', wordIdx: 0, foundPath: null,
        explanation: 'Click Play to begin.',
    };

    const pathSet = new Set(state.pathCells.map(([r, c]) => `${r}-${c}`));
    const foundSet = state.foundPath ? new Set(state.foundPath.map(([r, c]) => `${r}-${c}`)) : null;

    const getCellClass = (r, c) => {
        const key = `${r}-${c}`;
        const isCurrent = state.currentCell?.[0] === r && state.currentCell?.[1] === c;

        if (foundSet) {
            if (foundSet.has(key)) return 'bg-green-500 border-green-400 text-white scale-105';
            return 'bg-slate-800 border-slate-700 text-slate-500';
        }
        if (isCurrent) {
            if (state.action === 'mismatch') return 'bg-red-500 border-red-400 text-white scale-110';
            if (state.action === 'backtrack') return 'bg-orange-500 border-orange-400 text-white scale-105';
            return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        }
        if (pathSet.has(key)) return 'bg-indigo-500 border-indigo-400 text-white';
        return 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500';
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

    const code = `def exist(board, word):
    rows, cols = len(board), len(board[0])

    def dfs(r, c, idx, visited):
        if idx == len(word):
            return True
        if (r < 0 or r >= rows or c < 0 or c >= cols
                or (r, c) in visited
                or board[r][c] != word[idx]):
            return False

        visited.add((r, c))
        for dr, dc in [(-1,0),(0,1),(1,0),(0,-1)]:
            if dfs(r+dr, c+dc, idx+1, visited):
                visited.remove((r, c))  # optional cleanup
                return True
        visited.remove((r, c))  # backtrack
        return False

    for r in range(rows):
        for c in range(cols):
            if dfs(r, c, 0, set()):
                return True
    return False`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/backtracking" className="flex items-center text-white/80 hover:text-white text-sm mb-6 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Backtracking
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <FileSearch className="h-10 w-10" /> Word Search
                        </h1>
                        <p className="text-xl text-indigo-100 mb-6 max-w-3xl mx-auto">
                            Find a word in a 2D character grid by exploring all four directions from each cell.
                            Backtracking un-marks visited cells when a path fails.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(m×n×4^L)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(L)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Grid DFS</div>
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
                                    <label className="block text-sm text-slate-300 mb-2">Target Word</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {PRESETS.map((p, i) => (
                                            <button key={p.label} onClick={() => setPresetIdx(i)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-colors ${i === presetIdx ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="100" max="1500" step="100" value={speed}
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
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-2 rounded-lg flex items-center justify-center gap-1 text-sm disabled:opacity-40 transition-colors">
                                        <SkipBack className="h-4 w-4" />
                                    </button>
                                    <button onClick={handleShuffle} disabled={isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-2 rounded-lg flex items-center justify-center gap-1 text-sm disabled:opacity-40 transition-colors">
                                        <Shuffle className="h-4 w-4" />
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-2 rounded-lg flex items-center justify-center gap-1 text-sm disabled:opacity-40 transition-colors">
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
                            <h3 className="text-base font-bold text-white mb-3">Word Progress</h3>
                            <div className="flex gap-1 flex-wrap mb-3">
                                {preset.word.split('').map((ch, i) => (
                                    <div key={i} className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border-2 transition-all ${
                                        state.action === 'found' || (foundSet && foundSet.size > 0) ? 'bg-green-500 border-green-400 text-white'
                                        : i < state.wordIdx ? 'bg-indigo-500 border-indigo-400 text-white'
                                        : i === state.wordIdx && state.action === 'match' ? 'bg-yellow-400 border-yellow-300 text-slate-900'
                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}>{ch}</div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400">
                                {state.action === 'found' ? `"${preset.word}" found!` : `Matching char ${state.wordIdx + 1} of ${preset.word.length}`}
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-base font-bold text-white mb-3">Legend</h3>
                            <div className="space-y-2">
                                {[
                                    ['bg-green-500 border-green-400', 'Found path'],
                                    ['bg-yellow-400 border-yellow-300', 'Current cell (match)'],
                                    ['bg-red-500 border-red-400', 'Current cell (mismatch)'],
                                    ['bg-indigo-500 border-indigo-400', 'Current path'],
                                    ['bg-orange-500 border-orange-400', 'Backtracking from'],
                                    ['bg-slate-800 border-slate-600', 'Unvisited cell'],
                                ].map(([cls, label]) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${cls}`} />
                                        <span className="text-sm text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <div className={`rounded-lg p-3 ${
                                state.action === 'found' ? 'bg-green-500/10 border border-green-500/20'
                                : state.action === 'backtrack' ? 'bg-red-500/10 border border-red-500/20'
                                : state.action === 'mismatch' ? 'bg-red-500/10 border border-red-500/20'
                                : 'bg-indigo-500/10 border border-indigo-500/20'
                            }`}>
                                <div className="flex items-start gap-2">
                                    <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                        state.action === 'found' ? 'text-green-400'
                                        : state.action === 'backtrack' || state.action === 'mismatch' ? 'text-red-400'
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
                                    <FileSearch className="h-5 w-5 text-indigo-400" /> 5×5 Grid — searching for
                                    <span className="font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">{preset.word}</span>
                                </h3>
                            </div>
                            <div className="flex justify-center mb-6">
                                <div className="grid gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30"
                                    style={{ gridTemplateColumns: `repeat(${preset.grid[0].length}, minmax(0, 1fr))`, maxWidth: '380px', width: '100%' }}>
                                    {preset.grid.map((row, r) =>
                                        row.map((ch, c) => (
                                            <div key={`${r}-${c}`}
                                                className={`aspect-square flex items-center justify-center font-mono font-bold text-base rounded-lg border-2 transition-all duration-200 ${getCellClass(r, c)}`}
                                                style={{ minWidth: '52px' }}>
                                                {ch}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-sm">
                                <div>
                                    <span className="text-slate-400 text-xs block">Current Position</span>
                                    <span className="text-indigo-300 font-bold font-mono">
                                        {state.currentCell ? `(${state.currentCell[0]},${state.currentCell[1]})` : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block">Path Length</span>
                                    <span className="text-indigo-300 font-bold">{state.pathCells.length} / {preset.word.length}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block">Status</span>
                                    <span className={`font-bold text-xs px-2 py-0.5 rounded border ${
                                        state.action === 'found' ? 'text-green-300 bg-green-500/15 border-green-500/30'
                                        : state.action === 'backtrack' ? 'text-orange-300 bg-orange-500/15 border-orange-500/30'
                                        : state.action === 'mismatch' ? 'text-red-300 bg-red-500/15 border-red-500/30'
                                        : state.action === 'match' ? 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
                                        : 'text-slate-300 bg-slate-700 border-slate-600'
                                    }`}>{state.action?.replace('_', ' ').toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-indigo-400 text-sm mb-2">Complexity</h4>
                                    <ul className="text-slate-400 text-xs space-y-1">
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Time: O(m×n×4^L)</li>
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Space: O(L) recursion stack</li>
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> L = length of target word</li>
                                        <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Mismatch prunes most paths early</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-indigo-400 text-sm mb-2">Key Insight</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        The visited set prevents using a cell twice in one path. On backtrack,
                                        the cell is removed from the set — this is the "unchoose" step that makes
                                        other starting paths still able to use that cell.
                                    </p>
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
