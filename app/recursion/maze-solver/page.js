"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Map, Navigation, Target, AlertCircle,
    ArrowDown, ArrowUp, Brain, CheckCircle, XCircle, Info, ChevronRight, RefreshCw
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does the maze solver do when it hits a dead end?",
        options: [
            "It restarts from the beginning",
            "It marks the cell as a wall and tries a different route",
            "It unmarks the cell as visited and removes it from the path (backtrack)",
            "It signals that the maze has no solution"
        ],
        correct: 2,
        explanation: "Backtracking sets visited[row][col] = false and pops the cell from path. This allows the algorithm to try different directions when revisiting the parent cell."
    },
    {
        question: "Why is a 'visited' array necessary in recursive maze solving?",
        options: [
            "To count the total number of steps taken",
            "To prevent infinite loops — without it we could revisit cells endlessly",
            "To store the final solution path",
            "To mark walls in the maze"
        ],
        correct: 1,
        explanation: "Without tracking visited cells, the recursive solver could bounce back and forth between adjacent cells forever. The visited array ensures each cell is explored at most once."
    },
    {
        question: "In what order does the default maze solver try directions?",
        options: [
            "Up, left, right, down",
            "Random order each time",
            "Toward the goal first",
            "Right, down, left, up"
        ],
        correct: 3,
        explanation: "The implementation tries directions in order: right (0,+1), down (+1,0), left (0,-1), up (-1,0). This determines the specific path found, though any valid path exists if the maze is solvable."
    }
];

