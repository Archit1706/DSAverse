'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, SkipBack, SkipForward, Info, CheckCircle, XCircle, Code, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const INITIAL_ARRAY = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];
const INITIAL_TARGET = 13;
const BLOCK_SIZE = 4; // floor(sqrt(16)) = 4

const quizQuestions = [
    {
        question: "What is the optimal block size used in block search?",
        options: ["n/2", "log n", "sqrt(n)", "n/3"],
        correct: 2,
        explanation: "Block size sqrt(n) minimizes total comparisons. The block endpoint scan takes at most sqrt(n) steps, and the linear scan within the block takes at most sqrt(n) steps — total O(sqrt(n))."
    },
    {
        question: "What are the two phases of block search?",
        options: [
            "Sort phase, then search phase",
            "Block endpoint scan, then linear search within the found block",
            "Exponential scan, then binary search",
            "Hashing phase, then collision resolution"
        ],
        correct: 1,
        explanation: "Phase 1: scan block endpoints (arr[sqrt(n)-1], arr[2*sqrt(n)-1], ...) to find which block contains the target. Phase 2: linear scan within that block to find the exact position."
    },
    {
        question: "What is another common name for block search?",
        options: ["Binary search", "Jump search", "Heap search", "Interpolation search"],
        correct: 1,
        explanation: "Block search is also called jump search because it 'jumps' ahead by block-sized steps. Both names refer to the same algorithm: fixed-size block endpoint scanning followed by linear search."
    }
];

const codeString = `import math

def block_search(arr, target):
    """O(sqrt(n)) time, O(1) space — also called Jump Search"""
    n = len(arr)
    block_size = int(math.sqrt(n))

    # Phase 1: Find the block where target could be
    block_end = block_size - 1
    while block_end < n and arr[block_end] < target:
        block_end += block_size

    # Phase 2: Linear search within the identified block
    block_start = max(0, block_end - block_size + 1)
    block_end   = min(block_end, n - 1)

    for i in range(block_start, block_end + 1):
        if arr[i] == target:
            return i

    return -1  # not found

# Example
arr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]
print(block_search(arr, 13))   # 6
print(block_search(arr, 100))  # -1`;

function generateSteps(arr, target, blockSize) {
    const steps = [];
    const n = arr.length;

    steps.push({
        array: arr,
        blockSize,
        blockStart: -1,
        blockEnd: -1,
        currentIndex: -1,
        phase: 'scanning',
        found: false,
        foundIndex: -1,
        scannedBlocks: [],
        explanation: `Starting block search for ${target}. Block size = sqrt(${n}) = ${blockSize}. Array has ${Math.ceil(n / blockSize)} blocks. Phase 1: scan block endpoints.`
    });

    let blockEnd = blockSize - 1;
    const scannedBlocks = [];

    // Phase 1: Scan block endpoints
    while (blockEnd < n && arr[blockEnd] < target) {
        steps.push({
            array: arr,
            blockSize,
            blockStart: -1,
            blockEnd: blockEnd,
            currentIndex: blockEnd,
            phase: 'scanning',
            found: false,
            foundIndex: -1,
            scannedBlocks: [...scannedBlocks],
            explanation: `Phase 1: Checking block endpoint at index ${blockEnd} (value ${arr[blockEnd]}). ${arr[blockEnd]} < ${target}, jump to next block.`
        });
        const bStart = Math.max(0, blockEnd - blockSize + 1);
        scannedBlocks.push({ start: bStart, end: blockEnd });
        blockEnd += blockSize;
    }

    // Clamp
    const actualBlockEnd = Math.min(blockEnd, n - 1);
    const blockStart = Math.max(0, actualBlockEnd - blockSize + 1);

    // Check endpoint step
    if (actualBlockEnd < n) {
        steps.push({
            array: arr,
            blockSize,
            blockStart,
            blockEnd: actualBlockEnd,
            currentIndex: actualBlockEnd,
            phase: 'scanning',
            found: false,
            foundIndex: -1,
            scannedBlocks: [...scannedBlocks],
            explanation: `Phase 1: Block endpoint at index ${actualBlockEnd} (value ${arr[actualBlockEnd]}) >= ${target}. Target is in block [${blockStart}, ${actualBlockEnd}]. Switching to Phase 2: linear search.`
        });
    }

    // Phase 2: Linear search
    steps.push({
        array: arr,
        blockSize,
        blockStart,
        blockEnd: actualBlockEnd,
        currentIndex: blockStart,
        phase: 'linear',
        found: false,
        foundIndex: -1,
        scannedBlocks: [...scannedBlocks],
        explanation: `Phase 2: Linear scan within block [${blockStart}, ${actualBlockEnd}]. Starting at index ${blockStart} (value ${arr[blockStart]}).`
    });

    for (let i = blockStart; i <= actualBlockEnd; i++) {
        steps.push({
            array: arr,
            blockSize,
            blockStart,
            blockEnd: actualBlockEnd,
            currentIndex: i,
            phase: 'linear',
            found: arr[i] === target,
            foundIndex: arr[i] === target ? i : -1,
            scannedBlocks: [...scannedBlocks],
            explanation: arr[i] === target
                ? `Found! arr[${i}] = ${arr[i]} equals target ${target}. Search complete.`
                : `Checking arr[${i}] = ${arr[i]}. ${arr[i]} !== ${target}, continue.`
        });

        if (arr[i] === target) return steps;
    }

    steps.push({
        array: arr,
        blockSize,
        blockStart,
        blockEnd: actualBlockEnd,
        currentIndex: -1,
        phase: 'notfound',
        found: false,
        foundIndex: -1,
        scannedBlocks: [...scannedBlocks],
        explanation: `Target ${target} not found in array.`
    });
    return steps;
}

