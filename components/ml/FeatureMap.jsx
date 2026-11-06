"use client";

import React from 'react';
import { sequential, diverging, inkOn } from './colors';

const px = (v) => Math.round(v * 100) / 100;

/**
 * An image or feature map as square cells, with outlined regions on top —
 * a pooling window, a receptive field, the patch a kernel covers.
 *
 *   <FeatureMap data={rows} cell={8} domain={[0, 3]}
 *               overlays={[{ r: 4, c: 6, h: 10, w: 10, color: '#facc15' }]} />
 *
 * `data` is an array of rows. `scale` 'sequential' (0 → dark, max → pale
 * yellow) suits pixels and post-ReLU maps; 'diverging' suits signed values.
 * With `showValues` each cell prints its number (only sensible for small
 * crops). `onCell(r, c)` makes cells clickable. The SVG scales down to its
 * container, so a 28×28 map never widens the page.
 */
export default function FeatureMap({
    data, cell = 8, scale = 'sequential', domain, overlays = [], showValues = false, format = (v) => v.toFixed(2),
    onCell, gap = 0.5, ariaLabel = 'Feature map', className = '', maxWidth,
}) {
    const R = data.length, C = R ? data[0].length : 0;
    const flat = data.flat().filter(Number.isFinite);
    const [lo, hi] = domain ?? (scale === 'diverging'
        ? (() => { const m = Math.max(1e-9, ...flat.map(Math.abs)); return [-m, m]; })()
        : [Math.min(0, ...flat), Math.max(1e-9, ...flat)]);
    const norm = (v) => (scale === 'diverging' ? Math.max(-1, Math.min(1, v / Math.max(Math.abs(lo), Math.abs(hi), 1e-9))) : Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))));
    const fill = (v) => (scale === 'diverging' ? diverging(norm(v)) : sequential(norm(v)));
    const W = C * cell, H = R * cell;
    return (
        <svg viewBox={`-1 -1 ${W + 2} ${H + 2}`} style={{ width: '100%', maxWidth: maxWidth ?? W + 2 }} role={onCell ? 'grid' : 'img'}
            aria-label={ariaLabel} className={`block select-none ${className}`}>
            {data.map((row, i) => row.map((v, j) => (
                <g key={`${i}-${j}`} onClick={onCell ? () => onCell(i, j) : undefined} style={onCell ? { cursor: 'pointer' } : undefined}>
                    <rect x={j * cell + gap} y={i * cell + gap} width={Math.max(0.5, cell - 2 * gap)} height={Math.max(0.5, cell - 2 * gap)}
                        fill={Number.isFinite(v) ? fill(v) : '#0b1120'} rx={cell >= 20 ? 3 : 0} />
                    {showValues && Number.isFinite(v) && (
                        <text x={px(j * cell + cell / 2)} y={px(i * cell + cell / 2 + 4)} fontSize={cell >= 44 ? 12 : 10} textAnchor="middle"
                            fill={inkOn(norm(v), scale)} fontFamily="var(--font-jetbrains-mono), monospace" pointerEvents="none">{format(v)}</text>
                    )}
                </g>
            )))}
            {overlays.map((o, k) => (
                <rect key={k} x={o.c * cell} y={o.r * cell} width={o.w * cell} height={o.h * cell} rx={cell >= 20 ? 4 : 1}
                    fill={o.fill ?? 'none'} fillOpacity={o.fill ? 0.18 : undefined}
                    stroke={o.color ?? '#facc15'} strokeWidth={o.width ?? Math.max(1.5, cell / 8)} strokeDasharray={o.dashed ? `${cell / 2} ${cell / 3}` : undefined}
                    pointerEvents="none" style={{ transition: 'x 0.3s ease, y 0.3s ease, width 0.3s ease, height 0.3s ease' }} />
            ))}
        </svg>
    );
}
