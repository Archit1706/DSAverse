import React from 'react';
import { Zap, Eye, BookOpen, Code2, BarChart2, Repeat2 } from 'lucide-react';

const FEATURES = [
    {
        icon:  <Zap className="w-6 h-6" />,
        title: 'Step-by-Step Animations',
        desc:  'Pause, rewind, and step through every comparison, swap, and decision. Watch algorithms think.',
        color: 'from-indigo-500 to-purple-600',
        glow:  'group-hover:shadow-indigo-500/30',
    },
    {
        icon:  <Eye className="w-6 h-6" />,
        title: 'Live Visual Feedback',
        desc:  "Colour-coded bars, nodes, and cells show exactly what's happening at every tick of the algorithm.",
        color: 'from-cyan-500 to-blue-600',
        glow:  'group-hover:shadow-cyan-500/30',
    },
    {
        icon:  <BarChart2 className="w-6 h-6" />,
        title: 'Complexity Analysis',
        desc:  'Best, average, and worst-case Big-O breakdowns alongside every visualizer, not buried in theory.',
        color: 'from-amber-500 to-orange-600',
        glow:  'group-hover:shadow-amber-500/30',
    },
    {
        icon:  <Code2 className="w-6 h-6" />,
        title: 'Code Examples',
        desc:  'Syntax-highlighted Python implementations with copy-to-clipboard on every algorithm page.',
        color: 'from-emerald-500 to-teal-600',
        glow:  'group-hover:shadow-emerald-500/30',
    },
    {
        icon:  <BookOpen className="w-6 h-6" />,
        title: 'Complexity Cheatsheet',
        desc:  'Quick-reference tables for every algorithm category — search, filter, and compare at a glance.',
        color: 'from-rose-500 to-pink-600',
        glow:  'group-hover:shadow-rose-500/30',
    },
    {
        icon:  <Repeat2 className="w-6 h-6" />,
        title: 'Customisable Input',
        desc:  'Randomise arrays, change sizes, and adjust speed sliders to build intuition with your own data.',
        color: 'from-violet-500 to-indigo-600',
        glow:  'group-hover:shadow-violet-500/30',
    },
];

export default function Features() {
    return (
        <section id="features" className="relative bg-slate-950 py-24 overflow-hidden">
            {/* subtle separator glow */}
            <div
                className="pointer-events-none absolute top-0 inset-x-0 h-px"
                style={{ background: 'linear-gradient(90deg,transparent,#6366f1,transparent)' }}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16 space-y-4">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5">
                        Why DSAverse
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                        Built for how you
                        <span
                            className="gradient-text ml-3"
                            style={{ backgroundImage: 'linear-gradient(135deg,#60a5fa,#a78bfa)' }}
                        >
                            actually learn
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Textbooks give you pseudocode. We give you the algorithm alive — animated,
                        explained, and yours to control.
                    </p>
                </div>

                {/* Feature grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f, i) => (
                        <div
                            key={i}
                            className={`group relative rounded-2xl p-6 bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${f.glow} animate-fade-in-up`}
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            {/* Icon */}
                            <div
                                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br ${f.color} text-white shadow-lg`}
                            >
                                {f.icon}
                            </div>

                            {/* Hover glow strip */}
                            <div
                                className={`absolute inset-x-0 bottom-0 h-px rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${f.color}`}
                            />

                            <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