export default function MazeSolverVisualizer() {
    const [mazeSize, setMazeSize] = useState(7);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(600);
    const [maze, setMaze] = useState([]);
    const [solutionFound, setSolutionFound] = useState(false);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const generateMaze = (size) => {
        const m = Array(size).fill(null).map(() => Array(size).fill(1));
        for (let i = 1; i < size - 1; i++)
            for (let j = 1; j < size - 1; j++)
                if ((i + j) % 3 !== 0 || (i === 1 && j === 1) || (i === size - 2 && j === size - 2))
                    m[i][j] = 0;
        m[1][1] = 0;
        m[size - 2][size - 2] = 0;
        for (let i = 1; i < size - 1; i++) m[i][1] = 0;
        for (let j = 1; j < size - 1; j++) m[size - 2][j] = 0;
        return m;
    };

    const generateSteps = (mazeGrid) => {
        const steps = [];
        const size = mazeGrid.length;
        const visited = Array(size).fill(null).map(() => Array(size).fill(false));
        const path = [];
        let solutionPath = [];
        let foundSolution = false;
        const start = { row: 1, col: 1 };
        const end = { row: size - 2, col: size - 2 };
        const directions = [{ row: 0, col: 1, name: 'right' }, { row: 1, col: 0, name: 'down' }, { row: 0, col: -1, name: 'left' }, { row: -1, col: 0, name: 'up' }];
        const isValid = (r, c) => r >= 0 && r < size && c >= 0 && c < size && mazeGrid[r][c] === 0 && !visited[r][c];

        steps.push({
            maze: mazeGrid.map(r => [...r]),
            visited: visited.map(r => [...r]),
            currentPos: null, path: [],
            explanation: `Generated ${size}×${size} maze. Starting recursive backtracking from (${start.row}, ${start.col}) to (${end.row}, ${end.col})`,
            depth: 0, action: 'start', direction: null, backtracking: false, solutionFound: false
        });

        const solveMaze = (row, col, depth = 0) => {
            visited[row][col] = true;
            path.push({ row, col });
            steps.push({
                maze: mazeGrid.map(r => [...r]),
                visited: visited.map(r => [...r]),
                currentPos: { row, col }, path: [...path],
                explanation: (row === start.row && col === start.col)
                    ? `Starting at (${row}, ${col}) — exploring all directions`
                    : (row === end.row && col === end.col)
                        ? `Reached the goal at (${row}, ${col})!`
                        : `Exploring (${row}, ${col}) — depth: ${depth}`,
                depth, action: 'explore', direction: null, backtracking: false, solutionFound: false
            });
            if (row === end.row && col === end.col) {
                solutionPath = [...path];
                foundSolution = true;
                steps.push({
                    maze: mazeGrid.map(r => [...r]),
                    visited: visited.map(r => [...r]),
                    currentPos: { row, col }, path: [...solutionPath],
                    explanation: `Solution found! Path length: ${solutionPath.length} cells.`,
                    depth, action: 'solution', direction: null, backtracking: false, solutionFound: true
                });
                return true;
            }
            for (const dir of directions) {
                const newRow = row + dir.row;
                const newCol = col + dir.col;
                if (isValid(newRow, newCol)) {
                    steps.push({
                        maze: mazeGrid.map(r => [...r]),
                        visited: visited.map(r => [...r]),
                        currentPos: { row, col }, path: [...path],
                        explanation: `Valid path ${dir.name} to (${newRow}, ${newCol}) — moving there`,
                        depth, action: 'move', direction: dir.name,
                        nextPos: { row: newRow, col: newCol }, backtracking: false, solutionFound: false
                    });
                    if (solveMaze(newRow, newCol, depth + 1)) return true;
                }
            }
            path.pop();
            visited[row][col] = false;
            if (path.length > 0) {
                steps.push({
                    maze: mazeGrid.map(r => [...r]),
                    visited: visited.map(r => [...r]),
                    currentPos: { row, col }, path: [...path],
                    explanation: `Dead end at (${row}, ${col}) — backtracking to (${path[path.length - 1].row}, ${path[path.length - 1].col})`,
                    depth, action: 'backtrack', direction: null, backtracking: true, solutionFound: false
                });
            }
            return false;
        };

        solveMaze(start.row, start.col);
        setSolutionFound(foundSolution);
        return steps;
    };

    useEffect(() => {
        const newMaze = generateMaze(mazeSize);
        setMaze(newMaze);
        const steps = generateSteps(newMaze);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [mazeSize]);

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

    const handleNewMaze = () => {
        setIsPlaying(false);
        const newMaze = generateMaze(mazeSize);
        setMaze(newMaze);
        const steps = generateSteps(newMaze);
        setStepHistory(steps);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        maze: maze,
        visited: Array(mazeSize).fill(null).map(() => Array(mazeSize).fill(false)),
        currentPos: null, path: [], explanation: 'Click Play to begin solving the maze.',
        depth: 0, action: 'start', direction: null, backtracking: false, solutionFound: false
    };

    const getCellClass = (row, col) => {
        if (!currentState.maze[row]) return '';
        const isWall = currentState.maze[row][col] === 1;
        const isStart = row === 1 && col === 1;
        const isEnd = row === mazeSize - 2 && col === mazeSize - 2;
        const isCurrent = currentState.currentPos?.row === row && currentState.currentPos?.col === col;
        const isInPath = currentState.path.some(p => p.row === row && p.col === col);
        const isVisited = currentState.visited[row]?.[col];
        const isNextPos = currentState.nextPos?.row === row && currentState.nextPos?.col === col;

        if (isWall) return 'bg-slate-800 border-slate-900';
        if (isStart) return 'bg-green-500 border-green-400';
        if (isEnd) return 'bg-red-500 border-red-400';
        if (isCurrent) return currentState.backtracking ? 'bg-orange-400 border-orange-300 animate-pulse' : 'bg-blue-400 border-blue-300 animate-pulse';
        if (isNextPos) return 'bg-yellow-400 border-yellow-300 animate-bounce';
        if (currentState.solutionFound && isInPath) return 'bg-green-300 border-green-400';
        if (isInPath) return 'bg-blue-300 border-blue-400';
        if (isVisited) return 'bg-slate-600 border-slate-500';
        return 'bg-slate-700 border-slate-600';
    };

    const getActionStyle = (action) => {
        switch (action) {
            case 'explore': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
            case 'move': return 'bg-green-500/15 text-green-400 border border-green-500/30';
            case 'backtrack': return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
            case 'solution': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
            default: return 'bg-slate-700/50 text-slate-400';
        }
    };

    const handleQuizAnswer = (idx) => { if (quizState.answered) return; setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct }); };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `def solve_maze(maze, row, col, end_row, end_col, visited, path):
    visited[row][col] = True
    path.append((row, col))

    if row == end_row and col == end_col:
        return True              # Solution found

    # Try all 4 directions: right, down, left, up
    for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
        new_row, new_col = row + dr, col + dc
        if is_valid(new_row, new_col, maze, visited):
            if solve_maze(maze, new_row, new_col,
                          end_row, end_col, visited, path):
                return True

    # Backtrack: undo this cell
    path.pop()
    visited[row][col] = False
    return False

def is_valid(row, col, maze, visited):
    return (0 <= row < len(maze) and
            0 <= col < len(maze[0]) and
            maze[row][col] == 0 and
            not visited[row][col])`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Maze Solver — Backtracking</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch recursive backtracking explore every path, intelligently retreat from dead ends, and find the solution.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Map className="h-4 w-4" /> Backtracking DFS</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> O(4^(m×n))</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Navigation className="h-4 w-4" /> Path Finding</div>
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
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Maze Size: {mazeSize}×{mazeSize}</label>
                                    <input type="range" min="5" max="11" step="2" value={mazeSize}
                                        onChange={(e) => { setMazeSize(parseInt(e.target.value)); setIsPlaying(false); }}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        disabled={isPlaying} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="100" max="1200" step="100" value={speed}
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
                                <button onClick={handleNewMaze} disabled={isPlaying}
                                    className="w-full bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40">
                                    <RefreshCw className="h-4 w-4 mr-2" /> New Maze
                                </button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Color Legend</h3>
                            <div className="space-y-2">
                                {[
                                    ['bg-green-500 border-green-400', 'Start (S)'],
                                    ['bg-red-500 border-red-400', 'Goal (E)'],
                                    ['bg-blue-400 border-blue-300', 'Exploring'],
                                    ['bg-orange-400 border-orange-300', 'Backtracking'],
                                    ['bg-yellow-400 border-yellow-300', 'Next cell'],
                                    ['bg-blue-300 border-blue-400', 'Current path'],
                                    ['bg-green-300 border-green-400', 'Solution path'],
                                    ['bg-slate-600 border-slate-500', 'Visited (dead end)'],
                                    ['bg-slate-800 border-slate-900', 'Wall'],
                                ].map(([cls, label]) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${cls}`}></div>
                                        <span className="text-sm text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Algorithm Status */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3 flex items-center">
                                <AlertCircle className="h-5 w-5 mr-2 text-green-400" /> Algorithm Status
                            </h3>
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
                                    <span className="text-slate-400">Depth:</span>
                                    <span className="text-green-300 font-bold">{currentState.depth}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Path length:</span>
                                    <span className="text-blue-300 font-bold">{currentState.path.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Action:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionStyle(currentState.action)}`}>
                                        {currentState.action.toUpperCase()}
                                    </span>
                                </div>
                                {currentState.direction && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Moving:</span>
                                        <span className="text-green-300 font-medium">{currentState.direction}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Solution:</span>
                                    <span className={`font-medium ${solutionFound ? 'text-green-300' : 'text-orange-400'}`}>
                                        {solutionFound ? 'Found!' : 'Searching...'}
                                    </span>
                                </div>
                                <div className={`rounded-lg p-3 ${currentState.backtracking ? 'bg-orange-500/10 border border-orange-500/20' : currentState.solutionFound ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                                    <div className="flex items-start gap-2">
                                        <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.backtracking ? 'text-orange-400' : currentState.solutionFound ? 'text-emerald-400' : 'text-blue-400'}`} />
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

                    {/* Maze Visualization */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <Target className="h-5 w-5 mr-2 text-green-400" /> Maze Visualization
                            </h3>
                            <div className="flex justify-center mb-4">
                                <div className="grid gap-0.5 p-3 bg-slate-900 rounded-xl border border-slate-700"
                                    style={{ gridTemplateColumns: `repeat(${mazeSize}, minmax(0, 1fr))`, maxWidth: '500px', width: '100%' }}>
                                    {currentState.maze.map((row, rowIndex) =>
                                        row.map((cell, colIndex) => (
                                            <div key={`${rowIndex}-${colIndex}`}
                                                className={`aspect-square border transition-all duration-200 flex items-center justify-center rounded-sm ${getCellClass(rowIndex, colIndex)}`}
                                                style={{ minWidth: '18px', minHeight: '18px' }}>
                                                {rowIndex === 1 && colIndex === 1 && (
                                                    <span className="text-white font-bold text-xs leading-none">S</span>
                                                )}
                                                {rowIndex === mazeSize - 2 && colIndex === mazeSize - 2 && (
                                                    <span className="text-white font-bold text-xs leading-none">E</span>
                                                )}
                                            </div>
                                        ))
                                    ).flat()}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-slate-400 text-xs">Algorithm: </span><span className="text-green-300">Recursive Backtracking</span></div>
                                    <div><span className="text-slate-400 text-xs">Strategy: </span><span className="text-green-300">Depth-First Search</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Complexity</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Time: O(4^(m×n)) worst case</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Space: O(m×n) for visited + stack</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Visited array prevents cycles</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Early exit when goal found</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Backtracking Pattern</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            {['Explore: try a direction', 'Mark: record visited + path', 'Recurse: go deeper', 'Backtrack: undo if failed', 'Repeat: try next direction'].map(s => (
                                                <li key={s} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" />{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-green-400 text-sm mb-3">Applications</h4>
                                    <ul className="text-slate-400 text-xs space-y-1.5">
                                        {['Robotics path planning', 'Game AI NPC navigation', 'GPS route finding', 'Network packet routing', 'Puzzle game solvers', 'Circuit board wire routing', 'A* and Dijkstra variations'].map(a => (
                                            <li key={a} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-green-400" /> Python Implementation</h3>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
