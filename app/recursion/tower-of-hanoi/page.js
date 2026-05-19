"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Layers, Target, Move,
    ArrowDown, ArrowUp, Brain, CheckCircle, XCircle, Info, ChevronRight
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What are the 3 recursive steps of Tower of Hanoi (n disks, A→C using B)?",
        options: [
            "Move all disks to B, then move all to C",
            "Move 1 disk then repeat n times",
            "Move n-1 disks A→B, move largest A→C, move n-1 disks B→C",
            "Move disks one at a time in order from A to C"
        ],
        correct: 2,
        explanation: "The elegant recursion: (1) move n-1 disks out of the way to auxiliary, (2) move the largest disk to destination, (3) move the n-1 disks from auxiliary to destination."
    },
    {
        question: "How many moves are needed to solve the n-disk Tower of Hanoi optimally?",
        options: ["n moves", "n² moves", "2^n - 1 moves", "n! moves"],
        correct: 2,
        explanation: "The minimum is always 2^n - 1. For 3 disks: 7 moves. For 4 disks: 15. For 64 disks: 18.4 quintillion — it would take 584 billion years at one move per second!"
    },
    {
        question: "What is the recursion depth for the n-disk Tower of Hanoi?",
        options: ["2^n - 1 levels deep", "n levels deep", "n² levels deep", "log(n) levels deep"],
        correct: 1,
        explanation: "The recursion depth is exactly n — one level per disk. Space complexity is O(n) because the call stack never exceeds n frames at once."
    }
];

