"use client";

import React, { useState, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Compass, MousePointer2, Hash, TrendingDown, Cpu, ToggleRight, Anchor, Merge, Hourglass,
    CheckCircle, XCircle, Wrench, Lock, Shuffle,
} from 'lucide-react';
import { runSequence, backward, zeroGrads, paramCount } from '@/lib/ml/recurrent';
import { holdExample, holdAccuracy, loadRecurrentFile, HOLD_LEAD } from '@/lib/ml/sequenceTasks';
import { rankedChoices, slotOf } from '@/lib/ml/predictChoices';
import useLoaded from '@/lib/ml/useLoaded';
import { createRng } from '@/lib/random';
import Heatmap from '@/components/ml/Heatmap';
import ShapeTag from '@/components/ml/ShapeTag';
import SourceChip from '@/components/ml/SourceChip';
import InCode from '@/components/ml/InCode';
import Tex from '@/components/math/Tex';
import ParamSlider from '@/components/math/ParamSlider';
import { usePredict, PredictPrompt } from '@/components/PredictStep';
import TourPlayer, {
    useStepPlayback, ExplanationBox, ModeTabs, Segmented, Misconception, BreakNote, LoadingCard, LoadError, FormulaPanel, Card,
} from '@/components/ml/TourKit';

/* ── the task and the trained networks ───────────────────
   Hold a number: one of the first three steps is flagged, and from step 4
   on the network must keep reporting the flagged value while new random
   values keep arriving. A plain RNN, an LSTM and a GRU, 4 hidden units
   each, were trained on it offline (scripts/ml/train_recurrent.mjs) with
   the same engine this page runs; public/models/recurrent/hold.json holds
   their weights and their measured accuracy. */

const T_TOUR = 30;
const PRESETS = [
    { label: '0.71 at step 1', seed: 6, marker: 0, value: 0.71 },
    { label: '−0.45 at step 2', seed: 8, marker: 1, value: -0.45 },
    { label: '0.18 at step 3', seed: 15, marker: 2, value: 0.18 },
    { label: '−0.83 at step 1', seed: 36, marker: 0, value: -0.83 },
];
const presetExample = (pr, T = T_TOUR) => holdExample(createRng(pr.seed), T, { marker: pr.marker, value: pr.value });

const ACTS = [
    { id: 1, label: 'The task', name: 'Hold a Number', icon: Hash },
    { id: 2, label: 'Plain RNN', name: 'A Plain RNN Drifts', icon: TrendingDown },
    { id: 3, label: 'LSTM cell', name: 'The LSTM Cell', icon: Cpu },
    { id: 4, label: 'Gates', name: 'The Gates at Work', icon: ToggleRight },
    { id: 5, label: 'Holding', name: 'Holding the Value', icon: Anchor },
    { id: 6, label: 'GRU', name: 'The GRU: Two Gates', icon: Merge },
    { id: 7, label: 'How long', name: 'How Long Memory Lasts', icon: Hourglass },
];

const KIND_NAME = { rnn: 'plain RNN', lstm: 'LSTM', gru: 'GRU' };
const COLORS = { rnn: '#94a3b8', lstm: '#facc15', gru: '#22d3ee', target: '#f8fafc' };
const LENGTHS = [10, 30, 80, 160, 500, 1000];

/** Signed number with a typographic minus, 2 decimals. */
const num = (v, d = 2) => { const s = (Math.round(v * 10 ** d) / 10 ** d + 0).toFixed(d); return s.startsWith('-') ? `−${s.slice(1)}` : s; };
const pct = (v) => `${Math.round(v * 100)}%`;
const range = (xs) => { const lo = Math.min(...xs), hi = Math.max(...xs); return lo === hi ? pct(lo) : `${pct(lo)}–${pct(hi)}`; };

/** The unit whose final state tracks the flagged value best, over 200 seeded sequences. */
function memoryUnit(net) {
    const rng = createRng(5);
    const exs = Array.from({ length: 200 }, () => holdExample(rng, T_TOUR));
    const key = net.kind === 'lstm' ? 'c' : 'h';
    const finals = exs.map(ex => runSequence(net, ex.xs).steps[T_TOUR - 1][key]);
    const ans = exs.map(e => e.answer);
    const corr = (a, b) => {
        const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length;
        let s = 0, sa = 0, sb = 0;
        a.forEach((x, i) => { s += (x - ma) * (b[i] - mb); sa += (x - ma) ** 2; sb += (b[i] - mb) ** 2; });
        return s / Math.sqrt(sa * sb);
    };
    const cs = Array.from({ length: net.H }, (_, k) => corr(finals.map(f => f[k]), ans));
    const k = cs.map(Math.abs).indexOf(Math.max(...cs.map(Math.abs)));
    // The straight line the unit's final value follows: state ≈ intercept + slope × value.
    const xs = finals.map(f => f[k]);
    const ma = ans.reduce((a, b) => a + b, 0) / ans.length, mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const slope = ans.reduce((a, v, i) => a + (v - ma) * (xs[i] - mx), 0) / ans.reduce((a, v) => a + (v - ma) ** 2, 0);
    const fit = { slope, intercept: mx - slope * ma };
    // Other units that track the value almost as closely.
    const others = cs.map((c, j) => j).filter(j => j !== k && Math.abs(cs[j]) > 0.95);
    // Mean of each gate on this unit at the flagged step, before it and after it.
    const runs = exs.map(ex => runSequence(net, ex.xs));
    const gates = net.kind === 'lstm' ? ['f', 'i', 'o'] : net.kind === 'gru' ? ['z', 'r'] : [];
    const stats = {};
    for (const g of gates) {
        const at = [], after = [];
        runs.forEach((r, e) => r.steps.forEach((st, t) => {
            if (t === exs[e].marker) at.push(st[g][k]); else if (t > exs[e].marker) after.push(st[g][k]);
        }));
        stats[g] = {
            at: at.reduce((a, b) => a + b, 0) / at.length,
            after: after.reduce((a, b) => a + b, 0) / after.length,
            // What a stored value is multiplied by per step, on average: the geometric mean.
            afterGeo: Math.exp(after.reduce((a, b) => a + Math.log(b), 0) / after.length),
        };
    }
    return { k, corr: cs[k], fit, others, stats };
}

/** ∂y_T/∂v_t: how much the last output moves per unit change of each input value, by one backward pass. */
function sensitivity(net, ex, clamp = null) {
    const T = ex.xs.length;
    const run = runSequence(net, ex.xs, {}, { clamp });
    const dys = Array.from({ length: T }, (_, t) => (t === T - 1 ? [1] : null));
    return backward(net, run, dys, zeroGrads(net)).dxAt.map(d => d[0]);
}
const leakOf = (sens, marker) => sens.reduce((a, s, t) => a + (t === marker ? 0 : Math.abs(s)), 0);

