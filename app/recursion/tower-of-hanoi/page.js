"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Layers, Target, Move } from 'lucide-react';

const TowerHanoiVisualizer = () => {
    const [n, setN] = useState(3);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);
    const [towers, setTowers] = useState([[], [], []]);

    // Generate step history for Tower of Hanoi
    const generateSteps = (numDisks) => {
        const steps = [];
        const towers = [[], [], []];

        // Initialize towers - all disks on first tower (largest to smallest)
        for (let i = numDisks; i >= 1; i--) {
            towers[0].push(i);
        }

        let moveCount = 0;
        let callDepth = 0;

        // Initial state
        steps.push({
            towers: towers.map(t => [...t]),
            explanation: `Starting position: All ${numDisks} disks on Tower A (source)`,
            currentMove: null,
            recursiveCall: `hanoi(${numDisks}, A, C, B)`,
            depth: 0,
            moveCount: 0,
            phase: 'start',
            subproblem: `Move ${numDisks} disks from A to C using B as auxiliary`
        });

        const hanoi = (n, source, destination, auxiliary, depth = 0) => {
            callDepth = Math.max(callDepth, depth);

            if (n === 1) {
                // Base case - move single disk
                const disk = towers[source].pop();
                towers[destination].push(disk);
                moveCount++;

                steps.push({
                    towers: towers.map(t => [...t]),
                    explanation: `Base case: Move disk ${disk} from ${String.fromCharCode(65 + source)} to ${String.fromCharCode(65 + destination)}`,
                    currentMove: {
                        disk: disk,
                        from: source,
                        to: destination,
                        moveNumber: moveCount
                    },
                    recursiveCall: `hanoi(1, ${String.fromCharCode(65 + source)}, ${String.fromCharCode(65 + destination)}, ${String.fromCharCode(65 + auxiliary)})`,
                    depth: depth,
                    moveCount: moveCount,
                    phase: 'base',
                    subproblem: `Move disk ${disk} directly`
                });
                return;
            }

            // Step 1: Move n-1 disks from source to auxiliary
            steps.push({
                towers: towers.map(t => [...t]),
                explanation: `Step 1: Move top ${n - 1} disk${n - 1 > 1 ? 's' : ''} from ${String.fromCharCode(65 + source)} to ${String.fromCharCode(65 + auxiliary)}`,
                currentMove: null,
                recursiveCall: `hanoi(${n - 1}, ${String.fromCharCode(65 + source)}, ${String.fromCharCode(65 + auxiliary)}, ${String.fromCharCode(65 + destination)})`,
                depth: depth,
                moveCount: moveCount,
                phase: 'step1',
                subproblem: `Recursive: Move ${n - 1} disks to auxiliary tower`
            });

            hanoi(n - 1, source, auxiliary, destination, depth + 1);

            // Step 2: Move the largest disk from source to destination
            const largeDisk = towers[source].pop();
            towers[destination].push(largeDisk);
            moveCount++;

            steps.push({
                towers: towers.map(t => [...t]),
                explanation: `Step 2: Move largest disk ${largeDisk} from ${String.fromCharCode(65 + source)} to ${String.fromCharCode(65 + destination)}`,
                currentMove: {
                    disk: largeDisk,
                    from: source,
                    to: destination,
                    moveNumber: moveCount
                },
                recursiveCall: `hanoi(1, ${String.fromCharCode(65 + source)}, ${String.fromCharCode(65 + destination)}, ${String.fromCharCode(65 + auxiliary)})`,
                depth: depth,
                moveCount: moveCount,
                phase: 'step2',
                subproblem: `Move largest disk to destination`
            });

            // Step 3: Move n-1 disks from auxiliary to destination
            steps.push({
                towers: towers.map(t => [...t]),
                explanation: `Step 3: Move ${n - 1} disk${n - 1 > 1 ? 's' : ''} from ${String.fromCharCode(65 + auxiliary)} to ${String.fromCharCode(65 + destination)}`,
                currentMove: null,
                recursiveCall: `hanoi(${n - 1}, ${String.fromCharCode(65 + auxiliary)}, ${String.fromCharCode(65 + destination)}, ${String.fromCharCode(65 + source)})`,
                depth: depth,
                moveCount: moveCount,
                phase: 'step3',
                subproblem: `Recursive: Move ${n - 1} disks to destination`
            });

            hanoi(n - 1, auxiliary, destination, source, depth + 1);
        };

        hanoi(numDisks, 0, 2, 1); // From tower 0 (A) to tower 2 (C) using tower 1 (B)

        // Final state
        steps.push({
            towers: towers.map(t => [...t]),
            explanation: `🎉 Puzzle solved! All ${numDisks} disks moved to Tower C in ${moveCount} moves`,
            currentMove: null,
            recursiveCall: 'COMPLETED',
            depth: 0,
            moveCount: moveCount,
            phase: 'complete',
            subproblem: `Solution complete in minimum ${Math.pow(2, numDisks) - 1} moves`
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
        if (steps.length > 0) {
            setTowers(steps[0].towers);
        }
    }, [n]);

    useEffect(() => {
        const currentState = stepHistory[currentStep];
        if (currentState) {
            setTowers(currentState.towers);
        }
    }, [currentStep, stepHistory]);

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
        towers: [[], [], []],
        explanation: 'Click Start to begin solving the Tower of Hanoi puzzle',
        currentMove: null,
        recursiveCall: '',
        depth: 0,
        moveCount: 0,
        phase: 'start',
        subproblem: ''
    };

    const getDiskColor = (diskSize, totalDisks) => {
        const colors = [
            'bg-red-400 border-red-500',
            'bg-blue-400 border-blue-500',
            'bg-green-400 border-green-500',
            'bg-yellow-400 border-yellow-500',
            'bg-purple-400 border-purple-500',
            'bg-pink-400 border-pink-500',
            'bg-indigo-400 border-indigo-500'
        ];
        return colors[(diskSize - 1) % colors.length];
    };

    const getTowerLabel = (index) => ['A (Source)', 'B (Auxiliary)', 'C (Destination)'][index];

    const getPhaseColor = (phase) => {
        switch (phase) {
            case 'start': return 'bg-gray-100 text-gray-800';
            case 'step1': return 'bg-blue-100 text-blue-800';
            case 'step2': return 'bg-green-100 text-green-800';
            case 'step3': return 'bg-purple-100 text-purple-800';
            case 'base': return 'bg-yellow-100 text-yellow-800';
            case 'complete': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const minMoves = Math.pow(2, n) - 1;

    const codeExample = `def tower_of_hanoi(n, source, destination, auxiliary):
    if n == 1:
        # Base case: move single disk
        print(f"Move disk 1 from {source} to {destination}")
        return
    
    # Step 1: Move n-1 disks from source to auxiliary
    tower_of_hanoi(n-1, source, auxiliary, destination)
    
    # Step 2: Move the largest disk from source to destination  
    print(f"Move disk {n} from {source} to {destination}")
    
    # Step 3: Move n-1 disks from auxiliary to destination
    tower_of_hanoi(n-1, auxiliary, destination, source)

# Solve ${n}-disk Tower of Hanoi
tower_of_hanoi(${n}, 'A', 'C', 'B')
# Total moves: ${minMoves}`;

    const javaScriptCode = `function towerOfHanoi(n, source, destination, auxiliary) {
    if (n === 1) {
        console.log(\`Move disk 1 from \${source} to \${destination}\`);
        return;
    }
    
    // Move n-1 disks to auxiliary
    towerOfHanoi(n-1, source, auxiliary, destination);
    
    // Move largest disk to destination
    console.log(\`Move disk \${n} from \${source} to \${destination}\`);
    
    // Move n-1 disks to destination
    towerOfHanoi(n-1, auxiliary, destination, source);
}

// Solve ${n}-disk puzzle
towerOfHanoi(${n}, 'A', 'C', 'B'); // ${minMoves} moves`;

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
                            Tower of Hanoi
                        </h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch the classic divide & conquer algorithm solve the ancient Tower of Hanoi puzzle with elegant recursive moves.
                        </p>
                        <div className="flex justify-center items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Layers className="h-4 w-4" />
                                Divide & Conquer
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                O(2^n) Time
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Target className="h-4 w-4" />
                                {minMoves} Optimal Moves
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
                                        Number of Disks: {n}
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="6"
                                        value={n}
                                        onChange={(e) => setN(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                        disabled={isPlaying}
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        Minimum moves: {minMoves}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Speed: {speed}ms
                                    </label>
                                    <input
                                        type="range"
                                        min="500"
                                        max="2500"
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

                        {/* Move Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <Move className="h-5 w-5 mr-2 text-green-600" />
                                Move Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Current Move:</span>
                                    <span className="text-lg font-bold text-green-700">
                                        {currentState.moveCount}/{minMoves}
                                    </span>
                                </div>

                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Phase: </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPhaseColor(currentState.phase)}`}>
                                        {currentState.phase.toUpperCase()}
                                    </span>
                                </div>

                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Recursion Depth: </span>
                                    <span className="text-green-700 font-mono">{currentState.depth}</span>
                                </div>

                                {currentState.currentMove && (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <div className="text-sm font-semibold text-blue-800">
                                            Move #{currentState.currentMove.moveNumber}
                                        </div>
                                        <div className="text-blue-700">
                                            Disk {currentState.currentMove.disk}: {getTowerLabel(currentState.currentMove.from).split(' ')[0]} → {getTowerLabel(currentState.currentMove.to).split(' ')[0]}
                                        </div>
                                    </div>
                                )}
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
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Subproblem: </span>
                                    <span className="text-green-700">{currentState.subproblem}</span>
                                </div>
                                <div className="text-xs">
                                    <span className="font-medium text-gray-700">Call: </span>
                                    <code className="bg-gray-100 px-2 py-1 rounded text-green-700">
                                        {currentState.recursiveCall}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tower Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <Layers className="h-5 w-5 mr-2 text-green-600" />
                                Tower of Hanoi Puzzle
                            </h3>

                            {/* Tower Visualization */}
                            <div className="flex justify-center items-end space-x-8 mb-8">
                                {towers.map((tower, towerIndex) => (
                                    <div key={towerIndex} className="flex flex-col items-center">
                                        {/* Tower Label */}
                                        <div className="mb-2 text-sm font-semibold text-gray-700">
                                            {getTowerLabel(towerIndex)}
                                        </div>

                                        {/* Tower Structure */}
                                        <div className="relative flex flex-col-reverse items-center">
                                            {/* Base */}
                                            <div className="w-32 h-4 bg-amber-800 rounded-lg"></div>

                                            {/* Pole */}
                                            <div className="w-2 bg-amber-600 rounded-t" style={{ height: `${Math.max(n + 2, 6) * 20}px` }}></div>

                                            {/* Disks */}
                                            <div className="absolute bottom-4 flex flex-col-reverse items-center">
                                                {tower.map((diskSize, diskIndex) => (
                                                    <div
                                                        key={`${towerIndex}-${diskIndex}`}
                                                        className={`border-2 rounded transition-all duration-500 ${getDiskColor(diskSize, n)} ${currentState.currentMove &&
                                                            currentState.currentMove.disk === diskSize &&
                                                            (currentState.currentMove.from === towerIndex || currentState.currentMove.to === towerIndex)
                                                            ? 'animate-bounce shadow-lg transform scale-110'
                                                            : ''
                                                            }`}
                                                        style={{
                                                            width: `${20 + diskSize * 16}px`,
                                                            height: '16px',
                                                            marginBottom: '2px'
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-center h-full text-xs font-bold text-white">
                                                            {diskSize}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Rules */}
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-amber-800 mb-2">Rules</h4>
                                <ul className="text-amber-700 text-sm space-y-1">
                                    <li>• Move all disks from Tower A to Tower C</li>
                                    <li>• Only move one disk at a time</li>
                                    <li>• Never place a larger disk on a smaller disk</li>
                                    <li>• Use Tower B as auxiliary space</li>
                                </ul>
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
                                <li>• <strong>Time Complexity:</strong> O(2^n)</li>
                                <li>• <strong>Space Complexity:</strong> O(n) recursion depth</li>
                                <li>• <strong>Moves Required:</strong> 2^n - 1 (optimal)</li>
                                <li>• <strong>Growth:</strong> Doubles with each disk added</li>
                                <li>• <strong>Legend:</strong> 64 disks would take 584 billion years!</li>
                            </ul>

                            <h4 className="font-bold text-green-700 mb-2">Mathematical Properties</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• Recurrence: T(n) = 2T(n-1) + 1</li>
                                <li>• Base case: T(1) = 1</li>
                                <li>• Solution: T(n) = 2^n - 1</li>
                                <li>• Perfect example of exponential growth</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Real-World Applications</h4>
                            <ul className="text-gray-600 text-sm space-y-1 mb-4">
                                <li>• <strong>Backup Systems:</strong> Tape rotation strategies</li>
                                <li>• <strong>Computer Science:</strong> Recursive algorithm teaching</li>
                                <li>• <strong>Game Development:</strong> Puzzle game mechanics</li>
                                <li>• <strong>Mathematics:</strong> Recursive sequence analysis</li>
                                <li>• <strong>Problem Solving:</strong> Divide & conquer methodology</li>
                            </ul>

                            <h4 className="font-bold text-green-700 mb-2">Historical Context</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• Ancient puzzle from Indian temples</li>
                                <li>• Popularized by mathematician Édouard Lucas (1883)</li>
                                <li>• Classic introduction to recursion concepts</li>
                                <li>• Demonstrates elegant mathematical beauty</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TowerHanoiVisualizer;