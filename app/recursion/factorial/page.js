"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Layers,
    ChevronDown, ArrowDown, ArrowUp, Calculator, TrendingUp,
    ChevronLeft, ChevronRight, Brain, CheckCircle, XCircle, Info
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the base case of factorial recursion?",
        options: ["factorial(0) = 0", "factorial(1) = 1 (recursion stops here)", "factorial(n) = n", "factorial(2) = 2"],
        correct: 1,
        explanation: "factorial(1) = 1 is the base case. Without it the function would call itself forever. factorial(0) = 1 also works as a base case."
    },
    {
        question: "How many recursive calls does factorial(5) make?",
        options: ["4 calls", "5 calls", "10 calls", "25 calls"],
        correct: 1,
        explanation: "factorial(5) → factorial(4) → factorial(3) → factorial(2) → factorial(1) — exactly 5 calls, one per integer from n down to 1."
    },
    {
        question: "When are the multiplication results computed?",
        options: ["During the forward (calling) phase", "During the backward (returning) phase", "Simultaneously with each call", "Only at the very end"],
        correct: 1,
        explanation: "Multiplications happen on the way back up. Each call waits for factorial(n-1) to return before computing n × result."
    }
];

export default function FactorialVisualizer() {
    const [n, setN] = useState(5);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [callStack, setCallStack] = useState([]);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [showTrace, setShowTrace] = useState(true);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const generateSteps = (num) => {
        const steps = [];
        const stack = [];
        const trace = [];
        let stepCounter = 0;

        for (let i = num; i >= 1; i--) {
            stepCounter++;
            const stackFrame = {
                id: stepCounter,
                call: `factorial(${i})`,
                state: 'calling',
                calculation: i === 1 ? '1 (base case)' : `${i} × factorial(${i - 1})`,
                level: num - i,
                parameter: i,
                waiting: i > 1
            };
            stack.push(stackFrame);
            trace.push(`Call: factorial(${i})`);
            steps.push({
                callStack: [...stack],
                explanation: i === 1
                    ? `Base case reached: factorial(1) = 1. Recursion stops here and we start returning values.`
                    : `Calling factorial(${i}). Need factorial(${i - 1}) first before computing ${i} × factorial(${i - 1}).`,
                currentCall: `factorial(${i})`,
                phase: 'forward',
                trace: [...trace],
                stepNumber: stepCounter,
                activeParameter: i,
                pendingCalculations: stack.filter(s => s.waiting).length
            });
        }

        let result = 1;
        for (let i = 1; i <= num; i++) {
            stepCounter++;
            const currentResult = i === 1 ? 1 : i * result;
            result = currentResult;
            const frameIndex = stack.findIndex(frame => frame.parameter === i);
            if (frameIndex !== -1) {
                stack[frameIndex].state = 'resolved';
                stack[frameIndex].result = currentResult;
                stack[frameIndex].waiting = false;
            }
            trace.push(`Return: factorial(${i}) = ${currentResult}`);
            steps.push({
                callStack: [...stack],
                explanation: i === 1
                    ? `Base case returns: factorial(1) = 1. Now we unwind the pending multiplications.`
                    : `factorial(${i}) = ${i} × ${result / i} = ${currentResult}. Returning to calling function.`,
                currentCall: `factorial(${i})`,
                phase: 'backward',
                result: currentResult,
                trace: [...trace],
                stepNumber: stepCounter,
                activeParameter: i,
                pendingCalculations: stack.filter(s => s.waiting).length
            });
        }
        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
        setCallStack(steps[0]?.callStack || []);
    }, [n]);

    useEffect(() => {
        const currentState = stepHistory[currentStep];
        if (currentState) setCallStack(currentState.callStack);
    }, [currentStep, stepHistory]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => setCurrentStep(prev => prev + 1), speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) setCurrentStep(0);
        setIsPlaying(!isPlaying);
    };
    const handleReset = () => { setIsPlaying(false); setCurrentStep(0); };
    const stepForward = () => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

    const currentState = stepHistory[currentStep] || {
        callStack: [], explanation: 'Adjust n and click Play to begin.', currentCall: '',
        phase: 'forward', trace: [], stepNumber: 0, pendingCalculations: 0
    };

    const factorial = (num) => { if (num <= 1) return 1; return num * factorial(num - 1); };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct });
    };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `def factorial(n):
    # Base case: factorial of 0 or 1 is 1
    if n <= 1:
        return 1
    # Recursive case: n * factorial(n-1)
    return n * factorial(n - 1)

# factorial(${n}) = ${factorial(n)}`;

    const jsCode = `function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
// factorial(${n}) = ${factorial(n)}`;

    const q = quizQuestions[currentQuestion];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/recursion" className="flex items-center text-white/80 hover:text-white transition-colors text-sm">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Recursion
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Factorial Recursion</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch the call stack grow as factorial calls itself, then see values return as the stack unwinds.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Layers className="h-4 w-4" /> Call Stack: O(n)</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> Time: O(n)</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Calculator className="h-4 w-4" /> Result: {factorial(n)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Control Panel */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Number (n): {n}</label>
                                    <input type="range" min="1" max="8" value={n}
                                        onChange={(e) => { setN(parseInt(e.target.value)); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        disabled={isPlaying} />
                                    <div className="mt-2 text-xs bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-green-300">
                                        <div className="font-medium">factorial({n}) = {factorial(n)}</div>
                                        <div className="text-slate-500 mt-0.5">Recursive calls: {n}</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="300" max="2000" step="100" value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                    <div className="text-xs text-slate-500 mt-1">{speed < 800 ? 'Fast' : speed < 1500 ? 'Medium' : 'Slow'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handlePlay}
                                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm font-medium">
                                        {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button onClick={handleReset}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm">
                                        <RotateCcw className="h-4 w-4 mr-1" /> Reset
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
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={showTrace} onChange={(e) => setShowTrace(e.target.checked)}
                                        className="rounded accent-green-500" />
                                    <span className="text-sm text-slate-300">Show execution trace</span>
                                </label>
                            </div>
                        </div>

                        {/* Step Information */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Step Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span>
                                        <span>{currentStep + 1} / {stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Phase:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${currentState.phase === 'forward'
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                        : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'}`}>
                                        {currentState.phase === 'forward' ? 'Making Calls' : 'Returning Values'}
                                    </span>
                                </div>
                                {currentState.pendingCalculations !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Pending:</span>
                                        <span className="text-orange-400 font-medium">{currentState.pendingCalculations} waiting</span>
                                    </div>
                                )}
                                <div className={`rounded-lg p-3 text-sm ${currentState.phase === 'forward' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
                                    <div className="flex items-start gap-2">
                                        <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.phase === 'forward' ? 'text-blue-400' : 'text-purple-400'}`} />
                                        <p className="text-slate-200 text-xs leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Call Stack Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Layers className="h-5 w-5 mr-2 text-green-400" />
                                    Call Stack
                                </h3>
                                <div className="flex items-center gap-3 text-sm">
                                    {currentState.phase === 'forward'
                                        ? <ArrowDown className="h-4 w-4 text-blue-400" />
                                        : <ArrowUp className="h-4 w-4 text-purple-400" />}
                                    <span className="text-slate-400">{currentState.phase === 'forward' ? 'Calling' : 'Returning'}</span>
                                    <div className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-300">
                                        Depth: {callStack.length}
                                    </div>
                                </div>
                            </div>

                            <div className="min-h-96">
                                {callStack.length === 0 ? (
                                    <div className="text-slate-500 text-center py-16">
                                        <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                        <p>Adjust n and click Play to begin</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col-reverse space-y-reverse space-y-2">
                                        {callStack.slice().reverse().map((call, index) => {
                                            const isActive = call.parameter === currentState.activeParameter;
                                            const stackPosition = callStack.length - index - 1;
                                            return (
                                                <div key={call.id}
                                                    className={`relative p-4 rounded-xl border-2 transition-all duration-500 ${call.state === 'calling'
                                                        ? 'bg-blue-500/10 border-blue-500/30'
                                                        : 'bg-green-500/10 border-green-500/30'
                                                        } ${isActive ? 'ring-2 ring-emerald-400/60 scale-105' : ''}`}
                                                    style={{ zIndex: callStack.length - index, marginLeft: `${stackPosition * 8}px` }}>
                                                    <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-600 rounded-full text-white text-xs flex items-center justify-center font-bold">
                                                        {stackPosition + 1}
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-mono text-base font-bold text-white mb-1">{call.call}</div>
                                                        <div className="text-xs text-slate-300 bg-slate-800/60 rounded px-2 py-1">{call.calculation}</div>
                                                        {call.waiting && (
                                                            <div className="text-xs text-orange-400 mt-1.5 flex items-center justify-center gap-1">
                                                                <Clock className="h-3 w-3" /> Waiting for result...
                                                            </div>
                                                        )}
                                                        {call.result !== undefined && (
                                                            <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-green-300 mt-2 bg-green-500/15 rounded px-2 py-1">
                                                                <CheckCircle className="h-4 w-4" /> Returns: {call.result}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 bg-slate-800/50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Legend</p>
                                <div className="flex flex-wrap gap-3 text-xs">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40"></span><span className="text-slate-300">Making call</span></span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40"></span><span className="text-slate-300">Returned</span></span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="text-slate-300">Active</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Execution Trace */}
                    <div className="lg:col-span-1 space-y-4">
                        {showTrace && (
                            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                                <h3 className="text-base font-bold text-white mb-3 flex items-center">
                                    <TrendingUp className="h-5 w-5 mr-2 text-green-400" /> Execution Trace
                                </h3>
                                <div className="max-h-72 overflow-y-auto space-y-1">
                                    {currentState.trace && currentState.trace.length > 0 ? (
                                        currentState.trace.map((item, idx) => (
                                            <div key={idx} className={`text-xs p-2 rounded ${idx === currentState.trace.length - 1
                                                ? 'bg-green-500/10 border border-green-500/20 text-green-300 font-medium'
                                                : 'bg-slate-800/60 text-slate-400'}`}>
                                                <span className="text-slate-600 mr-2">{idx + 1}.</span>{item}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-center py-4 text-xs">Trace will appear here</p>
                                    )}
                                </div>
                            </div>
                        )}

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
                                        <span className={`text-xs font-semibold ${quizState.correct ? 'text-green-300' : 'text-red-300'}`}>
                                            {quizState.correct ? 'Correct!' : 'Not quite.'}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                                </div>
                            )}
                            {quizState.answered && (
                                <button onClick={nextQuestion} className="w-full bg-green-700 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">
                                    Next Question
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Code Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-400" /> Python
                        </h3>
                        <CodeBlock code={codeExample} language="python" />
                    </div>
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-400" /> JavaScript
                        </h3>
                        <CodeBlock code={jsCode} language="javascript" />
                    </div>
                </div>

                {/* Analysis */}
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mt-6">
                    <h3 className="text-xl font-bold text-white mb-6">Complexity Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <h4 className="font-bold text-green-400 mb-2 flex items-center text-sm">
                                <Clock className="h-4 w-4 mr-1" /> Time Complexity: O(n)
                            </h4>
                            <p className="text-slate-400 text-sm">Exactly n recursive calls, each O(1). For n={n}: {n} calls.</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <h4 className="font-bold text-green-400 mb-2 flex items-center text-sm">
                                <Layers className="h-4 w-4 mr-1" /> Space Complexity: O(n)
                            </h4>
                            <p className="text-slate-400 text-sm">Call stack grows to depth n. For n={n}: max {n} frames.</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <h4 className="font-bold text-green-400 mb-2 flex items-center text-sm">
                                <Calculator className="h-4 w-4 mr-1" /> Key Patterns
                            </h4>
                            <ul className="text-slate-400 text-sm space-y-1">
                                <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Base case: factorial(1) = 1</li>
                                <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Recursive: n × factorial(n-1)</li>
                                <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Stack grows on calls</li>
                                <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Values computed on return</li>
                                <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-green-400" /> Result: {factorial(n)}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
