// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The site's buttons — the rounded "pill" shapes you click
// to move forward, like "Book Now" or "Continue".
//
// There are five looks:
//   primary   — the solid dark button used for the main action on a page
//   secondary — a soft grey button for a second, less important choice
//   outline   — just a thin outline, for quieter actions
//   ghost     — text only, no background, for the quietest actions
//   danger    — for cancelling or deleting
//
// ONE IMPORTANT DIFFERENCE FROM THE PHONE APP: a button that takes you to
// another page is written out as a real link, not as a button that runs some
// code. Pass "href" and you get a proper <a> tag. That matters on a website in a
// way it never does on a phone — middle-clicking, "open in new tab", copying the
// address, and the browser showing where a link goes before you click it all
// stop working if navigation is faked with a button.
//
// So: href for going somewhere, onClick for doing something.

import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';
import { titleCase } from '@/lib/format';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  label: string;
  // Where it goes. Produces a real link.
  href?: string;
  // What it does. Produces a real button.
  onClick?: (event: React.MouseEvent) => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  // Stretches to fill whatever it sits in. Off by default, because on a laptop
  // most buttons sit inline in a row. The phone app defaults to the opposite,
  // where a button almost always spans the screen.
  fullWidth?: boolean;
  // Optional small pictures to sit before or after the words, e.g. an arrow.
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  // Shows a price on the left and the label on the right, like "$1,400 Pay Now".
  priceLabel?: string;
  // Forces the text colour, for a button sitting on a fixed dark background that
  // does not change with the theme.
  textColor?: string;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  // Opens in a new tab. Only for links that leave SXM Rentals.
  external?: boolean;
  title?: string;
};

export function Button({
  label,
  href,
  onClick,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  priceLabel,
  textColor,
  type = 'button',
  className,
  style,
  external = false,
  title,
}: ButtonProps) {
  const isInactive = disabled || loading;

  const classes = cx(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    isInactive && styles.disabled,
    className,
  );

  // Title Case, matching every other piece of wording on the site. Done here
  // rather than left to the text style, because a large button and a small one
  // use different styles and would otherwise come out looking different.
  const inner = (
    <>
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <>
          {priceLabel ? <span className={styles.price}>{priceLabel}</span> : null}
          {iconLeft}
          <span>{titleCase(label)}</span>
          {iconRight}
        </>
      )}
    </>
  );

  const sharedStyle = { color: textColor, ...style };

  // ---- A BUTTON THAT GOES SOMEWHERE ----
  if (href && !isInactive) {
    // Links leaving SXM Rentals get rel="noreferrer" alongside target, which
    // stops the page being opened from getting any handle back on ours.
    return (
      <Link
        href={href}
        className={classes}
        style={sharedStyle}
        title={title}
        // A price read on its own is meaningless, so the two are joined for
        // anyone listening to the page rather than looking at it.
        aria-label={priceLabel ? `${priceLabel} ${label}` : undefined}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {inner}
      </Link>
    );
  }

  // A disabled link is not a thing the browser understands — it would still be
  // clickable. So a disabled button-that-links becomes a real disabled button.

  // ---- A BUTTON THAT DOES SOMETHING ----
  return (
    <button
      type={type}
      className={classes}
      style={sharedStyle}
      onClick={onClick}
      disabled={isInactive}
      title={title}
      // Tells screen-reader software that something is in progress, rather than
      // leaving someone waiting with no idea whether their click registered.
      aria-busy={loading || undefined}
      aria-label={priceLabel ? `${priceLabel} ${label}` : undefined}
    >
      {inner}
    </button>
  );
}

export default Button;
