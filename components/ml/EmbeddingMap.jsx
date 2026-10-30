"use client";

import React from 'react';
import Plane2D, { usePlane, Vector } from '@/components/math/Plane2D';
import { AI_COLORS } from './colors';

const px = (v) => Math.round(v * 100) / 100;

function Dots({ points, selected, onSelect, neighbors, labelAll }) {
    const { toScreen } = usePlane();
    const near = neighbors ? new Set(neighbors) : null;
    return points.map((p, i) => {
        const [sx, sy] = toScreen([p.x, p.y]);
        const isSel = selected === i;
        const isNear = near?.has(i);
        const faded = (selected != null || near) && !isSel && !isNear;
        const colour = p.color ?? AI_COLORS.classes[(p.group ?? 0) % AI_COLORS.classes.length];
        const showLabel = labelAll || isSel || isNear || p.pinned;
        return (
            <g key={p.id ?? i} opacity={faded ? 0.35 : 1}
                onClick={onSelect ? () => onSelect(i) : undefined}
                style={onSelect ? { cursor: 'pointer' } : undefined}>
                <circle cx={sx} cy={sy} r={isSel ? 6.5 : 4.5} fill={colour}
                    stroke={isSel ? AI_COLORS.highlight : isNear ? '#f8fafc' : '#020617'} strokeWidth={isSel || isNear ? 2 : 1} />
                {showLabel && p.label && (
                    <text x={px(sx + 7)} y={px(sy - 6)} fontSize={isSel ? 13 : 11.5} fontWeight={isSel ? 700 : 500}
                        fill={isSel ? '#f8fafc' : '#cbd5e1'} paintOrder="stroke" stroke="#020617" strokeWidth="3">{p.label}</text>
                )}
                {onSelect && <circle cx={sx} cy={sy} r={10} fill="transparent"><title>{p.label}</title></circle>}
            </g>
        );
    });
}

/**
 * Embeddings projected to 2D, as a labelled scatter on equal axes (so a
 * distance on screen means the same in every direction).
 *
 *   <EmbeddingMap points={[{ x, y, label: 'king', group: 0 }, …]} selected={i}
 *                 neighbors={[3, 7, 9]} arrows={[{ from: [x, y], to: [x, y], label: 'gender' }]} />
 *
 * The view fits the points with a margin. Labels show for the selected
 * point, its neighbours and any point marked `pinned`, unless `labelAll`.
 * Arrows draw offsets between points — analogies, query to result.
 */
export default function EmbeddingMap({ points, selected = null, onSelect, neighbors, arrows = [], labelAll = false, width = 520, ariaLabel = 'Embedding map' }) {
    if (!points || points.length === 0) return null;
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    for (const a of arrows) { xs.push(a.from[0], a.to[0]); ys.push(a.from[1], a.to[1]); }
    const [xa, xb] = [Math.min(...xs), Math.max(...xs)];
    const [ya, yb] = [Math.min(...ys), Math.max(...ys)];
    const span = Math.max(xb - xa, (yb - ya) / 0.75, 1e-6);
    const cx = (xa + xb) / 2, cy = (ya + yb) / 2;
    const half = span * 0.58;
    const xRange = [px(cx - half), px(cx + half)];
    const yRange = [px(cy - half * 0.75), px(cy + half * 0.75)];
    return (
        <Plane2D xRange={xRange} yRange={yRange} width={width} grid={0} axes={false} ariaLabel={ariaLabel}>
            {arrows.map((a, i) => (
                <Vector key={i} from={a.from} to={a.to} color={a.color ?? AI_COLORS.highlight} width={2} dashed={a.dashed} label={a.label} />
            ))}
            <Dots points={points} selected={selected} onSelect={onSelect} neighbors={neighbors} labelAll={labelAll} />
        </Plane2D>
    );
}