/** What a memory unit stores: a straight-line stand-in for the number, not the number itself. */
function standIn(what, sym, mem, finalValue, v) {
    const { slope, intercept } = mem.fit;
    const line = `${sym} ≈ ${num(intercept)} ${slope < 0 ? '−' : '+'} ${num(Math.abs(slope))} × value`;
    const others = mem.others.map(j => j + 1);
    const also = others.length === 0 ? 'The'
        : `Unit${others.length > 1 ? 's' : ''} ${others.length > 1 ? `${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}` : others[0]} hold${others.length > 1 ? '' : 's'} stand-ins of ${others.length > 1 ? 'their' : 'its'} own, and the`;
    return `The ${what} does not store the number itself but a stand-in for it: over those sequences its final value fits ${line} (correlation ${num(mem.corr, 3)}), and on this sequence it ends at ${num(finalValue, 3)} for ${num(v)}. ${also} readout turns ${others.length ? 'them' : 'it'} back into the answer.`;
}

/** The shipped network's test numbers, as the training script measured them. */
const studyOf = (file, kind) => file.seedStudy[kind].find(s => s.seed === file.models[kind].seed);

/** Everything the tour needs that does not depend on the preset. */
function analyse(file) {
    const { nets } = file;
    // The baseline: how often "always answer 0" lands within 0.1, on the test sequences.
    const rng = createRng(99);
    const answers = Array.from({ length: 300 }, () => holdExample(rng, 10).answer);
    const guess = answers.filter(a => Math.abs(a) < 0.1).length / answers.length;
    return { lstmMem: memoryUnit(nets.lstm), gruMem: memoryUnit(nets.gru), guess };
}

/* ── the guided tour ─────────────────────────────────────── */
function generateSteps(file, info, presetIndex) {
    const { nets } = file;
    const ex = presetExample(PRESETS[presetIndex]);
    const runs = { rnn: runSequence(nets.rnn, ex.xs), lstm: runSequence(nets.lstm, ex.xs), gru: runSequence(nets.gru, ex.xs) };
    const outs = Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, r.steps.map(s => s.y[0])]));
    const last = (k) => outs[k][T_TOUR - 1];
    const study = { rnn: studyOf(file, 'rnn'), lstm: studyOf(file, 'lstm'), gru: studyOf(file, 'gru') };
    const seedRange = (k, T) => range(file.seedStudy[k].map(s => s.within[T]));
    const m = ex.marker, v = ex.answer;
    const steps = [];
    const base = { presetIndex, ex, outs };
    const s = (act, data, explanation) => steps.push({ act, actName: ACTS[act - 1].name, ...base, ...data, explanation });

    s(1, { kind: 'task' },
        `Each step brings a random number between −1 and 1, plus a marker bit. The marker flags step ${m + 1}, whose number is ${num(v)}. From step ${HOLD_LEAD + 1} on, the network must keep answering ${num(v)} — while ${T_TOUR - 1} other numbers keep arriving that it has to ignore.`);

    const rnnSens = sensitivity(nets.rnn, ex);
    const rnnOff = Math.abs(last('rnn') - v);
    s(2, { kind: 'rnnOut', show: ['rnn'] },
        `A plain RNN with 4 hidden units, trained on this task. ${rnnOff >= 0.1
            ? `Its answer drifts as the other numbers arrive: by step ${T_TOUR} it says ${num(last('rnn'))} instead of ${num(v)}.`
            : `Its answer wobbles as the other numbers arrive; on this sequence it happens to end at ${num(last('rnn'))}, within 0.1 of ${num(v)}.`} Over 300 test sequences it is within 0.1 of the flagged number at step ${T_TOUR} only ${pct(study.rnn.within[30])} of the time (${seedRange('rnn', 30)} across four training seeds).`);
    s(2, { kind: 'leak', net: 'rnn', sens: rnnSens },
        `Why it drifts: nudge each input by a little and see how much the final answer moves. A perfect memory would move by exactly 1 for the flagged number and 0 for every other. The RNN's answer moves by ${num(rnnSens[m])} for the flagged one — and by ${num(leakOf(rnnSens, m))} in total for the other ${T_TOUR - 1}. h = tanh(W h₋ + U x + b) adds U x at every step: the RNN has no way to switch its input off.`);

    s(3, { kind: 'lstmCell' },
        `The LSTM adds a second state, the cell c, and three gates — numbers between 0 and 1 computed from h₋ and x. The forget gate f says how much of the old cell to keep, the input gate i how much of a new candidate g to write, the output gate o how much of the cell to show as h: c = f ⊙ c₋ + i ⊙ g. The extra machinery costs ${paramCount(nets.lstm)} parameters against the RNN's ${paramCount(nets.rnn)}.`);

    const { k: mk, stats: ls } = info.lstmMem;
    const lstmRun = runs.lstm;
    for (let t = 0; t <= HOLD_LEAD; t++) {
        const st = lstmRun.steps[t];
        const cell = { f: st.f[mk], i: st.i[mk], g: st.g[mk], o: st.o[mk], cPrev: st.cPrev[mk], c: st.c[mk], h: st.h[mk] };
        const sum = `c = ${num(cell.f)} × ${num(cell.cPrev)} + ${num(cell.i)} × ${num(cell.g)} = ${num(cell.c)}`;
        let what;
        if (t === m) {
            what = `This is the flagged step. On the memory unit (unit ${mk + 1}) the forget gate is ${num(cell.f)} and the input gate ${num(cell.i)}, so ${sum}: ${cell.f < 0.5 ? 'most of the old contents are dropped' : 'some of the old contents stay'}, and ${cell.i > 0.5 ? 'most' : 'part'} of the new candidate is written in.`;
        } else if (t < m) {
            what = `Step ${t + 1} is not flagged. Unit ${mk + 1}: f = ${num(cell.f)}, i = ${num(cell.i)}, g = ${num(cell.g)}, so ${sum}. Nothing here needs keeping yet.`;
        } else {
            const shut = cell.f > 0.95 && cell.i < 0.1;
            what = `Step ${t + 1}, after the flag. Unit ${mk + 1}: ${sum}. ${shut
                ? `f = ${num(cell.f)} keeps almost all of c, and i = ${num(cell.i)} lets almost none of the new candidate in: this step's random number barely touches the memory.`
                : `The forget gate keeps ${pct(cell.f)} of c and the input gate lets ${pct(cell.i)} of the new candidate in.`}`;
        }
        s(4, { kind: 'lstmStep', t, mk, cell, run: lstmRun }, what);
    }
    s(4, { kind: 'lstmGates', run: lstmRun, mk },
        `All ${T_TOUR} steps at once, every unit and every gate. Unit ${mk + 1} is the memory: over 200 test sequences its forget gate averages ${num(ls.f.at)} on the flagged step and ${num(ls.f.after, 3)} after it, and its input gate ${num(ls.i.at)} on the flagged step and ${num(ls.i.after, 3)} after it. Open to write, then shut to hold — the gates learned when to listen. ${standIn('cell', 'c', info.lstmMem, lstmRun.steps[T_TOUR - 1].c[mk], v)}`);

    const lstmSens = sensitivity(nets.lstm, ex);
    s(5, { kind: 'rnnOut', show: ['rnn', 'lstm'] },
        `The LSTM's answer stays flat: ${num(last('lstm'))} at step ${T_TOUR} for ${num(v)}. Over 300 test sequences it is within 0.1 at step ${T_TOUR} ${pct(study.lstm.within[30])} of the time (${seedRange('lstm', 30)} across four seeds), against the RNN's ${pct(study.rnn.within[30])}.`);
    s(5, { kind: 'leak', net: 'lstm', sens: lstmSens },
        `The same nudge test: the LSTM's final answer moves by ${num(lstmSens[m])} for the flagged number and by ${num(leakOf(lstmSens, m))} in total for all the others (the RNN's: ${num(leakOf(rnnSens, m))}). The closed input gate is what keeps the noise out.`);

    const { k: gk, stats: gs } = info.gruMem;
    s(6, { kind: 'gruCell' },
        `The GRU does the same job with two gates and no separate cell. The update gate z mixes old and new: h = (1 − z) ⊙ n + z ⊙ h₋, where the candidate n is built from x and the reset-gated old state. z near 1 keeps h; z near 0 replaces it. ${paramCount(nets.gru)} parameters.`);
    const gst = runs.gru.steps[m];
    const gcell = { z: gst.z[gk], r: gst.r[gk], n: gst.n[gk], hPrev: gst.hPrev[gk], h: gst.h[gk] };
    s(6, { kind: 'gruStep', t: m, gk, gcell, run: runs.gru },
        `The flagged step, on the GRU's memory unit (unit ${gk + 1}): z = ${num(gcell.z)}, so h = (1 − ${num(gcell.z)}) × ${num(gcell.n)} + ${num(gcell.z)} × ${num(gcell.hPrev)} = ${num(gcell.h)}. Over 200 test sequences this unit's z averages ${num(gs.z.at)} on the flagged step and ${num(gs.z.after)} after it. ${standIn('state', 'h', info.gruMem, runs.gru.steps[T_TOUR - 1].h[gk], v)}`);
    s(6, { kind: 'gruGates', run: runs.gru, gk, show: ['rnn', 'lstm', 'gru'] },
        `One gate does what the LSTM's forget and input gates do together: z near 0 writes, z near 1 holds. The GRU says ${num(last('gru'))} at step ${T_TOUR}; over 300 test sequences it is within 0.1 ${pct(study.gru.within[30])} of the time (${seedRange('gru', 30)} across four seeds).`);

    s(7, { kind: 'lengths', study, file, guess: info.guess },
        `Trained on sequences of up to 60 steps, then tested longer. At length 160 the LSTM is still within 0.1 ${pct(study.lstm.within[160])} of the time and the GRU ${pct(study.gru.within[160])}, against the plain RNN's ${pct(study.rnn.within[160])}. At 500: LSTM ${pct(study.lstm.within[500])}, GRU ${pct(study.gru.within[500])}; at 1000: ${pct(study.lstm.within[1000])} and ${pct(study.gru.within[1000])}. The RNN's score barely moves (${pct(study.rnn.within[1000])} at 1000) only because it never held the number well: always answering 0 would already score ${pct(info.guess)}. Each network shown was picked from four training runs on a separate validation set; across all four runs, the LSTM scores ${seedRange('lstm', 160)} at 160 and the GRU ${seedRange('gru', 160)}.`);
    const fbar = ls.f.afterGeo;
    s(7, { kind: 'decay', fbar },
        `Why not forever: after the flag, the LSTM's memory cell is multiplied by its forget gate every step — ${num(fbar, 4)} on average (the geometric mean, over 200 sequences). A hair below 1, but it compounds: ${num(fbar, 4)}^100 = ${num(fbar ** 100)}, ^500 = ${num(fbar ** 500)}, ^1000 = ${num(fbar ** 1000)}. And the input gate, ${num(ls.i.after, 3)} on average, still lets a sliver of every new random number in. Over hundreds of steps the shrinking and the seeping both add up.`);
    return steps;
}

