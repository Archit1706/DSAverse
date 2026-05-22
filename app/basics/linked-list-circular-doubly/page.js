'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, ArrowRight, Plus, Minus, Search, Brain, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, RefreshCcw, RotateCw } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "In a circular doubly linked list, what do head.prev and tail.next point to?",
        options: ["Both point to NULL", "head.prev = NULL, tail.next = NULL", "head.prev = tail, tail.next = head", "head.prev = head, tail.next = tail"],
        correct: 2,
        explanation: "In a circular doubly linked list, the ring is closed in both directions: head.prev = tail and tail.next = head. There are no NULL pointers in the list itself."
    },
    {
        question: "Which real-world data structure uses a circular doubly linked list internally?",
        options: ["Python dict (hash map)", "LRU cache and Linux kernel's list_head", "Java ArrayList", "Binary search tree"],
        correct: 1,
        explanation: "LRU caches use a circular doubly linked list for O(1) move-to-front. Linux kernel's list_head macro is also a circular doubly linked list used throughout the kernel."
    },
    {
        question: "What is the time complexity of inserting a node adjacent to any node for which you already have a pointer?",
        options: ["O(n) — traverse to find the position", "O(log n) — binary skip", "O(1) — update 4 pointers locally", "O(n²) — update all nodes"],
        correct: 2,
        explanation: "With a direct pointer to a node, inserting before or after it updates exactly 4 pointers (new.prev, new.next, neighbor.next, neighbor.prev) — O(1) regardless of list size."
    }
];

const codeExample = `class Node:
    def __init__(self, value):
        self.value = value
        self.prev = None
        self.next = None

class CircularDoublyLinkedList:
    def __init__(self):
        self.head = None
        self.size = 0

    @property
    def tail(self):
        return self.head.prev if self.head else None

    def insert_head(self, value):        # O(1)
        node = Node(value)
        if not self.head:
            node.prev = node.next = node  # self-loop
            self.head = node
        else:
            tail = self.head.prev
            node.next = self.head
            node.prev = tail
            self.head.prev = node        # 4 pointer updates
            tail.next = node
            self.head = node
        self.size += 1

    def insert_tail(self, value):        # O(1)
        node = Node(value)
        if not self.head:
            node.prev = node.next = node
            self.head = node
        else:
            tail = self.head.prev
            node.next = self.head
            node.prev = tail
            tail.next = node
            self.head.prev = node        # head.prev = new tail
        self.size += 1

    def delete(self, node):              # O(1) with pointer
        if self.size == 1:
            self.head = None
        else:
            node.prev.next = node.next
            node.next.prev = node.prev
            if node == self.head:
                self.head = node.next
        self.size -= 1

    def traverse_forward(self):          # O(n)
        if not self.head: return
        cur = self.head
        while True:
            yield cur.value
            cur = cur.next
            if cur == self.head: break

    def traverse_backward(self):         # O(n)
        if not self.head: return
        cur = self.head.prev             # start from tail
        while True:
            yield cur.value
            cur = cur.prev
            if cur == self.head.prev: break`;

