"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2, FileText } from 'lucide-react';

const LCSPage = () => {
    const [string1, setString1] = useState("ABCDGH");
    const [string2, setString2] = useState("AEDFHR");
    const [originalString1] = useState("ABCDGH");
    const [originalString2] = useState("AEDFHR");
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateLCSSteps = (str1, str2) => {
        const steps = [];
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

        // Initialize empty step
        steps.push({
            dp: dp.map(row => [...row]),
            currentRow: -1,
            currentCol: -1,
            char1: '',
            char2: '',
            decision: '',
            explanation: `🎯 Initialize LCS table for strings "${str1}" and "${str2}". First row and column are 0 (empty string cases).`,
            phase: 'initialize',
            lcs: '',
            lcsPath: []
        });

        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const char1 = str1[i - 1];
                const char2 = str2[j - 1];

                steps.push({
                    dp: dp.map(row => [...row]),
                    currentRow: i,
                    currentCol: j,
                    char1: char1,
                    char2: char2,
                    decision: '',
                    explanation: `🔍 Comparing "${char1}" (from "${str1}") with "${char2}" (from "${str2}") at position [${i}][${j}]`,
                    phase: 'comparing',
                    lcs: '',
                    lcsPath: []
                });

                if (char1 === char2) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    steps.push({
                        dp: dp.map(row => [...row]),
                        currentRow: i,
                        currentCol: j,
                        char1: char1,
                        char2: char2,
                        decision: 'match',
                        explanation: `✅ Match found! "${char1}" = "${char2}". dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}`,
                        phase: 'match',
                        lcs: '',
                        lcsPath: []
                    });
                } else {
                    const fromLeft = dp[i][j - 1];
                    const fromTop = dp[i - 1][j];
                    dp[i][j] = Math.max(fromLeft, fromTop);

                    const direction = fromLeft > fromTop ? 'left' : fromTop > fromLeft ? 'top' : 'both';

                    steps.push({
                        dp: dp.map(row => [...row]),
                        currentRow: i,
                        currentCol: j,
                        char1: char1,
                        char2: char2,
                        decision: 'no_match',
                        explanation: `❌ No match: "${char1}" ≠ "${char2}". dp[${i}][${j}] = max(dp[${i}][${j - 1}], dp[${i - 1}][${j}]) = max(${fromLeft}, ${fromTop}) = ${dp[i][j]}`,
                        phase: 'no_match',
                        lcs: '',
                        lcsPath: [],
                        direction: direction
                    });
                }
            }
        }

        // Reconstruct LCS
        steps.push({
            dp: dp.map(row => [...row]),
            currentRow: m,
            currentCol: n,
            char1: '',
            char2: '',
            decision: '',
            explanation: `🔍 Starting backtracking from dp[${m}][${n}] = ${dp[m][n]} to reconstruct the LCS`,
            phase: 'backtrack_start',
            lcs: '',
            lcsPath: []
        });

        let i = m, j = n;
        const lcsChars = [];
        const path = [];

        while (i > 0 && j > 0) {
            path.push([i, j]);

            if (str1[i - 1] === str2[j - 1]) {
                lcsChars.unshift(str1[i - 1]);
                steps.push({
                    dp: dp.map(row => [...row]),
                    currentRow: i,
                    currentCol: j,
                    char1: str1[i - 1],
                    char2: str2[j - 1],
                    decision: 'match',
                    explanation: `🎯 Backtrack: "${str1[i - 1]}" = "${str2[j - 1]}" at [${i}][${j}]. Add "${str1[i - 1]}" to LCS. Move diagonally to [${i - 1}][${j - 1}]`,
                    phase: 'backtracking',
                    lcs: lcsChars.join(''),
                    lcsPath: [...path]
                });
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                steps.push({
                    dp: dp.map(row => [...row]),
                    currentRow: i,
                    currentCol: j,
                    char1: str1[i - 1],
                    char2: str2[j - 1],
                    decision: 'move_up',
                    explanation: `⬆️ Backtrack: No match. dp[${i - 1}][${j}] (${dp[i - 1][j]}) > dp[${i}][${j - 1}] (${dp[i][j - 1]}). Move up to [${i - 1}][${j}]`,
                    phase: 'backtracking',
                    lcs: lcsChars.join(''),
                    lcsPath: [...path]
                });
                i--;
            } else {
                steps.push({
                    dp: dp.map(row => [...row]),
                    currentRow: i,
                    currentCol: j,
                    char1: str1[i - 1],
                    char2: str2[j - 1],
                    decision: 'move_left',
                    explanation: `⬅️ Backtrack: No match. dp[${i}][${j - 1}] (${dp[i][j - 1]}) ≥ dp[${i - 1}][${j}] (${dp[i - 1][j]}). Move left to [${i}][${j - 1}]`,
                    phase: 'backtracking',
                    lcs: lcsChars.join(''),
                    lcsPath: [...path]
                });
                j--;
            }
        }

        const finalLCS = lcsChars.join('');
        steps.push({
            dp: dp.map(row => [...row]),
            currentRow: -1,
            currentCol: -1,
            char1: '',
            char2: '',
            decision: '',
            explanation: `🎉 LCS Complete! The Longest Common Subsequence of "${str1}" and "${str2}" is "${finalLCS}" with length ${finalLCS.length}`,
            phase: 'complete',
            lcs: finalLCS,
            lcsPath: path
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateLCSSteps(string1, string2);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [string1, string2]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, currentStep, stepHistory, speed]);

    const startVisualization = () => setIsPlaying(true);
    const pauseVisualization = () => setIsPlaying(false);
    const resetVisualization = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const stepForward = () => {
        if (currentStep < stepHistory.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const stepBackward = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const generateNewStrings = () => {
        const generateString = (length) => {
            const chars = 'ABCDEFGHIJKLMNOP';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const len1 = Math.floor(Math.random() * 4) + 4; // 4-7 chars
        const len2 = Math.floor(Math.random() * 4) + 4; // 4-7 chars
        setString1(generateString(len1));
        setString2(generateString(len2));
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setString1(originalString1);
        setString2(originalString2);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const setPresetExample = (example) => {
        const examples = {
            dna: { str1: "AGGTAB", str2: "GXTXAYB" },
            words: { str1: "HELLO", str2: "HELO" },
            simple: { str1: "ABC", str2: "AC" }
        };

        if (examples[example]) {
            setString1(examples[example].str1);
            setString2(examples[example].str2);
            setIsPlaying(false);
            setCurrentStep(0);
        }
    };

    const currentState = stepHistory[currentStep] || {
        dp: [],
        currentRow: -1,
        currentCol: -1,
        char1: '',
        char2: '',
        decision: '',
        explanation: 'Click Start to begin the LCS visualization',
        phase: 'start',
        lcs: '',
        lcsPath: []
    };

    const getCellColor = (i, j, value) => {
        const isCurrentCell = i === currentState.currentRow && j === currentState.currentCol;
        const isInPath = currentState.lcsPath.some(([pi, pj]) => pi === i && pj === j);

        if (isCurrentCell) {
            if (currentState.decision === 'match') return 'bg-green-500 text-white border-green-600 transform scale-110';
            if (currentState.phase === 'backtracking') return 'bg-purple-500 text-white border-purple-600 transform scale-110';
            return 'bg-rose-500 text-white border-rose-600 transform scale-110';
        }

        if (isInPath) return 'bg-purple-300 text-purple-800 border-purple-400';

        if (i === 0 || j === 0) return 'bg-gray-300 text-gray-700 border-gray-400';
        if (value === 0) return 'bg-gray-100 text-gray-500 border-gray-300';
        if (value <= 2) return 'bg-rose-200 text-rose-800 border-rose-300';
        if (value <= 4) return 'bg-rose-300 text-rose-800 border-rose-400';
        return 'bg-rose-400 text-white border-rose-500';
    };

    const getCharColor = (char, str, index, isStr1) => {
        const currentChar = isStr1 ? currentState.char1 : currentState.char2;
        if (char === currentChar && currentState.phase === 'comparing' || currentState.phase === 'match' || currentState.phase === 'no_match') {
            return 'bg-rose-500 text-white transform scale-110';
        }
        if (currentState.lcs && currentState.lcs.includes(char)) {
            return 'bg-green-400 text-green-900';
        }
        return 'bg-blue-200 text-blue-800';
    };

    const codeExample = `def longest_common_subsequence(str1, str2):
    m, n = len(str1), len(str2)
    
    # Create DP table
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # Fill DP table
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str1[i - 1] == str2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    
    return dp[m][n]

def lcs_with_reconstruction(str1, str2):
    m, n = len(str1), len(str2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # Fill DP table
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str1[i - 1] == str2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    
    # Reconstruct LCS
    lcs = []
    i, j = m, n
    while i > 0 and j > 0:
        if str1[i - 1] == str2[j - 1]:
            lcs.append(str1[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    
    return dp[m][n], ''.join(reversed(lcs))

# Time Complexity: O(m × n)
# Space Complexity: O(m × n)`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <FileText className="h-12 w-12" />
                            Longest Common Subsequence
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch how 2D dynamic programming finds the longest common subsequence between two strings by building a table step by step.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(m × n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(m × n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">2D DP Table</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Backtracking</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button
                                    onClick={isPlaying ? pauseVisualization : startVisualization}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium"
                                    disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                >
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>

                                <button
                                    onClick={stepBackward}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep === 0}
                                >
                                    <SkipBack size={18} />
                                    Step Back
                                </button>

                                <button
                                    onClick={stepForward}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                >
                                    <SkipForward size={18} />
                                    Step Forward
                                </button>

                                <button
                                    onClick={resetVisualization}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                                >
                                    <RotateCcw size={18} />
                                    Reset
                                </button>

                                <button
                                    onClick={generateNewStrings}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                >
                                    Random Strings
                                </button>

                                <button
                                    onClick={resetToOriginal}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                >
                                    Original
                                </button>
                            </div>

                            {/* String Input Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">
                                        String 1: {string1}
                                    </label>
                                    <input
                                        type="text"
                                        value={string1}
                                        onChange={(e) => setString1(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="ABCDGH"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">
                                        String 2: {string2}
                                    </label>
                                    <input
                                        type="text"
                                        value={string2}
                                        onChange={(e) => setString2(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="AEDFHR"
                                    />
                                </div>
                            </div>

                            {/* Preset Examples */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                <button
                                    onClick={() => setPresetExample('dna')}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                                >
                                    DNA Example
                                </button>
                                <button
                                    onClick={() => setPresetExample('words')}
                                    className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                                >
                                    Word Example
                                </button>
                                <button
                                    onClick={() => setPresetExample('simple')}
                                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200"
                                >
                                    Simple Example
                                </button>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Animation Speed: {speed}ms
                                </label>
                                <input
                                    type="range"
                                    min="300"
                                    max="2000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (300ms)</span>
                                    <span>Slow (2000ms)</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Progress: Step {currentStep + 1} of {stepHistory.length}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Phase: {currentState.phase}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* String Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Strings Being Compared</h3>
                                <div className="space-y-3 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700 w-16">String 1:</span>
                                        <div className="flex gap-1">
                                            {string1.split('').map((char, index) => (
                                                <div
                                                    key={index}
                                                    className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm border-2 transition-all duration-500 ${getCharColor(char, string1, index, true)}`}
                                                >
                                                    {char}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700 w-16">String 2:</span>
                                        <div className="flex gap-1">
                                            {string2.split('').map((char, index) => (
                                                <div
                                                    key={index}
                                                    className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm border-2 transition-all duration-500 ${getCharColor(char, string2, index, false)}`}
                                                >
                                                    {char}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {currentState.lcs && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700 w-16">LCS:</span>
                                            <div className="flex gap-1">
                                                {currentState.lcs.split('').map((char, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm border-2 bg-green-500 text-white border-green-600"
                                                    >
                                                        {char}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-sm text-green-700 font-medium ml-2">
                                                Length: {currentState.lcs.length}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">DP Table</h3>
                                <div className="overflow-auto p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    {currentState.dp.length > 0 && (
                                        <div className="inline-block">
                                            <table className="border-collapse">
                                                <thead>
                                                    <tr>
                                                        <th className="w-8 h-8 text-xs"></th>
                                                        <th className="w-8 h-8 text-xs text-gray-600">ε</th>
                                                        {string2.split('').map((char, index) => (
                                                            <th key={index} className="w-8 h-8 text-xs text-gray-600">{char}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentState.dp.map((row, i) => (
                                                        <tr key={i}>
                                                            <th className="w-8 h-8 text-xs text-gray-600">
                                                                {i === 0 ? 'ε' : string1[i - 1]}
                                                            </th>
                                                            {row.map((value, j) => (
                                                                <td
                                                                    key={j}
                                                                    className={`w-8 h-8 text-center border border-gray-400 text-xs font-bold transition-all duration-500 ${getCellColor(i, j, value)}`}
                                                                >
                                                                    {value}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Current Step Explanation */}
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-800 mb-2">Current Step:</h3>
                                        <p className="text-rose-700 leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Algorithm Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-rose-600" />
                                <h3 className="font-bold text-gray-900">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Time Complexity:</span>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(m × n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space Complexity:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(m × n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Type:</span>
                                    <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded">2D DP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space Optimized:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">O(min(m,n))</span>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>DNA sequence alignment in bioinformatics</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>File difference detection (diff tools)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Version control systems (Git)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Text similarity and plagiarism detection</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Data compression algorithms</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Spell checkers and autocorrect</span>
                                </li>
                            </ul>
                        </div>

                        {/* Key Concepts */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Key DP Concepts</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>2D Table:</strong> dp[i][j] = LCS length of first i and j characters</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>Match:</strong> If chars match, dp[i][j] = dp[i-1][j-1] + 1</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>No Match:</strong> dp[i][j] = max(dp[i-1][j], dp[i][j-1])</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Base Case:</strong> Empty string has LCS length 0</span>
                                </li>
                            </ul>
                        </div>

                        {/* Related Problems */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Related DP Problems</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Longest Common Substring</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Edit Distance (Levenshtein)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Longest Increasing Subsequence</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Sequence Alignment</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Maximum Palindromic Subsequence</span>
                                </li>
                            </ul>
                        </div>

                        {/* Code Toggle */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium"
                            >
                                <Code2 className="h-5 w-5" />
                                {showCode ? 'Hide' : 'Show'} Python Code
                            </button>

                            {showCode && (
                                <div className="mt-4">
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                        <code>{codeExample}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LCSPage;