"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Home, DollarSign, Shield } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the key constraint in the House Robber problem?",
        options: ["Can only rob every third house", "Cannot rob two adjacent houses", "Must rob at least one house", "Can only rob houses worth more than 5"],
        correct: 1,
        explanation: "The robber cannot rob two directly adjacent houses — the alarm would trigger. This forces a skip-at-least-one between any two robbed houses."
    },
    {
        question: "What is the recurrence relation for House Robber?",
        options: ["dp[i] = dp[i-1] + dp[i-2]", "dp[i] = max(nums[i] + dp[i-2], dp[i-1])", "dp[i] = nums[i] + dp[i-1]", "dp[i] = max(dp[i-1], dp[i-2])"],
        correct: 1,
        explanation: "At each house you either rob it (value + best solution 2 houses back) or skip it (best solution from 1 house back). dp[i] = max(nums[i] + dp[i-2], dp[i-1])."
    },
    {
        question: "What is the space-optimized complexity?",
        options: ["O(n) time, O(n) space", "O(n) time, O(1) space", "O(n²) time, O(1) space", "O(n log n) time, O(1) space"],
        correct: 1,
        explanation: "The recurrence only needs dp[i-1] and dp[i-2], so two variables (prev2 and prev1) suffice — reducing space from O(n) to O(1) while keeping O(n) time."
    }
];