export default function BlockSearchPage() {
    const [arr] = useState(INITIAL_ARRAY);
    const [target] = useState(INITIAL_TARGET);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(arr, target, BLOCK_SIZE));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [arr, target]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const currentState = stepHistory[currentStep] || {
        blockSize: BLOCK_SIZE, blockStart: -1, blockEnd: -1, currentIndex: -1,
        phase: 'scanning', found: false, foundIndex: -1, scannedBlocks: [], explanation: ''
    };

    const getColor = (i) => {
        if (i === currentState.foundIndex) return 'bg-green-500 border-green-400 text-white scale-105';
        if (i === currentState.currentIndex && currentState.foundIndex === -1)
            return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (i >= currentState.blockStart && i <= currentState.blockEnd && currentState.blockEnd !== -1
            && currentState.phase === 'linear')
            return 'bg-orange-700/40 border-orange-600 text-slate-200';
        if (currentState.scannedBlocks && currentState.scannedBlocks.some(b => i >= b.start && i <= b.end)
            && currentState.phase !== 'linear')
            return 'bg-slate-800 border-slate-700 text-slate-500';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };

    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const resetQuiz = () => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const phaseLabel = currentState.phase === 'scanning'
        ? 'Phase 1: Scanning Block Endpoints'
        : currentState.phase === 'linear'
            ? `Phase 2: Linear Search in Block [${currentState.blockStart}, ${currentState.blockEnd}]`
            : currentState.phase === 'notfound'
                ? 'Not Found'
                : 'Complete';

    const phaseColor = currentState.phase === 'scanning'
        ? 'text-yellow-400'
        : currentState.phase === 'linear'
            ? 'text-orange-400'
            : 'text-green-400';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/searching" className="inline-flex items-center text-red-100 hover:text-white mb-5">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Searching
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Block Search</h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto">
                            Also known as Jump Search — scan block endpoints by sqrt(n) jumps, then linear search within the block.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-100">Array Visualization</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-400 text-sm">Target:</span>
                                    <span className="bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1 rounded-lg font-mono font-bold">{target}</span>
                                </div>
                            </div>

                            <div className="mb-4 flex items-center gap-4 flex-wrap">
                                <span className={`text-sm font-semibold ${phaseColor} bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700`}>
                                    {phaseLabel}
                                </span>
                                <span className="text-slate-400 text-xs">
                                    Block size: sqrt({arr.length}) = <span className="text-yellow-400 font-mono">{BLOCK_SIZE}</span>
                                </span>
                            </div>

                            {/* Array with block separators */}
                            <div className="overflow-x-auto">
                                <div className="flex items-start gap-0 pb-2 min-w-max mx-auto justify-center">
                                    {arr.map((val, i) => (
                                        <div key={i} className="flex items-start">
                                            {/* Block separator before each block start (except index 0) */}
                                            {i > 0 && i % BLOCK_SIZE === 0 && (
                                                <div className="w-0.5 h-10 bg-red-500/40 self-center mx-1 mt-0" />
                                            )}
                                            <div className="flex flex-col items-center gap-1">
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 font-mono text-xs font-bold transition-all duration-300 ${getColor(i)}`}>
                                                    {val}
                                                </div>
                                                <div className="h-3 flex items-center justify-center">
                                                    {i === currentState.currentIndex && currentState.foundIndex === -1 && (
                                                        <div className="w-2 h-1 bg-yellow-400 rounded mx-auto" />
                                                    )}
                                                    {i === currentState.foundIndex && (
                                                        <div className="w-2 h-1 bg-green-400 rounded mx-auto" />
                                                    )}
                                                </div>
                                                <span className="text-slate-600 text-xs font-mono">{i}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Block labels */}
                            <div className="mt-3 flex gap-1 flex-wrap">
                                {Array.from({ length: Math.ceil(arr.length / BLOCK_SIZE) }, (_, bi) => {
                                    const bStart = bi * BLOCK_SIZE;
                                    const bEnd = Math.min(bStart + BLOCK_SIZE - 1, arr.length - 1);
                                    const isScanned = currentState.scannedBlocks && currentState.scannedBlocks.some(b => b.start === bStart);
                                    const isActive = currentState.blockStart === bStart && currentState.phase === 'linear';
                                    return (
                                        <div
                                            key={bi}
                                            className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${isActive
                                                ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                                                : isScanned
                                                    ? 'border-slate-700 bg-slate-800 text-slate-600'
                                                    : 'border-slate-700 bg-slate-800/50 text-slate-500'
                                                }`}
                                        >
                                            Block {bi} [{bStart}-{bEnd}]
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Color Legend</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-700 border border-slate-600 flex-shrink-0" /><span className="text-slate-400">Unchecked</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-300 flex-shrink-0" /><span className="text-slate-400">Currently checking</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-700 border border-orange-600 flex-shrink-0" /><span className="text-slate-400">Target block (linear)</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 flex-shrink-0" /><span className="text-slate-400">Scanned/eliminated</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500 border border-green-400 flex-shrink-0" /><span className="text-slate-400">Found</span></div>
                                <div className="flex items-center gap-2"><div className="w-0.5 h-4 bg-red-500/40 flex-shrink-0" /><span className="text-slate-400">Block boundary</span></div>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <p className="text-red-300 text-sm leading-relaxed">
                                {currentState.explanation || 'Press Play to start the visualization.'}
                            </p>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-700 space-y-4">
                            <div className="flex items-center gap-2 justify-center flex-wrap">
                                <button
                                    onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setIsPlaying(p => !p)}
                                    className="px-6 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))}
                                    disabled={currentStep >= stepHistory.length - 1}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <SkipForward className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </div>

                            <div>
                                <label className="text-slate-400 text-xs mb-1 block">Speed: {speed}ms delay</label>
                                <input
                                    type="range"
                                    min={200}
                                    max={2000}
                                    step={100}
                                    value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))}
                                    className="w-full accent-red-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>Fast</span><span>Slow</span>
                                </div>
                            </div>

                            <div className="text-center text-slate-400 text-xs">
                                Step {currentStep + 1} of {stepHistory.length}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="h-4 w-4 text-red-400" />
                                <h2 className="text-lg font-semibold text-slate-100">About Block Search</h2>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                Block search (also called Jump Search) divides the sorted array into blocks of size sqrt(n).
                                Phase 1 scans block endpoints by jumping sqrt(n) steps at a time. Phase 2 does a linear scan
                                within the identified block.
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                The sqrt(n) block size is optimal: it minimizes total comparisons since both phases take
                                at most sqrt(n) comparisons each, giving O(sqrt(n)) overall.
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                It sits between linear search O(n) and binary search O(log n) in complexity, but has the
                                advantage of traversing the array in a forward direction, which can benefit cache performance.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Time Complexity</div>
                                    <div className="text-yellow-400 font-mono font-bold">O(sqrt(n))</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Space Complexity</div>
                                    <div className="text-green-400 font-mono font-bold">O(1)</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Block Size</div>
                                    <div className="text-yellow-400 font-mono font-bold">sqrt({arr.length}) = {BLOCK_SIZE}</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-500 mb-1">Also Called</div>
                                    <div className="text-yellow-400 text-sm font-semibold">Jump Search</div>
                                </div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-100 mb-4">Active Recall Quiz</h2>
                            {quizState.complete ? (
                                <div className="text-center space-y-3">
                                    <CheckCircle className="h-10 w-10 text-green-400 mx-auto" />
                                    <p className="text-slate-200 font-semibold">Quiz Complete!</p>
                                    <p className="text-slate-400 text-sm">Score: {quizState.score} / {quizQuestions.length}</p>
                                    <button onClick={resetQuiz} className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm transition-colors">
                                        Retry Quiz
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-slate-500">Question {quizState.current + 1} of {quizQuestions.length}</span>
                                        <span className="text-xs text-slate-500">Score: {quizState.score}</span>
                                    </div>
                                    <p className="text-slate-200 text-sm mb-4 leading-relaxed">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, idx) => {
                                            let cls = 'w-full text-left px-4 py-3 rounded-lg text-sm border transition-all ';
                                            if (!quizState.answered) {
                                                cls += 'border-slate-700 bg-slate-800 text-slate-300 hover:border-red-500/50 hover:bg-slate-700';
                                            } else if (idx === quizQuestions[quizState.current].correct) {
                                                cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            } else if (idx === quizState.selected) {
                                                cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            } else {
                                                cls += 'border-slate-700 bg-slate-800 text-slate-500';
                                            }
                                            return (
                                                <button key={idx} className={cls} onClick={() => handleQuizAnswer(idx)}>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-slate-400 text-xs leading-relaxed">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="w-full py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm transition-colors">
                                                {quizState.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Code Block */}
                        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setShowCode(p => !p)}
                                className="w-full flex items-center justify-between px-5 py-4 text-slate-200 hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4 text-red-400" />
                                    <span className="font-semibold text-sm">Python Implementation</span>
                                </div>
                                <span className="text-slate-400 text-xs">{showCode ? 'Hide' : 'Show'}</span>
                            </button>
                            {showCode && (
                                <div className="px-5 pb-5">
                                    <CodeBlock code={codeString} language="python" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
