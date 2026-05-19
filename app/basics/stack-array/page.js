'use client';

import React, { useState, useEffect } from 'react';
import {
    Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus,
    ChevronDown, Eye, ChevronLeft, ChevronRight, Brain,
    CheckCircle, XCircle, Crosshair, Info, Wrench, ChevronsRight, RefreshCw,
    Code2, Undo2, Hash, Globe, Braces
} from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What does LIFO stand for?",
        options: ["Linked Input FIFO Ordering", "Last In First Out", "Linear Input Forward Output", "Last Index From Overlap"],
        correct: 1,
        explanation: "LIFO = Last In, First Out. Like a stack of plates — you add and remove from the top."
    },
    {
        question: "What is the time complexity of Push in an array-based stack?",
        options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
        correct: 3,
        explanation: "Push is O(1) — we just increment the top pointer and assign the value. No shifting needed."
    },
    {
        question: "What error occurs when pushing to a full array stack?",
        options: ["Stack Underflow", "Null Pointer Exception", "Stack Overflow", "Index Out of Bounds"],
        correct: 2,
        explanation: "Stack Overflow happens when you push to a full stack. Stack Underflow is the reverse — popping from empty."
    }
];

const getStepIcon = (phase, error) => {
    if (error) return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
    switch (phase) {
        case 'complete': case 'found': return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />;
        case 'error': case 'not_found': return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
        case 'identify': return <Crosshair className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        case 'searching': case 'traverse': return <ChevronRight className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        case 'create': return <Wrench className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
        case 'resize': return <RefreshCw className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />;
        case 'shift': return <ChevronsRight className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />;
        default: return <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
    }
};

