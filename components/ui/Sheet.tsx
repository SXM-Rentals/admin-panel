'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The panels that open on top of the page — the filter
// panel, the language picker, and the small yes/no confirmation boxes.
//
// ON THE PHONE THESE SLIDE UP FROM THE BOTTOM. On a computer that is the wrong
// shape entirely, so here they open as a centred window, or as a panel down the
// side for something tall like a list of filters.
//
// FOUR THINGS EVERY PANEL ON TOP OF A PAGE MUST DO, all handled here so no page
// has to remember them:
//
//   1. Escape closes it. Every computer user tries this first.
//   2. The keyboard stays inside it. Without this, pressing Tab walks invisibly
//      out of the window and into the page behind, and the person is left typing
//      into something they cannot see.
//   3. Focus moves into it when it opens, and returns to whatever opened it when
//      it closes — otherwise the keyboard is dumped back at the top of the page.
//   4. The page behind stops scrolling, so spinning the wheel does not silently
//      scroll something else away underneath.

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { cx } from '@/lib/utils';
import { Text } from './Text';
import { Button } from './Button';
import { IconButton } from './IconButton';
import styles from './Sheet.module.css';

// Everything the keyboard can reach. Used to work out where focus should start
// and where it should wrap around.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  // Buttons along the bottom, e.g. "Clear All" and "Show 24 Cars".
  footer?: React.ReactNode;
  // "center" is the default window. "side" slides in from the left, for filters.
  placement?: 'center' | 'side';
  wide?: boolean;
  className?: string;
};

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  placement = 'center',
  wide = false,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Whatever had the keyboard before this opened, so it can be handed back.
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // ---- KEYBOARD HANDLING ----
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      // Keep Tab inside the panel by looping from the last thing back to the
      // first, and from the first backwards to the last.
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);

      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  // ---- THE KEYBOARD LISTENER, KEPT FRESH WITHOUT RE-REGISTERING ----
  // The listener is attached once per opening. It reads the handler out of this
  // ref each time it fires, so the handler can change on every render without
  // the listener — or the effect below it — needing to be torn down and set up
  // again. See the note on that effect for why that matters so much here.
  const keyHandler = useRef(onKeyDown);
  useEffect(() => {
    keyHandler.current = onKeyDown;
  }, [onKeyDown]);

  // ---- OPENING AND CLOSING ----
  //
  // THIS EFFECT DEPENDS ON "open" AND NOTHING ELSE, DELIBERATELY.
  //
  // It used to also depend on the keyboard handler, which looked harmless and
  // caused a genuinely baffling bug: typing in any text box inside a panel moved
  // the cursor to the close button after a single letter.
  //
  // The chain was this. Every caller passes onClose as an inline arrow —
  // onClose={() => setOpen(false)} — which is a brand new function on every
  // render. The keyboard handler is built from it, so that was new every render
  // too. This effect listed it as a dependency, so React tore the effect down
  // and ran it again after every single render. Typing a letter re-rendered the
  // page holding the panel, which re-ran this effect, which moved focus to the
  // first thing in the panel: the X.
  //
  // Depending only on "open" means the panel is set up once when it opens and
  // torn down once when it closes, which is what it always meant to do.
  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement as HTMLElement | null;

    // ---- STOP THE PAGE BEHIND FROM SCROLLING ----
    // Removing the scrollbar makes the page jump sideways, so the exact width it
    // occupied is added back as padding to hold everything still.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const onKeyDownEvent = (event: KeyboardEvent) => keyHandler.current(event);
    document.addEventListener('keydown', onKeyDownEvent);

    // Move the keyboard into the panel. Waiting a frame lets the panel finish
    // appearing first, otherwise there is nothing yet to focus.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;

      // A box to type in is preferred over whatever happens to come first in the
      // markup, which is the close button. Opening "Where do you want the car?"
      // should put the cursor in the address box, not on the X.
      const field = panel.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
      );

      (field ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    });

    return () => {
      document.removeEventListener('keydown', onKeyDownEvent);
      cancelAnimationFrame(frame);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      // Hand the keyboard back to whatever opened this.
      returnFocusTo.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cx(styles.backdrop, placement === 'side' && styles.backdropSide)}
      // Clicking the dimmed area closes the panel — but only the dimmed area
      // itself, not a click that started inside the panel and drifted out.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-print="hide"
    >
      <div
        ref={panelRef}
        className={cx(
          styles.panel,
          wide && styles.panelWide,
          placement === 'side' && styles.panelSide,
          className,
        )}
        // Tells screen readers this is a window demanding attention, and that
        // everything behind it is unavailable until it closes.
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {placement === 'center' ? <div className={styles.grabber} aria-hidden="true" /> : null}

        {title ? (
          <div className={styles.header}>
            <div className={styles.headerText}>
              <Text variant="h3" id={titleId}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="small" tone="ink2">
                  {subtitle}
                </Text>
              ) : null}
            </div>

            <IconButton icon="close" label={'Close'} variant="plain" onClick={onClose} />
          </div>
        ) : null}

        <div className={styles.body}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}

// ---- DIALOG ----
// A small box asking one question, with a confirm and a cancel. Used for
// cancelling a rental, signing out, and deleting a vehicle.
export function Dialog({
  open,
  onClose,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  // Colours the confirm button red, for anything that cannot be undone.
  destructive = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      className={styles.panelDialog}
      footer={
        <>
          <Button label={cancelLabel} variant="outline" size="md" onClick={onClose} />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            size="md"
            loading={loading}
            onClick={onConfirm}
          />
        </>
      }
    >
      {body ? (
        <Text variant="body" tone="ink2">
          {body}
        </Text>
      ) : null}
    </Sheet>
  );
}
