// Trains the small recurrent networks the Deep Learning Architectures pages
// load. Dev-only: the site build never runs this.
//
//   node scripts/ml/train_recurrent.mjs hold
//
// hold → public/models/recurrent/hold.json, for the LSTM and GRU page: a
// plain RNN, an LSTM and a GRU (4 hidden units each) trained on the
// hold-a-number task in lib/ml/sequenceTasks.js. Training uses the same
// engine the browser runs (lib/ml/recurrent.js), so the weights need no
// conversion. Every architecture is trained from four seeds; the one that
// holds its number best at length 80 on a validation set (seed 7) is
// shipped, and the file records how all four did on the test set (seed 99),
// so the page can say how typical the shipped one is.
//
//   node scripts/ml/train_recurrent.mjs translate
//
// translate → public/models/recurrent/translate.json, for the
// Sequence-to-Sequence page (and Why Attention): two GRU encoder–decoders
// (lib/ml/seq2seq.js, 32 hidden units) on the toy translation task in
// lib/ml/sequenceTasks.js, one plain and one with dot-product attention.
// Weights are rounded to 5 significant figures before evaluation, so the
// accuracies in the file are those of the weights the browser loads.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const R = await imp('lib/ml/recurrent.js');
const { createRng } = await imp('lib/random.js');
const { holdExample, holdAccuracy, translateExample, BOS, EOS, SRC_WORDS, TGT_WORDS } = await imp('lib/ml/sequenceTasks.js');
const S2 = await imp('lib/ml/seq2seq.js');

const outDir = join(root, 'public', 'models', 'recurrent');
const task = process.argv[2] ?? 'hold';

function trainHold(kind, seed) {
    const STEPS = 3000, BATCH = 32, LR = 0.02;
    const net = R.createRecurrent(kind, { input: 2, hidden: 4, output: 1, seed });
    // Start the LSTM forget gate almost fully open (σ(3) = 0.95), so its cell begins as a
    // nearly perfect store and training mostly has to learn when to write.
    if (kind === 'lstm') net.p.bf.fill(3);
    const opt = R.createAdam(net.p, { lr: LR });
    const rng = createRng(seed + 1000);
    const curve = [];
    for (let s = 0; s < STEPS; s++) {
        // Short sequences first, then lengths 5 to 60, so the gradient from
        // the reports can reach the marked step before the gaps get long.
        const T = s < STEPS / 4 ? 5 + rng.int(0, 4) : 5 + rng.int(0, 55);
        opt.lr = s < (3 * STEPS) / 4 ? LR : LR * 0.3;
        const batch = Array.from({ length: BATCH }, () => holdExample(rng, T));
        const { loss, grads } = R.batchLossAndGrads(net, batch, 'mse');
        R.clipGrads(grads, 1);
        opt.step(grads);
        if (s % 50 === 0 || s === STEPS - 1) curve.push([s, Number(loss.toPrecision(4))]);
    }
    return { net, curve, steps: STEPS };
}

const LENGTHS = [10, 30, 80, 160, 500, 1000];
const SEEDS = [1, 2, 3, 4];
const pack = (net) => ({ kind: net.kind, input: net.I, hidden: net.H, output: net.O, params: Object.fromEntries(Object.entries(net.p).map(([k, v]) => [k, Array.from(v)])) });

