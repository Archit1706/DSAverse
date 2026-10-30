"use client";

import React from 'react';
import { sequential, diverging, inkOn } from './colors';

/**
 * A labelled matrix as coloured cells — attention weights, confusion
 * matrices, embeddings, kernels, feature maps.
 *
 *   <Heatmap data={rows} rowLabels={tokens} colLabels={tokens}
 *            selected={{ i, j }} onSelect={(i, j) => …} />
 *
 * `data` is an array of rows or a lib/ml/tensor matrix. Cells that are
 * -Infinity or NaN (a causal mask, say) are drawn hatched, not coloured.
 * The grid shrinks to fit its container down to 14-pixel cells, then
 * scrolls inside its own box, so a wide matrix never widens the page.
 * With onSelect, the arrow keys move the selection (one tab stop for the
 * whole grid) and clicking a cell selects it.
 */
export default function Heatmap({
    data, rowLabels, colLabels, scale = 'sequential', domain, selected = null, onSelect,
    highlightRow = null, highlightCol = null, showValues, format = (v) => v.toFixed(2),
    cellSize = 30, ariaLabel = 'Heatmap', className = '',
}) {
    const rows = Array.isArray(data) ? data : Array.from({ length: data.rows }, (_, i) => Array.from(data.data.subarray(i * data.cols, (i + 1) * data.cols)));
    const R = rows.length, C = R ? rows[0].length : 0;
    const finite = rows.flat().filter(Number.isFinite);
    let [lo, hi] = domain ?? (scale === 'diverging'
        ? (() => { const m = Math.max(1e-9, ...finite.map(Math.abs)); return [-m, m]; })()
        : [Math.min(0, ...finite), Math.max(1e-9, ...finite)]);
    if (hi === lo) hi = lo + 1;
    const norm = (v) => (scale === 'diverging' ? Math.max(-1, Math.min(1, v / Math.max(Math.abs(lo), Math.abs(hi)))) : (v - lo) / (hi - lo));
    const fill = (v) => (scale === 'diverging' ? diverging(norm(v)) : sequential(norm(v)));
    const values = showValues ?? cellSize >= 28;

    const longest = (labels) => (labels ? Math.max(0, ...labels.map(l => String(l).length)) : 0);
    const rotate = colLabels && longest(colLabels) > 3;
    const left = rowLabels ? Math.min(140, 10 + longest(rowLabels) * 7) : 0;
    const top = colLabels ? (rotate ? Math.min(110, 12 + longest(colLabels) * 5.5) : 20) : 0;
    const W = left + C * cellSize, H = top + R * cellSize;
    const minWidth = left + C * Math.min(cellSize, 14);

    const onKey = (e) => {
        if (!onSelect) return;
        const cur = selected ?? { i: 0, j: 0 };
        const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        const m = moves[e.key];
        if (!m) return;
        e.preventDefault();
        onSelect(Math.max(0, Math.min(R - 1, cur.i + m[0])), Math.max(0, Math.min(C - 1, cur.j + m[1])));
    };

    return (
        <div className={`overflow-x-auto ${className}`}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, minWidth }}
                role={onSelect ? 'grid' : 'img'} aria-label={ariaLabel}
                tabIndex={onSelect ? 0 : undefined} onKeyDown={onKey}
                className="block select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded">
                <defs>
                    <pattern id="heatmap-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="#0b1120" />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#334155" strokeWidth="2" />
                    </pattern>
                </defs>
                {colLabels && colLabels.map((l, j) => (
                    <text key={`c${j}`} fontSize="11" fill={highlightCol === j || selected?.j === j ? '#f8fafc' : '#94a3b8'}
                        fontFamily="var(--font-jetbrains-mono), monospace"
                        transform={rotate
                            ? `translate(${left + j * cellSize + cellSize / 2 + 3}, ${top - 6}) rotate(-50)`
                            : `translate(${left + j * cellSize + cellSize / 2}, ${top - 6})`}
                        textAnchor={rotate ? 'start' : 'middle'}>{l}</text>
                ))}
                {rowLabels && rowLabels.map((l, i) => (
                    <text key={`r${i}`} x={left - 6} y={top + i * cellSize + cellSize / 2 + 4} fontSize="11" textAnchor="end"
                        fill={highlightRow === i || selected?.i === i ? '#f8fafc' : '#94a3b8'}
                        fontFamily="var(--font-jetbrains-mono), monospace">{l}</text>
                ))}
                {rows.map((r, i) => r.map((v, j) => {
                    const masked = !Number.isFinite(v);
                    const t = masked ? 0 : norm(v);
                    return (
                        <g key={`${i}-${j}`} onClick={onSelect ? () => onSelect(i, j) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined}>
                            <rect x={left + j * cellSize} y={top + i * cellSize} width={cellSize - 1} height={cellSize - 1} rx="2"
                                fill={masked ? 'url(#heatmap-hatch)' : fill(v)}
                                opacity={highlightRow !== null && highlightRow !== i ? 0.45 : 1} />
                            {values && !masked && (
                                <text x={left + j * cellSize + cellSize / 2 - 0.5} y={top + i * cellSize + cellSize / 2 + 3.5}
                                    fontSize={cellSize >= 40 ? 11 : 9} textAnchor="middle" fill={inkOn(t, scale)}
                                    fontFamily="var(--font-jetbrains-mono), monospace" pointerEvents="none">{format(v)}</text>
                            )}
                            <title>{`${rowLabels ? rowLabels[i] : i} → ${colLabels ? colLabels[j] : j}: ${masked ? 'masked' : format(v)}`}</title>
                        </g>
                    );
                }))}
                {selected && selected.i < R && selected.j < C && (
                    <rect x={left + selected.j * cellSize - 1} y={top + selected.i * cellSize - 1} width={cellSize + 1} height={cellSize + 1}
                        rx="3" fill="none" stroke="#f8fafc" strokeWidth="2" pointerEvents="none" />
                )}
            </svg>
        </div>
    );
}
