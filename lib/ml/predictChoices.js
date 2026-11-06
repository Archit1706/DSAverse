/* Numeric answer choices for predict prompts.

   A prompt whose options are numbers leaks in two ways. If the right answer
   sits in the same button every time, "always click the first one" scores;
   if it is usually the largest (or the smallest, or the second) of the four,
   "pick the biggest number" scores without reading the step. Rotating the
   button does not fix the second leak — the numbers give it away.

   rankedChoices puts the four options in ascending order and places the
   right answer at a chosen rank, so the button and the value rank are the
   same thing and both are spread evenly when `slot` is. The wrong answers
   come from the page's own list of plausible slips first (a dropped term, a
   sign error, forgetting the weights), then from evenly spaced neighbours of
   the answer. */

/**
 *   rankedChoices(7, [3, -7, 12], { slot: 2, step: 1, fmt: v => String(v) })
 *   → { options: ['3', '5', '7', '12'], correct: 2 }
 *
 * `slot` is the rank (0–3) the right answer takes; `step` the spacing of
 * filler values; `fmt` turns a number into its label. Values whose labels
 * collide with the answer's (or each other's) are skipped.
 */
export function rankedChoices(correct, slips, { slot, step = 1, fmt = String, count = 4 } = {}) {
    const key = fmt(correct);
    const seen = new Set([key]);
    const below = [], above = [];
    const take = (v, list) => {
        if (!Number.isFinite(v)) return;
        const k = fmt(v);
        if (seen.has(k)) return;
        seen.add(k);
        list.push(v);
    };
    const wantBelow = Math.max(0, Math.min(count - 1, slot));
    const wantAbove = count - 1 - wantBelow;
    for (const v of slips) {
        if (v < correct && below.length < wantBelow) take(v, below);
        else if (v > correct && above.length < wantAbove) take(v, above);
    }
    for (let k = 1; below.length < wantBelow && k < 400; k++) take(correct - k * step, below);
    for (let k = 1; above.length < wantAbove && k < 400; k++) take(correct + k * step, above);
    const values = [...below, correct, ...above].sort((a, b) => a - b);
    return { options: values.map(fmt), correct: values.indexOf(correct), values };
}

/**
 * Four options in ascending order: the answer plus the first three distinct
 * wrong values from `candidates`, padded with neighbours of the answer if
 * there are too few. Use it when the wrong answers are drawn from the same
 * distribution as the right one — a convolution's outputs at the windows
 * next to this one, say — so the answer's rank is already spread evenly and
 * "pick whatever is closest to the last answer" has nothing to latch onto.
 *
 *   sortedChoices(5, [2, 5, 7, 3], { fmt: String }) → { options: ['2', '3', '5', '7'], correct: 2 }
 */
export function sortedChoices(correct, candidates, { step = 1, fmt = String, count = 4 } = {}) {
    const seen = new Set([fmt(correct)]);
    const values = [correct];
    const take = (v) => {
        if (values.length >= count || !Number.isFinite(v)) return;
        const k = fmt(v);
        if (seen.has(k)) return;
        seen.add(k);
        values.push(v);
    };
    for (const v of candidates) take(v);
    for (let k = 1; values.length < count && k < 400; k++) { take(correct + k * step); take(correct - k * step); }
    values.sort((a, b) => a - b);
    return { options: values.map(fmt), correct: values.indexOf(correct), values };
}

/** A stable small hash of a few integers, for choosing a slot from a step. */
export function slotOf(...parts) {
    let h = 2166136261;
    for (const p of parts) {
        h ^= (p | 0) + 0x9e3779b9;
        h = Math.imul(h, 16777619) >>> 0;
    }
    // Avalanche (murmur3's finaliser), so the low bits depend on every bit
    // of every part — a bare multiply leaves h % 4 set by the parts' low bits.
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) % 4;
}
