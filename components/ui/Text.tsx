// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The site's text. Instead of every page deciding its own
// font size and colour, pages ask for a named style — "h1" for a big heading,
// "body" for normal writing, "small" for fine print — and this file makes it
// look right in both light and dark mode.
//
// IT ALSO APPLIES TITLE CASE TO HEADINGS AUTOMATICALLY. Every heading on the
// site reads "Your Business Profile" rather than "Your business profile", and
// doing it here rather than by hand means new headings cannot drift back to
// sentence case over time.

import React from 'react';
import { cx } from '@/lib/utils';
import { titleCase } from '@/lib/format';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLg'
  | 'body'
  | 'label'
  | 'small'
  | 'caption';

// Which colour the text should be. "ink" is the strong main colour, "ink2" is
// quieter supporting text, "ink3" is the faintest.
type Tone = 'ink' | 'ink2' | 'ink3' | 'brand' | 'danger' | 'success' | 'warning' | 'onPrimary';

export type TextProps = {
  variant?: Variant;
  tone?: Tone;
  // Which HTML tag to actually produce. This matters for more than looks: a
  // screen reader builds its list of page headings from real h1/h2/h3 tags, and
  // search engines read them too. Looking like a heading is not the same as
  // being one, so pages should pass the right tag rather than relying on the
  // sensible default below.
  as?: React.ElementType;
  align?: 'left' | 'center' | 'right';
  weight?: number | string;
  // Leaves the wording exactly as written, switching off the automatic Title
  // Case applied to headings. Used for button labels and for the few places
  // where a heading-sized style is holding an ordinary sentence.
  raw?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  id?: string;
  title?: string;
  htmlFor?: string;
};

// The styles that count as headings. Anything using one of these is put into
// Title Case automatically.
const HEADING_VARIANTS: Variant[] = ['h1', 'h2', 'h3', 'label'];

// The tag each style produces when a page does not say otherwise.
const DEFAULT_TAG: Record<Variant, React.ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  bodyLg: 'p',
  body: 'p',
  label: 'span',
  small: 'p',
  caption: 'span',
};

export function Text({
  variant = 'body',
  tone = 'ink',
  as,
  align,
  weight,
  raw = false,
  className,
  style,
  children,
  ...rest
}: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant];

  // ---- TITLE CASE ON HEADINGS ----
  // Only plain wording is touched. Anything built from several pieces — a car's
  // make and model, a price, a name — is left exactly as it is, because those
  // are already written the way they should read.
  const content =
    !raw && HEADING_VARIANTS.includes(variant) && typeof children === 'string'
      ? titleCase(children)
      : children;

  return (
    <Tag
      className={cx(`t-${variant}`, `tone-${tone}`, className)}
      style={{
        textAlign: align,
        fontWeight: weight,
        ...style,
      }}
      {...rest}
    >
      {content}
    </Tag>
  );
}

export default Text;
