import React from 'react';
export const metadata = {
    title: "Basic Data Structures – Stack, Queue & List Visualizer",
    description: "Interactive visualizations of fundamental data structures: Stacks (array & linked list), Queues (array & linked list), and Lists. Learn push, pop, enqueue, dequeue operations step by step.",
    keywords: ["stack", "queue", "linked list", "array", "data structures", "push pop", "enqueue dequeue", "algorithm visualization"],
    openGraph: {
        title: "Basic Data Structures Visualizer – DSAverse",
        description: "Interactive visualizations of stacks, queues, and lists with step-by-step operations.",
        images: [{ url: "/og-image.png" }],
    },
};

import { Play, Code, Clock, Database, List, Layers, ArrowUpDown, ArrowRight, Brain, BookOpen, Zap, Briefcase, Check, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function BasicsPage() {
    const basicDataStructures = [
        {
            name: "Stack: Array",
            slug: "stack-array",
            description: "LIFO with fixed-size array. Push, pop, and peek in O(1).",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <Layers className="h-7 w-7" />,
            applications: ["Function calls", "Undo/redo", "Expression parsing"],
            tag: "Array"
        },
        {
            name: "Stack: Linked List",
            slug: "stack-linked-list",
            description: "LIFO using dynamic linked nodes. No overflow — grows with memory.",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <Layers className="h-7 w-7" />,
            applications: ["Dynamic size", "Memory pools", "Recursive algos"],
            tag: "Linked List"
        },
        {
            name: "Queue: Array",
            slug: "queues-array",
            description: "FIFO with circular array. Enqueue at rear, dequeue at front.",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <ArrowUpDown className="h-7 w-7" />,
            applications: ["Task scheduling", "BFS traversal", "Print queue"],
            tag: "Array"
        },
        {
            name: "Queue: Linked List",
            slug: "queues-linked-list",
            description: "FIFO with front+rear pointers. True O(1) for both ends.",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <ArrowUpDown className="h-7 w-7" />,
            applications: ["Async buffers", "Network packets", "OS scheduling"],
            tag: "Linked List"
        },
        {
            name: "List: Dynamic Array",
            slug: "lists-array",
            description: "Resizable array that doubles capacity when full. O(1) access.",
            timeComplexity: "O(1) access",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <List className="h-7 w-7" />,
            applications: ["Python list", "Java ArrayList", "C++ vector"],
            tag: "Array"
        },
        {
            name: "List: Linked List",
            slug: "lists-linked-list",
            description: "Dynamic nodes with pointers. Efficient head insert/delete.",
            timeComplexity: "O(n) access",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <Database className="h-7 w-7" />,
            applications: ["Playlists", "Browser history", "Graph edges"],
            tag: "Linked List"
        },
        {
            name: "Linked List: Doubly",
            slug: "linked-list-doubly",
            description: "Bidirectional nodes with prev + next pointers. O(1) tail delete and backward traversal.",
            timeComplexity: "O(1) ends",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <ArrowUpDown className="h-7 w-7" />,
            applications: ["LRU cache", "Undo/redo stacks", "Browser history"],
            tag: "Linked List"
        },
        {
            name: "Linked List: Circular",
            slug: "linked-list-circular",
            description: "Tail's next wraps to head — no NULL. Ideal for round-robin and circular buffers.",
            timeComplexity: "O(1) ends",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <ArrowRight className="h-7 w-7" />,
            applications: ["Round-robin CPU", "Ring buffers", "Game turns"],
            tag: "Linked List"
        },
        {
            name: "Linked List: Circular Doubly",
            slug: "linked-list-circular-doubly",
            description: "Bidirectional + circular — the most powerful variant. No NULL pointers anywhere.",
            timeComplexity: "O(1) ends",
            spaceComplexity: "O(n)",
            difficulty: "Advanced",
            icon: <List className="h-7 w-7" />,
            applications: ["Linux kernel", "LRU cache", "Text editors"],
            tag: "Linked List"
        }
    ];

    const getDifficultyStyle = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-500/15 text-green-400 border border-green-500/30';
            case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
            case 'Advanced': return 'bg-red-500/15 text-red-400 border border-red-500/30';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    const learningPath = [
        { step: 1, title: "Stack (Array)", slug: "stack-array", desc: "Start here — understand LIFO" },
        { step: 2, title: "Queue (Array)", slug: "queues-array", desc: "Learn FIFO as the flip side of LIFO" },
        { step: 3, title: "Linked implementations", slug: "stack-linked-list", desc: "See how dynamic allocation changes the game" },
        { step: 4, title: "Dynamic Lists", slug: "lists-array", desc: "Understand resizing and direct access trade-offs" },
        { step: 5, title: "Doubly Linked List", slug: "linked-list-doubly", desc: "Add prev pointers for O(1) tail delete and backward traversal" },
        { step: 6, title: "Circular & Circular Doubly", slug: "linked-list-circular", desc: "Close the ring — no NULL, infinite cycling" },
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Hero */}
            <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
                            <BookOpen className="h-4 w-4" /> Foundational Data Structures
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                            Basic Data Structures
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Master the fundamental building blocks of computing — stacks, queues, and lists.
                            Each page includes interactive visualizations, step-by-step explanations, and active recall quizzes.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" /> Step-by-step animations
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Brain className="h-4 w-4" /> Active recall quizzes
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" /> Python implementations
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Zap className="h-4 w-4" /> Manual step navigation
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                {/* Data Structures Grid */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-white mb-2 text-center">Choose a Visualizer</h2>
                    <p className="text-slate-400 text-center mb-10">Each includes interactive operations, color-coded animations, and a quiz to test retention.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                        {basicDataStructures.map((ds, index) => (
                            <Link key={index} href={`/basics/${ds.slug}`} className="group block h-full">
                                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 shadow-xl transition-all duration-300 overflow-hidden hover:shadow-blue-500/10 hover:-translate-y-1 h-full flex flex-col">
                                    {/* Card header — fixed height for all the cards */}
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white flex-shrink-0">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="bg-white/20 rounded-xl p-2.5 text-white/90">
                                                {ds.icon}
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getDifficultyStyle(ds.difficulty)}`}>
                                                {ds.difficulty}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-1.5">{ds.name}</h3>
                                        <p className="text-white/75 text-sm leading-relaxed">{ds.description}</p>
                                    </div>

                                    {/* Card body — stretches to fill remaining height */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                                <div className="text-base font-bold text-blue-400 font-mono">{ds.timeComplexity}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">Time</div>
                                            </div>
                                            <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                                <div className="text-base font-bold text-purple-400 font-mono">{ds.spaceComplexity}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">Space</div>
                                            </div>
                                        </div>

                                        <div className="flex-1 mb-4">
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Used in</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ds.applications.map((app) => (
                                                    <span key={app} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                                                        {app}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer pinned to bottom */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-auto">
                                            <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors flex items-center gap-1">
                                                Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{ds.tag}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Learning Path + Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Recommended Learning Path */}
                    <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <BookOpen className="h-5 w-5 text-blue-400" />
                            <h2 className="text-xl font-bold text-white">Learning Path</h2>
                        </div>
                        <div className="space-y-3">
                            {learningPath.map(({ step, title, slug, desc }) => (
                                <Link key={step} href={`/basics/${slug}`}
                                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-transparent hover:border-blue-500/30 transition-all group">
                                    <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:bg-blue-600/40 transition-colors">
                                        {step}
                                    </div>
                                    <div>
                                        <div className="text-slate-200 font-medium text-sm">{title}</div>
                                        <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Why Learn These? */}
                    <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            <h2 className="text-xl font-bold text-white">Why It Matters</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Stacks, queues, and lists appear everywhere — from your browser&apos;s back button to operating system schedulers and compiler parsers.
                            </p>
                            {[
                                { Icon: Layers, bold: 'Foundation', rest: 'for trees, graphs, and advanced algorithms', color: 'text-blue-400' },
                                { Icon: Briefcase, bold: 'Interview staple', rest: 'asked in virtually every technical interview', color: 'text-yellow-400' },
                                { Icon: Zap, bold: 'Performance', rest: 'choosing the right structure changes O(n) to O(1)', color: 'text-green-400' },
                            ].map(({ Icon, bold, rest, color }) => (
                                <div key={bold} className="flex items-start gap-3">
                                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                                    <p className="text-sm text-slate-400"><span className="text-slate-200 font-semibold">{bold}</span> — {rest}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Concepts */}
                    <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Brain className="h-5 w-5 text-purple-400" />
                            <h2 className="text-xl font-bold text-white">Key Concepts</h2>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['LIFO', 'Stack principle — last inserted is first out', 'border-blue-500'],
                                ['FIFO', 'Queue principle — first inserted is first out', 'border-violet-500'],
                                ['Amortized O(1)', 'Dynamic array append — expensive resizes spread across many ops', 'border-sky-500'],
                                ['Pointer overhead', 'Linked structures cost extra memory per node', 'border-cyan-500'],
                            ].map(([term, desc, border]) => (
                                <div key={term} className={`border-l-4 ${border} pl-3 py-1`}>
                                    <div className="font-mono font-semibold text-slate-200 text-sm">{term}</div>
                                    <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">Array vs Linked List: Quick Reference</h2>
                    <p className="text-slate-400 text-center text-sm mb-6">Choose the right implementation for your use case</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-700/50">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Property</th>
                                    <th className="text-center py-3 px-4 font-semibold text-blue-400">Array</th>
                                    <th className="text-center py-3 px-4 font-semibold text-purple-400">Linked List</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-400">
                                {[
                                    ['Memory Layout', { text: 'Contiguous', icon: null }, { text: 'Scattered nodes', icon: null }],
                                    ['Random Access', { text: 'O(1)', icon: 'check' }, { text: 'O(n)', icon: 'x' }],
                                    ['Insert at head', { text: 'O(n) shift', icon: 'x' }, { text: 'O(1)', icon: 'check' }],
                                    ['Cache Performance', { text: 'Excellent', icon: 'check' }, { text: 'Poor', icon: 'warn' }],
                                    ['Memory per element', { text: 'Value only', icon: 'check' }, { text: 'Value + pointer', icon: 'warn' }],
                                    ['Max size', { text: 'Fixed / grows', icon: null }, { text: 'Unlimited (RAM)', icon: null }],
                                ].map(([aspect, arr, ll], i) => {
                                    const renderCell = ({ text, icon }) => (
                                        <span className={`inline-flex items-center justify-center gap-1 font-mono text-xs ${icon === 'check' ? 'text-green-400' : icon === 'x' ? 'text-red-400' : icon === 'warn' ? 'text-yellow-400' : 'text-slate-400'}`}>
                                            {icon === 'check' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                                            {icon === 'x' && <X className="h-3.5 w-3.5 flex-shrink-0" />}
                                            {icon === 'warn' && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                                            {text}
                                        </span>
                                    );
                                    return (
                                        <tr key={aspect} className={`border-b border-slate-800 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                                            <td className="py-3 px-4 font-medium text-slate-300">{aspect}</td>
                                            <td className="py-3 px-4 text-center">{renderCell(arr)}</td>
                                            <td className="py-3 px-4 text-center">{renderCell(ll)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