/* ── predict prompts ─────────────────────────────────────── */
// One per network, on the flagged step, where the update genuinely changes
// the memory. After the flag the answer is "the old value again", which the
// learner would guess without any arithmetic. The memory cell's values are
// small (it stores a scaled-down copy), so the numbers carry three decimals
// and the options sit 0.01 apart, with the answer at a hashed rank: close
// enough that "whatever is nearest the candidate" or "nearest the old value"
// lands on a wrong option. The suite prints every strategy's rate.
const PROMPT_SALT = 31;
const PROMPT_STEP = 0.01;
const predictFor = (step, next) => {
    if (!next) return null;
    const n3 = (v) => num(v, 3);
    const plus = (a, b) => `${n3(a)} ${b < 0 ? '−' : '+'} ${n3(Math.abs(b))}`;
    if (next.kind === 'lstmStep' && next.t === next.ex.marker) {
        const { f, i, g, cPrev, c } = next.cell;
        const { options, correct } = rankedChoices(c, [], { slot: slotOf(next.presetIndex, 1, PROMPT_SALT), step: PROMPT_STEP, fmt: n3 });
        return {
            question: `On the flagged step the memory unit's gates come out as f = ${n3(f)} and i = ${n3(i)}, with candidate g = ${n3(g)}; the old cell is c₋ = ${n3(cPrev)}. What is the new cell value, c = f × c₋ + i × g?`,
            options, correct,
            because: `${n3(f)} × ${n3(cPrev)} + ${n3(i)} × ${n3(g)} = ${plus(f * cPrev, i * g)} = ${n3(c)}.${Math.abs(f * cPrev) < Math.abs(i * g) / 4
                ? 'The kept part is small: the forget gate has dropped most of the old cell, and the input gate writes the candidate in.'
                : 'Both parts count here: some of the old cell survives alongside what the input gate writes.'}`,
        };
    }
    if (next.kind === 'gruStep') {
        const { z, n, hPrev, h } = next.gcell;
        const { options, correct } = rankedChoices(h, [], { slot: slotOf(next.presetIndex, 2, PROMPT_SALT), step: PROMPT_STEP, fmt: n3 });
        return {
            question: `On the flagged step the GRU's memory unit has update gate z = ${n3(z)}, candidate n = ${n3(n)} and old state h₋ = ${n3(hPrev)}. What is the new state, h = (1 − z) × n + z × h₋?`,
            options, correct,
            because: `(1 − ${n3(z)}) × ${n3(n)} + ${n3(z)} × ${n3(hPrev)} = ${plus((1 - z) * n, z * hPrev)} = ${n3(h)}.${z < 0.5
                ? 'With z this low the update gate is mostly taking the new candidate.'
                : 'With z this high the update gate is mostly keeping the old state.'}`,
        };
    }
    return null;
};

