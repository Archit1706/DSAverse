"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    FileWarning, Hash, Boxes, KeyRound, Split, Combine, Equal, Sparkles,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Mojibake',   icon: FileWarning },
    { id: 2, label: 'Code Points', icon: Hash       },
    { id: 3, label: 'UTF-8',      icon: Boxes       },
    { id: 4, label: 'Prefix Bits', icon: KeyRound   },
    { id: 5, label: 'UTF-16',     icon: Split       },
    { id: 6, label: 'Graphemes',  icon: Combine     },
    { id: 7, label: 'Normalize',  icon: Equal       },
    { id: 8, label: 'Takeaways',  icon: Sparkles    },
];

// ── Real encodings, computed rather than transcribed ───────────────────────────
const ENC = new TextEncoder();

function analyze(str, graphemeSpec) {
    const chars = [...str];
    let off = 0;
    const cps = chars.map(ch => {
        const bytes = [...ENC.encode(ch)];
        const rec = { ch, cp: ch.codePointAt(0), bytes, byteStart: off, byteLen: bytes.length, units: ch.length };
        off += bytes.length;
        return rec;
    });
    const graphemes = [];
    let i = 0;
    for (const n of graphemeSpec) {
        const slice = cps.slice(i, i + n);
        graphemes.push({
            text: slice.map(c => c.ch).join(''),
            cpStart: i,
            cpCount: n,
            byteStart: slice[0].byteStart,
            byteLen: slice.reduce((a, c) => a + c.byteLen, 0),
        });
        i += n;
    }
    return { str, cps, graphemes, bytes: [...ENC.encode(str)] };
}

const S = {
    A:      analyze('A', [1]),
    eNFC:   analyze('é', [1]),
    eNFD:   analyze('é', [2]),
    euro:   analyze('€', [1]),
    grin:   analyze('\u{1F600}', [1]),
    family: analyze('\u{1F468}‍\u{1F469}‍\u{1F467}', [5]),
    flag:   analyze('\u{1F1EE}\u{1F1F3}', [2]),
    mixed:  analyze('Hé€\u{1F600}', [1, 1, 1, 1]),
};

const hx = b => b.toString(16).toUpperCase().padStart(2, '0');
const bin = (b, n = 8) => b.toString(2).padStart(n, '0');
const U = cp => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

