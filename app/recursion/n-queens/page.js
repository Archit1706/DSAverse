"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Crown, AlertTriangle,
    ArrowDown, ArrowUp, Brain, CheckCircle, XCircle, Info, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does backtracking do in N-Queens when a queen can't be placed?",
        options: [
            "It restarts the entire algorithm from scratch",
            "It places a queen anyway and marks conflicts",
            "It removes the most recently placed queen and tries the next column",
            "It swaps two queens to resolve the conflict"
        ],
        correct: 2,
        explanation: "Backtracking removes the last placed queen (board[row] = -1) and tries the next column. If no column works in that row, it backtracks further to the previous row."
    },
    {
        question: "How many solutions does the 8-Queens problem have?",
        options: ["8 solutions", "24 solutions", "64 solutions", "92 solutions"],
        correct: 3,
        explanation: "The 8-Queens problem has exactly 92 distinct solutions. The 4×4 board has 2 solutions, 5×5 has 10, 6×6 has 4, 7×7 has 40."
    },
    {
        question: "Why do we check only columns and diagonals (not rows) for queen attacks?",
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

export default function NQueensVisualizer() {
    const [n, setN] = useState(4);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1500);
    const [solutionCount, setSolutionCount] = useState(0);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

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
                const queenCol = board[i];
                for (let r = 0; r < size; r++) attacked.add(`${r}-${queenCol}`);
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (Math.abs(r - i) === Math.abs(c - queenCol)) attacked.add(`${r}-${c}`);
                    }
                }
            }
            return attacked;
        };

        const solveNQueens = (board, row, path = []) => {
            if (row === size) {
                solutions.push([...board]);
                steps.push({
                    board: [...board], currentRow: row, currentCol: -1,
                    path: [...path, 'Solution found!'],
                    explanation: `Solution ${solutions.length} found! All ${size} queens placed without conflicts.`,
                    attackedCells: new Set(), action: 'solution', isSafe: true
                });
                return;
            }
            for (let col = 0; col < size; col++) {
                const attackedCells = getAttackedCells(board, row);
                const safe = isSafe(board, row, col);
                steps.push({
                    board: [...board], currentRow: row, currentCol: col,
                    path: [...path, `Try (${row}, ${col})`],
                    explanation: safe
                        ? `Position (${row}, ${col}) is safe — placing queen here.`
                        : `Position (${row}, ${col}) is under attack — skipping.`,
                    attackedCells, action: safe ? 'place' : 'check', isSafe: safe
                });
                if (safe) {
                    board[row] = col;
                    steps.push({
                        board: [...board], currentRow: row, currentCol: col,
                        path: [...path, `Queen placed at (${row}, ${col})`],
                        explanation: `Queen placed at row ${row}, col ${col}. Moving to next row.`,
                        attackedCells: getAttackedCells(board, row + 1), action: 'placed', isSafe: true
                    });
                    solveNQueens(board, row + 1, [...path, `Queen placed at (${row}, ${col})`]);
                    board[row] = -1;
                    if (row < size - 1 || col < size - 1) {
                        steps.push({
                            board: [...board], currentRow: row, currentCol: col,
                            path: [...path, `Backtrack from (${row}, ${col})`],
                            explanation: `Backtracking: removing queen from (${row}, ${col}) — trying next column.`,
                            attackedCells: getAttackedCells(board, row), action: 'backtrack', isSafe: false
                        });
                    }
                }
            }
        };

        const board = new Array(size).fill(-1);
        solveNQueens(board, 0);
        setSolutionCount(solutions.length);
        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [n]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => setCurrentStep(p => p + 1), speed);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => { if (currentStep >= stepHistory.length - 1) setCurrentStep(0); setIsPlaying(!isPlaying); };
    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

    const currentState = stepHistory[currentStep] || {
        board: new Array(n).fill(-1), currentRow: 0, currentCol: 0,
        path: [], explanation: 'Click Play to begin the N-Queens visualization.',
        attackedCells: new Set(), action: 'start', isSafe: true
    };

    const getCellClass = (row, col) => {
        const isLight = (row + col) % 2 === 0;
        const baseBoard = isLight ? 'bg-amber-100' : 'bg-amber-200';
        const cellKey = `${row}-${col}`;
        if (currentState.board[row] === col) return `bg-green-400 border-2 border-green-500`;
        if (currentState.currentRow === row && currentState.currentCol === col) {
            return currentState.isSafe
                ? `bg-blue-400 border-2 border-blue-500 animate-pulse`
                : `bg-red-400 border-2 border-red-500 animate-pulse`;
        }
        if (currentState.attackedCells.has(cellKey)) return `${baseBoard} bg-red-200 border border-red-400`;
        return `${baseBoard} border border-amber-300`;
    };

    const handleQuizAnswer = (idx) => { if (quizState.answered) return; setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct }); };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `def solve_nqueens(n):
    def is_safe(board, row, col):
        for i in range(row):
            if (board[i] == col or
                abs(board[i] - col) == abs(i - row)):
                return False
        return True

    def backtrack(board, row):
        if row == n:             # All queens placed
            solutions.append(board[:])
            return
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col       # Place queen
                backtrack(board, row + 1)
                board[row] = -1        # Backtrack

    solutions = []
    board = [-1] * n
    backtrack(board, 0)
    return solutions

# ${n}-Queens: ${solutionCount} solution${solutionCount !== 1 ? 's' : ''}`;

    const q = quizQuestions[currentQuestion];

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">N-Queens Problem</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch backtracking place queens row by row, retreat when stuck, and systematically find all valid arrangements.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Crown className="h-4 w-4" /> Backtracking</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> O(N!)</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><AlertTriangle className="h-4 w-4" /> {solutionCount} solutions</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Board: {n}×{n} &nbsp; ({solutionCount} solutions)</label>
                                    <input type="range" min="4" max="8" value={n}
                                        onChange={(e) => { setN(parseInt(e.target.value)); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        disabled={isPlaying} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="500" max="3000" step="250" value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
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
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm disabled:opacity-40">
                                        <ArrowUp className="h-4 w-4 mr-1" /> Prev
                                    </button>
                                    <button onClick={stepForward} disabled={currentStep === stepHistory.length - 1 || isPlaying}
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm disabled:opacity-40">
                                        Next <ArrowDown className="h-4 w-4 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Color Legend</h3>
                            <div className="space-y-2">
                                {[
                                    ['bg-green-400 border-green-500', 'Placed Queen'],
                                    ['bg-blue-400 border-blue-500', 'Safe Position (checking)'],
                                    ['bg-red-400 border-red-500', 'Unsafe Position'],
                                    ['bg-red-200 border-red-400', 'Under Attack'],
                                    ['bg-amber-100 border-amber-300', 'Normal Cell'],
                                ].map(([cls, label]) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${cls}`}></div>
                                        <span className="text-sm text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step Info */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Current Step</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span><span>{currentStep + 1}/{stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Action:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${currentState.action === 'place' || currentState.action === 'placed'
                                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                        : currentState.action === 'backtrack'
                                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                            : currentState.action === 'solution'
                                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                        }`}>
                                        {currentState.action.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Queens placed:</span>
                                    <span className="text-green-300 font-bold">{currentState.board.filter(p => p !== -1).length} / {n}</span>
                                </div>
                                <div className={`rounded-lg p-3 ${currentState.action === 'backtrack' ? 'bg-red-500/10 border border-red-500/20' : currentState.action === 'solution' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                                    <div className="flex items-start gap-2">
                                        <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.action === 'backtrack' ? 'text-red-400' : currentState.action === 'solution' ? 'text-purple-400' : 'text-green-400'}`} />
                                        <p className="text-slate-200 text-xs leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-green-500/30 shadow-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="h-5 w-5 text-green-400" />
                                <h3 className="text-base font-bold text-white">Test Yourself</h3>
                                <span className="ml-auto text-xs text-slate-500">Q{currentQuestion + 1}/{quizQuestions.length}</span>
                            </div>
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
                                <div className={`rounded-lg p-3 mb-2 ${quizState.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {quizState.correct ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                                        <span className={`text-xs font-semibold ${quizState.correct ? 'text-green-300' : 'text-red-300'}`}>{quizState.correct ? 'Correct!' : 'Not quite.'}</span>
                                    </div>
                                    <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                </div>
                            )}
                            {quizState.answered && (
                                <button onClick={nextQuestion} className="w-full bg-green-700 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">Next Question</button>
                            )}
                        </div>
                    </div>

                    {/* Chessboard */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <Crown className="h-5 w-5 mr-2 text-green-400" /> {n}×{n} Chessboard
                            </h3>
                            <div className="flex justify-center mb-6">
                                <div className="grid gap-1 p-3 bg-amber-800 rounded-xl shadow-2xl"
                                    style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, maxWidth: '420px', width: '100%' }}>
                                    {Array.from({ length: n }, (_, row) =>
                                        Array.from({ length: n }, (_, col) => (
                                            <div key={`${row}-${col}`}
                                                className={`aspect-square flex items-center justify-center transition-all duration-300 rounded ${getCellClass(row, col)}`}
                                                style={{ minWidth: '36px' }}>
                                                {currentState.board[row] === col && (
                                                    <Crown className="h-5 w-5 text-white drop-shadow" />
                                                )}
                                            </div>
                                        ))
                                    ).flat()}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-400 text-xs">Current Row</span>
                                        <div className="text-green-300 font-bold">{currentState.currentRow}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-xs">Queens Placed</span>
                                        <div className="text-green-300 font-bold">{currentState.board.filter(p => p !== -1).length}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-xs">Total Solutions</span>
                                        <div className="text-purple-300 font-bold">{solutionCount}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Algorithm Analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Complexity</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Time: O(N!) worst case</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Space: O(N²) for board</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Backtracking prunes many branches</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Solutions by Size</h4>
                                        <div className="grid grid-cols-3 gap-1 text-xs font-mono">
                                            {[[4, 2], [5, 10], [6, 4], [7, 40], [8, 92]].map(([size, count]) => (
                                                <div key={size} className={`text-center rounded p-1 ${size === n ? 'bg-green-500/20 text-green-300' : 'text-slate-500'}`}>
                                                    {size}×{size}: {count}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-green-400 text-sm mb-3">Applications</h4>
                                    <ul className="text-slate-400 text-xs space-y-1.5">
                                        {['Constraint satisfaction problems', 'Resource allocation & scheduling', 'Circuit board layout design', 'Puzzle & game AI solving', 'Sudoku and crossword solvers', 'Conflict resolution systems'].map(a => (
                                            <li key={a} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-green-400" /> Backtracking Algorithm (Python)</h3>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
