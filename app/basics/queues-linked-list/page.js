'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ArrowRight, Link2 } from 'lucide-react';
import Link from 'next/link';

export default function QueueLinkedListPage() {
    const [queue, setQueue] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [operation, setOperation] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    // Initialize with empty queue
    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const currentQueue = [...queue];

        if (operation === 'enqueue') {
            // Step 1: Create new node
            const newNode = {
                id: nodeIdCounter,
                value: value,
                next: null
            };

            steps.push({
                queue: [...currentQueue],
                newNode: newNode,
                highlightNodeId: -1,
                operation: 'enqueue',
                value: value,
                error: false,
                explanation: `🔧 Creating new node with value ${value}. This will be added at the rear.`,
                phase: 'create'
            });

            // Step 2: Link the new node
            if (currentQueue.length === 0) {
                // First node - both front and rear point to it
                currentQueue.push(newNode);
                steps.push({
                    queue: [...currentQueue],
                    newNode: null,
                    highlightNodeId: newNode.id,
                    operation: 'enqueue',
                    value: value,
                    error: false,
                    explanation: `✅ First node added. Both front and rear pointers point to this node. Size: ${currentQueue.length}`,
                    phase: 'complete'
                });
            } else {
                // Link to the current rear and update rear pointer
                const lastNode = currentQueue[currentQueue.length - 1];
                lastNode.next = newNode.id;
                currentQueue.push(newNode);
                steps.push({
                    queue: [...currentQueue],
                    newNode: null,
                    highlightNodeId: newNode.id,
                    operation: 'enqueue',
                    value: value,
                    error: false,
                    explanation: `✅ Node linked to current rear. Rear pointer updated to new node. Size: ${currentQueue.length}`,
                    phase: 'complete'
                });
            }

        } else if (operation === 'dequeue') {
            if (currentQueue.length === 0) {
                steps.push({
                    queue: [...currentQueue],
                    newNode: null,
                    highlightNodeId: -1,
                    operation: 'dequeue',
                    value: null,
                    error: true,
                    explanation: `❌ Queue Underflow! Cannot dequeue from empty queue.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Identify front node
            const frontNode = currentQueue[0];
            steps.push({
                queue: [...currentQueue],
                newNode: null,
                highlightNodeId: frontNode.id,
                operation: 'dequeue',
                value: frontNode.value,
                error: false,
                explanation: `🎯 Identifying front node with value ${frontNode.value}`,
                phase: 'identify'
            });

            // Step 2: Update front pointer and remove node
            currentQueue.shift();
            if (currentQueue.length > 0) {
                steps.push({
                    queue: [...currentQueue],
                    newNode: null,
                    highlightNodeId: -1,
                    operation: 'dequeue',
                    value: frontNode.value,
                    error: false,
                    explanation: `✅ Removed front node (${frontNode.value}). Front pointer moved to next node. Size: ${currentQueue.length}`,
                    phase: 'complete'
                });
            } else {
                steps.push({
                    queue: [...currentQueue],
                    newNode: null,
                    highlightNodeId: -1,
                    operation: 'dequeue',
                    value: frontNode.value,
                    error: false,
                    explanation: `✅ Removed last node (${frontNode.value}). Queue is now empty. Both pointers set to NULL.`,
                    phase: 'complete'
                });
            }

        } else if (operation === 'peek') {
            if (currentQueue.length === 0) {
                steps.push({
                    queue: [...currentQueue],
                    newNode: null,
                    highlightNodeId: -1,
                    operation: 'peek',
                    value: null,
                    error: true,
                    explanation: `❌ Cannot peek at empty queue.`,
                    phase: 'error'
                });
                return steps;
            }

            const frontValue = currentQueue[0].value;
            steps.push({
                queue: [...currentQueue],
                newNode: null,
                highlightNodeId: currentQueue[0].id,
                operation: 'peek',
                value: frontValue,
                error: false,
                explanation: `👀 Peek: Front node contains value ${frontValue}`,
                phase: 'complete'
            });
        }

        return steps;
    };

    const handleEnqueue = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const value = parseInt(inputValue);
        const steps = generateSteps('enqueue', value);
        setStepHistory(steps);
        setCurrentStep(0);
        setInputValue('');
        setOperation('enqueue');
        setNodeIdCounter(prev => prev + 1);
    };

    const handleDequeue = () => {
        const steps = generateSteps('dequeue');
        setStepHistory(steps);
        setCurrentStep(0);
        setOperation('dequeue');
    };

    const handlePeek = () => {
        const steps = generateSteps('peek');
        setStepHistory(steps);
        setCurrentStep(0);
        setOperation('peek');
    };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);

        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= stepHistory.length - 1) {
                    setIsPlaying(false);
                    clearInterval(interval);
                    // Apply final state to actual queue
                    if (stepHistory[stepHistory.length - 1]) {
                        setQueue(stepHistory[stepHistory.length - 1].queue);
                    }
                    return prev;
                }
                return prev + 1;
            });
        }, speed);
    };

    const pauseAnimation = () => {
        setIsPlaying(false);
    };

    const reset = () => {
        setQueue([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
        setOperation('');
        setNodeIdCounter(1);
    };

    const currentState = stepHistory[currentStep] || {
        queue: queue,
        newNode: null,
        highlightNodeId: -1,
        operation: '',
        value: null,
        error: false,
        explanation: 'Select an operation to begin visualization',
        phase: ''
    };

    const getNodeColor = (nodeId) => {
        if (currentState.error) return 'bg-red-400 border-red-500';
        if (currentState.highlightNodeId === nodeId) {
            if (currentState.phase === 'identify') return 'bg-yellow-400 border-yellow-500 animate-pulse';
            if (currentState.phase === 'complete') return 'bg-green-400 border-green-500 animate-pulse';
            return 'bg-blue-400 border-blue-500 animate-pulse';
        }
        return 'bg-blue-300 border-blue-400';
    };

    const codeExample = `class Node:
    def __init__(self, value):
        self.value = value      # Data stored in the node
        self.next = None        # Reference to next node

class QueueLinkedList:
    def __init__(self):
        self.front = None       # Reference to front of queue
        self.rear = None        # Reference to rear of queue
        self.size = 0          # Track number of elements
    
    def enqueue(self, value):
        # Create new node
        new_node = Node(value)
        
        if self.rear is None:
            # First node - both front and rear point to it
            self.front = self.rear = new_node
        else:
            # Link new node to current rear
            self.rear.next = new_node
            # Update rear to point to new node
            self.rear = new_node
        
        self.size += 1
        return value
    
    def dequeue(self):
        # Check for queue underflow
        if self.front is None:
            raise Exception("Queue Underflow")
        
        # Get value from front node
        value = self.front.value
        
        # Update front to next node
        self.front = self.front.next
        
        # If queue becomes empty, reset rear to None
        if self.front is None:
            self.rear = None
        
        self.size -= 1
        return value
    
    def peek(self):
        # Check if queue is empty
        if self.front is None:
            raise Exception("Queue is Empty")
        
        return self.front.value
    
    def is_empty(self):
        return self.front is None
    
    def get_size(self):
        return self.size
    
    def display(self):
        # Traverse and display all elements
        current = self.front
        elements = []
        while current:
            elements.append(current.value)
            current = current.next
        return elements`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/basics" className="flex items-center text-white hover:text-blue-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Basics
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Queue: Linked List Implementation
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore how a queue works using dynamic linked list implementation.
                            Watch how nodes are managed with front and rear pointers for efficient FIFO operations.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Operations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Link2 className="h-4 w-4" />
                                Linked List Implementation
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                O(1) Operations
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visualization Panel */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Queue Visualization</h2>

                        {/* Controls */}
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    onClick={handleEnqueue}
                                    disabled={isPlaying}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Enqueue
                                </button>
                                <button
                                    onClick={handleDequeue}
                                    disabled={isPlaying}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Minus className="h-4 w-4" />
                                    Dequeue
                                </button>
                                <button
                                    onClick={handlePeek}
                                    disabled={isPlaying}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                                >
                                    Peek
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={isPlaying ? pauseAnimation : playAnimation}
                                    disabled={stepHistory.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={reset}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Reset
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700">Speed:</label>
                                <select
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value={2000}>Slow</option>
                                    <option value={1000}>Normal</option>
                                    <option value={500}>Fast</option>
                                </select>
                            </div>
                        </div>

                        {/* Queue Visualization */}
                        <div className="mb-6">
                            <div className="flex justify-center">
                                <div className="relative min-h-64 w-full max-w-2xl">
                                    {/* Front and Rear pointers */}
                                    <div className="flex justify-between mb-4">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-gray-200 border-2 border-gray-400 rounded-lg px-3 py-2 text-sm font-semibold">
                                                FRONT
                                            </div>
                                            {currentState.queue.length > 0 && (
                                                <div className="w-0.5 h-6 bg-gray-400 mt-1"></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="bg-gray-200 border-2 border-gray-400 rounded-lg px-3 py-2 text-sm font-semibold">
                                                REAR
                                            </div>
                                            {currentState.queue.length > 0 && (
                                                <div className="w-0.5 h-6 bg-gray-400 mt-1"></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* New node being created (during enqueue) */}
                                    {currentState.newNode && (
                                        <div className="mb-4 flex justify-center">
                                            <div className="animate-bounce">
                                                <div className="bg-yellow-300 border-2 border-yellow-500 rounded-lg p-3 flex items-center">
                                                    <div className="text-center mr-3">
                                                        <div className="text-xs text-gray-600 mb-1">Node {currentState.newNode.id}</div>
                                                        <div className="font-bold">{currentState.newNode.value}</div>
                                                    </div>
                                                    <div className="w-4 h-4 bg-yellow-200 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Queue nodes */}
                                    <div className="flex items-center justify-center min-h-20">
                                        {currentState.queue.length === 0 ? (
                                            <div className="text-gray-400 text-center py-8">
                                                <div className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                                    Empty Queue
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                {currentState.queue.map((node, index) => (
                                                    <div key={node.id} className="flex items-center">
                                                        {/* Node */}
                                                        <div className={`
                                                            w-24 h-16 flex items-center justify-between rounded-lg border-2 p-2
                                                            transition-all duration-300 transform
                                                            ${getNodeColor(node.id)}
                                                        `}>
                                                            <div className="text-center flex-1">
                                                                <div className="text-xs text-white/80 mb-1">
                                                                    #{node.id}
                                                                </div>
                                                                <div className="font-bold text-white text-sm">
                                                                    {node.value}
                                                                </div>
                                                            </div>
                                                            <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                            </div>
                                                        </div>

                                                        {/* Arrow to next node */}
                                                        {index < currentState.queue.length - 1 && (
                                                            <ArrowRight className="h-4 w-4 text-gray-500 mx-1" />
                                                        )}

                                                        {/* NULL pointer for last node */}
                                                        {index === currentState.queue.length - 1 && (
                                                            <div className="flex items-center ml-2">
                                                                <ArrowRight className="h-4 w-4 text-gray-500" />
                                                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded ml-1">
                                                                    NULL
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* FIFO Direction indicator */}
                                    {currentState.queue.length > 0 && (
                                        <div className="text-center mt-4">
                                            <div className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                                <span className="mr-2">FIFO Direction</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Queue info */}
                            <div className="text-center mt-4 space-y-2">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Size:</span> {currentState.queue.length}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Memory:</span> Dynamic allocation
                                </div>
                                <div className="text-sm text-gray-600 space-x-4">
                                    <span>
                                        <span className="font-semibold">Front:</span> {
                                            currentState.queue.length > 0 ?
                                                `Node ${currentState.queue[0].id}` :
                                                'NULL'
                                        }
                                    </span>
                                    <span>
                                        <span className="font-semibold">Rear:</span> {
                                            currentState.queue.length > 0 ?
                                                `Node ${currentState.queue[currentState.queue.length - 1].id}` :
                                                'NULL'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Step Explanation */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">Current Step:</h3>
                            <p className="text-blue-700">{currentState.explanation}</p>
                            {stepHistory.length > 0 && (
                                <div className="mt-2 text-sm text-blue-600">
                                    Step {currentStep + 1} of {stepHistory.length}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Information Panel */}
                    <div className="space-y-6">
                        {/* Complexity Analysis */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Complexity Analysis</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Enqueue</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Dequeue</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Peek</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">O(n) Space</div>
                                    <div className="text-sm text-gray-600">Dynamic allocation + pointer overhead</div>
                                </div>
                            </div>
                        </div>

                        {/* Advantages over Array */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Advantages over Array</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>O(1) Dequeue:</strong> No shifting required unlike array
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Dynamic Size:</strong> No fixed maximum capacity
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Memory Efficient:</strong> Only allocates what's needed
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Pointer Overhead:</strong> Extra memory for next pointers
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Operations Guide */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Operations</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-blue-800">Enqueue</h3>
                                    <p className="text-gray-600 text-sm">Create node, link to rear, update rear pointer</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h3 className="font-semibold text-red-800">Dequeue</h3>
                                    <p className="text-gray-600 text-sm">Store front value, move front pointer, deallocate</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-green-800">Peek</h3>
                                    <p className="text-gray-600 text-sm">Return front node value without modification</p>
                                </div>
                            </div>
                        </div>

                        {/* Pointer Management */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Two-Pointer Approach</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Front Pointer:</strong> Points to first node (dequeue end)</div>
                                <div>• <strong>Rear Pointer:</strong> Points to last node (enqueue end)</div>
                                <div>• <strong>Empty Queue:</strong> Both pointers are NULL</div>
                                <div>• <strong>Single Element:</strong> Both pointers point to same node</div>
                                <div>• <strong>Efficiency:</strong> Enables O(1) operations at both ends</div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Process Scheduling:</strong> OS task management</div>
                                <div>• <strong>Network Buffers:</strong> Packet handling in routers</div>
                                <div>• <strong>Print Spooling:</strong> Document queue management</div>
                                <div>• <strong>BFS Traversal:</strong> Graph/tree exploration</div>
                                <div>• <strong>Asynchronous Data:</strong> Producer-consumer patterns</div>
                            </div>
                        </div>

                        {/* Code Example */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Implementation</h2>
                            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{codeExample}</code>
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}