export default function TowerHanoiVisualizer() {
    const [n, setN] = useState(3);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);
    const [towers, setTowers] = useState([[], [], []]);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const generateSteps = (numDisks) => {
        const steps = [];
        const tw = [[], [], []];
        for (let i = numDisks; i >= 1; i--) tw[0].push(i);
        let moveCount = 0;

        steps.push({
            towers: tw.map(t => [...t]),
            explanation: `Starting: all ${numDisks} disks on Tower A. Goal: move all to Tower C using Tower B as auxiliary.`,
            currentMove: null, recursiveCall: `hanoi(${numDisks}, A, C, B)`,
            depth: 0, moveCount: 0, phase: 'start',
            subproblem: `Move ${numDisks} disks from A to C via B`
        });

        const hanoi = (n, source, destination, auxiliary, depth = 0) => {
            if (n === 1) {
                const disk = tw[source].pop();
                tw[destination].push(disk);
                moveCount++;
                steps.push({
                    towers: tw.map(t => [...t]),
                    explanation: `Base case: Move disk ${disk} from ${String.fromCharCode(65 + source)} to ${String.fromCharCode(65 + destination)}`,
                    currentMove: { disk, from: source, to: destination, moveNumber: moveCount },
                    recursiveCall: `hanoi(1, ${String.fromCharCode(65 + source)}, ${String.fromCharCode(65 + destination)}, ${String.fromCharCode(65 + auxiliary)})`,
                    depth, moveCount, phase: 'base', subproblem: `Move disk ${disk} directly`
                });
                return;
            }
            steps.push({
                towers: tw.map(t => [...t]),
                explanation: `Step 1: Move top ${n - 1} disk${n - 1 > 1 ? 's' : ''} from ${String.fromCharCode(65 + source)} to ${String.fromCharCode(65 + auxiliary)}`,
                currentMove: null,
                recursiveCall: `hanoi(${n - 1}, ${String.fromCharCode(65 + source)}, ${String.fromCharCode(65 + auxiliary)}, ${String.fromCharCode(65 + destination)})`,
                depth, moveCount, phase: 'step1', subproblem: `Move ${n - 1} disks to auxiliary`
            });
            hanoi(n - 1, source, auxiliary, destination, depth + 1);
            const largeDisk = tw[source].pop();
            tw[destination].push(largeDisk);
            moveCount++;
            steps.push({
                towers: tw.map(t => [...t]),
                explanation: `Step 2: Move largest disk ${largeDisk} from ${String.fromCharCode(65 + source)} to ${String.fromCharCode(65 + destination)}`,
                currentMove: { disk: largeDisk, from: source, to: destination, moveNumber: moveCount },
                recursiveCall: `hanoi(1, ${String.fromCharCode(65 + source)}, ${String.fromCharCode(65 + destination)}, ${String.fromCharCode(65 + auxiliary)})`,
                depth, moveCount, phase: 'step2', subproblem: `Move largest disk to destination`
            });
            steps.push({
                towers: tw.map(t => [...t]),
                explanation: `Step 3: Move ${n - 1} disk${n - 1 > 1 ? 's' : ''} from ${String.fromCharCode(65 + auxiliary)} to ${String.fromCharCode(65 + destination)}`,
                currentMove: null,
                recursiveCall: `hanoi(${n - 1}, ${String.fromCharCode(65 + auxiliary)}, ${String.fromCharCode(65 + destination)}, ${String.fromCharCode(65 + source)})`,
                depth, moveCount, phase: 'step3', subproblem: `Move ${n - 1} disks to destination`
            });
            hanoi(n - 1, auxiliary, destination, source, depth + 1);
        };

        hanoi(numDisks, 0, 2, 1);
        steps.push({
            towers: tw.map(t => [...t]),
            explanation: `Puzzle solved! All ${numDisks} disks moved to Tower C in ${moveCount} moves (optimal: ${Math.pow(2, numDisks) - 1})`,
            currentMove: null, recursiveCall: 'COMPLETED',
            depth: 0, moveCount, phase: 'complete',
            subproblem: `Complete in minimum ${Math.pow(2, numDisks) - 1} moves`
        });
        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
        if (steps.length > 0) setTowers(steps[0].towers);
    }, [n]);

    useEffect(() => {
        const s = stepHistory[currentStep];
        if (s) setTowers(s.towers);
    }, [currentStep, stepHistory]);

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
        towers: [[], [], []], explanation: 'Adjust disks and click Play.',
        currentMove: null, recursiveCall: '', depth: 0, moveCount: 0, phase: 'start', subproblem: ''
    };

    const getDiskColor = (diskSize) => {
        const colors = [
            'bg-red-500 border-red-400 text-white',
            'bg-blue-500 border-blue-400 text-white',
            'bg-emerald-500 border-emerald-400 text-white',
            'bg-yellow-500 border-yellow-400 text-white',
            'bg-purple-500 border-purple-400 text-white',
            'bg-pink-500 border-pink-400 text-white',
        ];
        return colors[(diskSize - 1) % colors.length];
    };

    const getTowerLabel = (i) => ['A (Source)', 'B (Auxiliary)', 'C (Destination)'][i];

    const getPhaseStyle = (phase) => {
        switch (phase) {
            case 'step1': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
            case 'step2': return 'bg-green-500/15 text-green-400 border border-green-500/30';
            case 'step3': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
            case 'base': return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
            case 'complete': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
            default: return 'bg-slate-700/50 text-slate-400';
        }
    };

    const minMoves = Math.pow(2, n) - 1;

    const handleQuizAnswer = (idx) => { if (quizState.answered) return; setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct }); };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `def tower_of_hanoi(n, source, destination, auxiliary):
    if n == 1:
        print(f"Move disk 1: {source} -> {destination}")
        return
    # Step 1: Move n-1 disks out of the way
    tower_of_hanoi(n-1, source, auxiliary, destination)
    # Step 2: Move the largest disk
    print(f"Move disk {n}: {source} -> {destination}")
    # Step 3: Move n-1 disks to destination
    tower_of_hanoi(n-1, auxiliary, destination, source)

# ${n} disks: ${minMoves} total moves`;

    const jsCode = `function towerOfHanoi(n, source, destination, auxiliary) {
    if (n === 1) {
        console.log(\`Move disk 1: \${source} → \${destination}\`);
        return;
    }
    towerOfHanoi(n-1, source, auxiliary, destination);
    console.log(\`Move disk \${n}: \${source} → \${destination}\`);
    towerOfHanoi(n-1, auxiliary, destination, source);
}
// ${n} disks → ${minMoves} moves`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Tower of Hanoi</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Three elegant recursive steps solve an exponentially hard puzzle. Watch divide & conquer in action.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Layers className="h-4 w-4" /> Divide & Conquer</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> O(2^n) Time</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Target className="h-4 w-4" /> {minMoves} Optimal Moves</div>
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
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Disks: {n} &nbsp; (min moves: {minMoves})</label>
                                    <input type="range" min="2" max="6" value={n}
                                        onChange={(e) => { setN(parseInt(e.target.value)); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        disabled={isPlaying} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="400" max="2500" step="200" value={speed}
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

                        {/* Move Info */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3 flex items-center">
                                <Move className="h-5 w-5 mr-2 text-green-400" /> Move Information
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
                                    <span className="text-slate-400">Moves:</span>
                                    <span className="font-bold text-green-300">{currentState.moveCount}/{minMoves}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Phase:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPhaseStyle(currentState.phase)}`}>
                                        {currentState.phase.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Depth:</span>
                                    <span className="font-mono text-green-300">{currentState.depth}</span>
                                </div>
                                {currentState.currentMove && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-blue-300 mb-1">Move #{currentState.currentMove.moveNumber}</div>
                                        <div className="text-blue-300 text-sm font-mono">
                                            Disk {currentState.currentMove.disk}: {getTowerLabel(currentState.currentMove.from).split(' ')[0]} → {getTowerLabel(currentState.currentMove.to).split(' ')[0]}
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-lg p-3 bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-slate-200 text-xs leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                                {currentState.subproblem && (
                                    <div className="text-xs">
                                        <span className="text-slate-400">Subproblem: </span>
                                        <span className="text-green-300">{currentState.subproblem}</span>
                                    </div>
                                )}
                                <div className="text-xs">
                                    <span className="text-slate-400">Call: </span>
                                    <code className="bg-slate-800 px-2 py-0.5 rounded text-green-400 text-xs">{currentState.recursiveCall}</code>
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

                    {/* Tower Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <Layers className="h-5 w-5 mr-2 text-green-400" /> Tower of Hanoi Puzzle
                            </h3>

                            <div className="flex justify-center items-end gap-8 mb-8">
                                {towers.map((tower, towerIndex) => (
                                    <div key={towerIndex} className="flex flex-col items-center">
                                        <div className="mb-2 text-sm font-semibold text-slate-300 text-center">
                                            {getTowerLabel(towerIndex)}
                                        </div>
                                        <div className="relative flex flex-col-reverse items-center">
                                            <div className="w-32 h-4 bg-amber-700 rounded-lg shadow-lg"></div>
                                            <div className="w-2 bg-amber-600 rounded-t" style={{ height: `${Math.max(n + 2, 5) * 22}px` }}></div>
                                            <div className="absolute bottom-4 flex flex-col-reverse items-center gap-0.5">
                                                {tower.map((diskSize, diskIndex) => (
                                                    <div key={`${towerIndex}-${diskIndex}`}
                                                        className={`border-2 rounded-lg transition-all duration-500 flex items-center justify-center font-bold text-xs ${getDiskColor(diskSize)} ${currentState.currentMove &&
                                                            currentState.currentMove.disk === diskSize &&
                                                            (currentState.currentMove.from === towerIndex || currentState.currentMove.to === towerIndex)
                                                            ? 'animate-bounce shadow-xl scale-110' : ''}`}
                                                        style={{ width: `${24 + diskSize * 16}px`, height: '20px' }}>
                                                        {diskSize}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Rules */}
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
                                <h4 className="text-base font-semibold text-orange-300 mb-2">Rules</h4>
                                <ul className="text-orange-300/80 text-sm space-y-1">
                                    {['Move all disks from Tower A to Tower C', 'Only move one disk at a time', 'Never place a larger disk on a smaller disk', 'Use Tower B as auxiliary space'].map(r => (
                                        <li key={r} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 flex-shrink-0" />{r}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Complexity table */}
                            <div className="grid grid-cols-3 gap-3">
                                {[[2, 3, 7], [3, 7, 7], [4, 15, 15], [5, 31, 31], [6, 63, 63]].map(([disks, moves]) => (
                                    <div key={disks} className={`text-center rounded-lg p-2 ${disks === n ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                                        <div className={`text-sm font-bold ${disks === n ? 'text-green-300' : 'text-slate-300'}`}>{disks} disks</div>
                                        <div className={`text-xs ${disks === n ? 'text-green-400' : 'text-slate-500'}`}>{Math.pow(2, disks) - 1} moves</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mt-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Complexity</h4>
                                        <ul className="text-slate-400 text-xs space-y-1">
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Time: O(2^n) — doubles per disk</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Space: O(n) — recursion depth</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Moves: 2^n - 1 (optimal)</li>
                                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> 64 disks → 584 billion years!</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Recurrence</h4>
                                        <ul className="text-slate-400 text-xs space-y-1 font-mono">
                                            <li>T(1) = 1</li>
                                            <li>T(n) = 2T(n-1) + 1</li>
                                            <li>Solution: T(n) = 2^n - 1</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-green-400 text-sm mb-3">Applications</h4>
                                    <ul className="text-slate-400 text-xs space-y-1.5">
                                        {['Backup tape rotation strategies', 'Recursive algorithm education', 'Puzzle game mechanics', 'Mathematical sequence analysis', 'Divide & conquer methodology', 'History: Édouard Lucas (1883)'].map(a => (
                                            <li key={a} className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-green-400" /> Python</h3>
                        <CodeBlock code={codeExample} language="python" />
                    </div>
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-green-400" /> JavaScript</h3>
                        <CodeBlock code={jsCode} language="javascript" />
                    </div>
                </div>
            </div>
        </div>
    );
}
