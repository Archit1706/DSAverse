"use client";

import React, { useEffect, useState } from 'react';
import {
    Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Lightbulb, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';
import { PredictToggle } from '@/components/PredictStep';

/* The guided-tour chrome the Deep Learning Architectures and Transformers
   pages share: act chips, a progress bar, the step counter, the standard
   controls and the explanation box — the same markup as the Self-Attention
   and Backpropagation reference pages, lifted out so seventeen pages do not
   each carry a copy. Its API matches components/ml/GuidedPlayer.jsx (built
   alongside it for the Language Models and RAG sections, in cyan and pink),
   so the two can become one file by merging their tone tables.

   Tailwind only emits classes it can see as literals, so each accent is a
   table of complete class strings. */
const TONES = {
    yellow: {
        chip: 'bg-yellow-500/20 text-yellow-100 border-yellow-400/50',
        bar: 'from-yellow-500 to-amber-400',
        play: 'bg-yellow-600 hover:bg-yellow-500',
        range: 'accent-yellow-500',
        box: 'bg-yellow-500/10 border-yellow-500/20',
        icon: 'text-yellow-400',
        text: 'text-yellow-200',
        tab: 'bg-yellow-600 text-white',
        button: 'bg-yellow-600 hover:bg-yellow-500 text-white',
        hover: 'hover:border-yellow-500',
    },
    indigo: {
        chip: 'bg-indigo-500/20 text-indigo-100 border-indigo-400/50',
        bar: 'from-indigo-500 to-violet-400',
        play: 'bg-indigo-600 hover:bg-indigo-500',
        range: 'accent-indigo-500',
        box: 'bg-indigo-500/10 border-indigo-500/20',
        icon: 'text-indigo-400',
        text: 'text-indigo-200',
        tab: 'bg-indigo-600 text-white',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        hover: 'hover:border-indigo-500',
    },
};
export const toneOf = (accent) => TONES[accent] ?? TONES.indigo;

/**
 * Step playback state with the site's setTimeout animation.
 *
 *   const play = useStepPlayback(stepHistory, 1600);
 *   const step = play.step;            // the step on screen
 *   usePredict(stepHistory, play.current, predictFor, play.pause);
 *
 * `current` is clamped to the stream, so a shorter stream (a new preset)
 * never leaves the tour pointing past its end.
 */
export function useStepPlayback(stepHistory, initialSpeed = 1500) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(initialSpeed);
    const last = Math.max(0, stepHistory.length - 1);
    const current = Math.min(currentStep, last);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (current >= last) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(Math.min(current + 1, last)), speed);
        return () => clearTimeout(t);
    }, [isPlaying, current, last, stepHistory, speed]);

    const [pause] = useState(() => () => setIsPlaying(false));
    return {
        current, last, isPlaying, speed, step: stepHistory[current],
        setCurrentStep, setIsPlaying, setSpeed, pause,
        jumpTo: (i) => { setIsPlaying(false); setCurrentStep(Math.max(0, Math.min(i, last))); },
    };
}

/**
 * Act chips, progress bar, the scene and the controls.
 *
 *   <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow">
 *       <VisualizationPanel step={play.step} />
 *   </TourPlayer>
 *
 * Each act is { id, label, icon }; each step carries `act` and `actName`.
 */
