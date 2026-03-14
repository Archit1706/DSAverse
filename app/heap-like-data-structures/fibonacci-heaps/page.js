'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, Link2 } from 'lucide-react';

export default function FibonacciHeapsPage() {
    const [roots, setRoots] = useState([]);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [inputValue, setInputValue] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    const cloneRoots = (list) => JSON.parse(JSON.stringify(list));

    const getMinNode = (list) => {
        if (list.length === 0) return null;
        return list.reduce((minNode, node) => (node.key < minNode.key ? node : minNode), list[0]);
    };

    const snapshot = (list, explanation, phase = 'info', highlightedIds = []) => ({
        roots: cloneRoots(list),
        explanation,
        phase,
        highlightedIds
    });

    const generateSteps = (operation, value = null) => {
        const steps = [];
        let currentRoots = cloneRoots(roots);

        if (operation === 'insert') {
            const newNode = { id: nodeIdCounter + Math.random(), key: value, degree: 0, children: [] };
            steps.push(snapshot(currentRoots, `➕ Create new tree rooted at ${value}.`, 'create', [newNode.id]));
            currentRoots.push(newNode);
            steps.push(snapshot(currentRoots, `✅ Insert complete. ${value} appended to root list (amortized O(1)).`, 'complete', [newNode.id]));
        }

        if (operation === 'peekMin') {
            const min = getMinNode(currentRoots);
            if (!min) {
                steps.push(snapshot(currentRoots, '❌ Heap is empty.', 'error'));
            } else {
                steps.push(snapshot(currentRoots, `👀 Current minimum is ${min.key}.`, 'complete', [min.id]));
            }
        }

        if (operation === 'extractMin') {
            const min = getMinNode(currentRoots);
            if (!min) {
                steps.push(snapshot(currentRoots, '❌ Heap is empty. Cannot extract minimum.', 'error'));
                return steps;
            }

            steps.push(snapshot(currentRoots, `🎯 Minimum root found: ${min.key}.`, 'identify', [min.id]));

            currentRoots = currentRoots.filter((node) => node.id !== min.id);
            steps.push(snapshot(currentRoots, `🗑️ Remove root ${min.key} from root list.`, 'remove'));

            if (min.children.length > 0) {
                const promoted = min.children.map((child) => ({ ...child }));
                currentRoots.push(...promoted);
                steps.push(snapshot(currentRoots, `📤 Promote ${promoted.length} child tree(s) of ${min.key} to root list.`, 'promote', promoted.map((c) => c.id)));
            }

            const degreeTable = new Map();
            const queue = [...currentRoots];
            currentRoots = [];

            while (queue.length > 0) {
                let x = queue.shift();

                while (degreeTable.has(x.degree)) {
                    let y = degreeTable.get(x.degree);
                    degreeTable.delete(x.degree);

                    if (y.key < x.key) {
                        [x, y] = [y, x];
                    }

                    steps.push(snapshot(
                        [...degreeTable.values(), x, y],
                        `🔗 Link degree-${x.degree} trees: ${y.key} becomes child of ${x.key}.`,
                        'link',
                        [x.id, y.id]
                    ));

                    x.children.push(y);
                    x.degree += 1;
                }

                degreeTable.set(x.degree, x);
            }

            currentRoots = [...degreeTable.values()];
            const newMin = getMinNode(currentRoots);
            steps.push(snapshot(currentRoots, `✅ Consolidation complete. New minimum is ${newMin ? newMin.key : 'none'}.`, 'complete', newMin ? [newMin.id] : []));
        }

        return steps;
    };

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;

        if (currentStep >= stepHistory.length - 1) {
            setRoots(stepHistory[stepHistory.length - 1].roots);
            setIsPlaying(false);
            return;
        }

        const timeout = setTimeout(() => {
            setCurrentStep((prev) => prev + 1);
        }, speed);

        return () => clearTimeout(timeout);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const startOperation = (operation, value = null) => {
        const steps = generateSteps(operation, value);
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const reset = () => {
        setRoots([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const currentState = stepHistory[currentStep] || {
        roots,
        explanation: 'Select an operation to begin visualization.',
        phase: '',
        highlightedIds: []
    };

    const min = getMinNode(currentState.roots);

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <a href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </a>
                    <h1 className="text-4xl font-bold text-center">Fibonacci Heap Visualization</h1>
                    <p className="text-center text-amber-100 mt-3">Root-list based heap with lazy structure updates and consolidation on extract-min.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-5">Root List Visualization</h2>

                    <div className="space-y-4 mb-6">
                        <div className="flex flex-wrap gap-2">
                            <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter key" className="px-3 py-2 border rounded" />
                            <button onClick={() => { if (inputValue !== '') { startOperation('insert', Number(inputValue)); setNodeIdCounter((v) => v + 1); setInputValue(''); } }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="h-4 w-4" />Insert</button>
                            <button onClick={() => startOperation('peekMin')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"><Eye className="h-4 w-4" />Peek Min</button>
                            <button onClick={() => startOperation('extractMin')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"><Minus className="h-4 w-4" />Extract Min</button>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            <button onClick={() => setIsPlaying((v) => !v)} disabled={stepHistory.length === 0} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50">
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button onClick={reset} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"><RotateCcw className="h-4 w-4" />Reset</button>
                            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="border rounded px-2 py-2 text-sm">
                                <option value={1800}>Slow</option>
                                <option value={1200}>Normal</option>
                                <option value={700}>Fast</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">Current Root List</h3>
                        {currentState.roots.length === 0 ? (
                            <div className="text-gray-500 text-sm">Heap is empty</div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {currentState.roots.map((node) => {
                                    const isHighlighted = currentState.highlightedIds.includes(node.id);
                                    const isMin = min && min.id === node.id;
                                    return (
                                        <div key={node.id} className={`rounded-lg border-2 px-4 py-3 min-w-28 ${isHighlighted ? 'border-yellow-500 bg-yellow-50' : isMin ? 'border-green-500 bg-green-50' : 'border-amber-300 bg-white'}`}>
                                            <div className="font-bold text-gray-800">{node.key}</div>
                                            <div className="text-xs text-gray-600">degree: {node.degree}</div>
                                            <div className="text-xs text-gray-600">children: {node.children.length}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-800 mb-1">Current Step</h3>
                        <p className="text-amber-700 text-sm">{currentState.explanation}</p>
                        {stepHistory.length > 0 && <p className="text-xs text-amber-600 mt-2">Step {currentStep + 1} of {stepHistory.length}</p>}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Complexity (Amortized)</h2>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div><div className="text-green-600 font-bold">O(1)</div><div className="text-xs text-gray-600">Insert</div></div>
                            <div><div className="text-green-600 font-bold">O(1)</div><div className="text-xs text-gray-600">Peek Min</div></div>
                            <div><div className="text-green-600 font-bold">O(log n)</div><div className="text-xs text-gray-600">Extract Min</div></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Heap Stats (Current View)</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-amber-50 rounded p-3 text-center"><div className="text-lg font-bold text-amber-700">{currentState.roots.length}</div><div className="text-xs text-gray-600">Root Trees</div></div>
                            <div className="bg-amber-50 rounded p-3 text-center"><div className="text-lg font-bold text-amber-700">{min ? min.key : '-'}</div><div className="text-xs text-gray-600">Current Minimum</div></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 text-sm text-gray-700 space-y-2">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Key Properties</h2>
                        <p><Link2 className="inline h-4 w-4 mr-1" /> Insert adds a singleton tree to the root list.</p>
                        <p><Link2 className="inline h-4 w-4 mr-1" /> Extract-min promotes children then consolidates by degree.</p>
                        <p><Link2 className="inline h-4 w-4 mr-1" /> Linking always keeps the smaller key as parent.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
