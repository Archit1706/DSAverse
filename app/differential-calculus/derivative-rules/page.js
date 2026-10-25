"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Compass, MousePointer2,
    Code2, CheckCircle, XCircle, Superscript, Square, Link2,
} from 'lucide-react';
import Plane2D, { Point, Segment, FunctionPlot, Polygon, Label, usePlane, MATH_COLORS } from '@/components/math/Plane2D';
import ParamSlider from '@/components/math/ParamSlider';
import Tex, { texNum } from '@/components/math/Tex';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── the maths ─────────────────────────────────────────────
   Power rule: d/dx xⁿ = n xⁿ⁻¹.
   Product rule, on u(x) = x and v(x) = 1 + x²/4: the rectangle u × v grows
   by v·Δu + u·Δv + Δu·Δv, and the last piece vanishes faster than Δx.
   Chain rule, on y = f(g(x)) with g(x) = x² and f(u) = sin u. */
const power = (n, x) => x ** n;
const powerSlope = (n, x) => n * x ** (n - 1);

const u = (x) => x;
const du = () => 1;
const v = (x) => 1 + x * x / 4;
const dv = (x) => x / 2;
const productSlope = (x) => du(x) * v(x) + u(x) * dv(x);
/** The three new pieces of the rectangle when x grows by Δx. */
const productPieces = (x, dx) => {
    const dU = u(x + dx) - u(x), dV = v(x + dx) - v(x);
    return { U: u(x), V: v(x), dU, dV, vdu: v(x) * dU, udv: u(x) * dV, corner: dU * dV, total: u(x + dx) * v(x + dx) - u(x) * v(x) };
};

const g = (x) => x * x;
const dg = (x) => 2 * x;
const fOuter = Math.sin;
const dfOuter = Math.cos;
const chainSlope = (x) => dfOuter(g(x)) * dg(x);
/** How an interval [x, x + Δx] is carried through g and then f. */
const chainImages = (x, dx) => {
    const u0 = g(x), u1 = g(x + dx), y0 = fOuter(u0), y1 = fOuter(u1);
    return { u0, u1, y0, y1, du: u1 - u0, dy: y1 - y0, stretchG: (u1 - u0) / dx, stretchF: (y1 - y0) / (u1 - u0) };
};

const num = (x, d = 3) => {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
};
const fmt = (x) => texNum(x, 3);
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '.': '·' };
const powText = (n) => (n === 0.5 ? '√x' : n === 1 ? 'x' : `x${String(n).split('').map(ch => SUP[ch] ?? ch).join('')}`);

/* The opening shows x² at x = 1 with its slope labelled, so the first
   question starts somewhere else. */
const POWER_TOUR = [
    { n: 2, x0: 1.5 }, { n: 3, x0: 0.8 }, { n: 3, x0: 1.2 }, { n: 4, x0: 0.8 }, { n: 0.5, x0: 1 }, { n: -1, x0: 0.5 },
];
const PRODUCT_DX = [0.5, 0.25, 0.1, 0.01];
const CHAIN_TOUR = [1, 1.5, 0.5];

/* ── guided tour ───────────────────────────────────────── */

