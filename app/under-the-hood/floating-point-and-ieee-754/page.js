"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    CircleAlert, Binary, LayoutGrid, Scissors, Plus, Ruler, Equal, Ghost,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'The Anomaly',  icon: CircleAlert },
    { id: 2, label: 'Binary Halves', icon: Binary     },
    { id: 3, label: 'Bit Layout',   icon: LayoutGrid  },
    { id: 4, label: 'Rounding',     icon: Scissors    },
    { id: 5, label: 'The Addition', icon: Plus        },
    { id: 6, label: 'Spacing',      icon: Ruler       },
    { id: 7, label: 'Comparing',    icon: Equal       },
    { id: 8, label: 'Odd Values',   icon: Ghost       },
];

// ── Real IEEE 754 bits, computed rather than transcribed ───────────────────────
function bitsOf(x) {
    const buf = new ArrayBuffer(8);
    const dv = new DataView(buf);
    dv.setFloat64(0, x);
    let s = '';
    for (let i = 0; i < 8; i++) s += dv.getUint8(i).toString(2).padStart(8, '0');
    return s;
}
const exact = x => (Number.isFinite(x) ? x.toPrecision(20) : String(x));
const rawExp = x => parseInt(bitsOf(x).slice(1, 12), 2);
const unbiased = x => rawExp(x) - 1023;

const SUM = 0.1 + 0.2;

// ── Register geometry ──────────────────────────────────────────────────────────
const BITX = 68, BITW = 9.6, BITH = 24;
const bx = i => BITX + i * BITW;
const SIGN_END = bx(1), EXP_END = bx(12), MANT_END = bx(64);

const FIELD_COLOR = { sign: '#a78bfa', exp: '#f59e0b', mant: '#38bdf8' };
const fieldOf = i => (i === 0 ? 'sign' : i < 12 ? 'exp' : 'mant');

// ── Persistent register stage ──────────────────────────────────────────────────
function RegisterBlock({ label, value, top, marks = [], dim = false }) {
    const bits = bitsOf(value);
    const e = unbiased(value);
    const mantissa = bits.slice(12);

    return (
        <g style={{ opacity: dim ? 0.35 : 1, transition: 'opacity .5s ease' }}>
            <text x={BITX} y={top} fontSize="11" fontWeight="bold" fill="#e2e8f0" fontFamily="monospace">{label}</text>
            <text x={MANT_END} y={top} textAnchor="end" fontSize="10.5" fill="#94a3b8" fontFamily="monospace">{exact(value)}</text>

            {bits.split('').map((b, i) => {
                const f = fieldOf(i);
                const marked = marks.includes(i);
                return (
                    <g key={i}>
                        <rect x={bx(i)} y={top + 8} width={BITW - 1.1} height={BITH} rx="1.6"
                            className="fp-bit"
                            fill={marked ? '#7f1d1d' : b === '1' ? FIELD_COLOR[f] : '#0f172a'}
                            fillOpacity={marked ? 1 : b === '1' ? 0.85 : 1}
                            stroke={marked ? '#ef4444' : FIELD_COLOR[f]}
                            strokeWidth={marked ? 1.6 : 0.7}
                            strokeOpacity={marked ? 1 : 0.45} />
                        <text x={bx(i) + BITW / 2 - 0.5} y={top + 8 + BITH / 2 + 3.5} textAnchor="middle" fontSize="7"
                            fill={marked ? '#fecaca' : b === '1' ? '#0b1120' : '#475569'} fontFamily="monospace">{b}</text>
                    </g>
                );
            })}

            {/* field brackets */}
            {[
                { x0: BITX, x1: SIGN_END, c: FIELD_COLOR.sign, t: 'sign', v: bits[0] === '0' ? '+' : '−' },
                { x0: SIGN_END, x1: EXP_END, c: FIELD_COLOR.exp, t: '11-bit exponent', v: `${rawExp(value)} − 1023 = ${e}` },
                { x0: EXP_END, x1: MANT_END, c: FIELD_COLOR.mant, t: '52-bit mantissa', v: `1.${mantissa.slice(0, 10)}… × 2^${e}` },
            ].map(f => (
                <g key={f.t}>
                    <path d={`M${f.x0 + 1},${top + 38} L${f.x0 + 1},${top + 43} L${f.x1 - 2},${top + 43} L${f.x1 - 2},${top + 38}`}
                        fill="none" stroke={f.c} strokeWidth="1.1" strokeOpacity="0.7" />
                    <text x={(f.x0 + f.x1) / 2} y={top + 56} textAnchor="middle" fontSize="9" fill={f.c} fontFamily="monospace">{f.t}</text>
                    <text x={(f.x0 + f.x1) / 2} y={top + 69} textAnchor="middle" fontSize="9.5" fill="#94a3b8" fontFamily="monospace">{f.v}</text>
                </g>
            ))}
        </g>
    );
}

