"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward, Clock, Code, Crown,
    Brain, CheckCircle, XCircle, Info, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does backtracking do in N-Queens when a queen can't be placed?",
        options: [
            "Restarts the entire algorithm from scratch",
            "Places a queen anyway and marks conflicts",
            "Removes the most recently placed queen and tries the next column",
            "Swaps two queens to resolve the conflict"
        ],
        correct: 2,
        explanation: "Backtracking removes the last placed queen (board[row] = -1) and tries the next column. If no column works in that row, it backtracks further to the previous row."
    },
    {
        question: "How many solutions does the 8-Queens problem have?",
        options: ["8 solutions", "24 solutions", "64 solutions", "92 solutions"],
        correct: 3,
        explanation: "The 8-Queens problem has exactly 92 distinct solutions. The 4×4 board has 2, 5×5 has 10, 6×6 has 4, 7×7 has 40."
    },
    {
        question: "Why do we only check columns and diagonals — not rows — for queen attacks?",
        options: [
            "Queens cannot attack in rows",
            "We place exactly one queen per row by design — row conflicts are impossible",
            "Row checking would make the algorithm too slow",
            "Diagonals cover row attacks implicitly"
        ],
        correct: 1,
        explanation: "The algorithm places queens row by row — one per row. Since only one queen ever occupies each row, row conflicts are structurally impossible. We only need to check columns and diagonals."
    }
];

const generateSteps = (size) => {
    const steps = [];
    const solutions = [];

    const isSafe = (board, row, col) => {
        for (let i = 0; i < row; i++) {
            if (board[i] === col) return false;
            if (Math.abs(board[i] - col) === Math.abs(i - row)) return false;
        }
        return true;
    };

    const getAttackedCells = (board, row) => {
        const attacked = new Set();
        for (let i = 0; i < row; i++) {
            const qc = board[i];
            for (let r = 0; r < size; r++) attacked.add(`${r}-${qc}`);
            for (let r = 0; r < size; r++)
                for (let c = 0; c < size; c++)
                    if (Math.abs(r - i) === Math.abs(c - qc)) attacked.add(`${r}-${c}`);
        }
        return attacked;
    };

    const solve = (board, row) => {
        if (row === size) {
            solutions.push([...board]);
            steps.push({
                board: [...board], row, col: -1,
                attackedCells: new Set(), action: 'solution', isSafe: true,
                explanation: `Solution ${solutions.length} found! All ${size} queens placed without conflicts.`,
            });
            return;
        }
        for (let col = 0; col < size; col++) {
            const safe = isSafe(board, row, col);
            steps.push({
                board: [...board], row, col,
                attackedCells: getAttackedCells(board, row),
                action: safe ? 'place' : 'check', isSafe: safe,
                explanation: safe
                    ? `(${row},${col}) is safe — placing queen here.`
                    : `(${row},${col}) is under attack — skipping.`,
            });
            if (safe) {
                board[row] = col;
                steps.push({
                    board: [...board], row, col,
                    attackedCells: getAttackedCells(board, row + 1),
                    action: 'placed', isSafe: true,
                    explanation: `Queen placed at row ${row}, col ${col}. Moving to row ${row + 1}.`,
                });
                solve(board, row + 1);
                board[row] = -1;
                steps.push({
                    board: [...board], row, col,
                    attackedCells: getAttackedCells(board, row),
                    action: 'backtrack', isSafe: false,
                    explanation: `Backtracking: removing queen from (${row},${col}) — trying next column.`,
                });
            }
        }
    };

    const board = new Array(size).fill(-1);
    solve(board, 0);
    return { steps, solutionCount: solutions.length };
};

