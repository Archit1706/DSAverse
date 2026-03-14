'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, GitMerge } from 'lucide-react';

export default function LeftistHeapsPage() {
    const [heap, setHeap] = useState(null);
    const [heap2, setHeap2] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);
    const [inputMain, setInputMain] = useState('');
    const [inputSecond, setInputSecond] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    const cloneHeap = (node) => (node ? JSON.parse(JSON.stringify(node)) : null);

    const createNode = (value) => ({
        id: nodeIdCounter + Math.random(),
        value,
        npl: 0,
        left: null,
        right: null
    });

    const getNpl = (node) => (node ? node.npl : -1);

    const mergeHeaps = (h1, h2, steps = []) => {
        if (!h1) return h2;
        if (!h2) return h1;

        if (h1.value > h2.value) {
            [h1, h2] = [h2, h1];
        }

        steps.push({
            heap: cloneHeap(h1),
            heap2: cloneHeap(h2),
            highlightNodes: [h1.id, h2.id],
            phase: 'compare',
            explanation: `🔍 Compare roots ${h1.value} and ${h2.value}; keep ${h1.value} at root.`
        });

        h1.right = mergeHeaps(h1.right, h2, steps);

        const leftNpl = getNpl(h1.left);
        const rightNpl = getNpl(h1.right);

        if (leftNpl < rightNpl) {
            [h1.left, h1.right] = [h1.right, h1.left];
            steps.push({
                heap: cloneHeap(h1),
                heap2: null,
                highlightNodes: [h1.id],
                phase: 'swap',
                explanation: `↔️ Swap children of ${h1.value} to satisfy leftist property (npl(left) ≥ npl(right)).`
            });
        }

        h1.npl = getNpl(h1.right) + 1;

        steps.push({
            heap: cloneHeap(h1),
            heap2: null,
            highlightNodes: [h1.id],
            phase: 'npl',
            explanation: `📏 Update npl(${h1.value}) = ${h1.npl}.`
        });

        return h1;
    };

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const currentHeap = cloneHeap(heap);
        const currentHeap2 = cloneHeap(heap2);

        if (operation === 'insertMain') {
            const newNode = createNode(value);
            steps.push({
                heap: currentHeap,
                heap2: newNode,
                highlightNodes: [newNode.id],
                phase: 'create',
                explanation: `➕ Create node ${value} and merge into Heap A.`
            });

            const merged = mergeHeaps(currentHeap, newNode, steps);
            steps.push({
                heap: merged,
                heap2: currentHeap2,
                highlightNodes: [merged?.id].filter(Boolean),
                phase: 'complete',
                explanation: `✅ Insert ${value} complete in Heap A.`
            });
        }

        if (operation === 'insertSecond') {
            const newNode = createNode(value);
            steps.push({
                heap: currentHeap,
                heap2: newNode,
                highlightNodes: [newNode.id],
                phase: 'create',
                explanation: `➕ Create node ${value} and merge into Heap B.`
            });

            const mergedSecond = mergeHeaps(currentHeap2, newNode, steps);
            steps.push({
                heap: currentHeap,
                heap2: mergedSecond,
                highlightNodes: [mergedSecond?.id].filter(Boolean),
                phase: 'complete',
                explanation: `✅ Insert ${value} complete in Heap B.`
            });
        }

        if (operation === 'extractMin') {
            if (!currentHeap) {
                steps.push({
                    heap: currentHeap,
                    heap2: currentHeap2,
                    highlightNodes: [],
                    phase: 'error',
                    explanation: '❌ Heap A is empty. Cannot extract minimum.'
                });
                return steps;
            }

            steps.push({
                heap: currentHeap,
                heap2: currentHeap2,
                highlightNodes: [currentHeap.id],
                phase: 'identify',
                explanation: `🎯 Minimum is root ${currentHeap.value}. Remove it and merge children.`
            });

            const merged = mergeHeaps(currentHeap.left, currentHeap.right, steps);
            steps.push({
                heap: merged,
                heap2: currentHeap2,
                highlightNodes: merged ? [merged.id] : [],
                phase: 'complete',
                explanation: `✅ Extract-min complete. Removed ${currentHeap.value}.`
            });
        }

        if (operation === 'peek') {
            steps.push({
                heap: currentHeap,
                heap2: currentHeap2,
                highlightNodes: currentHeap ? [currentHeap.id] : [],
                phase: currentHeap ? 'complete' : 'error',
                explanation: currentHeap ? `👀 Minimum in Heap A is ${currentHeap.value}.` : '❌ Heap A is empty.'
            });
        }

        if (operation === 'mergeAB') {
            if (!currentHeap && !currentHeap2) {
                steps.push({
                    heap: null,
                    heap2: null,
                    highlightNodes: [],
                    phase: 'error',
                    explanation: '❌ Both heaps are empty.'
                });
                return steps;
            }

            steps.push({
                heap: currentHeap,
                heap2: currentHeap2,
                highlightNodes: [],
                phase: 'prepare',
                explanation: '🔀 Merge Heap A and Heap B.'
            });

            const merged = mergeHeaps(currentHeap, currentHeap2, steps);
            steps.push({
                heap: merged,
                heap2: null,
                highlightNodes: merged ? [merged.id] : [],
                phase: 'complete',
                explanation: '✅ Merge complete. Result stored in Heap A.'
            });
        }

        return steps;
    };

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;

        if (currentStep >= stepHistory.length - 1) {
            const final = stepHistory[stepHistory.length - 1];
            setHeap(final.heap);
            setHeap2(final.heap2);
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
        setHeap(null);
        setHeap2(null);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const currentState = stepHistory[currentStep] || {
        heap,
        heap2,
        highlightNodes: [],
        phase: '',
        explanation: 'Select an operation to begin visualization.'
    };

    const countNodes = (node) => (!node ? 0 : 1 + countNodes(node.left) + countNodes(node.right));
    const heapHeight = (node) => (!node ? 0 : 1 + Math.max(heapHeight(node.left), heapHeight(node.right)));

    const renderHeap = (node, x, y, level = 0, isSecondary = false) => {
        if (!node) return [];

        const elements = [];
        const horizontalSpacing = Math.max(220 / Math.pow(2, level), 30);
        const verticalSpacing = 74;
        const radius = 22;
        const highlighted = currentState.highlightNodes.includes(node.id);

        const colorClass = highlighted
            ? 'fill-yellow-300 stroke-yellow-600 animate-pulse'
            : isSecondary
                ? 'fill-orange-300 stroke-orange-600'
                : 'fill-amber-300 stroke-amber-600';

        if (node.left) {
            const lx = x - horizontalSpacing;
            const ly = y + verticalSpacing;
            elements.push(<line key={`l-${node.id}`} x1={x} y1={y + radius} x2={lx} y2={ly - radius} className="stroke-amber-500 stroke-2" />);
            elements.push(...renderHeap(node.left, lx, ly, level + 1, isSecondary));
        }

        if (node.right) {
            const rx = x + horizontalSpacing;
            const ry = y + verticalSpacing;
            elements.push(<line key={`r-${node.id}`} x1={x} y1={y + radius} x2={rx} y2={ry - radius} className="stroke-amber-500 stroke-2" />);
            elements.push(...renderHeap(node.right, rx, ry, level + 1, isSecondary));
        }

        elements.push(
            <g key={`n-${node.id}`}>
                <circle cx={x} cy={y} r={radius} className={`${colorClass} stroke-2 transition-all`} />
                <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-gray-800">{node.value}</text>
                <text x={x} y={y + 12} textAnchor="middle" className="text-[10px] fill-gray-700">npl={node.npl}</text>
            </g>
        );

        return elements;
    };

    const renderVisualization = () => {
        if (!currentState.heap && !currentState.heap2) {
            return <div className="h-72 flex items-center justify-center text-gray-500">Empty Leftist Heaps</div>;
        }

        const width = currentState.heap2 ? 1050 : 650;
        return (
            <svg width={width} height={420} className="mx-auto">
                {currentState.heap && (
                    <>
                        <text x={currentState.heap2 ? 250 : 320} y={28} textAnchor="middle" className="fill-amber-700 font-semibold text-sm">Heap A</text>
                        {renderHeap(currentState.heap, currentState.heap2 ? 250 : 320, 60)}
                    </>
                )}
                {currentState.heap2 && (
                    <>
                        <text x={760} y={28} textAnchor="middle" className="fill-orange-700 font-semibold text-sm">Heap B</text>
                        {renderHeap(currentState.heap2, 760, 60, 0, true)}
                    </>
                )}
            </svg>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <a href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Heap Data Structures
                    </a>
                    <h1 className="text-4xl font-bold text-center">Leftist Heap Visualization</h1>
                    <p className="text-center text-amber-100 mt-3">Merge-driven min-heap with null path length (npl) balancing.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-5">Heap Visualization</h2>

                    <div className="space-y-4 mb-6">
                        <div className="flex flex-wrap gap-2">
                            <input value={inputMain} onChange={(e) => setInputMain(e.target.value)} type="number" placeholder="Value for Heap A" className="px-3 py-2 border rounded" />
                            <button onClick={() => { if (inputMain !== '') { startOperation('insertMain', Number(inputMain)); setInputMain(''); setNodeIdCounter((v) => v + 1); } }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="h-4 w-4" />Insert A</button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <input value={inputSecond} onChange={(e) => setInputSecond(e.target.value)} type="number" placeholder="Value for Heap B" className="px-3 py-2 border rounded" />
                            <button onClick={() => { if (inputSecond !== '') { startOperation('insertSecond', Number(inputSecond)); setInputSecond(''); setNodeIdCounter((v) => v + 1); } }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="h-4 w-4" />Insert B</button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => startOperation('extractMin')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"><Minus className="h-4 w-4" />Extract Min (A)</button>
                            <button onClick={() => startOperation('peek')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"><Eye className="h-4 w-4" />Peek Min (A)</button>
                            <button onClick={() => startOperation('mergeAB')} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2"><GitMerge className="h-4 w-4" />Merge A+B</button>
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

                    <div className="overflow-x-auto">{renderVisualization()}</div>

                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-800 mb-1">Current Step</h3>
                        <p className="text-amber-700 text-sm">{currentState.explanation}</p>
                        {stepHistory.length > 0 && <p className="text-xs text-amber-600 mt-2">Step {currentStep + 1} of {stepHistory.length}</p>}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Complexity Analysis</h2>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div><div className="text-green-600 font-bold">O(log n)</div><div className="text-xs text-gray-600">Merge</div></div>
                            <div><div className="text-green-600 font-bold">O(log n)</div><div className="text-xs text-gray-600">Insert</div></div>
                            <div><div className="text-green-600 font-bold">O(log n)</div><div className="text-xs text-gray-600">Extract Min</div></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Heap Stats (Current View)</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-amber-50 rounded p-3 text-center"><div className="text-lg font-bold text-amber-700">{countNodes(currentState.heap)}</div><div className="text-xs text-gray-600">Nodes in Heap A</div></div>
                            <div className="bg-amber-50 rounded p-3 text-center"><div className="text-lg font-bold text-amber-700">{heapHeight(currentState.heap)}</div><div className="text-xs text-gray-600">Height of Heap A</div></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 text-sm text-gray-700 space-y-2">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Key Properties</h2>
                        <p>• Min-heap order: root stores the smallest key.</p>
                        <p>• Leftist rule: npl(left) ≥ npl(right) at every node.</p>
                        <p>• Merge is the fundamental primitive used by insert and extract-min.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
