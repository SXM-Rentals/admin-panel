'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The small messages that appear briefly at the bottom of
// the screen and then fade away — "Cars are the only type available right now",
// "Copied", "Saved to your list".
//
// WHAT THESE ARE MOSTLY FOR ON THIS SITE: explaining, when someone clicks
// something that is not built yet. ATVs, boats, bikes and the rewards scheme are
// all marked Coming Soon, and clicking one has to SAY so. A control that looks
// normal and does nothing at all when clicked is indistinguishable from a broken
// one, and people will assume the site is broken rather than that the feature is
// unfinished.
//
// These are never used for errors that need acting on. A message that vanishes
// after four seconds is the wrong place for anything the person must read.

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Icon } from './Icon';
import styles from './Toast.module.css';

type Toast = {
  id: number;
  title: string;
  message?: string;
};

type ToastValue = {
  // Shows a message. Give it a short title and, if useful, a line explaining.
  showToast: (title: string, message?: string) => void;
  // The specific wording used for anything marked Coming Soon, so it reads the
  // same everywhere rather than being reworded page by page.
  showComingSoon: (what: string) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

// How long a message stays before fading. Long enough to read two lines without
// hurrying, short enough not to sit in the way.
const VISIBLE_FOR = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Counts upward so every message gets a unique id, even two raised in the
  // same millisecond.
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, title, message }]);
      window.setTimeout(() => dismiss(id), VISIBLE_FOR);
    },
    [dismiss],
  );

  const showComingSoon = useCallback(
    (what: string) => {
      showToast(
        `${what} are coming soon`,
        'Cars are the only vehicle type available right now. Everything else is on the way.',
      );
    },
    [showToast],
  );

  const value = useMemo<ToastValue>(
    () => ({ showToast, showComingSoon }),
    [showToast, showComingSoon],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className={styles.stack}
        // "status" announces a new message without interrupting whatever is
        // being read, which is right for something purely informative.
        role="status"
        aria-live="polite"
        data-print="hide"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <div className={styles.body}>
              <div className={styles.title}>{toast.title}</div>
              {toast.message ? <div className={styles.message}>{toast.message}</div> : null}
            </div>

            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label={'Dismiss this message'}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider (check app/layout.tsx)');
  }
  return ctx;
}
