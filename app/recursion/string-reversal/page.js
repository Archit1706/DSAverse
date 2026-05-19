"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Type,
    ChevronRight, ChevronLeft, Brain, CheckCircle, XCircle, Info, ArrowDown, ArrowUp
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "How does recursive string reversal build its result?",
        options: [
            "It reverses characters during the forward (calling) phase",
            "reverse(rest) + first_char — result builds on the unwind phase",
            "It swaps adjacent characters repeatedly",
            "It uses an extra array to store characters"
        ],
        correct: 1,
        explanation: "The reversed result is built on the way back: reverse(s[1:]) returns first, then s[0] is appended. The result is constructed bottom-up as the stack unwinds."
    },
    {
        question: "When does the recursion stop (base case)?",
        options: [
            "When the string has been fully reversed",
            "When the call stack overflows",
            "When the string is empty or has 1 character",
            "When all characters have been visited once"
        ],
        correct: 2,
        explanation: "A string of length 0 or 1 is its own reverse — that's the base case. Every recursive call passes a shorter substring until this is reached."
    },
    {
        question: "For a 5-character string, how deep does the call stack go?",
        options: ["4 levels deep", "5 levels deep (one per character)", "10 levels deep", "25 levels deep"],
        correct: 1,
        explanation: "Each character creates one stack frame: reverse(HELLO) → reverse(ELLO) → reverse(LLO) → reverse(LO) → reverse(O). That is 5 levels — one per character."
    }
];

