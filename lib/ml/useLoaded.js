"use client";

import { useCallback, useEffect, useState } from 'react';

/* Runs one of lib/ml's memoised loaders (loadTinyGpt, loadDigitCnn,
   loadWordVectors, loadRagData) after mount and tracks its state, so a page
   can show a skeleton, then the model, or an error with a retry button.

     const { data: model, error, retry } = useLoaded(loadTinyGpt);
     if (error) return <LoadError error={error} onRetry={retry} />;
     if (!model) return <Skeleton />;

   The loaders cache their promise and drop it on failure, so retry() fetches
   again only when the last attempt failed, and two components asking for the
   same model share one download. Nothing runs on the server: the first
   render on both sides is the empty state, so hydration always matches. */
export default function useLoaded(loader) {
    const [state, setState] = useState({ data: null, error: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let live = true;
        loader().then(
            (data) => { if (live) setState({ data, error: null }); },
            (error) => { if (live) setState({ data: null, error }); },
        );
        return () => { live = false; };
    }, [loader, attempt]);

    const retry = useCallback(() => {
        setState({ data: null, error: null });
        setAttempt(a => a + 1);
    }, []);

    return { data: state.data, error: state.error, loading: !state.data && !state.error, retry };
}
