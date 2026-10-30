"use client";

import React, { useEffect, useRef } from 'react';
import { AI_COLORS } from './colors';

const SIZE = 360;

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/**
 * A classifier's decision field over the plane, with the data on top.
 *
 *   <DecisionField predict={(x, y) => net.predict([x, y])[0]} points={points}
 *                  version={trainer.steps} onAddPoint={(x, y) => …} />
 *
 * `predict(x, y)` returns the probability of class 1 (binary) or an array of
 * class probabilities. `predictBatch(points)` may be given instead: it gets
 * every grid point at once as [[x, y], …] and returns one output per point,
 * which lets a network evaluate the whole grid in a single forward pass.
 * The field is evaluated on a coarse grid into a
 * <canvas> and smoothed by the browser, which is what keeps it fast enough
 * to repaint every frame while a network trains; `version` tells it when to
 * repaint. Points are SVG on top, so they stay crisp and clickable.
 * Colour strength is confidence: pale near the boundary, strong far from it.
 */
export default function DecisionField({
    predict, predictBatch, points = [], version = 0, xRange = [-1.2, 1.2], yRange = [-1.2, 1.2], resolution = 48,
    onAddPoint, highlight = null, ariaLabel = 'Decision boundary',
}) {
    const canvas = useRef(null);
    const [xa, xb] = xRange, [ya, yb] = yRange;
    const toPx = ([x, y]) => [Math.round(((x - xa) / (xb - xa)) * SIZE * 100) / 100, Math.round(((yb - y) / (yb - ya)) * SIZE * 100) / 100];

    useEffect(() => {
        const c = canvas.current;
        if (!c || (!predict && !predictBatch)) return;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(resolution, resolution);
        const cls = AI_COLORS.classes.map(hexRgb);
        const base = [15, 23, 42];
        const grid = [];
        for (let r = 0; r < resolution; r++) {
            for (let q = 0; q < resolution; q++) {
                grid.push([xa + ((q + 0.5) / resolution) * (xb - xa), yb - ((r + 0.5) / resolution) * (yb - ya)]);
            }
        }
        const outs = predictBatch ? predictBatch(grid) : grid.map(([x, y]) => predict(x, y));
        for (let r = 0; r < resolution; r++) {
            for (let q = 0; q < resolution; q++) {
                const out = outs[r * resolution + q];
                let colour, strength;
                if (Array.isArray(out) || ArrayBuffer.isView(out)) {
                    let best = 0;
                    for (let k = 1; k < out.length; k++) if (out[k] > out[best]) best = k;
                    colour = cls[best % cls.length];
                    strength = (out[best] - 1 / out.length) / (1 - 1 / out.length);
                } else {
                    colour = out >= 0.5 ? cls[1] : cls[0];
                    strength = Math.abs(out - 0.5) * 2;
                }
                const t = 0.12 + 0.5 * Math.min(1, Math.max(0, strength));
                const o = (r * resolution + q) * 4;
                img.data[o] = base[0] + (colour[0] - base[0]) * t;
                img.data[o + 1] = base[1] + (colour[1] - base[1]) * t;
                img.data[o + 2] = base[2] + (colour[2] - base[2]) * t;
                img.data[o + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }, [predict, predictBatch, version, resolution, xa, xb, ya, yb]);

    const onClick = (e) => {
        if (!onAddPoint) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = xa + ((e.clientX - rect.left) / rect.width) * (xb - xa);
        const y = yb - ((e.clientY - rect.top) / rect.height) * (yb - ya);
        onAddPoint(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, e);
    };

    return (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
            <canvas ref={canvas} width={resolution} height={resolution} className="absolute inset-0 w-full h-full" aria-hidden="true" />
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 w-full h-full" role="img" aria-label={ariaLabel}
                onClick={onClick} style={onAddPoint ? { cursor: 'crosshair' } : undefined}>
                <line x1={toPx([0, ya])[0]} x2={toPx([0, yb])[0]} y1="0" y2={SIZE} stroke="#334155" strokeWidth="1" />
                <line y1={toPx([xa, 0])[1]} y2={toPx([xb, 0])[1]} x1="0" x2={SIZE} stroke="#334155" strokeWidth="1" />
                {points.map((p, i) => {
                    const [cx, cy] = toPx([p.x, p.y]);
                    const hot = highlight === i;
                    return (
                        <circle key={i} cx={cx} cy={cy} r={hot ? 7 : 4.5}
                            fill={AI_COLORS.classes[p.label % AI_COLORS.classes.length]}
                            stroke={hot ? AI_COLORS.highlight : p.wrong ? '#f8fafc' : '#0f172a'} strokeWidth={hot || p.wrong ? 2 : 1.2} />
                    );
                })}
            </svg>
        </div>
    );
}
