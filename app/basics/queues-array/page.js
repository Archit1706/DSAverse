'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ArrowRight, ArrowDown, ChevronLeft, ChevronRight, Brain, Eye, CheckCircle, XCircle, Crosshair, Info, GitBranch, Printer, Package, Network } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does FIFO stand for?",
        options: ["First In First Out", "Fast Input Forwarding Order", "Fixed Index For Output", "First Index From Overflow"],
        correct: 0,
        explanation: "FIFO = First In, First Out. Like a real queue — the first person to join is the first to leave."
    },
    {
        question: "In a queue, where are elements added and removed?",
        options: ["Both added and removed at front", "Added at rear, removed at front", "Added at front, removed at rear", "Added and removed at rear"],
        correct: 1,
        explanation: "Enqueue adds to the REAR. Dequeue removes from the FRONT. This is what makes it FIFO."
    },
    {
        question: "Why is a circular array preferred for implementing a queue?",
        options: ["It uses less memory overall", "It avoids shifting elements, giving O(1) dequeue", "It allows random access", "It prevents stack overflow"],
        correct: 1,
        explanation: "A circular array wraps around — the front pointer moves forward instead of shifting all elements, making dequeue O(1)."
    }
];

const getStepIcon = (phase, error) => {
    if (error) return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
    switch (phase) {
        case 'complete': case 'found': return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />;
        case 'error': case 'not_found': return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
        case 'identify': return <Crosshair className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        default: return <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
    }
};