function formulaFor(step) {
    switch (step.kind) {
        case 'task': return String.raw`y_t = v_{${step.ex.marker + 1}} = ${num(step.ex.answer)} \quad \text{for every } t \ge ${HOLD_LEAD + 1}`;
        case 'rnnOut': return String.raw`h_t = \tanh(W h_{t-1} + U x_t + b) \quad\Rightarrow\quad \text{every } x_t \text{ is added in}`;
        case 'leak': return String.raw`\frac{\partial y_{${T_TOUR}}}{\partial v_{${step.ex.marker + 1}}} = ${num(step.sens[step.ex.marker])}, \qquad \sum_{t \ne ${step.ex.marker + 1}} \left| \frac{\partial y_{${T_TOUR}}}{\partial v_t} \right| = ${num(leakOf(step.sens, step.ex.marker))}`;
        case 'lstmCell': return String.raw`f, i, o = \sigma(W h_{t-1} + U x_t + b), \quad g = \tanh(\cdots), \quad c_t = f \odot c_{t-1} + i \odot g, \quad h_t = o \odot \tanh(c_t)`;
        case 'lstmStep': {
            const { f, i, g, cPrev, c } = step.cell;
            return String.raw`c = ${num(f)} \times ${num(cPrev)} + ${num(i)} \times ${num(g)} = ${num(c)}`;
        }
        case 'lstmGates': return String.raw`c_t = f_t \odot c_{t-1} + i_t \odot g_t`;
        case 'gruCell': return String.raw`z, r = \sigma(\cdots), \quad n = \tanh(U_n x_t + b_n + r \odot W_n h_{t-1}), \quad h_t = (1 - z) \odot n + z \odot h_{t-1}`;
        case 'gruStep': {
            const { z, n, hPrev, h } = step.gcell;
            return String.raw`h = (1 - ${num(z)}) \times ${num(n)} + ${num(z)} \times ${num(hPrev)} = ${num(h)}`;
        }
        case 'gruGates': return String.raw`z \approx 0: \text{write}, \qquad z \approx 1: \text{hold}`;
        case 'lengths': {
            const p = (k) => pct(step.study[k].within[500]).replace('%', '\\%');
            return String.raw`\text{within } 0.1 \text{ at } T = 500:\ \text{RNN } ${p('rnn')},\ \text{LSTM } ${p('lstm')},\ \text{GRU } ${p('gru')}`;
        }
        case 'decay': return String.raw`c_{t+k} \approx \bar f^{\,k} c_t: \quad ${num(step.fbar, 4)}^{500} = ${num(step.fbar ** 500)}, \qquad ${num(step.fbar, 4)}^{1000} = ${num(step.fbar ** 1000)}`;
        default: return '';
    }
}

const quizQuestions = [
    {
        question: 'Why does a plain RNN struggle to hold one number while other inputs keep arriving?',
        options: [
            'It has too few parameters',
            'Every step adds U·x into the state, and it has no way to switch that input off',
            'tanh cannot represent negative numbers',
            'It forgets the weights after each step',
        ],
        correct: 1,
        explanation: 'h = tanh(W h₋ + U x + b) mixes in every new input with the same weights. Without a multiplicative gate there is nothing that can say "ignore this one".',
    },
    {
        question: 'In an LSTM, c = f ⊙ c₋ + i ⊙ g. Which gate values hold a stored value unchanged?',
        options: [
            'f near 0, i near 1',
            'f near 1, i near 0',
            'f near 0, i near 0',
            'o near 1',
        ],
        correct: 1,
        explanation: 'f near 1 keeps the old cell; i near 0 writes almost none of the new candidate. The output gate only decides how much of c is shown as h.',
    },
    {
        question: 'A GRU update is h = (1 − z) ⊙ n + z ⊙ h₋. What does z near 1 do?',
        options: [
            'Replaces h with the new candidate',
            'Keeps the old state h₋',
            'Resets h to zero',
            'Doubles the input',
        ],
        correct: 1,
        explanation: 'With z = 1 the new state is exactly h₋. The single update gate plays the role of both the LSTM forget gate (keep) and input gate (write, when z is near 0).',
    },
];

