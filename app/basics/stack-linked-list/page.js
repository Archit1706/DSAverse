'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ArrowDown, Link2 } from 'lucide-react';
import Link from 'next/link';

export default function StackLinkedListPage() {
    const [stack, setStack] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [operation, setOperation] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    // Initialize with empty stack
    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const currentStack = [...stack];

        if (operation === 'push') {
            // Step 1: Create new node
            const newNode = {
                id: nodeIdCounter,
                value: value,
                next: currentStack.length > 0 ? currentStack[0].id : null
            };

            steps.push({
                stack: [...currentStack],
                newNode: newNode,
                highlightNodeId: -1,
                operation: 'push',
                value: value,
                error: false,
                explanation: `🔧 Creating new node with value ${value} and next pointer`,
                phase: 'create'
            });

            // Step 2: Update head pointer and link
            currentStack.unshift(newNode);
            steps.push({
                stack: [...currentStack],
                newNode: null,
                highlightNodeId: newNode.id,
                operation: 'push',
                value: value,
                error: false,
                explanation: `✅ Node added as new head. Previous head becomes next node. Stack size: ${currentStack.length}`,
                phase: 'complete'
            });

        } else if (operation === 'pop') {
            if (currentStack.length === 0) {
                steps.push({
                    stack: [...currentStack],
                    newNode: null,
                    highlightNodeId: -1,
                    operation: 'pop',
                    value: null,
                    error: true,
                    explanation: `❌ Stack Underflow! Cannot pop from empty stack.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Identify head node
            const headNode = currentStack[0];
            steps.push({
                stack: [...currentStack],
                newNode: null,
                highlightNodeId: headNode.id,
                operation: 'pop',
                value: headNode.value,
                error: false,
                explanation: `🎯 Identifying head node with value ${headNode.value}`,
                phase: 'identify'
            });

            // Step 2: Update head pointer and remove node
            currentStack.shift();
            steps.push({
                stack: [...currentStack],
                newNode: null,
                highlightNodeId: -1,
                operation: 'pop',
                value: headNode.value,
                error: false,
                explanation: `✅ Removed head node (${headNode.value}). ${currentStack.length > 0 ? 'Next node becomes new head.' : 'Stack is now empty.'} Size: ${currentStack.length}`,
                phase: 'complete'
            });

        } else if (operation === 'peek') {
            if (currentStack.length === 0) {
                steps.push({
                    stack: [...currentStack],
                    newNode: null,
                    highlightNodeId: -1,
                    operation: 'peek',
                    value: null,
                    error: true,
                    explanation: `❌ Cannot peek at empty stack.`,
                    phase: 'error'
                });
                return steps;
            }

            const headValue = currentStack[0].value;
            steps.push({
                stack: [...currentStack],
                newNode: null,
                highlightNodeId: currentStack[0].id,
                operation: 'peek',
                value: headValue,
                error: false,
                explanation: `👀 Peek: Head node contains value ${headValue}`,
                phase: 'complete'
            });
        }

        return steps;
    };

    const handlePush = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const value = parseInt(inputValue);
        const steps = generateSteps('push', value);
        setStepHistory(steps);
        setCurrentStep(0);
        setInputValue('');
        setOperation('push');
        setNodeIdCounter(prev => prev + 1);
    };

    const handlePop = () => {
        const steps = generateSteps('pop');
        setStepHistory(steps);
        setCurrentStep(0);
        setOperation('pop');
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
                    // Apply final state to actual stack
                    if (stepHistory[stepHistory.length - 1]) {
                        setStack(stepHistory[stepHistory.length - 1].stack);
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
        setStack([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
        setOperation('');
        setNodeIdCounter(1);
    };

    const currentState = stepHistory[currentStep] || {
        stack: stack,
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

class StackLinkedList:
    def __init__(self):
        self.head = None        # Reference to top of stack
        self.size = 0          # Track number of elements
    
    def push(self, value):
        # Create new node
        new_node = Node(value)
        
        # Link new node to current head
        new_node.next = self.head
        
        # Update head to point to new node
        self.head = new_node
        self.size += 1
        return value
    
    def pop(self):
        # Check for stack underflow
        if self.head is None:
            raise Exception("Stack Underflow")
        
        # Get value from head node
        value = self.head.value
        
        # Update head to next node
        self.head = self.head.next
        self.size -= 1
        
        # Note: In languages without garbage collection,
        # you would need to free the memory of the old head
        return value
    
    def peek(self):
        # Check if stack is empty
        if self.head is None:
            raise Exception("Stack is Empty")
        
        return self.head.value
    
    def is_empty(self):
        return self.head is None
    
    def get_size(self):
        return self.size
    
    def display(self):
        # Traverse and display all elements
        current = self.head
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
                            Stack: Linked List Implementation
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore how a stack works using dynamic linked list implementation.
                            Watch how nodes are created, linked, and managed with flexible memory allocation.
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Stack Visualization</h2>

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
                                    onClick={handlePush}
                                    disabled={isPlaying}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Push
                                </button>
                                <button
                                    onClick={handlePop}
                                    disabled={isPlaying}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Minus className="h-4 w-4" />
                                    Pop
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

                        {/* Stack Visualization */}
                        <div className="mb-6">
                            <div className="flex justify-center">
                                <div className="relative min-h-96 flex flex-col items-center">
                                    {/* Head pointer */}
                                    <div className="mb-4 flex items-center">
                                        <div className="bg-gray-200 border-2 border-gray-400 rounded-lg px-3 py-2 text-sm font-semibold">
                                            HEAD
                                        </div>
                                        {currentState.stack.length > 0 && (
                                            <ArrowDown className="h-6 w-6 text-gray-600 ml-2" />
                                        )}
                                    </div>

                                    {/* New node being created (during push) */}
                                    {currentState.newNode && (
                                        <div className="mb-4 animate-bounce">
                                            <div className="bg-yellow-300 border-2 border-yellow-500 rounded-lg p-4 flex items-center">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-600 mb-1">Node {currentState.newNode.id}</div>
                                                    <div className="font-bold">{currentState.newNode.value}</div>
                                                </div>
                                                <div className="ml-4 text-xs text-gray-600">
                                                    next: {currentState.newNode.next ? `Node ${currentState.newNode.next}` : 'NULL'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stack nodes */}
                                    <div className="space-y-2">
                                        {currentState.stack.length === 0 ? (
                                            <div className="text-gray-400 text-center py-8">
                                                <div className="w-24 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                                    NULL
                                                </div>
                                            </div>
                                        ) : (
                                            currentState.stack.map((node, index) => (
                                                <div key={node.id} className="flex flex-col items-center">
                                                    {/* Node */}
                                                    <div className={`
                                                        w-32 h-16 flex items-center justify-between rounded-lg border-2 p-3
                                                        transition-all duration-300 transform
                                                        ${getNodeColor(node.id)}
                                                    `}>
                                                        <div className="text-center flex-1">
                                                            <div className="text-xs text-white/80 mb-1">
                                                                Node {node.id}
                                                            </div>
                                                            <div className="font-bold text-white">
                                                                {node.value}
                                                            </div>
                                                        </div>
                                                        <div className="w-4 h-4 bg-white/30 rounded-full flex items-center justify-center">
                                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                                        </div>
                                                    </div>

                                                    {/* Arrow to next node */}
                                                    {index < currentState.stack.length - 1 && (
                                                        <div className="my-1">
                                                            <ArrowDown className="h-5 w-5 text-gray-500" />
                                                        </div>
                                                    )}

                                                    {/* NULL pointer for last node */}
                                                    {index === currentState.stack.length - 1 && (
                                                        <div className="my-1 flex flex-col items-center">
                                                            <ArrowDown className="h-5 w-5 text-gray-500" />
                                                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                NULL
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stack info */}
                            <div className="text-center mt-4 space-y-2">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Size:</span> {currentState.stack.length}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Memory:</span> Dynamic allocation
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Head:</span> {
                                        currentState.stack.length > 0 ?
                                            `Node ${currentState.stack[0].id} (${currentState.stack[0].value})` :
                                            'NULL'
                                    }
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
                                        <div className="text-sm text-gray-600">Push</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Pop</div>
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

                        {/* Advantages vs Array */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Advantages over Array</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Dynamic Size:</strong> No fixed maximum capacity
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Memory Efficient:</strong> Only allocates what&apos;s needed
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>No Overflow:</strong> Limited only by available memory
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Memory Overhead:</strong> Extra storage for pointers
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Operations Guide */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Operations</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-blue-800">Push</h3>
                                    <p className="text-gray-600 text-sm">Create new node, link to current head, update head pointer</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h3 className="font-semibold text-red-800">Pop</h3>
                                    <p className="text-gray-600 text-sm">Store head value, move head to next, deallocate old head</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-green-800">Peek</h3>
                                    <p className="text-gray-600 text-sm">Return head node value without modification</p>
                                </div>
                            </div>
                        </div>

                        {/* Memory Management */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Memory Management</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Dynamic Allocation:</strong> Nodes created on-demand</div>
                                <div>• <strong>Garbage Collection:</strong> Automatic in Java/Python/JS</div>
                                <div>• <strong>Manual Management:</strong> Required in C/C++</div>
                                <div>• <strong>Cache Performance:</strong> Generally worse than arrays</div>
                                <div>• <strong>Memory Fragmentation:</strong> Possible with frequent alloc/dealloc</div>
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