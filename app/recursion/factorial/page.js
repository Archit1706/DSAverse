"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Code, Layers, ChevronDown, ArrowDown, ArrowUp, Calculator, TrendingUp } from 'lucide-react';

const FactorialVisualizer = () => {
    const [n, setN] = useState(5);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [callStack, setCallStack] = useState([]);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [showTrace, setShowTrace] = useState(true);
    const [executionTree, setExecutionTree] = useState([]);

    // Generate step history for visualization with enhanced data
    const generateSteps = (num) => {
        const steps = [];
        const stack = [];
        const trace = [];
        let stepCounter = 0;

        // Forward calls (building stack)
        for (let i = num; i >= 1; i--) {
            stepCounter++;
            const stackFrame = {
                id: stepCounter,
                call: `factorial(${i})`,
                state: 'calling',
                calculation: i === 1 ? '1 (base case)' : `${i} × factorial(${i - 1})`,
                level: num - i,
                parameter: i,
                waiting: i > 1
            };

            stack.push(stackFrame);
            trace.push(`Call: factorial(${i})`);

            steps.push({
                callStack: [...stack],
                explanation: i === 1
                    ? `🎯 Base case reached: factorial(1) = 1. This is where the recursion stops and we start returning values.`
                    : `📞 Calling factorial(${i}). Need to compute factorial(${i - 1}) first before calculating ${i} × factorial(${i - 1}).`,
                currentCall: `factorial(${i})`,
                phase: 'forward',
                trace: [...trace],
                stepNumber: stepCounter,
                activeParameter: i,
                pendingCalculations: stack.filter(s => s.waiting).length
            });
        }

        // Backward resolution (unwinding stack)
        let result = 1;
        for (let i = 1; i <= num; i++) {
            stepCounter++;
            const currentResult = i === 1 ? 1 : i * result;
            result = currentResult;

            // Update the corresponding stack frame
            const frameIndex = stack.findIndex(frame => frame.parameter === i);
            if (frameIndex !== -1) {
                stack[frameIndex].state = 'resolved';
                stack[frameIndex].result = currentResult;
                stack[frameIndex].waiting = false;
            }

            trace.push(`Return: factorial(${i}) = ${currentResult}`);

            steps.push({
                callStack: [...stack],
                explanation: i === 1
                    ? `✅ Base case returns: factorial(1) = 1. Now we can start calculating the pending multiplications.`
                    : `🔙 factorial(${i}) = ${i} × ${result / i} = ${currentResult}. Returning this value to the calling function.`,
                currentCall: `factorial(${i})`,
                phase: 'backward',
                result: currentResult,
                trace: [...trace],
                stepNumber: stepCounter,
                activeParameter: i,
                pendingCalculations: stack.filter(s => s.waiting).length
            });
        }

        return steps;
    };

    useEffect(() => {
        const steps = generateSteps(n);
        setStepHistory(steps);
        setCurrentStep(0);
        setCallStack(steps[0]?.callStack || []);
        setExecutionTree(steps);
    }, [n]);

    useEffect(() => {
        const currentState = stepHistory[currentStep];
        if (currentState) {
            setCallStack(currentState.callStack);
        }
    }, [currentStep, stepHistory]);

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

    const handleStepForward = () => {
        if (currentStep < stepHistory.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleStepBackward = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const currentState = stepHistory[currentStep] || {
        callStack: [],
        explanation: 'Click Start to begin the factorial visualization',
        currentCall: '',
        phase: 'forward',
        trace: [],
        stepNumber: 0,
        pendingCalculations: 0
    };

    const factorial = (num) => {
        if (num <= 1) return 1;
        return num * factorial(num - 1);
    };

    const getCallStackHeight = () => {
        return Math.max(callStack.length * 80, 200);
    };

    const getArrowDirection = (phase) => {
        return phase === 'forward' ? 'down' : 'up';
    };

    const codeExample = `def factorial(n):
    # Base case: factorial of 0 or 1 is 1
    if n <= 1:
        return 1
    
    # Recursive case: n * factorial(n-1)
    return n * factorial(n - 1)

# Example usage
result = factorial(${n})  # Returns ${factorial(n)}`;

    const javaScriptCode = `function factorial(n) {
    // Base case
    if (n <= 1) {
        return 1;
    }
    
    // Recursive case
    return n * factorial(n - 1);
}

// Example usage
const result = factorial(${n}); // Returns ${factorial(n)}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <button className="flex items-center text-white hover:text-green-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Recursion
                        </button>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Factorial Recursion Visualizer
                        </h1>
                        <p className="text-xl text-green-100 mb-6 max-w-3xl mx-auto">
                            Watch how factorial function calls itself recursively and see the call stack in action.
                        </p>
                        <div className="flex justify-center items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Layers className="h-4 w-4" />
                                Call Stack: O(n)
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                Time: O(n)
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Calculator className="h-4 w-4" />
                                Result: {factorial(n)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Enhanced Control Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Controls</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Number (n): {n}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={n}
                                        onChange={(e) => setN(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                        disabled={isPlaying}
                                    />
                                    <div className="text-sm text-gray-500 mt-1 bg-green-50 p-2 rounded border">
                                        <div className="font-medium">factorial({n}) = {factorial(n)}</div>
                                        <div className="text-xs mt-1">Calls needed: {n}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Speed: {speed}ms
                                    </label>
                                    <input
                                        type="range"
                                        min="500"
                                        max="2500"
                                        step="250"
                                        value={speed}
                                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        {speed < 1000 ? 'Fast' : speed < 1500 ? 'Medium' : 'Slow'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handlePlay}
                                        className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center text-sm"
                                    >
                                        {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center text-sm"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-1" />
                                        Reset
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleStepBackward}
                                        disabled={currentStep === 0}
                                        className="bg-emerald-500 text-white px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ArrowUp className="h-4 w-4 mr-1" />
                                        Prev
                                    </button>
                                    <button
                                        onClick={handleStepForward}
                                        disabled={currentStep === stepHistory.length - 1}
                                        className="bg-emerald-500 text-white px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ArrowDown className="h-4 w-4 mr-1" />
                                        Next
                                    </button>
                                </div>

                                <div className="border-t pt-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={showTrace}
                                            onChange={(e) => setShowTrace(e.target.checked)}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm text-gray-700">Show execution trace</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Step Information */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Step Information</h3>
                            <div className="space-y-3">
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Progress:</span>
                                        <span className="font-medium">{currentStep + 1} / {stepHistory.length}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Phase:</span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${currentState.phase === 'forward'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {currentState.phase === 'forward' ? '📞 Making Calls' : '🔙 Returning Values'}
                                        </span>
                                    </div>
                                </div>

                                {currentState.pendingCalculations !== undefined && (
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Pending:</span>
                                            <span className="font-medium text-orange-600">
                                                {currentState.pendingCalculations} calls waiting
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-green-800 text-sm leading-relaxed">
                                        {currentState.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Call Stack Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                    <Layers className="h-5 w-5 mr-2 text-green-600" />
                                    Call Stack Visualization
                                </h3>
                                <div className="flex items-center space-x-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                        {getArrowDirection(currentState.phase) === 'down' ? (
                                            <ArrowDown className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <ArrowUp className="h-4 w-4 text-purple-500" />
                                        )}
                                        <span className="text-gray-600">
                                            {currentState.phase === 'forward' ? 'Calling' : 'Returning'}
                                        </span>
                                    </div>
                                    <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                                        Stack size: {callStack.length}
                                    </div>
                                </div>
                            </div>

                            <div
                                className="relative overflow-hidden"
                                style={{ minHeight: getCallStackHeight() }}
                            >
                                {callStack.length === 0 ? (
                                    <div className="text-gray-500 text-center py-12">
                                        <Layers className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>Click Start to see the call stack in action</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col-reverse space-y-reverse space-y-2">
                                        {callStack.slice().reverse().map((call, index) => {
                                            const isActive = call.parameter === currentState.activeParameter;
                                            const stackPosition = callStack.length - index - 1;

                                            return (
                                                <div
                                                    key={call.id}
                                                    className={`relative p-4 rounded-lg border-2 transition-all duration-500 transform ${call.state === 'calling'
                                                        ? 'bg-blue-50 border-blue-300 shadow-md'
                                                        : call.state === 'resolved'
                                                            ? 'bg-green-50 border-green-300 shadow-lg'
                                                            : 'bg-gray-50 border-gray-300'
                                                        } ${isActive ? 'ring-2 ring-emerald-400 ring-opacity-50 scale-105' : ''
                                                        }`}
                                                    style={{
                                                        zIndex: callStack.length - index,
                                                        marginLeft: `${stackPosition * 8}px`,
                                                        transition: 'all 0.5s ease-in-out'
                                                    }}
                                                >
                                                    {/* Stack level indicator */}
                                                    <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                                                        {stackPosition + 1}
                                                    </div>

                                                    <div className="text-center">
                                                        <div className="font-mono text-lg font-bold text-gray-900 mb-1">
                                                            {call.call}
                                                        </div>
                                                        <div className="text-sm text-gray-600 bg-white rounded px-2 py-1 border">
                                                            {call.calculation}
                                                        </div>
                                                        {call.waiting && (
                                                            <div className="text-xs text-orange-600 mt-1 font-medium">
                                                                ⏳ Waiting for result...
                                                            </div>
                                                        )}
                                                        {call.result !== undefined && (
                                                            <div className="text-sm font-bold text-green-700 mt-2 bg-green-100 rounded px-2 py-1">
                                                                ✅ Returns: {call.result}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Execution Trace */}
                    <div className="lg:col-span-1">
                        {showTrace && (
                            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                                    Execution Trace
                                </h3>
                                <div className="max-h-80 overflow-y-auto space-y-1">
                                    {currentState.trace && currentState.trace.length > 0 ? (
                                        currentState.trace.map((traceItem, index) => (
                                            <div
                                                key={index}
                                                className={`text-xs p-2 rounded transition-all duration-300 ${index === currentState.trace.length - 1
                                                    ? 'bg-emerald-100 border border-emerald-300 font-medium'
                                                    : 'bg-gray-50 border border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                <span className="text-gray-500 mr-2">{index + 1}.</span>
                                                {traceItem}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-500 text-center py-4 text-sm">
                                            Execution trace will appear here
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Legend</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded"></div>
                                    <span>Making function call</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
                                    <span>Returning value</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-emerald-400 rounded-full"></div>
                                    <span>Currently active</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">1</div>
                                    <span>Stack level</span>
                                </div>
                            </div>
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
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border font-mono">
                            <code>{codeExample}</code>
                        </pre>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-green-600" />
                            JavaScript Implementation
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border font-mono">
                            <code>{javaScriptCode}</code>
                        </pre>
                    </div>
                </div>

                {/* Enhanced Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Complexity Analysis & Key Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="font-bold text-green-700 mb-3 flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Time Complexity: O(n)
                            </h4>
                            <p className="text-gray-600 text-sm mb-4">
                                The function makes exactly n recursive calls. Each call performs constant time operations
                                (comparison and multiplication), so total time is proportional to n.
                            </p>
                            <div className="bg-green-50 p-3 rounded border text-xs">
                                <strong>For n={n}:</strong> {n} function calls needed
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-3 flex items-center">
                                <Layers className="h-4 w-4 mr-1" />
                                Space Complexity: O(n)
                            </h4>
                            <p className="text-gray-600 text-sm mb-4">
                                The recursion depth equals n, meaning the call stack grows to size n. Each stack frame
                                stores the parameter and return address.
                            </p>
                            <div className="bg-green-50 p-3 rounded border text-xs">
                                <strong>Max stack depth:</strong> {n} frames
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-700 mb-3 flex items-center">
                                <Calculator className="h-4 w-4 mr-1" />
                                Key Patterns
                            </h4>
                            <ul className="text-gray-600 text-sm space-y-1">
                                <li>• 🎯 Base case: factorial(1) = 1</li>
                                <li>• 🔄 Recursive: n × factorial(n-1)</li>
                                <li>• 📞 Stack grows during calls</li>
                                <li>• 🔙 Values computed on return</li>
                                <li>• ⏳ Calls wait for subcalls</li>
                                <li>• 🧮 Final result: {factorial(n)}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FactorialVisualizer;