export default function StackArrayPage() {
    const [stack, setStack] = useState([]);
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
        const currentStack = [...stack];

        if (op === 'push') {
            if (currentStack.length >= maxSize) {
                steps.push({ stack: [...currentStack], highlightIndex: -1, operation: op, value, error: true, explanation: `Stack Overflow! Cannot push ${value}. Stack is at maximum capacity (${maxSize}).`, phase: 'error' });
                return steps;
            }
            steps.push({ stack: [...currentStack], highlightIndex: -1, operation: op, value, error: false, explanation: `Checking if stack has space. Current size: ${currentStack.length}, Max: ${maxSize}`, phase: 'check' });
            currentStack.push(value);
            steps.push({ stack: [...currentStack], highlightIndex: currentStack.length - 1, operation: op, value, error: false, explanation: `Pushed ${value} to top of stack. New size: ${currentStack.length}`, phase: 'complete' });
        } else if (op === 'pop') {
            if (currentStack.length === 0) {
                steps.push({ stack: [...currentStack], highlightIndex: -1, operation: op, value: null, error: true, explanation: `Stack Underflow! Cannot pop from empty stack.`, phase: 'error' });
                return steps;
            }
            const topValue = currentStack[currentStack.length - 1];
            steps.push({ stack: [...currentStack], highlightIndex: currentStack.length - 1, operation: op, value: topValue, error: false, explanation: `Identifying top element: ${topValue} at index ${currentStack.length - 1}`, phase: 'identify' });
            currentStack.pop();
            steps.push({ stack: [...currentStack], highlightIndex: -1, operation: op, value: topValue, error: false, explanation: `Popped ${topValue} from stack. New size: ${currentStack.length}`, phase: 'complete' });
        } else if (op === 'peek') {
            if (currentStack.length === 0) {
                steps.push({ stack: [...currentStack], highlightIndex: -1, operation: op, value: null, error: true, explanation: `Cannot peek at empty stack.`, phase: 'error' });
                return steps;
            }
            const topValue = currentStack[currentStack.length - 1];
            steps.push({ stack: [...currentStack], highlightIndex: currentStack.length - 1, operation: op, value: topValue, error: false, explanation: `Peek: Top element is ${topValue} at index ${currentStack.length - 1}. Stack unchanged.`, phase: 'complete' });
        }
        return steps;
    };

    const handlePush = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const steps = generateSteps('push', parseInt(inputValue));
        setStepHistory(steps); setCurrentStep(0); setInputValue(''); setOperation('push');
    };
    const handlePop = () => { const steps = generateSteps('pop'); setStepHistory(steps); setCurrentStep(0); setOperation('pop'); };
    const handlePeek = () => { const steps = generateSteps('peek'); setStepHistory(steps); setCurrentStep(0); setOperation('peek'); };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= stepHistory.length - 1) {
                    setIsPlaying(false); clearInterval(interval);
                    if (stepHistory[stepHistory.length - 1]) setStack(stepHistory[stepHistory.length - 1].stack);
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
            if (next === stepHistory.length - 1) setStack(stepHistory[stepHistory.length - 1].stack);
        }
    };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const pauseAnimation = () => setIsPlaying(false);
    const reset = () => { setStack([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setOperation(''); };

    const currentState = stepHistory[currentStep] || { stack, highlightIndex: -1, operation: '', value: null, error: false, explanation: 'Use Push, Pop, or Peek to begin visualization.', phase: '' };

    const getStackElementColor = (index) => {
        if (currentState.error) return 'bg-red-500/80 border-red-400 text-white';
        if (currentState.highlightIndex === index) {
            if (currentState.phase === 'identify') return 'bg-yellow-400 border-yellow-300 text-slate-900 animate-pulse';
            if (currentState.phase === 'complete') return 'bg-green-400 border-green-300 text-slate-900 animate-pulse';
            return 'bg-blue-400 border-blue-300 text-white animate-pulse';
        }
        return 'bg-blue-500/70 border-blue-400 text-white';
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct });
    };
    const nextQuestion = () => { setCurrentQuestion(prev => (prev + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `class StackArray:
    def __init__(self, max_size):
        self.array = [None] * max_size  # Fixed-size array
        self.top = -1                   # Index of top element
        self.max_size = max_size

    def push(self, value):
        if self.top >= self.max_size - 1:
            raise Exception("Stack Overflow")
        self.top += 1
        self.array[self.top] = value
        return value

    def pop(self):
        if self.top < 0:
            raise Exception("Stack Underflow")
        value = self.array[self.top]
        self.array[self.top] = None
        self.top -= 1
        return value

    def peek(self):
        if self.top < 0:
            raise Exception("Stack is Empty")
        return self.array[self.top]

    def is_empty(self):
        return self.top < 0

    def is_full(self):
        return self.top >= self.max_size - 1

    def size(self):
        return self.top + 1`;

    const q = quizQuestions[currentQuestion];

    return (
        <div className="min-h-screen bg-slate-950">
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Stack: Array Implementation</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore LIFO (Last In, First Out) through push, pop, and peek. Watch how the top pointer moves as elements enter and leave.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Code className="h-4 w-4" /> Array Implementation</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Clock className="h-4 w-4" /> O(1) Operations</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Stack Visualization</h2>
                        <p className="text-slate-400 text-sm mb-5">Elements are added/removed from the <span className="text-blue-400 font-medium">TOP</span> only — LIFO principle.</p>

                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/70 border border-blue-400"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Active / Scanning</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Completed</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/80"></span><span className="text-slate-300">Error</span></span>
                            </div>
                        </div>

                        <div className="mb-6 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePush()}
                                    placeholder="Enter value"
                                    className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-36" />
                                <button onClick={handlePush} disabled={isPlaying} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Plus className="h-4 w-4" /> Push
                                </button>
                                <button onClick={handlePop} disabled={isPlaying} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Minus className="h-4 w-4" /> Pop
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

                        <div className="mb-5">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="flex flex-col-reverse items-center min-h-96 w-28 bg-slate-800/50 border-2 border-slate-600 rounded-xl p-2">
                                        {currentState.stack.map((value, index) => (
                                            <div key={`${index}-${value}`}
                                                className={`w-full h-12 flex items-center justify-center font-bold rounded-lg border-2 mb-1.5 transition-all duration-300 text-lg ${getStackElementColor(index)}`}>
                                                {value}
                                            </div>
                                        ))}
                                        {Array.from({ length: maxSize - currentState.stack.length }).map((_, index) => (
                                            <div key={`empty-${index}`}
                                                className="w-full h-12 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-700 rounded-lg mb-1.5 text-xs font-mono">
                                                [{currentState.stack.length + index}]
                                            </div>
                                        ))}
                                    </div>
                                    {currentState.stack.length > 0 && (
                                        <div className="absolute -right-16 flex items-center" style={{ bottom: `${currentState.stack.length * 54 - 24}px` }}>
                                            <ChevronDown className="h-6 w-6 text-blue-400 rotate-90" />
                                            <span className="text-sm font-bold text-blue-400 ml-0.5">TOP</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-center mt-4 flex justify-center gap-6">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-blue-400">{currentState.stack.length} / {maxSize}</div>
                                    <div className="text-xs text-slate-500">Size / Capacity</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className={`text-lg font-bold ${currentState.stack.length === 0 ? 'text-slate-400' : currentState.stack.length === maxSize ? 'text-red-400' : 'text-green-400'}`}>
                                        {currentState.stack.length === 0 ? 'Empty' : currentState.stack.length === maxSize ? 'Full' : 'Available'}
                                    </div>
                                    <div className="text-xs text-slate-500">Status</div>
                                </div>
                            </div>
                        </div>

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
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Complexity Analysis</h2>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['O(1)', 'Push'], ['O(1)', 'Pop'], ['O(1)', 'Peek']].map(([complexity, op]) => (
                                    <div key={op} className="text-center bg-green-500/10 border border-green-500/20 rounded-lg py-3">
                                        <div className="text-xl font-bold text-green-400">{complexity}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">Fixed array allocation</div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Stack Operations</h2>
                            <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-4 py-1">
                                    <h3 className="font-semibold text-blue-400 text-sm">Push</h3>
                                    <p className="text-slate-400 text-sm">Add element to the top — increment top pointer, assign value</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4 py-1">
                                    <h3 className="font-semibold text-red-400 text-sm">Pop</h3>
                                    <p className="text-slate-400 text-sm">Remove and return top element — decrement top pointer</p>
                                </div>
                                <div className="border-l-4 border-emerald-500 pl-4 py-1">
                                    <h3 className="font-semibold text-emerald-400 text-sm">Peek / Top</h3>
                                    <p className="text-slate-400 text-sm">Read top element without removing it</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Real-World Applications</h2>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                                {[
                                    [Code2, 'Function Call Stack', 'OS manages function calls using a call stack'],
                                    [Undo2, 'Undo Operations', 'Ctrl+Z pushes state; undo pops it'],
                                    [Hash, 'Expression Evaluation', 'Parsing parentheses and arithmetic operators'],
                                    [Globe, 'Browser History', 'Back button pops the last visited page'],
                                    [Braces, 'Syntax Checking', 'Matching brackets, braces, and parentheses'],
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
                                        {quizState.correct
                                            ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                            : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                                        <span className={`font-semibold ${quizState.correct ? 'text-green-300' : 'text-red-300'}`}>
                                            {quizState.correct ? 'Correct!' : 'Not quite.'}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                </div>
                            )}
                            {quizState.answered && (
                                <button onClick={nextQuestion} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                                    Next Question
                                </button>
                            )}
                        </div>

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
