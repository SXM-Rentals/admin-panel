'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every box someone types into — a plain text box, a
// password box with a show/hide eye, and a larger box for a paragraph.
//
// WHAT THIS FILE IS REALLY FOR: getting the wiring right so that every form on
// the site is usable, rather than each page reinventing it. Three things matter
// and are easy to get wrong:
//
//   1. The label has to be JOINED to the box, not merely sitting above it.
//      Joined, clicking the label puts the cursor in the box, and a screen
//      reader announces what the box is for. Unjoined, it is decoration.
//   2. An error message has to be ANNOUNCED, not just shown in red. Someone who
//      cannot see the colour, or who is listening to the page, otherwise has no
//      idea why the form will not submit.
//   3. Every box needs a unique id for that joining to work, and generating them
//      by hand across a large site guarantees duplicates. React's useId does it.

import React, { useId, useState } from 'react';
import { cx } from '@/lib/utils';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import styles from './Input.module.css';

type SharedProps = {
  label?: string;
  // A message shown in red underneath when the entry is not valid.
  error?: string;
  // A quieter explanatory line underneath, shown when there is no error.
  hint?: string;
  // A small picture inside the box on the left, e.g. a person or an envelope.
  iconLeft?: IconName;
  // Anything to show inside the box on the right.
  right?: React.ReactNode;
  className?: string;
  containerClassName?: string;
};

export type InputProps = SharedProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>;

export function Input({
  label,
  error,
  hint,
  iconLeft,
  right,
  className,
  containerClassName,
  id,
  required,
  disabled,
  ...rest
}: InputProps) {
  // A unique id per box, so the label below can point at exactly this one.
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cx(styles.field, containerClassName)}>
      {label ? (
        <label htmlFor={inputId}>
          <Text variant="label" tone="ink2" as="span">
            {label}
          </Text>
          {required ? (
            <span aria-hidden="true" className="tone-danger">
              {' *'}
            </span>
          ) : null}
        </label>
      ) : null}

      <div
        className={cx(styles.box, error && styles.errorBox, disabled && styles.disabledBox)}
      >
        {iconLeft ? (
          <span className={styles.icon}>
            <Icon name={iconLeft} size={19} />
          </span>
        ) : null}

        <input
          id={inputId}
          className={cx(styles.input, className)}
          required={required}
          disabled={disabled}
          // Tells screen readers this entry is currently rejected.
          aria-invalid={error ? true : undefined}
          // Points at the message underneath so it is read out along with the
          // box, rather than being stranded as unrelated text.
          aria-describedby={message ? messageId : undefined}
          {...rest}
        />

        {right}
      </div>

      {message ? (
        <div
          id={messageId}
          className={styles.message}
          // "assertive" interrupts to announce a new error straight away. A
          // plain hint does not interrupt, because it has not changed.
          role={error ? 'alert' : undefined}
        >
          {error ? <Icon name="alert-circle-outline" size={15} /> : null}
          <Text variant="small" tone={error ? 'danger' : 'ink3'} as="span">
            {message}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

// ---- PASSWORD ----
// A password box with an eye to reveal what has been typed. Worth having: most
// mistyped passwords are caught instantly by being able to look at them, and
// hiding them with no way to check causes far more failed sign-ins than it
// prevents shoulder-surfing.
export function PasswordInput(props: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      right={
        <IconButton
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          label={visible ? 'Hide password' : 'Show password'}
          variant="plain"
          size="sm"
          onClick={() => setVisible((current) => !current)}
        />
      }
    />
  );
}

// ---- A LARGER BOX FOR A PARAGRAPH ----
// Used for a car's description, a message to a rental business, and the reason
// given when cancelling.
export type TextAreaProps = SharedProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
    // Shows "120 / 500" underneath so nobody is cut off mid-sentence by a limit
    // they were never told about.
    showCount?: boolean;
  };

export function TextArea({
  label,
  error,
  hint,
  className,
  containerClassName,
  id,
  required,
  disabled,
  showCount = false,
  maxLength,
  value,
  rows = 4,
  ...rest
}: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <div className={cx(styles.field, containerClassName)}>
      {label ? (
        <div className={styles.labelRow}>
          <label htmlFor={inputId}>
            <Text variant="label" tone="ink2" as="span">
              {label}
            </Text>
            {required ? (
              <span aria-hidden="true" className="tone-danger">
                {' *'}
              </span>
            ) : null}
          </label>

          {showCount && maxLength ? (
            <Text variant="caption" tone="ink3" as="span">
              {`${length} / ${maxLength}`}
            </Text>
          ) : null}
        </div>
      ) : null}

      <div
        className={cx(
          styles.box,
          styles.textareaBox,
          error && styles.errorBox,
          disabled && styles.disabledBox,
        )}
      >
        <textarea
          id={inputId}
          className={cx(styles.input, styles.textarea, className)}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...rest}
        />
      </div>

      {message ? (
        <div id={messageId} className={styles.message} role={error ? 'alert' : undefined}>
          {error ? <Icon name="alert-circle-outline" size={15} /> : null}
          <Text variant="small" tone={error ? 'danger' : 'ink3'} as="span">
            {message}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

export default Input;
