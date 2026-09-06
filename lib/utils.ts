// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Small shared helpers used all over the site. Mostly the
// "cx" function below, which builds the list of style names an element should
// carry while quietly dropping any that do not apply.

// Joins style names together, ignoring anything false, undefined or empty.
// It lets a component write its styling as a plain list of conditions:
//
//   cx(styles.button, isActive && styles.active, disabled && styles.disabled)
//
// without having to check each one first or end up with stray spaces.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// Keeps a number inside a range. Used by the charts, where a stray value must
// never draw a bar wider than its container.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
