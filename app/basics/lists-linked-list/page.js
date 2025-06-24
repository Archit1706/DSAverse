'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Code, Clock, Plus, Minus, Search, Link2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ListLinkedListPage() {
    const [list, setList] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');
    const [indexValue, setIndexValue] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [operation, setOperation] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);

    // Initialize with empty list
    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null, index = null) => {
        const steps = [];
        const currentList = [...list];

        if (operation === 'insert') {
            const insertIndex = index !== null ? index : currentList.length;

            // Validate index
            if (insertIndex < 0 || insertIndex > currentList.length) {
                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: -1,
                    traverseIndex: -1,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: true,
                    explanation: `❌ Invalid index ${insertIndex}. Index must be between 0 and ${currentList.length}.`,
                    phase: 'error'
                });
                return steps;
            }

            // Step 1: Create new node
            const newNode = {
                id: nodeIdCounter,
                value: value,
                next: null
            };

            steps.push({
                list: [...currentList],
                newNode: newNode,
                highlightNodeId: -1,
                traverseIndex: -1,
                operation: 'insert',
                value: value,
                insertIndex: insertIndex,
                error: false,
                explanation: `🔧 Creating new node with value ${value}`,
                phase: 'create'
            });

            if (insertIndex === 0) {
                // Insert at head
                if (currentList.length > 0) {
                    newNode.next = currentList[0].id;
                }
                currentList.unshift(newNode);

                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: newNode.id,
                    traverseIndex: -1,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: false,
                    explanation: `✅ Inserted ${value} at head (index 0). Updated head pointer.`,
                    phase: 'complete'
                });
            } else {
                // Traverse to insertion point
                for (let i = 0; i < insertIndex - 1; i++) {
                    steps.push({
                        list: [...currentList],
                        newNode: newNode,
                        highlightNodeId: currentList[i].id,
                        traverseIndex: i,
                        operation: 'insert',
                        value: value,
                        insertIndex: insertIndex,
                        error: false,
                        explanation: `🚶 Traversing to position ${insertIndex}. Currently at index ${i}.`,
                        phase: 'traverse'
                    });
                }

                // Insert the node
                if (insertIndex < currentList.length) {
                    newNode.next = currentList[insertIndex - 1].next;
                    currentList[insertIndex - 1].next = newNode.id;
                } else {
                    currentList[insertIndex - 1].next = newNode.id;
                }
                currentList.splice(insertIndex, 0, newNode);

                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: newNode.id,
                    traverseIndex: insertIndex,
                    operation: 'insert',
                    value: value,
                    insertIndex: insertIndex,
                    error: false,
                    explanation: `✅ Inserted ${value} at index ${insertIndex}. Updated pointers. List size: ${currentList.length}`,
                    phase: 'complete'
                });
            }

        } else if (operation === 'delete') {
            const deleteIndex = index !== null ? index : currentList.length - 1;

            // Validate index
            if (deleteIndex < 0 || deleteIndex >= currentList.length) {
                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: -1,
                    traverseIndex: -1,
                    operation: 'delete',
                    value: null,
                    deleteIndex: deleteIndex,
                    error: true,
                    explanation: `❌ Invalid index ${deleteIndex}. Index must be between 0 and ${currentList.length - 1}.`,
                    phase: 'error'
                });
                return steps;
            }

            if (deleteIndex === 0) {
                // Delete head
                const deletedNode = currentList[0];
                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: deletedNode.id,
                    traverseIndex: 0,
                    operation: 'delete',
                    value: deletedNode.value,
                    deleteIndex: deleteIndex,
                    error: false,
                    explanation: `🎯 Deleting head node with value ${deletedNode.value}`,
                    phase: 'identify'
                });

                currentList.shift();
                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: -1,
                    traverseIndex: -1,
                    operation: 'delete',
                    value: deletedNode.value,
                    deleteIndex: deleteIndex,
                    error: false,
                    explanation: `✅ Deleted head node (${deletedNode.value}). Updated head pointer. Size: ${currentList.length}`,
                    phase: 'complete'
                });
            } else {
                // Traverse to the node before deletion point
                for (let i = 0; i < deleteIndex - 1; i++) {
                    steps.push({
                        list: [...currentList],
                        newNode: null,
                        highlightNodeId: currentList[i].id,
                        traverseIndex: i,
                        operation: 'delete',
                        value: null,
                        deleteIndex: deleteIndex,
                        error: false,
                        explanation: `🚶 Traversing to position before deletion. Currently at index ${i}.`,
                        phase: 'traverse'
                    });
                }

                // Identify node to delete
                const deletedNode = currentList[deleteIndex];
                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: deletedNode.id,
                    traverseIndex: deleteIndex,
                    operation: 'delete',
                    value: deletedNode.value,
                    deleteIndex: deleteIndex,
                    error: false,
                    explanation: `🎯 Found node to delete at index ${deleteIndex}: ${deletedNode.value}`,
                    phase: 'identify'
                });

                // Update pointers and remove
                if (deleteIndex < currentList.length - 1) {
                    currentList[deleteIndex - 1].next = currentList[deleteIndex].next;
                } else {
                    currentList[deleteIndex - 1].next = null;
                }
                currentList.splice(deleteIndex, 1);

                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: -1,
                    traverseIndex: -1,
                    operation: 'delete',
                    value: deletedNode.value,
                    deleteIndex: deleteIndex,
                    error: false,
                    explanation: `✅ Deleted node (${deletedNode.value}). Updated pointers. Size: ${currentList.length}`,
                    phase: 'complete'
                });
            }

        } else if (operation === 'search') {
            // Step 1: Start search
            steps.push({
                list: [...currentList],
                newNode: null,
                highlightNodeId: -1,
                traverseIndex: -1,
                operation: 'search',
                value: value,
                searchIndex: 0,
                error: false,
                explanation: `🔍 Starting search for value ${value} from head...`,
                phase: 'start'
            });

            // Step 2-n: Search through list
            for (let i = 0; i < currentList.length; i++) {
                if (currentList[i].value === value) {
                    steps.push({
                        list: [...currentList],
                        newNode: null,
                        highlightNodeId: currentList[i].id,
                        traverseIndex: i,
                        operation: 'search',
                        value: value,
                        searchIndex: i,
                        error: false,
                        explanation: `✅ Found ${value} at index ${i}! Search completed after ${i + 1} traversal${i === 0 ? '' : 's'}.`,
                        phase: 'found'
                    });
                    return steps;
                } else {
                    steps.push({
                        list: [...currentList],
                        newNode: null,
                        highlightNodeId: currentList[i].id,
                        traverseIndex: i,
                        operation: 'search',
                        value: value,
                        searchIndex: i,
                        error: false,
                        explanation: `🔍 Checking index ${i}: ${currentList[i].value} ≠ ${value}. Moving to next node...`,
                        phase: 'searching'
                    });
                }
            }

            // Not found
            steps.push({
                list: [...currentList],
                newNode: null,
                highlightNodeId: -1,
                traverseIndex: -1,
                operation: 'search',
                value: value,
                searchIndex: -1,
                error: true,
                explanation: `❌ Value ${value} not found after traversing all ${currentList.length} nodes.`,
                phase: 'not_found'
            });

        } else if (operation === 'access') {
            const accessIndex = index !== null ? index : 0;

            // Validate index
            if (accessIndex < 0 || accessIndex >= currentList.length) {
                steps.push({
                    list: [...currentList],
                    newNode: null,
                    highlightNodeId: -1,
                    traverseIndex: -1,
                    operation: 'access',
                    value: null,
                    accessIndex: accessIndex,
                    error: true,
                    explanation: `❌ Invalid index ${accessIndex}. Index must be between 0 and ${currentList.length - 1}.`,
                    phase: 'error'
                });
                return steps;
            }

            // Traverse to the access point
            for (let i = 0; i <= accessIndex; i++) {
                if (i === accessIndex) {
                    steps.push({
                        list: [...currentList],
                        newNode: null,
                        highlightNodeId: currentList[i].id,
                        traverseIndex: i,
                        operation: 'access',
                        value: currentList[i].value,
                        accessIndex: accessIndex,
                        error: false,
                        explanation: `✅ Accessed index ${accessIndex}: ${currentList[i].value}. Required ${accessIndex + 1} traversal${accessIndex === 0 ? '' : 's'}.`,
                        phase: 'complete'
                    });
                } else {
                    steps.push({
                        list: [...currentList],
                        newNode: null,
                        highlightNodeId: currentList[i].id,
                        traverseIndex: i,
                        operation: 'access',
                        value: null,
                        accessIndex: accessIndex,
                        error: false,
                        explanation: `🚶 Traversing to index ${accessIndex}. Currently at index ${i}.`,
                        phase: 'traverse'
                    });
                }
            }
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
        setNodeIdCounter(prev => prev + 1);
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
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
        setOperation('');
        setNodeIdCounter(1);
    };

    const currentState = stepHistory[currentStep] || {
        list: list,
        newNode: null,
        highlightNodeId: -1,
        traverseIndex: -1,
        operation: '',
        value: null,
        error: false,
        explanation: 'Select an operation to begin visualization',
        phase: ''
    };

    const getNodeColor = (nodeId) => {
        if (currentState.error && currentState.highlightNodeId === nodeId) return 'bg-red-400 border-red-500';
        if (currentState.highlightNodeId === nodeId) {
            if (currentState.phase === 'identify' || currentState.phase === 'searching' || currentState.phase === 'traverse')
                return 'bg-yellow-400 border-yellow-500 animate-pulse';
            if (currentState.phase === 'complete' || currentState.phase === 'found')
                return 'bg-green-400 border-green-500 animate-pulse';
            return 'bg-blue-400 border-blue-500 animate-pulse';
        }
        return 'bg-blue-300 border-blue-400';
    };

    const codeExample = `class Node:
    def __init__(self, value):
        self.value = value      # Data stored in the node
        self.next = None        # Reference to next node

class LinkedList:
    def __init__(self):
        self.head = None        # Reference to first node
        self.size = 0          # Track number of elements
    
    def insert(self, index, value):
        # Validate index
        if index < 0 or index > self.size:
            raise IndexError("Index out of bounds")
        
        # Create new node
        new_node = Node(value)
        
        if index == 0:
            # Insert at head
            new_node.next = self.head
            self.head = new_node
        else:
            # Traverse to position before insertion
            current = self.head
            for i in range(index - 1):
                current = current.next
            
            # Insert the node
            new_node.next = current.next
            current.next = new_node
        
        self.size += 1
    
    def delete(self, index):
        # Validate index
        if index < 0 or index >= self.size:
            raise IndexError("Index out of bounds")
        
        if index == 0:
            # Delete head
            value = self.head.value
            self.head = self.head.next
        else:
            # Traverse to position before deletion
            current = self.head
            for i in range(index - 1):
                current = current.next
            
            # Get value and update pointer
            value = current.next.value
            current.next = current.next.next
        
        self.size -= 1
        return value
    
    def search(self, value):
        # Linear search through the list
        current = self.head
        index = 0
        
        while current:
            if current.value == value:
                return index
            current = current.next
            index += 1
        
        return -1  # Not found
    
    def access(self, index):
        # Validate index
        if index < 0 or index >= self.size:
            raise IndexError("Index out of bounds")
        
        # Traverse to the index
        current = self.head
        for i in range(index):
            current = current.next
        
        return current.value
    
    def append(self, value):
        # Insert at the end
        self.insert(self.size, value)
    
    def prepend(self, value):
        # Insert at the beginning
        self.insert(0, value)
    
    def get_size(self):
        return self.size
    
    def display(self):
        # Return list of all elements
        elements = []
        current = self.head
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
                            List: Linked List Implementation
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Explore how linked lists work with dynamic node management, pointer manipulation,
                            and sequential access patterns. Understanding the foundation of many advanced data structures.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Operations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Link2 className="h-4 w-4" />
                                Dynamic Nodes
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                O(n) Access
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Linked List Visualization</h2>

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

                        {/* Linked List Visualization */}
                        <div className="mb-6">
                            <div className="flex justify-center">
                                <div className="space-y-4 w-full max-w-4xl">
                                    {/* Head pointer */}
                                    <div className="flex items-center">
                                        <div className="bg-gray-200 border-2 border-gray-400 rounded-lg px-3 py-2 text-sm font-semibold">
                                            HEAD
                                        </div>
                                        {currentState.list.length > 0 && (
                                            <ArrowRight className="h-6 w-6 text-gray-600 ml-2" />
                                        )}
                                    </div>

                                    {/* New node being created (during insert) */}
                                    {currentState.newNode && (
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-bounce">
                                                <div className="bg-yellow-300 border-2 border-yellow-500 rounded-lg p-3 flex items-center">
                                                    <div className="text-center mr-3">
                                                        <div className="text-xs text-gray-600 mb-1">New Node</div>
                                                        <div className="font-bold">{currentState.newNode.value}</div>
                                                    </div>
                                                    <div className="w-4 h-4 bg-yellow-200 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Linked list nodes */}
                                    <div className="min-h-20">
                                        {currentState.list.length === 0 ? (
                                            <div className="text-gray-400 text-center py-8">
                                                <div className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                                                    Empty List
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-2">
                                                {currentState.list.map((node, index) => (
                                                    <div key={node.id} className="flex items-center">
                                                        {/* Node */}
                                                        <div className={`
                                                            w-24 h-16 flex items-center justify-between rounded-lg border-2 p-2
                                                            transition-all duration-300 transform
                                                            ${getNodeColor(node.id)}
                                                        `}>
                                                            <div className="text-center flex-1">
                                                                <div className="text-xs text-white/80 mb-1">
                                                                    [{index}]
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
                                                        {index < currentState.list.length - 1 && (
                                                            <ArrowRight className="h-4 w-4 text-gray-500 mx-1" />
                                                        )}

                                                        {/* NULL pointer for last node */}
                                                        {index === currentState.list.length - 1 && (
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

                                    {/* Index indicators */}
                                    {currentState.list.length > 0 && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="text-xs text-gray-500 font-medium">Indices:</div>
                                            {currentState.list.map((_, index) => (
                                                <div key={index} className="flex items-center">
                                                    <div className="w-24 text-center">
                                                        <div className={`text-xs font-semibold ${currentState.traverseIndex === index ? 'text-blue-600' : 'text-gray-500'
                                                            }`}>
                                                            {index}
                                                        </div>
                                                    </div>
                                                    {index < currentState.list.length - 1 && (
                                                        <div className="w-6"></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* List info */}
                            <div className="text-center mt-4 space-y-2">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Size:</span> {currentState.list.length}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Memory:</span> Dynamic allocation (node-based)
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Head:</span> {
                                        currentState.list.length > 0 ?
                                            `Node with value ${currentState.list[0].value}` :
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-orange-600">O(n)</div>
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
                                        <div className="text-xl font-bold text-green-600">O(1)*</div>
                                        <div className="text-sm text-gray-600">Head Insert*</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">O(n) Space</div>
                                    <div className="text-sm text-gray-600">Dynamic allocation + pointer overhead</div>
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                    *Operations at head are O(1), others require traversal
                                </div>
                            </div>
                        </div>

                        {/* Operations Guide */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Operations</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-blue-800">Insert</h3>
                                    <p className="text-gray-600 text-sm">Create node, traverse to position, update pointers</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h3 className="font-semibold text-red-800">Delete</h3>
                                    <p className="text-gray-600 text-sm">Traverse to position, update pointers, deallocate</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-green-800">Access</h3>
                                    <p className="text-gray-600 text-sm">Sequential traversal from head to index</p>
                                </div>
                                <div className="border-l-4 border-purple-500 pl-4">
                                    <h3 className="font-semibold text-purple-800">Search</h3>
                                    <p className="text-gray-600 text-sm">Linear traversal comparing values</p>
                                </div>
                            </div>
                        </div>

                        {/* Comparison with Array */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">vs Array Implementation</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-green-800 mb-2">Advantages</h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div>• O(1) insertion/deletion at head</div>
                                        <div>• Dynamic size (no capacity limit)</div>
                                        <div>• Memory efficient (allocate as needed)</div>
                                        <div>• No shifting required for insertions</div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-800 mb-2">Disadvantages</h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div>• O(n) random access by index</div>
                                        <div>• Extra memory for pointers</div>
                                        <div>• Poor cache locality</div>
                                        <div>• No direct indexing benefits</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Traversal Patterns */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Traversal Patterns</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Sequential Access:</strong> Follow next pointers from head</div>
                                <div>• <strong>No Random Access:</strong> Must traverse to reach any index</div>
                                <div>• <strong>Forward Only:</strong> Standard singly-linked list</div>
                                <div>• <strong>Termination:</strong> Stop when next pointer is NULL</div>
                                <div>• <strong>Index Tracking:</strong> Manual counting during traversal</div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Memory Pools:</strong> Dynamic memory management</div>
                                <div>• <strong>Music Playlists:</strong> Sequential playback</div>
                                <div>• <strong>Undo Systems:</strong> Action history chains</div>
                                <div>• <strong>Sparse Data:</strong> Representing non-contiguous data</div>
                                <div>• <strong>Graph Adjacency:</strong> Edge lists in graph representations</div>
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