const HouseRobberPage = () => {
    const [houses, setHouses] = useState([2, 7, 9, 3, 1]);
    const [originalHouses] = useState([2, 7, 9, 3, 1]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateHouseRobberSteps = (houseValues) => {
        const steps = [];
        const n = houseValues.length;
        if (n === 0) return steps;
        const dp = new Array(n).fill(0);
        const decisions = new Array(n).fill('');

        steps.push({
            dp: [...dp], decisions: [...decisions], currentHouse: -1, maxMoney: 0,
            robbedHouses: [],
            explanation: `Starting House Robber with ${n} houses [${houseValues.join(', ')}]. Goal: maximize money without robbing adjacent houses.`,
            phase: 'initialize', comparing: null
        });

        dp[0] = houseValues[0];
        decisions[0] = 'rob';
        steps.push({
            dp: [...dp], decisions: [...decisions], currentHouse: 0, maxMoney: dp[0],
            robbedHouses: [0],
            explanation: `Base case: dp[0] = ${houseValues[0]} (rob house 0).`,
            phase: 'base_case', comparing: null
        });

        if (n > 1) {
            const r0 = houseValues[0], r1 = houseValues[1];
            steps.push({
                dp: [...dp], decisions: [...decisions], currentHouse: 1, maxMoney: Math.max(r0, r1),
                robbedHouses: r1 > r0 ? [1] : [0],
                explanation: `House 1: compare rob house 0 ($${r0}) vs rob house 1 ($${r1}). Choose max.`,
                phase: 'comparing', comparing: { option1: r0, option2: r1, chosen: r1 > r0 ? 'house1' : 'house0' }
            });
            dp[1] = Math.max(r0, r1);
            decisions[1] = r1 > r0 ? 'rob' : 'skip';
            steps.push({
                dp: [...dp], decisions: [...decisions], currentHouse: 1, maxMoney: dp[1],
                robbedHouses: r1 > r0 ? [1] : [0],
                explanation: `dp[1] = max(${r0}, ${r1}) = ${dp[1]}. ${decisions[1] === 'rob' ? 'Rob' : 'Skip'} house 1.`,
                phase: 'decision_made', comparing: null
            });
        }

        for (let i = 2; i < n; i++) {
            const robCur = houseValues[i] + dp[i - 2];
            const skipCur = dp[i - 1];
            steps.push({
                dp: [...dp], decisions: [...decisions], currentHouse: i, maxMoney: Math.max(robCur, skipCur),
                robbedHouses: [],
                explanation: `House ${i} ($${houseValues[i]}): rob = $${houseValues[i]} + dp[${i - 2}]=$${dp[i - 2]} = $${robCur}  vs  skip = dp[${i - 1}]=$${skipCur}.`,
                phase: 'comparing', comparing: { option1: robCur, option2: skipCur, chosen: robCur > skipCur ? 'rob' : 'skip', robCurrent: `$${houseValues[i]} + dp[${i - 2}]`, skipCurrent: `dp[${i - 1}]` }
            });
            dp[i] = robCur > skipCur ? robCur : skipCur;
            decisions[i] = robCur > skipCur ? 'rob' : 'skip';
            steps.push({
                dp: [...dp], decisions: [...decisions], currentHouse: i, maxMoney: dp[i],
                robbedHouses: [],
                explanation: `dp[${i}] = max($${robCur}, $${skipCur}) = $${dp[i]}. ${decisions[i] === 'rob' ? 'Rob' : 'Skip'} house ${i}.`,
                phase: 'decision_made', comparing: null
            });
        }

        steps.push({
            dp: [...dp], decisions: [...decisions], currentHouse: -1, maxMoney: dp[n - 1],
            robbedHouses: [],
            explanation: `DP table complete. Maximum money = $${dp[n - 1]}. Backtracking to find which houses to rob.`,
            phase: 'reconstruct_start', comparing: null
        });

        const robbed = [];
        let i = n - 1;
        while (i >= 0) {
            if (i === 0 || (i >= 2 && dp[i] === houseValues[i] + dp[i - 2])) {
                robbed.unshift(i);
                steps.push({
                    dp: [...dp], decisions: [...decisions], currentHouse: i, maxMoney: dp[n - 1],
                    robbedHouses: [...robbed],
                    explanation: `House ${i} was robbed! dp[${i}] includes $${houseValues[i]} from this house.`,
                    phase: 'reconstructing', comparing: null
                });
                i -= 2;
            } else {
                steps.push({
                    dp: [...dp], decisions: [...decisions], currentHouse: i, maxMoney: dp[n - 1],
                    robbedHouses: [...robbed],
                    explanation: `House ${i} was skipped. dp[${i}] = dp[${i - 1}].`,
                    phase: 'reconstructing', comparing: null
                });
                i--;
            }
        }

        const total = robbed.reduce((s, idx) => s + houseValues[idx], 0);
        steps.push({
            dp: [...dp], decisions: [...decisions], currentHouse: -1, maxMoney: total,
            robbedHouses: [...robbed],
            explanation: `Optimal: rob houses [${robbed.join(', ')}] for $${total}. No adjacent houses robbed!`,
            phase: 'complete', comparing: null
        });

        return steps;
    };

    useEffect(() => {
        setStepHistory(generateHouseRobberSteps(houses));
        setCurrentStep(0);
    }, [houses]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const currentState = stepHistory[currentStep] || {
        dp: Array(houses.length).fill(0), decisions: Array(houses.length).fill(''),
        currentHouse: -1, maxMoney: 0, robbedHouses: [],
        explanation: 'Click Play to begin', phase: 'start', comparing: null
    };

    const getHouseColor = (index) => {
        const isRobbed = currentState.robbedHouses.includes(index);
        const isCurrent = index === currentState.currentHouse;
        const isAdj = currentState.robbedHouses.some(r => Math.abs(r - index) === 1);
        if (isRobbed) return 'bg-green-600 text-white border-green-400 transform scale-110';
        if (isCurrent) return 'bg-rose-500 text-white border-rose-300 transform scale-105';
        if (isAdj && currentState.phase === 'complete') return 'bg-red-900/50 text-red-300 border-red-700';
        return 'bg-slate-700 text-slate-200 border-slate-500';
    };

    const getDpColor = (index, val) => {
        if (index === currentState.currentHouse) return 'bg-rose-500 text-white border-rose-400 transform scale-110';
        if (val === 0) return 'bg-slate-700 text-slate-500 border-slate-600';
        const tiers = ['bg-rose-900 text-rose-300 border-rose-800', 'bg-rose-700 text-rose-100 border-rose-600', 'bg-rose-500 text-white border-rose-400'];
        return tiers[Math.min(Math.floor(val / 6), 2)];
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `def rob(nums):
    if not nums: return 0
    if len(nums) == 1: return nums[0]

    dp = [0] * len(nums)
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])

    for i in range(2, len(nums)):
        dp[i] = max(nums[i] + dp[i-2], dp[i-1])

    return dp[-1]

# Space-optimized O(1) space
def rob_optimized(nums):
    if not nums: return 0
    prev2, prev1 = 0, 0
    for num in nums:
        prev2, prev1 = prev1, max(num + prev2, prev1)
    return prev1

# With reconstruction
def rob_with_houses(nums):
    n = len(nums)
    if n == 0: return 0, []
    dp = [0] * n
    dp[0] = nums[0]
    if n > 1: dp[1] = max(nums[0], nums[1])
    for i in range(2, n):
        dp[i] = max(nums[i] + dp[i-2], dp[i-1])

    robbed, i = [], n - 1
    while i >= 0:
        if i == 0 or (i >= 2 and dp[i] == nums[i] + dp[i-2]):
            robbed.append(i); i -= 2
        else:
            i -= 1
    return dp[-1], robbed[::-1]`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Home className="h-10 w-10" />House Robber Problem
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch 1D DP decide at each house whether to rob it or skip it, maximizing money while never touching adjacent houses.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1) optimized</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">1D DP Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Decision Making</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => isPlaying ? setIsPlaying(false) : setIsPlaying(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium" disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}><SkipBack size={18} />Step Back</button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}><SkipForward size={18} />Step Forward</button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"><RotateCcw size={18} />Reset</button>
                                <button onClick={() => { setHouses(Array.from({ length: Math.floor(Math.random() * 4) + 4 }, () => Math.floor(Math.random() * 15) + 1)); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Random</button>
                                <button onClick={() => { setHouses([...originalHouses]); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">Original</button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">House Values (comma-separated):</label>
                                <input type="text" value={houses.join(', ')}
                                    onChange={e => { const v = e.target.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x > 0); if (v.length > 0) setHouses(v); }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm" placeholder="2, 7, 9, 3, 1" />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (300ms)</span><span>Slow (2000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Phase: {currentState.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Neighbourhood visualization */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                                    Neighbourhood{currentState.robbedHouses.length > 0 ? ` — Robbed: $${currentState.maxMoney}` : ''}
                                </h3>
                                <div className="p-6 bg-slate-800/60 rounded-lg border border-slate-700/60 relative overflow-hidden">
                                    {/* Road */}
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-700 rounded-b-lg border-t border-slate-600" />
                                    <div className="flex justify-center items-end gap-4 relative z-10 pb-8">
                                        {houses.map((money, index) => {
                                            const isRobbed = currentState.robbedHouses.includes(index);
                                            const isAdj = currentState.robbedHouses.some(r => Math.abs(r - index) === 1);
                                            return (
                                                <div key={index} className="text-center">
                                                    <div className={`relative w-20 h-24 rounded-t-lg border-4 flex flex-col items-center justify-center transition-all duration-500 ${getHouseColor(index)}`}>
                                                        {/* Roof triangle */}
                                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[24px] border-r-[24px] border-b-[20px] border-transparent border-b-current opacity-70" />
                                                        <DollarSign className="h-5 w-5 mb-0.5" />
                                                        <span className="font-bold text-lg">{money}</span>
                                                        {isAdj && currentState.phase === 'complete' && (
                                                            <Shield className="absolute -top-2 -right-2 h-4 w-4 text-red-400" />
                                                        )}
                                                        {isRobbed && (
                                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-green-400 bg-slate-900/90 px-1 rounded border border-green-500/50">ROB</div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-xs text-slate-500">House {index}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {currentState.phase === 'complete' && (
                                        <div className="mt-2 text-center">
                                            <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-400 px-3 py-1 rounded-full text-sm">
                                                <Shield className="h-4 w-4" />No adjacent houses robbed!
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Decision analysis */}
                            {currentState.comparing && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Decision Analysis</h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <div className={`p-3 rounded border-2 text-center transition-all ${currentState.comparing.chosen === 'rob' ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                            <div className="font-semibold text-sm text-slate-200 mb-1">Rob Current</div>
                                            <div className="text-2xl font-bold text-green-400">${currentState.comparing.option1}</div>
                                            {currentState.comparing.robCurrent && <div className="text-xs text-slate-500 mt-1">{currentState.comparing.robCurrent}</div>}
                                        </div>
                                        <div className={`p-3 rounded border-2 text-center transition-all ${currentState.comparing.chosen === 'skip' ? 'border-orange-400 bg-orange-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                            <div className="font-semibold text-sm text-slate-200 mb-1">Skip Current</div>
                                            <div className="text-2xl font-bold text-orange-400">${currentState.comparing.option2}</div>
                                            {currentState.comparing.skipCurrent && <div className="text-xs text-slate-500 mt-1">{currentState.comparing.skipCurrent}</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DP Array */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">DP Array — Max Money Up To Each House</h3>
                                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    <div className="flex justify-center gap-2 mb-2">
                                        {currentState.dp.map((val, idx) => (
                                            <div key={idx} className="text-center">
                                                <div className="text-xs text-slate-500 mb-1">dp[{idx}]</div>
                                                <div className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${getDpColor(idx, val)}`}>
                                                    {val > 0 ? `$${val}` : '$0'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        {currentState.decisions.map((dec, idx) => (
                                            <div key={idx} className="w-14 text-center">
                                                <div className={`px-1 py-0.5 rounded text-xs font-medium ${dec === 'rob' ? 'bg-green-500/20 text-green-400' : dec === 'skip' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-500'}`}>
                                                    {dec || '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-300 mb-1">Current Step</h3>
                                        <p className="text-rose-200 text-sm leading-relaxed">{currentState.explanation}</p>
                                        {currentState.phase === 'complete' && (
                                            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-green-300 text-sm font-medium">
                                                Rob houses [{currentState.robbedHouses.join(', ')}] — Total: ${currentState.maxMoney}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space (opt):</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(1)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space (reconstruction):</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded">1D DP Array</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Constraint:</strong> no two adjacent houses</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Recurrence:</strong> dp[i] = max(nums[i]+dp[i-2], dp[i-1])</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Base cases:</strong> dp[0]=nums[0], dp[1]=max(nums[0],nums[1])</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">State:</strong> dp[i] = max money up to house i</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-rose-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HouseRobberPage;
