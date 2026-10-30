"use client";

import React, { useMemo } from 'react';
import { AI_COLORS } from './colors';

const COL = 116, ROW = 62, BOX_W = 92, BOX_H = 50, MARGIN = 14;
const px = (v) => Math.round(v * 100) / 100;

/**
 * Lay a computation graph out left to right: inputs on the left, the output
 * on the right. An operation sits one column past its deepest input; a leaf
 * (input or parameter) sits just left of the first node that uses it, so a
 * bias appears beside the addition it feeds rather than far off at the
 * start. Rows come from the order a depth-first walk from the output meets
 * the leaves, an operation sits at the mean height of its inputs, and nodes
 * sharing a column are pushed at least one row apart.
 */
export function layoutGraph(nodes, edges) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const inputs = new Map(nodes.map(n => [n.id, []]));
    const users = new Map(nodes.map(n => [n.id, []]));
    for (const e of edges) { inputs.get(e.to).push(e.from); users.get(e.from).push(e.to); }

    const level = new Map();
    const levelOf = (id) => {
        if (level.has(id)) return level.get(id);
        const ins = inputs.get(id);
        const l = ins.length === 0 ? 0 : 1 + Math.max(...ins.map(levelOf));
        level.set(id, l);
        return l;
    };
    nodes.forEach(n => levelOf(n.id));
    for (const n of nodes) {
        if (inputs.get(n.id).length === 0 && users.get(n.id).length > 0) {
            level.set(n.id, Math.min(...users.get(n.id).map(u => level.get(u))) - 1);
        }
    }

    const root = nodes.find(n => users.get(n.id).length === 0) ?? nodes[nodes.length - 1];
    const row = new Map();
    let leafRow = 0;
    const place = (id) => {
        if (row.has(id)) return row.get(id);
        const ins = inputs.get(id);
        if (ins.length === 0) { row.set(id, leafRow++); return row.get(id); }
        row.set(id, NaN);   // guard against revisiting while the inputs are placed
        const r = ins.reduce((s, c) => s + place(c), 0) / ins.length;
        row.set(id, r);
        return r;
    };
    place(root.id);
    nodes.forEach(n => { if (!row.has(n.id) || Number.isNaN(row.get(n.id))) place(n.id); });

    const columns = new Map();
    for (const n of nodes) {
        const l = level.get(n.id);
        if (!columns.has(l)) columns.set(l, []);
        columns.get(l).push(n.id);
    }
    for (const ids of columns.values()) {
        ids.sort((a, b) => row.get(a) - row.get(b));
        for (let i = 1; i < ids.length; i++) {
            if (row.get(ids[i]) < row.get(ids[i - 1]) + 1) row.set(ids[i], row.get(ids[i - 1]) + 1);
        }
    }

    const minRow = Math.min(...row.values());
    const pos = new Map();
    for (const n of nodes) {
        pos.set(n.id, {
            x: px(MARGIN + BOX_W / 2 + level.get(n.id) * COL),
            y: px(MARGIN + BOX_H / 2 + (row.get(n.id) - minRow) * ROW),
        });
    }
    const maxLevel = Math.max(...level.values());
    const maxRow = Math.max(...[...row.values()].map(r => r - minRow));
    return {
        pos,
        width: px(2 * MARGIN + BOX_W + maxLevel * COL),
        height: px(2 * MARGIN + BOX_H + maxRow * ROW),
        byId,
    };
}

