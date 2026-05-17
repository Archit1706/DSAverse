import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, BarChart2 } from 'lucide-react';

export default function CTA() {
    return (
        <section className="relative bg-slate-950 py-24 overflow-hidden">
            {/* Top separator */}
            <div className="pointer-events-none absolute top-0 inset-x-0 h-px"
                style={{ background: 'linear-gradient(90deg,transparent,#06b6d4,transparent)' }} />

            {/* Background orb */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                    className="w-[600px] h-[400px] rounded-full opacity-10 animate-blob"
                    style={{ background: 'radial-gradient(ellipse,#6366f1,#8b5cf6,transparent 70%)' }}
                />
            </div>

            {/* Grid pattern */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(#a78bfa 1px,transparent 1px),linear-gradient(90deg,#a78bfa 1px,transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
                <div className="space-y-4 animate-fade-in-up">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5">
                        Ready to learn?
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                        Stop reading.
                        <span
                            className="gradient-text ml-3"
                            style={{ backgroundImage: 'linear-gradient(135deg,#60a5fa,#a78bfa,#34d399)' }}
                        >
                            Start seeing.
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Every algorithm comes alive in under a minute. No setup. No cost.
                        Just click and learn.
                    </p>
                </div>

                <div className="animate-fade-in-up delay-200 flex flex-wrap items-center justify-center gap-4">
                    <Link
                        href="/sorting"
                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] text-base"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                    >
                        Start with Sorting
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                    <Link
                        href="/cheatsheet"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-slate-200 border border-slate-600 hover:border-indigo-400 hover:text-white transition-all duration-300 hover:scale-105 glass text-base"
                    >
                        <BookOpen className="w-4 h-4" />
                        View Cheatsheet
                    </Link>
                </div>

                {/* Mini feature chips */}
                <div className="animate-fade-in-up delay-400 flex flex-wrap justify-center gap-3 text-sm text-slate-500">
                    {['No sign-up required', '38+ algorithms', 'Free forever', 'Mobile friendly'].map(t => (
                        <span key={t} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
