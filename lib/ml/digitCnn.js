/* The digit-reading CNN, run in the browser.

   Two 3×3 convolution layers (8 then 16 channels), each followed by ReLU
   and 2×2 max-pooling, then a 32-unit dense layer and 10 outputs — 26,698
   parameters trained on MNIST by scripts/ml/train_digit_cnn.py (99% test
   accuracy). forward() keeps every feature map so the page can draw them.

   Tensors keep PyTorch's layout: conv weights [out, in, 3, 3], dense
   weights [out, in], feature maps channel-major [C][H][W] in flat arrays. */

export const DIGIT_CNN_BASE = '/models/digit-cnn';

function halfToFloat(h) {
    const sign = h & 0x8000 ? -1 : 1;
    const exp = (h >> 10) & 0x1f;
    const frac = h & 0x3ff;
    if (exp === 0) return sign * 2 ** -14 * (frac / 1024);
    if (exp === 31) return frac ? NaN : sign * Infinity;
    return sign * 2 ** (exp - 15) * (1 + frac / 1024);
}

export function buildDigitCnn(manifest, buffer) {
    const view = new DataView(buffer);
    const t = {};
    for (const { name, shape, offset } of manifest.tensors) {
        const n = shape.reduce((a, b) => a * b, 1);
        const data = new Float64Array(n);
        for (let i = 0; i < n; i++) data[i] = halfToFloat(view.getUint16((offset + i) * 2, true));
        t[name] = { shape, data };
    }
    return { manifest, tensors: t, mean: manifest.input.mean, std: manifest.input.std };
}

let pending = null;
export function loadDigitCnn(base = DIGIT_CNN_BASE) {
    if (!pending) {
        const get = (file, kind) => fetch(`${base}/${file}`).then(r => {
            if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
            return r[kind]();
        });
        pending = Promise.all([get('model.json', 'json'), get('weights.bin', 'arrayBuffer')])
            .then(([manifest, buffer]) => buildDigitCnn(manifest, buffer))
            .catch(err => { pending = null; throw err; });
    }
    return pending;
}

/** A 3×3 convolution with padding 1 (output keeps the input's size). */
export function conv2d(input, C, H, W, weight, bias) {
    const O = weight.shape[0];
    const out = new Float64Array(O * H * W);
    const w = weight.data;
    for (let o = 0; o < O; o++) {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let s = bias.data[o];
                for (let c = 0; c < C; c++) {
                    for (let ky = 0; ky < 3; ky++) {
                        const iy = y + ky - 1;
                        if (iy < 0 || iy >= H) continue;
                        for (let kx = 0; kx < 3; kx++) {
                            const ix = x + kx - 1;
                            if (ix < 0 || ix >= W) continue;
                            s += w[((o * C + c) * 3 + ky) * 3 + kx] * input[(c * H + iy) * W + ix];
                        }
                    }
                }
                out[(o * H + y) * W + x] = s;
            }
        }
    }
    return out;
}

/** 2×2 max-pooling with stride 2. */
export function maxPool2(input, C, H, W) {
    const h = H >> 1, w = W >> 1;
    const out = new Float64Array(C * h * w);
    for (let c = 0; c < C; c++) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const at = (dy, dx) => input[(c * H + 2 * y + dy) * W + 2 * x + dx];
                out[(c * h + y) * w + x] = Math.max(at(0, 0), at(0, 1), at(1, 0), at(1, 1));
            }
        }
    }
    return out;
}

function dense(x, weight, bias) {
    const [O, I] = weight.shape;
    const out = new Float64Array(O);
    for (let o = 0; o < O; o++) {
        let s = bias.data[o];
        for (let i = 0; i < I; i++) s += weight.data[o * I + i] * x[i];
        out[o] = s;
    }
    return out;
}

const relu = (a) => a.map(v => (v > 0 ? v : 0));

/** Classify a 28×28 image (values 0–1, white digit on black, row-major). */
export function forward(model, pixels) {
    const t = model.tensors;
    const input = Float64Array.from(pixels, p => (p - model.mean) / model.std);
    const conv1 = conv2d(input, 1, 28, 28, t['conv1.weight'], t['conv1.bias']);
    const conv1Relu = relu(conv1);
    const pool1 = maxPool2(conv1Relu, 8, 28, 28);
    const conv2 = conv2d(pool1, 8, 14, 14, t['conv2.weight'], t['conv2.bias']);
    const conv2Relu = relu(conv2);
    const pool2 = maxPool2(conv2Relu, 16, 14, 14);
    const fc1 = relu(dense(pool2, t['fc1.weight'], t['fc1.bias']));
    const logits = dense(fc1, t['fc2.weight'], t['fc2.bias']);
    const max = Math.max(...logits);
    const ex = Array.from(logits, l => Math.exp(l - max));
    const sum = ex.reduce((a, b) => a + b, 0);
    return { input, conv1, conv1Relu, pool1, conv2, conv2Relu, pool2, fc1, logits: Array.from(logits), probs: ex.map(e => e / sum) };
}

/** Turn a drawing into an MNIST-style 28×28 image, the way MNIST itself was
    made: crop to the ink, scale the longer side to 20 pixels, then place it
    so its centre of mass sits at the centre. `gray` holds width×height
    values in 0–1 with the ink bright. Returns null for an empty drawing. */
export function preprocessDrawing(gray, width, height) {
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (gray[y * width + x] > 0.1) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const s = 20 / Math.max(bw, bh);
    const tw = Math.max(1, Math.round(bw * s)), th = Math.max(1, Math.round(bh * s));
    // Box-filter downscale: each target pixel averages the source pixels it covers.
    const patch = new Float64Array(tw * th);
    for (let ty = 0; ty < th; ty++) {
        const sy0 = y0 + Math.floor((ty * bh) / th), sy1 = y0 + Math.max(Math.floor(((ty + 1) * bh) / th), Math.floor((ty * bh) / th) + 1);
        for (let tx = 0; tx < tw; tx++) {
            const sx0 = x0 + Math.floor((tx * bw) / tw), sx1 = x0 + Math.max(Math.floor(((tx + 1) * bw) / tw), Math.floor((tx * bw) / tw) + 1);
            let sum = 0, n = 0;
            for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) { sum += gray[y * width + x]; n++; }
            patch[ty * tw + tx] = n ? sum / n : 0;
        }
    }
    let mass = 0, cx = 0, cy = 0;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const v = patch[y * tw + x]; mass += v; cx += v * x; cy += v * y; }
    cx = mass ? cx / mass : tw / 2;
    cy = mass ? cy / mass : th / 2;
    const ox = Math.round(14 - cx), oy = Math.round(14 - cy);
    const out = new Float64Array(28 * 28);
    for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
            const X = x + ox, Y = y + oy;
            if (X >= 0 && X < 28 && Y >= 0 && Y < 28) out[Y * 28 + X] = Math.min(1, patch[y * tw + x]);
        }
    }
    return out;
}

/** Decode samples.json's base64 uint8 digits into 0–1 arrays. */
export function decodeSamples(json) {
    return json.samples.map(({ label, pixels }) => {
        const bin = typeof atob === 'function' ? atob(pixels) : Buffer.from(pixels, 'base64').toString('binary');
        const out = new Float64Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) / 255;
        return { label, pixels: out };
    });
}
