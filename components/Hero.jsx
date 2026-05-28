"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Play, ArrowRight, Github, ChevronDown,
    Zap, BookOpen, BarChart2, Network,
} from 'lucide-react';

/* ─── Cycling words ──────────────────────────────────── */
const WORDS = ['Sorting', 'Searching', 'Recursion', 'Graphs', 'Heaps', 'Dynamic Prog.', 'Backtracking', 'Bit Manip.', 'Strings', 'Trees', 'Divide & Conquer', 'Union-Find'];

function WordCycler() {
    const [idx, setIdx] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const tick = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIdx(i => (i + 1) % WORDS.length);
                setVisible(true);
            }, 350);
        }, 2200);
        return () => clearInterval(tick);
    }, []);

    return (
        <span
            className="inline-block gradient-text"
            style={{
                backgroundImage: 'linear-gradient(135deg,#60a5fa,#a78bfa,#34d399)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                minWidth: '11ch',
            }}
        >
            {WORDS[idx]}
        </span>
    );
}

/* ─── Mini sort visualizer ───────────────────────────── */
const SORT_STEPS = [
    { arr: [64, 34, 25, 12, 22, 11, 90], hi: [0, 1], done: [] },
    { arr: [34, 64, 25, 12, 22, 11, 90], hi: [1, 2], done: [] },
    { arr: [34, 25, 64, 12, 22, 11, 90], hi: [2, 3], done: [] },
    { arr: [34, 25, 12, 64, 22, 11, 90], hi: [3, 4], done: [] },
    { arr: [34, 25, 12, 22, 64, 11, 90], hi: [4, 5], done: [] },
    { arr: [34, 25, 12, 22, 11, 64, 90], hi: [],     done: [6] },
    { arr: [11, 12, 22, 25, 34, 64, 90], hi: [],     done: [0, 1, 2, 3, 4, 5, 6] },
    { arr: [11, 12, 22, 25, 34, 64, 90], hi: [],     done: [0, 1, 2, 3, 4, 5, 6] },
];

