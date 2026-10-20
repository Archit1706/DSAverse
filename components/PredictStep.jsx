"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { HelpCircle, Check, X, Target } from 'lucide-react';

/**
 * "What happens next?" prompts for a step-based visualizer.
 *
 * Watching an animation is passive: it is easy to follow every frame and still
 * not be able to run the algorithm yourself. Being asked to commit to an answer
 * before the next frame turns that into retrieval practice.
 *
 * The page supplies `predictFor(step, nextStep)`, which returns
 * `{ question, options, correct, because }` for a step worth asking about, or
 * null for every other step. Keeping that per page matters: at a comparison
 * step bubble sort asks whether the pair swaps, selection sort asks whether the
 * minimum moves, and insertion sort asks whether the element shifts — the same
 * `comparisons: [a, b]` shape, three different questions.
 *
 * The prompt also hides the step explanation until an answer is in, because
 * these pages write the outcome into the explanation itself ("…need to swap!").
 */

/* Tailwind only emits classes it can see as literals, so accents are a lookup
   of complete class strings rather than `bg-${accent}-500/10`. Add a section's
   colour here when its pages start prompting. */
const ACCENTS = {
    orange: {
        panel: 'bg-orange-500/10 border-orange-500/30',
        icon: 'text-orange-400',
        text: 'text-orange-200',
        on: 'bg-orange-500/20 border-orange-500/60 text-orange-300',
    },
    indigo: {
        panel: 'bg-indigo-500/10 border-indigo-500/30',
        icon: 'text-indigo-400',
        text: 'text-indigo-200',
        on: 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300',
    },
};
const accentOf = (name) => ACCENTS[name] ?? ACCENTS.indigo;

export function usePredict(stepHistory, currentStep, predictFor, onPause) {
    const [enabled, setEnabled] = useState(false);
    const [answers, setAnswers] = useState({});   // step index -> chosen option

    const prompt = useMemo(() => {
        if (!enabled) return null;
        const step = stepHistory[currentStep];
        const next = stepHistory[currentStep + 1];
        if (!step || !next) return null;
        return predictFor(step, next);
    }, [enabled, stepHistory, currentStep, predictFor]);

    const chosen = answers[currentStep];
    const answered = chosen !== undefined;
    const pending = Boolean(prompt) && !answered;

    /* An unanswered prompt stops the playback, otherwise the answer scrolls
       past before the question has been read. */
    useEffect(() => { if (pending) onPause?.(); }, [pending, onPause]);

    const choose = useCallback((idx) => {
        setAnswers(a => (a[currentStep] !== undefined ? a : { ...a, [currentStep]: idx }));
    }, [currentStep]);

    const reset = useCallback(() => setAnswers({}), []);

    const score = useMemo(() => {
        let right = 0, total = 0;
        for (const [stepIdx, choice] of Object.entries(answers)) {
            const i = Number(stepIdx);
            const p = predictFor(stepHistory[i], stepHistory[i + 1]);
            if (!p) continue;
            total++;
            if (choice === p.correct) right++;
        }
        return { right, total };
    }, [answers, stepHistory, predictFor]);

    return {
        enabled,
        toggle: () => setEnabled(e => { if (e) reset(); return !e; }),
        prompt, chosen, answered, pending, choose, reset, score,
        // The page blurs its explanation while a prompt is outstanding.
        hideExplanation: pending,
    };
}

/** The toggle that turns prompting on, sized to sit in a controls row. */
export function PredictToggle({ predict, accent = 'indigo' }) {
    const { enabled, toggle, score } = predict;
    const a = accentOf(accent);
    return (
        <button
            onClick={toggle}
            aria-pressed={enabled}
            title="Pause at each decision and guess what the algorithm does next"
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${enabled
                ? a.on
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
            <Target className="h-3.5 w-3.5" />
            Predict
            {enabled && score.total > 0 && (
                <span className="font-mono tabular-nums">{score.right}/{score.total}</span>
            )}
        </button>
    );
}

/** The question card. Renders nothing unless there is something to ask. */
export function PredictPrompt({ predict, accent = 'indigo' }) {
    const { prompt, chosen, answered, choose } = predict;
    if (!prompt) return null;
    const a = accentOf(accent);

    return (
        <div className={`rounded-lg border p-4 ${a.panel}`}>
            <div className="flex items-start gap-2 mb-3">
                <HelpCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${a.icon}`} />
                <p className={`text-sm font-medium ${a.text}`}>{prompt.question}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prompt.options.map((opt, i) => {
                    const isCorrect = i === prompt.correct;
                    const isChosen = i === chosen;
                    let tone = 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500';
                    if (answered) {
                        if (isCorrect) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (isChosen) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 bg-slate-900/40 text-slate-600';
                    }
                    return (
                        <button key={opt} onClick={() => choose(i)} disabled={answered}
                            className={`flex items-center justify-between gap-2 text-left text-sm px-3 py-2 rounded-lg border transition-colors ${tone} ${answered ? 'cursor-default' : ''}`}>
                            <span>{opt}</span>
                            {answered && isCorrect && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                            {answered && isChosen && !isCorrect && <X className="h-3.5 w-3.5 flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {answered && prompt.because && (
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">{prompt.because}</p>
            )}
            {!answered && (
                <p className="mt-3 text-xs text-slate-500">Commit to an answer to reveal the step.</p>
            )}
        </div>
    );
}

export default PredictPrompt;
