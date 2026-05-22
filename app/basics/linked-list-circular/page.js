'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, ArrowRight, Plus, Minus, Search, Brain, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, RefreshCcw, RotateCw } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "In a circular linked list, how do you detect that a traversal has visited all nodes?",
        options: ["Check for NULL — the last node's next is NULL", "Stop when next == head — you've looped around", "Count nodes and stop at size", "The traversal never needs to stop"],
        correct: 1,
        explanation: "Circular lists have no NULL — the last node's next points back to head. Traversal ends when you detect next == head (or the current node == head on the second visit)."
    },
    {
        question: "What data structure models a circular singly linked list well in practice?",
        options: ["A hash table for fast lookup", "A round-robin CPU scheduler or circular buffer", "A binary heap for priority", "A stack for LIFO access"],
        correct: 1,
        explanation: "Round-robin schedulers cycle through processes indefinitely — the circular structure means after the last process, you naturally return to the first, no special case needed."
    },
    {
        question: "How many pointer updates are needed when inserting a node at the tail of a circular singly linked list?",
        options: ["1 — just set old tail.next = new node", "2 — old tail.next = new, new.next = head", "3 — update head, tail, and new node", "4 — both directions like doubly"],
        correct: 1,
        explanation: "New tail insertion: old_tail.next = new_node, new_node.next = head. Two pointer updates maintain the circular invariant."
    }
];

const codeExample = `class Node:
    def __init__(self, value):
        self.value = value
        self.next = None

class CircularLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def insert_head(self, value):        # O(1)
        node = Node(value)
        if not self.head:
            node.next = node             # self-loop
            self.head = self.tail = node
        else:
            node.next = self.head
            self.tail.next = node        # tail still points to new head
            self.head = node
        self.size += 1

    def insert_tail(self, value):        # O(1)
        node = Node(value)
        if not self.head:
            node.next = node
            self.head = self.tail = node
        else:
            node.next = self.head        # new tail wraps to head
            self.tail.next = node
            self.tail = node
        self.size += 1

    def delete_head(self):               # O(1)
        if not self.head:
            raise IndexError("Empty list")
        val = self.head.value
        if self.head == self.tail:
            self.head = self.tail = None
        else:
            self.head = self.head.next
            self.tail.next = self.head   # tail now points to new head
        self.size -= 1
        return val

    def traverse(self):                  # O(n) — stop at head
        if not self.head:
            return
        cur = self.head
        while True:
            yield cur.value
            cur = cur.next
            if cur == self.head:
                break

    def search(self, value):             # O(n)
        if not self.head:
            return -1
        cur, idx = self.head, 0
        while True:
            if cur.value == value:
                return idx
            cur, idx = cur.next, idx + 1
            if cur == self.head:
                return -1`;

