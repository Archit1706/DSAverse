"use client";

import React from 'react';
import { AI_COLORS, diverging } from './colors';

const px = (v) => Math.round(v * 100) / 100;

/**
 * A fully connected network as layers of nodes and weighted edges.
 *
 *   <NetworkDiagram sizes={net.sizes} weights={net.W} activations={[x, h, y]}
 *                   layerNames={['input', 'hidden', 'output']} />
 *
 * `weights[l]` is the [out, in] row-major array between layer l and l + 1
 * (lib/ml/mlp.js's net.W). Edge colour is the sign (sky positive, orange
 * negative) and width the size; pass `edgeValues` instead to colour edges by
 * something else — gradients during backprop, say. Node fill shows
 * `activations[l][k]` on the diverging scale. `highlight` takes keys
 * 'n:l:k' (node) and 'e:l:o:i' (edge) to call out a path.
 */
export default function NetworkDiagram({
    sizes, weights, edgeValues, activations, layerNames, nodeLabels, highlight, onNodeClick,
    width = 440, height = 250, nodeRadius = 15, showValues = true, valueDigits = 2, ariaLabel = 'Neural network diagram',
}) {
    const L = sizes.length;
    const xOf = (l) => px(nodeRadius + 26 + (l * (width - 2 * nodeRadius - 52)) / Math.max(1, L - 1));
    const top = layerNames ? 22 : 8;
    const yOf = (l, k) => {
        const n = sizes[l];
        const gap = Math.min(64, (height - top - 2 * nodeRadius - 8) / Math.max(1, n - 1));
        const mid = top + (height - top) / 2;
        return px(mid + (k - (n - 1) / 2) * gap);
    };
    const edges = edgeValues ?? weights;
    const maxEdge = edges ? Math.max(1e-9, ...edges.flatMap(w => Array.from(w, Math.abs))) : 1;
    const allActs = activations ? activations.flatMap(a => Array.from(a ?? [], Math.abs)) : [];
    const maxAct = Math.max(1, ...allActs);
    const lit = (key) => highlight && highlight.has(key);
    const dim = highlight && highlight.size > 0;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={ariaLabel} className="block">
            {layerNames && layerNames.map((name, l) => (
                <text key={name + l} x={xOf(l)} y={12} fontSize="11" textAnchor="middle" fill={AI_COLORS.text}>{name}</text>
            ))}
            {edges && edges.map((w, l) => {
                const nIn = sizes[l], nOut = sizes[l + 1];
                const out = [];
                for (let o = 0; o < nOut; o++) {
                    for (let i = 0; i < nIn; i++) {
                        const v = w[o * nIn + i];
                        const t = v / maxEdge;
                        const key = `e:${l}:${o}:${i}`;
                        const on = lit(key);
                        out.push(
                            <line key={key} x1={xOf(l)} y1={yOf(l, i)} x2={xOf(l + 1)} y2={yOf(l + 1, o)}
                                stroke={on ? AI_COLORS.highlight : v >= 0 ? AI_COLORS.positive : AI_COLORS.negative}
                                strokeOpacity={on ? 1 : dim ? 0.12 : 0.15 + 0.75 * Math.abs(t)}
                                strokeWidth={px(on ? 3 : 0.6 + 3.4 * Math.abs(t))}>
                                <title>{`w = ${v.toFixed(4)}`}</title>
                            </line>,
                        );
                    }
                }
                return <g key={`layer-${l}`}>{out}</g>;
            })}
            {sizes.map((n, l) => Array.from({ length: n }, (_, k) => {
                const a = activations?.[l]?.[k];
                const key = `n:${l}:${k}`;
                const on = lit(key);
                const label = nodeLabels?.[l]?.[k];
                return (
                    <g key={key} onClick={onNodeClick ? () => onNodeClick(l, k) : undefined} style={onNodeClick ? { cursor: 'pointer' } : undefined}>
                        <circle cx={xOf(l)} cy={yOf(l, k)} r={nodeRadius}
                            fill={a === undefined ? '#1e293b' : diverging(a / maxAct)}
                            stroke={on ? AI_COLORS.highlight : '#64748b'} strokeWidth={on ? 3 : 1.5}
                            opacity={dim && !on ? 0.55 : 1} />
                        {showValues && a !== undefined && (
                            <text x={xOf(l)} y={yOf(l, k) + 3.5} fontSize="9.5" textAnchor="middle" fill="#f8fafc"
                                fontFamily="var(--font-jetbrains-mono), monospace" pointerEvents="none">{a.toFixed(valueDigits)}</text>
                        )}
                        {label && (
                            <text x={xOf(l) + (l === 0 ? -nodeRadius - 5 : nodeRadius + 5)} y={yOf(l, k) + 4} fontSize="11"
                                textAnchor={l === 0 ? 'end' : 'start'} fill={AI_COLORS.text}>{label}</text>
                        )}
                    </g>
                );
            }))}
        </svg>
    );
}
