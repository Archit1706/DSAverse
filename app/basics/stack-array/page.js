'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, ChevronDown, Eye, Copy } from 'lucide-react';
import Link from 'next/link';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function StackArrayPage() {
    const [stack, setStack] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [maxSize, setMaxSize] = useState(8);
    const [operation, setOperation] = useState('');

    // Initialize with empty stack
    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const currentStack = [...stack];

        if (operation === 'push') {
            if (currentStack.length >= maxSize) {
                steps.push({
                    stack: [...currentStack],
                    highlightIndex: -1,
                    operation: 'push',
                    value: value,
                    error: true,
                    explanation: `❌ Stack Overflow! Cannot push ${value}. Stack is at maximum capacity (${maxSize}).`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Check capacity
            steps.push({
                stack: [...currentStack],
                highlightIndex: -1,
                operation: 'push',
                value: value,
                error: false,
                explanation: `🔍 Checking if stack has space. Current size: ${currentStack.length}, Max size: ${maxSize}`,
                phase: 'check'
            });

            // Step 2: Push element
            currentStack.push(value);
            steps.push({
                stack: [...currentStack],
                highlightIndex: currentStack.length - 1,
                operation: 'push',
                value: value,
                error: false,
                explanation: `✅ Pushed ${value} to top of stack. New size: ${currentStack.length}`,
                phase: 'complete'
            });

        } else if (operation === 'pop') {
            if (currentStack.length === 0) {
                steps.push({
                    stack: [...currentStack],
                    highlightIndex: -1,
                    operation: 'pop',
                    value: null,
                    error: true,
                    explanation: `❌ Stack Underflow! Cannot pop from empty stack.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Identify top element
            const topValue = currentStack[currentStack.length - 1];
            steps.push({
                stack: [...currentStack],
                highlightIndex: currentStack.length - 1,
                operation: 'pop',
                value: topValue,
                error: false,
                explanation: `🎯 Identifying top element: ${topValue} at index ${currentStack.length - 1}`,
                phase: 'identify'
            });

            // Step 2: Remove element
            currentStack.pop();
            steps.push({
                stack: [...currentStack],
                highlightIndex: -1,
                operation: 'pop',
                value: topValue,
                error: false,
                explanation: `✅ Popped ${topValue} from stack. New size: ${currentStack.length}`,
                phase: 'complete'
            });

        } else if (operation === 'peek') {
            if (currentStack.length === 0) {
                steps.push({
                    stack: [...currentStack],
                    highlightIndex: -1,
                    operation: 'peek',
                    value: null,
                    error: true,
                    explanation: `❌ Cannot peek at empty stack.`,
                    phase: 'error'
                });
                return steps;
            }

            const topValue = currentStack[currentStack.length - 1];
            steps.push({
                stack: [...currentStack],
                highlightIndex: currentStack.length - 1,
                operation: 'peek',
                value: topValue,
                error: false,
                explanation: `👀 Peek: Top element is ${topValue} at index ${currentStack.length - 1}`,
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
    };

    const currentState = stepHistory[currentStep] || {
        stack: stack,
        highlightIndex: -1,
        operation: '',
        value: null,
        error: false,
        explanation: 'Select an operation to begin visualization',
        phase: ''
    };

    const getStackElementColor = (index) => {
        if (currentState.error) return 'bg-red-400 border-red-500';
        if (currentState.highlightIndex === index) {
            if (currentState.phase === 'identify') return 'bg-yellow-400 border-yellow-500 animate-pulse';
            if (currentState.phase === 'complete') return 'bg-green-400 border-green-500 animate-pulse';
            return 'bg-blue-400 border-blue-500 animate-pulse';
        }
        return 'bg-blue-300 border-blue-400';
    };

    const codeExample = `class StackArray:
    def __init__(self, max_size):
        self.array = [None] * max_size  # Fixed-size array
        self.top = -1                   # Index of top element
        self.max_size = max_size       # Maximum capacity
    
    def push(self, value):
        # Check for stack overflow
        if self.top >= self.max_size - 1:
            raise Exception("Stack Overflow")
        
        # Increment top and add element
        self.top += 1
        self.array[self.top] = value
        return value
    
    def pop(self):
        # Check for stack underflow
        if self.top < 0:
            raise Exception("Stack Underflow")
        
        # Get top element and decrement top
        value = self.array[self.top]
        self.array[self.top] = None  # Optional: clear the slot
        self.top -= 1
        return value
    
    def peek(self):
        # Check if stack is empty
        if self.top < 0:
            raise Exception("Stack is Empty")
        
        return self.array[self.top]
    
    def is_empty(self):
        return self.top < 0
    
    def is_full(self):
        return self.top >= self.max_size - 1
    
    def size(self):
        return self.top + 1`;

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
                            Stack: Array Implementation
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore how a stack data structure works using array implementation.
                            Watch push, pop, and peek operations in action with LIFO (Last In, First Out) principle.
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Stack Visualization</h2>

                        {/* Controls */}
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-blue-800 placeholder:text-gray-700"
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
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                                >
                                    <Eye className="h-4 w-4" />
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
                                    className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-700"
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
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Stack Visualization */}
                        <div className="mb-6">
                            <div className="flex justify-center">
                                <div className="relative">
                                    {/* Stack container */}
                                    <div className="flex flex-col-reverse items-center min-h-96 w-24 bg-gray-100 border-2 border-gray-300 rounded-lg p-2">
                                        {currentState.stack.map((value, index) => (
                                            <div
                                                key={`${index}-${value}`}
                                                className={`
                                                    w-20 h-12 flex items-center justify-center text-white font-bold rounded-md border-2 mb-1 
                                                    transition-all duration-300 transform
                                                    ${getStackElementColor(index)}
                                                `}
                                            >
                                                {value}
                                            </div>
                                        ))}

                                        {/* Empty slots indication */}
                                        {Array.from({ length: maxSize - currentState.stack.length }).map((_, index) => (
                                            <div
                                                key={`empty-${index}`}
                                                className="w-20 h-12 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-md mb-1"
                                            >
                                                {currentState.stack.length + index}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Top pointer */}
                                    {currentState.stack.length > 0 && (
                                        <div className="absolute -right-12 flex items-center"
                                            style={{ bottom: `${currentState.stack.length * 52 - 20}px` }}>
                                            <ChevronDown className="h-6 w-6 text-blue-600 rotate-90" />
                                            <span className="text-sm font-semibold text-blue-600 ml-1">TOP</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stack info */}
                            <div className="text-center mt-4 space-y-2">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Size:</span> {currentState.stack.length} / {maxSize}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Status:</span> {
                                        currentState.stack.length === 0 ? 'Empty' :
                                            currentState.stack.length === maxSize ? 'Full' : 'Available'
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
                                    <div className="text-sm text-gray-600">Fixed array allocation</div>
                                </div>
                            </div>
                        </div>

                        {/* Operations Guide */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Stack Operations</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-blue-800">Push</h3>
                                    <p className="text-gray-600 text-sm">Add element to the top of stack</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h3 className="font-semibold text-red-800">Pop</h3>
                                    <p className="text-gray-600 text-sm">Remove and return top element</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-green-800">Peek/Top</h3>
                                    <p className="text-gray-600 text-sm">View top element without removing</p>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Function Calls:</strong> Managing function call stack</div>
                                <div>• <strong>Undo Operations:</strong> Ctrl+Z functionality</div>
                                <div>• <strong>Expression Evaluation:</strong> Parsing mathematical expressions</div>
                                <div>• <strong>Browser History:</strong> Back button functionality</div>
                                <div>• <strong>Syntax Checking:</strong> Matching parentheses/brackets</div>
                            </div>
                        </div>

                        {/* Code Example */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Implementation</h2>
                            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto text-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-semibold text-gray-600 mb-2">Python</div>
                                    <button onClick={() => navigator.clipboard.writeText(codeExample)} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md flex items-center gap-2">
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </button>
                                </div>
                                <SyntaxHighlighter language="python" style={a11yDark}>
                                    {codeExample}
                                </SyntaxHighlighter>
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}