'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, Search, ArrowUpDown, ChevronLeft, ChevronRight, Brain, CheckCircle, XCircle, Crosshair, Info, Wrench, ChevronsRight, RefreshCw, Code2, Terminal, Server, Database } from 'lucide-react';
import Link from 'next/link';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What happens when you insert into a full dynamic array?",
        options: ["It throws an exception immediately", "It doubles its capacity and copies all elements", "It deletes the oldest element to make room", "It silently drops the new element"],
        correct: 1,
        explanation: "Dynamic arrays double their capacity (amortized O(1) append) — resizing is expensive but infrequent. This is how Python lists and Java ArrayLists work."
    },
    {
        question: "Why is random access (arr[i]) O(1) in an array but O(n) in a linked list?",
        options: ["Arrays use binary search", "Array elements are at fixed memory offsets, so address = base + i × size", "Arrays cache the last accessed index", "Linked lists use hash maps internally"],
        correct: 1,
        explanation: "Array elements are contiguous in memory. The address of index i = base_address + i × element_size — a direct O(1) calculation."
    },
    {
        question: "What is the amortized time complexity of appending to a dynamic array?",
        options: ["O(n) always — copies take linear time", "O(n²) — quadratic due to repeated copying", "O(1) amortized — doubling makes resizes rare", "O(log n) — balanced resizing strategy"],
        correct: 2,
        explanation: "While a single resize is O(n), it happens at size 1, 2, 4, 8... The total work per n appends is O(n), making each append O(1) amortized."
    }
];

const getStepIcon = (phase, error) => {
    if (error) return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
    switch (phase) {
        case 'complete': case 'found': return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />;
        case 'error': case 'not_found': return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />;
        case 'identify': case 'searching': return <Crosshair className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
        case 'resize': return <RefreshCw className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />;
        case 'shift': return <ChevronsRight className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />;
        default: return <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
    }
};