const codeExample = `import torch
import torch.nn as nn

lstm = nn.LSTM(input_size=2, hidden_size=4, batch_first=True)
gru = nn.GRU(input_size=2, hidden_size=4, batch_first=True)
count = lambda m: sum(p.numel() for p in m.parameters())
print(count(lstm), count(gru))   # 128 96: four gate blocks against three
# PyTorch keeps two bias vectors per gate (b_ih and b_hh); this page folds
# them into one, so its LSTM has 4 × 4 = 16 fewer: 112 + a readout of 5 = 117.

x = torch.randn(1, 30, 2)        # [batch, T, (value, marker)]
out, (h, c) = lstm(x)            # out: [1, 30, 4], one h per step; c: [1, 1, 4]
with torch.no_grad():
    lstm.bias_hh_l0[4:8] += 3    # the forget-gate slice: start it near σ(3) = 0.95`;

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <p className="text-sm text-slate-400 mb-3">
                    {quizState.score === quizQuestions.length ? 'All correct.' : 'Step through the tour once more and try again.'}
                </p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="text-sm px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">Retake</button>
            </div>
        );
    }
    const answer = (idx) => {
        if (quizState.answered) return;
        const right = idx === q.correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: right ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm text-slate-200 mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let tone = 'border-slate-700 text-slate-300 hover:border-yellow-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={i} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${tone}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className={`flex items-center gap-1.5 text-sm font-medium mb-1 ${quizState.selected === q.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {quizState.selected === q.correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {quizState.selected === q.correct ? 'Correct' : 'Not quite'}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── scenes ──────────────────────────────────────────────── */
const Caption = ({ children }) => <div className="text-xs text-slate-400 mb-1.5 flex flex-wrap items-center gap-1.5">{children}</div>;
const r2 = (v) => Math.round(v * 100) / 100;

/** The inputs as bars around a midline, the flagged one in yellow. */
function ValueStrip({ ex, cursor = null }) {
    const T = ex.vals.length, w = Math.max(6, Math.min(16, 480 / T)), W = T * w + 34, H = 96, mid = 48;
    return (
        <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full block" role="img" aria-label="Input values">
            <line x1={30} x2={W} y1={mid} y2={mid} stroke="#334155" />
            <text x={24} y={mid - 34} fontSize={9} textAnchor="end" fill="#64748b">1</text>
            <text x={24} y={mid + 38} fontSize={9} textAnchor="end" fill="#64748b">−1</text>
            {ex.vals.map((v, t) => {
                const x = 32 + t * w, h = Math.abs(v) * 38, flagged = t === ex.marker;
                return (
                    <g key={t}>
                        {cursor === t && <rect x={r2(x - 1)} y={4} width={r2(w)} height={H - 8} fill="#facc15" opacity={0.12} />}
                        <rect x={r2(x)} y={r2(v >= 0 ? mid - h : mid)} width={r2(w - 2)} height={r2(Math.max(0.5, h))} rx={1}
                            fill={flagged ? '#facc15' : '#475569'} />
                        {(t % 5 === 4 || t === 0) && <text x={r2(x + w / 2 - 1)} y={H + 12} fontSize={9} textAnchor="middle" fill="#64748b">{t + 1}</text>}
                    </g>
                );
            })}
        </svg>
    );
}

/** Outputs over time against the flagged value, with the ±0.1 band. */
function OutputChart({ ex, outs, show }) {
    const T = ex.vals.length, W = 520, H = 170, x0 = 34, x1 = W - 8;
    const X = (t) => r2(x0 + (t / Math.max(1, T - 1)) * (x1 - x0));
    const Y = (v) => r2(H / 2 - Math.max(-1.25, Math.min(1.25, v)) * 62);
    const line = (ys) => ys.map((y, t) => `${t ? 'L' : 'M'}${X(t)},${Y(y)}`).join(' ');
    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full block" role="img" aria-label="Network outputs over time">
                {[-1, 0, 1].map(v => <g key={v}><line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke="#1e293b" /><text x={x0 - 6} y={Y(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{num(v, 0)}</text></g>)}
                <rect x={X(HOLD_LEAD)} y={Y(ex.answer + 0.1)} width={r2(X(T - 1) - X(HOLD_LEAD))} height={r2(Y(ex.answer - 0.1) - Y(ex.answer + 0.1))} fill={COLORS.target} opacity={0.08} />
                <line x1={X(HOLD_LEAD)} x2={X(T - 1)} y1={Y(ex.answer)} y2={Y(ex.answer)} stroke={COLORS.target} strokeDasharray="5 4" strokeWidth={1.2} />
                <line x1={X(ex.marker)} x2={X(ex.marker)} y1={10} y2={H - 10} stroke="#facc15" strokeDasharray="2 3" opacity={0.6} />
                {show.map(k => <path key={k} d={line(outs[k])} fill="none" stroke={COLORS[k]} strokeWidth={k === show[show.length - 1] ? 2.2 : 1.6} />)}
                {[1, 10, 20, 30, 40, 60, 80, 120, 160].filter(t => t <= T).map(t => <text key={t} x={X(t - 1)} y={H + 10} fontSize={9} textAnchor="middle" fill="#64748b">{t}</text>)}
            </svg>
            <div className="flex flex-wrap gap-3 justify-center text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-slate-100" />flagged value ±0.1</span>
                {show.map(k => <span key={k} className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COLORS[k] }} />{KIND_NAME[k]}</span>)}
            </div>
        </div>
    );
}

/** ∂y_T / ∂v_t for every input: 1 at the flag and 0 elsewhere is a perfect memory. */
function SensBars({ sens, marker, color }) {
    const T = sens.length, w = Math.max(6, Math.min(16, 480 / T)), W = T * w + 34, H = 120, base = 100;
    const scale = 80 / Math.max(1.2, ...sens.map(Math.abs));
    return (
        <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full block" role="img" aria-label="Sensitivity of the final answer to each input">
            <line x1={30} x2={W} y1={base} y2={base} stroke="#334155" />
            <line x1={30} x2={W} y1={r2(base - scale)} y2={r2(base - scale)} stroke="#475569" strokeDasharray="3 3" />
            <text x={26} y={r2(base - scale + 3)} fontSize={9} textAnchor="end" fill="#64748b">1</text>
            <text x={26} y={base + 3} fontSize={9} textAnchor="end" fill="#64748b">0</text>
            {sens.map((v, t) => {
                const h = Math.abs(v) * scale, x = 32 + t * w;
                return (
                    <g key={t}>
                        <rect x={r2(x)} y={r2(v >= 0 ? base - h : base)} width={r2(w - 2)} height={r2(Math.max(0.5, h))} rx={1} fill={t === marker ? '#facc15' : color} opacity={t === marker ? 1 : 0.85} />
                        {(t % 5 === 4 || t === 0) && <text x={r2(x + w / 2 - 1)} y={H + 10} fontSize={9} textAnchor="middle" fill="#64748b">{t + 1}</text>}
                    </g>
                );
            })}
        </svg>
    );
}