if (task === 'hold') {
    const models = {}, seedStudy = {}, curves = {};
    for (const kind of ['rnn', 'lstm', 'gru']) {
        seedStudy[kind] = [];
        let best = null;
        for (const seed of SEEDS) {
            const t0 = Date.now();
            const { net, curve, steps } = trainHold(kind, seed);
            const scores = Object.fromEntries(LENGTHS.map(T => [T, holdAccuracy(net, T)]));
            const validation = holdAccuracy(net, 80, { seed: 7 }).within;
            seedStudy[kind].push({ seed, validation80: validation, within: Object.fromEntries(LENGTHS.map(T => [T, scores[T].within])) });
            console.log(`${kind} seed ${seed}: ${((Date.now() - t0) / 1000).toFixed(1)} s, within 0.1 at ${LENGTHS.join('/')}: ${LENGTHS.map(T => scores[T].within.toFixed(2)).join(' ')}, validation at 80: ${validation.toFixed(2)}`);
            if (!best || validation > best.validation) best = { validation, seed, model: { ...pack(net), steps, seed }, curve };
        }
        models[kind] = best.model; curves[kind] = best.curve;
        console.log(`  shipping ${kind} seed ${best.seed}`);
    }
    mkdirSync(outDir, { recursive: true });
    const out = {
        task: 'hold',
        description: 'Hold a number: report the value flagged in the first three steps at every step from step 4 on (lib/ml/sequenceTasks.js).',
        training: { steps: 3000, batch: 32, optimizer: 'Adam, lr 0.02 then 0.006 for the last quarter, gradients clipped to norm 1', lengths: '5–9 for the first quarter, then 5–60', lstmForgetBias: 3, selection: 'of seeds 1–4, the best share within 0.1 at length 80 on validation seed 7', loss: 'mean squared error on every reporting step' },
        evaluation: 'share of 300 seeded sequences (seed 99) whose final output is within 0.1 of the flagged value',
        models, curves, seedStudy,
    };
    writeFileSync(join(outDir, 'hold.json'), JSON.stringify(out));
    console.log(`wrote ${join(outDir, 'hold.json')}`);
} else if (task === 'translate') {
    const MAX_ADJ = 1, H = 32, BATCH = 16, LR = 0.01;
    const STEPS = { plain: 20000, attention: 4000 };
    // 400 test sentences of each length in clauses, seeds 99, 100 and 101
    const test = [1, 2, 3].flatMap(c => { const r = createRng(98 + c); return Array.from({ length: 400 }, () => translateExample(r, { clauses: c, maxAdj: MAX_ADJ })); });
    const round = (model) => { for (const v of Object.values(model.p)) for (let i = 0; i < v.length; i++) v[i] = Number(v[i].toPrecision(5)); return model; };
    const evaluate = (model) => {
        const byLen = {}, byClauses = {};
        test.forEach((ex, i) => {
            const out = S2.translate(model, ex.src, { bos: BOS, eos: EOS, maxLen: 40 }).ids;
            const want = ex.tgt.slice(0, -1);
            let right = 0;
            for (let t = 0; t < want.length; t++) if (out[t] === want[t]) right++;
            const exact = out.length === want.length && right === want.length ? 1 : 0;
            for (const [map, key] of [[byLen, ex.src.length], [byClauses, 1 + Math.floor(i / 400)]]) {
                const b = (map[key] ??= { sentences: 0, words: 0, right: 0, exact: 0 });
                b.sentences++; b.words += want.length; b.right += right; b.exact += exact;
            }
        });
        return { byLength: byLen, byClauses };
    };
    const models = {}, curves = {}, evaluation = {};
    for (const [name, attention] of [['plain', false], ['attention', true]]) {
        const t0 = Date.now();
        const model = S2.createSeq2Seq({ srcVocab: SRC_WORDS.length, tgtVocab: TGT_WORDS.length, hidden: H, attention, seed: 1 });
        const opt = R.createAdam(model.p, { lr: LR });
        const rng = createRng(1001);
        const curve = [];
        let avg = 0;
        for (let s = 1; s <= STEPS[name]; s++) {
            opt.lr = s < 0.75 * STEPS[name] ? LR : LR * 0.3;
            const batch = Array.from({ length: BATCH }, () => translateExample(rng, { maxAdj: MAX_ADJ }));
            const { loss, grads } = S2.seq2seqLossAndGrads(model, batch, BOS);
            R.clipGrads(grads, 1);
            opt.step(grads);
            avg = avg ? 0.98 * avg + 0.02 * loss : loss;
            if (s % 100 === 0) curve.push([s, Number(avg.toPrecision(4))]);
            if (s % 2000 === 0) console.log(`${name} step ${s}: loss ${avg.toFixed(3)} (${((Date.now() - t0) / s).toFixed(0)} ms/step)`);
        }
        round(model);
        evaluation[name] = evaluate(model);
        const c = evaluation[name].byClauses;
        console.log(`${name}: words right by clauses ${[1, 2, 3].map(k => (c[k].right / c[k].words).toFixed(3)).join(' ')}, exact ${[1, 2, 3].map(k => (c[k].exact / c[k].sentences).toFixed(3)).join(' ')}`);
        models[name] = { ...S2.packSeq2Seq(model), steps: STEPS[name], seed: 1 };
        curves[name] = curve;
    }
    mkdirSync(outDir, { recursive: true });
    const out = {
        task: 'translate',
        description: 'Toy translation (lib/ml/sequenceTasks.js translateExample, at most one adjective per noun): English-like source, French-like target where adjectives follow their noun.',
        training: { hidden: H, batch: BATCH, steps: STEPS, optimizer: 'Adam, lr 0.01 then 0.003 for the last quarter, gradients clipped to norm 1', data: 'fresh random sentences of 1–3 clauses every batch (seed 1001)', loss: 'mean cross-entropy per target word, teacher forcing', rounding: 'weights rounded to 5 significant figures, then evaluated' },
        evaluation: 'greedy decoding of 400 test sentences per clause count (seeds 99, 100, 101); a word is right when it matches the reference at the same position',
        models, curves, evaluation,
    };
    writeFileSync(join(outDir, 'translate.json'), JSON.stringify(out));
    console.log(`wrote ${join(outDir, 'translate.json')}`);
} else {
    throw new Error(`unknown task "${task}"`);
}