const generateSteps = () => {
    const steps = [];
    let q = 0;   // running index of the steps a prompt can precede
    const push = (s) => steps.push({ n: 2, x0: 1, dx: null, ...s, ...(['power', 'productResult', 'chainResult'].includes(s.kind) ? { q: q++ } : {}) });
    push({
        kind: 'opening', rule: 'power', n: 2, x0: 1,
        explanation: 'Three rules turn almost any derivative into arithmetic. First the power rule: the slope of xⁿ at x is n·xⁿ⁻¹. The green line is the tangent to x² at x = 1.',
    });
    POWER_TOUR.forEach((t, k) => {
        const s = powerSlope(t.n, t.x0);
        push({
            kind: 'power', rule: 'power', n: t.n, x0: t.x0, k,
            explanation: `${powText(t.n)} at x = ${num(t.x0)}: the slope is n·xⁿ⁻¹ = ${num(t.n)}·(${num(t.x0)})^${num(t.n - 1)} = ${num(s)}.${t.n === 0.5 ? ' √x is x to the power ½, so the rule still applies: ½·x^(−½).' : ''}${t.n === -1 ? ' 1/x is x⁻¹: the slope is −1/x², negative because the curve falls.' : ''}`,
        });
    });
    push({
        kind: 'productIntro', rule: 'product', x0: 1, dx: 0.5,
        explanation: 'The product rule. Picture u·v as the area of a rectangle with width u = x and height v = 1 + x²/4. Nudge x by Δx: the rectangle grows by a green strip v·Δu, a red strip u·Δv, and a small pink corner Δu·Δv.',
    });
    PRODUCT_DX.forEach((dx, k) => {
        const p = productPieces(1, dx);
        push({
            kind: 'productShrink', rule: 'product', x0: 1, dx, k,
            explanation: `Δx = ${num(dx)}: the strips are v·Δu = ${num(p.vdu, 4)} and u·Δv = ${num(p.udv, 4)}; the corner is ${num(p.corner, 5)}. Per unit of Δx the corner is ${num(p.corner / dx, 4)} — it is vanishing, while the strips per Δx settle on v·u′ = ${num(v(1))} and u·v′ = ${num(dv(1))}.`,
        });
    });
    [1, 2].forEach((x0, j) => {
        push({
            kind: 'productResult', rule: 'product', x0, dx: 0.01, j,
            explanation: `At x = ${num(x0)}: u = ${num(u(x0))}, v = ${num(v(x0))}, u′ = 1 and v′ = x/2 = ${num(dv(x0))}. So (uv)′ = u′v + uv′ = 1·${num(v(x0))} + ${num(u(x0))}·${num(dv(x0))} = ${num(productSlope(x0))}. Not u′·v′ = ${num(dv(x0))}: the strips, not the corner, carry the change.`,
        });
    });
    push({
        kind: 'chainIntro', rule: 'chain', x0: 1, dx: 0.2,
        explanation: 'The chain rule. y = sin(x²) is two machines in a row: g squares x, then f takes the sine. Follow a small interval of x through both. g stretches it, then f stretches (or flips) what comes out.',
    });
    CHAIN_TOUR.forEach((x0, k) => {
        const c = chainImages(x0, 0.01);
        push({
            kind: 'chainResult', rule: 'chain', x0, dx: 0.05, k,
            explanation: `At x = ${num(x0)}: g′(x) = 2x = ${num(dg(x0))}, so intervals are stretched ×${num(dg(x0))}. They land near u = ${num(g(x0))}, where f′(u) = cos u = ${num(dfOuter(g(x0)))}. Rates multiply: dy/dx = ${num(dfOuter(g(x0)))} × ${num(dg(x0))} = ${num(chainSlope(x0))}${chainSlope(x0) < 0 ? ' — negative, because f flips the interval over.' : '.'} (Measured with Δx = 0.01: ${num(c.dy / 0.01)}.)`,
        });
    });
    push({
        kind: 'closing', rule: 'chain', x0: 1.2, dx: 0.1,
        explanation: 'Power: n·xⁿ⁻¹. Product: u′v + uv′ — two strips. Chain: f′(g(x))·g′(x) — stretch factors multiply, with f′ measured where g has landed. Switch to Explore to try your own x and Δx.',
    });
    return steps;
};
const STEPS = generateSteps();

/* ── predict ───────────────────────────────────────────────
   Asked before each result appears. The distractors are the classic slips:
   forgetting the factor n, not lowering the power; multiplying u′·v′; adding
   the chain rule's rates, or evaluating f′ at x instead of at g(x). */
const pickWrong = (correct, candidates) => {
    const seen = new Set([num(correct)]);
    const wrong = [];
    for (const c of [...candidates, correct + 1, correct - 1, correct * 2, correct + 0.5]) {
        if (wrong.length === 3) break;
        if (!Number.isFinite(c) || seen.has(num(c))) continue;
        seen.add(num(c));
        wrong.push(c);
    }
    return wrong;
};
const place = (correct, wrong, slot) => {
    const ordered = [...wrong];
    ordered.splice(slot, 0, correct);
    return { options: ordered.map(x => num(x)), correct: slot };
};

