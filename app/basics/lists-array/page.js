'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, Search, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

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

    // Initialize with empty list
    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null, index = null) => {
        const steps = [];
        const currentList = [...list];
        let currentCapacity = capacity;

        if (operation === 'insert') {
            const insertIndex = index !== null ? index : currentList.length;

            // Validate index
            if (insertIndex < 0 || insertIndex > currentList.length) {
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: -1,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: true,
                    explanation: `❌ Invalid index ${insertIndex}. Index must be between 0 and ${currentList.length}.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Check capacity
            if (currentList.length >= currentCapacity) {
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: -1,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: false,
                    explanation: `🔍 List is full (${currentList.length}/${currentCapacity}). Need to resize array.`,
                    phase: 'check'
                });

                // Step 2: Resize array
                currentCapacity *= 2;
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: -1,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: false,
                    explanation: `🔄 Resized array from ${currentCapacity / 2} to ${currentCapacity}. Copying existing elements.`,
                    phase: 'resize'
                });
            } else {
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: -1,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: false,
                    explanation: `🔍 Array has space (${currentList.length}/${currentCapacity}). Proceeding with insertion.`,
                    phase: 'check'
                });
            }

            // Step 3: Shift elements if needed
            if (insertIndex < currentList.length) {
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: insertIndex,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: false,
                    explanation: `↪️ Shifting elements from index ${insertIndex} to the right to make space.`,
                    phase: 'shift'
                });
            }

            // Step 4: Insert element
            currentList.splice(insertIndex, 0, value);
            steps.push({
                list: [...currentList],
                capacity: currentCapacity,
                highlightIndex: insertIndex,
                operation: 'insert',
                value: value,
                insertIndex: insertIndex,
                error: false,
                explanation: `✅ Inserted ${value} at index ${insertIndex}. List size: ${currentList.length}`,
                phase: 'complete'
            });

        } else if (operation === 'delete') {
            const deleteIndex = index !== null ? index : currentList.length - 1;

            // Validate index
            if (deleteIndex < 0 || deleteIndex >= currentList.length) {
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: -1,
                    operation: 'delete',
                    value: null,
                    deleteIndex: deleteIndex,
                    error: true,
                    explanation: `❌ Invalid index ${deleteIndex}. Index must be between 0 and ${currentList.length - 1}.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Identify element
            const deleteValue = currentList[deleteIndex];
            steps.push({
                list: [...currentList],
                capacity: currentCapacity,
                highlightIndex: deleteIndex,
                operation: 'delete',
                value: deleteValue,
                deleteIndex: deleteIndex,
                error: false,
                explanation: `🎯 Identifying element at index ${deleteIndex}: ${deleteValue}`,
                phase: 'identify'
            });

            // Step 2: Remove and shift
            currentList.splice(deleteIndex, 1);
            steps.push({
                list: [...currentList],
                capacity: currentCapacity,
                highlightIndex: -1,
                operation: 'delete',
                value: deleteValue,
                deleteIndex: deleteIndex,
                error: false,
                explanation: `✅ Removed ${deleteValue}. ${deleteIndex < currentList.length ? 'Shifted remaining elements left.' : ''} List size: ${currentList.length}`,
                phase: 'complete'
            });

        } else if (operation === 'search') {
            // Step 1: Start search
            steps.push({
                list: [...currentList],
                capacity: currentCapacity,
                highlightIndex: -1,
                operation: 'search',
                value: value,
                searchIndex: 0,
                error: false,
                explanation: `🔍 Starting linear search for value ${value}...`,
                phase: 'start'
            });

            // Step 2-n: Search through array
            for (let i = 0; i < currentList.length; i++) {
                if (currentList[i] === value) {
                    steps.push({
                        list: [...currentList],
                        capacity: currentCapacity,
                        highlightIndex: i,
                        operation: 'search',
                        value: value,
                        searchIndex: i,
                        error: false,
                        explanation: `✅ Found ${value} at index ${i}! Search completed in ${i + 1} comparison${i === 0 ? '' : 's'}.`,
                        phase: 'found'
                    });
                    return steps;
                } else {
                    steps.push({
                        list: [...currentList],
                        capacity: currentCapacity,
                        highlightIndex: i,
                        operation: 'search',
                        value: value,
                        searchIndex: i,
                        error: false,
                        explanation: `🔍 Checking index ${i}: ${currentList[i]} ≠ ${value}. Continue searching...`,
                        phase: 'searching'
                    });
                }
            }

            // Not found
            steps.push({
                list: [...currentList],
                capacity: currentCapacity,
                highlightIndex: -1,
                operation: 'search',
                value: value,
                searchIndex: -1,
                error: true,
                explanation: `❌ Value ${value} not found after checking all ${currentList.length} elements.`,
                phase: 'not_found'
            });

        } else if (operation === 'access') {
            const accessIndex = index !== null ? index : 0;

            // Validate index
            if (accessIndex < 0 || accessIndex >= currentList.length) {
                steps.push({
                    list: [...currentList],
                    capacity: currentCapacity,
                    highlightIndex: -1,
                    operation: 'access',
                    value: null,
                    accessIndex: accessIndex,
                    error: true,
                    explanation: `❌ Invalid index ${accessIndex}. Index must be between 0 and ${currentList.length - 1}.`,
                    phase: 'error'
                });
                return steps;
            }

            const accessValue = currentList[accessIndex];
            steps.push({
                list: [...currentList],
                capacity: currentCapacity,
                highlightIndex: accessIndex,
                operation: 'access',
                value: accessValue,
                accessIndex: accessIndex,
                error: false,
                explanation: `✅ Direct access at index ${accessIndex}: ${accessValue}. O(1) random access!`,
                phase: 'complete'
            });
        }

        return steps;
    };

    const handleInsert = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const value = parseInt(inputValue);
        const index = indexValue === '' ? null : parseInt(indexValue);
        const steps = generateSteps('insert', value, index);
        setStepHistory(steps);
        setCurrentStep(0);
        setInputValue('');
        setIndexValue('');
        setOperation('insert');
    };

    const handleDelete = () => {
        const index = indexValue === '' ? null : parseInt(indexValue);
        const steps = generateSteps('delete', null, index);
        setStepHistory(steps);
        setCurrentStep(0);
        setIndexValue('');
        setOperation('delete');
    };

    const handleSearch = () => {
        if (!searchValue || isNaN(searchValue)) return;
        const value = parseInt(searchValue);
        const steps = generateSteps('search', value);
        setStepHistory(steps);
        setCurrentStep(0);
        setSearchValue('');
        setOperation('search');
    };

    const handleAccess = () => {
        if (indexValue === '' || isNaN(indexValue)) return;
        const index = parseInt(indexValue);
        const steps = generateSteps('access', null, index);
        setStepHistory(steps);
        setCurrentStep(0);
        setIndexValue('');
        setOperation('access');
    };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);

        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= stepHistory.length - 1) {
                    setIsPlaying(false);
                    clearInterval(interval);
                    // Apply final state to actual list
                    if (stepHistory[stepHistory.length - 1]) {
                        const finalState = stepHistory[stepHistory.length - 1];
                        setList(finalState.list);
                        setCapacity(finalState.capacity);
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
        setList([]);
        setCapacity(4);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
        setOperation('');
    };

    const currentState = stepHistory[currentStep] || {
        list: list,
        capacity: capacity,
        highlightIndex: -1,
        operation: '',
        value: null,
        error: false,
        explanation: 'Select an operation to begin visualization',
        phase: ''
    };

    const getElementColor = (index) => {
        if (currentState.error && currentState.highlightIndex === index) return 'bg-red-400 border-red-500';
        if (currentState.highlightIndex === index) {
            if (currentState.phase === 'identify' || currentState.phase === 'searching') return 'bg-yellow-400 border-yellow-500 animate-pulse';
            if (currentState.phase === 'complete' || currentState.phase === 'found') return 'bg-green-400 border-green-500 animate-pulse';
            if (currentState.phase === 'shift') return 'bg-orange-400 border-orange-500 animate-pulse';
            return 'bg-blue-400 border-blue-500 animate-pulse';
        }
        return 'bg-blue-300 border-blue-400';
    };

    const codeExample = `class DynamicArray:
    def __init__(self, initial_capacity=4):
        self.data = [None] * initial_capacity  # Fixed-size array
        self.size = 0                          # Number of elements
        self.capacity = initial_capacity       # Current capacity
    
    def _resize(self):
        # Double the capacity when array is full
        old_capacity = self.capacity
        self.capacity *= 2
        new_data = [None] * self.capacity
        
        # Copy existing elements
        for i in range(self.size):
            new_data[i] = self.data[i]
        
        self.data = new_data
        print(f"Resized from {old_capacity} to {self.capacity}")
    
    def insert(self, index, value):
        # Validate index
        if index < 0 or index > self.size:
            raise IndexError("Index out of bounds")
        
        # Resize if necessary
        if self.size >= self.capacity:
            self._resize()
        
        # Shift elements to the right
        for i in range(self.size, index, -1):
            self.data[i] = self.data[i - 1]
        
        # Insert new element
        self.data[index] = value
        self.size += 1
    
    def delete(self, index):
        # Validate index
        if index < 0 or index >= self.size:
            raise IndexError("Index out of bounds")
        
        # Get value to return
        value = self.data[index]
        
        # Shift elements to the left
        for i in range(index, self.size - 1):
            self.data[i] = self.data[i + 1]
        
        self.size -= 1
        return value
    
    def search(self, value):
        # Linear search through the array
        for i in range(self.size):
            if self.data[i] == value:
                return i
        return -1  # Not found
    
    def access(self, index):
        # Direct access by index
        if index < 0 or index >= self.size:
            raise IndexError("Index out of bounds")
        return self.data[index]
    
    def append(self, value):
        # Insert at the end
        self.insert(self.size, value)
    
    def get_size(self):
        return self.size
    
    def get_capacity(self):
        return self.capacity`;

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
                            List: Array Implementation
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore how dynamic arrays work with automatic resizing, insertion, deletion, and search operations.
                            Understanding the foundation of ArrayList, Vector, and Python lists.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Operations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <ArrowUpDown className="h-4 w-4" />
                                Dynamic Resizing
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                O(1) Access
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dynamic Array Visualization</h2>

                        {/* Controls */}
                        <div className="mb-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Value"
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="number"
                                    value={indexValue}
                                    onChange={(e) => setIndexValue(e.target.value)}
                                    placeholder="Index (optional)"
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleInsert}
                                    disabled={isPlaying}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Insert
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isPlaying}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Minus className="h-4 w-4" />
                                    Delete
                                </button>
                                <button
                                    onClick={handleAccess}
                                    disabled={isPlaying}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                                >
                                    Access
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="Search value"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isPlaying}
                                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Search className="h-4 w-4" />
                                    Search
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

                        {/* Array Visualization */}
                        <div className="mb-6">
                            <div className="flex justify-center">
                                <div className="space-y-4">
                                    {/* Array representation */}
                                    <div className="flex items-center justify-center min-h-20">
                                        {Array.from({ length: currentState.capacity }).map((_, index) => (
                                            <div
                                                key={index}
                                                className={`
                                                    w-16 h-16 flex flex-col items-center justify-center border-2 mr-1
                                                    transition-all duration-300 transform
                                                    ${index < currentState.list.length ?
                                                        getElementColor(index) :
                                                        'bg-gray-100 border-gray-300 border-dashed'
                                                    }
                                                `}
                                            >
                                                {index < currentState.list.length ? (
                                                    <>
                                                        <div className="text-white font-bold">
                                                            {currentState.list[index]}
                                                        </div>
                                                        <div className="text-xs text-white/80">
                                                            [{index}]
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-gray-400">
                                                        [{index}]
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Size indicator */}
                                    {currentState.list.length > 0 && (
                                        <div className="flex justify-center">
                                            <div className="flex">
                                                {Array.from({ length: currentState.capacity }).map((_, index) => (
                                                    <div key={index} className="w-16 mr-1 flex justify-center">
                                                        {index < currentState.list.length && (
                                                            <div className="text-xs text-blue-600 font-semibold">
                                                                {index === 0 && '▲ size'}
                                                                {index === currentState.list.length - 1 && index > 0 && '▲'}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Array info */}
                            <div className="text-center mt-4 space-y-2">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Size:</span> {currentState.list.length} /
                                    <span className="font-semibold"> Capacity:</span> {currentState.capacity}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Load Factor:</span> {
                                        currentState.capacity > 0 ?
                                            `${((currentState.list.length / currentState.capacity) * 100).toFixed(1)}%` :
                                            '0%'
                                    }
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Memory:</span> {currentState.capacity * 4} bytes (assuming 4 bytes per integer)
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Access</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-orange-600">O(n)</div>
                                        <div className="text-sm text-gray-600">Insert/Delete</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-orange-600">O(n)</div>
                                        <div className="text-sm text-gray-600">Search</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-orange-600">O(n)*</div>
                                        <div className="text-sm text-gray-600">Append*</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">O(n) Space</div>
                                    <div className="text-sm text-gray-600">Dynamic allocation with capacity buffer</div>
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                    *Append is O(1) amortized due to doubling strategy
                                </div>
                            </div>
                        </div>

                        {/* Operations Guide */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Operations</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-blue-800">Insert</h3>
                                    <p className="text-gray-600 text-sm">Add element at specific index, shift others right</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h3 className="font-semibold text-red-800">Delete</h3>
                                    <p className="text-gray-600 text-sm">Remove element at index, shift others left</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-green-800">Access</h3>
                                    <p className="text-gray-600 text-sm">Direct access by index calculation</p>
                                </div>
                                <div className="border-l-4 border-purple-500 pl-4">
                                    <h3 className="font-semibold text-purple-800">Search</h3>
                                    <p className="text-gray-600 text-sm">Linear scan through elements</p>
                                </div>
                            </div>
                        </div>

                        {/* Resizing Strategy */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Dynamic Resizing</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Growth Factor:</strong> Double capacity when full</div>
                                <div>• <strong>Amortized Cost:</strong> O(1) for append operations</div>
                                <div>• <strong>Memory Trade-off:</strong> Some wasted space for performance</div>
                                <div>• <strong>Copy Cost:</strong> O(n) when resizing occurs</div>
                                <div>• <strong>Frequency:</strong> Resizing becomes less frequent as array grows</div>
                            </div>
                        </div>

                        {/* Advantages/Disadvantages */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Pros & Cons</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-green-800 mb-2">Advantages</h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div>• O(1) random access by index</div>
                                        <div>• Cache-friendly memory layout</div>
                                        <div>• Dynamic size without manual management</div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-800 mb-2">Disadvantages</h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div>• Expensive insertion/deletion in middle</div>
                                        <div>• Memory reallocation overhead</div>
                                        <div>• Wasted space when not at capacity</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>ArrayList (Java):</strong> Resizable arrays</div>
                                <div>• <strong>Python Lists:</strong> Dynamic arrays with extra features</div>
                                <div>• <strong>JavaScript Arrays:</strong> Dynamic and sparse</div>
                                <div>• <strong>C++ vector:</strong> High-performance dynamic arrays</div>
                                <div>• <strong>Databases:</strong> Index structures and record storage</div>
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