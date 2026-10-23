"use client";

import React from 'react';

/* Tailwind only emits classes it can see as literals, so the slider accent is
   a lookup of complete class names rather than `accent-${colour}-500`. */
const ACCENT = {
    indigo: 'accent-indigo-500',
    fuchsia: 'accent-fuchsia-500',
    rose: 'accent-rose-500',
    sky: 'accent-sky-500',
    violet: 'accent-violet-500',
    emerald: 'accent-emerald-500',
    teal: 'accent-teal-500',
};

/**
 * A labelled slider with its live value, for the "slide n and watch" half of
 * a Math page.
 *
 *   <ParamSlider label="n" value={n} onChange={setN} min={1} max={50} step={1} accent="teal" />
 */
export default function ParamSlider({ label, value, onChange, min = 0, max = 10, step = 1, accent = 'indigo', format, hint, disabled = false }) {
    const shown = format ? format(value) : String(value);
    return (
        <label className={`block ${disabled ? 'opacity-50' : ''}`}>
            <span className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-sm font-medium text-slate-300">{label}</span>
                <span className="font-mono text-sm text-slate-100 tabular-nums">{shown}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={e => onChange(Number(e.target.value))}
                className={`w-full ${ACCENT[accent] ?? ACCENT.indigo}`}
            />
            {hint && <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>}
        </label>
    );
}
