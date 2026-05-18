"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
    Mail, Github, Star, Send, CheckCircle,
    GitPullRequest, Bug, Sparkles, FileText,
    AlertCircle, MessageSquare, User, Tag,
    ArrowRight, Loader2, ExternalLink,
} from 'lucide-react';

/* ── contact methods ────────────────────────────────── */
const CONTACTS = [
    {
        icon:    <Mail className="w-5 h-5" />,
        label:   'Email',
        value:   'architrathod77@gmail.com',
        href:    'mailto:architrathod77@gmail.com',
        gradient:'from-blue-500 to-indigo-600',
        glow:    'hover:shadow-blue-500/20',
        border:  'hover:border-blue-500/40',
    },
    {
        icon:    <Github className="w-5 h-5" />,
        label:   'GitHub',
        value:   'github.com/Archit1706/dsaverse',
        href:    'https://github.com/Archit1706/dsaverse',
        gradient:'from-violet-500 to-purple-600',
        glow:    'hover:shadow-violet-500/20',
        border:  'hover:border-violet-500/40',
        external: true,
    },
];

/* ── open-source contribution items ─────────────────── */
const CONTRIBUTIONS = [
    { icon: <GitPullRequest className="w-4 h-4" />, text: 'Submit pull requests with new features' },
    { icon: <Sparkles       className="w-4 h-4" />, text: 'Add new algorithm visualizations'       },
    { icon: <Bug            className="w-4 h-4" />, text: 'Report bugs and suggest fixes'           },
    { icon: <FileText       className="w-4 h-4" />, text: 'Improve documentation and tutorials'    },
    { icon: <AlertCircle    className="w-4 h-4" />, text: 'Enhance existing visualizations'         },
];

/* ── feedback categories ─────────────────────────────── */
const CATEGORIES = [
    { value: 'bug',           label: 'Bug Report'              },
    { value: 'feature',       label: 'Feature Request'         },
    { value: 'improvement',   label: 'Improvement Suggestion'  },
    { value: 'collaboration', label: 'Collaboration Inquiry'   },
    { value: 'general',       label: 'General Feedback'        },
];

/* ── form field wrapper ──────────────────────────────── */
function Field({ label, icon, children }) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span className="text-indigo-400">{icon}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

const INPUT_BASE =
    'w-full px-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-sm';

