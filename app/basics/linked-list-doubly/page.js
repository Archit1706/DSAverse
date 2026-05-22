'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, ArrowRight, Plus, Minus, Search, Brain, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the time complexity of deleting a node when you already have a direct pointer to it in a doubly linked list?",
        options: ["O(n) — must traverse to find predecessor", "O(1) — update prev.next and next.prev directly", "O(log n) — skip-list traversal", "O(n²) — nested pointer scan"],
        correct: 1,
        explanation: "With a pointer to the node, both prev and next are directly accessible. Set prev.next = node.next and node.next.prev = node.prev — no traversal needed, O(1)."
    },
    {
        question: "How many pointer assignments are needed when inserting a node between two existing nodes?",
        options: ["1", "2", "4", "6"],
        correct: 2,
        explanation: "Inserting X between A and B: X.prev = A, X.next = B, A.next = X, B.prev = X — exactly 4 pointer assignments regardless of list size."
    },
    {
        question: "Which operation is O(1) in a doubly linked list but O(n) in a singly linked list (with head pointer only)?",
        options: ["Search by value", "Insert at head", "Delete the tail node", "Forward traversal"],
        correct: 2,
        explanation: "Singly LL needs to traverse to find the second-to-last node for tail deletion (O(n)). Doubly LL: tail.prev gives the predecessor directly — O(1)."
    }
];

const codeExample = `class Node:
    def __init__(self, value):
        self.value = value
        self.prev = None
        self.next = None

class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def insert_head(self, value):        # O(1)
        node = Node(value)
        if not self.head:
            self.head = self.tail = node
        else:
            node.next = self.head
            self.head.prev = node
            self.head = node
        self.size += 1

    def insert_tail(self, value):        # O(1)
        node = Node(value)
        if not self.tail:
            self.head = self.tail = node
        else:
            self.tail.next = node
            node.prev = self.tail
            self.tail = node
        self.size += 1

    def insert_at(self, index, value):   # O(n) traverse
        if index == 0:
            self.insert_head(value); return
        if index == self.size:
            self.insert_tail(value); return
        node = Node(value)
        cur = self.head
        for _ in range(index - 1):
            cur = cur.next
        node.prev, node.next = cur, cur.next  # 4 pointer updates
        cur.next.prev = node
        cur.next = node
        self.size += 1

    def delete(self, index):             # O(n) traverse, O(1) unlink
        cur = self.head
        for _ in range(index):
            cur = cur.next
        if cur.prev: cur.prev.next = cur.next
        else:        self.head = cur.next
        if cur.next: cur.next.prev = cur.prev
        else:        self.tail = cur.prev
        self.size -= 1
        return cur.value

    def traverse_backward(self):         # O(n)
        cur = self.tail
        while cur:
            yield cur.value
            cur = cur.prev`;

