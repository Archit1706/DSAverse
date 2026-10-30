/* Colours shared by the AI & Machine Learning pages.

   Two scales, both readable on the dark theme and both safe for the common
   colour-vision deficiencies:
   - sequential (attention weights, probabilities, pixel intensities): dark
     slate through indigo, magenta and amber to pale yellow, with brightness
     rising steadily so the order survives in greyscale;
   - diverging (weights, gradients, activations that can be negative): orange
     for negative, dark slate at zero, sky blue for positive.
   Blue/orange is also the pairing for the two classes of a binary dataset. */

export const AI_COLORS = {
    positive: '#38bdf8',
    negative: '#fb923c',
    zero: '#1e293b',
    classes: ['#38bdf8', '#fb923c', '#a3e635', '#e879f9'],
    text: '#94a3b8',
    muted: '#475569',
    highlight: '#facc15',
};

const SEQUENTIAL = ['#0f172a', '#312e81', '#7e22ce', '#db2777', '#f59e0b', '#fde68a'];

function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const SEQ_RGB = SEQUENTIAL.map(hexToRgb);
const NEG = hexToRgb(AI_COLORS.negative), POS = hexToRgb(AI_COLORS.positive), ZERO = hexToRgb('#0f172a');

const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const css = ([r, g, b]) => `rgb(${r},${g},${b})`;

/** t in [0, 1] → a colour on the sequential scale. */
export function sequential(t) {
    const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (SEQ_RGB.length - 1);
    const i = Math.min(SEQ_RGB.length - 2, Math.floor(x));
    return css(mix(SEQ_RGB[i], SEQ_RGB[i + 1], x - i));
}

/** t in [-1, 1] → orange (negative), dark (zero) or sky blue (positive). */
export function diverging(t) {
    const x = Math.min(1, Math.max(-1, Number.isFinite(t) ? t : 0));
    return css(x < 0 ? mix(ZERO, NEG, -x) : mix(ZERO, POS, x));
}

/** Readable text colour on top of a cell of the given scale value. */
export function inkOn(t, scale = 'sequential') {
    if (scale === 'diverging') return Math.abs(t) > 0.6 ? '#0f172a' : '#e2e8f0';
    return t > 0.62 ? '#0f172a' : '#e2e8f0';
}
