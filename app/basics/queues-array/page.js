'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ArrowRight, ArrowDown } from 'lucide-react';
import Link from 'next/link';

export default function QueueArrayPage() {
    const [queue, setQueue] = useState([]);
    const [front, setFront] = useState(0);
    const [rear, setRear] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [maxSize, setMaxSize] = useState(8);
    const [operation, setOperation] = useState('');

    // Initialize with empty queue
    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const currentQueue = [...queue];
        let currentFront = front;
        let currentRear = rear;
        const size = currentRear - currentFront + 1;

        if (operation === 'enqueue') {
            if (size >= maxSize) {
                steps.push({
                    queue: [...currentQueue],
                    front: currentFront,
                    rear: currentRear,
                    highlightIndex: -1,
                    operation: 'enqueue',
                    value: value,
                    error: true,
                    explanation: `❌ Queue Overflow! Cannot enqueue ${value}. Queue is at maximum capacity (${maxSize}).`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Check capacity
            steps.push({
                queue: [...currentQueue],
                front: currentFront,
                rear: currentRear,
                highlightIndex: -1,
                operation: 'enqueue',
                value: value,
                error: false,
                explanation: `🔍 Checking if queue has space. Current size: ${size}, Max size: ${maxSize}`,
                phase: 'check'
            });

            // Step 2: Move rear pointer and add element
            if (currentQueue.length === 0) {
                currentQueue.push(value);
                currentRear = 0;
                currentFront = 0;
            } else {
                currentQueue.push(value);
                currentRear++;
            }

            steps.push({
                queue: [...currentQueue],
                front: currentFront,
                rear: currentRear,
                highlightIndex: currentRear,
                operation: 'enqueue',
                value: value,
                error: false,
                explanation: `✅ Enqueued ${value} at rear position ${currentRear}. New size: ${currentQueue.length}`,
                phase: 'complete'
            });

        } else if (operation === 'dequeue') {
            if (size <= 0 || currentQueue.length === 0) {
                steps.push({
                    queue: [...currentQueue],
                    front: currentFront,
                    rear: currentRear,
                    highlightIndex: -1,
                    operation: 'dequeue',
                    value: null,
                    error: true,
                    explanation: `❌ Queue Underflow! Cannot dequeue from empty queue.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Identify front element
            const frontValue = currentQueue[0];
            steps.push({
                queue: [...currentQueue],
                front: currentFront,
                rear: currentRear,
                highlightIndex: 0,
                operation: 'dequeue',
                value: frontValue,
                error: false,
                explanation: `🎯 Identifying front element: ${frontValue} at position ${currentFront}`,
                phase: 'identify'
            });

            // Step 2: Remove element and shift
            currentQueue.shift();
            if (currentQueue.length === 0) {
                currentFront = 0;
                currentRear = -1;
            } else {
                currentRear--;
            }

            steps.push({
                queue: [...currentQueue],
                front: currentFront,
                rear: currentRear,
                highlightIndex: -1,
                operation: 'dequeue',
                value: frontValue,
                error: false,
                explanation: `✅ Dequeued ${frontValue} from front. Elements shifted left. New size: ${currentQueue.length}`,
                phase: 'complete'
            });

        } else if (operation === 'peek') {
            if (currentQueue.length === 0) {
                steps.push({
                    queue: [...currentQueue],
                    front: currentFront,
                    rear: currentRear,
                    highlightIndex: -1,
                    operation: 'peek',
                    value: null,
                    error: true,
                    explanation: `❌ Cannot peek at empty queue.`,
                    phase: 'error'
                });
                return steps;
            }

            const frontValue = currentQueue[0];
            steps.push({
                queue: [...currentQueue],
                front: currentFront,
                rear: currentRear,
                highlightIndex: 0,
                operation: 'peek',
                value: frontValue,
                error: false,
                explanation: `👀 Peek: Front element is ${frontValue} at position ${currentFront}`,
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
                        const finalState = stepHistory[stepHistory.length - 1];
                        setQueue(finalState.queue);
                        setFront(finalState.front);
                        setRear(finalState.rear);
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
        setFront(0);
        setRear(-1);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
        setOperation('');
    };

    const currentState = stepHistory[currentStep] || {
        queue: queue,
        front: front,
        rear: rear,
        highlightIndex: -1,
        operation: '',
        value: null,
        error: false,
        explanation: 'Select an operation to begin visualization',
        phase: ''
    };

    const getQueueElementColor = (index) => {
        if (currentState.error) return 'bg-red-400 border-red-500';
        if (currentState.highlightIndex === index) {
            if (currentState.phase === 'identify') return 'bg-yellow-400 border-yellow-500 animate-pulse';
            if (currentState.phase === 'complete') return 'bg-green-400 border-green-500 animate-pulse';
            return 'bg-blue-400 border-blue-500 animate-pulse';
        }
        if (index === 0) return 'bg-blue-300 border-blue-400'; // Front element
        return 'bg-blue-200 border-blue-300';
    };

    const codeExample = `class QueueArray:
    def __init__(self, max_size):
        self.array = [None] * max_size  # Fixed-size array
        self.front = 0                  # Index of front element
        self.rear = -1                  # Index of rear element
        self.size = 0                   # Current number of elements
        self.max_size = max_size       # Maximum capacity
    
    def enqueue(self, value):
        # Check for queue overflow
        if self.size >= self.max_size:
            raise Exception("Queue Overflow")
        
        # Add element at rear
        self.rear = (self.rear + 1) % self.max_size  # Circular increment
        self.array[self.rear] = value
        self.size += 1
        return value
    
    def dequeue(self):
        # Check for queue underflow
        if self.size <= 0:
            raise Exception("Queue Underflow")
        
        # Get front element and move front pointer
        value = self.array[self.front]
        self.array[self.front] = None  # Optional: clear the slot
        self.front = (self.front + 1) % self.max_size  # Circular increment
        self.size -= 1
        return value
    
    def peek(self):
        # Check if queue is empty
        if self.size <= 0:
            raise Exception("Queue is Empty")
        
        return self.array[self.front]
    
    def is_empty(self):
        return self.size == 0
    
    def is_full(self):
        return self.size >= self.max_size
    
    def get_size(self):
        return self.size`;

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
                            Queue: Array Implementation
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore how a queue data structure works using array implementation.
                            Watch enqueue, dequeue, and peek operations in action with FIFO (First In, First Out) principle.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Operations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" />
                                Array Implementation
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
                                <label className="text-sm font-medium text-gray-700">Max Size:</label>
                                <input
                                    type="number"
                                    value={maxSize}
                                    onChange={(e) => setMaxSize(Math.max(1, Math.min(10, parseInt(e.target.value) || 8)))}
                                    min="1"
                                    max="10"
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                            </div>
                        </div>

                        {/* Queue Visualization */}
                        <div className="mb-6">
                            <div className="flex justify-center">
                                <div className="relative">
                                    {/* Queue container */}
                                    <div className="flex items-center min-w-96 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg p-2">
                                        {currentState.queue.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                                Empty Queue
                                            </div>
                                        ) : (
                                            currentState.queue.map((value, index) => (
                                                <div
                                                    key={`${index}-${value}`}
                                                    className={`
                                                        w-16 h-16 flex items-center justify-center text-white font-bold rounded-md border-2 mr-2 
                                                        transition-all duration-300 transform
                                                        ${getQueueElementColor(index)}
                                                    `}
                                                >
                                                    {value}
                                                </div>
                                            ))
                                        )}

                                        {/* Empty slots indication */}
                                        {Array.from({ length: maxSize - currentState.queue.length }).map((_, index) => (
                                            <div
                                                key={`empty-${index}`}
                                                className="w-16 h-16 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-md mr-2"
                                            >
                                                -
                                            </div>
                                        ))}
                                    </div>

                                    {/* Front and Rear pointers */}
                                    {currentState.queue.length > 0 && (
                                        <>
                                            {/* Front pointer */}
                                            <div className="absolute -top-8 left-2 flex flex-col items-center">
                                                <span className="text-xs font-semibold text-blue-600">FRONT</span>
                                                <ArrowDown className="h-4 w-4 text-blue-600" />
                                            </div>

                                            {/* Rear pointer */}
                                            <div className="absolute -top-8 flex flex-col items-center"
                                                style={{ left: `${(currentState.queue.length - 1) * 72 + 10}px` }}>
                                                <span className="text-xs font-semibold text-blue-600">REAR</span>
                                                <ArrowDown className="h-4 w-4 text-blue-600" />
                                            </div>
                                        </>
                                    )}

                                    {/* Flow direction arrow */}
                                    {currentState.queue.length > 1 && (
                                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center text-xs text-gray-600">
                                            <span>FIFO Direction</span>
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Queue info */}
                            <div className="text-center mt-8 space-y-2">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Size:</span> {currentState.queue.length} / {maxSize}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Status:</span> {
                                        currentState.queue.length === 0 ? 'Empty' :
                                            currentState.queue.length === maxSize ? 'Full' : 'Available'
                                    }
                                </div>
                                {currentState.queue.length > 0 && (
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold">Front:</span> {currentState.front},
                                        <span className="font-semibold ml-2">Rear:</span> {currentState.rear}
                                    </div>
                                )}
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
                                        <div className="text-2xl font-bold text-orange-600">O(n)</div>
                                        <div className="text-sm text-gray-600">Dequeue*</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Peek</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">O(n) Space</div>
                                    <div className="text-sm text-gray-600">Fixed array allocation</div>
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                    *O(n) due to shifting elements. Circular array implementation achieves O(1).
                                </div>
                            </div>
                        </div>

                        {/* Operations Guide */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Queue Operations</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-blue-800">Enqueue</h3>
                                    <p className="text-gray-600 text-sm">Add element to the rear of queue</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h3 className="font-semibold text-red-800">Dequeue</h3>
                                    <p className="text-gray-600 text-sm">Remove and return front element</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-green-800">Peek/Front</h3>
                                    <p className="text-gray-600 text-sm">View front element without removing</p>
                                </div>
                            </div>
                        </div>

                        {/* FIFO Principle */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">FIFO Principle</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>First In:</strong> Elements added at the rear</div>
                                <div>• <strong>First Out:</strong> Elements removed from the front</div>
                                <div>• <strong>Order Preservation:</strong> Maintains insertion order</div>
                                <div>• <strong>Fair Processing:</strong> No element jumps the queue</div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Task Scheduling:</strong> OS process scheduling</div>
                                <div>• <strong>BFS Algorithms:</strong> Graph traversal</div>
                                <div>• <strong>Print Queue:</strong> Document printing order</div>
                                <div>• <strong>Buffer:</strong> Data stream processing</div>
                                <div>• <strong>Breadth-First Search:</strong> Tree/graph exploration</div>
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