export default function DoublyLinkedListPage() {
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

    const generateSteps = (op, value, idx) => {
        const steps = [];
        const L = snap(list);
        const newId = nodeIdCounter;

        const push = (hl, ti, explanation, phase, err = false, newNode = null) =>
            steps.push({ list: snap(L), highlightNodeId: hl, traverseIndex: ti, newNode, explanation, phase, error: err });

        if (op === 'insertHead') {
            push(-1, -1, `Creating node #${newId} with value ${value}.`, 'create', false,
                { id: newId, value, prevId: null, nextId: L[0]?.id ?? null });
            if (L.length === 0) {
                L.push({ id: newId, value, prevId: null, nextId: null });
                push(newId, 0, `List was empty. Node ${value} is now both HEAD and TAIL.`, 'complete');
            } else {
                const old = L[0];
                L.unshift({ id: newId, value, prevId: null, nextId: old.id });
                L[1].prevId = newId;
                push(newId, 0, `new.next = old HEAD (#${old.id}), old HEAD.prev = new #${newId}. HEAD pointer updated. O(1).`, 'complete');
            }
        } else if (op === 'insertTail') {
            push(-1, -1, `Creating node #${newId} with value ${value}.`, 'create', false,
                { id: newId, value, prevId: L[L.length - 1]?.id ?? null, nextId: null });
            if (L.length === 0) {
                L.push({ id: newId, value, prevId: null, nextId: null });
                push(newId, 0, `List was empty. Node ${value} is now both HEAD and TAIL.`, 'complete');
            } else {
                const old = L[L.length - 1];
                L.push({ id: newId, value, prevId: old.id, nextId: null });
                L[L.length - 2].nextId = newId;
                push(newId, L.length - 1, `old TAIL.next = new #${newId}, new.prev = old TAIL (#${old.id}). TAIL pointer updated. O(1).`, 'complete');
            }
        } else if (op === 'insertAt') {
            if (idx < 0 || idx > L.length) {
                push(-1, -1, `Invalid index ${idx}. Must be 0–${L.length}.`, 'error', true);
                return steps;
            }
            push(-1, -1, `Creating node #${newId} with value ${value} for index ${idx}.`, 'create', false, { id: newId, value });
            if (idx === 0) {
                if (L.length === 0) {
                    L.push({ id: newId, value, prevId: null, nextId: null });
                    push(newId, 0, `Inserted ${value} at index 0 (empty list). Node is HEAD and TAIL.`, 'complete');
                } else {
                    const old = L[0];
                    L.unshift({ id: newId, value, prevId: null, nextId: old.id });
                    L[1].prevId = newId;
                    push(newId, 0, `Inserted ${value} at HEAD. 2 pointer updates. O(1).`, 'complete');
                }
            } else if (idx === L.length) {
                if (L.length === 0) {
                    L.push({ id: newId, value, prevId: null, nextId: null });
                    push(newId, 0, `Inserted ${value} at index 0 (empty list).`, 'complete');
                } else {
                    const old = L[L.length - 1];
                    L.push({ id: newId, value, prevId: old.id, nextId: null });
                    L[L.length - 2].nextId = newId;
                    push(newId, L.length - 1, `Inserted ${value} at TAIL. 2 pointer updates. O(1).`, 'complete');
                }
            } else {
                for (let i = 0; i < idx - 1; i++) {
                    push(L[i].id, i, `Traversing to position ${idx}. At index ${i} — ${idx - 1 - i} more step${idx - 1 - i !== 1 ? 's' : ''}.`, 'traverse');
                }
                const prevN = L[idx - 1];
                const nextN = L[idx];
                L.splice(idx, 0, { id: newId, value, prevId: prevN.id, nextId: nextN.id });
                L[idx - 1].nextId = newId;
                L[idx + 1].prevId = newId;
                push(newId, idx, `Inserted ${value} at index ${idx}. 4 pointer updates: prev→new, new→next, new←next, prev←new.`, 'complete');
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
            if (di > 0) L[di - 1].nextId = target.nextId;
            if (di < L.length - 1) L[di + 1].prevId = target.prevId;
            L.splice(di, 1);
            push(-1, -1, `Deleted ${target.value}. prev.next and next.prev updated. Size: ${L.length}`, 'complete');
        } else if (op === 'search') {
            push(-1, -1, `Searching for ${value} from HEAD.`, 'start');
            for (let i = 0; i < L.length; i++) {
                if (L[i].value === value) {
                    push(L[i].id, i, `Found ${value} at index ${i}! Took ${i + 1} step(s). O(n) traversal.`, 'found');
                    return steps;
                }
                push(L[i].id, i, `Index ${i}: ${L[i].value} ≠ ${value}. Follow next pointer.`, 'searching');
            }
            push(-1, -1, `${value} not found after traversing all ${L.length} nodes.`, 'not_found', true);
        } else if (op === 'traverseBack') {
            if (L.length === 0) {
                push(-1, -1, `List is empty.`, 'error', true);
                return steps;
            }
            push(-1, -1, `Starting backward traversal from TAIL (index ${L.length - 1}).`, 'start');
            for (let i = L.length - 1; i >= 0; i--) {
                push(L[i].id, i, `Backward step ${L.length - i}/${L.length}: index ${i} = ${L[i].value}. Following .prev pointer.`, 'traverse');
            }
            push(-1, -1, `Backward traversal complete! Visited all ${L.length} nodes via .prev pointers.`, 'complete');
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
        explanation: 'Insert at head/tail/index, delete, search, or traverse backward to begin.',
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Doubly Linked List</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Each node stores both a <span className="font-semibold text-purple-200">prev</span> and a <span className="font-semibold text-blue-200">next</span> pointer. Traverse in either direction and delete any node in O(1) given a pointer to it.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4" /><ArrowRight className="h-4 w-4" /> Bidirectional Traversal</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><RefreshCcw className="h-4 w-4" /> O(1) Tail Delete</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-1">Doubly Linked List</h2>
                        <p className="text-slate-400 text-sm mb-5">
                            Each node has a <span className="text-purple-400 font-medium">← prev</span> and a <span className="text-blue-400 font-medium">next →</span> pointer.
                            HEAD.prev = NULL, TAIL.next = NULL.
                        </p>

                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600/50 border border-blue-500"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Traversing</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400"></span><span className="text-slate-300">Target found</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Complete</span></span>
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
                                <button onClick={() => runOp('traverseBack')} disabled={isPlaying}
                                    className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-40 transition-colors text-sm font-medium">
                                    <ArrowLeft className="h-4 w-4" /> Traverse Backward
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

                        {/* List Visualization */}
                        <div className="mb-5">
                            {currentState.list.length > 0 && (
                                <div className="flex justify-between mb-1 px-1">
                                    <span className="text-indigo-400 text-xs font-bold">HEAD</span>
                                    {currentState.list.length > 1 && <span className="text-purple-400 text-xs font-bold">TAIL</span>}
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
                                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">NULL</span>
                                        <ArrowLeft className="h-3 w-3 text-purple-400 flex-shrink-0" />
                                        {currentState.list.map((node, i) => (
                                            <div key={node.id} className="flex items-center gap-0.5 flex-shrink-0">
                                                {i > 0 && <ArrowLeft className="h-3 w-3 text-purple-400" />}
                                                <div className={`flex flex-col rounded-xl border-2 p-1.5 min-w-[52px] text-center transition-all duration-300 ${getNodeColor(node.id)}`}>
                                                    <div className="text-[9px] opacity-70 font-mono leading-tight">←{node.prevId ?? 'NUL'}</div>
                                                    <div className="font-bold text-base leading-tight">{node.value}</div>
                                                    <div className="text-[9px] opacity-70 font-mono leading-tight">{node.nextId ?? 'NUL'}→</div>
                                                </div>
                                                {i < currentState.list.length - 1 && <ArrowRight className="h-3 w-3 text-blue-400" />}
                                            </div>
                                        ))}
                                        <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">NULL</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex justify-center gap-4">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-center">
                                    <div className="text-lg font-bold text-blue-400">{currentState.list.length}</div>
                                    <div className="text-xs text-slate-500">Size</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-center">
                                    <div className="text-sm font-bold text-indigo-400">{currentState.list[0]?.value ?? '–'}</div>
                                    <div className="text-xs text-slate-500">HEAD</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-center">
                                    <div className="text-sm font-bold text-purple-400">{currentState.list[currentState.list.length - 1]?.value ?? '–'}</div>
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
                                    ['O(1)*', 'Delete (with ptr)', 'green'],
                                    ['O(n)', 'Search by Value', 'orange'],
                                ].map(([c, op, color]) => (
                                    <div key={op} className={`text-center rounded-lg py-3 border ${color === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                        <div className={`text-xl font-bold ${color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">n nodes × (value + prev ptr + next ptr)</div>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-2">*O(1) delete requires a pointer to the node; traversal to find it is O(n).</p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Key Properties</h2>
                            <div className="space-y-3">
                                {[
                                    ['border-purple-500', 'text-purple-400', '.prev pointer', 'Each node knows its predecessor — enables backward traversal and O(1) tail delete'],
                                    ['border-blue-500', 'text-blue-400', '.next pointer', 'Each node knows its successor — standard forward traversal'],
                                    ['border-indigo-500', 'text-indigo-400', 'HEAD + TAIL', 'Two sentinel pointers — O(1) access and insert at both ends'],
                                    ['border-yellow-500', 'text-yellow-400', '4 ptr updates', 'Each insert in the middle touches prev and next of both neighbors'],
                                ].map(([border, tc, term, desc]) => (
                                    <div key={term} className={`border-l-4 ${border} pl-4 py-1`}>
                                        <div className={`font-mono font-semibold text-sm ${tc}`}>{term}</div>
                                        <div className="text-slate-400 text-sm">{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">vs Singly Linked List</h2>
                            <div className="space-y-2">
                                {[
                                    { text: 'Backward traversal in O(n)', desc: 'Singly requires rebuilding a reversed copy or recursion', good: true },
                                    { text: 'O(1) tail deletion', desc: 'Singly needs O(n) to find the node before tail', good: true },
                                    { text: 'O(1) delete with known pointer', desc: 'Singly still needs to traverse to predecessor', good: true },
                                    { text: 'Extra memory per node', desc: 'One additional pointer field — doubles pointer overhead', good: false },
                                    { text: 'More pointer updates per op', desc: '4 updates for middle insert vs 2 for singly', good: false },
                                ].map(({ text, desc, good }) => (
                                    <div key={text} className={`flex items-start gap-3 rounded-lg p-3 ${good ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                        {good
                                            ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                                            : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-400" />}
                                        <div>
                                            <div className={`font-medium text-sm ${good ? 'text-green-400' : 'text-yellow-400'}`}>{text}</div>
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
