"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward,
    Info, Brain, CheckCircle, XCircle, Code, LayoutGrid, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "In Sudoku backtracking, what three regions must a placed digit NOT repeat in?",
        options: [
            "Its row, its column, and its 3×3 box",
            "Its row, its diagonal, and its 3×3 box",
            "Its column, its diagonal, and its row",
            "Its 3×3 box, the center row, and the center column"
        ],
        correct: 0,
        explanation: "A valid Sudoku digit must be unique within its row (9 cells), its column (9 cells), and its 3×3 sub-grid (9 cells). The diagonal has no special constraint in standard Sudoku."
    },
    {
        question: "When the backtracking solver tries digit 1–9 for a cell and none are valid, what happens?",
        options: [
            "It marks the cell as unsolvable and moves on",
            "It picks the digit that conflicts the least",
            "It returns false, causing the caller to undo its last placement",
            "It restarts the entire solve from scratch"
        ],
        correct: 2,
        explanation: "If no digit (1–9) is valid for the current cell, the function returns false. The calling frame then removes the digit it last placed, restores the cell to 0, and tries the next candidate — classic backtracking."
    },
    {
        question: "Why does the recursive solver skip cells where grid[row][col] ≠ 0?",
        options: [
            "Those cells were already solved in a previous run",
            "Skipping pre-filled cells makes the algorithm faster by luck",
            "Those are the given (clue) cells that cannot be changed",
            "Zero means the cell is invalid and must be avoided"
        ],
        correct: 2,
        explanation: "Non-zero cells are the puzzle's given clues — they are fixed constants provided by the puzzle. The solver only needs to fill empty cells (value 0). Skipping non-zero cells prevents overwriting the clues."
    }
];

const PUZZLE = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const GIVEN = PUZZLE.map(row => row.map(v => v !== 0));

const generateSteps = () => {
    const steps = [];
    const grid = PUZZLE.map(row => [...row]);
    let backtracks = 0;
    let placements = 0;

    const isValid = (grid, row, col, num) => {
        for (let c = 0; c < 9; c++) if (grid[row][c] === num) return false;
        for (let r = 0; r < 9; r++) if (grid[r][col] === num) return false;
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let r = br; r < br + 3; r++)
            for (let c = bc; c < bc + 3; c++)
                if (grid[r][c] === num) return false;
        return true;
    };

    const solve = (pos) => {
        if (pos === 81) {
            steps.push({
                grid: grid.map(r => [...r]),
                row: -1, col: -1, tryingNum: -1,
                placements, backtracks,
                action: 'complete',
                explanation: 'Sudoku solved! All 81 cells filled according to the rules.'
            });
            return true;
        }
        const row = Math.floor(pos / 9);
        const col = pos % 9;

        if (grid[row][col] !== 0) return solve(pos + 1);

        for (let num = 1; num <= 9; num++) {
            if (!isValid(grid, row, col, num)) continue;
            grid[row][col] = num;
            placements++;
            steps.push({
                grid: grid.map(r => [...r]),
                row, col, tryingNum: num,
                placements, backtracks,
                action: 'placed',
                explanation: `Placed ${num} in (row ${row + 1}, col ${col + 1}). Moving to next empty cell.`
            });
            if (solve(pos + 1)) return true;
            grid[row][col] = 0;
            backtracks++;
            steps.push({
                grid: grid.map(r => [...r]),
                row, col, tryingNum: num,
                placements, backtracks,
                action: 'backtrack',
                explanation: `${num} in (row ${row + 1}, col ${col + 1}) leads to a dead end. Removing it and trying the next digit.`
            });
        }
        return false;
    };

    steps.push({
        grid: grid.map(r => [...r]),
        row: -1, col: -1, tryingNum: -1,
        placements: 0, backtracks: 0,
        action: 'start',
        explanation: 'Starting Sudoku solver. Scanning left-to-right, top-to-bottom. For each empty cell, try digits 1–9 and recurse.'
    });
    solve(0);
    return steps;
};