export default function ListArrayPage() {
    const [list, setList] = useState([]);
    const [capacity, setCapacity] = useState(4);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [indexValue, setIndexValue] = useState('');
    const [operation, setOperation] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [quizState, setQuizState] = useState({ answered: false, selected: null, correct: false });
    const [currentQuestion, setCurrentQuestion] = useState(0);

    useEffect(() => { reset(); }, []);

    const generateSteps = (op, value = null, index = null) => {
        const steps = [];
        const currentList = [...list];
        let currentCapacity = capacity;

        if (op === 'insert') {
            const insertIndex = index !== null ? index : currentList.length;
            if (insertIndex < 0 || insertIndex > currentList.length) {
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value, insertIndex, error: true, explanation: `Invalid index ${insertIndex}. Must be between 0 and ${currentList.length}.`, phase: 'error' });
                return steps;
            }
            if (currentList.length >= currentCapacity) {
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value, insertIndex, error: false, explanation: `Array is full (${currentList.length}/${currentCapacity}). Triggering resize.`, phase: 'check' });
                currentCapacity *= 2;
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value, insertIndex, error: false, explanation: `Resized! New capacity: ${currentCapacity}. All ${currentList.length} elements copied to new array.`, phase: 'resize' });
            } else {
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value, insertIndex, error: false, explanation: `Space available (${currentList.length}/${currentCapacity}). Proceeding with insertion at index ${insertIndex}.`, phase: 'check' });
            }
            if (insertIndex < currentList.length) {
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: insertIndex, operation: op, value, insertIndex, error: false, explanation: `Shifting elements from index ${insertIndex} rightward to make space.`, phase: 'shift' });
            }
            currentList.splice(insertIndex, 0, value);
            steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: insertIndex, operation: op, value, insertIndex, error: false, explanation: `Inserted ${value} at index ${insertIndex}. List size: ${currentList.length}/${currentCapacity}`, phase: 'complete' });

        } else if (op === 'delete') {
            const deleteIndex = index !== null ? index : currentList.length - 1;
            if (deleteIndex < 0 || deleteIndex >= currentList.length) {
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value: null, deleteIndex, error: true, explanation: `Invalid index ${deleteIndex}. Must be between 0 and ${currentList.length - 1}.`, phase: 'error' });
                return steps;
            }
            const deleteValue = currentList[deleteIndex];
            steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: deleteIndex, operation: op, value: deleteValue, deleteIndex, error: false, explanation: `Element at index ${deleteIndex}: ${deleteValue}. Will remove and shift remaining elements left.`, phase: 'identify' });
            currentList.splice(deleteIndex, 1);
            steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value: deleteValue, deleteIndex, error: false, explanation: `Removed ${deleteValue}. ${deleteIndex < currentList.length ? 'Elements shifted left.' : ''} New size: ${currentList.length}/${currentCapacity}`, phase: 'complete' });

        } else if (op === 'search') {
            steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value, searchIndex: 0, error: false, explanation: `Starting linear search for value ${value} from index 0.`, phase: 'start' });
            for (let i = 0; i < currentList.length; i++) {
                if (currentList[i] === value) {
                    steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: i, operation: op, value, searchIndex: i, error: false, explanation: `Found ${value} at index ${i}! Took ${i + 1} comparison${i === 0 ? '' : 's'}.`, phase: 'found' });
                    return steps;
                }
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: i, operation: op, value, searchIndex: i, error: false, explanation: `Index ${i}: ${currentList[i]} ≠ ${value}. Continue searching.`, phase: 'searching' });
            }
            steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value, searchIndex: -1, error: true, explanation: `Value ${value} not found after checking all ${currentList.length} elements.`, phase: 'not_found' });

        } else if (op === 'access') {
            const accessIndex = index !== null ? index : 0;
            if (accessIndex < 0 || accessIndex >= currentList.length) {
                steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: -1, operation: op, value: null, accessIndex, error: true, explanation: `Index ${accessIndex} out of bounds. Valid range: 0 to ${currentList.length - 1}.`, phase: 'error' });
                return steps;
            }
            const accessValue = currentList[accessIndex];
            steps.push({ list: [...currentList], capacity: currentCapacity, highlightIndex: accessIndex, operation: op, value: accessValue, accessIndex, error: false, explanation: `Direct access at index ${accessIndex}: value = ${accessValue}. O(1) — no traversal needed.`, phase: 'complete' });
        }
        return steps;
    };

    const handleInsert = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const idx = indexValue === '' ? null : parseInt(indexValue);
        const steps = generateSteps('insert', parseInt(inputValue), idx);
        setStepHistory(steps); setCurrentStep(0); setInputValue(''); setIndexValue(''); setOperation('insert');
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
                    if (stepHistory[stepHistory.length - 1]) {
                        const fs = stepHistory[stepHistory.length - 1];
                        setList(fs.list); setCapacity(fs.capacity);
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
                setList(fs.list); setCapacity(fs.capacity);
            }
        }
    };
    const stepBackward = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const pauseAnimation = () => setIsPlaying(false);
    const reset = () => { setList([]); setCapacity(4); setStepHistory([]); setCurrentStep(0); setIsPlaying(false); setOperation(''); };

    const currentState = stepHistory[currentStep] || { list, capacity, highlightIndex: -1, operation: '', value: null, error: false, explanation: 'Use Insert, Delete, Search, or Access to begin visualization.', phase: '' };

    const getElementColor = (index) => {
        if (currentState.error && currentState.highlightIndex === index) return 'bg-red-500/80 border-red-400 text-white';
        if (currentState.highlightIndex === index) {
            if (currentState.phase === 'identify' || currentState.phase === 'searching') return 'bg-yellow-400 border-yellow-300 text-slate-900 animate-pulse';
            if (currentState.phase === 'complete' || currentState.phase === 'found') return 'bg-green-400 border-green-300 text-slate-900 animate-pulse';
            if (currentState.phase === 'shift') return 'bg-orange-400 border-orange-300 text-slate-900 animate-pulse';
            return 'bg-blue-400 border-blue-300 text-white animate-pulse';
        }
        return 'bg-blue-500/70 border-blue-400 text-white';
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        setQuizState({ answered: true, selected: idx, correct: idx === quizQuestions[currentQuestion].correct });
    };
    const nextQuestion = () => { setCurrentQuestion(prev => (prev + 1) % quizQuestions.length); setQuizState({ answered: false, selected: null, correct: false }); };

    const codeExample = `class DynamicArray:
    def __init__(self, initial_capacity=4):
        self.data = [None] * initial_capacity
        self.size = 0
        self.capacity = initial_capacity

    def _resize(self):
        old_cap = self.capacity
        self.capacity *= 2              # Double the capacity
        new_data = [None] * self.capacity
        for i in range(self.size):     # Copy all elements
            new_data[i] = self.data[i]
        self.data = new_data

    def insert(self, index, value):
        if index < 0 or index > self.size:
            raise IndexError("Index out of bounds")
        if self.size >= self.capacity:
            self._resize()             # Expand before inserting
        for i in range(self.size, index, -1):
            self.data[i] = self.data[i - 1]
        self.data[index] = value
        self.size += 1

    def delete(self, index):
        if index < 0 or index >= self.size:
            raise IndexError("Index out of bounds")
        value = self.data[index]
        for i in range(index, self.size - 1):
            self.data[i] = self.data[i + 1]
        self.size -= 1
        return value

    def search(self, value):
        for i in range(self.size):
            if self.data[i] == value:
                return i
        return -1                       # Not found

    def access(self, index):           # O(1) — direct address calculation
        return self.data[index]

    def append(self, value):
        self.insert(self.size, value)`;

    const q = quizQuestions[currentQuestion];
    const loadFactor = currentState.capacity > 0 ? ((currentState.list.length / currentState.capacity) * 100).toFixed(0) : 0;

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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">List: Dynamic Array</h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Watch a dynamic array grow, shrink, and shift elements. Understand how Python lists, Java ArrayLists, and C++ vectors work under the hood.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Play className="h-4 w-4" /> Interactive Operations</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><ArrowUpDown className="h-4 w-4" /> Auto-Resizing</div>
                            <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full"><Clock className="h-4 w-4" /> O(1) Access</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Array Visualization</h2>
                        <p className="text-slate-400 text-sm mb-5">
                            Filled cells = <span className="text-blue-400 font-medium">data</span>, dashed cells = <span className="text-slate-500 font-medium">reserved capacity</span>. Watch it resize!
                        </p>

                        {/* Color Legend */}
                        <div className="bg-slate-800/60 rounded-lg p-3 mb-5 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Color Legend</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/70 border border-blue-400"></span><span className="text-slate-300">Default</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-slate-300">Scanning / Target</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-slate-300">Found / Inserted</span></span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400"></span><span className="text-slate-300">Shifting</span></span>
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

                        {/* Array Visualization */}
                        <div className="mb-5">
                            <div className="overflow-x-auto">
                                <div className="flex items-end gap-1 py-2 min-w-max">
                                    {Array.from({ length: currentState.capacity }).map((_, index) => (
                                        <div key={index} className={`flex flex-col items-center transition-all duration-300 ${index < currentState.list.length ? '' : 'opacity-50'}`}>
                                            <div className={`w-14 h-14 flex flex-col items-center justify-center border-2 rounded-lg transition-all duration-300 ${index < currentState.list.length ? getElementColor(index) : 'bg-slate-800/40 border-dashed border-slate-600'}`}>
                                                {index < currentState.list.length ? (
                                                    <>
                                                        <div className="font-bold text-base">{currentState.list[index]}</div>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-600 text-xs">—</div>
                                                )}
                                            </div>
                                            <div className={`text-xs mt-1 font-mono ${index < currentState.list.length ? 'text-slate-400' : 'text-slate-600'}`}>[{index}]</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Capacity bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Load Factor</span>
                                    <span>{currentState.list.length} / {currentState.capacity} ({loadFactor}%)</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all duration-500 ${parseInt(loadFactor) >= 100 ? 'bg-red-500' : parseInt(loadFactor) >= 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(100, loadFactor)}%` }} />
                                </div>
                            </div>

                            <div className="text-center mt-4 flex justify-center gap-4">
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-blue-400">{currentState.list.length}</div>
                                    <div className="text-xs text-slate-500">Size (elements)</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-purple-400">{currentState.capacity}</div>
                                    <div className="text-xs text-slate-500">Capacity (slots)</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                                    <div className="text-lg font-bold text-slate-300">{currentState.capacity * 4}B</div>
                                    <div className="text-xs text-slate-500">Memory (est.)</div>
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
                                    ['O(1)', 'Access', 'green'],
                                    ['O(n)', 'Insert/Delete', 'orange'],
                                    ['O(n)', 'Search', 'orange'],
                                    ['O(1)*', 'Append', 'green'],
                                ].map(([c, op, color]) => (
                                    <div key={op} className={`text-center rounded-lg py-3 border ${color === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                        <div className={`text-xl font-bold ${color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{c}</div>
                                        <div className="text-xs text-slate-400 mt-1">{op}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-3 mb-2">
                                <div className="text-lg font-bold text-blue-400">O(n) Space</div>
                                <div className="text-xs text-slate-400 mt-1">Allocated capacity + element data</div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">*Append is O(1) amortized — rare O(n) resize amortizes over many O(1) appends.</p>
                        </div>

                        {/* Operations */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-4">Operations</h2>
                            <div className="space-y-3">
                                {[
                                    ['border-blue-500', 'text-blue-400', 'Insert', 'Shift elements right, insert at index. Resize if full.'],
                                    ['border-red-500', 'text-red-400', 'Delete', 'Remove element at index, shift remaining elements left.'],
                                    ['border-emerald-500', 'text-emerald-400', 'Access', 'Direct index calculation — O(1) random access.'],
                                    ['border-purple-500', 'text-purple-400', 'Search', 'Linear scan from index 0 until found or end.'],
                                ].map(([border, textColor, op, desc]) => (
                                    <div key={op} className={`border-l-4 ${border} pl-4 py-1`}>
                                        <h3 className={`font-semibold ${textColor} text-sm`}>{op}</h3>
                                        <p className="text-slate-400 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Resizing */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-xl font-bold text-slate-100 mb-3">Why Doubling Works</h2>
                            <p className="text-slate-400 text-sm mb-3">When capacity doubles at sizes 4 → 8 → 16 → 32…:</p>
                            <div className="space-y-2">
                                {[
                                    ['Total copies after n appends', 'n + n/2 + n/4 + … ≤ 2n', 'blue'],
                                    ['Cost per append (amortized)', 'O(1) — spread over many ops', 'green'],
                                    ['Wasted space (worst case)', 'Up to 50% unused capacity', 'yellow'],
                                ].map(([label, value, color]) => (
                                    <div key={label} className={`flex items-start gap-3 rounded-lg p-3 bg-${color}-500/10 border border-${color}-500/20`}>
                                        <div>
                                            <div className="text-xs text-slate-500">{label}</div>
                                            <div className={`text-sm font-mono font-medium text-${color}-400`}>{value}</div>
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
