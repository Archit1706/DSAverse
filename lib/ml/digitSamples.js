/* The digit CNN together with its 40 MNIST test digits, fetched once.

   loadDigitCnn() (digitCnn.js) fetches the weights; the pages that show the
   network at work also want real digits to run it on. Both live in
   public/models/digit-cnn/. This memoises the pair so the Pooling and
   A CNN Reads a Digit pages share one download, and drops a failed
   attempt so useLoaded's retry fetches again. */

import { loadDigitCnn, decodeSamples, DIGIT_CNN_BASE } from './digitCnn.js';

let pending = null;

/** { model, samples: [{ label, pixels: Float64Array(784) }] } */
export function loadDigitCnnWithSamples(base = DIGIT_CNN_BASE) {
    if (!pending) {
        const samples = fetch(`${base}/samples.json`).then(r => {
            if (!r.ok) throw new Error(`samples.json: HTTP ${r.status}`);
            return r.json();
        });
        pending = Promise.all([loadDigitCnn(base), samples])
            .then(([model, json]) => ({ model, samples: decodeSamples(json) }))
            .catch(err => { pending = null; throw err; });
    }
    return pending;
}

/** A flat C×H×W array as C arrays of H rows — what the heatmaps draw. */
export function channels(flat, C, H, W) {
    return Array.from({ length: C }, (_, c) => Array.from({ length: H }, (_, y) => Array.from(flat.subarray ? flat.subarray((c * H + y) * W, (c * H + y + 1) * W) : flat.slice((c * H + y) * W, (c * H + y + 1) * W))));
}