function MiniVisualizer() {
    const [step, setStep] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setStep(s => (s + 1) % SORT_STEPS.length), 1000);
        return () => clearInterval(t);
    }, []);
    const { arr, hi, done } = SORT_STEPS[step];
    const max = Math.max(...arr);

    return (
        <div className="flex items-end justify-center gap-1.5 h-28">
            {arr.map((v, i) => {
                const isHi   = hi.includes(i);
                const isDone = done.includes(i);
                return (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div
                            className="w-8 rounded-t transition-all duration-500"
                            style={{
                                height: `${(v / max) * 96}px`,
                                background: isDone
                                    ? 'linear-gradient(to top,#10b981,#34d399)'
                                    : isHi
                                        ? 'linear-gradient(to top,#f59e0b,#fbbf24)'
                                        : 'linear-gradient(to top,#6366f1,#818cf8)',
                                boxShadow: isDone
                                    ? '0 0 12px rgba(16,185,129,0.5)'
                                    : isHi
                                        ? '0 0 12px rgba(245,158,11,0.6)'
                                        : 'none',
                            }}
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{v}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Floating background nodes ─────────────────────── */
const BG_NODES = [
    { top: '12%', left: '8%',  size: 6,  delay: '0s',    dur: '5s'  },
    { top: '35%', left: '3%',  size: 4,  delay: '1.5s',  dur: '7s'  },
    { top: '68%', left: '12%', size: 8,  delay: '0.8s',  dur: '6s'  },
    { top: '80%', left: '5%',  size: 5,  delay: '2.2s',  dur: '5.5s'},
    { top: '20%', right: '6%', size: 7,  delay: '0.4s',  dur: '6.5s'},
    { top: '55%', right: '4%', size: 5,  delay: '1.8s',  dur: '7s'  },
    { top: '75%', right: '9%', size: 9,  delay: '1s',    dur: '5s'  },
    { top: '10%', left: '45%', size: 4,  delay: '3s',    dur: '8s'  },
    { top: '90%', left: '55%', size: 6,  delay: '2s',    dur: '6s'  },
];

const CODE_FRAGMENTS = [
    { text: 'O(n log n)', top: '15%', left: '7%',  delay: '0s'   },
    { text: '[]',         top: '42%', left: '2%',  delay: '2s'   },
    { text: '→',          top: '70%', left: '10%', delay: '1s'   },
    { text: 'O(1)',        top: '25%', right: '5%', delay: '1.5s' },
    { text: '{}',         top: '60%', right: '3%', delay: '0.5s' },
    { text: 'n²',         top: '85%', right: '8%', delay: '3s'   },
];

/* ─── Stat counter ───────────────────────────────────── */
function useCountUp(target, duration = 1600, trigger = true) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!trigger) return;
        const start = performance.now();
        const raf = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setVal(Math.round(ease * target));
            if (t < 1) requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
    }, [target, duration, trigger]);
    return val;
}

const STATS = [
    { label: 'Algorithms',       value: 63, suffix: '+', icon: <Zap className="w-5 h-5" />        },
    { label: 'Categories',       value: 14, suffix: '',  icon: <Network className="w-5 h-5" />     },
    { label: 'Interactive Demos',value: 54, suffix: '+', icon: <BarChart2 className="w-5 h-5" />   },
    { label: 'Completely Free',  value: 100,suffix: '%', icon: <BookOpen className="w-5 h-5" />    },
];

function StatCard({ stat, index }) {
    const ref = useRef(null);
    const [started, setStarted] = useState(false);
    const val = useCountUp(stat.value, 1400, started);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } },
            { threshold: 0.5 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className="animate-fade-in-up glass rounded-2xl px-6 py-5 text-center group hover:scale-105 transition-transform duration-300 cursor-default"
            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
        >
            <div className="flex justify-center mb-2 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                {stat.icon}
            </div>
            <div className="text-3xl font-bold text-white font-mono tracking-tight">
                {val}{stat.suffix}
            </div>
            <div className="text-sm text-slate-400 mt-0.5">{stat.label}</div>
        </div>
    );
}

