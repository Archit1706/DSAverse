'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ArrowDown, Link2, Eye, ChevronLeft, ChevronRight, Brain, CheckCircle, XCircle, Crosshair, Info, Wrench, Expand, Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "In a linked list stack, where is the TOP of the stack?",
        options: ["The last node in the list", "The head node", "A separate pointer variable", "The middle of the list"],
        correct: 1,
        explanation: "The HEAD node is the TOP of the stack. Push creates a new head; Pop removes the head — always O(1)."
    },
    {
        question: "What key advantage does a linked list stack have over an array stack?",
        options: ["Better cache performance", "Fixed maximum size", "Dynamic size — no overflow limit", "Faster peek operation"],
        correct: 2,
        explanation: "Linked list stacks have no fixed size limit (only system memory). Array stacks need a pre-defined max capacity."
    },
    {
        question: "What is the extra memory cost per element in a linked list stack?",
        options: ["Zero — same as array", "One pointer (next reference)", "Two pointers (prev and next)", "An entire memory page"],
        correct: 1,
        explanation: "Each node stores its value PLUS a next pointer — extra overhead vs. arrays which only store values."
    }
];

const getStepIcon = (phase, error) => {
    if (error) return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
    switch (phase) {
        case 'complete': case 'found': return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />;
        case 'error': case 'not_found': return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
        case 'identify': return <Crosshair className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        case 'create': return <Wrench className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
        default: return <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
    }
};

