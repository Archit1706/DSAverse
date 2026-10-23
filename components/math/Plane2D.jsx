"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

/* ── palette ────────────────────────────────────────────────
   One set of meanings across every Math page, so a learner who has seen î in
   green once reads it the same way everywhere. Hex rather than Tailwind
   classes because these go straight into SVG attributes. */
export const MATH_COLORS = {
    i: '#4ade80',        // î / first basis vector / x-direction
    j: '#f87171',        // ĵ / second basis vector / y-direction
    k: '#60a5fa',        // k̂ / third basis vector
    a: '#fbbf24',        // a generic vector or input
    b: '#c084fc',        // a second generic vector
    result: '#f472b6',   // an output: Mv, a + b, a projection
    curve: '#38bdf8',    // f(x)
    curve2: '#fb923c',   // g(x), f′(x)
    area: '#facc15',     // shaded area / determinant
    negative: '#fb7185', // negative area / flipped orientation
    grid: '#1e293b',
    gridMajor: '#334155',
    axis: '#64748b',
    text: '#94a3b8',
};

const PlaneContext = createContext(null);

/** The transform for primitives drawn inside a <Plane2D>. */
export function usePlane() {
    const ctx = useContext(PlaneContext);
    if (!ctx) throw new Error('Plane2D primitives must be rendered inside <Plane2D>');
    return ctx;
}

/**
 * An SVG coordinate plane in world units.
 *
 *   <Plane2D xRange={[-4, 4]} yRange={[-4, 4]} ariaLabel="…">
 *       <Vector to={[2, 1]} color={MATH_COLORS.i} label="î" onDrag={setI} snap={0.5} />
 *   </Plane2D>
 *
 * It scales to its container (viewBox + width 100%), keeps one world unit the
 * same size on both axes, and gives children `toScreen` / `toWorld` through
 * `usePlane()`. Pointer dragging works with mouse, pen and touch.
 */
