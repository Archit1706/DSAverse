/* Live training without freezing the page.

   A training run is a mutable state (a network, an optimiser, a seeded RNG)
   and a step function that advances it and returns that step's metrics. This
   hook runs as many steps as fit in a small time budget per animation frame,
   then re-renders once, so the boundary and the loss curve move smoothly
   while the page stays responsive.

   The run is deterministic: steps happen in the same order whatever the
   frame rate, so the same seed always draws the same loss curve — only how
   many steps land in each frame differs. State is built synchronously in
   render from `init`, which must therefore be pure and seeded; the server
   and the first client render then agree. */

import { useCallback, useEffect, useRef, useState } from 'react';

function sameDeps(a, b) {
    if (!a || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
}

export function useTrainer({ init, step, deps = [], budgetMs = 6, maxStepsPerFrame = Infinity, maxSteps = Infinity, historyLimit = 600 }) {
    const stateRef = useRef(null);
    const depsRef = useRef(null);
    const historyRef = useRef([]);
    const stepsRef = useRef(0);
    const stepFn = useRef(step);
    stepFn.current = step;
    const [running, setRunning] = useState(false);
    const [, setFrame] = useState(0);
    const bump = useCallback(() => setFrame(f => f + 1), []);

    // A change of seed, dataset or architecture starts a fresh run.
    if (!sameDeps(depsRef.current, deps)) {
        depsRef.current = deps;
        stateRef.current = init();
        historyRef.current = [];
        stepsRef.current = 0;
    }

    const record = (metrics) => {
        const h = historyRef.current;
        h.push({ step: stepsRef.current, ...metrics });
        // Thin the history rather than truncating it, so the curve keeps its
        // whole shape however long the run goes.
        if (h.length > historyLimit) historyRef.current = h.filter((_, i) => i % 2 === 0 || i === h.length - 1);
    };

    const advance = useCallback((n) => {
        for (let i = 0; i < n && stepsRef.current < maxSteps; i++) {
            const metrics = stepFn.current(stateRef.current, stepsRef.current);
            stepsRef.current++;
            if (metrics) record(metrics);
        }
    // record reads only refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxSteps]);

    useEffect(() => {
        if (!running) return undefined;
        let raf = 0;
        const tick = () => {
            const t0 = performance.now();
            let n = 0;
            do {
                advance(1);
                n++;
            } while (n < maxStepsPerFrame && performance.now() - t0 < budgetMs && stepsRef.current < maxSteps);
            bump();
            if (stepsRef.current >= maxSteps) { setRunning(false); return; }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [running, advance, bump, budgetMs, maxStepsPerFrame, maxSteps]);

    // A new run (deps changed) is never left playing the old one's loop.
    useEffect(() => { setRunning(false); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        state: stateRef.current,
        history: historyRef.current,
        steps: stepsRef.current,
        running,
        play: () => setRunning(true),
        pause: () => setRunning(false),
        toggle: () => setRunning(r => !r),
        stepOnce: (n = 1) => { setRunning(false); advance(n); bump(); },
        reset: () => {
            setRunning(false);
            stateRef.current = init();
            historyRef.current = [];
            stepsRef.current = 0;
            bump();
        },
    };
}