const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (next.kind === 'power') {
        const { n, x0 } = next;
        const correct = powerSlope(n, x0);
        const wrong = pickWrong(correct, [x0 ** (n - 1), n * x0 ** n, (n - 1) * x0 ** n, x0 ** n]);
        return {
            question: `What is the slope of ${powText(n)} at x = ${num(x0)}?`,
            ...place(correct, wrong, (next.q * 3 + 1) % 4),
            because: `n·xⁿ⁻¹ with n = ${num(n)}: ${num(n)}·(${num(x0)})^${num(n - 1)} = ${num(correct)}. Bring the power down as a factor, then lower it by one.`,
        };
    }
    if (next.kind === 'productResult') {
        const x0 = next.x0;
        const correct = productSlope(x0);
        const wrong = pickWrong(correct, [du(x0) * dv(x0), du(x0) * v(x0), u(x0) * dv(x0), u(x0) * v(x0)]);
        return {
            question: `At x = ${num(x0)}, u = ${num(u(x0))} and v = ${num(v(x0))}, with u′ = 1 and v′ = ${num(dv(x0))}. What is (uv)′?`,
            ...place(correct, wrong, (next.q * 3 + 1) % 4),
            because: `The two strips: u′v + uv′ = 1·${num(v(x0))} + ${num(u(x0))}·${num(dv(x0))} = ${num(correct)}. The corner u′v′ is the piece that vanishes.`,
        };
    }
    if (next.kind === 'chainResult') {
        const x0 = next.x0;
        const correct = chainSlope(x0);
        const wrong = pickWrong(correct, [dfOuter(x0) * dg(x0), dfOuter(g(x0)) + dg(x0), dg(x0), dfOuter(g(x0))]);
        return {
            question: `At x = ${num(x0)}, g′(x) = ${num(dg(x0))} and g(x) = ${num(g(x0))}. What is dy/dx for y = sin(x²)?`,
            ...place(correct, wrong, (next.q * 3 + 1) % 4),
            because: `f′ is taken where g lands: cos(${num(g(x0))}) = ${num(dfOuter(g(x0)))}. Then multiply by g′: ${num(dfOuter(g(x0)))} × ${num(dg(x0))} = ${num(correct)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'What is the derivative of x⁵?',
        options: ['x⁴', '5x⁴', '5x⁵', '4x⁵'],
        correct: 1,
        explanation: 'Power rule: bring the 5 down as a factor and lower the power by one, giving 5x⁴. At x = 1 the slope is 5; at x = 2 it is 5·16 = 80.',
    },
    {
        question: 'Why is (uv)′ not simply u′·v′?',
        options: [
            'It is — the product rule is just u′·v′',
            'When both sides grow, the area gains two strips (v·Δu and u·Δv); u′·v′ is only the tiny corner, which vanishes',
            'Because u and v must be equal',
            'Because derivatives cannot be multiplied',
        ],
        correct: 1,
        explanation: 'The rectangle u × v grows by v·Δu + u·Δv + Δu·Δv. Divided by Δx, the strips become vu′ and uv′, while the corner Δu·Δv/Δx goes to 0 — it is the product of two small things.',
    },
    {
        question: 'For y = sin(x²), which expression is dy/dx?',
        options: ['cos(x²)', 'cos(2x)', '2x·cos(x²)', '2x·cos x'],
        correct: 2,
        explanation: 'The inner function x² stretches by g′ = 2x; the outer sine scales by its own slope, cos, evaluated where the inner function landed: cos(x²). Multiply: 2x·cos(x²).',
    },
];

const codeExample = `import numpy as np

def deriv(f, x, h=1e-6):
    """Central difference: an independent check on every rule."""
    return (f(x + h) - f(x - h)) / (2 * h)

# Power rule: d/dx x^3 = 3x^2
print(deriv(lambda x: x**3, 1.2), 3 * 1.2**2)          # 4.32  4.32

# Product rule: (uv)' = u'v + uv'
u = lambda x: x
v = lambda x: 1 + x**2 / 4
x = 2.0
print(deriv(lambda t: u(t) * v(t), x),
      deriv(u, x) * v(x) + u(x) * deriv(v, x))          # 4.0  4.0

# Chain rule: (f(g(x)))' = f'(g(x)) * g'(x)
g = lambda x: x**2
print(deriv(lambda t: np.sin(g(t)), 1.5),
      np.cos(g(1.5)) * 2 * 1.5)                          # -1.885  -1.885`;

/* ── page ──────────────────────────────────────────────── */

const RULES = [
    { id: 'power', label: 'Power rule', icon: Superscript },
    { id: 'product', label: 'Product rule', icon: Square },
    { id: 'chain', label: 'Chain rule', icon: Link2 },
];
const POWERS = [1, 2, 3, 4, 0.5, -1];

/* The power plot squeezes y by half so x⁴ fits beside x²; its tick labels
   show the real values. */
const PY = 0.5;
const POW_X = [-0.3, 2.3];
const POW_Y = [-0.6 * PY, 4.6 * PY];
const powerXMax = (n) => (n > 0 ? Math.min(2.2, 4.4 ** (1 / n)) : 2.2);
const powerXMin = (n) => (n > 0 ? 0.05 : 0.25);

function PowerTicks() {
    const { toScreen } = usePlane();
    const out = [];
    for (let x = 0; x <= 2; x++) {
        const [sx, sy] = toScreen([x, 0]);
        out.push(<line key={`gx${x}`} x1={sx} y1={0} x2={sx} y2={toScreen([0, POW_Y[0]])[1]} stroke={MATH_COLORS.grid} />);
        if (x) out.push(<text key={`tx${x}`} x={sx} y={sy + 14} fontSize={11} textAnchor="middle" fill={MATH_COLORS.text}>{x}</text>);
    }
    for (let y = 1; y <= 4; y++) {
        const [sx, sy] = toScreen([0, y * PY]);
        out.push(<line key={`gy${y}`} x1={0} y1={sy} x2={toScreen([POW_X[1], 0])[0]} y2={sy} stroke={MATH_COLORS.grid} />);
        out.push(<text key={`ty${y}`} x={sx - 6} y={sy + 4} fontSize={11} textAnchor="end" fill={MATH_COLORS.text}>{y}</text>);
    }
    return <g>{out}</g>;
}

function PowerPicture({ n, x0, onDrag }) {
    const y0 = power(n, x0);
    const m = powerSlope(n, x0);
    const line = (x) => [x, PY * (y0 + m * (x - x0))];
    return (
        <Plane2D xRange={POW_X} yRange={POW_Y} grid={0} tickLabels={false} ariaLabel={`Graph of ${powText(n)} with its tangent at x = ${num(x0)}`}>
            <PowerTicks />
            <FunctionPlot f={(x) => PY * power(n, x)} domain={[n > 0 ? 0 : 0.05, POW_X[1]]} color={MATH_COLORS.curve} />
            <Segment from={line(POW_X[0])} to={line(POW_X[1])} color={MATH_COLORS.i} width={2.5} />
            <Segment from={[x0, 0]} to={[x0, PY * y0]} color={MATH_COLORS.a} width={1.5} dashed opacity={0.6} />
            <Point at={[x0, PY * y0]} color={MATH_COLORS.i} r={6} label={`slope ${num(m)}`} onDrag={onDrag} snap={0.01}
                constrain={([x]) => { const c = Math.min(Math.max(x, powerXMin(n)), powerXMax(n)); return [c, PY * power(n, c)]; }}
                ariaLabel={`Point on ${powText(n)} at x = ${num(x0)}; drag along the curve`} />
            <Label at={[POW_X[0] + 0.08, POW_Y[1] - 0.12]} color={MATH_COLORS.curve} size={13} weight={700}>{`y = ${powText(n)}`}</Label>
        </Plane2D>
    );
}

const PROD_RANGE = [-0.4, 3.6];

function ProductPicture({ x0, dx, onDragBase, onDragOuter }) {
    const p = productPieces(x0, dx);
    const { U, V, dU, dV } = p;
    const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    const pathPt = (x) => [u(x), v(x)];
    return (
        <Plane2D xRange={PROD_RANGE} yRange={PROD_RANGE} ariaLabel={`Rectangle u by v at x = ${num(x0)} growing by Δx = ${num(dx)}`}>
            <FunctionPlot f={(t) => v(t)} domain={[0, 3.3]} color="#475569" width={1.5} dashed />
            <Polygon points={rect(0, 0, U, V)} fill={MATH_COLORS.area} fillOpacity={0.22} />
            <Polygon points={rect(U, 0, U + dU, V)} fill={MATH_COLORS.i} fillOpacity={0.45} />
            <Polygon points={rect(0, V, U, V + dV)} fill={MATH_COLORS.j} fillOpacity={0.45} />
            <Polygon points={rect(U, V, U + dU, V + dV)} fill={MATH_COLORS.result} fillOpacity={0.7} />
            <Label at={[U / 2, V / 2]} anchor="middle" color={MATH_COLORS.area} size={15} weight={700}>u·v</Label>
            {dU > 0.12 && <Label at={[U + dU / 2, V / 2]} anchor="middle" color={MATH_COLORS.i} size={12} weight={700}>v·Δu</Label>}
            {dV > 0.1 && <Label at={[U / 2, V + dV / 2]} anchor="middle" dy={4} color={MATH_COLORS.j} size={12} weight={700}>u·Δv</Label>}
            <Label at={[U / 2, 0]} anchor="middle" dy={16} color={MATH_COLORS.text} size={12}>{`u = ${num(U, 2)}`}</Label>
            <Label at={[0, V / 2]} anchor="end" dx={-6} color={MATH_COLORS.text} size={12}>{`v = ${num(V, 2)}`}</Label>
            <Point at={pathPt(x0)} color={MATH_COLORS.area} r={6} onDrag={onDragBase} snap={0.01}
                constrain={([x]) => { const c = Math.min(Math.max(x, 0.3), 2.4); return pathPt(c); }}
                ariaLabel={`Corner of the u by v rectangle, x = ${num(x0)}; drag to change x`} />
            <Point at={pathPt(x0 + dx)} color={MATH_COLORS.result} r={5} onDrag={onDragOuter} snap={0.01}
                constrain={([x]) => { const c = Math.min(Math.max(x, x0 + 0.01), x0 + 0.6); return pathPt(c); }}
                ariaLabel={`Corner of the grown rectangle, x + Δx = ${num(x0 + dx)}; drag to change Δx`} />
        </Plane2D>
    );
}

const LINE_Y = { x: 2.6, u: 1.45, y: 0.3 };
const CHAIN_X = [-1.6, 3.5];

function NumberLine({ y, label, color }) {
    const ticks = [];
    for (let t = -1; t <= 3; t++) {
        ticks.push(<Segment key={`t${t}`} from={[t, y - 0.06]} to={[t, y + 0.06]} color={MATH_COLORS.axis} width={1.5} />);
        ticks.push(<Label key={`l${t}`} at={[t, y]} anchor="middle" dy={20} size={11}>{String(t).replace('-', '−')}</Label>);
    }
    return (
        <g>
            <Segment from={[-1.25, y]} to={[CHAIN_X[1] - 0.05, y]} color={MATH_COLORS.axis} width={1.5} />
            {ticks}
            <Label at={[CHAIN_X[0] + 0.05, y]} dy={-9} color={color} size={14} weight={700}>{label}</Label>
        </g>
    );
}

function ChainPicture({ x0, dx, onDrag }) {
    const c = chainImages(x0, dx);
    const funnel = (a0, a1, ya, b0, b1, yb) => [[a0, ya], [a1, ya], [b1, yb], [b0, yb]];
    return (
        <Plane2D xRange={CHAIN_X} yRange={[-0.5, 3.1]} grid={0} axes={false} ariaLabel={`An interval of x near ${num(x0)} carried through u = x² and then y = sin u`}>
            <Polygon points={funnel(x0, x0 + dx, LINE_Y.x, c.u0, c.u1, LINE_Y.u)} fill={MATH_COLORS.i} fillOpacity={0.18} strokeWidth={0} />
            <Polygon points={funnel(c.u0, c.u1, LINE_Y.u, c.y0, c.y1, LINE_Y.y)} fill={MATH_COLORS.k} fillOpacity={0.18} strokeWidth={0} />
            <NumberLine y={LINE_Y.x} label="x" color={MATH_COLORS.a} />
            <NumberLine y={LINE_Y.u} label="u = x²" color={MATH_COLORS.i} />
            <NumberLine y={LINE_Y.y} label="y = sin u" color={MATH_COLORS.k} />
            <Segment from={[x0, LINE_Y.x]} to={[x0 + dx, LINE_Y.x]} color={MATH_COLORS.a} width={6} />
            <Segment from={[c.u0, LINE_Y.u]} to={[c.u1, LINE_Y.u]} color={MATH_COLORS.i} width={6} />
            <Segment from={[c.y0, LINE_Y.y]} to={[c.y1, LINE_Y.y]} color={MATH_COLORS.k} width={6} />
            <Label at={[(x0 + x0 + dx) / 2, LINE_Y.x]} anchor="middle" dy={-12} color={MATH_COLORS.a} size={12} weight={600}>{`Δx = ${num(dx)}`}</Label>
            <Label at={[(c.u0 + c.u1) / 2, LINE_Y.u]} anchor="middle" dy={-12} color={MATH_COLORS.i} size={12} weight={600}>{`Δu = ${num(c.du)}  (×${num(c.stretchG, 2)})`}</Label>
            <Label at={[(c.y0 + c.y1) / 2, LINE_Y.y]} anchor="middle" dy={-12} color={MATH_COLORS.k} size={12} weight={600}>{`Δy = ${num(c.dy)}  (×${num(c.stretchF, 2)})`}</Label>
            <Point at={[x0, LINE_Y.x]} color={MATH_COLORS.a} r={6} onDrag={onDrag} snap={0.01}
                constrain={([x]) => [Math.min(Math.max(x, 0.2), 1.6), LINE_Y.x]}
                ariaLabel={`Start of the x interval at ${num(x0)}; drag along the line`} />
        </Plane2D>
    );
}

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
                    className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Retake</button>
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
                    let tone = 'border-slate-700 text-slate-300 hover:border-emerald-500';
                    if (quizState.answered) {
                        if (i === q.correct) tone = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) tone = 'border-red-500 bg-red-500/10 text-red-300';
                        else tone = 'border-slate-800 text-slate-500';
                    }
                    return (
                        <button key={opt} onClick={() => answer(i)} disabled={quizState.answered}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-start gap-2 ${tone}`}>
                            {quizState.answered && i === q.correct && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            {quizState.answered && i === quizState.selected && i !== q.correct && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            <span>{opt}</span>
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{q.explanation}</p>
                    <button onClick={next} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                        {quizState.current + 1 >= quizQuestions.length ? 'See score' : 'Next question'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function DerivativeRulesPage() {
    const [mode, setMode] = useState('guided');
    const [stepHistory] = useState(STEPS);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [rule, setRule] = useState('power');          // explore-mode state
    const [n, setN] = useState(3);
    const [x0, setX0] = useState(1);
    const [dx, setDx] = useState(0.25);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = stepHistory[currentStep];
    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    useEffect(() => {
        if (!isPlaying || mode !== 'guided') return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed, mode]);

    const guided = mode === 'guided';
    const R = guided ? step.rule : rule;
    const N = guided ? step.n : n;
    const X = guided ? step.x0 : x0;
    const DX = guided ? (step.dx ?? 0.25) : dx;

    /* Grabbing a handle during the tour switches to Explore, starting from
       whatever is on screen, so the picture never jumps. */
    const takeOver = () => {
        if (!guided) return;
        setRule(step.rule); setN(step.n); setX0(step.x0); setDx(step.dx ?? 0.25);
        setMode('explore'); setIsPlaying(false);
    };
    const chooseRule = (id) => {
        takeOver();
        setRule(id);
        if (id === 'power') setX0(v => Math.min(Math.max(v, powerXMin(n)), powerXMax(n)));
        if (id === 'product') { setX0(v => Math.min(Math.max(v, 0.3), 2.4)); setDx(d => Math.min(Math.max(d, 0.01), 0.6)); }
        if (id === 'chain') { setX0(v => Math.min(Math.max(v, 0.2), 1.6)); setDx(d => Math.min(Math.max(d, 0.01), 0.25)); }
    };

    const formula = useMemo(() => {
        if (R === 'power') {
            const nn = fmt(N);
            return String.raw`\frac{d}{dx}x^{${nn}} = ${nn}\,x^{${fmt(N - 1)}} \;\Rightarrow\; ${nn}\,(${fmt(X)})^{${fmt(N - 1)}} = ${fmt(powerSlope(N, X))}`;
        }
        if (R === 'product') {
            const p = productPieces(X, DX);
            return String.raw`\Delta(uv) = \textcolor{${MATH_COLORS.i}}{v\,\Delta u} + \textcolor{${MATH_COLORS.j}}{u\,\Delta v} + \textcolor{${MATH_COLORS.result}}{\Delta u\,\Delta v} = \textcolor{${MATH_COLORS.i}}{${fmt(p.vdu)}} + \textcolor{${MATH_COLORS.j}}{${fmt(p.udv)}} + \textcolor{${MATH_COLORS.result}}{${texNum(p.corner, 5)}} = ${texNum(p.total, 5)}`;
        }
        const c = chainImages(X, DX);
        return String.raw`\frac{\Delta y}{\Delta x} = \frac{\Delta y}{\Delta u}\cdot\frac{\Delta u}{\Delta x} = ${fmt(c.stretchF)} \times ${fmt(c.stretchG)} = ${fmt(c.dy / DX)}`;
    }, [R, N, X, DX]);
    const limitLine = useMemo(() => {
        if (R === 'power') return String.raw`\text{slope of } ${N === 0.5 ? String.raw`\sqrt{x}` : `x^{${fmt(N)}}`} \text{ at } x = ${fmt(X)} \text{ is } ${fmt(powerSlope(N, X))}`;
        if (R === 'product') return String.raw`(uv)' = u'v + uv' = (1)(${fmt(v(X))}) + (${fmt(u(X))})(${fmt(dv(X))}) = ${fmt(productSlope(X))}`;
        return String.raw`\frac{dy}{dx} = f'(g(x))\,g'(x) = \cos(${fmt(g(X))}) \cdot ${fmt(dg(X))} = ${fmt(chainSlope(X))}`;
    }, [R, N, X]);

    const exploreNote = (() => {
        if (R === 'power') return `The tangent to ${powText(N)} at x = ${num(X)} has slope ${num(powerSlope(N, X))} = ${num(N)}·${num(X)}^${num(N - 1)}. Drag the point, or pick another power.`;
        if (R === 'product') {
            const p = productPieces(X, DX);
            return `Of the ${num(p.total, 4)} the area grew, the corner is ${num(100 * p.corner / p.total, 1)}%. Shrink Δx and that share heads to 0 — leaving the strips, u′v + uv′.`;
        }
        const c = chainImages(X, DX);
        return `g stretches the x interval ×${num(c.stretchG, 2)}; f then scales it ×${num(c.stretchF, 2)}${c.stretchF < 0 ? ' and flips it' : ''}. Overall ×${num(c.dy / DX, 3)}, close to f′(g(x))·g′(x) = ${num(chainSlope(X))}.`;
    })();

    const tab = RULES.find(r => r.id === R);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/differential-calculus" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Differential Calculus
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Derivative Rules</h1>
                    <p className="text-emerald-50 max-w-3xl">
                        Three rules do almost all the work. Each one comes from a picture: a tangent, a growing rectangle, and an interval stretched twice.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Mode">
                                {[['guided', 'Guided tour', Compass], ['explore', 'Explore', MousePointer2]].map(([key, label, Icon]) => (
                                    <button key={key} role="tab" aria-selected={mode === key}
                                        onClick={() => { if (key === 'explore') takeOver(); else setMode('guided'); }}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${mode === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                            <div className="inline-flex flex-wrap rounded-lg border border-slate-700 p-0.5 bg-slate-900" role="tablist" aria-label="Rule">
                                {RULES.map(({ id, label, icon: Icon }) => (
                                    <button key={id} role="tab" aria-selected={R === id} onClick={() => chooseRule(id)}
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${R === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                        <Icon className="h-4 w-4" />{label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {R === 'power' && <PowerPicture n={N} x0={X} onDrag={([x]) => { takeOver(); setX0(x); }} />}
                        {R === 'product' && <ProductPicture x0={X} dx={DX}
                            onDragBase={([x]) => { takeOver(); setX0(x); }}
                            onDragOuter={([x]) => { takeOver(); setDx(Math.max(0.01, +(x - X).toFixed(3))); }} />}
                        {R === 'chain' && <ChainPicture x0={X} dx={DX} onDrag={([x]) => { takeOver(); setX0(x); }} />}

                        {guided ? (
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} aria-label="Reset"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={isPlaying || currentStep === 0} aria-label="Step back"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipBack className="h-4 w-4" /></button>
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(s + 1, stepHistory.length - 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1} aria-label="Step forward"
                                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"><SkipForward className="h-4 w-4" /></button>
                                <PredictToggle predict={predict} accent="emerald" />
                                <span className="text-xs text-slate-500">{tab.label} · step {currentStep + 1} of {stepHistory.length}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                    Speed
                                    <input type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-28 accent-emerald-500" />
                                </label>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {R === 'power' && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {POWERS.map(p => (
                                            <button key={p} onClick={() => { setN(p); setX0(v => Math.min(Math.max(v, powerXMin(p)), powerXMax(p))); }}
                                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${p === n ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500'}`}>
                                                {p === -1 ? '1/x' : powText(p)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {R === 'power' && <ParamSlider label="x" value={x0} onChange={setX0} min={powerXMin(n)} max={powerXMax(n)} step={0.01} accent="emerald" format={num} />}
                                    {R === 'product' && (
                                        <>
                                            <ParamSlider label="x (so u = x, v = 1 + x²/4)" value={x0} onChange={setX0} min={0.3} max={2.4} step={0.01} accent="emerald" format={num} />
                                            <ParamSlider label="Δx" value={dx} onChange={setDx} min={0.01} max={0.6} step={0.01} accent="emerald" format={num} />
                                        </>
                                    )}
                                    {R === 'chain' && (
                                        <>
                                            <ParamSlider label="x" value={x0} onChange={setX0} min={0.2} max={1.6} step={0.01} accent="emerald" format={num} />
                                            <ParamSlider label="Δx" value={dx} onChange={setDx} min={0.01} max={0.25} step={0.01} accent="emerald" format={num} />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {guided && predict.prompt && <PredictPrompt predict={predict} accent="emerald" />}

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-200 text-sm leading-relaxed">
                                {guided ? (predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation) : exploreNote}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4 sm:p-6 space-y-3 text-slate-100 text-sm sm:text-base">
                        <Tex block>{formula}</Tex>
                        {!(guided && predict.hideExplanation) && <Tex block>{limitLine}</Tex>}
                        <p className="text-xs text-slate-500">
                            {R === 'power' && 'Bring the power down as a factor, then lower it by one. It works for fractional and negative powers too: √x = x^½ and 1/x = x⁻¹.'}
                            {R === 'product' && 'Divide the growth by Δx: the strips become v·u′ and u·v′, while the corner Δu·Δv/Δx shrinks to nothing.'}
                            {R === 'chain' && 'Each stage multiplies the interval\'s width by its own slope, and f′ is measured where g has landed — at u = g(x), not at x.'}
                        </p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">The three rules</h2>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li className={R === 'power' ? 'text-slate-200' : ''}><span className="text-emerald-300 font-semibold">Power</span> — (xⁿ)′ = n·xⁿ⁻¹.</li>
                            <li className={R === 'product' ? 'text-slate-200' : ''}><span className="text-emerald-300 font-semibold">Product</span> — (uv)′ = u′v + uv′: two strips, no corner.</li>
                            <li className={R === 'chain' ? 'text-slate-200' : ''}><span className="text-emerald-300 font-semibold">Chain</span> — (f(g(x)))′ = f′(g(x))·g′(x): rates multiply.</li>
                            <li><span className="text-slate-300 font-semibold">Sum</span> — (u + v)′ = u′ + v′, and constants come along: (c·u)′ = c·u′.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <h2 className="text-sm font-semibold text-white mb-3">Check yourself</h2>
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-5">
                        <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Code2 className="h-4 w-4 text-emerald-400" />{showCode ? 'Hide' : 'Show'} Python code
                        </button>
                        {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
