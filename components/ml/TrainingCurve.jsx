"use client";

import React from 'react';
import LossChart from './LossChart';

/**
 * LossChart with a y range that is never flat. LossChart's tick loop never
 * ends when every value agrees to within float precision but not exactly —
 * a run started at the minimum, for one — so pad such a range to a factor
 * of 1.5 each way (or ±1 on a linear axis) before handing it over.
 *
 *   <TrainingCurve logY series={[{ name: 'loss', color, points }]} height={130} />
 */
export default function TrainingCurve({ series, logY = false, yMin, yMax, ...rest }) {
    const ys = series.flatMap(s => s.points).map(p => p.y).filter(y => Number.isFinite(y) && (!logY || y > 0));
    let range = {};
    if (ys.length && yMin === undefined && yMax === undefined) {
        const lo = Math.min(...ys), hi = Math.max(...ys);
        if (logY && hi < lo * 1.5) range = { yMin: lo / 1.5, yMax: hi * 1.5 };
        else if (!logY && hi - lo < 1e-6 * Math.max(1, Math.abs(hi))) range = { yMin: Math.min(0, lo - 1), yMax: hi + 1 };
    }
    return <LossChart series={series} logY={logY} yMin={yMin ?? range.yMin} yMax={yMax ?? range.yMax} {...rest} />;
}