export default function QueueArrayPage() {
    const [queue, setQueue] = useState([]);
    const [front, setFront] = useState(0);
    const [rear, setRear] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [maxSize, setMaxSize] = useState(8);
    const [operation, setOperation] = useState('');
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    useEffect(() => { reset(); }, []);

    const generateSteps = (op, value = null) => {
        const steps = [];
        const currentQueue = [...queue];
        let currentFront = front;
        let currentRear = rear;
        const size = currentRear - currentFront + 1;

        if (op === 'enqueue') {
            if (size >= maxSize) {
                steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: -1, operation: op, value, error: true, explanation: `Queue Full! Cannot enqueue ${value}. Size: ${maxSize}/${maxSize}.`, phase: 'error' });
                return steps;
            }
            steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: -1, operation: op, value, error: false, explanation: `Checking capacity. Current size: ${size}, Max: ${maxSize}. Space available.`, phase: 'check' });
            if (currentQueue.length === 0) { currentQueue.push(value); currentRear = 0; currentFront = 0; }
            else { currentQueue.push(value); currentRear++; }
            steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: currentRear, operation: op, value, error: false, explanation: `Enqueued ${value} at rear (position ${currentRear}). New size: ${currentQueue.length}`, phase: 'complete' });
        } else if (op === 'dequeue') {
            if (size <= 0 || currentQueue.length === 0) {
                steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: -1, operation: op, value: null, error: true, explanation: `Queue Empty! Cannot dequeue.`, phase: 'error' });
                return steps;
            }
            const frontValue = currentQueue[0];
            steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: 0, operation: op, value: frontValue, error: false, explanation: `Front element: ${frontValue} at position ${currentFront}. Will remove it.`, phase: 'identify' });
            currentQueue.shift();
            if (currentQueue.length === 0) { currentFront = 0; currentRear = -1; }
            else { currentRear--; }
            steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: -1, operation: op, value: frontValue, error: false, explanation: `Dequeued ${frontValue} from front. Remaining elements shift left. New size: ${currentQueue.length}`, phase: 'complete' });
        } else if (op === 'peek') {
            if (currentQueue.length === 0) {
                steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: -1, operation: op, value: null, error: true, explanation: `Cannot peek at empty queue.`, phase: 'error' });
                return steps;
            }
            const frontValue = currentQueue[0];
            steps.push({ queue: [...currentQueue], front: currentFront, rear: currentRear, highlightIndex: 0, operation: op, value: frontValue, error: false, explanation: `Peek: Front element is ${frontValue} at position ${currentFront}. Queue unchanged.`, phase: 'complete' });
        }
        return steps;
    };

    const handleEnqueue = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const steps = generateSteps('enqueue', parseInt(inputValue));
        setStepHistory(steps); setCurrentStep(0); setInputValue(''); setOperation('enqueue');
    };
    const handleDequeue = () => { const steps = generateSteps('dequeue'); setStepHistory(steps); setCurrentStep(0); setOperation('dequeue'); };
    const handlePeek = () => { const steps = generateSteps('peek'); setStepHistory(steps); setCurrentStep(0); setOperation('peek'); };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= stepHistory.length - 1) {
                    setIsPlaying(false); clearInterval(interval);
                    if (stepHistory[stepHistory.length - 1]) {
                        const fs = stepHistory[stepHistory.length - 1];
                        setQueue(fs.queue); setFront(fs.front); setRear(fs.rear);
                    }
                    return prev;
                }
                return prev + 1;
            });
        }, speed);
    };

    const stepForward = () => {
        if (currentStep < stepHistory.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            if (next === stepHistory.length - 1) {
                const fs = stepHistory[stepHistory.length - 1];
                setQueue(fs.queue); setFront(fs.front); setRear(fs.rear);
            }
        }
    };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const pauseAnimation = () => setIsPlaying(false);
    const reset = () => { setQueue([]); setFront(0); setRear(-1); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setOperation(''); };

    const currentState = stepHistory[currentStep] || { queue, front, rear, highlightIndex: -1, operation: '', value: null, error: false, explanation: 'Use Enqueue, Dequeue, or Peek to begin visualization.', phase: '' };

    const getQueueElementColor = (index) => {
        if (currentState.error) return 'bg-red-500/80 border-red-400 text-white';
        if (currentState.highlightIndex === index) {
            if (currentState.phase === 'identify') return 'bg-yellow-400 border-yellow-300 text-slate-900 animate-pulse';
            if (currentState.phase === 'complete') return 'bg-green-400 border-green-300 text-slate-900 animate-pulse';
            return 'bg-blue-400 border-blue-300 text-white animate-pulse';
        }
        if (index === 0 && currentState.queue.length > 0) return 'bg-blue-600/70 border-blue-400 text-white';
        return 'bg-blue-500/50 border-blue-500 text-white';
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct });
    };
    const nextQuestion = () => { setCurrentQuestion(prev => (prev + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `class QueueArray:
    def __init__(self, max_size):
        self.array = [None] * max_size
        self.front = 0
        self.rear = -1
        self.size = 0
        self.max_size = max_size

    def enqueue(self, value):
        if self.size >= self.max_size:
            raise Exception("Queue Overflow")
        # Circular array: wrap rear pointer
        self.rear = (self.rear + 1) % self.max_size
        self.array[self.rear] = value
        self.size += 1
        return value

    def dequeue(self):
        if self.size <= 0:
            raise Exception("Queue Underflow")
        value = self.array[self.front]
        self.array[self.front] = None
        # Circular array: wrap front pointer
        self.front = (self.front + 1) % self.max_size
        self.size -= 1
        return value

    def peek(self):
        if self.size <= 0:
            raise Exception("Queue is Empty")
        return self.array[self.front]

    def is_empty(self):
        return self.size == 0

    def is_full(self):
        return self.size >= self.max_size`;

    const q = quizQuestions[currentQuestion];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/basics" className="flex items-center text-white/80 hover:text-white transition-colors mr-4 text-sm">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Basics
                        </Link>
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1 text-sm mb-4">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span> Beginner Friendly
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Queue: Array Implementation</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore FIFO (First In, First Out) — enqueue at rear, dequeue at front, just like a real-world queue.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Code className="h-4 w-4" /> Array Implementation</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Clock className="h-4 w-4" /> O(1) Enqueue</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Queue Visualization</h2>
                        <p className="text-slate-400 text-sm mb-5">
                            <span className="text-green-400 font-medium">FRONT</span> = where elements leave &nbsp;|&nbsp;
                            <span className="text-blue-400 font-medium">REAR</span> = where elements arrive
                        </p>

                        {/* Color Legend */}
                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600/70 border border-blue-400"></span><span className="text-slate-300">Front element</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/50 border border-blue-500"></span><span className="text-slate-300">Other elements</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Active</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Completed</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/80"></span><span className="text-slate-300">Error</span></span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mb-6 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEnqueue()}
                                    placeholder="Enter value"
                                    className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-36" />
                                <button onClick={handleEnqueue} disabled={isPlaying} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Plus className="h-4 w-4" /> Enqueue
                                </button>
                                <button onClick={handleDequeue} disabled={isPlaying} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Minus className="h-4 w-4" /> Dequeue
                                </button>
                                <button onClick={handlePeek} disabled={isPlaying} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium">
                                    <Eye className="h-4 w-4" /> Peek
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={isPlaying ? pauseAnimation : playAnimation} disabled={stepHistory.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={reset} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-slate-300">Speed:</label>
                                    <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                                        className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value={2000}>Slow</option>
                                        <option value={1000}>Normal</option>
                                        <option value={500}>Fast</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-slate-300">Max Size:</label>
                                    <input type="number" value={maxSize}
                                        onChange={(e) => setMaxSize(Math.max(1, Math.min(10, parseInt(e.target.value) || 8)))}
                                        min="1" max="10"
                                        className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center" />
                                </div>
                            </div>
                        </div>

                        {/* Queue Visualization */}
                        <div className="mb-5">
                            {/* Direction labels */}
                            <div className="flex justify-between items-center mb-2 px-1">
                                <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
                                    <ArrowRight className="h-3 w-3" /> DEQUEUE (Front)
                                </div>
                                <div className="flex items-center gap-1 text-xs font-semibold text-blue-400">
                                    ENQUEUE (Rear) <ArrowRight className="h-3 w-3" />
                                </div>
                            </div>

                            <div className="relative">
                                {/* FRONT pointer above */}
                                {currentState.queue.length > 0 && (
                                    <div className="absolute -top-7 left-0 flex flex-col items-center" style={{ width: '4.5rem' }}>
                                        <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-0.5 rounded">FRONT</span>
                                        <ArrowDown className="h-3 w-3 text-green-400 mt-0.5" />
                                    </div>
                                )}

                                {/* Queue container */}
                                <div className="flex items-center min-h-20 min-w-full bg-slate-800/50 border-2 border-slate-600 rounded-xl p-2 overflow-x-auto">
                                    {currentState.queue.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm py-2">
                                            Queue is empty — enqueue to begin
                                        </div>
                                    ) : (
                                        <>
                                            {currentState.queue.map((value, index) => (
                                                <div key={`${index}-${value}`}
                                                    className={`flex-shrink-0 w-16 h-16 flex flex-col items-center justify-center font-bold rounded-lg border-2 mr-2 transition-all duration-300 text-lg ${getQueueElementColor(index)}`}>
                                                    <span>{value}</span>
                                                    <span className="text-xs font-normal opacity-60 font-mono">[{index}]</span>
                                                </div>
                                            ))}
                                            {Array.from({ length: maxSize - currentState.queue.length }).map((_, index) => (
                                                <div key={`empty-${index}`}
                                                    className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-700 rounded-lg mr-2 text-xs font-mono">
                                                    —
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                {/* REAR pointer below */}
                                {currentState.queue.length > 0 && (
                                    <div className="absolute -bottom-7 flex flex-col items-center"
                                        style={{ left: `${(currentState.queue.length - 1) * 72 + 16}px`, width: '4.5rem' }}>
                                        <ArrowDown className="h-3 w-3 text-blue-400 mb-0.5 rotate-180" />
                                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 border border-blue-400/30 px-2 py-0.5 rounded">REAR</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-center mt-10 flex justify-center gap-6">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-blue-400">{currentState.queue.length} / {maxSize}</div>
                                    <div className="text-xs text-slate-500">Size / Capacity</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className={`text-lg font-bold ${currentState.queue.length === 0 ? 'text-slate-400' : currentState.queue.length === maxSize ? 'text-red-400' : 'text-green-400'}`}>
                                        {currentState.queue.length === 0 ? 'Empty' : currentState.queue.length === maxSize ? 'Full' : 'Available'}
                                    </div>
                                    <div className="text-xs text-slate-500">Status</div>
                                </div>
                                {currentState.queue.length > 0 && (
                                    <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                        <div className="text-sm font-bold text-green-400">{currentState.front} → {currentState.rear}</div>
                                        <div className="text-xs text-slate-500">Front → Rear</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step Explanation + Navigation */}
                        <div className={`rounded-lg p-4 border ${currentState.error ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}>
                            <h3 className="font-semibold text-blue-300 mb-2 text-sm uppercase tracking-wide">Current Step</h3>
                            <div className="flex items-start gap-2">
                                {getStepIcon(currentState.phase, currentState.error)}
                                <p className={`${currentState.error ? 'text-red-300' : 'text-slate-200'} text-sm leading-relaxed`}>{currentState.explanation}</p>
                            </div>
                            {stepHistory.length > 0 && (
                                <div className="mt-3 flex items-center gap-2">
                                    <button onClick={stepBackward} disabled={currentStep === 0 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded-lg disabled:opacity-30 transition-colors">
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                    </div>
                                    <button onClick={stepForward} disabled={currentStep === stepHistory.length - 1 || isPlaying}
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded-lg disabled:opacity-30 transition-colors">
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <span className="text-xs text-slate-500 min-w-12 text-right">{currentStep + 1}/{stepHistory.length}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Information Panel */}
                    <div className="space-y-5">
                        {/* Complexity Analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Complexity Analysis</h2>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['O(1)', 'Enqueue', 'green'], ['O(n)*', 'Dequeue', 'orange'], ['O(1)', 'Peek', 'green']].map(([c, op, color]) => (
                                    <div key={op} className={`text-center rounded-lg py-3 border ${color === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                        <div className={`text-xl font-bold ${color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3 mb-2">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">Fixed array allocation</div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">*O(n) due to shifting. Circular array gives O(1) dequeue.</p>
                        </div>

                        {/* Queue Operations */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Queue Operations</h2>
                            <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-4 py-1">
                                    <h3 className="font-semibold text-blue-400 text-sm">Enqueue</h3>
                                    <p className="text-slate-400 text-sm">Add element to the rear — increment rear pointer</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4 py-1">
                                    <h3 className="font-semibold text-red-400 text-sm">Dequeue</h3>
                                    <p className="text-slate-400 text-sm">Remove front element — shift array or advance front pointer</p>
                                </div>
                                <div className="border-l-4 border-emerald-500 pl-4 py-1">
                                    <h3 className="font-semibold text-emerald-400 text-sm">Peek / Front</h3>
                                    <p className="text-slate-400 text-sm">View front element without removing it</p>
                                </div>
                            </div>
                        </div>

                        {/* FIFO vs LIFO */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">FIFO Principle</h2>
                            <div className="space-y-2 text-sm">
                                {[
                                    [Clock, 'Task Scheduling', 'OS processes tasks in arrival order'],
                                    [Printer, 'Print Queue', 'Documents print in the order they were sent'],
                                    [GitBranch, 'BFS Traversal', 'Explores graph level by level using a queue'],
                                    [Network, 'Network Buffers', 'Packets queued and processed in order'],
                                ].map(([Icon, title, desc]) => (
                                    <div key={title} className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3">
                                        <Icon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-slate-200 text-sm">{title}</div>
                                            <div className="text-slate-500 text-xs">{desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Recall Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-blue-500/30 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Brain className="h-5 w-5 text-blue-400" />
                                <h2 className="text-xl font-bold text-slate-100">Test Yourself</h2>
                                <span className="ml-auto text-xs text-slate-500">Q{currentQuestion + 1}/{quizQuestions.length}</span>
                            </div>
                            <p className="text-slate-200 font-medium mb-4 text-sm leading-relaxed">{q.question}</p>
                            <div className="space-y-2 mb-4">
                                {q.options.map((opt, idx) => {
                                    let cls = 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500 hover:bg-slate-700';
                                    if (quizState.answered) {
                                        if (idx === q.correct) cls = 'bg-green-500/20 border-green-400 text-green-300';
                                        else if (idx === quizState.selected) cls = 'bg-red-500/20 border-red-400 text-red-300';
                                        else cls = 'bg-slate-800 border-slate-700 text-slate-500 opacity-60';
                                    }
                                    return (
                                        <button key={idx} onClick={() => handleQuizAnswer(idx)} disabled={quizState.answered}
                                            className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all duration-200 ${cls}`}>
                                            <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65 + idx)}.</span>{opt}
                                        </button>
                                    );
                                })}
                            </div>
                            {quizState.answered && (
                                <div className={`rounded-lg p-3 mb-3 text-sm ${quizState.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {quizState.correct ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                                        <span className={`font-semibold ${quizState.correct ? 'text-green-300' : 'text-red-300'}`}>{quizState.correct ? 'Correct!' : 'Not quite.'}</span>
                                    </div>
                                    <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                </div>
                            )}
                            {quizState.answered && (
                                <button onClick={nextQuestion} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                                    Next Question →
                                </button>
                            )}
                        </div>

                        {/* Code Example */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Implementation</h2>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
