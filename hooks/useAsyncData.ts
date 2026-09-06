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
        // they get something they can act on rather than the raw fault.
        setError(readableMessage(caught));
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

// ---- TURNING A FAULT INTO SOMETHING A PERSON CAN READ ----
// Nobody should ever be shown "TypeError: Failed to fetch". They should be told
// what happened and what to do about it.
function readableMessage(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught);

  // The most common one by far, and the one with an obvious action attached.
  if (/network|fetch|timeout|connection/i.test(raw)) {
    return 'We could not reach SXM Rentals. Check your connection and try again.';
  }

  if (/404|not found/i.test(raw)) {
    return 'We could not find that. It may have been removed.';
  }

  if (/401|403|unauthor|forbidden/i.test(raw)) {
    return 'You need to sign in again to see this.';
  }

  if (/5\d\d|server/i.test(raw)) {
    return 'Something went wrong at our end. Please try again in a moment.';
  }

  return 'Something went wrong. Please try again.';
}