function LstmDiagram({ cell }) {
    const v = (x) => (cell ? num(x) : '');
    const gate = (x, label, val, color) => (
        <g>
            <rect x={x - 26} y={128} width={52} height={34} rx={6} fill="#1e293b" stroke={color} strokeWidth={1.5} />
            <text x={x} y={142} fontSize={11} textAnchor="middle" fill="#cbd5e1">{label}</text>
            {cell && <text x={x} y={156} fontSize={11} textAnchor="middle" fill={color} fontFamily="var(--font-jetbrains-mono), monospace">{val}</text>}
        </g>
    );
    return (
        <svg viewBox="0 0 520 220" className="w-full block max-w-[560px] mx-auto" role="img" aria-label="An LSTM cell">
            <defs><marker id="lstm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" /></marker></defs>
            <line x1={20} y1={40} x2={482} y2={40} stroke="#facc15" strokeWidth={2} markerEnd="url(#lstm-arrow)" />
            <text x={20} y={30} fontSize={12} fill="#facc15">c₋ {v(cell?.cPrev)}</text>
            <text x={500} y={30} fontSize={12} textAnchor="end" fill="#facc15">c {v(cell?.c)}</text>
            {[['×', 110], ['+', 230]].map(([op, x]) => <g key={x}><circle cx={x} cy={40} r={12} fill="#0f172a" stroke="#facc15" /><text x={x} y={45} fontSize={15} textAnchor="middle" fill="#facc15">{op}</text></g>)}
            <circle cx={230} cy={90} r={12} fill="#0f172a" stroke="#94a3b8" /><text x={230} y={95} fontSize={15} textAnchor="middle" fill="#cbd5e1">×</text>
            <line x1={230} y1={78} x2={230} y2={54} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <line x1={110} y1={128} x2={110} y2={54} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <line x1={200} y1={128} x2={222} y2={100} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <line x1={270} y1={128} x2={240} y2={100} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <rect x={330} y={74} width={60} height={30} rx={6} fill="#1e293b" stroke="#475569" />
            <text x={360} y={93} fontSize={11} textAnchor="middle" fill="#cbd5e1">tanh</text>
            <line x1={360} y1={40} x2={360} y2={72} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <circle cx={430} cy={89} r={12} fill="#0f172a" stroke="#94a3b8" /><text x={430} y={94} fontSize={15} textAnchor="middle" fill="#cbd5e1">×</text>
            <line x1={392} y1={89} x2={416} y2={89} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <line x1={430} y1={128} x2={430} y2={103} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <line x1={444} y1={89} x2={500} y2={89} stroke="#94a3b8" markerEnd="url(#lstm-arrow)" />
            <text x={500} y={80} fontSize={12} textAnchor="end" fill="#e2e8f0">h {v(cell?.h)}</text>
            {gate(110, 'σ  f', v(cell?.f), '#fb923c')}
            {gate(200, 'σ  i', v(cell?.i), '#34d399')}
            {gate(280, 'tanh  g', v(cell?.g), '#a78bfa')}
            {gate(430, 'σ  o', v(cell?.o), '#38bdf8')}
            <line x1={40} y1={200} x2={470} y2={200} stroke="#475569" />
            {[110, 200, 280, 430].map(x => <line key={x} x1={x} y1={200} x2={x} y2={164} stroke="#475569" markerEnd="url(#lstm-arrow)" />)}
            <text x={20} y={214} fontSize={11} fill="#94a3b8">[h₋, x] — every gate reads the old state and the new input</text>
        </svg>
    );
}

function GruDiagram({ gcell }) {
    const v = (x) => (gcell ? num(x) : '');
    return (
        <svg viewBox="0 0 520 200" className="w-full block max-w-[560px] mx-auto" role="img" aria-label="A GRU cell">
            <defs><marker id="gru-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" /></marker></defs>
            <line x1={20} y1={40} x2={482} y2={40} stroke="#22d3ee" strokeWidth={2} markerEnd="url(#gru-arrow)" />
            <text x={20} y={30} fontSize={12} fill="#22d3ee">h₋ {v(gcell?.hPrev)}</text>
            <text x={500} y={30} fontSize={12} textAnchor="end" fill="#22d3ee">h {v(gcell?.h)}</text>
            <circle cx={170} cy={40} r={12} fill="#0f172a" stroke="#22d3ee" /><text x={170} y={45} fontSize={15} textAnchor="middle" fill="#22d3ee">×</text>
            <circle cx={330} cy={40} r={12} fill="#0f172a" stroke="#22d3ee" /><text x={330} y={45} fontSize={15} textAnchor="middle" fill="#22d3ee">+</text>
            <circle cx={330} cy={95} r={12} fill="#0f172a" stroke="#94a3b8" /><text x={330} y={100} fontSize={15} textAnchor="middle" fill="#cbd5e1">×</text>
            <line x1={330} y1={83} x2={330} y2={54} stroke="#94a3b8" markerEnd="url(#gru-arrow)" />
            {[[170, 'σ  z', gcell?.z, '#fb923c'], [250, 'σ  r', gcell?.r, '#34d399'], [380, 'tanh  n', gcell?.n, '#a78bfa']].map(([x, label, val, color]) => (
                <g key={label}>
                    <rect x={x - 28} y={124} width={56} height={34} rx={6} fill="#1e293b" stroke={color} strokeWidth={1.5} />
                    <text x={x} y={138} fontSize={11} textAnchor="middle" fill="#cbd5e1">{label}</text>
                    {gcell && <text x={x} y={152} fontSize={11} textAnchor="middle" fill={color} fontFamily="var(--font-jetbrains-mono), monospace">{num(val)}</text>}
                </g>
            ))}
            <line x1={170} y1={124} x2={170} y2={54} stroke="#94a3b8" markerEnd="url(#gru-arrow)" />
            <text x={176} y={92} fontSize={11} fill="#94a3b8">z</text>
            <line x1={190} y1={124} x2={318} y2={102} stroke="#94a3b8" markerEnd="url(#gru-arrow)" />
            <text x={232} y={104} fontSize={11} fill="#94a3b8">1 − z</text>
            <line x1={370} y1={124} x2={342} y2={104} stroke="#94a3b8" markerEnd="url(#gru-arrow)" />
            <line x1={262} y1={124} x2={352} y2={136} stroke="#94a3b8" markerEnd="url(#gru-arrow)" />
            <text x={20} y={190} fontSize={11} fill="#94a3b8">[h₋, x] feeds z, r and n; r scales how much of h₋ the candidate n sees</text>
        </svg>
    );
}