export default function CircularLinkedListPage() {
    const [list, setList] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [indexValue, setIndexValue] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
            const last = stepHistory[stepHistory.length - 1];
            if (!last.error) setList(last.list);
            return;
        }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const snap = (arr) => arr.map(n => ({ ...n }));

    // In the step list, node.nextId for the last element = first element's id (circular)
    const getCircularNextId = (L, i) => (L.length > 0 && i === L.length - 1) ? L[0].id : (L[i + 1]?.id ?? null);

    const generateSteps = (op, value, idx) => {
        const steps = [];
        const L = snap(list);
        const newId = nodeIdCounter;

        const push = (hl, ti, explanation, phase, err = false, newNode = null) =>
            steps.push({ list: snap(L), highlightNodeId: hl, traverseIndex: ti, newNode, explanation, phase, error: err });

        if (op === 'insertHead') {
            push(-1, -1, `Creating node #${newId} with value ${value}.`, 'create', false, { id: newId, value });
            if (L.length === 0) {
                L.push({ id: newId, value });
                push(newId, 0, `List was empty. Node ${value} points to itself — a circle of one.`, 'complete');
            } else {
                const oldHeadId = L[0].id;
                L.unshift({ id: newId, value });
                push(newId, 0, `new.next = old HEAD (#${oldHeadId}), old TAIL.next updated to new HEAD #${newId}. Circle maintained. O(1).`, 'complete');
            }
        } else if (op === 'insertTail') {
            push(-1, -1, `Creating node #${newId} with value ${value}.`, 'create', false, { id: newId, value });
            if (L.length === 0) {
                L.push({ id: newId, value });
                push(newId, 0, `List was empty. Node ${value} points to itself — a circle of one.`, 'complete');
            } else {
                const oldTailId = L[L.length - 1].id;
                L.push({ id: newId, value });
                push(newId, L.length - 1, `new.next = HEAD (#${L[0].id}), old TAIL (#${oldTailId}).next = new. TAIL updated. O(1).`, 'complete');
            }
        } else if (op === 'insertAt') {
            if (idx < 0 || idx > L.length) {
                push(-1, -1, `Invalid index ${idx}. Must be 0–${L.length}.`, 'error', true);
                return steps;
            }
            if (idx === 0) {
                push(-1, -1, `Creating node #${newId} at HEAD.`, 'create', false, { id: newId, value });
                if (L.length === 0) {
                    L.push({ id: newId, value });
                    push(newId, 0, `List was empty. Node ${value} points to itself.`, 'complete');
                } else {
                    L.unshift({ id: newId, value });
                    push(newId, 0, `Inserted ${value} at HEAD. Tail.next updated to maintain circle. O(1).`, 'complete');
                }
            } else if (idx === L.length) {
                push(-1, -1, `Creating node #${newId} at TAIL.`, 'create', false, { id: newId, value });
                L.push({ id: newId, value });
                push(newId, L.length - 1, `Inserted ${value} at TAIL. new.next = HEAD. Circle maintained. O(1).`, 'complete');
            } else {
                push(-1, -1, `Creating node #${newId} with value ${value} for index ${idx}.`, 'create', false, { id: newId, value });
                for (let i = 0; i < idx - 1; i++) {
                    push(L[i].id, i, `Traversing to position ${idx}. At index ${i} — ${idx - 1 - i} more step${idx - 1 - i !== 1 ? 's' : ''}.`, 'traverse');
                }
                L.splice(idx, 0, { id: newId, value });
                push(newId, idx, `Inserted ${value} at index ${idx}. prev.next = new, new.next = next. Circle intact.`, 'complete');
            }
        } else if (op === 'delete') {
            if (L.length === 0) {
                push(-1, -1, `List is empty — nothing to delete.`, 'error', true);
                return steps;
            }
            const di = idx !== null ? idx : L.length - 1;
            if (di < 0 || di >= L.length) {
                push(-1, -1, `Invalid index ${di}. Must be 0–${L.length - 1}.`, 'error', true);
                return steps;
            }
            for (let i = 0; i < di; i++) {
                push(L[i].id, i, `Traversing to index ${di}. At index ${i}.`, 'traverse');
            }
            const target = L[di];
            push(target.id, di, `Found node to delete: ${target.value} (#${target.id}) at index ${di}.`, 'identify');
            L.splice(di, 1);
            if (L.length === 0) {
                push(-1, -1, `Deleted ${target.value}. List is now empty.`, 'complete');
            } else if (di === 0) {
                push(L[0].id, 0, `Deleted HEAD (${target.value}). New HEAD is #${L[0].id}. TAIL.next updated to new HEAD.`, 'complete');
            } else {
                push(-1, -1, `Deleted ${target.value}. Predecessor.next updated. Circle maintained. Size: ${L.length}`, 'complete');
            }
        } else if (op === 'search') {
            push(-1, -1, `Searching for ${value} from HEAD. Will loop back to HEAD if not found.`, 'start');
            for (let i = 0; i < L.length; i++) {
                if (L[i].value === value) {
                    push(L[i].id, i, `Found ${value} at index ${i}! Took ${i + 1} step(s). Detected before completing the circle.`, 'found');
                    return steps;
                }
                push(L[i].id, i, `Index ${i}: ${L[i].value} ≠ ${value}. Follow next pointer ${i === L.length - 1 ? '(wraps to HEAD)' : ''}.`, 'searching');
            }
            push(-1, -1, `${value} not found — looped back to HEAD after ${L.length} nodes.`, 'not_found', true);
        } else if (op === 'traverse') {
            if (L.length === 0) {
                push(-1, -1, `List is empty.`, 'error', true);
                return steps;
            }
            push(-1, -1, `Starting traversal from HEAD. Will stop when next == HEAD.`, 'start');
            for (let i = 0; i < L.length; i++) {
                const isLast = i === L.length - 1;
                push(L[i].id, i, `Step ${i + 1}/${L.length}: visiting index ${i} = ${L[i].value}.${isLast ? ' next → HEAD (circular).' : ''}`, 'traverse');
            }
            push(-1, -1, `Traversal complete! Visited all ${L.length} nodes. Detected end when next == HEAD.`, 'complete');
        }

        return steps;
    };

    const runOp = (op, value = null, idx = null) => {
        const steps = generateSteps(op, value, idx);
        if (!steps.length) return;
        setStepHistory(steps);
        setCurrentStep(0);
        if (['insertHead', 'insertTail', 'insertAt'].includes(op)) setNodeIdCounter(p => p + 1);
    };

    const handleInsertHead = () => { if (!inputValue || isNaN(inputValue)) return; runOp('insertHead', parseInt(inputValue)); setInputValue(''); };
    const handleInsertTail = () => { if (!inputValue || isNaN(inputValue)) return; runOp('insertTail', parseInt(inputValue)); setInputValue(''); };
    const handleInsertAt = () => {
        if (!inputValue || isNaN(inputValue) || indexValue === '' || isNaN(indexValue)) return;
        runOp('insertAt', parseInt(inputValue), parseInt(indexValue));
        setInputValue(''); setIndexValue('');
    };
    const handleDelete = () => { runOp('delete', null, indexValue === '' ? null : parseInt(indexValue)); setIndexValue(''); };
    const handleSearch = () => { if (!searchValue || isNaN(searchValue)) return; runOp('search', parseInt(searchValue)); setSearchValue(''); };

    const stepForward = () => {
        if (currentStep < stepHistory.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            if (next === stepHistory.length - 1) {
                const last = stepHistory[next];
                if (!last.error) setList(last.list);
            }
        }
    };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };
    const reset = () => { setList([]); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setNodeIdCounter(1); };

    const currentState = stepHistory[currentStep] || {
        list, highlightNodeId: -1, traverseIndex: -1, newNode: null,
        explanation: 'Insert, delete, search, or traverse to see the circular connection in action.',
        phase: '', error: false
    };

    const getNodeColor = (nodeId) => {
        if (currentState.highlightNodeId !== nodeId) return 'bg-blue-600/50 border-blue-500 text-white';
        switch (currentState.phase) {
            case 'traverse': case 'searching': return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
            case 'identify': return 'bg-orange-400 border-orange-300 text-slate-900 scale-110';
            case 'found': case 'complete': return 'bg-green-400 border-green-300 text-slate-900 scale-110';
            default: return 'bg-blue-400 border-blue-300 text-white scale-110';
        }
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct });
    };
    const nextQuestion = () => { setCurrentQuestion(p => (p + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };
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
                            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> Intermediate
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Circular Linked List</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            The tail node&apos;s <span className="font-semibold text-orange-200">next</span> pointer loops back to <span className="font-semibold text-blue-200">HEAD</span> — no NULL terminator. Perfect for round-robin schedulers and circular buffers.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><RotateCw className="h-4 w-4" /> No NULL Terminator</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><RefreshCcw className="h-4 w-4" /> Circular Invariant</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-1">Circular Linked List</h2>
                        <p className="text-slate-400 text-sm mb-5">
                            Every node has a <span className="text-blue-400 font-medium">next</span> pointer.
                            The <span className="text-orange-400 font-medium">tail wraps back to HEAD</span> — no NULL at the end.
                        </p>

                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600/50 border border-blue-500"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Traversing</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400"></span><span className="text-slate-300">Target found</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Complete</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500/40 border border-orange-500"></span><span className="text-slate-300">Circular link</span></span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mb-6 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={inputValue} onChange={e => setInputValue(e.target.value)}
                                    placeholder="Value"
                                    className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <input type="number" value={indexValue} onChange={e => setIndexValue(e.target.value)}
                                    placeholder="Index (for At / Delete)"
                                    className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handleInsertHead} disabled={isPlaying}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md flex items-center gap-1 disabled:opacity-40 transition-colors text-sm font-medium">
                                    <Plus className="h-3.5 w-3.5" /> Head
                                </button>
                                <button onClick={handleInsertTail} disabled={isPlaying}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md flex items-center gap-1 disabled:opacity-40 transition-colors text-sm font-medium">
                                    <Plus className="h-3.5 w-3.5" /> Tail
                                </button>
                                <button onClick={handleInsertAt} disabled={isPlaying}
                                    className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-md flex items-center gap-1 disabled:opacity-40 transition-colors text-sm font-medium">
                                    <Plus className="h-3.5 w-3.5" /> At Index
                                </button>
                                <button onClick={handleDelete} disabled={isPlaying}
                                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-md flex items-center gap-1 disabled:opacity-40 transition-colors text-sm font-medium">
                                    <Minus className="h-3.5 w-3.5" /> Delete
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={searchValue} onChange={e => setSearchValue(e.target.value)}
                                    placeholder="Search for value…"
                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                <button onClick={handleSearch} disabled={isPlaying}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-40 transition-colors font-medium">
                                    <Search className="h-4 w-4" /> Search
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => runOp('traverse')} disabled={isPlaying}
                                    className="bg-teal-700 hover:bg-teal-600 text-white px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-40 transition-colors text-sm font-medium">
                                    <RotateCw className="h-4 w-4" /> Traverse
                                </button>
                                <button onClick={isPlaying ? () => setIsPlaying(false) : () => setIsPlaying(true)} disabled={stepHistory.length === 0}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-40 transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={reset}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md flex items-center gap-1.5 transition-colors text-sm">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <label className="text-sm text-slate-300">Speed:</label>
                                    <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
                                        className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value={2000}>Slow</option>
                                        <option value={1000}>Normal</option>
                                        <option value={500}>Fast</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Visualization */}
                        <div className="mb-5">
                            {currentState.list.length > 0 && (
                                <div className="flex justify-between mb-1 px-1">
                                    <span className="text-indigo-400 text-xs font-bold">HEAD</span>
                                    {currentState.list.length > 1 && <span className="text-orange-400 text-xs font-bold">TAIL</span>}
                                </div>
                            )}

                            {currentState.newNode && (
                                <div className="flex justify-center mb-3">
                                    <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-3 text-center animate-bounce">
                                        <div className="text-xs text-yellow-400/70 mb-0.5">New Node #{currentState.newNode.id}</div>
                                        <div className="font-bold text-yellow-300 text-lg">{currentState.newNode.value}</div>
                                    </div>
                                </div>
                            )}

                            <div className="min-h-20 overflow-x-auto">
                                {currentState.list.length === 0 ? (
                                    <div className="w-full h-20 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                                        List is empty — insert to begin
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-0.5 py-2 flex-wrap">
                                        {currentState.list.map((node, i) => (
                                            <div key={node.id} className="flex items-center gap-0.5 flex-shrink-0">
                                                <div className={`flex flex-col rounded-xl border-2 p-1.5 min-w-[52px] text-center transition-all duration-300 ${getNodeColor(node.id)}`}>
                                                    <div className="text-[9px] opacity-70 font-mono leading-tight">#{node.id}</div>
                                                    <div className="font-bold text-base leading-tight">{node.value}</div>
                                                    <div className="text-[9px] opacity-70 font-mono leading-tight">[{i}]</div>
                                                </div>
                                                {i < currentState.list.length - 1
                                                    ? <ArrowRight className="h-3 w-3 text-blue-400" />
                                                    : (
                                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                                            <ArrowRight className="h-3 w-3 text-orange-400" />
                                                            <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/50 rounded-lg px-2 py-1">
                                                                <RotateCw className="h-3 w-3 text-orange-400" />
                                                                <span className="text-[10px] text-orange-400 font-mono font-bold">HEAD</span>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Circular diagram note */}
                            {currentState.list.length > 0 && (
                                <div className="mt-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-orange-300 flex items-center gap-2">
                                    <RotateCw className="h-3.5 w-3.5 flex-shrink-0" />
                                    TAIL (#{ currentState.list[currentState.list.length - 1]?.id}) → HEAD (#{currentState.list[0]?.id}) — the circular link
                                </div>
                            )}

                            <div className="mt-3 flex justify-center gap-4">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-center">
                                    <div className="text-lg font-bold text-blue-400">{currentState.list.length}</div>
                                    <div className="text-xs text-slate-500">Size</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-center">
                                    <div className="text-sm font-bold text-indigo-400">{currentState.list[0]?.value ?? '–'}</div>
                                    <div className="text-xs text-slate-500">HEAD</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-center">
                                    <div className="text-sm font-bold text-orange-400">{currentState.list[currentState.list.length - 1]?.value ?? '–'}</div>
                                    <div className="text-xs text-slate-500">TAIL</div>
                                </div>
                            </div>
                        </div>

                        {/* Step explanation */}
                        <div className={`rounded-lg p-4 border ${currentState.error ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}>
                            <div className="flex items-start gap-2">
                                <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${currentState.error ? 'text-red-400' : 'text-blue-400'}`} />
                                <p className={`text-sm leading-relaxed ${currentState.error ? 'text-red-300' : 'text-blue-300'}`}>{currentState.explanation}</p>
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

                    {/* Info Panel */}
                    <div className="space-y-5">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Complexity</h2>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {[
                                    ['O(1)', 'Insert Head / Tail', 'green'],
                                    ['O(n)', 'Insert at Index', 'orange'],
                                    ['O(1)', 'Delete Head', 'green'],
                                    ['O(n)', 'Search / Delete Mid', 'orange'],
                                ].map(([c, op, color]) => (
                                    <div key={op} className={`text-center rounded-lg py-3 border ${color === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                        <div className={`text-xl font-bold ${color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">n nodes, each with value + one next pointer</div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Key Properties</h2>
                            <div className="space-y-3">
                                {[
                                    ['border-orange-500', 'text-orange-400', 'No NULL', 'tail.next = head — the list is a closed ring, no terminator'],
                                    ['border-blue-500', 'text-blue-400', 'Traversal guard', 'Stop when current == head (not when next == NULL)'],
                                    ['border-indigo-500', 'text-indigo-400', 'HEAD + TAIL', 'Two pointers give O(1) insert at both ends'],
                                    ['border-green-500', 'text-green-400', 'Natural cycling', 'After the last node, iteration continues from the start'],
                                ].map(([border, tc, term, desc]) => (
                                    <div key={term} className={`border-l-4 ${border} pl-4 py-1`}>
                                        <div className={`font-mono font-semibold text-sm ${tc}`}>{term}</div>
                                        <div className="text-slate-400 text-sm">{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Real-World Uses</h2>
                            <div className="space-y-2">
                                {[
                                    { text: 'Round-robin CPU scheduling', desc: 'Cycle through processes in order, wrapping around indefinitely', icon: RotateCw },
                                    { text: 'Circular buffer / ring buffer', desc: 'Fixed-size FIFO where writer and reader chase each other', icon: RefreshCcw },
                                    { text: 'Multiplayer game turns', desc: 'After the last player, the first player gets their turn again', icon: RotateCw },
                                    { text: 'Media playlists on loop', desc: 'After the last track, the playlist restarts from the first', icon: Play },
                                ].map(({ text, desc, icon: Icon }) => (
                                    <div key={text} className="flex items-start gap-3 rounded-lg p-3 bg-blue-500/10">
                                        <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" />
                                        <div>
                                            <div className="font-medium text-sm text-blue-300">{text}</div>
                                            <div className="text-slate-500 text-xs">{desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
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
                                        {quizState.correct ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
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

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Python Implementation</h2>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
