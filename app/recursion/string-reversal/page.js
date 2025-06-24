"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Type, ChevronRight } from 'lucide-react';

const StringReversalVisualizer = () => {
    const [inputString, setInputString] = useState("HELLO");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1200);

    // Generate step history for visualization
    const generateSteps = (str) => {
        const steps = [];

        // Helper function to simulate recursive calls
        const reverseRecursive = (s, index = 0, callStack = []) => {
            // Add current call to stack
            const currentCall = {
                function: `reverse("${s.substring(index)}")`,
                character: index < s.length ? s[index] : null,
                remaining: s.substring(index + 1),
                index: index,
                phase: 'forward'
            };

            const newCallStack = [...callStack, currentCall];

            steps.push({
                callStack: newCallStack,
                currentIndex: index,
                processedString: s.substring(0, index),
                currentChar: index < s.length ? s[index] : null,
                remaining: s.substring(index + 1),
                phase: 'forward',
                explanation: index >= s.length
                    ? `Base case reached: empty string returns empty string`
                    : `Processing character '${s[index]}' at index ${index}, then reverse remaining: "${s.substring(index + 1)}"`
            });

            // Base case
            if (index >= s.length) {
                // Start unwinding
                for (let i = newCallStack.length - 1; i >= 0; i--) {
                    const call = newCallStack[i];
                    if (call.character !== null) {
                        call.phase = 'backward';
                        call.result = s.substring(i + 1).split('').reverse().join('') + call.character;

                        steps.push({
                            callStack: newCallStack.slice(0, i + 1),
                            currentIndex: call.index,
                            processedString: s.substring(0, call.index),
                            currentChar: call.character,
                            remaining: call.remaining,
                            phase: 'backward',
                            result: call.result,
                            explanation: `Returning: reverse("${call.remaining}") + "${call.character}" = "${call.result}"`
                        });
                    }
                }
                return;
            }

            // Recursive case - continue to next character
            reverseRecursive(s, index + 1, newCallStack);
        };

        reverseRecursive(str);
        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(inputString);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [inputString]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) {
            setCurrentStep(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        callStack: [],
        explanation: 'Enter a string and click Start to begin the visualization',
        phase: 'forward',
        currentChar: null,
        remaining: '',
        result: ''
    };

    const reverseString = (str) => {
        if (str.length <= 1) return str;
        return reverseString(str.substring(1)) + str[0];
    };

    const codeExample = `def reverse_string(s):
    # Base case: empty string or single character
    if len(s) <= 1:
        return s
    
    # Recursive case: reverse the rest + first character
    return reverse_string(s[1:]) + s[0]

# Example usage
result = reverse_string("${inputString}")  # Returns "${reverseString(inputString)}"`;

    const javaScriptCode = `function reverseString(s) {
    // Base case
    if (s.length <= 1) {
        return s;
    }
    
    // Recursive case
    return reverseString(s.substring(1)) + s[0];
}

// Example usage
const result = reverseString("${inputString}"); // Returns "${reverseString(inputString)}"`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/recursion" className="flex items-center text-white hover:text-green-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Recursion
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            String Reversal Recursion
                        </h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch how recursion processes each character and builds the reversed string from the end.
                        </p>
                        <div className="flex justify-center items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Type className="h-4 w-4" />
                                Character by Character
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                Time: O(n)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Controls</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Input String
                                    </label>
                                    <input
                                        type="text"
                                        value={inputString}
                                        onChange={(e) => setInputString(e.target.value.toUpperCase().substring(0, 10))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        disabled={isPlaying}
                                        placeholder="Enter text (max 10 chars)"
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        Reversed: "{reverseString(inputString)}"
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Speed: {speed}ms
                                    </label>
                                    <input
                                        type="range"
                                        min="600"
                                        max="2000"
                                        step="200"
                                        value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePlay}
                                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                                        disabled={!inputString.trim()}
                                    >
                                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isPlaying ? 'Pause' : 'Start'}
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Step Explanation */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Current Step</h3>
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600">
                                    Step {currentStep + 1} of {stepHistory.length}
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-green-800 text-sm">
                                        {currentState.explanation}
                                    </p>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Phase: </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${currentState.phase === 'forward'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {currentState.phase === 'forward' ? 'Going Deeper' : 'Building Result'}
                                    </span>
                                </div>
                                {currentState.result && (
                                    <div className="text-sm">
                                        <span className="font-medium text-gray-700">Current Result: </span>
                                        <span className="font-mono text-green-700">"{currentState.result}"</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* String Processing Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <Type className="h-5 w-5 mr-2 text-green-600" />
                                String Processing Visualization
                            </h3>

                            {/* Character visualization */}
                            <div className="mb-8">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Original String</h4>
                                <div className="flex justify-center items-center space-x-2 mb-6">
                                    {inputString.split('').map((char, index) => (
                                        <div
                                            key={index}
                                            className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center font-mono text-lg font-bold transition-all duration-500 ${currentState.currentIndex === index
                                                ? 'bg-yellow-100 border-yellow-400 animate-pulse'
                                                : currentState.currentIndex > index
                                                    ? 'bg-gray-100 border-gray-300 opacity-50'
                                                    : 'bg-blue-50 border-blue-300'
                                                }`}
                                        >
                                            {char}
                                        </div>
                                    ))}
                                </div>

                                {currentState.currentChar && (
                                    <div className="flex justify-center items-center mb-6">
                                        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3">
                                            <span className="text-sm text-gray-600">Processing: </span>
                                            <span className="font-mono text-lg font-bold text-yellow-800">
                                                "{currentState.currentChar}"
                                            </span>
                                        </div>
                                        <ChevronRight className="h-6 w-6 text-gray-400 mx-4" />
                                        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3">
                                            <span className="text-sm text-gray-600">Will be added to end</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Call Stack Visualization */}
                            <div className="mb-8">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Recursive Calls</h4>
                                <div className="space-y-3">
                                    {currentState.callStack.length === 0 ? (
                                        <div className="text-gray-500 text-center py-4">
                                            No active calls
                                        </div>
                                    ) : (
                                        currentState.callStack.map((call, index) => (
                                            <div
                                                key={index}
                                                className={`p-4 rounded-lg border-2 transition-all duration-500 ${call.phase === 'forward'
                                                    ? 'bg-blue-50 border-blue-300'
                                                    : 'bg-purple-50 border-purple-300'
                                                    }`}
                                                style={{ marginLeft: `${index * 20}px` }}
                                            >
                                                <div className="font-mono text-sm">
                                                    <span className="font-bold">{call.function}</span>
                                                    {call.result && (
                                                        <span className="ml-4 text-purple-700">
                                                            → "{call.result}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Result */}
                            {currentState.result && (
                                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                    <h4 className="text-lg font-semibold text-green-800 mb-2">Current Result</h4>
                                    <div className="flex justify-center">
                                        <div className="font-mono text-2xl font-bold text-green-700">
                                            "{currentState.result}"
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Code Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            Python Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                            <code>{codeExample}</code>
                        </pre>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            JavaScript Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                            <code>{javaScriptCode}</code>
                        </pre>
                    </div>
                </div>

                {/* Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Algorithm Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Time Complexity: O(n)</h4>
                            <p className="text-gray-600 text-sm mb-4">
                                Each character is processed exactly once, requiring n recursive calls for a string of length n.
                            </p>
                            <h4 className="font-bold text-green-700 mb-2">Space Complexity: O(n)</h4>
                            <p className="text-gray-600 text-sm">
                                The recursion depth equals the string length, creating n stack frames. Each frame stores constant data.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-2">Real-World Applications</h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• Palindrome checking algorithms</li>
                                <li>• Text processing and manipulation</li>
                                <li>• Undo functionality in text editors</li>
                                <li>• Data format conversion</li>
                                <li>• Encryption/decryption preprocessing</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StringReversalVisualizer;