export default function SudokuSolverVisualizer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory] = useState(() => generateSteps());
    const [speed, setSpeed] = useState(120);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const currentState = stepHistory[currentStep] || {
        grid: PUZZLE.map(r => [...r]), row: -1, col: -1, tryingNum: -1,
        placements: 0, backtracks: 0, action: 'start',
        explanation: 'Click Play to begin.'
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

    const getCellClass = (r, c) => {
        const isGiven = GIVEN[r][c];
        const isCurrent = r === currentState.row && c === currentState.col;
        const isComplete = currentState.action === 'complete';

        if (isComplete && !isGiven) return 'bg-green-500/30 text-green-200 border-green-600';
        if (isCurrent) {
            return currentState.action === 'backtrack'
                ? 'bg-red-500/50 border-red-400 text-red-100 scale-105'
                : 'bg-yellow-400/80 border-yellow-300 text-slate-900 scale-105';
        }
        if (isGiven) return 'bg-blue-900/60 border-blue-700/50 text-blue-100 font-bold';
        if (currentState.grid[r][c] !== 0) return 'bg-green-900/40 border-green-800/50 text-green-300';
        return 'bg-slate-800/60 border-slate-700/40 text-slate-500';
    };

    const getBoxBorder = (r, c) => {
        let cls = '';
        if (c === 3 || c === 6) cls += ' border-l-2 border-l-slate-500';
        if (r === 3 || r === 6) cls += ' border-t-2 border-t-slate-500';
        return cls;
    };

    const q = quizQuestions[quizState.current];

    const filledCells = currentState.grid.flat().filter((v, i) => v !== 0 && !GIVEN.flat()[i]).length;
    const emptyCells = PUZZLE.flat().filter(v => v === 0).length;

    const codeExample = `def solve_sudoku(grid):
    def is_valid(grid, row, col, num):
        if num in grid[row]: return False
        if num in [grid[r][col] for r in range(9)]: return False
        br, bc = (row // 3) * 3, (col // 3) * 3
        for r in range(br, br + 3):
            for c in range(bc, bc + 3):
                if grid[r][c] == num: return False
        return True

    def backtrack(pos=0):
        if pos == 81: return True        # solved!
        row, col = divmod(pos, 9)
        if grid[row][col] != 0:         # skip given cells
            return backtrack(pos + 1)
        for num in range(1, 10):
            if is_valid(grid, row, col, num):
                grid[row][col] = num
                if backtrack(pos + 1): return True
                grid[row][col] = 0      # backtrack

        return False  # trigger caller to backtrack

    backtrack()`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Sudoku Solver</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch constraint-based backtracking fill a 9×9 grid — place a digit, recurse, hit a dead end, erase, and try again.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><LayoutGrid className="h-4 w-4" /> Constraint satisfaction</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Code className="h-4 w-4" /> O(9^m) time, m = empty cells</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Brain className="h-4 w-4" /> {emptyCells} empty cells to fill</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <LayoutGrid className="h-5 w-5 text-green-400" /> 9×9 Grid
                                </h3>
                                <div className="flex gap-2 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-900/60 border border-blue-700/50 inline-block" /> given</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400/80 inline-block" /> trying</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/50 inline-block" /> backtrack</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-900/40 inline-block" /> placed</span>
                                </div>
                            </div>

                            {/* Sudoku grid */}
                            <div className="flex justify-center">
                                <div className="border-2 border-slate-500 rounded-lg overflow-hidden"
                                    style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', width: '100%', maxWidth: '432px' }}>
                                    {currentState.grid.map((row, r) =>
                                        row.map((val, c) => (
                                            <div key={`${r}-${c}`}
                                                className={`aspect-square flex items-center justify-center text-sm font-semibold border transition-all duration-150 ${getCellClass(r, c)} ${getBoxBorder(r, c)}`}>
                                                {val !== 0 ? val : ''}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mt-5">
                                <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                    <div className="text-lg font-bold text-green-400">{filledCells}</div>
                                    <div className="text-xs text-slate-500">cells filled</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                    <div className="text-lg font-bold text-red-400">{currentState.backtracks}</div>
                                    <div className="text-xs text-slate-500">backtracks</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                    <div className="text-lg font-bold text-yellow-400">{currentState.placements}</div>
                                    <div className="text-xs text-slate-500">total placements</div>
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className={`mt-4 rounded-lg p-3 border ${currentState.action === 'backtrack' ? 'bg-red-500/10 border-red-500/20' :
                                currentState.action === 'complete' ? 'bg-green-500/10 border-green-500/20' :
                                    'bg-yellow-500/10 border-yellow-500/20'}`}>
                                <div className="flex items-start gap-2">
                                    <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.action === 'backtrack' ? 'text-red-400' :
                                        currentState.action === 'complete' ? 'text-green-400' : 'text-yellow-400'}`} />
                                    <p className={`text-sm leading-relaxed ${currentState.action === 'backtrack' ? 'text-red-300' :
                                        currentState.action === 'complete' ? 'text-green-300' : 'text-yellow-200'}`}>
                                        {currentState.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Algorithm analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                                    <h4 className="font-bold text-green-400 text-sm">Constraint Checks per Cell</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        For each empty cell we test digits 1–9. Each test scans 9 + 9 + 9 = 27 cells (row + column + box). This is O(27) ≈ O(1) per candidate.
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                                    <h4 className="font-bold text-green-400 text-sm">Worst Case vs Practice</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        Worst case is O(9^m) where m is the number of empty cells. In practice, constraints prune the search tree dramatically — well-formed puzzles have exactly one solution.
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                                    <h4 className="font-bold text-green-400 text-sm">Real-World Applications</h4>
                                    <ul className="text-slate-400 text-xs space-y-1">
                                        {['Puzzle generation and solving', 'Constraint satisfaction (CSP)', 'Timetable scheduling', 'Register allocation in compilers', 'Graph coloring problems'].map(a => (
                                            <li key={a} className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                                    <h4 className="font-bold text-green-400 text-sm">Optimizations</h4>
                                    <ul className="text-slate-400 text-xs space-y-1">
                                        {['MRV heuristic: pick the most constrained cell first', 'Forward checking: detect dead-ends early', 'Constraint propagation (arc consistency)', 'Bit masks for fast validity checks'].map(a => (
                                            <li key={a} className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Code className="h-5 w-5 text-green-400" /> Backtracking Solver (Python)
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
                                        Speed: {speed}ms / step
                                        <span className="text-xs text-slate-500 ml-2">(faster = lower)</span>
                                    </label>
                                    <input type="range" min="30" max="1500" step="10" value={speed}
                                        onChange={e => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Fast</span><span>Slow</span></div>
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
                                    <span className="text-slate-400">Cell</span>
                                    <span className="text-green-300 font-mono">
                                        {currentState.row === -1 ? '—' : `(${currentState.row + 1}, ${currentState.col + 1})`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Trying digit</span>
                                    <span className="text-yellow-300 font-mono font-bold">
                                        {currentState.tryingNum === -1 ? '—' : currentState.tryingNum}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Cells filled</span>
                                    <span className="text-green-300 font-mono">{filledCells} / {emptyCells}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Action</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${currentState.action === 'placed' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                                        currentState.action === 'backtrack' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                            currentState.action === 'complete' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                                                'bg-slate-700 text-slate-400'}`}>
                                        {currentState.action.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Complexity</h3>
                            <div className="space-y-2">
                                {[
                                    ['Time', 'O(9^m)', 'green'],
                                    ['Space', 'O(m)', 'emerald'],
                                    ['Empty cells', `${emptyCells} (m)`, 'yellow'],
                                ].map(([label, val, color]) => (
                                    <div key={label} className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">{label}</span>
                                        <code className={`text-${color}-400 text-xs bg-${color}-500/10 px-2 py-0.5 rounded`}>{val}</code>
                                    </div>
                                ))}
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    m = number of empty cells. Constraint pruning makes the practical complexity far lower than the worst case.
                                </p>
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
                                        {quizState.score === quizQuestions.length ? 'Perfect! Sudoku solver mastered.' : 'Good effort! Watch the backtrack moments carefully.'}
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