export default function Plane2D({
    xRange = [-5, 5],
    yRange = [-5, 5],
    width = 560,
    grid = 1,
    majorEvery = 0,
    axes = true,
    tickLabels = true,
    className = '',
    ariaLabel = 'Coordinate plane',
    children,
}) {
    const svgRef = useRef(null);
    const [x0, x1] = xRange;
    const [y0, y1] = yRange;
    const scale = width / (x1 - x0);          // screen units per world unit, both axes
    const height = (y1 - y0) * scale;

    const value = useMemo(() => {
        const toScreen = ([x, y]) => [(x - x0) * scale, (y1 - y) * scale];
        const toWorld = ([px, py]) => [x0 + px / scale, y1 - py / scale];
        const clientToWorld = (clientX, clientY) => {
            const svg = svgRef.current;
            if (!svg) return [0, 0];
            const pt = svg.createSVGPoint();
            pt.x = clientX; pt.y = clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return [0, 0];
            const p = pt.matrixTransform(ctm.inverse());
            return toWorld([p.x, p.y]);
        };
        return { toScreen, toWorld, clientToWorld, scale, xRange, yRange, width, height };
    }, [x0, x1, y0, y1, scale, width, height, xRange, yRange]);

    /* grid and ticks */
    const gridLines = [];
    if (grid > 0) {
        const first = (lo) => Math.ceil(lo / grid) * grid;
        for (let x = first(x0); x <= x1 + 1e-9; x += grid) {
            const major = majorEvery > 0 && Math.abs(Math.round(x / grid) % majorEvery) === 0;
            const [sx] = value.toScreen([x, 0]);
            gridLines.push(<line key={`gx${x}`} x1={sx} y1={0} x2={sx} y2={height}
                stroke={major ? MATH_COLORS.gridMajor : MATH_COLORS.grid} strokeWidth={1} />);
        }
        for (let y = first(y0); y <= y1 + 1e-9; y += grid) {
            const major = majorEvery > 0 && Math.abs(Math.round(y / grid) % majorEvery) === 0;
            const [, sy] = value.toScreen([0, y]);
            gridLines.push(<line key={`gy${y}`} x1={0} y1={sy} x2={width} y2={sy}
                stroke={major ? MATH_COLORS.gridMajor : MATH_COLORS.grid} strokeWidth={1} />);
        }
    }

    const ticks = [];
    if (axes && tickLabels) {
        const span = Math.max(x1 - x0, y1 - y0);
        const step = span > 24 ? 5 : span > 12 ? 2 : 1;
        const [ox, oy] = value.toScreen([0, 0]);
        const labelY = Math.min(Math.max(oy + 14, 12), height - 4);
        const labelX = Math.min(Math.max(ox - 6, 18), width - 4);
        for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
            if (x === 0) continue;
            const [sx] = value.toScreen([x, 0]);
            ticks.push(<text key={`tx${x}`} x={sx} y={labelY} fontSize={11} textAnchor="middle" fill={MATH_COLORS.text}>{x}</text>);
        }
        for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
            if (y === 0) continue;
            const [, sy] = value.toScreen([0, y]);
            ticks.push(<text key={`ty${y}`} x={labelX} y={sy + 4} fontSize={11} textAnchor="end" fill={MATH_COLORS.text}>{y}</text>);
        }
    }

    const [ox, oy] = value.toScreen([0, 0]);

    return (
        <PlaneContext.Provider value={value}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                role="img"
                aria-label={ariaLabel}
                className={`block select-none ${className}`}
                style={{ touchAction: 'none' }}
            >
                <rect x={0} y={0} width={width} height={height} fill="#020617" />
                {gridLines}
                {axes && (
                    <g>
                        {oy >= 0 && oy <= height && <line x1={0} y1={oy} x2={width} y2={oy} stroke={MATH_COLORS.axis} strokeWidth={1.5} />}
                        {ox >= 0 && ox <= width && <line x1={ox} y1={0} x2={ox} y2={height} stroke={MATH_COLORS.axis} strokeWidth={1.5} />}
                    </g>
                )}
                {ticks}
                {children}
            </svg>
        </PlaneContext.Provider>
    );
}

/* ── dragging ───────────────────────────────────────────── */

const roundTo = (v, step) => (step ? Math.round(v / step) * step : v);

/**
 * Pointer + keyboard dragging for a handle at a world position.
 * Arrow keys nudge by `snap` (or 0.1); Shift makes it ten times larger.
 */
function useDragHandle({ at, onDrag, snap = 0, clamp = true, constrain }) {
    const plane = usePlane();
    const dragging = useRef(false);

    const emit = useCallback((p) => {
        let [x, y] = p;
        if (clamp) {
            x = Math.min(Math.max(x, plane.xRange[0]), plane.xRange[1]);
            y = Math.min(Math.max(y, plane.yRange[0]), plane.yRange[1]);
        }
        x = roundTo(x, snap); y = roundTo(y, snap);
        const next = constrain ? constrain([x, y]) : [x, y];
        onDrag?.(next.map(v => (Object.is(v, -0) ? 0 : +v.toFixed(6))));
    }, [plane, snap, clamp, constrain, onDrag]);

    const handlers = {
        onPointerDown: (e) => {
            if (!onDrag) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragging.current = true;
        },
        onPointerMove: (e) => {
            if (!dragging.current) return;
            emit(plane.clientToWorld(e.clientX, e.clientY));
        },
        onPointerUp: (e) => {
            dragging.current = false;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        },
        onKeyDown: (e) => {
            if (!onDrag) return;
            const step = (snap || 0.1) * (e.shiftKey ? 10 : 1);
            const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
            if (!delta) return;
            e.preventDefault();
            emit([at[0] + delta[0], at[1] + delta[1]]);
        },
    };
    return handlers;
}

