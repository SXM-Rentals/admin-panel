// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Handles the three things that can happen when a screen
// asks for information — it is still loading, it arrived, or it failed — so
// every screen deals with them the same way.
//
// WHY THIS EXISTS: before it, every screen did roughly this:
//
//     apiClient.getThing().then(setThing)
//
// which quietly assumes the request always works. When it does not — no signal,
// server down, a bad response — nothing happens at all. No message, no way to
// try again, and the screen sits on grey loading blocks for ever. The person
// using it has no idea whether to wait or give up.
//
// With this, a failure produces an actual error to show and a way to retry, and
// the same hook gives every screen pull-to-refresh for free.

import { useCallback, useEffect, useState } from 'react';
import { presentError } from '@/lib/api/errors';

export type AsyncState<T> = {
  data: T | undefined;
  // True the first time only. Pulling to refresh does not put the screen back
  // into a skeleton — the old information stays on screen while the new arrives.
  loading: boolean;
  // True while a pull-to-refresh is in progress.
  refreshing: boolean;
  // Something readable when it went wrong, or nothing when it did not.
  error: string | undefined;
  // Try the whole thing again. Used by the retry button and by pulling down.
  refresh: () => void;
};

export function useAsyncData<T>(
  // The request to make. Wrapped in useCallback by the screen, or given a
  // dependency list below, so it does not re-run on every keystroke.
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(undefined);

      try {
        const result = await fetcher();
        setData(result);
      } catch (caught) {
        // Whatever went wrong, the person reading this is not a developer, so
        // they get something they can act on rather than the raw fault. Where
        // SXM Rentals itself explained the refusal, that explanation is what
        // they see — see lib/api/errors.ts.
        setError(presentError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // The fetcher is deliberately left out — screens pass a fresh function on
    // every render, and depending on it would make this loop for ever. The
    // screen's own dependency list is what decides when to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = useCallback(() => {
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, refreshing, error, refresh };
}

// ---- WHERE THE WORDING NOW LIVES ----
// This file used to hold a list of patterns that turned a fault into a sentence:
// anything mentioning 404 became "We could not find that", and anything else
// became "Something went wrong. Please try again."
//
// That was right while there was no server. It is wrong now, and quietly so: a
// refusal from SXM Rentals arrives carrying a sentence written for the person
// reading it — "This customer still has a rental running" — and matching that
// against a list of patterns would either rewrite it or, far more often, throw
// it away and show "Something went wrong" in its place. The one useful thing
// said about the failure would be the one thing not shown.
//
// So the decision moved to lib/api/errors.ts, where it can tell the difference
// between the server refusing and the server never being reached. The patterns
// still exist there, and still do their old job for faults nobody wrote a
// message for.