function FloatStage({ step }) {
    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .fp-bit  { transition: fill .4s ease, stroke .4s ease; }
                .fp-fade { transition: opacity .5s ease; }
            `}</style>

            {step.heading && (
                <text x="380" y="34" textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="monospace">{step.heading}</text>
            )}

            {(step.values || []).map((v, i) => (
                <RegisterBlock key={v.label} label={v.label} value={v.v} top={64 + i * 106}
                    marks={v.marks || []} dim={v.dim} />
            ))}

            {step.note && (
                <g className="fp-fade">
                    <rect x="120" y="292" width="520" height="52" rx="9"
                        fill={step.noteTone === 'bad' ? '#3a0d0d' : step.noteTone === 'good' ? '#14532d' : '#111827'}
                        stroke={step.noteTone === 'bad' ? '#ef4444' : step.noteTone === 'good' ? '#22c55e' : '#334155'} strokeWidth="1.6" />
                    <text x="380" y="315" textAnchor="middle" fontSize="12" fontFamily="monospace"
                        fill={step.noteTone === 'bad' ? '#fca5a5' : step.noteTone === 'good' ? '#bbf7d0' : '#cbd5e1'}>{step.note}</text>
                    {step.note2 && (
                        <text x="380" y="333" textAnchor="middle" fontSize="10.5" fontFamily="monospace" fill="#94a3b8">{step.note2}</text>
                    )}
                </g>
            )}

            {step.caption && (
                <text x="380" y="392" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
        </svg>
    );
}

// ── Act 1: the anomaly ─────────────────────────────────────────────────────────
function AnomalyScene({ reveal }) {
    return (
        <div className="w-full py-4 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">every language, same answer</div>
            <div className="space-y-3 text-sm">
                <div className="flex items-baseline gap-3">
                    <span className="text-slate-500 w-24 shrink-0">&gt;&gt;&gt;</span>
                    <span className="text-slate-200">0.1 + 0.2</span>
                </div>
                <div className={`flex items-baseline gap-3 transition-opacity duration-500 ${reveal >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="w-24 shrink-0" />
                    <span className="text-amber-400 text-lg">{String(SUM)}</span>
                </div>
                <div className={`flex items-baseline gap-3 pt-2 transition-opacity duration-500 ${reveal >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-slate-500 w-24 shrink-0">&gt;&gt;&gt;</span>
                    <span className="text-slate-200">0.1 + 0.2 === 0.3</span>
                </div>
                <div className={`flex items-baseline gap-3 transition-opacity duration-500 ${reveal >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="w-24 shrink-0" />
                    <span className="text-red-400 text-lg">false</span>
                </div>
            </div>

            <div className={`mt-6 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 transition-opacity duration-500 ${reveal >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-xs text-slate-400 mb-2">what the two values really are, to 20 digits</div>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">0.1 + 0.2</span><span className="text-amber-300">{exact(SUM)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">0.3</span><span className="text-sky-300">{exact(0.3)}</span></div>
                    <div className="flex justify-between pt-1 border-t border-slate-800"><span className="text-slate-500">difference</span><span className="text-red-400">{String(SUM - 0.3)}</span></div>
                </div>
            </div>
            <p className="text-[11px] text-slate-600 mt-4">
                not a bug in any one language — it is the hardware format nearly all of them share
            </p>
        </div>
    );
}

// ── Act 2: binary expansion ────────────────────────────────────────────────────
const EXPANSION = [
    { calc: '0.1 × 2 = 0.2', bit: '0', keep: '0.2' },
    { calc: '0.2 × 2 = 0.4', bit: '0', keep: '0.4' },
    { calc: '0.4 × 2 = 0.8', bit: '0', keep: '0.8' },
    { calc: '0.8 × 2 = 1.6', bit: '1', keep: '0.6' },
    { calc: '0.6 × 2 = 1.2', bit: '1', keep: '0.2' },
    { calc: '0.2 × 2 = 0.4', bit: '0', keep: '0.4', repeat: true },
];
function BinaryScene({ rows, showThird }) {
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                converting 0.1 to binary — repeatedly double and take the integer part
            </div>
            <div className="space-y-1.5">
                {EXPANSION.map((r, i) => (
                    <div key={i} className={`flex items-center gap-4 text-sm transition-all duration-500 ${i < rows ? 'opacity-100' : 'opacity-10'}`}
                        style={{ transitionDelay: `${i * 70}ms` }}>
                        <span className="text-slate-400 w-40">{r.calc}</span>
                        <span className={`px-2 py-0.5 rounded ${r.bit === '1' ? 'bg-sky-500/25 text-sky-300' : 'bg-slate-800 text-slate-500'}`}>{r.bit}</span>
                        <span className="text-slate-600 text-xs">carry {r.keep}</span>
                        {r.repeat && i < rows && (
                            <span className="text-amber-400 text-xs">← 0.2 again, we are in a cycle</span>
                        )}
                    </div>
                ))}
            </div>

            <div className={`mt-5 transition-opacity duration-500 ${rows >= 6 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-xs text-slate-500 mb-1.5">so, in binary:</div>
                <div className="text-base text-sky-300">
                    0.1<span className="text-slate-600 text-xs">₁₀</span> = 0.0<span className="text-amber-400">0011</span>
                    <span className="text-amber-400">0011</span><span className="text-amber-400">0011</span>…<span className="text-slate-600 text-xs">₂</span>
                    <span className="text-slate-500 text-xs ml-3">(0011 forever)</span>
                </div>
            </div>

            <div className={`mt-5 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 transition-opacity duration-500 ${showThird ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-xs text-slate-400 leading-relaxed">
                    You already accept this in decimal: <span className="text-slate-200">1/3 = 0.333…</span> has no finite decimal form,
                    because 3 does not divide a power of 10. Same rule, different base — a fraction terminates in binary only if its
                    denominator is a power of 2. <span className="text-slate-200">1/10</span> is not, so it cannot be written exactly.
                </div>
            </div>
        </div>
    );
}

// ── Act 6: spacing / ULP ───────────────────────────────────────────────────────
function UlpScene({ level }) {
    const bands = [
        { range: 'between 1 and 2', gap: '2⁻⁵² ≈ 2.2 × 10⁻¹⁶', ticks: 26, color: '#22c55e', note: 'about 4.5 quadrillion values in this one range' },
        { range: 'between 2⁵² and 2⁵³', gap: '1.0', ticks: 12, color: '#f59e0b', note: 'exactly the integers — no room for fractions' },
        { range: 'above 2⁵³', gap: '2, then 4, then 8…', ticks: 6, color: '#ef4444', note: `2⁵³ + 1 === 2⁵³ is ${String(2 ** 53 === 2 ** 53 + 1)}` },
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                floats are not evenly spaced — the gap grows with magnitude
            </div>
            <div className="space-y-6">
                {bands.map((b, i) => (
                    <div key={b.range} className="transition-opacity duration-500" style={{ opacity: i < level ? 1 : 0.12 }}>
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-300">{b.range}</span>
                            <span style={{ color: b.color }}>gap = {b.gap}</span>
                        </div>
                        <div className="relative h-8 rounded-lg bg-slate-900/70 border border-slate-800 overflow-hidden">
                            {Array.from({ length: b.ticks }).map((_, t) => (
                                <div key={t} className="absolute top-0 bottom-0 w-px transition-all duration-700"
                                    style={{ left: `${(t / (b.ticks - 1)) * 100}%`, background: b.color, opacity: i < level ? 0.8 : 0, transitionDelay: `${t * 18}ms` }} />
                            ))}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1.5">{b.note}</div>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-5 leading-relaxed">
                a double always carries ~15–17 significant decimal digits — but where those digits land moves with the exponent,
                which is exactly why large integers lose precision while small ones do not
            </p>
        </div>
    );
}

// ── Act 7: comparing ───────────────────────────────────────────────────────────
function CompareScene({ mode }) {
    return (
        <div className="w-full py-2 font-mono space-y-4">
            <div className={`rounded-xl border p-4 transition-colors duration-500 ${mode === 'cancel' ? 'border-red-500/50 bg-red-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="text-xs text-slate-400 mb-2">catastrophic cancellation</div>
                <div className="text-sm text-slate-200">(1e16 + 1) − 1e16</div>
                <div className={`text-lg mt-1 ${mode === 'cancel' ? 'text-red-400' : 'text-slate-600'}`}>{String((1e16 + 1) - 1e16)}</div>
                <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    the gap between representable values near 1e16 is 2, so adding 1 changes nothing at all.
                    subtracting two nearly equal large numbers destroys every significant digit you had.
                </div>
            </div>

            <div className={`rounded-xl border p-4 transition-colors duration-500 ${mode === 'eq' ? 'border-red-500/50 bg-red-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="text-xs text-slate-400 mb-2">the wrong way to compare</div>
                <div className="text-sm"><span className="text-red-400">if</span> <span className="text-slate-200">(a === b)</span> <span className="text-slate-600">// exact equality on computed floats</span></div>
                <div className="text-[11px] text-slate-500 mt-2">two values that are mathematically equal can differ in the last bit or two.</div>
            </div>

            <div className={`rounded-xl border p-4 transition-colors duration-500 ${mode === 'eps' ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="text-xs text-slate-400 mb-2">compare with a tolerance that scales</div>
                <div className="text-sm text-slate-200">Math.abs(a − b) &lt;= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))</div>
                <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Number.EPSILON is {String(Number.EPSILON)} — the gap between 1 and the next double.
                    A fixed tolerance fails at large magnitudes, so scale it by the values being compared.
                </div>
            </div>
        </div>
    );
}

// ── Act 8: special values ──────────────────────────────────────────────────────
function SpecialScene({ level }) {
    const rows = [
        { name: '+0', bits: bitsOf(0), rule: 'exponent 0, mantissa 0' },
        { name: '−0', bits: bitsOf(-0), rule: 'same, but sign bit set' },
        { name: 'Infinity', bits: bitsOf(Infinity), rule: 'exponent all 1s, mantissa 0' },
        { name: 'NaN', bits: bitsOf(NaN), rule: 'exponent all 1s, mantissa ≠ 0' },
        { name: '5e−324', bits: bitsOf(5e-324), rule: 'exponent 0, mantissa ≠ 0 — subnormal' },
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                the exponent field has two reserved patterns — all-zeros and all-ones
            </div>
            <div className="space-y-1.5">
                {rows.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 text-[10px] transition-opacity duration-500"
                        style={{ opacity: i < level ? 1 : 0.12, transitionDelay: `${i * 60}ms` }}>
                        <span className="w-16 shrink-0 text-slate-200 text-xs">{r.name}</span>
                        <span className="text-violet-400">{r.bits.slice(0, 1)}</span>
                        <span className="text-amber-400">{r.bits.slice(1, 12)}</span>
                        <span className="text-sky-400 truncate">{r.bits.slice(12, 32)}…</span>
                        <span className="text-slate-600 ml-auto shrink-0">{r.rule}</span>
                    </div>
                ))}
            </div>
            <div className={`mt-5 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 transition-opacity duration-500 ${level >= 5 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">NaN === NaN</span><span className="text-red-400">false</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">0 === −0</span><span className="text-green-400">true</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">1 / 0 &nbsp;vs&nbsp; 1 / −0</span><span className="text-amber-400">Infinity vs −Infinity</span></div>
                </div>
                <div className="text-[11px] text-slate-600 mt-3 leading-relaxed">
                    NaN is the only value not equal to itself — which is how Number.isNaN can work at all, and why sorting
                    an array containing NaN produces nonsense. And 0 and −0 compare equal while behaving differently under division.
                </div>
            </div>
        </div>
    );
}

// ── Recap ───────────────────────────────────────────────────────────────────────
function RecapCards({ wins }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {wins.map((w, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl border border-zinc-700/60 bg-slate-900/50">
                    <div className="text-xs font-semibold text-zinc-200">{w.t}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{w.d}</div>
                </div>
            ))}
        </div>
    );
}

// ── Step generation ─────────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1: The Anomaly ═══
    s(1, 'The Anomaly', { anomaly: 1 },
        'Open a console in almost any language and add 0.1 to 0.2. You will not get 0.3. This is the single most reported non-bug in programming history, and the answer is not "computers are imprecise" — it is a specific, understandable consequence of the format the hardware uses.');
    s(1, 'The Anomaly', { anomaly: 2 },
        'The comparison fails too, which is what usually bites people: a total that should equal a target does not, a loop that increments by 0.1 never hits its bound, a test asserting equality fails by an invisible amount. Same root cause every time.');
    s(1, 'The Anomaly', { anomaly: 3 },
        'Print both to twenty digits and the mystery starts to dissolve. Neither value is what you asked for. 0.1 + 0.2 is slightly above three tenths, the literal 0.3 is slightly below it, and they differ by about 5.6 × 10⁻¹⁷. To see why, we need to look at how the number is stored.');

    // ═══ ACT 2: Binary Halves ═══
    s(2, 'Binary Halves', { binary: true, rows: 3 },
        'A double stores a number in binary. Converting a fraction to binary means repeatedly doubling it and recording whether you crossed 1. Start with 0.1: double to 0.2, no crossing, write 0. Again to 0.4, then 0.8 — still zeros.');
    s(2, 'Binary Halves', { binary: true, rows: 5 },
        'Now 0.8 doubles to 1.6 — we crossed 1, so write a 1 and keep the 0.6. Then 0.6 doubles to 1.2, write another 1, keep 0.2. But we have already seen 0.2.');
    s(2, 'Binary Halves', { binary: true, rows: 6 },
        'And that is the trap closing. The remainder has returned to a value we saw before, so from here the process repeats forever: 0011, 0011, 0011. In binary, one tenth is an infinitely repeating fraction. There is no finite bit pattern that equals it.');
    s(2, 'Binary Halves', { binary: true, rows: 6, showThird: true },
        'None of this should feel exotic — you already accept it in decimal. One third is 0.333… because 3 does not divide any power of 10. The rule generalizes: a fraction terminates in base b only if its denominator divides a power of b. In binary the only friendly denominators are powers of 2, so halves and quarters are exact while tenths, thirds and fifths are not. The decimal system just happens to be friendly to the fractions money uses, which is why this surprises us at all.');

    // ═══ ACT 3: Bit Layout ═══
    s(3, 'The Bit Layout', { values: [{ label: '0.1', v: 0.1 }], heading: 'a double is 64 bits, split into three fields',
        caption: 'sign · exponent · mantissa — the same shape as scientific notation' },
        'So a double has to approximate. It gets 64 bits, arranged like scientific notation in binary: one sign bit, eleven exponent bits, and fifty-two mantissa bits. The value is (−1)^sign × 1.mantissa × 2^exponent.');
    s(3, 'The Bit Layout', { values: [{ label: '0.1', v: 0.1, marks: [0] }], heading: 'the sign is a single bit — floats are sign-magnitude, not two\'s complement',
        caption: 'which is why −0 exists as a distinct bit pattern' },
        'The sign is one bit, entirely separate from the magnitude. Unlike integers, floats are not two\'s complement — flipping that one bit negates the value. A side effect is that zero has two encodings, positive and negative, which we will come back to.');
    s(3, 'The Bit Layout', { values: [{ label: '0.1', v: 0.1, marks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }],
        heading: `exponent bits = ${rawExp(0.1)}, minus the bias of 1023 → 2^${unbiased(0.1)}`,
        caption: 'stored biased so that ordering floats as integers still works' },
        `The eleven exponent bits hold ${rawExp(0.1)} here. They are stored biased — subtract 1023 to get the real exponent of ${unbiased(0.1)}. The bias exists so that comparing two positive floats bit-for-bit as if they were integers gives the right ordering, which makes hardware comparison and sorting cheap.`);
    s(3, 'The Bit Layout', { values: [{ label: '0.1', v: 0.1, marks: [12, 13, 14, 15, 16, 17] }],
        heading: 'the mantissa holds the digits — with an implicit leading 1',
        caption: 'normalization: every non-zero value starts with 1., so that bit is never stored' },
        'The remaining 52 bits are the mantissa. There is a trick here: any non-zero binary number can be shifted so it starts with 1.something, so that leading 1 is always there and never stored. You get 53 bits of precision from 52 bits of storage — a free bit, which is why the format is described as having 53-bit significands.');

    // ═══ ACT 4: Rounding ═══
    s(4, 'Rounding', { values: [{ label: '0.1', v: 0.1, marks: [62, 63] }],
        heading: 'the infinite 0011… pattern has to stop at bit 52',
        note: `stored value is ${exact(0.1)}`, note2: 'not 0.1 — the closest double that exists',
        caption: 'the repeating pattern is cut off and rounded' },
        'Now the collision. The true binary expansion of 0.1 repeats forever, but only 52 bits fit. The pattern is cut off, and the remainder decides how the last bit is set. The value actually stored is slightly larger than one tenth.');
    s(4, 'Rounding', { values: [{ label: '0.1', v: 0.1, marks: [62, 63] }],
        heading: 'IEEE 754 rounds to nearest, ties to even',
        note: 'round-to-nearest-even is the default mode', note2: 'ties go to the value with an even last bit, so errors do not accumulate in one direction',
        caption: 'the repeating unit is 1001, but the stored tail is 1010 — rounding up carried' },
        'The default rounding rule is round-to-nearest, ties-to-even: pick the closest representable value, and on an exact tie pick the one whose last bit is 0. That tie rule matters more than it looks — always rounding ties up would bias every long summation upward, while ties-to-even lets errors cancel on average.');
    s(4, 'Rounding', { values: [{ label: '0.1', v: 0.1 }, { label: '0.2', v: 0.2 }],
        heading: 'note the mantissas are identical — only the exponent differs',
        note: '0.2 is exactly 2 × 0.1, so it inherits the same rounding error, doubled',
        caption: 'doubling is exact in binary: it just increments the exponent' },
        `Here is 0.2 alongside. Their mantissas are bit-for-bit identical and only the exponent differs by one — because doubling in binary is exact, it merely increments the exponent. So 0.2 carries exactly twice the error 0.1 does. Both are already wrong before we add anything.`);

    // ═══ ACT 5: The Addition ═══
    s(5, 'The Addition', { values: [{ label: '0.1', v: 0.1 }, { label: '0.2', v: 0.2, marks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }],
        heading: 'step 1 — align the exponents by shifting the smaller mantissa',
        caption: 'hardware must line up the binary points before it can add' },
        'To add two floats the hardware first aligns them: the value with the smaller exponent has its mantissa shifted right until both share an exponent. Shifting can push bits off the end — a second opportunity to lose information, before any addition has happened.');
    s(5, 'The Addition', { values: [{ label: '0.1 + 0.2', v: SUM }],
        heading: 'step 2 — add the mantissas, renormalize, round again',
        note: `result: ${exact(SUM)}`, noteTone: 'bad',
        caption: 'a third rounding, on top of two values that were already approximations' },
        'Then the mantissas are added, the result is renormalized back to 1.something, and rounded to 52 bits once more. So the answer accumulated error three times: approximating 0.1, approximating 0.2, and rounding the sum. The result is the closest double to the true sum of two values that were themselves not what you wrote.');
    s(5, 'The Addition', {
        values: [{ label: '0.1 + 0.2', v: SUM, marks: [61, 62, 63] }, { label: '0.3 (literal)', v: 0.3, marks: [61, 62, 63] }],
        heading: 'the computed sum vs the literal 0.3 — same exponent, different last bits',
        note: 'they differ in the final three mantissa bits: 100 vs 011', note2: `difference = ${String(SUM - 0.3)}`, noteTone: 'bad',
        caption: 'adjacent representable values — and === says false' },
        'And here is the whole mystery in one picture. The computed sum and the literal 0.3 have the same sign and the same exponent, and differ only in the last three mantissa bits — 100 against 011. They are neighbours: adjacent representable doubles, one step apart. Two different bit patterns, so === is false, correctly. Both are excellent approximations of three tenths; neither is three tenths; and they are not the same approximation.');

    // ═══ ACT 6: Spacing ═══
    s(6, 'Spacing', { ulp: 1 },
        'This leads to the property that trips people up in a different way. Floats are not spread evenly along the number line. Between 1 and 2, consecutive doubles are 2⁻⁵² apart — roughly 2.2 × 10⁻¹⁶ — so that single range holds about 4.5 quadrillion distinct values. Precision is dense here.');
    s(6, 'Spacing', { ulp: 2 },
        'But the exponent scales the gap. Every time the magnitude doubles, so does the distance between neighbours — one unit in the last place, or ULP. By the time you reach 2⁵², the gap is exactly 1.0: the only representable values there are the integers themselves, with nothing in between.');
    s(6, 'Spacing', { ulp: 3 },
        `Past 2⁵³ the gap exceeds 1 and integers start going missing. 2⁵³ + 1 is not representable, so it rounds back down — meaning 2**53 === 2**53 + 1 evaluates to ${String(2 ** 53 === 2 ** 53 + 1)}. This is precisely why JSON with 64-bit database IDs corrupts them in JavaScript, why Number.MAX_SAFE_INTEGER is 2⁵³ − 1, and why BigInt had to be added to the language.`);

    // ═══ ACT 7: Comparing ═══
    s(7, 'Comparing Safely', { compare: 'cancel' },
        `Uneven spacing has a sharper edge, too. Take 1e16 + 1: the gap near 1e16 is 2, so adding 1 does not move you to a new representable value at all — it rounds straight back. Subtract 1e16 again and you get exactly ${String((1e16 + 1) - 1e16)} instead of 1. Subtracting nearly equal large numbers annihilates the significant digits; this is catastrophic cancellation, and it is why numerical code is written to avoid such subtractions rather than to clean up after them.`);
    s(7, 'Comparing Safely', { compare: 'eq' },
        'Which means testing computed floats with === is asking the wrong question. You are asking whether two calculations produced identical bit patterns, when what you meant was whether they produced the same number. Different but equally valid routes to the same value will disagree in the last bit.');
    s(7, 'Comparing Safely', { compare: 'eps' },
        `Compare with a tolerance instead — and make it relative, not fixed. Number.EPSILON (${String(Number.EPSILON)}, the gap between 1 and the next double) works as a unit, scaled by the magnitude of the values involved, because the absolute gap grows with magnitude. A hard-coded 1e−9 that behaves fine near 1 is meaningless near 1e16. Two caveats worth knowing: comparison, not arithmetic, is the thing to fix — and for money you should not be using floats at all. Use integer minor units or a decimal type.`);

    // ═══ ACT 8: Odd Values ═══
    s(8, 'The Odd Values', { special: 3 },
        'Two exponent patterns are reserved, which gives the format its special values. All-ones with a zero mantissa is infinity — you get it from overflow or division by zero, and it propagates through arithmetic rather than trapping.');
    s(8, 'The Odd Values', { special: 5 },
        'All-ones with a non-zero mantissa is NaN, the result of genuinely undefined operations like 0/0 or the square root of a negative. All-zeros in the exponent means subnormal: the implicit leading 1 is dropped, letting values shrink gradually toward zero instead of falling off a cliff — at reduced precision, and historically at a severe speed penalty on some hardware.');
    s(8, 'The Odd Values', { special: 6 },
        'Two consequences worth memorising. NaN is not equal to itself — that is not a quirk but the defining property, since NaN means "no meaningful value" and two unknowns cannot be asserted equal. It is also how isNaN can be implemented at all, and why a NaN in an array makes sorting incoherent. And negative zero compares equal to positive zero while behaving differently under division, which can silently flip the sign of an infinity downstream.');
    s(8, 'The Odd Values', {
        recap: true,
        wins: [
            { t: 'Binary cannot hold tenths', d: 'A fraction terminates in base 2 only if its denominator is a power of 2. 0.1 repeats forever, exactly as 1/3 does in decimal.' },
            { t: 'Three roundings, not one', d: '0.1 rounds, 0.2 rounds, and the sum rounds again. The result is the nearest double to a sum of two values that were already approximations.' },
            { t: 'The gap grows with magnitude', d: 'One ULP is 2⁻⁵² near 1 but exceeds 1 past 2⁵³ — which is why large integer IDs corrupt and MAX_SAFE_INTEGER exists.' },
            { t: 'Compare with a relative tolerance', d: 'Scale Number.EPSILON by the magnitudes involved. A fixed tolerance that works near 1 is meaningless near 1e16 — and money should not use floats at all.' },
        ],
    }, 'None of this is imprecision in the machine. IEEE 754 is deterministic and precisely specified: every operation returns the correctly rounded nearest representable result. The mismatch is between a finite binary format and our decimal intuitions about which fractions are "simple". Once you can see the three fields and know that the gap between neighbours grows with magnitude, the whole family of surprises — the failing equality, the drifting accumulator, the mangled 64-bit ID, the self-unequal NaN — turns into the same short explanation.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap)   return <RecapCards wins={step.wins} />;
    if (step.anomaly) return <AnomalyScene reveal={step.anomaly} />;
    if (step.binary)  return <BinaryScene rows={step.rows} showThird={step.showThird} />;
    if (step.ulp)     return <UlpScene level={step.ulp} />;
    if (step.compare) return <CompareScene mode={step.compare} />;
    if (step.special) return <SpecialScene level={step.special} />;
    return <FloatStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Why can a double not store 0.1 exactly?',
        options: [
            'Because 64 bits is not enough storage for that many digits',
            'Because a fraction terminates in binary only when its denominator is a power of 2 — and 1/10 is not, so its expansion repeats forever',
            'Because the exponent field is too small',
            'Because rounding is applied to every literal on principle',
        ],
        correct: 1,
        explanation: 'It is not a capacity problem — no number of bits would help. In base 2 a fraction has a finite representation only if its denominator divides a power of 2. Ten does not, so 0.1 is 0.0(0011) repeating in binary, exactly as 1/3 is 0.333… in decimal. The 52-bit mantissa must cut that infinite pattern off and round.',
    },
    {
        question: 'Why does 2**53 === 2**53 + 1 evaluate to true?',
        options: [
            'Because JavaScript treats large numbers as strings',
            'Because the addition overflows to infinity',
            'Because past 2⁵³ the gap between consecutive doubles exceeds 1, so 2⁵³ + 1 is not representable and rounds back down',
            'Because === ignores the last mantissa bit',
        ],
        correct: 2,
        explanation: 'Doubles are not evenly spaced. One ULP is 2⁻⁵² near 1, but the gap doubles with each doubling of magnitude, reaching exactly 1.0 at 2⁵² and exceeding 1 beyond 2⁵³. So 2⁵³ + 1 has no encoding and rounds to 2⁵³. This is why Number.MAX_SAFE_INTEGER is 2⁵³ − 1, why 64-bit database IDs corrupt when parsed as JSON numbers, and why BigInt exists.',
    },
    {
        question: 'What is the correct way to compare two computed floating-point values?',
        options: [
            'Use === and it will be fine after rounding both',
            'Compare with a fixed tolerance such as 1e-9',
            'Compare the absolute difference against Number.EPSILON scaled by the magnitude of the values',
            'Convert both to strings and compare those',
        ],
        correct: 2,
        explanation: 'Because the gap between neighbouring doubles grows with magnitude, tolerance must scale too. Math.abs(a-b) <= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b)) adapts automatically. A fixed 1e-9 is far too strict near 1e16 and needlessly loose near zero. For money, do not use floats at all — use integer minor units or a decimal type.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you think in mantissas now!' : 'Review the explanations to reinforce the format.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">Retake Quiz</button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Question {quizState.current + 1} / {QUIZ.length}</div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-zinc-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-800 text-slate-600';
                    }
                    return (
                        <button key={i} onClick={() => {
                            if (quizState.answered) return;
                            const correct = i === q.correct;
                            setQuizState(st => ({ ...st, selected: i, answered: true, score: correct ? st.score + 1 : st.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(st => ({ ...st, complete: true }));
                    else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function FloatingPointPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1300);
    const [quizState,   setQuizState]   = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying || STEPS.length === 0) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const step = STEPS[currentStep];
    const pct  = Math.round(((currentStep + 1) / STEPS.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link href="/under-the-hood" className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm mb-4 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4" />Back to Under the Hood
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Floating Point and IEEE 754</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Why 0.1 + 0.2 is not 0.3 — bit layout, rounding, ULP spacing, cancellation and NaN, shown on real bit patterns
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">{currentStep + 1} / {STEPS.length}</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">steps</div>
                        </div>
                    </div>

                    {/* Act timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {ACTS.map(act => {
                            const ActIcon = act.icon;
                            const isCurrent = step?.act === act.id;
                            const isDone    = step?.act > act.id;
                            return (
                                <button key={act.id} onClick={() => {
                                    const firstStepOfAct = STEPS.findIndex(s => s.act === act.id);
                                    if (firstStepOfAct >= 0) { setCurrentStep(firstStepOfAct); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent ? 'bg-white/20 text-white border border-white/30'
                                        : isDone ? 'bg-white/5 text-zinc-400 border border-white/10'
                                        : 'bg-transparent text-zinc-600 border border-transparent hover:border-white/10 hover:text-zinc-400'
                                    }`}>
                                    <ActIcon className="h-3 w-3" />{act.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800">
                <div className="h-full bg-gradient-to-r from-zinc-500 to-slate-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>

            {/* Main layout */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Act {step?.act} of 8</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 py-3 min-h-[440px] flex items-center">
                                <VisualizationPanel step={step} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-4 bg-slate-900/50 border border-slate-800/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Reset">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Previous">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Next">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="text-xs text-slate-500">Speed</span>
                                <input type="range" min="200" max="2000" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        {/* Reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">double (binary64)</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [3],    label: 'Sign',      note: '1 bit' },
                                    { acts: [3],    label: 'Exponent',  note: '11 bits · bias 1023' },
                                    { acts: [3, 4], label: 'Mantissa',  note: '52 bits + implicit 1' },
                                    { acts: [4, 5], label: 'Rounding',  note: 'nearest, ties to even' },
                                    { acts: [6],    label: 'ULP at 1',  note: '2⁻⁵² ≈ 2.2e−16' },
                                    { acts: [6],    label: 'Safe ints', note: 'up to 2⁵³ − 1' },
                                    { acts: [7, 8], label: 'Gotchas',   note: 'cancellation · NaN' },
                                ].map(row => (
                                    <div key={row.label} className={`flex justify-between gap-2 px-2 py-1 rounded-lg transition-colors ${step && row.acts.includes(step.act) ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono text-[10px] text-right">{row.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-1">Active Recall</p>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