/* ── page ────────────────────────────────────────────── */
export default function ContactPage() {
    const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        const form = e.target;
        try {
            await fetch('https://getform.io/f/aolowjgb', {
                method:  'POST',
                body:    new FormData(form),
                headers: { Accept: 'application/json' },
            });
        } catch { /* optimistic — getform still receives it */ }
        setStatus('sent');
        setTimeout(() => { setStatus('idle'); form.reset(); }, 3500);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">

            {/* ── Immersive header ── */}
            <div className="relative overflow-hidden bg-slate-950">
                {/* orbs + grid */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15 animate-blob"
                        style={{ background: 'radial-gradient(circle,#6366f1,#8b5cf6,transparent 70%)' }} />
                    <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-10 animate-blob"
                        style={{ background: 'radial-gradient(circle,#06b6d4,#3b82f6,transparent 70%)', animationDelay: '3s' }} />
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: 'linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)',
                            backgroundSize: '50px 50px',
                        }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14">
                    {/* breadcrumb */}
                    <nav className="flex items-center gap-2 mb-6 text-sm animate-fade-in">
                        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">Home</Link>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-500">Contact</span>
                    </nav>

                    <div className="max-w-2xl animate-fade-in-up delay-100">
                        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-4">
                            Get{' '}
                            <span className="gradient-text"
                                style={{ backgroundImage: 'linear-gradient(135deg,#818cf8,#38bdf8,#34d399)' }}>
                                In Touch
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Found a bug? Have a feature idea? Want to collaborate?
                            We'd love to hear from you.
                        </p>
                    </div>
                </div>

                {/* bottom separator */}
                <div className="h-px w-full"
                    style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
            </div>

            {/* ── Main content ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

                    {/* ── Left: Form (wider) ── */}
                    <div className="lg:col-span-3 animate-fade-in-up delay-200">
                        <div className="glass rounded-3xl border border-slate-700/40 p-8 space-y-6">
                            {/* card header */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Send Feedback</h2>
                                    <p className="text-xs text-slate-500">We read every message</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name */}
                                <Field label="Your Name" icon={<User className="w-3.5 h-3.5" />}>
                                    <input
                                        type="text" name="name" required
                                        placeholder="Archit Rathod"
                                        className={INPUT_BASE}
                                    />
                                </Field>

                                {/* Email */}
                                <Field label="Email Address" icon={<Mail className="w-3.5 h-3.5" />}>
                                    <input
                                        type="email" name="email" required
                                        placeholder="you@example.com"
                                        className={INPUT_BASE}
                                    />
                                </Field>

                                {/* Type */}
                                <Field label="Feedback Type" icon={<Tag className="w-3.5 h-3.5" />}>
                                    <select
                                        name="type" required
                                        className={`${INPUT_BASE} cursor-pointer`}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select feedback type…</option>
                                        {CATEGORIES.map(c => (
                                            <option key={c.value} value={c.value}
                                                className="bg-slate-800 text-slate-200">
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                {/* Message */}
                                <Field label="Your Message" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                                    <textarea
                                        name="message" rows={5} required
                                        placeholder="Tell us what's on your mind…"
                                        className={`${INPUT_BASE} resize-none`}
                                    />
                                </Field>

                                {/* honeypot */}
                                <input type="hidden" name="_gotcha" style={{ display: 'none' }} />

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={status !== 'idle'}
                                    className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-300 disabled:cursor-not-allowed
                                        ${status === 'sent'
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                                            : 'text-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-[0.98]'
                                        }`}
                                    style={status !== 'sent' ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}
                                >
                                    {status === 'idle'    && <><Send className="w-4 h-4" />Send Message</>}
                                    {status === 'sending' && <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>}
                                    {status === 'sent'    && <><CheckCircle className="w-4 h-4" />Message Sent!</>}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ── Right: Info ── */}
                    <div className="lg:col-span-2 space-y-5 animate-fade-in-right delay-300">

                        {/* Contact method cards */}
                        {CONTACTS.map(c => (
                            <a
                                key={c.label}
                                href={c.href}
                                target={c.external ? '_blank' : undefined}
                                rel={c.external ? 'noopener noreferrer' : undefined}
                                className={`group flex items-center gap-4 glass rounded-2xl border border-slate-700/40 ${c.border} p-5 hover:shadow-xl ${c.glow} transition-all duration-300 hover:scale-[1.02]`}
                            >
                                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${c.gradient} text-white shadow-lg`}>
                                    {c.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{c.label}</div>
                                    <div className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                                        {c.value}
                                    </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors ml-auto flex-shrink-0" />
                            </a>
                        ))}

                        {/* Open Source card */}
                        <div className="relative rounded-2xl border border-emerald-500/20 overflow-hidden glass p-6 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
                            {/* subtle emerald glow in corner */}
                            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
                                style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)' }} />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Open Source</h3>
                                        <p className="text-xs text-slate-500">Contributions welcome</p>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                    DSAverse is fully open source. We welcome developers worldwide
                                    to help build and improve the platform.
                                </p>

                                <ul className="space-y-2.5 mb-5">
                                    {CONTRIBUTIONS.map(({ icon, text }) => (
                                        <li key={text} className="flex items-start gap-2.5 text-sm text-slate-300">
                                            <span className="flex-shrink-0 mt-0.5 text-emerald-400">{icon}</span>
                                            {text}
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href="https://github.com/Archit1706/dsaverse"
                                    target="_blank" rel="noopener noreferrer"
                                    className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200"
                                >
                                    <Github className="w-4 h-4" />
                                    View on GitHub
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                </a>
                            </div>
                        </div>

                        {/* Response time note */}
                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-400 leading-relaxed">
                                We typically respond within <span className="text-slate-200 font-medium">24–48 hours</span>. For urgent issues, open a GitHub issue directly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
