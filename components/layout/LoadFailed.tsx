'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: What a screen shows when the information it needs could
// not be fetched — its own title, what went wrong in plain words, and a button
// to try again.
//
// WHY EVERY SCREEN NEEDS THIS, AND WHY NONE OF THEM HAD IT. While the panel ran
// on sample data, nothing ever failed to load, so no screen ever had to say so.
// Against a real server, things fail: it is asleep and waking, the connection
// drops, a session ends. A screen that ignores that does something worse than
// show an error — it shows a WRONG ANSWER. A failed list looks exactly like an
// empty one ("Nothing outstanding"), and a failed customer record looks exactly
// like a customer who does not exist ("Customer not found"). Somebody reading
// either would act on it.
//
// So: a screen that could not load says it could not load. One line in each
// screen, the same everywhere.

import React from 'react';
import { PageHead } from './PageCard';
import { ErrorState } from '@/components/ui';

export function LoadFailed({
  title,
  what,
  error,
  onRetry,
}: {
  // The screen's own title, so it is obvious which screen this is.
  title: string;
  // What could not be loaded, as the start of a sentence: "The queue",
  // "This customer".
  what: string;
  // Already readable — straight from useAsyncData.
  error: string;
  onRetry: () => void;
}) {
  return (
    <>
      <PageHead title={title} />
      <ErrorState title={`${what} could not be loaded`} message={error} onRetry={onRetry} />
    </>
  );
}

export default LoadFailed;
