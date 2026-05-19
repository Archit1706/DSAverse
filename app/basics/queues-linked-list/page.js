'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ArrowRight, Link2, ChevronLeft, ChevronRight, Brain, Eye, CheckCircle, XCircle, Crosshair, Info, Wrench, AlertTriangle, ShieldCheck, Cpu, GitBranch, Printer, Package, Network } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "A linked list queue uses two pointers — what are they called?",
        options: ["Head and Tail", "Front and Rear", "Top and Bottom", "Start and End"],
        correct: 1,
        explanation: "Front points to the dequeue end; Rear points to the enqueue end. Both pointers are NULL when the queue is empty."
    },
    {
        question: "What is the time complexity of Dequeue in a linked list queue?",
        options: ["O(n) — must traverse the list", "O(log n) — binary search", "O(1) — just move the front pointer", "O(n²) — double traversal"],
        correct: 2,
        explanation: "Dequeue is O(1): just read front.value, move front to front.next. No shifting required — a major advantage over array queues."
    },
    {
        question: "When does a linked list queue become empty?",
        options: ["When front equals rear", "When both front and rear are NULL", "When size reaches zero and we reset front/rear", "B and C are both correct"],
        correct: 3,
        explanation: "After dequeueing the last node, front becomes NULL. We also set rear to NULL to fully reset. Both conditions indicate an empty queue."
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

export default function QueueLinkedListPage() {
    const [queue, setQueue] = useState([]);
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
        const currentQueue = [...queue];

        if (op === 'enqueue') {
            const newNode = { id: nodeIdCounter, value, next: null };
            steps.push({ queue: [...currentQueue], newNode, highlightNodeId: -1, operation: op, value, error: false, explanation: `Creating new node (id: ${newNode.id}) with value ${value}. Next → NULL. Will link to rear.`, phase: 'create' });
            if (currentQueue.length === 0) {
                currentQueue.push(newNode);
                steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: newNode.id, operation: op, value, error: false, explanation: `First node added. Both FRONT and REAR now point to this node. Size: ${currentQueue.length}`, phase: 'complete' });
            } else {
                const lastNode = currentQueue[currentQueue.length - 1];
                lastNode.next = newNode.id;
                currentQueue.push(newNode);
                steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: newNode.id, operation: op, value, error: false, explanation: `Node linked to current rear. REAR updated → Node ${newNode.id}. Size: ${currentQueue.length}`, phase: 'complete' });
            }
        } else if (op === 'dequeue') {
            if (currentQueue.length === 0) {
                steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: -1, operation: op, value: null, error: true, explanation: `Queue Empty! Cannot dequeue.`, phase: 'error' });
                return steps;
            }
            const frontNode = currentQueue[0];
            steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: frontNode.id, operation: op, value: frontNode.value, error: false, explanation: `FRONT node: ${frontNode.value} (Node ${frontNode.id}). Moving FRONT pointer to next.`, phase: 'identify' });
            currentQueue.shift();
            steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: -1, operation: op, value: frontNode.value, error: false, explanation: `Removed Node ${frontNode.id} (${frontNode.value}). ${currentQueue.length > 0 ? 'FRONT now points to next node.' : 'Queue empty — FRONT and REAR both NULL.'} Size: ${currentQueue.length}`, phase: 'complete' });
        } else if (op === 'peek') {
            if (currentQueue.length === 0) {
                steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: -1, operation: op, value: null, error: true, explanation: `Cannot peek at empty queue.`, phase: 'error' });
                return steps;
            }
            const frontValue = currentQueue[0].value;
            steps.push({ queue: [...currentQueue], newNode: null, highlightNodeId: currentQueue[0].id, operation: op, value: frontValue, error: false, explanation: `Peek: FRONT node (${currentQueue[0].id}) contains value ${frontValue}. Queue unchanged.`, phase: 'complete' });
        }
        return steps;
    };

    const handleEnqueue = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const steps = generateSteps('enqueue', parseInt(inputValue));
        setStepHistory(steps); setCurrentStep(0); setInputValue(''); setOperation('enqueue');
        setNodeIdCounter(prev => prev + 1);
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
                    if (stepHistory[stepHistory.length - 1]) setQueue(stepHistory[stepHistory.length - 1].queue);
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
            if (next === stepHistory.length - 1) setQueue(stepHistory[stepHistory.length - 1].queue);
        }
    };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const pauseAnimation = () => setIsPlaying(false);
    const reset = () => { setQueue([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setOperation(''); setNodeIdCounter(1); };

    const currentState = stepHistory[currentStep] || { queue, newNode: null, highlightNodeId: -1, operation: '', value: null, error: false, explanation: 'Use Enqueue, Dequeue, or Peek to begin visualization.', phase: '' };

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
        self.next = None

class QueueLinkedList:
    def __init__(self):
        self.front = None  # Dequeue end
        self.rear = None   # Enqueue end
        self.size = 0

    def enqueue(self, value):
        new_node = Node(value)
        if self.rear is None:
            # Empty queue: front and rear both point to new node
            self.front = self.rear = new_node
        else:
            # Link new node to current rear, update rear
            self.rear.next = new_node
            self.rear = new_node
        self.size += 1
        return value

    def dequeue(self):
        if self.front is None:
            raise Exception("Queue Underflow")
        value = self.front.value
        self.front = self.front.next
        if self.front is None:  # Queue became empty
            self.rear = None
        self.size -= 1
        return value

    def peek(self):
        if self.front is None:
            raise Exception("Queue is Empty")
        return self.front.value

    def is_empty(self):
        return self.front is None`;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Queue: Linked List Implementation</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            A dynamic queue with front and rear pointers. True O(1) dequeue — no element shifting needed.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Link2 className="h-4 w-4" /> Linked Nodes</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Clock className="h-4 w-4" /> True O(1) Both Ends</div>
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
                            <span className="text-green-400 font-medium">FRONT</span> = where elements leave &nbsp;→→→&nbsp;
                            <span className="text-blue-400 font-medium">REAR</span> = where elements arrive
                        </p>

                        {/* Color Legend */}
                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/70 border border-blue-400"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Active / Target</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Completed</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400/30 border border-yellow-400"></span><span className="text-slate-300">New node</span></span>
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

                        {/* Queue Visualization */}
                        <div className="mb-5">
                            {/* Pointer labels */}
                            <div className="flex justify-between mb-2">
                                <div className="flex flex-col items-center">
                                    <div className={`border-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide ${currentState.queue.length > 0 ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                                        FRONT
                                    </div>
                                    {currentState.queue.length > 0 && <div className="w-px h-4 bg-green-500/50 mt-1"></div>}
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className={`border-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide ${currentState.queue.length > 0 ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                                        REAR
                                    </div>
                                    {currentState.queue.length > 0 && <div className="w-px h-4 bg-blue-500/50 mt-1"></div>}
                                </div>
                            </div>

                            {/* New node being created */}
                            {currentState.newNode && (
                                <div className="mb-3 flex justify-center animate-bounce">
                                    <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-3 flex items-center gap-3">
                                        <div className="text-center">
                                            <div className="text-xs text-yellow-400/70 mb-0.5">New Node {currentState.newNode.id}</div>
                                            <div className="font-bold text-yellow-300 text-lg">{currentState.newNode.value}</div>
                                        </div>
                                        <div className="text-xs text-slate-400 border-l border-slate-600 pl-3">next → NULL</div>
                                    </div>
                                </div>
                            )}

                            {/* Queue nodes */}
                            <div className="min-h-20 overflow-x-auto">
                                {currentState.queue.length === 0 ? (
                                    <div className="w-full h-20 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                                        Queue is empty — enqueue to begin
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 py-2">
                                        {currentState.queue.map((node, index) => (
                                            <div key={node.id} className="flex items-center flex-shrink-0">
                                                <div className={`flex flex-col items-start rounded-xl border-2 p-2.5 transition-all duration-300 min-w-20 ${getNodeColor(node.id)}`}>
                                                    <div className="text-xs opacity-70 mb-0.5">#{node.id} {index === 0 ? '· F' : index === currentState.queue.length - 1 ? '· R' : ''}</div>
                                                    <div className="font-bold text-xl">{node.value}</div>
                                                    <div className="text-xs opacity-60 mt-0.5">→ {node.next ? `#${node.next}` : 'NULL'}</div>
                                                </div>
                                                {index < currentState.queue.length - 1 && (
                                                    <ArrowRight className="h-4 w-4 text-slate-500 mx-1 flex-shrink-0" />
                                                )}
                                                {index === currentState.queue.length - 1 && (
                                                    <div className="flex items-center ml-2 flex-shrink-0">
                                                        <ArrowRight className="h-4 w-4 text-slate-600" />
                                                        <span className="text-xs text-slate-500 bg-slate-800 border border-slate-600 px-2 py-0.5 rounded font-mono ml-1">NULL</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="text-center mt-4 flex justify-center gap-4">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-blue-400">{currentState.queue.length}</div>
                                    <div className="text-xs text-slate-500">Size</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-sm font-bold text-green-400">{currentState.queue.length > 0 ? `Node ${currentState.queue[0].id}` : 'NULL'}</div>
                                    <div className="text-xs text-slate-500">Front</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-sm font-bold text-blue-400">{currentState.queue.length > 0 ? `Node ${currentState.queue[currentState.queue.length - 1].id}` : 'NULL'}</div>
                                    <div className="text-xs text-slate-500">Rear</div>
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
                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Complexity Analysis</h2>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[['O(1)', 'Enqueue'], ['O(1)', 'Dequeue'], ['O(1)', 'Peek']].map(([c, op]) => (
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
                            <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-300">
                                True O(1) dequeue — unlike array queues which may require O(n) shifting, linked list queues always dequeue in O(1).
                            </div>
                        </div>

                        {/* Two-Pointer Approach */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Two-Pointer Design</h2>
                            <div className="space-y-3">
                                <div className="border-l-4 border-green-500 pl-4 py-1">
                                    <h3 className="font-semibold text-green-400 text-sm">FRONT pointer</h3>
                                    <p className="text-slate-400 text-sm">Points to the first node — where dequeue removes from</p>
                                </div>
                                <div className="border-l-4 border-blue-500 pl-4 py-1">
                                    <h3 className="font-semibold text-blue-400 text-sm">REAR pointer</h3>
                                    <p className="text-slate-400 text-sm">Points to the last node — where enqueue adds to</p>
                                </div>
                                <div className="border-l-4 border-slate-500 pl-4 py-1">
                                    <h3 className="font-semibold text-slate-400 text-sm">Both NULL</h3>
                                    <p className="text-slate-400 text-sm">When the queue is empty — single node makes both equal</p>
                                </div>
                            </div>
                        </div>

                        {/* Advantages */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">vs Array Queue</h2>
                            <div className="space-y-2">
                                {[
                                    { Icon: CheckCircle, text: 'True O(1) Dequeue', desc: 'No element shifting — just move front pointer', good: true },
                                    { Icon: ShieldCheck, text: 'Unlimited Size', desc: 'No fixed capacity — grows dynamically', good: true },
                                    { Icon: Cpu, text: 'Memory Efficient', desc: 'Allocates nodes as needed', good: true },
                                    { Icon: AlertTriangle, text: 'Pointer Overhead', desc: 'Each node needs memory for next pointer', good: false },
                                    { Icon: AlertTriangle, text: 'Cache Locality', desc: 'Nodes scattered in memory, not contiguous', good: false },
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
