// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: A button that opens a short list of things you can do to
// one record — "Modify" on a business row, opening Edit, Verification, Stop them
// trading, Close.
//
// WHY A MENU RATHER THAN MORE BUTTONS. A table row has space for two buttons.
// The moment a record has four things you might do to it, buttons either get
// dropped — and somebody goes hunting through screens for the one they need — or
// they get shortened until "Modify" and "View" sit side by side meaning the same
// thing, which is exactly what this panel had.
//
// AN ITEM THAT CANNOT BE CHOSEN SAYS WHY, AND STAYS. This is the part worth
// keeping. Some of these actions do not exist on the SXM Rentals server yet, and
// some do not apply to the record in front of you — a business with no live cars
// cannot be stopped from trading. Both are shown, greyed, with the reason
// underneath. Leaving them out would be tidier and would send somebody looking
// for a way to do it; greying one out with no explanation is worse still,
// because the obvious reading of a disabled button is "you are not allowed".
//
// IT DRAWS ITSELF THROUGH A PORTAL, ON PURPOSE. The tables scroll sideways, and
// a browser clips anything positioned inside a box that scrolls. A menu opened on
// the last row of a table would have its bottom half cut off. So the list is
// attached to the page itself and positioned from wherever the button is, which
// also lets it open upwards when it is near the bottom of the window.

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';
import styles from './ActionMenu.module.css';

export type ActionMenuItem = {
  label: string;
  // What it does. A menu item is an action, not a link: the things in here
  // change records, and several of them open a dialog first.
  onSelect?: () => void;
  icon?: IconName;
  // Red, for anything that takes money, closes an account or stops a business
  // trading.
  destructive?: boolean;
  // WHY THIS ONE CANNOT BE CHOSEN, in a few words — "the server does not offer
  // this yet", "none of their cars are live". Setting it greys the item out and
  // prints the reason under the label. Without it, an item is choosable.
  unavailable?: string;
};

export type ActionMenuProps = {
  // The button's words. "Modify", not "⋯" — a menu whose button is three dots
  // makes somebody click it to find out what is in it.
  label: string;
  items: ActionMenuItem[];
  size?: 'sm' | 'md';
  // Which edge of the button the list lines up with. Right, in a table, because
  // the actions column sits at the right-hand edge of the screen.
  align?: 'left' | 'right';
  disabled?: boolean;
};

// How much room the list needs below the button before it opens downwards. A
// rough figure on purpose: it is compared against the real gap to the bottom of
// the window, and being a little pessimistic only means opening upwards slightly
// sooner than strictly necessary.
const ROOM_NEEDED = 260;

export function ActionMenu({ label, items, size = 'sm', align = 'right', disabled = false }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  // Where on the page to draw the list. Held in state rather than worked out
  // during the render, because it comes from the button's real position.
  const [place, setPlace] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The items somebody can actually land on, in the order they are drawn, so the
  // arrow keys can walk them.
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    const next: { top?: number; bottom?: number; left?: number; right?: number } = {};

    // Upwards when there is not room below — a menu on the last row of a long
    // table is the normal case, not the exception.
    if (roomBelow < ROOM_NEEDED && rect.top > roomBelow) {
      next.bottom = window.innerHeight - rect.top + 6;
    } else {
      next.top = rect.bottom + 6;
    }

    if (align === 'right') next.right = Math.max(window.innerWidth - rect.right, 8);
    else next.left = Math.max(rect.left, 8);

    setPlace(next);
  }, [align]);

  // Before the browser paints, so the list never appears in the wrong place
  // first and jump afterwards.
  useLayoutEffect(() => {
    if (open) position();
  }, [open, position]);

  // The panel's main area scrolls under the top bar, and the list is attached to
  // the page rather than to the row, so it has to follow the button.
  useEffect(() => {
    if (!open) return;
    const follow = () => position();
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  }, [open, position]);

  // Anywhere else closes it. Listening for the press rather than the click, so a
  // press on a button elsewhere on the screen closes this and works first time.
  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPress);
    return () => document.removeEventListener('mousedown', onPress);
  }, [open]);

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    // Back to the button, so somebody working by keyboard does not get dropped
    // at the top of the page.
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const choosable = items.filter((item) => !item.unavailable && item.onSelect);

  const moveBy = (from: number, step: number) => {
    const count = choosable.length;
    if (count === 0) return;
    const next = (from + step + count) % count;
    itemRefs.current[next]?.focus();
  };

  const onListKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveBy(index, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveBy(index, -1);
    } else if (event.key === 'Tab') {
      // Tabbing out of a menu closes it, rather than leaving a list floating
      // over a screen somebody has moved on from.
      close(false);
    }
  };

  const list = (
    <div
      ref={listRef}
      className={styles.list}
      role="menu"
      aria-label={label}
      style={{ top: place.top, bottom: place.bottom, left: place.left, right: place.right }}
    >
      {items.map((item, index) => {
        // Its place among the ones that can be chosen, which is what the arrow
        // keys count in.
        const walkIndex = choosable.indexOf(item);

        if (item.unavailable || !item.onSelect) {
          return (
            <div key={item.label} className={cx(styles.item, styles.itemOff)} role="menuitem" aria-disabled="true">
              {item.icon ? <Icon name={item.icon} size={16} color="var(--ink3)" /> : null}
              <span className={styles.itemText}>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.unavailable ? <span className={styles.itemWhy}>{item.unavailable}</span> : null}
              </span>
            </div>
          );
        }

        return (
          <button
            key={item.label}
            ref={(node) => {
              itemRefs.current[walkIndex] = node;
            }}
            type="button"
            className={cx(styles.item, item.destructive && styles.itemDanger)}
            role="menuitem"
            onKeyDown={(event) => onListKeyDown(event, walkIndex)}
            onClick={() => {
              // Closed before the action runs: several of these open a dialog,
              // and a menu left hanging over it looks like a mistake.
              setOpen(false);
              item.onSelect?.();
            }}
          >
            {item.icon ? (
              <Icon name={item.icon} size={16} color={item.destructive ? 'var(--danger)' : 'var(--ink2)'} />
            ) : null}
            <span className={styles.itemText}>
              <span className={styles.itemLabel}>{item.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, size === 'md' && styles.triggerMd, open && styles.triggerOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          const opening = !open;
          setOpen(opening);
          // A click with no pointer behind it came from the keyboard — Enter or
          // Space — so the first item is focused ready for the arrow keys. A
          // mouse user gets no focus ring they did not ask for.
          if (opening && event.detail === 0) {
            requestAnimationFrame(() => itemRefs.current[0]?.focus());
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => itemRefs.current[0]?.focus());
          } else if (event.key === 'Escape' && open) {
            close(false);
          }
        }}
      >
        <span>{label}</span>
        <Icon name="chevron-down" size={14} color="var(--ink3)" />
      </button>

      {/* Attached to the page, not to the row — see the note at the top. */}
      {open && typeof document !== 'undefined' ? createPortal(list, document.body) : null}
    </>
  );
}