// classify a byte by its UTF-8 prefix
function byteKind(b) {
    if (b < 0x80) return 'ascii';
    if ((b & 0xC0) === 0x80) return 'cont';
    if ((b & 0xE0) === 0xC0) return 'lead2';
    if ((b & 0xF0) === 0xE0) return 'lead3';
    return 'lead4';
}
const KIND = {
    ascii: { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0', label: '0xxxxxxx' },
    lead2: { fill: '#082f49', stroke: '#38bdf8', text: '#bae6fd', label: '110xxxxx' },
    lead3: { fill: '#2e1065', stroke: '#a78bfa', text: '#ddd6fe', label: '1110xxxx' },
    lead4: { fill: '#3a2a0d', stroke: '#f59e0b', text: '#fde68a', label: '11110xxx' },
    cont:  { fill: '#111827', stroke: '#475569', text: '#94a3b8', label: '10xxxxxx' },
};

// ── Persistent three-level stage: graphemes → code points → bytes ──────────────
function TextStage({ step }) {
    const sample = S[step.sample] || S.A;
    const n = sample.bytes.length;
    const X0 = 40, TOTAL = 680;
    const BW = Math.min(46, TOTAL / n);
    const bxs = i => X0 + i * BW;

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .u-box  { transition: fill .4s ease, stroke .4s ease, opacity .4s ease; }
                .u-fade { transition: opacity .5s ease; }
            `}</style>

            {step.heading && (
                <text x="380" y="28" textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="monospace">{step.heading}</text>
            )}

            {/* ── Level 1: what the user sees ── */}
            <text x={X0} y="56" fontSize="9" fill="#64748b" fontFamily="monospace">what a person sees — grapheme clusters</text>
            {sample.graphemes.map((g, i) => (
                <g key={i} className="u-box" style={{ opacity: step.level >= 1 ? 1 : 0.12 }}>
                    <rect x={bxs(g.byteStart) + 1} y={64} width={g.byteLen * BW - 2} height={58} rx="8"
                        fill="#0b1120" stroke={step.hlGrapheme === i ? '#e4e4e7' : '#334155'}
                        strokeWidth={step.hlGrapheme === i ? 2.2 : 1.3} />
                    <text x={bxs(g.byteStart) + (g.byteLen * BW) / 2} y={102} textAnchor="middle" fontSize="30">{g.text}</text>
                </g>
            ))}
            <text x={720} y="98" textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                {sample.graphemes.length} {sample.graphemes.length === 1 ? 'cluster' : 'clusters'}
            </text>

            {/* ── Level 2: code points ── */}
            <text x={X0} y="150" fontSize="9" fill="#64748b" fontFamily="monospace">what Unicode assigns — code points</text>
            {sample.cps.map((c, i) => {
                const zwj = c.cp === 0x200D;
                return (
                    <g key={i} className="u-box" style={{ opacity: step.level >= 2 ? 1 : 0.12 }}>
                        <rect x={bxs(c.byteStart) + 1} y={158} width={c.byteLen * BW - 2} height={44} rx="7"
                            fill={zwj ? '#3a2a0d' : '#0f172a'}
                            stroke={step.hlCp === i ? '#e4e4e7' : zwj ? '#f59e0b' : '#475569'}
                            strokeWidth={step.hlCp === i ? 2.2 : 1.3} />
                        <text x={bxs(c.byteStart) + (c.byteLen * BW) / 2} y={177} textAnchor="middle" fontSize="9.5"
                            fill={zwj ? '#fde68a' : '#cbd5e1'} fontFamily="monospace">{U(c.cp)}</text>
                        <text x={bxs(c.byteStart) + (c.byteLen * BW) / 2} y={192} textAnchor="middle" fontSize="8"
                            fill="#64748b" fontFamily="monospace">{zwj ? 'ZWJ' : `${c.byteLen}B`}</text>
                    </g>
                );
            })}
            <text x={720} y="184" textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                {sample.cps.length} code {sample.cps.length === 1 ? 'point' : 'points'}
            </text>

            {/* ── Level 3: bytes ── */}
            <text x={X0} y="232" fontSize="9" fill="#64748b" fontFamily="monospace">what is stored and sent — UTF-8 bytes</text>
            {sample.bytes.map((b, i) => {
                const k = KIND[byteKind(b)];
                return (
                    <g key={i} className="u-box" style={{ opacity: step.level >= 3 ? 1 : 0.12, transitionDelay: `${i * 22}ms` }}>
                        <rect x={bxs(i) + 1} y={240} width={BW - 2} height={46} rx="5"
                            fill={k.fill} stroke={k.stroke} strokeWidth="1.4" />
                        <text x={bxs(i) + BW / 2} y={259} textAnchor="middle" fontSize={BW < 30 ? 8.5 : 10.5}
                            fill={k.text} fontFamily="monospace">{hx(b)}</text>
                        {step.showBits && BW >= 34 && (
                            <text x={bxs(i) + BW / 2} y={276} textAnchor="middle" fontSize="6.5"
                                fill="#64748b" fontFamily="monospace">{bin(b)}</text>
                        )}
                        {!step.showBits && (
                            <text x={bxs(i) + BW / 2} y={276} textAnchor="middle" fontSize="7"
                                fill="#475569" fontFamily="monospace">{byteKind(b) === 'cont' ? 'cont' : 'lead'}</text>
                        )}
                    </g>
                );
            })}
            <text x={720} y="266" textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">{sample.bytes.length} bytes</text>

            {/* ── JS length callout ── */}
            {step.showLength && (
                <g className="u-fade">
                    <rect x="120" y="304" width="520" height="56" rx="9" fill="#3a0d0d" stroke="#ef4444" strokeWidth="1.6" />
                    <text x="380" y="326" textAnchor="middle" fontSize="12" fill="#fca5a5" fontFamily="monospace">
                        &quot;{sample.str}&quot;.length === {sample.str.length}
                    </text>
                    <text x="380" y="346" textAnchor="middle" fontSize="10" fill="#f87171" fontFamily="monospace">
                        {sample.graphemes.length} visible {sample.graphemes.length === 1 ? 'character' : 'characters'} · {sample.cps.length} code {sample.cps.length === 1 ? 'point' : 'points'} · {sample.str.length} UTF-16 units · {sample.bytes.length} UTF-8 bytes
                    </text>
                </g>
            )}

            {step.caption && (
                <text x="380" y="400" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
        </svg>
    );
}

// ── Act 1: mojibake ────────────────────────────────────────────────────────────
function MojibakeScene({ level }) {
    const bytes = [...ENC.encode('café')];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                a file holds bytes — nothing else
            </div>
            <div className="flex gap-1.5 mb-6">
                {bytes.map((b, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-300">{hx(b)}</div>
                ))}
            </div>

            <div className="space-y-2.5">
                {[
                    { enc: 'UTF-8', out: 'café', ok: true, note: 'C3 A9 is one code point' },
                    { enc: 'Windows-1252', out: 'cafÃ©', ok: false, note: 'reads C3 and A9 as two separate characters' },
                    { enc: 'ISO-8859-5', out: 'cafУЉ', ok: false, note: 'same bytes, Cyrillic table' },
                ].map((r, i) => (
                    <div key={r.enc} className={`flex items-center gap-4 rounded-xl border p-3 transition-all duration-500 ${
                        i < level ? 'opacity-100' : 'opacity-10'
                    } ${r.ok ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}
                        style={{ transitionDelay: `${i * 90}ms` }}>
                        <span className="text-xs text-slate-500 w-32 shrink-0">decoded as {r.enc}</span>
                        <span className={`text-lg ${r.ok ? 'text-green-300' : 'text-red-300'}`}>{r.out}</span>
                        <span className="text-[11px] text-slate-600 ml-auto text-right">{r.note}</span>
                    </div>
                ))}
            </div>

            <p className={`text-[11px] text-slate-500 mt-5 leading-relaxed transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                There is no way to look at bytes and know their encoding — it is metadata that travels separately, in a
                Content-Type header, an XML declaration, or an assumption. Get it wrong and you get mojibake. This is why
                &quot;just store text&quot; was never simple, and why UTF-8 everywhere was such a relief.
            </p>
        </div>
    );
}

// ── Act 3: encoding the euro sign bit by bit ───────────────────────────────────
function EncodeScene({ stage }) {
    const cp = 0x20AC;
    const b16 = bin(cp, 16);
    const groups = [b16.slice(0, 4), b16.slice(4, 10), b16.slice(10, 16)];
    const out = [...ENC.encode('€')];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                encoding U+20AC (€) — needs 16 bits, so it takes the 3-byte form
            </div>

            <div className="mb-5">
                <div className="text-xs text-slate-500 mb-1.5">the code point in binary</div>
                <div className="flex gap-1 text-sm">
                    {groups.map((g, i) => (
                        <span key={i} className={`px-2 py-1 rounded transition-colors duration-500 ${
                            stage >= 2 ? ['bg-violet-500/25 text-violet-200', 'bg-slate-700/50 text-slate-200', 'bg-slate-700/50 text-slate-200'][i] : 'bg-slate-900 text-slate-500'
                        }`}>{g}</span>
                    ))}
                    <span className="text-slate-600 text-xs self-center ml-2">= 4 + 6 + 6 bits</span>
                </div>
            </div>

            <div className={`mb-5 transition-opacity duration-500 ${stage >= 3 ? 'opacity-100' : 'opacity-20'}`}>
                <div className="text-xs text-slate-500 mb-1.5">poured into the 3-byte template</div>
                <div className="space-y-1.5 text-sm">
                    {[
                        { tpl: '1110', pay: groups[0], color: 'text-violet-300' },
                        { tpl: '10', pay: groups[1], color: 'text-slate-300' },
                        { tpl: '10', pay: groups[2], color: 'text-slate-300' },
                    ].map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-amber-400">{r.tpl}</span>
                            <span className={r.color}>{r.pay}</span>
                            <span className="text-slate-600 text-xs">→</span>
                            <span className={`text-sm transition-opacity duration-500 ${stage >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                                <span className="text-slate-500">{bin(out[i])}</span>
                                <span className="text-green-300 ml-3">0x{hx(out[i])}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 transition-opacity duration-500 ${stage >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-xs text-slate-400 mb-2">the length table</div>
                <div className="space-y-1 text-[11px]">
                    {[
                        ['U+0000 – U+007F', '1 byte', '0xxxxxxx', 'identical to ASCII'],
                        ['U+0080 – U+07FF', '2 bytes', '110xxxxx 10xxxxxx', 'Latin accents, Greek, Cyrillic, Hebrew'],
                        ['U+0800 – U+FFFF', '3 bytes', '1110xxxx 10xxxxxx 10xxxxxx', 'most CJK, €, symbols'],
                        ['U+10000 – U+10FFFF', '4 bytes', '11110xxx 10xxxxxx ×3', 'emoji, rare scripts'],
                    ].map(r => (
                        <div key={r[0]} className="flex gap-3">
                            <span className="text-slate-400 w-36 shrink-0">{r[0]}</span>
                            <span className="text-sky-300 w-14 shrink-0">{r[1]}</span>
                            <span className="text-slate-500 w-52 shrink-0">{r[2]}</span>
                            <span className="text-slate-600">{r[3]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Act 5: UTF-16 surrogates ───────────────────────────────────────────────────
function Utf16Scene({ level }) {
    const s = '\u{1F600}';
    const hi = s.charCodeAt(0), lo = s.charCodeAt(1);
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                JavaScript, Java, C# and Windows APIs store strings as UTF-16
            </div>

            <div className="flex items-center gap-6 mb-6">
                <div className="text-5xl">{s}</div>
                <div className="text-sm text-slate-400">
                    <div>{U(s.codePointAt(0))} — one code point</div>
                    <div className="text-slate-600 text-xs mt-1">above U+FFFF, so it does not fit in 16 bits</div>
                </div>
            </div>

            <div className={`transition-opacity duration-500 ${level >= 2 ? 'opacity-100' : 'opacity-15'}`}>
                <div className="text-xs text-slate-500 mb-2">UTF-16 splits it into a surrogate pair</div>
                <div className="flex gap-3 mb-4">
                    {[{ v: hi, t: 'high surrogate', r: 'D800–DBFF' }, { v: lo, t: 'low surrogate', r: 'DC00–DFFF' }].map(u => (
                        <div key={u.t} className="rounded-xl border border-sky-500/40 bg-sky-500/5 px-4 py-2.5">
                            <div className="text-sky-300 text-sm">0x{u.v.toString(16).toUpperCase()}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{u.t}</div>
                            <div className="text-[10px] text-slate-600">range {u.r}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`rounded-xl border border-red-500/40 bg-red-500/5 p-4 transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">&quot;{s}&quot;.length</span><span className="text-red-400">{s.length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">[...&quot;{s}&quot;].length</span><span className="text-green-400">{[...s].length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">&quot;{s}&quot;.slice(0, 1)</span><span className="text-red-400">a lone surrogate — renders as �</span></div>
                </div>
                <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                    .length counts UTF-16 units, not characters. Spreading or using for…of iterates code points instead,
                    which is why truncating a string by .length can cut an emoji in half.
                </div>
            </div>
        </div>
    );
}

// ── Act 7: normalization ───────────────────────────────────────────────────────
function NormalizeScene({ level }) {
    const nfc = 'é', nfd = 'é';
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                two ways to write the same visible character
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                    { label: 'NFC — precomposed', s: nfc, desc: 'a single code point' },
                    { label: 'NFD — decomposed', s: nfd, desc: 'base letter + combining mark' },
                ].map(c => (
                    <div key={c.label} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                        <div className="text-[10px] text-slate-500 mb-2">{c.label}</div>
                        <div className="text-4xl mb-3">{c.s}</div>
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                            <div>{[...c.s].map(ch => U(ch.codePointAt(0))).join(' + ')}</div>
                            <div className="text-slate-600">{[...ENC.encode(c.s)].map(hx).join(' ')} · {ENC.encode(c.s).length} bytes · length {c.s.length}</div>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-2">{c.desc}</div>
                    </div>
                ))}
            </div>

            <div className={`rounded-xl border border-red-500/40 bg-red-500/5 p-4 transition-opacity duration-500 ${level >= 2 ? 'opacity-100' : 'opacity-15'}`}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">a === b</span><span className="text-red-400">{String(nfd === nfc)}</span></div>
                <div className="text-[11px] text-slate-500">identical on screen, different bytes — so naive comparison fails</div>
            </div>

            <div className={`rounded-xl border border-green-500/40 bg-green-500/5 p-4 mt-3 transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">a.normalize(&apos;NFC&apos;) === b.normalize(&apos;NFC&apos;)</span>
                    <span className="text-green-400">{String(nfd.normalize('NFC') === nfc.normalize('NFC'))}</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                    normalize to a canonical form before comparing, hashing, or storing as a unique key
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

    // ═══ ACT 1: Mojibake ═══
    s(1, 'Bytes Are Not Text', { mojibake: 1 },
        'A file, a socket, a database column — none of them hold text. They hold bytes. Text only appears when something decides how to interpret those bytes, and that decision lives outside the bytes themselves.');
    s(1, 'Bytes Are Not Text', { mojibake: 2 },
        'Here are four bytes that spell "café" in UTF-8. Hand the exact same bytes to a program that assumes Windows-1252 and it confidently renders "cafÃ©" — because in that table C3 and A9 are two separate characters. Nothing is corrupted; the bytes are intact. Only the interpretation is wrong.');
    s(1, 'Bytes Are Not Text', { mojibake: 3 },
        'And there is no reliable way to recover the encoding from the bytes alone. It has to be carried alongside them, in a Content-Type header or a database column definition, or simply assumed. This is the entire reason mojibake exists, and why the industry converging on UTF-8 was such a relief.');

    // ═══ ACT 2: Code Points ═══
    s(2, 'Code Points', { sample: 'A', level: 3, heading: 'Unicode assigns every character a number — a code point',
        caption: 'ASCII characters keep their original values, which is not an accident' },
        'Unicode\'s job is to give every character in every writing system a unique number, called a code point, written U+ followed by hex. Crucially it says nothing about bytes — that is a separate decision. Latin A is U+0041, which is also its ASCII value; Unicode deliberately kept the first 128 slots identical to ASCII.');
    s(2, 'Code Points', { sample: 'eNFC', level: 3, heading: 'é is U+00E9 — one code point, but two bytes',
        caption: 'past U+007F the one-byte-per-character assumption breaks' },
        'é is U+00E9. Already the naive model fails: one character, one code point, but two bytes on disk. Any code that assumes one byte equals one character is now wrong — which described an enormous amount of C string handling for decades.');
    s(2, 'Code Points', { sample: 'euro', level: 3, heading: '€ is U+20AC — three bytes',
        caption: 'roughly 150,000 characters assigned, out of 1.1 million possible' },
        'The euro sign sits at U+20AC and takes three bytes. Unicode has room for about 1.1 million code points across 17 planes; roughly 150,000 are assigned so far. Plane 0, the Basic Multilingual Plane, holds nearly everything in living use — the higher planes are where emoji and historic scripts live.');

    // ═══ ACT 3: UTF-8 ═══
    s(3, 'UTF-8', { encode: 1 },
        'So how do we turn a code point into bytes? UTF-8 uses a variable-length scheme: one byte for ASCII, up to four for the rest. The number of bytes is encoded in the leading bits of the first byte, so a decoder always knows how many to expect.');
    s(3, 'UTF-8', { encode: 2 },
        'Take U+20AC. In binary it needs 16 bits, which will not fit in the one- or two-byte forms, so it uses the three-byte template — that template has exactly 4 + 6 + 6 = 16 payload bits available.');
    s(3, 'UTF-8', { encode: 3 },
        'The code point\'s bits are poured into the template\'s free slots: the first four into the lead byte after its 1110 marker, then six each into the two continuation bytes after their 10 markers.');
    s(3, 'UTF-8', { encode: 4 },
        'Out come E2 82 AC — exactly the bytes you would find in a file containing €. Notice how the ranges are chosen: ASCII stays one byte, so an all-English document is the same size as it was in ASCII and byte-identical to it. That backward compatibility is the main reason UTF-8 won over the alternatives.');

    // ═══ ACT 4: Prefix Bits ═══
    s(4, 'The Prefix Bits', { sample: 'mixed', level: 3, showBits: true, heading: 'every byte announces its role in its top bits',
        caption: 'green = ASCII · blue/purple/amber = lead bytes · grey = continuation' },
        'Look at a mixed string byte by byte and the scheme\'s elegance shows. Every byte declares what it is: a 0 top bit means a standalone ASCII character, 110/1110/11110 means a lead byte introducing 2/3/4 bytes, and 10 means a continuation byte. No byte is ambiguous.');
    s(4, 'The Prefix Bits', { sample: 'mixed', level: 3, showBits: true, hlCp: 2,
        heading: 'self-synchronizing — you can find a boundary from anywhere',
        caption: 'land mid-character and just scan back past the 10xxxxxx bytes' },
        'This makes UTF-8 self-synchronizing. Drop into the middle of a stream and you can find the next character boundary by scanning until you see a byte that does not start with 10. A corrupted or truncated chunk costs you one character, not the rest of the file — which is exactly the property you want in a network protocol or a log.');
    s(4, 'The Prefix Bits', { sample: 'mixed', level: 3,
        heading: 'and no ASCII byte ever appears inside a multi-byte sequence',
        caption: 'so byte-oriented C code keeps working unmodified' },
        'There is a second consequence that mattered enormously in practice. Because every byte of a multi-byte sequence has its high bit set, no ASCII byte can ever appear inside one. Searching for a "/" or a null terminator with plain byte comparison still works, and existing C code that splits on ASCII delimiters keeps working on UTF-8 unmodified. UTF-8 also sorts byte-wise in code point order, which UTF-16 does not.');

    // ═══ ACT 5: UTF-16 ═══
    s(5, 'UTF-16 and Surrogates', { utf16: 1 },
        'UTF-8 is not the only encoding, and one other matters because it is inside your runtime. JavaScript, Java, C# and the Windows API all represent strings as UTF-16 — sequences of 16-bit units. That is fine until a code point does not fit in 16 bits.');
    s(5, 'UTF-16 and Surrogates', { utf16: 2 },
        'Anything above U+FFFF must be split into a surrogate pair: a high surrogate from D800–DBFF and a low one from DC00–DFFF. Those ranges are permanently reserved and never assigned to real characters, so a decoder can always tell a surrogate from a normal unit.');
    s(5, 'UTF-16 and Surrogates', { utf16: 3 },
        'Which is why string length lies. In JavaScript .length counts UTF-16 units, so an emoji reports 2. Spreading the string or using for…of iterates code points and gives 1. And slicing by .length can cut a surrogate pair in half, leaving a lone surrogate that renders as a replacement character — the classic broken-emoji-in-a-truncated-preview bug.');

    // ═══ ACT 6: Graphemes ═══
    s(6, 'Grapheme Clusters', { sample: 'grin', level: 3, showLength: true, heading: 'one emoji: 1 cluster, 1 code point, 2 units, 4 bytes',
        caption: 'four different numbers, all correct, all answering different questions' },
        'Now the layer above code points. A grinning face is one thing to a human, one code point to Unicode, two units to JavaScript, and four bytes on disk. All four counts are correct — they just answer different questions. The bug is always in assuming they are the same question.');
    s(6, 'Grapheme Clusters', { sample: 'eNFD', level: 3, showLength: true, hlGrapheme: 0,
        heading: 'é written as e + combining acute — 2 code points, 1 cluster',
        caption: 'combining marks attach to the preceding character' },
        'Combining marks make this concrete without any emoji involved. Here é is written as a plain e followed by U+0301, a combining acute accent. Two code points, rendered as one visible character. A grapheme cluster is Unicode\'s term for that unit — what a reader would call a character.');
    s(6, 'Grapheme Clusters', { sample: 'flag', level: 3, showLength: true, hlGrapheme: 0,
        heading: 'a flag is two regional indicator letters',
        caption: 'there are no flag characters — just pairs of letters rendered together' },
        'Flags are stranger still. There is no code point for any flag. A flag is two regional indicator symbols — the letters I and N here — which the renderer pairs into one glyph. That design keeps Unicode out of the business of deciding what counts as a country.');
    s(6, 'Grapheme Clusters', { sample: 'family', level: 3, showLength: true, hlGrapheme: 0,
        heading: 'the family emoji — man, woman, girl, joined by zero-width joiners',
        caption: 'one cluster · 5 code points · 8 UTF-16 units · 18 bytes' },
        'And here is the extreme case. The family emoji is three separate people emoji glued together by zero-width joiners (U+200D, shown in amber). One visible character, five code points, eight UTF-16 units, eighteen bytes. Reverse this string naively and you get nonsense; truncate it and you may get three separate people. Correct handling needs a grapheme segmenter — Intl.Segmenter in JavaScript — not string indexing.');

    // ═══ ACT 7: Normalization ═══
    s(7, 'Normalization', { normalize: 1 },
        'One last trap, and it is the one most likely to reach production. We just saw é written two ways: as the single code point U+00E9, or as e plus a combining accent. Both render identically. Neither is more correct.');
    s(7, 'Normalization', { normalize: 2 },
        'But they are different byte sequences, so === returns false. A user types their name on a Mac (which tends to produce decomposed forms) and again on Windows, and your equality check says they are different people. Two database rows that look identical fail a uniqueness constraint. A file appears twice in a listing.');
    s(7, 'Normalization', { normalize: 3 },
        'The fix is normalization: convert to a canonical form before comparing, hashing, or using text as a key. NFC composes to the shortest form and is the usual default for storage; NFD decomposes. There are also compatibility forms NFKC and NFKD which fold things like ﬁ into fi — useful for search, lossy for storage. And there is a security dimension: normalization and confusable characters are how homograph attacks work, which is why registrars and identifier rules restrict mixing scripts.');

    // ═══ ACT 8: Takeaways ═══
    s(8, 'Takeaways', {
        recap: true,
        wins: [
            { t: 'Bytes need an encoding', d: 'Nothing in a byte stream says what it is. The encoding travels separately — and guessing wrong gives mojibake, not corruption.' },
            { t: 'UTF-8 announces itself', d: 'Leading bits give the length; continuation bytes always start 10. Self-synchronizing, ASCII-compatible, and byte-wise sortable.' },
            { t: 'Four counts, four questions', d: 'Grapheme clusters, code points, UTF-16 units and bytes are all different numbers. .length gives you units, which is rarely what you meant.' },
            { t: 'Normalize before comparing', d: 'The same visible text has multiple valid encodings. Convert to NFC before equality checks, hashing, or unique keys.' },
        ],
    }, 'Text is the layer everyone assumes is simple and almost nobody models correctly. The reliable defaults are short: use UTF-8 for everything stored or transmitted, declare it explicitly, normalize to NFC at your input boundary, and reach for a grapheme segmenter whenever you truncate, reverse, or count "characters" for a human. Almost every text bug you will meet — the mangled accent, the emoji cut in half, the two names that should have matched — is one of those four rules going unobserved.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap)     return <RecapCards wins={step.wins} />;
    if (step.mojibake)  return <MojibakeScene level={step.mojibake} />;
    if (step.encode)    return <EncodeScene stage={step.encode} />;
    if (step.utf16)     return <Utf16Scene level={step.utf16} />;
    if (step.normalize) return <NormalizeScene level={step.normalize} />;
    return <TextStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'What makes UTF-8 "self-synchronizing"?',
        options: [
            'Every character is exactly the same number of bytes',
            'Continuation bytes always start with 10, so scanning back to the first byte that does not gives you a character boundary',
            'A byte order mark at the start of every file',
            'Each character ends with a null terminator',
        ],
        correct: 1,
        explanation: 'Lead bytes start 0, 110, 1110 or 11110; continuation bytes always start 10. So from any position in the stream you can find the next character boundary by skipping bytes that begin with 10. Corruption or truncation costs one character rather than desynchronizing the whole remaining stream — exactly what you want in a network protocol or log file.',
    },
    {
        question: 'In JavaScript, why does the family emoji 👨‍👩‍👧 report a .length of 8?',
        options: [
            'It is a bug in the JavaScript engine',
            'The string contains eight separate emoji characters',
            'It is three emoji joined by two zero-width joiners — five code points, which take eight UTF-16 units because the three people emoji are each surrogate pairs',
            '.length counts bytes, and the emoji is eight bytes',
        ],
        correct: 2,
        explanation: 'It is one grapheme cluster built from five code points: man, ZWJ, woman, ZWJ, girl. Each person emoji is above U+FFFF so it needs a surrogate pair (2 units each = 6), plus 1 unit for each of the two ZWJs, giving 8. It is also 18 bytes in UTF-8. Four different correct counts for four different questions.',
    },
    {
        question: 'Two strings render identically on screen but === returns false. What is the most likely cause and fix?',
        options: [
            'One has trailing whitespace; trim both',
            'They use different Unicode normalization forms (e.g. é as one code point vs e + combining accent); normalize both to NFC before comparing',
            'One is UTF-8 and the other UTF-16; convert one',
            'JavaScript cannot compare non-ASCII strings',
        ],
        correct: 1,
        explanation: 'The same visible character often has both a precomposed form (U+00E9) and a decomposed one (e + U+0301). They render identically but are different byte sequences, so equality fails. Calling .normalize("NFC") on both before comparing, hashing, or storing as a key fixes it. This is a common source of duplicate rows and failed name matches across operating systems.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you will never trust .length again!' : 'Review the explanations to reinforce the layers.'}
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

export default function UnicodePage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Unicode and UTF-8</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Code points, variable-length encoding, surrogate pairs, grapheme clusters — and why string length lies
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">The layers</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1],    label: 'Bytes',      note: 'meaningless alone' },
                                    { acts: [2],    label: 'Code point', note: 'U+0000–U+10FFFF' },
                                    { acts: [3, 4], label: 'UTF-8',      note: '1–4 bytes · prefixed' },
                                    { acts: [5],    label: 'UTF-16',     note: '2 or 4 · surrogates' },
                                    { acts: [6],    label: 'Grapheme',   note: 'what humans count' },
                                    { acts: [6],    label: 'ZWJ',        note: 'U+200D glues emoji' },
                                    { acts: [7],    label: 'NFC / NFD',  note: 'normalize to compare' },
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
