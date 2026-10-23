/* Seeded randomness for pages that simulate.

   Every visualizer pre-generates all of its steps, so a simulation has to be
   reproducible: stepping back must show the same coin flips, and a property
   test must be able to replay a run exactly. Math.random cannot do either.

   mulberry32 is a tiny 32-bit generator with good enough statistics for
   teaching simulations (Galton boards, dice, sampling). It is not for anything
   security-related. */

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A generator plus the helpers simulations keep rewriting. */
export function createRng(seed) {
    const next = mulberry32(seed);
    let spare = null;   // Box–Muller produces normals in pairs
    return {
        seed,
        /** Uniform in [0, 1). */
        next,
        /** Integer in [lo, hi], both inclusive. */
        int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
        /** True with probability p. */
        chance(p) { return next() < p; },
        pick(items) { return items[Math.floor(next() * items.length)]; },
        /** A shuffled copy (Fisher–Yates); the input is left alone. */
        shuffle(items) {
            const a = [...items];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        },
        /** Standard normal sample, or N(mean, sd) when given. */
        normal(mean = 0, sd = 1) {
            if (spare !== null) { const z = spare; spare = null; return mean + sd * z; }
            let u = 0, v = 0;
            while (u === 0) u = next();
            while (v === 0) v = next();
            const r = Math.sqrt(-2 * Math.log(u));
            spare = r * Math.sin(2 * Math.PI * v);
            return mean + sd * r * Math.cos(2 * Math.PI * v);
        },
    };
}

/** A fresh seed for Shuffle buttons. Store it in state so the run can be rebuilt. */
export function randomSeed() {
    return Math.floor(Math.random() * 0x7fffffff);
}
