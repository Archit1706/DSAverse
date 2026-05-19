'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, Search, Link2, ArrowRight, ChevronLeft, ChevronRight, Brain, CheckCircle, XCircle, Crosshair, Info, Wrench, AlertTriangle, ShieldCheck, Server, Undo2, GitBranch, Music } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the time complexity of accessing an element at index k in a linked list?",
        options: ["O(1) — direct address calculation", "O(log k) — binary search", "O(k) — must traverse from head", "O(n²) — nested traversal"],
        correct: 2,
        explanation: "Linked lists have no direct indexing. You must start at the head and follow k next pointers — O(k) which is O(n) worst case."
    },
    {
        question: "Why is inserting at the head of a linked list O(1)?",
        options: ["It uses a cache for quick access", "No traversal needed — just create a node and update head", "The head is stored in a hash map", "Linked lists pre-allocate head space"],
        correct: 1,
        explanation: "Head insertion: create node, set node.next = head, set head = node. No traversal. This is O(1) regardless of list size."
    },
    {
        question: "Which scenario gives the linked list a clear advantage over an array?",
        options: ["Frequent random access by index", "Frequent insertions and deletions at arbitrary positions", "Sorting large datasets quickly", "Storing data with predictable size"],
        correct: 1,
        explanation: "Linked lists excel at insert/delete at known positions — update 2 pointers, O(1). Arrays need to shift O(n) elements."
    }
];

const getStepIcon = (phase, error) => {
    if (error) return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
    switch (phase) {
        case 'complete': case 'found': return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />;
        case 'error': case 'not_found': return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
        case 'identify': return <Crosshair className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        case 'searching': case 'traverse': return <ArrowRight className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        case 'create': return <Wrench className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
        default: return <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
    }
};