export default function StackLinkedListPage() {
    const [stack, setStack] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [operation, setOperation] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    useEffect(() => { reset(); }, []);

    const generateSteps = (op, value = null) => {
        const steps = [];
        const currentStack = [...stack];

        if (op === 'push') {
            const newNode = { id: nodeIdCounter, value, next: currentStack.length > 0 ? currentStack[0].id : null };
            steps.push({ stack: [...currentStack], newNode, highlightNodeId: -1, operation: op, value, error: false, explanation: `Creating new node with value ${value}. Next → ${newNode.next ? `Node ${newNode.next}` : 'NULL'}`, phase: 'create' });
            currentStack.unshift(newNode);
            steps.push({ stack: [...currentStack], newNode: null, highlightNodeId: newNode.id, operation: op, value, error: false, explanation: `Node ${newNode.id} added as new head (TOP). Previous head becomes next node. Size: ${currentStack.length}`, phase: 'complete' });
        } else if (op === 'pop') {
            if (currentStack.length === 0) {
                steps.push({ stack: [...currentStack], newNode: null, highlightNodeId: -1, operation: op, value: null, error: true, explanation: `Stack Underflow! Cannot pop from empty stack.`, phase: 'error' });
                return steps;
            }
            const headNode = currentStack[0];
            steps.push({ stack: [...currentStack], newNode: null, highlightNodeId: headNode.id, operation: op, value: headNode.value, error: false, explanation: `Identifying head node (TOP): Node ${headNode.id} with value ${headNode.value}`, phase: 'identify' });
            currentStack.shift();
            steps.push({ stack: [...currentStack], newNode: null, highlightNodeId: -1, operation: op, value: headNode.value, error: false, explanation: `Removed head node (${headNode.value}). ${currentStack.length > 0 ? 'Next node becomes new head.' : 'Stack is now empty.'} Size: ${currentStack.length}`, phase: 'complete' });
        } else if (op === 'peek') {
            if (currentStack.length === 0) {
                steps.push({ stack: [...currentStack], newNode: null, highlightNodeId: -1, operation: op, value: null, error: true, explanation: `Cannot peek at empty stack.`, phase: 'error' });
                return steps;
            }
            const headValue = currentStack[0].value;
            steps.push({ stack: [...currentStack], newNode: null, highlightNodeId: currentStack[0].id, operation: op, value: headValue, error: false, explanation: `Peek: Head node (TOP) contains value ${headValue}. Stack unchanged.`, phase: 'complete' });
        }
        return steps;
    };

    const handlePush = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const steps = generateSteps('push', parseInt(inputValue));
        setStepHistory(steps); setCurrentStep(0); setInputValue(''); setOperation('push');
        setNodeIdCounter(prev => prev + 1);
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
    const reset = () => { setStack([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setOperation(''); setNodeIdCounter(1); };

    const currentState = stepHistory[currentStep] || { stack, newNode: null, highlightNodeId: -1, operation: '', value: null, error: false, explanation: 'Use Push, Pop, or Peek to begin visualization.', phase: '' };

    const getNodeColor = (nodeId) => {
        if (currentState.error) return 'bg-red-500/80 border-red-400 text-white';
        if (currentState.highlightNodeId === nodeId) {
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

    const codeExample = `class Node:
    def __init__(self, value):
        self.value = value
        self.next = None   # Reference to next node

class StackLinkedList:
    def __init__(self):
        self.head = None   # TOP of stack
        self.size = 0

    def push(self, value):
        new_node = Node(value)
        new_node.next = self.head  # Point to old top
        self.head = new_node       # New node is now top
        self.size += 1
        return value

    def pop(self):
        if self.head is None:
            raise Exception("Stack Underflow")
        value = self.head.value
        self.head = self.head.next  # Move top to next
        self.size -= 1
        return value

    def peek(self):
        if self.head is None:
            raise Exception("Stack is Empty")
        return self.head.value

    def is_empty(self):
        return self.head is None

    def get_size(self):
        return self.size`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Stack: Linked List Implementation</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            A dynamic stack using linked nodes. No fixed capacity — the top is always the head node.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Link2 className="h-4 w-4" /> Linked List Nodes</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Clock className="h-4 w-4" /> O(1) Operations</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Stack Visualization</h2>
                        <p className="text-slate-400 text-sm mb-5">The <span className="text-blue-400 font-medium">HEAD</span> node is always the TOP. Each node holds a value + a pointer to the next node.</p>

                        {/* Color Legend */}
                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/70 border border-blue-400"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Active / Target</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Completed</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/80"></span><span className="text-slate-300">Error</span></span>
                            </div>
                        </div>

                        {/* Controls */}
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
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-300">Speed:</label>
                                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value={2000}>Slow</option>
                                    <option value={1000}>Normal</option>
                                    <option value={500}>Fast</option>
                                </select>
                            </div>
                        </div>

                        {/* Stack Visualization */}
                        <div className="mb-5">
                            <div className="flex justify-center">
                                <div className="relative min-h-96 flex flex-col items-center w-full max-w-sm">
                                    {/* HEAD pointer */}
                                    <div className="mb-3 flex flex-col items-center">
                                        <div className="bg-indigo-500/20 border-2 border-indigo-500/50 rounded-lg px-5 py-2 text-sm font-bold text-indigo-300 tracking-wider">
                                            HEAD (TOP)
                                        </div>
                                        {currentState.stack.length > 0 && <ArrowDown className="h-5 w-5 text-indigo-400 mt-1" />}
                                    </div>

                                    {/* New node being created */}
                                    {currentState.newNode && (
                                        <div className="mb-3 animate-bounce">
                                            <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-3 flex items-center gap-3">
                                                <div className="text-center">
                                                    <div className="text-xs text-yellow-400/70 mb-0.5">Node {currentState.newNode.id}</div>
                                                    <div className="font-bold text-yellow-300 text-lg">{currentState.newNode.value}</div>
                                                </div>
                                                <div className="text-xs text-slate-400 border-l border-slate-600 pl-3">
                                                    next → {currentState.newNode.next ? `Node ${currentState.newNode.next}` : 'NULL'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stack nodes */}
                                    <div className="space-y-1.5 w-full">
                                        {currentState.stack.length === 0 ? (
                                            <div className="w-full h-20 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                                                Stack is empty — push to begin
                                            </div>
                                        ) : (
                                            currentState.stack.map((node, index) => (
                                                <div key={node.id} className="flex flex-col items-center">
                                                    <div className={`w-full flex items-center justify-between rounded-xl border-2 p-3 transition-all duration-300 ${getNodeColor(node.id)}`}>
                                                        <div className="text-center">
                                                            <div className="text-xs opacity-70 mb-0.5">Node {node.id} {index === 0 ? '• TOP' : ''}</div>
                                                            <div className="font-bold text-xl">{node.value}</div>
                                                        </div>
                                                        <div className="text-xs opacity-70 border-l border-current pl-3">
                                                            next → {node.next ? `Node ${node.next}` : 'NULL'}
                                                        </div>
                                                    </div>
                                                    {index < currentState.stack.length - 1 && (
                                                        <ArrowDown className="h-4 w-4 text-slate-500 my-0.5" />
                                                    )}
                                                    {index === currentState.stack.length - 1 && (
                                                        <div className="flex flex-col items-center mt-0.5">
                                                            <ArrowDown className="h-4 w-4 text-slate-600" />
                                                            <span className="text-xs text-slate-500 bg-slate-800 border border-slate-600 px-2 py-0.5 rounded font-mono">NULL</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-center mt-4 flex justify-center gap-6">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-blue-400">{currentState.stack.length}</div>
                                    <div className="text-xs text-slate-500">Size</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-sm font-bold text-purple-400 truncate max-w-32">
                                        {currentState.stack.length > 0 ? `Node ${currentState.stack[0].id} (${currentState.stack[0].value})` : 'NULL'}
                                    </div>
                                    <div className="text-xs text-slate-500">Head</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-sm font-bold text-green-400">Dynamic</div>
                                    <div className="text-xs text-slate-500">Allocation</div>
                                </div>
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
                                {[['O(1)', 'Push'], ['O(1)', 'Pop'], ['O(1)', 'Peek']].map(([c, op]) => (
                                    <div key={op} className="text-center bg-green-500/10 border border-green-500/20 rounded-lg py-3">
                                        <div className="text-xl font-bold text-green-400">{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">Dynamic allocation + pointer per node</div>
                            </div>
                        </div>

                        {/* Advantages vs Array */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Linked List vs Array Stack</h2>
                            <div className="space-y-2">
                                {[
                                    { Icon: Expand, text: 'Dynamic Size', desc: 'No fixed max — grows as needed', good: true },
                                    { Icon: ShieldCheck, text: 'No Overflow', desc: 'Limited only by available memory', good: true },
                                    { Icon: Cpu, text: 'Memory Efficient', desc: 'Allocates exactly what is needed', good: true },
                                    { Icon: AlertTriangle, text: 'Pointer Overhead', desc: 'Extra memory per node for next reference', good: false },
                                    { Icon: AlertTriangle, text: 'Cache Performance', desc: 'Nodes scattered in memory (not contiguous)', good: false },
                                ].map(({ Icon, text, desc, good }) => (
                                    <div key={text} className={`flex items-start gap-3 rounded-lg p-3 ${good ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${good ? 'text-green-400' : 'text-yellow-400'}`} />
                                        <div>
                                            <div className={`font-medium text-sm ${good ? 'text-green-400' : 'text-yellow-400'}`}>{text}</div>
                                            <div className="text-slate-500 text-xs">{desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Operations */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">How Operations Work</h2>
                            <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-4 py-1">
                                    <h3 className="font-semibold text-blue-400 text-sm">Push</h3>
                                    <p className="text-slate-400 text-sm">Create node → set next = old head → update head to new node</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4 py-1">
                                    <h3 className="font-semibold text-red-400 text-sm">Pop</h3>
                                    <p className="text-slate-400 text-sm">Store head value → move head to head.next → return stored value</p>
                                </div>
                                <div className="border-l-4 border-emerald-500 pl-4 py-1">
                                    <h3 className="font-semibold text-emerald-400 text-sm">Peek</h3>
                                    <p className="text-slate-400 text-sm">Return head.value without modifying the list</p>
                                </div>
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