const fmt = (v, d = 4) => {
    if (v === undefined || v === null) return '';
    const r = Number(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace('-', '−');
};

/**
 * A computation graph from lib/ml/autograd.js, drawn with each node's value
 * and, once known, its gradient.
 *
 *   const g = graphOf(loss);
 *   <ComputeGraph nodes={g.nodes} edges={g.edges} data={{ [id]: 0.7 }} grad={{ [id]: -0.65 }}
 *                 activeEdge={{ from: childId, to: parentId }} params={new Set([w1.id])} />
 *
 * `data` and `grad` are maps from node id to the number to print; a node
 * missing from `data` is drawn empty (not computed yet), and one missing
 * from `grad` shows no gradient line. `activeEdge` lights the edge a
 * backward step is crossing, in the gradient direction. Parameters (the
 * things training will change) get an amber outline.
 */
export default function ComputeGraph({ nodes, edges, data = {}, grad = {}, activeEdge, activeNodes, params, minWidth = 640, ariaLabel = 'Computation graph' }) {
    const layout = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);
    const { pos, width, height } = layout;
    const hot = activeNodes ? new Set(activeNodes) : new Set();
    if (activeEdge) { hot.add(activeEdge.from); hot.add(activeEdge.to); }

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={ariaLabel}
                style={{ minWidth }} className="block">
                <defs>
                    <marker id="cg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L8,4 L0,8 z" fill={AI_COLORS.highlight} />
                    </marker>
                </defs>
                {edges.map(e => {
                    const a = pos.get(e.from), b = pos.get(e.to);
                    const x1 = a.x + BOX_W / 2, x2 = b.x - BOX_W / 2;
                    const mid = (x1 + x2) / 2;
                    const on = activeEdge && activeEdge.from === e.from && activeEdge.to === e.to;
                    const d = `M${px(x1)},${a.y} C${px(mid)},${a.y} ${px(mid)},${b.y} ${px(x2)},${b.y}`;
                    return (
                        <g key={`${e.from}-${e.to}`}>
                            <path d={d} fill="none" stroke={on ? AI_COLORS.highlight : '#475569'} strokeWidth={on ? 2.5 : 1.4} />
                            {on && (
                                /* The gradient travels output → input, against the arrow of the computation. */
                                <path d={`M${px(x2)},${b.y} C${px(mid)},${b.y} ${px(mid)},${a.y} ${px(x1 + 4)},${a.y}`} fill="none"
                                    stroke={AI_COLORS.highlight} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#cg-arrow)" />
                            )}
                        </g>
                    );
                })}
                {nodes.map(n => {
                    const { x, y } = pos.get(n.id);
                    const v = data[n.id];
                    const g = grad[n.id];
                    const isParam = params?.has(n.id);
                    const isHot = hot.has(n.id);
                    return (
                        <g key={n.id} transform={`translate(${px(x - BOX_W / 2)},${px(y - BOX_H / 2)})`}>
                            <rect width={BOX_W} height={BOX_H} rx="8"
                                fill={v === undefined ? '#0f172a' : '#1e293b'}
                                stroke={isHot ? AI_COLORS.highlight : isParam ? '#f59e0b' : '#475569'}
                                strokeWidth={isHot ? 2.5 : isParam ? 1.8 : 1.2}
                                strokeDasharray={v === undefined ? '4 3' : undefined}
                                style={{ transition: 'stroke .25s ease, fill .25s ease' }} />
                            <text x="8" y="15" fontSize="12" fontWeight="700" fill="#f1f5f9">{n.label || n.op}</text>
                            {n.op && n.label && (
                                <text x={BOX_W - 7} y="15" fontSize="10" textAnchor="end" fill="#94a3b8"
                                    fontFamily="var(--font-jetbrains-mono), monospace">{n.op}</text>
                            )}
                            {v !== undefined && (
                                <text x="8" y="30" fontSize="10.5" fill="#cbd5e1" fontFamily="var(--font-jetbrains-mono), monospace">{fmt(v)}</text>
                            )}
                            {g !== undefined && (
                                <text x="8" y="43.5" fontSize="10.5" fontWeight="600" fontFamily="var(--font-jetbrains-mono), monospace"
                                    fill={g > 0 ? AI_COLORS.positive : g < 0 ? AI_COLORS.negative : '#94a3b8'}>∂ {fmt(g)}</text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