/** A draggable (or fixed) point. */
export function Point({ at, color = MATH_COLORS.a, r = 5, label, labelOffset = [8, -8], onDrag, snap, constrain, ariaLabel }) {
    const { toScreen } = usePlane();
    const [sx, sy] = toScreen(at);
    const handlers = useDragHandle({ at, onDrag, snap, constrain });
    const interactive = Boolean(onDrag);
    return (
        <g>
            <circle cx={sx} cy={sy} r={r} fill={color} stroke="#020617" strokeWidth={1.5} />
            {label && <text x={sx + labelOffset[0]} y={sy + labelOffset[1]} fontSize={13} fill={color} fontWeight={600}>{label}</text>}
            {interactive && (
                <circle cx={sx} cy={sy} r={Math.max(r * 2.6, 14)} fill="transparent"
                    style={{ cursor: 'grab' }} tabIndex={0} role="button"
                    aria-label={ariaLabel ?? `Drag point ${label ?? ''} at (${at[0]}, ${at[1]})`}
                    className="focus:outline-none" {...handlers}>
                </circle>
            )}
        </g>
    );
}

/** A line segment between two world points. */
export function Segment({ from, to, color = MATH_COLORS.axis, width = 2, dashed = false, opacity = 1 }) {
    const { toScreen } = usePlane();
    const [x1, y1] = toScreen(from);
    const [x2, y2] = toScreen(to);
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width}
        strokeDasharray={dashed ? '6 5' : undefined} opacity={opacity} strokeLinecap="round" />;
}

/**
 * An arrow from `from` to `to`. With `onDrag`, its tip is a handle.
 * The head is drawn as a polygon rather than an SVG marker, so any number of
 * coloured arrows can share one page without marker id collisions.
 */
export function Vector({ from = [0, 0], to, color = MATH_COLORS.a, width = 3, label, labelOffset, onDrag, snap, constrain, dashed = false, opacity = 1, ariaLabel }) {
    const { toScreen } = usePlane();
    const [x1, y1] = toScreen(from);
    const [x2, y2] = toScreen(to);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const handlers = useDragHandle({ at: to, onDrag, snap, constrain });
    if (len < 0.5) {
        return <circle cx={x1} cy={y1} r={3} fill={color} opacity={opacity} />;
    }
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const head = Math.min(12, len * 0.45);
    const bx = x2 - ux * head, by = y2 - uy * head;
    const nx = -uy * head * 0.45, ny = ux * head * 0.45;
    const off = labelOffset ?? [ux * 12 + (uy !== 0 ? 6 : 0), uy * 12 - 6];
    return (
        <g opacity={opacity}>
            <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width}
                strokeDasharray={dashed ? '6 5' : undefined} strokeLinecap="round" />
            <polygon points={`${x2},${y2} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`} fill={color} />
            {label && <text x={x2 + off[0]} y={y2 + off[1]} fontSize={14} fontWeight={700} fill={color}>{label}</text>}
            {onDrag && (
                <circle cx={x2} cy={y2} r={16} fill="transparent" style={{ cursor: 'grab' }}
                    tabIndex={0} role="button"
                    aria-label={ariaLabel ?? `Drag the tip of ${label ?? 'the vector'}, now at (${to[0]}, ${to[1]})`}
                    className="focus:outline-none" {...handlers} />
            )}
        </g>
    );
}

/** A filled polygon through world points. */
export function Polygon({ points, fill = MATH_COLORS.area, fillOpacity = 0.2, stroke, strokeWidth = 1.5 }) {
    const { toScreen } = usePlane();
    const d = points.map(p => toScreen(p).join(',')).join(' ');
    return <polygon points={d} fill={fill} fillOpacity={fillOpacity} stroke={stroke ?? fill} strokeWidth={strokeWidth} />;
}

/**
 * y = f(x) as a path. Non-finite values and jumps taller than the plane break
 * the path rather than drawing a vertical line across an asymptote.
 */
