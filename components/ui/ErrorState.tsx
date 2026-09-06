'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: What a page shows when something failed to load — a
// plain-English explanation and a button to try again.
//
// WHY THIS IS NOT OPTIONAL: without it, a failed request leaves a page sitting
// on grey loading blocks for ever. There is no message, no way to retry, and no
// way for the person to tell whether to keep waiting or give up. That is the
// single worst state a page can be left in, and it is also the easiest to reach
// by accident — every list on this site can fail.
//
// The wording never contains anything technical. Nobody should ever be shown
// "TypeError: Failed to fetch"; they should be told what happened and what they
// can do about it. Turning faults into that wording happens in
// hooks/useAsyncData.ts, and the result is what gets passed in here.

import React from 'react';
import { cx } from '@/lib/utils';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button } from './Button';
import styles from './ErrorState.module.css';

export function ErrorState({
  // Already-readable wording, straight from useAsyncData.
  message,
  title = 'Something went wrong',
  onRetry,
  // The compact version, for a failure inside one card rather than a whole page.
  inline = false,
  className,
}: {
  message?: string;
  title?: string;
  onRetry?: () => void;
  inline?: boolean;
  className?: string;
}) {
  const text = message ?? 'Something went wrong. Please try again.';

  if (inline) {
    return (
      <div className={cx(styles.errorState, styles.inline, className)} role="alert">
        <span className={styles.icon}>
          <Icon name="alert-circle-outline" size={22} />
        </span>

        <div className={styles.inlineBody}>
          <Text variant="small">{text}</Text>
        </div>

        {onRetry ? (
          <Button label={'Try Again'} variant="outline" size="sm" onClick={onRetry} />
        ) : null}
      </div>
    );
  }

  return (
    // "alert" makes screen readers announce this the moment it appears, rather
    // than leaving someone waiting for a page that has already given up.
    <div className={cx(styles.errorState, className)} role="alert">
      <span className={styles.icon}>
        <Icon name="alert-circle-outline" size={28} />
      </span>

      <Text variant="h3">{title}</Text>

      <Text variant="body" tone="ink2" className={styles.body}>
        {text}
      </Text>

      {onRetry ? (
        <Button label={'Try Again'} variant="secondary" size="md" onClick={onRetry} iconLeft={<Icon name="refresh" size={17} />} />
      ) : null}
    </div>
  );
}

// ---- CATCHING A CRASH ----
// If a component throws an error while drawing itself, React removes the entire
// page and leaves a blank white screen. This catches that and shows something
// readable instead, with a way out.
//
// It has to be written as a class because React only offers this ability to
// classes — it is the one remaining thing a function component cannot do.
type BoundaryProps = { children: React.ReactNode; fallback?: React.ReactNode };
type BoundaryState = { hasError: boolean };

// The fallback shown when a page crashes.
function BoundaryMessage() {
  return (
    <ErrorState
      title={'This page ran into a problem'}
      message={'Something went wrong while showing this page. Reloading usually fixes it.'}
      onRetry={() => window.location.reload()}
    />
  );
}

export class AppErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Kept in the developer console rather than shown on screen. Once there is a
    // backend this should also be reported so faults are noticed without waiting
    // for somebody to complain.
    console.error('SXM Rentals — a page failed to draw:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    // Keeping the boundary a class is not a style choice: componentDidCatch has
    // no hook equivalent, and it is the only way to catch a crash in a child.
    return <BoundaryMessage />;
  }
}

export default ErrorState;