/** Gate values over time: one row per unit, one column per step. */
function GateMaps({ run, gates, cursor, mark, highlightUnit }) {
    const T = run.steps.length;
    const labels = { f: 'forget f', i: 'input i', o: 'output o', z: 'update z', r: 'reset r', h: 'state h' };
    return (
        <div className="space-y-3 w-full">
            {gates.map(g => (
                <div key={g}>
                    <Caption>{labels[g]} <ShapeTag shape={[run.steps[0][g].length, T]} names={['unit', 'step']} />{highlightUnit !== undefined && <span className="text-slate-500">· memory unit {highlightUnit + 1}</span>}</Caption>
                    <Heatmap data={Array.from({ length: run.steps[0][g].length }, (_, k) => run.steps.map(s => s[g][k]))}
                        rowLabels={Array.from({ length: run.steps[0][g].length }, (_, k) => `${k + 1}`)}
                        colLabels={run.steps.map((_, t) => (t === mark ? '★' : (t + 1) % 5 === 0 ? `${t + 1}` : ''))}
                        scale={g === 'h' ? 'diverging' : 'sequential'} domain={g === 'h' ? [-1, 1] : [0, 1]} cellSize={18}
                        highlightCol={cursor} highlightRow={highlightUnit ?? null} ariaLabel={`${labels[g]} over time`} />
                </div>
            ))}
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    const { ex, outs } = step;
    switch (step.kind) {
        case 'task':
            return <div className="w-full"><Caption>The {T_TOUR} inputs (the flagged one in yellow)</Caption><ValueStrip ex={ex} /></div>;
        case 'rnnOut':
            return <div className="w-full space-y-2"><ValueStrip ex={ex} /><OutputChart ex={ex} outs={outs} show={step.show} /></div>;
        case 'leak':
            return (
                <div className="w-full">
                    <Caption>How far the {KIND_NAME[step.net]}&apos;s final answer moves per unit nudge of each input</Caption>
                    <SensBars sens={step.sens} marker={ex.marker} color={COLORS[step.net]} />
                </div>
            );
        case 'lstmCell': return <LstmDiagram />;
        case 'lstmStep':
            return (
                <div className="w-full space-y-3">
                    <ValueStrip ex={ex} cursor={step.t} />
                    <Caption>Memory unit {step.mk + 1} at step {step.t + 1}</Caption>
                    <LstmDiagram cell={step.cell} />
                </div>
            );
        case 'lstmGates': return <GateMaps run={step.run} gates={['f', 'i', 'o']} mark={ex.marker} highlightUnit={step.mk} />;
        case 'gruCell': return <GruDiagram />;
        case 'gruStep':
            return (
                <div className="w-full space-y-3">
                    <ValueStrip ex={ex} cursor={step.t} />
                    <Caption>GRU memory unit {step.gk + 1} at step {step.t + 1}</Caption>
                    <GruDiagram gcell={step.gcell} />
                </div>
            );
        case 'gruGates':
            return <div className="w-full space-y-3"><GateMaps run={step.run} gates={['z']} mark={ex.marker} highlightUnit={step.gk} /><OutputChart ex={ex} outs={outs} show={step.show} /></div>;
        case 'lengths':
            return (
                <div className="w-full max-w-lg mx-auto space-y-3">
                    <Caption>Within 0.1 of the flagged value at the last step, 300 test sequences per length</Caption>
                    {LENGTHS.map(T => (
                        <div key={T} className="grid grid-cols-[3.5rem_1fr] items-center gap-2 text-xs">
                            <span className="text-slate-400 font-mono">T = {T}</span>
                            <div className="space-y-0.5">
                                {['rnn', 'lstm', 'gru'].map(k => (
                                    <div key={k} className="flex items-center gap-2">
                                        <span className="h-2.5 rounded" style={{ width: `${step.study[k].within[T] * 80}%`, background: COLORS[k] }} />
                                        <span className="text-slate-300 font-mono">{pct(step.study[k].within[T])}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-3 justify-center text-xs text-slate-400">{['rnn', 'lstm', 'gru'].map(k => <span key={k} className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: COLORS[k] }} />{KIND_NAME[k]}</span>)}</div>
                    <p className="text-[11px] text-slate-500 text-center">Trained on lengths up to 60. Always answering 0 would score {pct(step.guess)}.</p>
                </div>
            );
        case 'decay': {
            const ks = [0, 100, 250, 500, 750, 1000];
            return (
                <div className="w-full max-w-md mx-auto">
                    <Caption>What a forget gate of {num(step.fbar, 4)} leaves of the cell after k steps</Caption>
                    <div className="flex items-end gap-2 h-40">
                        {ks.map(k => (
                            <div key={k} className="flex-1 flex flex-col items-center justify-end h-full">
                                <span className="text-[10px] text-slate-400 mb-1 font-mono">{num(step.fbar ** k)}</span>
                                <div className="w-full rounded-t bg-yellow-400" style={{ height: `${step.fbar ** k * 100}%` }} />
                                <span className="text-[10px] text-slate-500 mt-1">k={k}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        default: return null;
    }
}

/* ── explore ─────────────────────────────────────────────── */
function Explore({ file, info }) {
    const [kind, setKind] = useState('lstm');
    const [T, setT] = useState(60);
    const [marker, setMarker] = useState(0);
    const [value, setValue] = useState(-0.62);
    const [seed, setSeed] = useState(4);
    const [clamped, setClamped] = useState(false);
    // A long sequence is thousands of SVG cells; let the sliders move while the charts catch up.
    const dT = useDeferredValue(T);
    const dValue = useDeferredValue(value);
    const lstmClamp = useMemo(() => (clamped ? { f: 0.9 } : null), [clamped]);
    const clamp = kind === 'lstm' ? lstmClamp : null;
    const ex = useMemo(() => holdExample(createRng(seed), dT, { marker, value: dValue }), [seed, dT, marker, dValue]);
    const outs = useMemo(() => Object.fromEntries(['rnn', 'lstm', 'gru'].map(k => [k, runSequence(file.nets[k], ex.xs, {}, { clamp: k === 'lstm' ? lstmClamp : null }).steps.map(s => s.y[0])])), [file, ex, lstmClamp]);
    const run = useMemo(() => runSequence(file.nets[kind], ex.xs, {}, { clamp }), [file, kind, ex, clamp]);
    const sens = useMemo(() => sensitivity(file.nets[kind], ex, clamp), [file, kind, ex, clamp]);
    const broken = useMemo(() => (clamped ? holdAccuracy(file.nets.lstm, 30, { clamp: { f: 0.9 } }).within : null), [file, clamped]);
    const pinnedSens = useMemo(() => (lstmClamp ? sensitivity(file.nets.lstm, ex, lstmClamp)[ex.marker] : null), [file, ex, lstmClamp]);
    const final = outs[kind][dT - 1];
    const gates = kind === 'lstm' ? ['f', 'i'] : kind === 'gru' ? ['z'] : ['h'];
    const mem = kind === 'lstm' ? info.lstmMem.k : kind === 'gru' ? info.gruMem.k : undefined;
    return (
        <div className="space-y-4">
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented options={[['rnn', 'Plain RNN'], ['lstm', 'LSTM'], ['gru', 'GRU']]} value={kind} onChange={setKind} accent="yellow" ariaLabel="Network" />
                    <span className="text-xs text-slate-500">Flag at step</span>
                    <Segmented options={[[0, '1'], [1, '2'], [2, '3']]} value={marker} onChange={setMarker} accent="yellow" ariaLabel="Flagged step" />
                    <button onClick={() => setSeed(s => s + 1)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-yellow-500"><Shuffle className="h-3.5 w-3.5" />New noise</button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <ParamSlider label="Flagged value" value={value} onChange={setValue} min={-1} max={1} step={0.01} accent="yellow" format={(v) => num(v)} />
                    <ParamSlider label="Length T" value={T} onChange={setT} min={10} max={500} step={10} accent="yellow" format={(v) => `${v}`} hint="Trained on lengths up to 60" />
                </div>
                <ValueStrip ex={ex} />
                <OutputChart ex={ex} outs={outs} show={['rnn', 'gru', 'lstm'].filter(k => k !== kind).concat(kind)} />
                <p className="text-sm text-slate-300">
                    At step {dT} the {KIND_NAME[kind]}{kind === 'lstm' && clamped ? ' (forget gate pinned)' : ''} says <span className="font-mono text-white">{num(final)}</span> for <span className="font-mono text-white">{num(dValue)}</span>
                    {' '}— {Math.abs(final - dValue) < 0.1 ? <span className="text-green-300">within 0.1</span> : <span className="text-red-300">off by {num(Math.abs(final - dValue))}</span>}.
                </p>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
                <GateMaps run={run} gates={gates} mark={ex.marker} highlightUnit={mem} />
                <div>
                    <Caption>How far the final answer moves per unit nudge of each input</Caption>
                    <SensBars sens={sens} marker={ex.marker} color={COLORS[kind]} />
                    <p className="text-xs text-slate-400 mt-1">Flagged input: <span className="font-mono">{num(sens[ex.marker])}</span> · all the others together: <span className="font-mono">{num(leakOf(sens, ex.marker))}</span></p>
                </div>
            </div>
            <div className="bg-slate-900/70 rounded-xl border border-amber-500/25 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Lock className="h-4 w-4 text-amber-400" />Break it: pin the LSTM&apos;s forget gate at 0.9</h3>
                <p className="text-xs text-slate-400">Every forget gate held at 0.9, whatever the inputs say — a leaky cell.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setClamped(c => !c); setKind('lstm'); }} aria-pressed={clamped}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${clamped ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-amber-500'}`}>
                        <Lock className="h-3.5 w-3.5" />{clamped ? 'Forget gate pinned at 0.9' : 'Pin the forget gate'}
                    </button>
                    {clamped && <button onClick={() => setClamped(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white"><Wrench className="h-3.5 w-3.5" />Repair</button>}
                </div>
                {clamped && broken !== null && (
                    <BreakNote>
                        A cell that keeps 0.9 per step keeps 0.9^10 = {num(0.9 ** 10)} of its contents after 10 steps and 0.9^27 = {num(0.9 ** 27)} after 27. On this sequence, nudging the flagged number by 1 now moves the final answer by only {num(pinnedSens)}. Measured over 300 test sequences, the pinned LSTM is within 0.1 at length 30 {pct(broken)} of the time — about what always answering 0 scores ({pct(info.guess)}) — against {pct(studyOf(file, 'lstm').within[30])} with its own gates.
                    </BreakNote>
                )}
            </div>
        </div>
    );
}

/* ── page ────────────────────────────────────────────────── */
export default function LstmAndGruPage() {
    const loaded = useLoaded(() => loadRecurrentFile('hold.json'));
    const file = loaded.data;
    const [mode, setMode] = useState('guided');
    const [presetIndex, setPresetIndex] = useState(0);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });
    const info = useMemo(() => (file ? analyse(file) : null), [file]);
    const stepHistory = useMemo(() => (file && info ? generateSteps(file, info, presetIndex) : []), [file, info, presetIndex]);
    const play = useStepPlayback(stepHistory, 1700);
    const step = play.step;
    const predict = usePredict(stepHistory, play.current, predictFor, play.pause);
    const lstmStudy = file ? studyOf(file, 'lstm') : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/deep-learning-architectures" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Deep Learning Architectures
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">LSTM and GRU</h1>
                    <p className="text-yellow-50 max-w-3xl">
                        Gates are numbers between 0 and 1 that a network learns to set: how much to forget, how much to write. Watch trained networks hold one number while noise streams past — the plain RNN drifts, the gated ones hold, and their real gate values show how.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-white/70">Builds on</span>
                        <Link href="/deep-learning-architectures/recurrent-neural-networks" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white">Recurrent Neural Networks</Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ModeTabs modes={[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]]} mode={mode}
                            setMode={(m) => { setMode(m); play.pause(); }} accent="yellow" />
                        <SourceChip kind="toy">Trained for this site · 4 hidden units each</SourceChip>
                    </div>

                    {loaded.error ? (
                        <LoadError error={loaded.error} onRetry={loaded.retry} accent="yellow" what="The trained networks" />
                    ) : !file || !info ? (
                        <LoadingCard text="Loading the trained RNN, LSTM and GRU (10 KB)…" />
                    ) : mode === 'explore' ? (
                        <Explore file={file} info={info} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Flagged value:</span>
                                {PRESETS.map((pr, k) => (
                                    <button key={pr.label} onClick={() => { setPresetIndex(k); play.pause(); }} aria-pressed={presetIndex === k}
                                        className={`text-xs px-2.5 py-1 rounded-lg border ${presetIndex === k ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-slate-700 text-slate-400 hover:border-yellow-500'}`}>{pr.label}</button>
                                ))}
                            </div>
                            <TourPlayer acts={ACTS} steps={stepHistory} play={play} predict={predict} accent="yellow" minHeight="min-h-[340px]">
                                <VisualizationPanel step={step} />
                            </TourPlayer>
                            {predict.prompt && <PredictPrompt predict={predict} accent="yellow" />}
                            <ExplanationBox text={step?.explanation} predict={predict} accent="yellow" />
                            {step && <FormulaPanel><div className="overflow-x-auto"><Tex block>{formulaFor(step)}</Tex></div></FormulaPanel>}
                        </>
                    )}

                    <InCode title="LSTM and GRU in PyTorch" code={codeExample} />
                </div>

                <aside className="space-y-4">
                    <Card title="Three ways to carry state" icon={Cpu}>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><span className="text-slate-200">Plain RNN</span> — h = tanh(W h₋ + U x + b). Every input is added in.</li>
                            <li><span className="text-slate-200">LSTM</span> — a cell c with forget, input and output gates: c = f ⊙ c₋ + i ⊙ g.</li>
                            <li><span className="text-slate-200">GRU</span> — one update gate mixes old and new: h = (1 − z) ⊙ n + z ⊙ h₋.</li>
                        </ul>
                        {file && <p className="text-xs text-slate-500 mt-3">With 4 hidden units: {paramCount(file.nets.rnn)}, {paramCount(file.nets.lstm)} and {paramCount(file.nets.gru)} parameters.</p>}
                    </Card>

                    <Misconception claim="An LSTM remembers forever.">
                        {file && info && lstmStudy ? (
                            <>
                                <p>It remembers far longer than a plain RNN, but its forget gate is a dial, not a lock. This LSTM&apos;s memory cell keeps {num(info.lstmMem.stats.f.afterGeo, 4)} of itself per step after the flag, which compounds to {num(info.lstmMem.stats.f.afterGeo ** 500)} over 500 steps.</p>
                                <p>Measured over 300 sequences, within 0.1 of the flagged value: {pct(lstmStudy.within[160])} at length 160, {pct(lstmStudy.within[500])} at 500, {pct(lstmStudy.within[1000])} at 1000.</p>
                            </>
                        ) : <p>Measuring once the networks have loaded…</p>}
                    </Misconception>

                    <Card title="Check yourself">
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </Card>
                </aside>
            </div>
        </div>
    );
}