export function FunctionPlot({ f, domain, samples = 400, color = MATH_COLORS.curve, width = 2.5, dashed = false, opacity = 1 }) {
    const { toScreen, xRange, yRange } = usePlane();
    const [a, b] = domain ?? xRange;
    const span = yRange[1] - yRange[0];
    let d = '';
    let penDown = false;
    let prev = null;
    for (let i = 0; i <= samples; i++) {
        const x = a + ((b - a) * i) / samples;
        const y = f(x);
        if (!Number.isFinite(y)) { penDown = false; prev = null; continue; }
        // A jump taller than the whole plane is an asymptote, not a steep
        // stretch of curve: lift the pen and start again at this point.
        if (prev !== null && Math.abs(y - prev) > span) penDown = false;
        const clamped = Math.min(Math.max(y, yRange[0] - span), yRange[1] + span);
        const [sx, sy] = toScreen([x, clamped]);
        d += `${penDown ? 'L' : 'M'}${sx.toFixed(2)},${sy.toFixed(2)}`;
        penDown = true;
        prev = y;
    }
    return <path d={d} fill="none" stroke={color} strokeWidth={width} opacity={opacity}
        strokeDasharray={dashed ? '6 5' : undefined} strokeLinejoin="round" />;
}

/**
 * The region between y = f(x) and the baseline over [from, to]. Positive and
 * negative parts can take different colours, which is what "signed area" means.
 */
export function ShadeUnder({ f, from, to, baseline = 0, color = MATH_COLORS.area, negativeColor, opacity = 0.25, samples = 200 }) {
    const { toScreen } = usePlane();
    const pts = [];
    for (let i = 0; i <= samples; i++) {
        const x = from + ((to - from) * i) / samples;
        pts.push([x, f(x)]);
    }
    if (!negativeColor) {
        const poly = [[from, baseline], ...pts, [to, baseline]];
        return <polygon points={poly.map(p => toScreen(p).join(',')).join(' ')} fill={color} fillOpacity={opacity} stroke="none" />;
    }
    const above = [[from, baseline], ...pts.map(([x, y]) => [x, Math.max(y, baseline)]), [to, baseline]];
    const below = [[from, baseline], ...pts.map(([x, y]) => [x, Math.min(y, baseline)]), [to, baseline]];
    return (
        <g>
            <polygon points={above.map(p => toScreen(p).join(',')).join(' ')} fill={color} fillOpacity={opacity} stroke="none" />
            <polygon points={below.map(p => toScreen(p).join(',')).join(' ')} fill={negativeColor} fillOpacity={opacity} stroke="none" />
        </g>
    );
}

/** Text at a world position. */
export function Label({ at, children, color = MATH_COLORS.text, size = 13, anchor = 'start', dx = 0, dy = 0, weight = 500 }) {
    const { toScreen } = usePlane();
    const [sx, sy] = toScreen(at);
    return <text x={sx + dx} y={sy + dy} fontSize={size} fill={color} textAnchor={anchor} fontWeight={weight}>{children}</text>;
}

/**
 * The plane's grid carried through a map: lines x = c and y = c sent through
 * `map([x, y])`. With a linear map this is the "the whole grid moves" picture
 * of a matrix; with a non-linear one it shows a coordinate change.
 */
export function MappedGrid({ map, range = 6, step = 1, color = '#7c3aed', opacity = 0.55, width = 1.2, samples = 2 }) {
    const { toScreen } = usePlane();
    const lines = [];
    for (let c = -range; c <= range + 1e-9; c += step) {
        const vert = [], horiz = [];
        for (let i = 0; i <= samples; i++) {
            const t = -range + (2 * range * i) / samples;
            vert.push(toScreen(map([c, t])).join(','));
            horiz.push(toScreen(map([t, c])).join(','));
        }
        const axis = Math.abs(c) < 1e-9;
        lines.push(<polyline key={`v${c}`} points={vert.join(' ')} fill="none" stroke={color} strokeWidth={axis ? width * 2 : width} opacity={opacity} />);
        lines.push(<polyline key={`h${c}`} points={horiz.join(' ')} fill="none" stroke={color} strokeWidth={axis ? width * 2 : width} opacity={opacity} />);
    }
    return <g>{lines}</g>;
}
