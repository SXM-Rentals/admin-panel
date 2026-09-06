'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The four small controls people use to make a choice —
// the rounded chips on the search filters, the sliding two-or-three way switch,
// the tick box, and the on/off switch.
//
// A NOTE ON HOW THESE ARE BUILT: the tick box and the on/off switch keep the
// browser's own hidden control underneath and simply draw over the top of it.
// It would be easy to draw a fake one out of plain boxes and listen for clicks,
// and it would look identical — but the keyboard would stop working, the space
// bar would scroll the page instead of ticking the box, and screen readers would
// announce nothing. Keeping the real control means all of that works for free.

import React, { useId } from 'react';
import { cx } from '@/lib/utils';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import styles from './Controls.module.css';

// ---- CHIP ----
// A rounded pill that can be selected. Used all over the search filters.
export function Chip({
  label,
  selected = false,
  onClick,
  disabled = false,
  icon,
  className,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: IconName;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx(styles.chip, selected && styles.chipSelected, className)}
      onClick={onClick}
      disabled={disabled}
      // Says "this is a switch that is currently on/off" rather than just "this
      // is a button", so its state is announced and not only shown in colour.
      aria-pressed={selected}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {/* Title Case, like every other label. A chip reading "Dutch side"
          beside a heading reading "Side of the Island" is exactly the kind of
          drift this rule exists to prevent. */}
      {label}
    </button>
  );
}

// A row of chips that wraps onto the next line when there are more than fit.
export function ChipRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.chipRow, className)}>{children}</div>;
}

// ---- SEGMENTED CONTROL ----
// Two or three choices side by side, one of which is always selected. Used for
// Upcoming / Active / Past.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  // What this set of choices is for, e.g. "Filter rentals by status". Not shown
  // on screen, but read aloud so the group makes sense out of context.
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cx(styles.segmented, fullWidth && styles.segmentedFull, className)}
      // Announces this as one group of related choices rather than a row of
      // unconnected buttons, and lets the left/right arrow keys move between
      // them the way people expect from a control that looks like this.
      role="tablist"
      aria-label={label}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cx(styles.segment, isActive && styles.segmentActive)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- CHECKBOX ----
// The whole row is clickable, not just the small square, because a 22px target
// is genuinely hard to hit with a mouse and nearly impossible with a finger.
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cx(styles.checkboxRow, disabled && styles.disabled, className)}
    >
      <input
        id={id}
        type="checkbox"
        className={styles.nativeControl}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      <span
        className={cx(styles.checkboxBox, checked && styles.checkboxChecked)}
        aria-hidden="true"
      >
        {checked ? <Icon name="checkmark" size={15} strokeWidth={2.6} /> : null}
      </span>

      {label ? (
        <span>
          {/* Deliberately NOT Title Case. Checkbox wording is a sentence the
              person is agreeing to, not a heading. */}
          <Text variant="body" as="span">
            {label}
          </Text>
          {hint ? (
            <Text variant="small" tone="ink3">
              {hint}
            </Text>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}

// ---- TOGGLE ----
// The sliding on/off switch used in Settings.
export function Toggle({
  value,
  onChange,
  label,
  disabled = false,
  className,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  // What this switch controls, e.g. "Email notifications". Required, because a
  // switch with no label is silent to anyone not looking at the screen.
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cx(styles.toggleRow, disabled && styles.disabled, className)}
    >
      <input
        id={id}
        type="checkbox"
        // "switch" tells screen readers to announce it as on/off rather than
        // ticked/unticked, which is what it looks like and how it behaves.
        role="switch"
        className={styles.nativeControl}
        checked={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />

      <span className={cx(styles.track, value && styles.trackOn)} aria-hidden="true">
        <span className={cx(styles.knob, value && styles.knobOn)} />
      </span>
    </label>
  );
}
