"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Crown, AlertTriangle } from 'lucide-react';

const NQueensVisualizer = () => {
    const [n, setN] = useState(4);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1500);
    const [solutionCount, setSolutionCount] = useState(0);

    // Generate step history for N-Queens visualization
    const generateSteps = (size) => {
        const steps = [];
        const solutions = [];

        const isSafe = (board, row, col) => {
            // Check column
            for (let i = 0; i < row; i++) {
                if (board[i] === col) return false;
            }

            // Check diagonal (top-left to bottom-right)
            for (let i = 0; i < row; i++) {
                if (Math.abs(board[i] - col) === Math.abs(i - row)) return false;
            }

            return true;
        };

        const getAttackedCells = (board, row) => {
            const attacked = new Set();

            for (let i = 0; i < row; i++) {
                const queenCol = board[i];

                // Add column attacks
                for (let r = 0; r < size; r++) {
                    attacked.add(`${r}-${queenCol}`);
                }

                // Add diagonal attacks
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (Math.abs(r - i) === Math.abs(c - queenCol)) {
                            attacked.add(`${r}-${c}`);
                        }
                    }
                }
            }

            return attacked;
        };

        const solveNQueens = (board, row, path = []) => {
            // Base case - all queens placed
            if (row === size) {
                solutions.push([...board]);
                steps.push({
                    board: [...board],
                    currentRow: row,
                    currentCol: -1,
                    path: [...path, `Solution found!`],
                    explanation: `🎉 Solution ${solutions.length} found! All ${size} queens placed successfully.`,
                    attackedCells: new Set(),
                    action: 'solution',
                    isSafe: true
                });
                return;
            }

            // Try placing queen in each column of current row
            for (let col = 0; col < size; col++) {
                const currentPath = [...path, `Try placing queen at (${row}, ${col})`];
                const attackedCells = getAttackedCells(board, row);
                const safe = isSafe(board, row, col);

                steps.push({
                    board: [...board],
                    currentRow: row,
                    currentCol: col,
                    path: currentPath,
                    explanation: safe
                        ? `✅ Position (${row}, ${col}) is safe. Placing queen.`
                        : `❌ Position (${row}, ${col}) is under attack. Trying next position.`,
                    attackedCells: attackedCells,
                    action: safe ? 'place' : 'check',
                    isSafe: safe
                });

                if (safe) {
                    board[row] = col;

                    // Add placement step
                    steps.push({
                        board: [...board],
                        currentRow: row,
                        currentCol: col,
                        path: [...currentPath, `Queen placed at (${row}, ${col})`],
                        explanation: `Queen successfully placed at row ${row}, column ${col}. Moving to next row.`,
                        attackedCells: getAttackedCells(board, row + 1),
                        action: 'placed',
                        isSafe: true
                    });

                    // Recursive call for next row
                    solveNQueens(board, row + 1, [...currentPath, `Queen placed at (${row}, ${col})`]);

                    // Backtrack
                    board[row] = -1;
                    if (row < size - 1 || col < size - 1) {
                        steps.push({
                            board: [...board],
                            currentRow: row,
                            currentCol: col,
                            path: [...currentPath, `Backtracking from (${row}, ${col})`],
                            explanation: `🔙 Backtracking: Removing queen from (${row}, ${col}) and trying next position.`,
                            attackedCells: getAttackedCells(board, row),
                            action: 'backtrack',
                            isSafe: false
                        });
                    }
                }
            }
        };

        // Initialize board with -1 (no queen)
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
            interval = setInterval(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) {
            setCurrentStep(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        board: new Array(n).fill(-1),
        currentRow: 0,
        currentCol: 0,
        path: [],
        explanation: 'Click Start to begin the N-Queens visualization',
        attackedCells: new Set(),
        action: 'start',
        isSafe: true
    };

    const getCellClass = (row, col) => {
        const isLight = (row + col) % 2 === 0;
        const baseClass = isLight ? 'bg-amber-100' : 'bg-amber-200';
        const cellKey = `${row}-${col}`;

        // Queen placed
        if (currentState.board[row] === col) {
            return `${baseClass} bg-green-300 border-2 border-green-500`;
        }

        // Current position being checked
        if (currentState.currentRow === row && currentState.currentCol === col) {
            return currentState.isSafe
                ? `${baseClass} bg-blue-300 border-2 border-blue-500 animate-pulse`
                : `${baseClass} bg-red-300 border-2 border-red-500 animate-pulse`;
        }

        // Attacked cell
        if (currentState.attackedCells.has(cellKey)) {
            return `${baseClass} bg-red-100 border border-red-300`;
        }

        return `${baseClass} border border-gray-300`;
    };

    const codeExample = `def solve_nqueens(n):
    def is_safe(board, row, col):
        # Check column and diagonals
        for i in range(row):
            if (board[i] == col or 
                abs(board[i] - col) == abs(i - row)):
                return False
        return True
    
    def backtrack(board, row):
        if row == n:  # Base case - solution found
            solutions.append(board[:])
            return
        
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col  # Place queen
                backtrack(board, row + 1)  # Recurse
                board[row] = -1  # Backtrack
    
    solutions = []
    board = [-1] * n
    backtrack(board, 0)
    return solutions

# Example: ${n}-Queens has ${solutionCount} solution${solutionCount !== 1 ? 's' : ''}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/recursion" className="flex items-center text-white hover:text-green-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Recursion
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            N-Queens Problem
                        </h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch backtracking recursion solve the classic N-Queens puzzle by placing queens on a chessboard.
                        </p>
                        <div className="flex justify-center items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Crown className="h-4 w-4" />
                                Backtracking
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                Time: O(N!)
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <AlertTriangle className="h-4 w-4" />
                                Space: O(N²)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Controls</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Board Size (N): {n}×{n}
                                    </label>
                                    <input
                                        type="range"
                                        min="4"
                                        max="8"
                                        value={n}
                                        onChange={(e) => setN(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                        disabled={isPlaying}
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        {solutionCount} solution{solutionCount !== 1 ? 's' : ''} exist{solutionCount === 1 ? 's' : ''}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Speed: {speed}ms
                                    </label>
                                    <input
                                        type="range"
                                        min="800"
                                        max="3000"
                                        step="200"
                                        value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePlay}
                                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                                    >
                                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isPlaying ? 'Pause' : 'Start'}
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Legend</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-green-300 border-2 border-green-500 rounded flex items-center justify-center">
                                        <Crown className="h-4 w-4 text-green-700" />
                                    </div>
                                    <span className="text-sm text-gray-700">Placed Queen</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-blue-300 border-2 border-blue-500 rounded"></div>
                                    <span className="text-sm text-gray-700">Safe Position</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-red-300 border-2 border-red-500 rounded"></div>
                                    <span className="text-sm text-gray-700">Unsafe Position</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
                                    <span className="text-sm text-gray-700">Under Attack</span>
                                </div>
                            </div>
                        </div>

                        {/* Step Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Current Step</h3>
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600">
                                    Step {currentStep + 1} of {stepHistory.length}
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-green-800 text-sm">
                                        {currentState.explanation}
                                    </p>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Action: </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${currentState.action === 'place' || currentState.action === 'placed'
                                            ? 'bg-green-100 text-green-800'
                                            : currentState.action === 'backtrack'
                                                ? 'bg-red-100 text-red-800'
                                                : currentState.action === 'solution'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {currentState.action.charAt(0).toUpperCase() + currentState.action.slice(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chessboard */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <Crown className="h-5 w-5 mr-2 text-green-600" />
                                {n}×{n} Chessboard
                            </h3>

                            <div className="flex justify-center mb-6">
                                <div
                                    className="grid gap-1 p-4 bg-amber-800 rounded-lg"
                                    style={{
                                        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
                                        maxWidth: '400px',
                                        width: '100%'
                                    }}
                                >
                                    {Array.from({ length: n }, (_, row) =>
                                        Array.from({ length: n }, (_, col) => (
                                            <div
                                                key={`${row}-${col}`}
                                                className={`aspect-square flex items-center justify-center transition-all duration-300 ${getCellClass(row, col)}`}
                                                style={{ minWidth: '40px' }}
                                            >
                                                {currentState.board[row] === col && (
                                                    <Crown className="h-6 w-6 text-green-700" />
                                                )}
                                            </div>
                                        ))
                                    ).flat()}
                                </div>
                            </div>

                            {/* Progress Info */}
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Current Row: </span>
                                        <span className="text-amber-700">{currentState.currentRow}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Queens Placed: </span>
                                        <span className="text-amber-700">
                                            {currentState.board.filter(pos => pos !== -1).length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Algorithm Code */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Code className="h-5 w-5 mr-2 text-green-600" />
                        Backtracking Algorithm
                    </h3>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                        <code>{codeExample}</code>
                    </pre>
                </div>

                {/* Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Algorithm Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Time Complexity: O(N!)</h4>
                            <p className="text-gray-600 text-sm mb-4">
                                In the worst case, we try all possible arrangements of N queens, which is approximately N! possibilities.
                            </p>
                            <h4 className="font-bold text-green-700 mb-2">Space Complexity: O(N²)</h4>
                            <p className="text-gray-600 text-sm">
                                We need space for the board (N×N) and the recursion stack depth is at most N.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Real-World Applications</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• Constraint satisfaction problems</li>
                                <li>• Resource allocation optimization</li>
                                <li>• Scheduling conflicts resolution</li>
                                <li>• Game AI and puzzle solving</li>
                                <li>• Circuit board layout design</li>
                                <li>• Sudoku and crossword solvers</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NQueensVisualizer;