export default function NQueensBacktrackingVisualizer() {
    const [n, setN] = useState(4);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(800);
    const [solutionCount, setSolutionCount] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        const { steps, solutionCount: sc } = generateSteps(n);
        setStepHistory(steps);
        setSolutionCount(sc);
        setCurrentStep(0);
        setIsPlaying(false);
    }, [n]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(s => s + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

    const state = stepHistory[currentStep] || {
        board: new Array(n).fill(-1), row: 0, col: 0,
        attackedCells: new Set(), action: 'start', isSafe: true,
        explanation: 'Click Play to begin the N-Queens visualization.',
    };

    const getCellClass = (row, col) => {
        const isLight = (row + col) % 2 === 0;
        const base = isLight ? 'bg-amber-100' : 'bg-amber-200';
        const key = `${row}-${col}`;
        if (state.board?.[row] === col) return 'bg-green-400 border-2 border-green-500';
        if (state.row === row && state.col === col) {
            return state.isSafe
                ? 'bg-blue-400 border-2 border-blue-500 animate-pulse'
                : 'bg-red-400 border-2 border-red-500 animate-pulse';
        }
        if (state.attackedCells?.has(key)) return `${base} bg-red-200 border border-red-400`;
        return `${base} border border-amber-300`;
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

    const code = `def solve_nqueens(n):
    def is_safe(board, row, col):
        for i in range(row):
            if (board[i] == col or
                abs(board[i] - col) == abs(i - row)):
                return False
        return True

    def backtrack(board, row):
        if row == n:
            solutions.append(board[:])
            return
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col       # place
                backtrack(board, row + 1)
                board[row] = -1        # undo

    solutions = []
    backtrack([-1] * n, 0)
    return solutions

# ${n}-Queens: ${solutionCount} solution${solutionCount !== 1 ? 's' : ''}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/backtracking" className="flex items-center text-white/80 hover:text-white text-sm mb-6 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Backtracking
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">N-Queens Problem</h1>
                        <p className="text-xl text-indigo-100 mb-6 max-w-3xl mx-auto">
                            Watch backtracking place queens row by row, retreat when stuck, and find all valid arrangements.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Crown className="h-4 w-4" /> Constraint Propagation</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> O(N!)</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full">{solutionCount} solutions for {n}-Queens</div>
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
                                    <label className="block text-sm text-slate-300 mb-2">Board: {n}×{n} ({solutionCount} solutions)</label>
                                    <input type="range" min="4" max="8" value={n}
                                        onChange={e => setN(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        disabled={isPlaying} />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="200" max="2000" step="200" value={speed}
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
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={stepBackward} disabled={currentStep === 0 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm disabled:opacity-40 transition-colors">
                                        <SkipBack className="h-4 w-4" /> Prev
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep >= stepHistory.length - 1 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm disabled:opacity-40 transition-colors">
                                        Next <SkipForward className="h-4 w-4" />
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
                                    ['bg-green-400 border-green-500', 'Placed queen'],
                                    ['bg-blue-400 border-blue-500', 'Safe — checking'],
                                    ['bg-red-400 border-red-500', 'Under attack'],
                                    ['bg-red-200 border-red-300', 'Attack zone'],
                                    ['bg-amber-100 border-amber-300', 'Empty cell'],
                                ].map(([cls, label]) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${cls}`} />
                                        <span className="text-sm text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                            <h3 className="text-base font-bold text-white mb-3">Status</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Action:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                        state.action === 'place' || state.action === 'placed' ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                        : state.action === 'backtrack' ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                        : state.action === 'solution' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                        : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                                    }`}>{state.action?.toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Queens placed:</span>
                                    <span className="text-indigo-300 font-bold">{state.board?.filter(p => p !== -1).length ?? 0} / {n}</span>
                                </div>
                                <div className={`rounded-lg p-3 mt-1 ${
                                    state.action === 'backtrack' ? 'bg-red-500/10 border border-red-500/20'
                                    : state.action === 'solution' ? 'bg-purple-500/10 border border-purple-500/20'
                                    : 'bg-indigo-500/10 border border-indigo-500/20'
                                }`}>
                                    <div className="flex items-start gap-2">
                                        <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                            state.action === 'backtrack' ? 'text-red-400'
                                            : state.action === 'solution' ? 'text-purple-400'
                                            : 'text-indigo-400'
                                        }`} />
                                        <p className="text-slate-200 text-xs leading-relaxed">{state.explanation}</p>
                                    </div>
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
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Crown className="h-5 w-5 text-indigo-400" /> {n}×{n} Chessboard
                            </h3>
                            <div className="flex justify-center mb-6">
                                <div className="grid gap-1 p-3 bg-amber-800 rounded-xl shadow-2xl"
                                    style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, maxWidth: '420px', width: '100%' }}>
                                    {Array.from({ length: n }, (_, row) =>
                                        Array.from({ length: n }, (_, col) => (
                                            <div key={`${row}-${col}`}
                                                className={`aspect-square flex items-center justify-center transition-all duration-200 rounded ${getCellClass(row, col)}`}
                                                style={{ minWidth: '36px' }}>
                                                {state.board?.[row] === col && <Crown className="h-5 w-5 text-white drop-shadow" />}
                                            </div>
                                        ))
                                    ).flat()}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <div>
                                    <span className="text-slate-400 text-xs block">Current Row</span>
                                    <span className="text-indigo-300 font-bold">{state.row ?? 0}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block">Queens Placed</span>
                                    <span className="text-indigo-300 font-bold">{state.board?.filter(p => p !== -1).length ?? 0}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block">Solutions Found</span>
                                    <span className="text-purple-300 font-bold">{solutionCount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-indigo-400 text-sm mb-2">Complexity</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Time: O(N!) worst case</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Space: O(N²) for board</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400" /> Pruning dramatically cuts branches</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-indigo-400 text-sm mb-2">Solutions by Size</h4>
                                        <div className="grid grid-cols-5 gap-1 text-xs font-mono">
                                            {[[4,2],[5,10],[6,4],[7,40],[8,92]].map(([size, count]) => (
                                                <div key={size} className={`text-center rounded p-1 ${size === n ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500'}`}>
                                                    {size}×{size}<br />{count}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-indigo-400 text-sm mb-3">Applications</h4>
                                    <ul className="text-slate-400 text-xs space-y-1.5">
                                        {['Constraint satisfaction problems', 'Resource allocation & scheduling', 'Circuit board layout design', 'Puzzle & game AI solving', 'Sudoku and crossword solvers', 'Conflict resolution systems'].map(a => (
                                            <li key={a} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-indigo-400 flex-shrink-0" />{a}</li>
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