export default function ListLinkedListPage() {
    const [list, setList] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [indexValue, setIndexValue] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [operation, setOperation] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    useEffect(() => { reset(); }, []);

    const generateSteps = (op, value = null, index = null) => {
        const steps = [];
        const currentList = [...list];

        if (op === 'insert') {
            const insertIndex = index !== null ? index : currentList.length;
            if (insertIndex < 0 || insertIndex > currentList.length) {
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value, insertIndex, error: true, explanation: `Invalid index ${insertIndex}. Must be between 0 and ${currentList.length}.`, phase: 'error' });
                return steps;
            }
            const newNode = { id: nodeIdCounter, value, next: null };
            steps.push({ list: [...currentList], newNode, highlightNodeId: -1, traverseIndex: -1, operation: op, value, insertIndex, error: false, explanation: `Creating new node (id: ${newNode.id}) with value ${value}.`, phase: 'create' });

            if (insertIndex === 0) {
                if (currentList.length > 0) newNode.next = currentList[0].id;
                currentList.unshift(newNode);
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: newNode.id, traverseIndex: -1, operation: op, value, insertIndex, error: false, explanation: `Inserted ${value} at head (index 0). Updated head pointer. O(1) — no traversal needed.`, phase: 'complete' });
            } else {
                for (let i = 0; i < insertIndex - 1; i++) {
                    steps.push({ list: [...currentList], newNode, highlightNodeId: currentList[i].id, traverseIndex: i, operation: op, value, insertIndex, error: false, explanation: `Traversing to position ${insertIndex}. At index ${i} (Node ${currentList[i].id}).`, phase: 'traverse' });
                }
                if (insertIndex < currentList.length) {
                    newNode.next = currentList[insertIndex - 1].next;
                    currentList[insertIndex - 1].next = newNode.id;
                } else {
                    currentList[insertIndex - 1].next = newNode.id;
                }
                currentList.splice(insertIndex, 0, newNode);
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: newNode.id, traverseIndex: insertIndex, operation: op, value, insertIndex, error: false, explanation: `Inserted ${value} at index ${insertIndex}. Updated prev → new → next pointers. Size: ${currentList.length}`, phase: 'complete' });
            }

        } else if (op === 'delete') {
            const deleteIndex = index !== null ? index : currentList.length - 1;
            if (deleteIndex < 0 || deleteIndex >= currentList.length) {
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value: null, deleteIndex, error: true, explanation: `Invalid index ${deleteIndex}. Must be between 0 and ${currentList.length - 1}.`, phase: 'error' });
                return steps;
            }
            if (deleteIndex === 0) {
                const deletedNode = currentList[0];
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: deletedNode.id, traverseIndex: 0, operation: op, value: deletedNode.value, deleteIndex, error: false, explanation: `Deleting head node: ${deletedNode.value} (Node ${deletedNode.id}). O(1) — just move head.`, phase: 'identify' });
                currentList.shift();
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value: deletedNode.value, deleteIndex, error: false, explanation: `Head removed (${deletedNode.value}). Head pointer updated. Size: ${currentList.length}`, phase: 'complete' });
            } else {
                for (let i = 0; i < deleteIndex - 1; i++) {
                    steps.push({ list: [...currentList], newNode: null, highlightNodeId: currentList[i].id, traverseIndex: i, operation: op, value: null, deleteIndex, error: false, explanation: `Traversing to position before deletion. At index ${i}.`, phase: 'traverse' });
                }
                const deletedNode = currentList[deleteIndex];
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: deletedNode.id, traverseIndex: deleteIndex, operation: op, value: deletedNode.value, deleteIndex, error: false, explanation: `Found node to delete at index ${deleteIndex}: ${deletedNode.value} (Node ${deletedNode.id}).`, phase: 'identify' });
                if (deleteIndex < currentList.length - 1) {
                    currentList[deleteIndex - 1].next = currentList[deleteIndex].next;
                } else {
                    currentList[deleteIndex - 1].next = null;
                }
                currentList.splice(deleteIndex, 1);
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value: deletedNode.value, deleteIndex, error: false, explanation: `Deleted ${deletedNode.value}. Pointer updated: prev.next → next node. Size: ${currentList.length}`, phase: 'complete' });
            }

        } else if (op === 'search') {
            steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value, searchIndex: 0, error: false, explanation: `Starting search for value ${value} from head.`, phase: 'start' });
            for (let i = 0; i < currentList.length; i++) {
                if (currentList[i].value === value) {
                    steps.push({ list: [...currentList], newNode: null, highlightNodeId: currentList[i].id, traverseIndex: i, operation: op, value, searchIndex: i, error: false, explanation: `Found ${value} at index ${i} (Node ${currentList[i].id})! Took ${i + 1} step${i === 0 ? '' : 's'}.`, phase: 'found' });
                    return steps;
                }
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: currentList[i].id, traverseIndex: i, operation: op, value, searchIndex: i, error: false, explanation: `Index ${i}: ${currentList[i].value} ≠ ${value}. Follow next pointer.`, phase: 'searching' });
            }
            steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value, searchIndex: -1, error: true, explanation: `Value ${value} not found after traversing all ${currentList.length} nodes.`, phase: 'not_found' });

        } else if (op === 'access') {
            const accessIndex = index !== null ? index : 0;
            if (accessIndex < 0 || accessIndex >= currentList.length) {
                steps.push({ list: [...currentList], newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: op, value: null, accessIndex, error: true, explanation: `Index ${accessIndex} out of bounds.`, phase: 'error' });
                return steps;
            }
            for (let i = 0; i <= accessIndex; i++) {
                if (i === accessIndex) {
                    steps.push({ list: [...currentList], newNode: null, highlightNodeId: currentList[i].id, traverseIndex: i, operation: op, value: currentList[i].value, accessIndex, error: false, explanation: `Reached index ${accessIndex}: value = ${currentList[i].value}. Required ${accessIndex + 1} traversal step${accessIndex === 0 ? '' : 's'} — this is O(n).`, phase: 'complete' });
                } else {
                    steps.push({ list: [...currentList], newNode: null, highlightNodeId: currentList[i].id, traverseIndex: i, operation: op, value: null, accessIndex, error: false, explanation: `Traversing to index ${accessIndex}. At index ${i} (${accessIndex - i} more step${accessIndex - i === 1 ? '' : 's'}).`, phase: 'traverse' });
                }
            }
        }
        return steps;
    };

    const handleInsert = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const idx = indexValue === '' ? null : parseInt(indexValue);
        const steps = generateSteps('insert', parseInt(inputValue), idx);
        setStepHistory(steps); setCurrentStep(0); setInputValue(''); setIndexValue(''); setOperation('insert');
        setNodeIdCounter(prev => prev + 1);
    };
    const handleDelete = () => {
        const idx = indexValue === '' ? null : parseInt(indexValue);
        const steps = generateSteps('delete', null, idx);
        setStepHistory(steps); setCurrentStep(0); setIndexValue(''); setOperation('delete');
    };
    const handleSearch = () => {
        if (!searchValue || isNaN(searchValue)) return;
        const steps = generateSteps('search', parseInt(searchValue));
        setStepHistory(steps); setCurrentStep(0); setSearchValue(''); setOperation('search');
    };
    const handleAccess = () => {
        if (indexValue === '' || isNaN(indexValue)) return;
        const steps = generateSteps('access', null, parseInt(indexValue));
        setStepHistory(steps); setCurrentStep(0); setIndexValue(''); setOperation('access');
    };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= stepHistory.length - 1) {
                    setIsPlaying(false); clearInterval(interval);
                    if (stepHistory[stepHistory.length - 1]) setList(stepHistory[stepHistory.length - 1].list);
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
            if (next === stepHistory.length - 1) setList(stepHistory[stepHistory.length - 1].list);
        }
    };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const pauseAnimation = () => setIsPlaying(false);
    const reset = () => { setList([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setOperation(''); setNodeIdCounter(1); };

    const currentState = stepHistory[currentStep] || { list, newNode: null, highlightNodeId: -1, traverseIndex: -1, operation: '', value: null, error: false, explanation: 'Use Insert, Delete, Search, or Access to begin visualization.', phase: '' };

    const getNodeColor = (nodeId) => {
        if (currentState.error && currentState.highlightNodeId === nodeId) return 'bg-red-500/80 border-red-400 text-white';
        if (currentState.highlightNodeId === nodeId) {
            if (currentState.phase === 'identify' || currentState.phase === 'searching' || currentState.phase === 'traverse')
                return 'bg-yellow-400 border-yellow-300 text-slate-900 animate-pulse';
            if (currentState.phase === 'complete' || currentState.phase === 'found')
                return 'bg-green-400 border-green-300 text-slate-900 animate-pulse';
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

class LinkedList:
    def __init__(self):
        self.head = None
        self.size = 0

    def insert(self, index, value):
        if index < 0 or index > self.size:
            raise IndexError("Index out of bounds")
        new_node = Node(value)
        if index == 0:                      # O(1) head insert
            new_node.next = self.head
            self.head = new_node
        else:                               # O(n) traverse then link
            current = self.head
            for _ in range(index - 1):
                current = current.next
            new_node.next = current.next
            current.next = new_node
        self.size += 1

    def delete(self, index):
        if index < 0 or index >= self.size:
            raise IndexError("Index out of bounds")
        if index == 0:
            value = self.head.value
            self.head = self.head.next
        else:
            current = self.head
            for _ in range(index - 1):
                current = current.next
            value = current.next.value
            current.next = current.next.next
        self.size -= 1
        return value

    def search(self, value):                # O(n) linear scan
        current, index = self.head, 0
        while current:
            if current.value == value:
                return index
            current, index = current.next, index + 1
        return -1

    def access(self, index):               # O(n) traversal
        current = self.head
        for _ in range(index):
            current = current.next
        return current.value`;

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
                            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> Intermediate
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">List: Linked List</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Watch nodes link and unlink as you traverse, insert, and delete. Understand pointers and sequential access.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Link2 className="h-4 w-4" /> Pointer Visualization</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Clock className="h-4 w-4" /> O(n) Access</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Linked List Visualization</h2>
                        <p className="text-slate-400 text-sm mb-5">Each node contains a value and a <span className="text-blue-400 font-medium">next pointer</span>. The last node points to NULL.</p>

                        {/* Color Legend */}
                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/70 border border-blue-400"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Traversing / Target</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Found / Completed</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400/20 border border-yellow-400"></span><span className="text-slate-300">New node pending</span></span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mb-6 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Value to insert"
                                    className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                <input type="number" value={indexValue} onChange={(e) => setIndexValue(e.target.value)}
                                    placeholder="Index (optional)"
                                    className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handleInsert} disabled={isPlaying} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Plus className="h-4 w-4" /> Insert
                                </button>
                                <button onClick={handleDelete} disabled={isPlaying} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Minus className="h-4 w-4" /> Delete
                                </button>
                                <button onClick={handleAccess} disabled={isPlaying} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md transition-colors font-medium">
                                    Access
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="Search for value…"
                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                                <button onClick={handleSearch} disabled={isPlaying} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-40 transition-colors font-medium">
                                    <Search className="h-4 w-4" /> Search
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
                                <div className="flex items-center gap-2 ml-auto">
                                    <label className="text-sm font-medium text-slate-300">Speed:</label>
                                    <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                                        className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value={2000}>Slow</option>
                                        <option value={1000}>Normal</option>
                                        <option value={500}>Fast</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Linked List Visualization */}
                        <div className="mb-5">
                            {/* Head pointer */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`border-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide ${currentState.list.length > 0 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                                    HEAD
                                </div>
                                {currentState.list.length > 0 && <ArrowRight className="h-4 w-4 text-indigo-400" />}
                            </div>

                            {/* New node being created */}
                            {currentState.newNode && (
                                <div className="flex justify-center mb-3 animate-bounce">
                                    <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-3 flex items-center gap-3">
                                        <div className="text-center">
                                            <div className="text-xs text-yellow-400/70 mb-0.5">New Node {currentState.newNode.id}</div>
                                            <div className="font-bold text-yellow-300 text-lg">{currentState.newNode.value}</div>
                                        </div>
                                        <div className="text-xs text-slate-400 border-l border-slate-600 pl-3">
                                            next → {currentState.newNode.next ? `#${currentState.newNode.next}` : 'NULL'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Nodes */}
                            <div className="min-h-20 overflow-x-auto">
                                {currentState.list.length === 0 ? (
                                    <div className="w-full h-20 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                                        List is empty — insert to begin
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-1 py-2">
                                        {currentState.list.map((node, index) => (
                                            <div key={node.id} className="flex items-center flex-shrink-0">
                                                <div className={`flex flex-col rounded-xl border-2 p-2.5 transition-all duration-300 min-w-20 ${getNodeColor(node.id)}`}>
                                                    <div className="text-xs opacity-70 mb-0.5 font-mono">[{index}] #{node.id}</div>
                                                    <div className="font-bold text-xl">{node.value}</div>
                                                    <div className="text-xs opacity-60 mt-0.5">→ {node.next ? `#${node.next}` : 'NULL'}</div>
                                                </div>
                                                {index < currentState.list.length - 1 && (
                                                    <ArrowRight className="h-4 w-4 text-slate-500 mx-1 flex-shrink-0" />
                                                )}
                                                {index === currentState.list.length - 1 && (
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

                            {/* Current traversal position indicator */}
                            {currentState.traverseIndex >= 0 && currentState.list.length > 0 && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                                    <span className="text-yellow-400">▲</span>
                                    <span>Current position: index {currentState.traverseIndex}</span>
                                </div>
                            )}

                            <div className="text-center mt-4 flex justify-center gap-4">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-blue-400">{currentState.list.length}</div>
                                    <div className="text-xs text-slate-500">Size</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-sm font-bold text-indigo-400">{currentState.list.length > 0 ? `Node ${currentState.list[0].id}` : 'NULL'}</div>
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
                        {/* Complexity */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Complexity Analysis</h2>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    ['O(n)', 'Access', 'orange'],
                                    ['O(n)', 'Insert/Delete', 'orange'],
                                    ['O(n)', 'Search', 'orange'],
                                    ['O(1)*', 'Head Insert', 'green'],
                                ].map(([c, op, color]) => (
                                    <div key={op} className={`text-center rounded-lg py-3 border ${color === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                        <div className={`text-xl font-bold ${color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">Dynamic allocation + pointer per node</div>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-2">*Operations at head are O(1); others require traversal to position.</p>
                        </div>

                        {/* Operations */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Operations</h2>
                            <div className="space-y-3">
                                {[
                                    ['border-blue-500', 'text-blue-400', 'Insert', 'Create node → traverse to position → update pointers'],
                                    ['border-red-500', 'text-red-400', 'Delete', 'Traverse → update prev.next to skip deleted node'],
                                    ['border-emerald-500', 'text-emerald-400', 'Access', 'Follow next pointers from head to target index'],
                                    ['border-purple-500', 'text-purple-400', 'Search', 'Linear traversal comparing values at each node'],
                                ].map(([border, textColor, op, desc]) => (
                                    <div key={op} className={`border-l-4 ${border} pl-4 py-1`}>
                                        <h3 className={`font-semibold ${textColor} text-sm`}>{op}</h3>
                                        <p className="text-slate-400 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Array vs Linked List */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">vs Dynamic Array</h2>
                            <div className="space-y-2">
                                {[
                                    { Icon: CheckCircle, text: 'O(1) head insert/delete', desc: 'No shifting — just update a pointer', good: true },
                                    { Icon: ShieldCheck, text: 'Unlimited dynamic size', desc: 'Grows/shrinks without reallocation', good: true },
                                    { Icon: Server, text: 'No wasted capacity', desc: 'Allocates exactly what is needed', good: true },
                                    { Icon: AlertTriangle, text: 'O(n) access by index', desc: 'No direct calculation — must traverse', good: false },
                                    { Icon: AlertTriangle, text: 'Poor cache locality', desc: 'Nodes scattered across memory', good: false },
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