export default function TourPlayer({ acts, steps, play, predict, accent = 'indigo', minHeight = 'min-h-[320px]', extraControls, children }) {
    const t = toneOf(accent);
    const step = play.step;
    if (!step) return null;
    const total = steps.length;
    const jumpToAct = (id) => {
        const i = steps.findIndex(s => s.act === id);
        if (i >= 0) play.jumpTo(i);
    };
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="flex flex-wrap gap-1.5 px-4 pt-4" role="tablist" aria-label="Acts">
                {acts.map(act => {
                    const Icon = act.icon;
                    const tone = act.id === step.act
                        ? t.chip
                        : act.id < step.act ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300';
                    return (
                        <button key={act.id} role="tab" aria-selected={act.id === step.act} onClick={() => jumpToAct(act.id)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${tone}`}>
                            {Icon && <Icon className="h-3.5 w-3.5" />}{act.label}
                        </button>
                    );
                })}
            </div>
            <div className="h-0.5 bg-slate-800 mt-3">
                <div className={`h-full bg-gradient-to-r ${t.bar} transition-all`} style={{ width: `${total > 1 ? (play.current / (total - 1)) * 100 : 100}%` }} />
            </div>
            <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500 mb-3">
                    <span>Act {step.act} of {acts.length} · {step.actName}</span>
                    <span className="flex-shrink-0">step {play.current + 1} of {total}</span>
                </div>
                <div className={`${minHeight} flex items-center`}>
                    <div className="w-full min-w-0">{children}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={() => play.jumpTo(0)} aria-label="Reset"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                    <button onClick={() => play.setCurrentStep(Math.max(play.current - 1, 0))} disabled={play.isPlaying || play.current === 0} aria-label="Step back"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                    <button onClick={() => play.setIsPlaying(p => !p)} disabled={play.current >= total - 1 && !play.isPlaying}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white disabled:opacity-40 ${t.play}`}>
                        {play.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{play.isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button onClick={() => play.setCurrentStep(Math.min(play.current + 1, total - 1))} disabled={play.isPlaying || play.current >= total - 1} aria-label="Step forward"
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                    {predict && <PredictToggle predict={predict} accent={accent} />}
                    {extraControls}
                    <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                        Speed
                        <input type="range" min="200" max="2000" step="100" value={play.speed} onChange={e => play.setSpeed(Number(e.target.value))} className={`w-28 ${t.range}`} />
                    </label>
                </div>
            </div>
        </div>
    );
}

/** The step explanation, hidden while a predict prompt is waiting for an answer. */
export function ExplanationBox({ text, predict, accent = 'indigo' }) {
    const t = toneOf(accent);
    return (
        <div className={`border rounded-lg p-4 ${t.box}`}>
            <div className="flex items-start gap-2">
                <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${t.icon}`} />
                <p className={`text-sm leading-relaxed ${t.text}`}>
                    {predict?.hideExplanation ? 'Make your prediction above to reveal this step.' : text}
                </p>
            </div>
        </div>
    );
}

/** Guided / Explore (or any two or three modes) as a segmented control. */
export function ModeTabs({ modes, mode, setMode, accent = 'indigo' }) {
    const t = toneOf(accent);
    return (
        <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
            {modes.map(([key, label, Icon]) => (
                <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? t.tab : 'text-slate-400 hover:text-slate-200'}`}>
                    {Icon && <Icon className="h-4 w-4" />}{label}
                </button>
            ))}
        </div>
    );
}

/** A small segmented control for options inside a panel (layer, head, preset). */
export function Segmented({ options, value, onChange, accent = 'indigo', ariaLabel }) {
    const t = toneOf(accent);
    return (
        <div className="inline-flex flex-wrap rounded-lg border border-slate-700 p-0.5 bg-slate-900 text-xs" role="tablist" aria-label={ariaLabel}>
            {options.map(([key, label]) => (
                <button key={String(key)} role="tab" aria-selected={value === key} onClick={() => onChange(key)}
                    className={`px-2.5 py-1 rounded-md ${value === key ? t.tab : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
            ))}
        </div>
    );
}

/** The "A common misconception" card, refuted with measured numbers. */
export function Misconception({ claim, children }) {
    return (
        <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Lightbulb className="h-4 w-4 text-amber-400" />A common misconception</h2>
            <p className="text-sm text-slate-300 mb-2">&ldquo;{claim}&rdquo;</p>
            <div className="text-sm text-slate-400 leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

/** An amber note that says what a "break it" control just broke. */
export function BreakNote({ children }) {
    return (
        <div className="flex items-start gap-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>{children}</div>
        </div>
    );
}

/** Skeleton shown while a model or data file loads. */
export function LoadingCard({ text, rows = 3 }) {
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-6 space-y-4" aria-busy="true">
            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />{text}</div>
            <div className="flex flex-wrap gap-1.5">{Array.from({ length: 12 }, (_, k) => <div key={k} className="h-8 w-14 rounded-md bg-slate-800 animate-pulse" />)}</div>
            {Array.from({ length: rows }, (_, k) => <div key={k} className="h-16 rounded-lg bg-slate-800/70 animate-pulse" />)}
        </div>
    );
}

/** A failed model download, with a retry. */
export function LoadError({ error, onRetry, accent = 'indigo', what = 'The model' }) {
    const t = toneOf(accent);
    return (
        <div className="bg-slate-900/70 rounded-xl border border-rose-500/30 p-6 space-y-3">
            <p className="text-sm text-rose-200">{what} could not be loaded ({error?.message ?? 'unknown error'}).</p>
            <button onClick={onRetry} className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${t.button}`}>
                <RefreshCw className="h-4 w-4" />Try again
            </button>
        </div>
    );
}

/** The live formula panel under the explanation. */
export function FormulaPanel({ children }) {
    return (
        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 text-slate-100 text-sm sm:text-base">
            {children}
        </div>
    );
}

/** A titled card in the sidebar or the main column. */
export function Card({ title, icon: Icon, children, className = '' }) {
    return (
        <div className={`bg-slate-900/70 rounded-xl border border-slate-700/50 p-5 ${className}`}>
            {title && <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">{Icon && <Icon className="h-4 w-4 text-slate-400" />}{title}</h2>}
            {children}
        </div>
    );
}