/* ─── Hero ───────────────────────────────────────────── */
export default function Hero() {
    return (
        <section className="relative min-h-screen bg-slate-950 overflow-hidden flex flex-col">

            {/* ── Background gradient orbs ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Primary orb */}
                <div
                    className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full animate-blob opacity-20"
                    style={{ background: 'radial-gradient(circle,#6366f1,#8b5cf6,transparent 70%)' }}
                />
                {/* Secondary orb */}
                <div
                    className="absolute -bottom-60 -right-60 w-[700px] h-[700px] rounded-full animate-blob opacity-15"
                    style={{
                        background: 'radial-gradient(circle,#06b6d4,#3b82f6,transparent 70%)',
                        animationDelay: '3s',
                    }}
                />
                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)',
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* ── Floating code fragments ── */}
            <div className="pointer-events-none absolute inset-0">
                {CODE_FRAGMENTS.map((f, i) => (
                    <span
                        key={i}
                        className="absolute text-xs font-mono text-indigo-500/40 animate-float-slow select-none"
                        style={{
                            top: f.top, left: f.left, right: f.right,
                            animationDelay: f.delay,
                            animationDuration: '7s',
                        }}
                    >
                        {f.text}
                    </span>
                ))}
                {/* Floating dot nodes */}
                {BG_NODES.map((n, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-indigo-500/20 animate-float"
                        style={{
                            top: n.top, left: n.left, right: n.right,
                            width: n.size, height: n.size,
                            animationDelay: n.delay,
                            animationDuration: n.dur,
                        }}
                    />
                ))}
            </div>

            {/* ── Main content ── */}
            <div className="relative z-10 flex-1 flex items-center">
                <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                        {/* Left ─ copy */}
                        <div className="space-y-8">
                            {/* Badge */}
                            <div className="animate-fade-in-up delay-100 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-indigo-300 border border-indigo-500/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Interactive Learning Platform
                            </div>

                            {/* Headline */}
                            <div className="space-y-2">
                                <h1
                                    className="animate-fade-in-up delay-200 text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
                                >
                                    Master
                                </h1>
                                <h1
                                    className="animate-fade-in-up delay-300 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
                                >
                                    <WordCycler />
                                </h1>
                                <h1
                                    className="animate-fade-in-up delay-400 text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
                                >
                                    Visually.
                                </h1>
                            </div>

                            {/* Description */}
                            <p
                                className="animate-fade-in-up delay-500 text-lg text-slate-400 leading-relaxed max-w-lg"
                            >
                                Step-by-step interactive animations for every major algorithm and
                                data structure. Watch the logic unfold, not just the code.
                            </p>

                            {/* CTA buttons */}
                            <div className="animate-fade-in-up delay-600 flex flex-wrap gap-4">
                                <Link
                                    href="/sorting"
                                    className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                                >
                                    <Play className="w-4 h-4" />
                                    Start Learning
                                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    href="/cheatsheet"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-200 glass border border-slate-600 hover:border-indigo-400 hover:text-white transition-all duration-300 hover:scale-105"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    Complexity Cheatsheet
                                </Link>
                            </div>

                            {/* Quick-nav chips */}
                            <div className="animate-fade-in-up delay-700 flex flex-wrap gap-2">
                                {['Sorting', 'Searching', 'Recursion', 'Dynamic Prog.', 'Heaps', 'Basics', 'Backtracking', 'Bit Manipulation', 'String Algorithms', 'Trees', 'Divide & Conquer', 'Union-Find'].map((cat, i) => (
                                    <Link
                                        key={cat}
                                        href={`/${cat.toLowerCase().replace(/&\s*/g, 'and-').replace(/[.\s]+/g, '-').replace(/-$/, '')}`}
                                        className="px-3 py-1 rounded-full text-xs font-medium text-slate-300 border border-slate-700 hover:border-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all duration-200"
                                        style={{ animationDelay: `${0.7 + i * 0.05}s` }}
                                    >
                                        {cat}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Right ─ visualizer card */}
                        <div className="animate-fade-in-right delay-400 flex justify-center lg:justify-end">
                            <div
                                className="w-full max-w-md glass rounded-3xl p-6 animate-glow-pulse"
                                style={{ border: '1px solid rgba(99,102,241,0.3)' }}
                            >
                                {/* Card header */}
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                    </div>
                                    <span className="text-xs font-mono text-slate-500">bubble-sort.py</span>
                                </div>

                                {/* Visualizer */}
                                <MiniVisualizer />

                                {/* Label row */}
                                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'linear-gradient(to top,#6366f1,#818cf8)' }} />Unsorted</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'linear-gradient(to top,#f59e0b,#fbbf24)' }} />Comparing</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'linear-gradient(to top,#10b981,#34d399)' }} />Sorted</span>
                                    </div>
                                    <span className="font-mono text-indigo-400">O(n²)</span>
                                </div>

                                {/* Complexity bar */}
                                <div className="mt-5 space-y-2">
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="w-16 text-slate-500 text-right">Time</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%' }} />
                                        </div>
                                        <span className="font-mono text-amber-400">O(n²)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="w-16 text-slate-500 text-right">Space</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div className="h-full w-[8%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                                        </div>
                                        <span className="font-mono text-emerald-400">O(1)</span>
                                    </div>
                                </div>

                                {/* Bottom CTA */}
                                <Link
                                    href="/sorting/bubble-sort"
                                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 hover:border-indigo-400 transition-all duration-200"
                                >
                                    <Play className="w-3.5 h-3.5" />
                                    Open Full Visualizer
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {STATS.map((s, i) => <StatCard key={i} stat={s} index={i} />)}
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="relative z-10 flex justify-center pb-8">
                <div className="flex flex-col items-center gap-1 text-slate-600 animate-scroll-bounce">
                    <span className="text-xs tracking-widest uppercase font-mono">scroll</span>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
        </section>
    );
}