export default function StringReversalVisualizer() {
    const [inputString, setInputString] = useState("HELLO");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const generateSteps = (str) => {
        const steps = [];
        const reverseRecursive = (s, index = 0, callStack = []) => {
            const currentCall = {
                function: `reverse("${s.substring(index)}")`,
                character: index < s.length ? s[index] : null,
                remaining: s.substring(index + 1),
                index,
                phase: 'forward'
            };
            const newCallStack = [...callStack, currentCall];
            steps.push({
                callStack: newCallStack,
                currentIndex: index,
                currentChar: index < s.length ? s[index] : null,
                remaining: s.substring(index + 1),
                phase: 'forward',
                explanation: index >= s.length
                    ? `Base case: empty string returns ""`
                    : `Process '${s[index]}' at index ${index}, then reverse remaining: "${s.substring(index + 1)}"`
            });
            if (index >= s.length) {
                for (let i = newCallStack.length - 1; i >= 0; i--) {
                    const call = newCallStack[i];
                    if (call.character !== null) {
                        call.phase = 'backward';
                        call.result = s.substring(i + 1).split('').reverse().join('') + call.character;
                        steps.push({
                            callStack: newCallStack.slice(0, i + 1),
                            currentIndex: call.index,
                            currentChar: call.character,
                            remaining: call.remaining,
                            phase: 'backward',
                            result: call.result,
                            explanation: `Returning: reverse("${call.remaining}") + "${call.character}" = "${call.result}"`
                        });
                    }
                }
                return;
            }
            reverseRecursive(s, index + 1, newCallStack);
        };
        reverseRecursive(str);
        return steps;
    };

    useEffect(() => {
        if (inputString.trim()) {
            const steps = generateSteps(inputString);
            setStepHistory(steps);
            setCurrentStep(0);
        }
    }, [inputString]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => setCurrentStep(p => p + 1), speed);
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
        callStack: [], explanation: 'Type a string and click Play to visualize.',
        phase: 'forward', currentChar: null, remaining: '', result: '', currentIndex: -1
    };

    const reverseString = (str) => { if (str.length <= 1) return str; return reverseString(str.substring(1)) + str[0]; };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct });
    };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `def reverse_string(s):
    # Base case: empty or single char
    if len(s) <= 1:
        return s
    # Recursive: reverse(rest) + first char
    return reverse_string(s[1:]) + s[0]

# "${inputString}" -> "${reverseString(inputString)}"`;

    const jsCode = `function reverseString(s) {
    if (s.length <= 1) return s;
    return reverseString(s.substring(1)) + s[0];
}
// "${inputString}" -> "${reverseString(inputString)}"`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">String Reversal</h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch recursion process each character going down, then build the reversed string on the way back up.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Type className="h-4 w-4" /> Character by Character</div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full"><Clock className="h-4 w-4" /> O(n) Time & Space</div>
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
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Input String</label>
                                    <input type="text" value={inputString}
                                        onChange={(e) => { setInputString(e.target.value.toUpperCase().substring(0, 10)); setIsPlaying(false); setCurrentStep(0); }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                                        disabled={isPlaying} placeholder="Enter text (max 10)" />
                                    <div className="text-xs text-slate-500 mt-1">
                                        Reversed: <span className="text-green-400 font-mono">&ldquo;{reverseString(inputString)}&rdquo;</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Speed: {speed}ms</label>
                                    <input type="range" min="400" max="2000" step="200" value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handlePlay} disabled={!inputString.trim()}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center font-medium disabled:opacity-40">
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

                        {/* Step Info */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-5">
                            <h3 className="text-base font-bold text-white mb-3">Current Step</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span>
                                        <span>{currentStep + 1} / {stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Phase:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${currentState.phase === 'forward'
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                        : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'}`}>
                                        {currentState.phase === 'forward' ? 'Going Deeper' : 'Building Result'}
                                    </span>
                                </div>
                                {currentState.result && (
                                    <div className="text-sm">
                                        <span className="text-slate-400 text-xs">Current result: </span>
                                        <span className="font-mono text-green-300">&ldquo;{currentState.result}&rdquo;</span>
                                    </div>
                                )}
                                <div className={`rounded-lg p-3 ${currentState.phase === 'forward' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
                                    <div className="flex items-start gap-2">
                                        <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.phase === 'forward' ? 'text-blue-400' : 'text-purple-400'}`} />
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

                    {/* Main Visualization */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Character display */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-5 flex items-center">
                                <Type className="h-5 w-5 mr-2 text-green-400" /> String Processing
                            </h3>

                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3">Original String</h4>
                                <div className="flex justify-center items-center gap-2 flex-wrap">
                                    {inputString.split('').map((char, index) => (
                                        <div key={index}
                                            className={`w-12 h-12 border-2 rounded-xl flex flex-col items-center justify-center font-mono text-lg font-bold transition-all duration-400 ${currentState.currentIndex === index
                                                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 scale-110'
                                                : currentState.currentIndex > index
                                                    ? 'bg-slate-800 border-slate-600 text-slate-500'
                                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'}`}>
                                            <span>{char}</span>
                                            <span className="text-xs opacity-50 font-normal">{index}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {currentState.currentChar && (
                                <div className="flex justify-center items-center gap-4 mb-6">
                                    <div className="bg-yellow-400/15 border-2 border-yellow-400/50 rounded-xl p-3 text-center">
                                        <div className="text-xs text-yellow-400/70 mb-1">Processing</div>
                                        <div className="font-mono text-xl font-bold text-yellow-300">&ldquo;{currentState.currentChar}&rdquo;</div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-500" />
                                    <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-xl p-3 text-center">
                                        <div className="text-xs text-purple-400/70 mb-1">Will append to end</div>
                                        <div className="text-sm text-purple-300">after reverse(rest)</div>
                                    </div>
                                </div>
                            )}

                            {/* Recursive call stack visualization */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-300 mb-3">Recursive Calls</h4>
                                <div className="space-y-2">
                                    {currentState.callStack.length === 0 ? (
                                        <p className="text-slate-500 text-center py-6 text-sm">No active calls yet</p>
                                    ) : (
                                        currentState.callStack.map((call, index) => (
                                            <div key={index}
                                                className={`p-3 rounded-xl border-2 transition-all duration-400 ${call.phase === 'forward'
                                                    ? 'bg-blue-500/10 border-blue-500/30'
                                                    : 'bg-purple-500/10 border-purple-500/30'}`}
                                                style={{ marginLeft: `${index * 16}px` }}>
                                                <div className="font-mono text-sm flex items-center gap-3">
                                                    <span className={`font-bold ${call.phase === 'forward' ? 'text-blue-300' : 'text-purple-300'}`}>
                                                        {call.function}
                                                    </span>
                                                    {call.result && (
                                                        <span className="text-green-400 flex items-center gap-1">
                                                            <ChevronRight className="h-4 w-4" />
                                                            &ldquo;{call.result}&rdquo;
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Final result banner */}
                            {currentState.result && currentState.phase === 'backward' && (
                                <div className="mt-5 bg-green-500/10 border-2 border-green-500/30 rounded-xl p-4 text-center">
                                    <div className="text-sm text-slate-400 mb-1">Current partial result</div>
                                    <div className="font-mono text-2xl font-bold text-green-300">&ldquo;{currentState.result}&rdquo;</div>
                                </div>
                            )}
                        </div>

                        {/* Analysis */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Algorithm Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Time: O(n)</h4>
                                        <p className="text-slate-400 text-sm">Each character creates one recursive call. n chars = n calls.</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="font-bold text-green-400 text-sm mb-2">Space: O(n)</h4>
                                        <p className="text-slate-400 text-sm">Recursion depth equals string length. Each frame holds a substring reference.</p>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="font-bold text-green-400 text-sm mb-3">Applications</h4>
                                    <ul className="text-slate-400 text-sm space-y-1.5">
                                        {['Palindrome checking', 'Text processing & manipulation', 'Undo in text editors', 'Data format conversion', 'Encryption preprocessing'].map(a => (
                                            <li key={a} className="flex items-center gap-2">
                                                <ChevronRight className="h-3 w-3 text-green-400 flex-shrink-0" />{a}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Code */}
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
