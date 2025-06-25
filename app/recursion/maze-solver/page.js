"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Map, Navigation, Target, AlertCircle } from 'lucide-react';

const MazeSolverVisualizer = () => {
    const [mazeSize, setMazeSize] = useState(7);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(600);
    const [maze, setMaze] = useState([]);
    const [solutionFound, setSolutionFound] = useState(false);

    // Generate a solvable maze
    const generateMaze = (size) => {
        // Create maze with borders (1 = wall, 0 = path)
        const maze = Array(size).fill().map(() => Array(size).fill(1));

        // Simple maze pattern - ensure there's always a path
        // Create a path from top-left to bottom-right
        for (let i = 1; i < size - 1; i++) {
            for (let j = 1; j < size - 1; j++) {
                // Create some open spaces
                if ((i + j) % 3 !== 0 || (i === 1 && j === 1) || (i === size - 2 && j === size - 2)) {
                    maze[i][j] = 0;
                }
            }
        }

        // Ensure start and end are open
        maze[1][1] = 0; // Start
        maze[size - 2][size - 2] = 0; // End

        // Create guaranteed path
        for (let i = 1; i < size - 1; i++) {
            maze[i][1] = 0; // Vertical path down
        }
        for (let j = 1; j < size - 1; j++) {
            maze[size - 2][j] = 0; // Horizontal path right
        }

        return maze;
    };

    // Generate step history for maze solving
    const generateSteps = (mazeGrid) => {
        const steps = [];
        const size = mazeGrid.length;
        const visited = Array(size).fill().map(() => Array(size).fill(false));
        const path = [];
        let solutionPath = [];
        let foundSolution = false;

        const start = { row: 1, col: 1 };
        const end = { row: size - 2, col: size - 2 };

        // Directions: right, down, left, up
        const directions = [
            { row: 0, col: 1, name: 'right' },
            { row: 1, col: 0, name: 'down' },
            { row: 0, col: -1, name: 'left' },
            { row: -1, col: 0, name: 'up' }
        ];

        const isValid = (row, col) => {
            return row >= 0 && row < size && col >= 0 && col < size &&
                mazeGrid[row][col] === 0 && !visited[row][col];
        };

        const solveMaze = (row, col, depth = 0) => {
            // Mark current cell as visited
            visited[row][col] = true;
            path.push({ row, col });

            steps.push({
                maze: mazeGrid.map(row => [...row]),
                visited: visited.map(row => [...row]),
                currentPos: { row, col },
                path: [...path],
                explanation: (row === start.row && col === start.col)
                    ? `🚀 Starting at position (${row}, ${col})`
                    : (row === end.row && col === end.col)
                        ? `🎯 Reached the goal at (${row}, ${col})! Solution found!`
                        : `📍 Exploring position (${row}, ${col}) - checking all directions`,
                depth: depth,
                action: 'explore',
                direction: null,
                backtracking: false,
                solutionFound: false
            });

            // Check if we reached the goal
            if (row === end.row && col === end.col) {
                solutionPath = [...path];
                foundSolution = true;

                steps.push({
                    maze: mazeGrid.map(row => [...row]),
                    visited: visited.map(row => [...row]),
                    currentPos: { row, col },
                    path: [...solutionPath],
                    explanation: `🎉 Solution found! Path has ${solutionPath.length} steps.`,
                    depth: depth,
                    action: 'solution',
                    direction: null,
                    backtracking: false,
                    solutionFound: true
                });
                return true;
            }

            // Try all four directions
            for (let i = 0; i < directions.length; i++) {
                const dir = directions[i];
                const newRow = row + dir.row;
                const newCol = col + dir.col;

                if (isValid(newRow, newCol)) {
                    steps.push({
                        maze: mazeGrid.map(row => [...row]),
                        visited: visited.map(row => [...row]),
                        currentPos: { row, col },
                        path: [...path],
                        explanation: `🔍 Found valid path ${dir.name} to (${newRow}, ${newCol}) - moving there`,
                        depth: depth,
                        action: 'move',
                        direction: dir.name,
                        nextPos: { row: newRow, col: newCol },
                        backtracking: false,
                        solutionFound: false
                    });

                    // Recursive call
                    if (solveMaze(newRow, newCol, depth + 1)) {
                        return true;
                    }
                }
            }

            // If we get here, we need to backtrack
            path.pop();
            visited[row][col] = false;

            if (path.length > 0) {
                steps.push({
                    maze: mazeGrid.map(row => [...row]),
                    visited: visited.map(row => [...row]),
                    currentPos: { row, col },
                    path: [...path],
                    explanation: `🔙 Dead end at (${row}, ${col}) - backtracking to (${path[path.length - 1].row}, ${path[path.length - 1].col})`,
                    depth: depth,
                    action: 'backtrack',
                    direction: null,
                    backtracking: true,
                    solutionFound: false
                });
            }

            return false;
        };

        // Initial step
        steps.push({
            maze: mazeGrid.map(row => [...row]),
            visited: visited.map(row => [...row]),
            currentPos: null,
            path: [],
            explanation: `🗺️ Generated ${size}×${size} maze. Starting maze solving from (${start.row}, ${start.col}) to (${end.row}, ${end.col})`,
            depth: 0,
            action: 'start',
            direction: null,
            backtracking: false,
            solutionFound: false
        });

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
        visited: Array(mazeSize).fill().map(() => Array(mazeSize).fill(false)),
        currentPos: null,
        path: [],
        explanation: 'Click Start to begin solving the maze',
        depth: 0,
        action: 'start',
        direction: null,
        backtracking: false,
        solutionFound: false
    };

    const getCellClass = (row, col) => {
        const isWall = currentState.maze[row] && currentState.maze[row][col] === 1;
        const isStart = row === 1 && col === 1;
        const isEnd = row === mazeSize - 2 && col === mazeSize - 2;
        const isCurrent = currentState.currentPos && currentState.currentPos.row === row && currentState.currentPos.col === col;
        const isInPath = currentState.path.some(p => p.row === row && p.col === col);
        const isVisited = currentState.visited[row] && currentState.visited[row][col];
        const isNextPos = currentState.nextPos && currentState.nextPos.row === row && currentState.nextPos.col === col;

        if (isWall) return 'bg-gray-800 border-gray-900';
        if (isStart) return 'bg-green-500 border-green-600';
        if (isEnd) return 'bg-red-500 border-red-600';
        if (isCurrent) return currentState.backtracking
            ? 'bg-orange-400 border-orange-500 animate-pulse'
            : 'bg-blue-400 border-blue-500 animate-pulse';
        if (isNextPos) return 'bg-yellow-300 border-yellow-400 animate-bounce';
        if (currentState.solutionFound && isInPath) return 'bg-green-300 border-green-400';
        if (isInPath) return 'bg-blue-200 border-blue-300';
        if (isVisited) return 'bg-gray-300 border-gray-400';

        return 'bg-white border-gray-300';
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'start': return 'bg-gray-100 text-gray-800';
            case 'explore': return 'bg-blue-100 text-blue-800';
            case 'move': return 'bg-green-100 text-green-800';
            case 'backtrack': return 'bg-orange-100 text-orange-800';
            case 'solution': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const codeExample = `def solve_maze(maze, row, col, end_row, end_col, visited, path):
    # Mark current cell as visited
    visited[row][col] = True
    path.append((row, col))
    
    # Check if we reached the goal
    if row == end_row and col == end_col:
        return True  # Solution found!
    
    # Try all four directions: right, down, left, up
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    
    for dr, dc in directions:
        new_row, new_col = row + dr, col + dc
        
        # Check if new position is valid
        if (is_valid(new_row, new_col, maze, visited)):
            # Recursive call
            if solve_maze(maze, new_row, new_col, end_row, end_col, visited, path):
                return True
    
    # Backtrack: remove current cell from path
    path.pop()
    visited[row][col] = False
    return False

def is_valid(row, col, maze, visited):
    return (0 <= row < len(maze) and 
            0 <= col < len(maze[0]) and 
            maze[row][col] == 0 and 
            not visited[row][col])

# Solve ${mazeSize}×${mazeSize} maze
path = []
visited = [[False] * ${mazeSize} for _ in range(${mazeSize})]
solution_exists = solve_maze(maze, 1, 1, ${mazeSize - 2}, ${mazeSize - 2}, visited, path)`;

    const javaScriptCode = `function solveMaze(maze, row, col, endRow, endCol, visited, path) {
    visited[row][col] = true;
    path.push([row, col]);
    
    // Check if we reached the goal
    if (row === endRow && col === endCol) {
        return true;
    }
    
    // Try all directions
    const directions = [[0,1], [1,0], [0,-1], [-1,0]];
    
    for (let [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        if (isValid(newRow, newCol, maze, visited)) {
            if (solveMaze(maze, newRow, newCol, endRow, endCol, visited, path)) {
                return true;
            }
        }
    }
    
    // Backtrack
    path.pop();
    visited[row][col] = false;
    return false;
}

function isValid(row, col, maze, visited) {
    return row >= 0 && row < maze.length && 
           col >= 0 && col < maze[0].length && 
           maze[row][col] === 0 && !visited[row][col];
}`;

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
                            Maze Solver - Backtracking
                        </h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch recursive backtracking explore the maze, hit dead ends, and intelligently backtrack to find the solution path.
                        </p>
                        <div className="flex justify-center items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Map className="h-4 w-4" />
                                Backtracking Algorithm
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                O(4^(m×n)) Time
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Navigation className="h-4 w-4" />
                                Path Finding
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
                                        Maze Size: {mazeSize}×{mazeSize}
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="11"
                                        step="2"
                                        value={mazeSize}
                                        onChange={(e) => setMazeSize(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                        disabled={isPlaying}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Speed: {speed}ms
                                    </label>
                                    <input
                                        type="range"
                                        min="200"
                                        max="1200"
                                        step="100"
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

                                <button
                                    onClick={handleNewMaze}
                                    disabled={isPlaying}
                                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                                >
                                    <Map className="h-4 w-4 mr-2" />
                                    New Maze
                                </button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Legend</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-green-500 border border-green-600 rounded"></div>
                                    <span className="text-sm text-gray-700">Start Position</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-red-500 border border-red-600 rounded"></div>
                                    <span className="text-sm text-gray-700">Goal Position</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-blue-400 border border-blue-500 rounded"></div>
                                    <span className="text-sm text-gray-700">Current Position</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-blue-200 border border-blue-300 rounded"></div>
                                    <span className="text-sm text-gray-700">Current Path</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-orange-400 border border-orange-500 rounded"></div>
                                    <span className="text-sm text-gray-700">Backtracking</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-gray-300 border border-gray-400 rounded"></div>
                                    <span className="text-sm text-gray-700">Visited Cell</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-gray-800 border border-gray-900 rounded"></div>
                                    <span className="text-sm text-gray-700">Wall</span>
                                </div>
                            </div>
                        </div>

                        {/* Algorithm Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <AlertCircle className="h-5 w-5 mr-2 text-green-600" />
                                Algorithm Status
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Recursion Depth:</span>
                                    <span className="text-lg font-bold text-green-700">
                                        {currentState.depth}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Path Length:</span>
                                    <span className="text-lg font-bold text-blue-700">
                                        {currentState.path.length}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Action: </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(currentState.action)}`}>
                                        {currentState.action.toUpperCase()}
                                    </span>
                                </div>
                                {currentState.direction && (
                                    <div className="text-sm">
                                        <span className="font-medium text-gray-700">Moving: </span>
                                        <span className="text-green-700 font-medium">{currentState.direction}</span>
                                    </div>
                                )}
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Solution: </span>
                                    <span className={`font-medium ${solutionFound ? 'text-green-700' : 'text-orange-700'}`}>
                                        {solutionFound ? 'Found!' : 'Searching...'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Current Step */}
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
                            </div>
                        </div>
                    </div>

                    {/* Maze Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <Target className="h-5 w-5 mr-2 text-green-600" />
                                Maze Visualization
                            </h3>

                            {/* Maze Grid */}
                            <div className="flex justify-center mb-6">
                                <div
                                    className="grid gap-1 p-4 bg-gray-100 rounded-lg border-2 border-gray-300"
                                    style={{
                                        gridTemplateColumns: `repeat(${mazeSize}, minmax(0, 1fr))`,
                                        maxWidth: '500px'
                                    }}
                                >
                                    {currentState.maze.map((row, rowIndex) =>
                                        row.map((cell, colIndex) => (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                className={`aspect-square border-2 transition-all duration-300 ${getCellClass(rowIndex, colIndex)}`}
                                                style={{ minWidth: '20px', minHeight: '20px' }}
                                            >
                                                {/* Show start/end markers */}
                                                {rowIndex === 1 && colIndex === 1 && (
                                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                                                        S
                                                    </div>
                                                )}
                                                {rowIndex === mazeSize - 2 && colIndex === mazeSize - 2 && (
                                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                                                        E
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ).flat()}
                                </div>
                            </div>

                            {/* Progress Info */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Algorithm: </span>
                                        <span className="text-green-700">Recursive Backtracking</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Strategy: </span>
                                        <span className="text-green-700">Depth-First Search</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Code Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            Python Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                            <code>{codeExample}</code>
                        </pre>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            JavaScript Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                            <code>{javaScriptCode}</code>
                        </pre>
                    </div>
                </div>

                {/* Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Algorithm Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Complexity Analysis</h4>
                            <ul className="text-gray-600 text-sm space-y-1 mb-4">
                                <li>• <strong>Time Complexity:</strong> O(4^(m×n)) worst case</li>
                                <li>• <strong>Space Complexity:</strong> O(m×n) for recursion stack</li>
                                <li>• <strong>Strategy:</strong> Depth-First Search with backtracking</li>
                                <li>• <strong>Optimization:</strong> Early termination when solution found</li>
                                <li>• <strong>Memory:</strong> Visited array prevents cycles</li>
                            </ul>

                            <h4 className="font-bold text-green-700 mb-2">Backtracking Pattern</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• Explore: Try a path</li>
                                <li>• Mark: Record current state</li>
                                <li>• Recurse: Go deeper</li>
                                <li>• Backtrack: Undo if failed</li>
                                <li>• Systematic: Try all possibilities</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Real-World Applications</h4>
                            <ul className="text-gray-600 text-sm space-y-1 mb-4">
                                <li>• <strong>Robotics:</strong> Path planning and navigation</li>
                                <li>• <strong>Game AI:</strong> NPC movement and pathfinding</li>
                                <li>• <strong>GPS Systems:</strong> Route finding algorithms</li>
                                <li>• <strong>Network Routing:</strong> Packet path selection</li>
                                <li>• <strong>Puzzle Games:</strong> Solution verification</li>
                                <li>• <strong>Circuit Design:</strong> Wire routing on PCBs</li>
                            </ul>

                            <h4 className="font-bold text-green-700 mb-2">Algorithm Variations</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• A* Search: Uses heuristics for efficiency</li>
                                <li>• Dijkstra&apos;s: Finds shortest weighted paths</li>
                                <li>• BFS: Finds shortest unweighted paths</li>
                                <li>• Wall Follower: Simple maze solving rule</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MazeSolverVisualizer;