"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    Brain, ArrowLeft, ArrowRight, Check, X, RotateCcw, Sparkles,
    Layers, Target, Clock3, Trophy, ExternalLink,
} from 'lucide-react';
import { totalQuestions as TOTAL_QUESTIONS, totalPages as TOTAL_PAGES } from '@/data/learningStats';
import { buildQueue, queueStats, recordAnswer, resetProgress, getSchedule } from '@/lib/progress';

const SECTION_LABELS = {
    'backtracking': 'Backtracking',
    'basics': 'Basics',
    'bit-manipulation': 'Bit Manipulation',
    'divide-and-conquer': 'Divide & Conquer',
    'dynamic-programming': 'Dynamic Programming',
    'graph-algorithms': 'Graph Algorithms',
    'heap-like-data-structures': 'Heap-like Structures',
    'indexing': 'Indexing',
    'recursion': 'Recursion',
    'searching': 'Searching',
    'sorting': 'Sorting',
    'string-algorithms': 'String Algorithms',
    'trees': 'Trees',
    'two-pointers-and-sliding-window': 'Two Pointers',
    'under-the-hood': 'Under the Hood',
    'union-find': 'Union-Find',
};

const SESSION_SIZE = 15;

export default function ReviewPage() {
    /* The quiz bank is ~225 KB — far too much to put on the critical path for
       a page whose shell is a handful of counters. It is imported on mount,
       the same way the command palette pulls in its page index. Progress is in
       localStorage and is likewise unknown until after mount, so the server
       and the first client render both produce the same empty shell. */
    const [bank, setBank] = useState(null);
    const [stats, setStats] = useState({ due: 0, learning: 0, known: 0, unseen: 0, total: TOTAL_QUESTIONS });
    const [section, setSection] = useState(null);

    const [queue, setQueue] = useState([]);
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [answered, setAnswered] = useState(false);
    const [results, setResults] = useState([]);

    const ready = bank !== null;

    const refreshStats = useCallback((b) => { if (b) setStats(queueStats(b)); }, []);

    useEffect(() => {
        let cancelled = false;
        import('@/data/quizBank')
            .then(m => {
                if (cancelled) return;
                setBank(m.quizBank);
                setStats(queueStats(m.quizBank));
            })
            .catch(() => { if (!cancelled) setBank([]); });
        return () => { cancelled = true; };
    }, []);

    const sectionStats = useMemo(() => {
        if (!ready) return [];
        const schedule = getSchedule();
        const now = Date.now();
        const sections = [...new Set(bank.map(q => q.section))].sort();
        return sections.map(s => {
            const qs = bank.filter(q => q.section === s);
            let known = 0, due = 0;
            for (const q of qs) {
                const card = schedule[q.id];
                if (!card) continue;
                if (card.due <= now) due++;
                else if (card.step >= 3) known++;
            }
            return { section: s, total: qs.length, known, due };
        });
        // `stats` is listed on purpose, not because it is read: this reads the
        // schedule straight out of localStorage, which no dependency can
        // describe. A new `stats` object is the signal that the schedule just
        // changed — it is set from the same reads, after a session ends or a
        // reset — so it is what makes the per-section counts refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, bank, stats]);

    const start = (onlySection = null) => {
        const q = buildQueue(bank, { limit: SESSION_SIZE, section: onlySection });
        setSection(onlySection);
        setQueue(q);
        setIndex(0);
        setSelected(null);
        setAnswered(false);
        setResults([]);
    };

    const answer = (choice) => {
        if (answered) return;
        const q = queue[index];
        const correct = choice === q.correct;
        recordAnswer(q.id, correct);
        setSelected(choice);
        setAnswered(true);
        setResults(r => [...r, { id: q.id, correct, question: q, chosen: choice }]);
    };

    const next = () => {
        if (index + 1 >= queue.length) {
            refreshStats(bank);
            setIndex(queue.length);   // past the end → summary
        } else {
            setIndex(i => i + 1);
            setSelected(null);
            setAnswered(false);
        }
    };

    // Keyboard: 1-4 to answer, Enter/Space to advance.
    useEffect(() => {
        if (!queue.length || index >= queue.length) return;
        const onKey = (e) => {
            // The listener is on window, so it would otherwise fire while the
            // user is typing somewhere else — searching in the command palette
            // for "2-3 trees" was silently answering the question behind it.
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            if (!answered && ['1', '2', '3', '4'].includes(e.key)) {
                const i = Number(e.key) - 1;
                if (i < queue[index].options.length) { e.preventDefault(); answer(i); }
            } else if (answered && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                next();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }); // re-bound each render so it closes over the current question

    const inSession = queue.length > 0 && index < queue.length;
    const finished = queue.length > 0 && index >= queue.length;
    const pct = stats.total ? Math.round((stats.known / stats.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/" className="flex items-center text-white hover:text-indigo-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-5">
                            <Brain className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-3">Review</h1>
                        <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
                            {TOTAL_QUESTIONS} questions drawn from all {TOTAL_PAGES} visualizers,
                            scheduled so each one comes back just before you would forget it.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {!ready ? (
                    <div className="text-center py-24 text-slate-500 text-sm">Loading your progress…</div>
                ) : inSession ? (
                    <SessionCard
                        q={queue[index]} i={index} total={queue.length}
                        selected={selected} answered={answered}
                        onAnswer={answer} onNext={next}
                    />
                ) : finished ? (
                    <Summary results={results} onAgain={() => start(section)} onHome={() => setQueue([])} />
                ) : (
                    <Dashboard
                        stats={stats} pct={pct} sectionStats={sectionStats}
                        onStart={start}
                        onReset={() => { resetProgress(); refreshStats(bank); }}
                    />
                )}
            </div>
        </div>
    );
}

/* ── dashboard ──────────────────────────────────────────── */

function Dashboard({ stats, pct, sectionStats, onStart, onReset }) {
    const tiles = [
        { label: 'Due now', value: stats.due, icon: Clock3, tone: 'text-amber-400 border-amber-500/40' },
        { label: 'Learning', value: stats.learning, icon: Target, tone: 'text-sky-400 border-sky-500/40' },
        { label: 'Known', value: stats.known, icon: Trophy, tone: 'text-emerald-400 border-emerald-500/40' },
        { label: 'Not seen', value: stats.unseen, icon: Layers, tone: 'text-slate-400 border-slate-600' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tiles.map(t => {
                    const Icon = t.icon;
                    return (
                        <div key={t.label} className={`bg-slate-900/70 rounded-xl border p-4 text-center ${t.tone}`}>
                            <Icon className="h-5 w-5 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">{t.value}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{t.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Overall mastery</span>
                    <span className="text-sm text-slate-400">{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-3">
                    A question counts as known once you have answered it correctly three reviews in a row.
                    Progress is stored in this browser only — no account, nothing sent anywhere.
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                <button onClick={() => onStart(null)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-semibold">
                    <Sparkles className="h-5 w-5" />
                    {stats.due > 0 ? `Review ${Math.min(stats.due, SESSION_SIZE)} due` : 'Start a session'}
                </button>
                {stats.known + stats.learning + stats.due > 0 && (
                    <button onClick={onReset}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm">
                        <RotateCcw className="h-4 w-4" />Reset progress
                    </button>
                )}
            </div>

            <div>
                <h2 className="text-lg font-bold text-white mb-4">Practise one section</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sectionStats.map(s => {
                        const p = s.total ? Math.round((s.known / s.total) * 100) : 0;
                        return (
                            <button key={s.section} onClick={() => onStart(s.section)}
                                className="text-left bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 hover:border-indigo-500/60 transition-colors group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-200 text-sm group-hover:text-white">
                                        {SECTION_LABELS[s.section] ?? s.section}
                                    </span>
                                    {s.due > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                                            {s.due} due
                                        </span>
                                    )}
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1.5">
                                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${p}%` }} />
                                </div>
                                <div className="text-[11px] text-slate-500">{s.known}/{s.total} known</div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── one question ───────────────────────────────────────── */

function SessionCard({ q, i, total, selected, answered, onAnswer, onNext }) {
    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Question {i + 1} of {total}</span>
                <Link href={q.route} className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                    {q.title}<ExternalLink className="h-3 w-3" />
                </Link>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((i + 1) / total) * 100}%` }} />
            </div>

            <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-6 sm:p-8">
                <p className="text-lg font-medium text-slate-100 mb-6 leading-relaxed">{q.question}</p>

                <div className="space-y-2.5">
                    {q.options.map((opt, idx) => {
                        let cls = 'border-slate-600 text-slate-300 hover:border-indigo-500 hover:text-white bg-slate-800/50';
                        if (answered) {
                            if (idx === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                            else if (idx === selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                            else cls = 'border-slate-700 text-slate-500 bg-slate-800/30';
                        }
                        return (
                            <button key={idx} onClick={() => onAnswer(idx)} disabled={answered}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-start gap-3 ${cls}`}>
                                <span className="text-[11px] font-mono mt-0.5 opacity-60 flex-shrink-0">{idx + 1}</span>
                                <span className="flex-1">{opt}</span>
                                {answered && idx === q.correct && <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />}
                                {answered && idx === selected && idx !== q.correct && <X className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                            </button>
                        );
                    })}
                </div>

                {answered && (
                    <div className="mt-6">
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 mb-4">
                            <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <Link href={q.route} className="text-sm text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5">
                                Watch it again<ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <button onClick={onNext}
                                className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm">
                                {i + 1 >= total ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>
                )}

                {!answered && (
                    <p className="text-[11px] text-slate-600 mt-5">Press 1–4 to answer, Enter to continue.</p>
                )}
            </div>
        </div>
    );
}

/* ── summary ────────────────────────────────────────────── */

function Summary({ results, onAgain, onHome }) {
    const right = results.filter(r => r.correct).length;
    const missed = results.filter(r => !r.correct);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-8 text-center mb-6">
                <div className="text-5xl font-bold text-white mb-2">{right}<span className="text-slate-500 text-3xl">/{results.length}</span></div>
                <p className="text-slate-400 mb-6">
                    {right === results.length
                        ? 'Every one correct — those come back further out now.'
                        : `${missed.length} to revisit. Missed questions reset to the start of the schedule.`}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={onAgain} className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium text-sm">
                        Another session
                    </button>
                    <button onClick={onHome} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-sm">
                        Back to dashboard
                    </button>
                </div>
            </div>

            {missed.length > 0 && (
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-6">
                    <h2 className="font-bold text-white mb-4">Worth another look</h2>
                    <div className="space-y-3">
                        {missed.map(m => (
                            <Link key={m.id} href={m.question.route}
                                className="block bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-indigo-500/60 transition-colors">
                                <p className="text-sm text-slate-200 mb-1">{m.question.question}</p>
                                <p className="text-xs text-green-400 mb-1">{m.question.options[m.question.correct]}</p>
                                <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                                    {m.question.title}<ArrowRight className="h-3 w-3" />
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