export default function CircularDoublyLinkedListPage() {
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

        // In the display array, node.prevId = L[i-1].id (circular: L[0].prevId = L[last].id)
        // and node.nextId = L[i+1].id (circular: L[last].nextId = L[0].id)
        const headId = () => L[0]?.id;
        const tailId = () => L[L.length - 1]?.id;

        const push = (hl, ti, explanation, phase, err = false, newNode = null) =>
            steps.push({ list: snap(L), highlightNodeId: hl, traverseIndex: ti, newNode, explanation, phase, error: err });

        if (op === 'insertHead') {
            push(-1, -1, `Creating node #${newId} with value ${value}.`, 'create', false, { id: newId, value });
            if (L.length === 0) {
                L.push({ id: newId, value });
                push(newId, 0, `List was empty. Node ${value} has prev = self and next = self — a ring of one.`, 'complete');
            } else {
                const oldHeadId = L[0].id;
                const oldTailId = L[L.length - 1].id;
                L.unshift({ id: newId, value });
                push(newId, 0, `4 ptr updates: new.next = old HEAD (#${oldHeadId}), new.prev = TAIL (#${oldTailId}), old HEAD.prev = new, TAIL.next = new. O(1).`, 'complete');
            }
        } else if (op === 'insertTail') {
            push(-1, -1, `Creating node #${newId} with value ${value}.`, 'create', false, { id: newId, value });
            if (L.length === 0) {
                L.push({ id: newId, value });
                push(newId, 0, `List was empty. Node ${value} has prev = self and next = self.`, 'complete');
            } else {
                const oldHeadId = L[0].id;
                const oldTailId = L[L.length - 1].id;
                L.push({ id: newId, value });
                push(newId, L.length - 1, `4 ptr updates: new.next = HEAD (#${oldHeadId}), new.prev = old TAIL (#${oldTailId}), old TAIL.next = new, HEAD.prev = new. O(1).`, 'complete');
            }
        } else if (op === 'insertAt') {
            if (idx < 0 || idx > L.length) {
                push(-1, -1, `Invalid index ${idx}. Must be 0–${L.length}.`, 'error', true);
                return steps;
            }
            push(-1, -1, `Creating node #${newId} with value ${value} for index ${idx}.`, 'create', false, { id: newId, value });
            if (idx === 0) {
                if (L.length === 0) {
                    L.push({ id: newId, value });
                    push(newId, 0, `Inserted ${value}. Self-loop — ring of one.`, 'complete');
                } else {
                    L.unshift({ id: newId, value });
                    push(newId, 0, `Inserted ${value} at HEAD. 4 pointer updates. O(1).`, 'complete');
                }
            } else if (idx === L.length) {
                if (L.length === 0) {
                    L.push({ id: newId, value });
                    push(newId, 0, `Inserted ${value}. Self-loop — ring of one.`, 'complete');
                } else {
                    L.push({ id: newId, value });
                    push(newId, L.length - 1, `Inserted ${value} at TAIL. 4 pointer updates. O(1).`, 'complete');
                }
            } else {
                for (let i = 0; i < idx - 1; i++) {
                    push(L[i].id, i, `Traversing to position ${idx}. At index ${i} — ${idx - 1 - i} more step${idx - 1 - i !== 1 ? 's' : ''}.`, 'traverse');
                }
                L.splice(idx, 0, { id: newId, value });
                push(newId, idx, `Inserted ${value} at index ${idx}. 4 pointer updates maintain circular doubly structure.`, 'complete');
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
            } else {
                push(-1, -1, `Deleted ${target.value}. prev.next = next, next.prev = prev. Circle remains closed in both directions. Size: ${L.length}`, 'complete');
            }
        } else if (op === 'search') {
            push(-1, -1, `Searching for ${value} from HEAD. Circular — will stop when we loop back.`, 'start');
            for (let i = 0; i < L.length; i++) {
                if (L[i].value === value) {
                    push(L[i].id, i, `Found ${value} at index ${i}! Traversal complete in ${i + 1} step(s).`, 'found');
                    return steps;
                }
                push(L[i].id, i, `Index ${i}: ${L[i].value} ≠ ${value}. Follow next.${i === L.length - 1 ? ' (next wraps to HEAD)' : ''}`, 'searching');
            }
            push(-1, -1, `${value} not found — looped back to HEAD after ${L.length} nodes.`, 'not_found', true);
        } else if (op === 'traverseBack') {
            if (L.length === 0) {
                push(-1, -1, `List is empty.`, 'error', true);
                return steps;
            }
            push(-1, -1, `Starting backward traversal from TAIL (index ${L.length - 1}). Following .prev pointers.`, 'start');
            for (let i = L.length - 1; i >= 0; i--) {
                push(L[i].id, i, `Backward step ${L.length - i}/${L.length}: index ${i} = ${L[i].value}.${i === 0 ? ' prev wraps to TAIL.' : ''}`, 'traverse');
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
        explanation: 'Insert, delete, search, or traverse forward/backward to explore this ring structure.',
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
                            <span className="w-2 h-2 bg-orange-400 rounded-full"></span> Advanced
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Circular Doubly Linked List</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            The most powerful linked list variant — bidirectional pointers in a closed ring. No NULL anywhere.
                            Used in <span className="font-semibold text-orange-200">LRU caches</span> and the <span className="font-semibold text-blue-200">Linux kernel</span>.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><RotateCw className="h-4 w-4" /> Circular Ring</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4" /><ArrowRight className="h-4 w-4" /> Bidirectional</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><RefreshCcw className="h-4 w-4" /> No NULL Pointers</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-1">Circular Doubly Linked List</h2>
                        <p className="text-slate-400 text-sm mb-5">
                            Prev <span className="text-purple-400 font-medium">←</span> and next <span className="text-blue-400 font-medium">→</span> pointers are both circular.
                            <span className="text-orange-400 font-medium"> head.prev = tail, tail.next = head.</span>
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

                        {/* Visualization */}
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
                                    <div>
                                        {/* Circular prev indicator at start */}
                                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                                            <div className="flex items-center gap-0.5 bg-orange-500/20 border border-orange-500/40 rounded-lg px-2 py-0.5 flex-shrink-0">
                                                <RotateCw className="h-3 w-3 text-orange-400" />
                                                <span className="text-[10px] text-orange-400 font-mono">TAIL</span>
                                                <ArrowRight className="h-3 w-3 text-orange-400" />
                                            </div>
                                            <div className="flex items-center gap-0.5 flex-wrap">
                                                {currentState.list.map((node, i) => (
                                                    <div key={node.id} className="flex items-center gap-0.5 flex-shrink-0">
                                                        {i > 0 && <ArrowLeft className="h-3 w-3 text-purple-400" />}
                                                        <div className={`flex flex-col rounded-xl border-2 p-1.5 min-w-[52px] text-center transition-all duration-300 ${getNodeColor(node.id)}`}>
                                                            <div className="text-[9px] opacity-70 font-mono leading-tight">
                                                                {i === 0 ? '←TAIL' : `←#${currentState.list[i - 1].id}`}
                                                            </div>
                                                            <div className="font-bold text-base leading-tight">{node.value}</div>
                                                            <div className="text-[9px] opacity-70 font-mono leading-tight">
                                                                {i === currentState.list.length - 1 ? 'HEAD→' : `#${currentState.list[i + 1].id}→`}
                                                            </div>
                                                        </div>
                                                        {i < currentState.list.length - 1 && <ArrowRight className="h-3 w-3 text-blue-400" />}
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-0.5 bg-orange-500/20 border border-orange-500/40 rounded-lg px-2 py-0.5 flex-shrink-0">
                                                    <ArrowRight className="h-3 w-3 text-orange-400" />
                                                    <span className="text-[10px] text-orange-400 font-mono">HEAD</span>
                                                    <RotateCw className="h-3 w-3 text-orange-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Circular info */}
                                        <div className="mt-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-orange-300 flex items-center gap-2">
                                            <RotateCw className="h-3.5 w-3.5 flex-shrink-0" />
                                            head.prev = TAIL (#{currentState.list[currentState.list.length - 1]?.id}) · tail.next = HEAD (#{currentState.list[0]?.id})
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                    ['O(1)', 'Delete (with ptr)', 'green'],
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
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Structural Invariants</h2>
                            <div className="space-y-3">
                                {[
                                    ['border-orange-500', 'text-orange-400', 'tail.next = head', 'Forward direction is circular — no NULL at the end'],
                                    ['border-purple-500', 'text-purple-400', 'head.prev = tail', 'Backward direction is circular — no NULL at the start'],
                                    ['border-blue-500', 'text-blue-400', 'Single node', 'node.prev = node.next = itself — a ring of one'],
                                    ['border-green-500', 'text-green-400', '4 updates always', 'Every insert/delete updates prev and next on both sides'],
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
                                    { text: 'LRU Cache', desc: 'Move recently used node to head in O(1) — doubly for delete, circular for wrap-around' },
                                    { text: 'Linux kernel list_head', desc: "The kernel's generic linked list macro used in thousands of subsystems" },
                                    { text: 'Text editor cursor', desc: "Vim's undo ring — navigate forward/backward through infinite history" },
                                    { text: 'Browser tab cycling', desc: 'Ctrl+Tab wraps from last tab back to first seamlessly' },
                                ].map(({ text, desc }) => (
                                    <div key={text} className="flex items-start gap-3 rounded-lg p-3 bg-indigo-500/10">
                                        <RotateCw className="h-4 w-4 flex-shrink-0 mt-0.5 text-indigo-400" />
                                        <div>
                                            <div className="font-medium text-sm text-indigo-300">{text}</div>
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
