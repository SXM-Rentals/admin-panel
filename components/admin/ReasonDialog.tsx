'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The pop-up that appears whenever a member of staff is
// about to change something — approve a document, reject one, decide a refund,
// keep a deposit, adjust somebody's points. It shows what is about to change,
// asks why, and will not let the change through without an answer.
//
// THIS IS THE SINGLE MOST IMPORTANT COMPONENT IN THE PANEL. The admin doc says
// every account change must be logged with who, what, before, after and when,
// and a log like that is only worth having if it is complete. So the only way to
// make a change in this panel is through this dialog, and the dialog will not
// send one without a written reason.
//
// WHO WRITES THE LOG ENTRY: THE SERVER, NOT THIS DIALOG. It used to write the
// entry itself, into a list held in the browser that vanished on a refresh. Now
// the reason goes to SXM Rentals with the change, and the server refuses any
// change that arrives without one and records the entry itself. That is a
// stronger guarantee than the old one: a log kept by the server cannot be
// skipped by a screen that forgets, or lost by a browser that closes.
//
// It also means a change that FAILS leaves no entry — the server only records
// what it actually did. The old dialog wrote the entry first, so a failed
// attempt was still on record. That was worth having, and getting it back is a
// job for the server rather than something to fake here.
//
// WHY THE REASON IS REQUIRED RATHER THAN ENCOURAGED: the reason is the only part
// of an audit entry a computer cannot reconstruct afterwards. The values, the
// timestamp and the person are all knowable from the change itself. Why it was
// done exists nowhere else, and it is the one thing anybody reading the log a
// year later actually needs — a refund denied with no reason recorded cannot be
// explained to the customer who asks about it.
//
// The bar is deliberately low: fifteen characters, which is a short sentence,
// not an essay. The aim is to stop "ok" and "fixed", not to make people write.
// The ceiling is the server's: a thousand characters.

import React, { useEffect, useState } from 'react';
import { Button, Icon, Input, Sheet, Text, TextArea, useToast } from '@/components/ui';
import { ApiError, presentError } from '@/lib/api/errors';
import { money } from '@/lib/format';
import styles from './admin.module.css';

// The shortest reason worth recording. See the note above.
const MIN_REASON = 15;
// The longest the server will accept. Anything over it is refused outright, so
// the box simply stops accepting more rather than letting somebody write an
// essay that is then thrown back at them.
const MAX_REASON = 1000;

export type ReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  // What the person is about to do, in the imperative: "Reject insurance
  // document", "Approve refund", "Adjust rewards points".
  title: string;
  // One line of context under the title, so the dialog can be understood without
  // reading the screen behind it.
  description?: string;
  // The button. Written as the action itself — "Reject document" — rather than
  // "Confirm", so the last thing somebody reads before clicking is what will
  // happen.
  confirmLabel: string;
  // Red for anything that takes money, deletes an account, or turns somebody
  // down. Those should not look like routine confirmations.
  destructive?: boolean;
  // A suggested wording, for the cases where there is an obvious one. Always
  // editable, never submitted on its own.
  reasonPlaceholder?: string;

  // ---- WHAT IS ABOUT TO CHANGE ----
  // Shown in the dialog, so somebody clicking through five of these in a row can
  // still see which one they are on. The values as they should READ: "Explorer"
  // rather than 2, "$500" rather than 50000.
  change: {
    subjectLabel: string;
    field: string;
    before: string;
    after: string;
  };

  // ---- AN AMOUNT OF MONEY, FOR THE ONE CHANGE THAT NEEDS ONE ----
  // Keeping a security deposit can mean keeping part of it: $240 against a
  // kerbed wheel, the rest returned. The server needs the figure, and it can
  // never be more than was held. This is deliberately one named, bounded thing
  // rather than a way to add any field to the dialog — a general-purpose slot
  // is how a dialog built to guarantee one rule slowly turns into a form.
  //
  // The box starts EMPTY on purpose. Filled in with the whole deposit, a person
  // pressing Enter out of habit would keep all of somebody's money.
  amount?: {
    label: string;
    // The most that can be entered: what is actually being held.
    max: number;
    hint?: string;
  };

  // What actually performs the change. Called only once the reason (and the
  // amount, if there is one) passes. If it throws, the dialog stays open with
  // everything still typed, and says what went wrong.
  onConfirm: (reason: string, amount?: number) => Promise<void> | void;
};

export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive = false,
  reasonPlaceholder = 'Why are you making this change?',
  change,
  amount,
  onConfirm,
}: ReasonDialogProps) {
  const { showToast } = useToast();

  const [reason, setReason] = useState('');
  const [amountText, setAmountText] = useState('');
  const [touched, setTouched] = useState(false);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  // Empty the box each time the dialog opens. Without this, the reason typed for
  // the last vehicle is sitting there ready to be submitted against the next
  // one, which is how a log fills up with reasons attached to the wrong thing.
  useEffect(() => {
    if (open) {
      setReason('');
      setAmountText('');
      setTouched(false);
      setWorking(false);
      setProblem(undefined);
    }
  }, [open]);

  const tooShort = reason.trim().length < MIN_REASON;

  // The amount, if one is asked for: a positive figure, in dollars and cents,
  // no more than is being held.
  //
  // CHECKED AS WRITTEN, NOT AS A NUMBER. The obvious test for "no more than two
  // decimal places" — multiply by a hundred and see if it is whole — is wrong in
  // a way that only shows on real amounts: 2.3 × 100 comes out as
  // 229.99999999999997 in a computer, and $2.30 would be refused. So the text
  // itself is checked, which is exactly what the person typed.
  const cleanedAmount = amountText.replace(/[$,\s]/g, '');
  const parsedAmount = amount ? Number(cleanedAmount) : undefined;
  const amountProblem = !amount
    ? undefined
    : cleanedAmount === ''
      ? 'Enter how much to keep.'
      : !/^\d+(\.\d{1,2})?$/.test(cleanedAmount)
        ? 'Enter an amount in dollars and cents, like 240 or 240.50.'
        : (parsedAmount ?? 0) <= 0
          ? 'Enter an amount more than nothing.'
          : (parsedAmount ?? 0) > amount.max
            ? `That is more than the ${money(amount.max)} being held.`
            : undefined;

  const blocked = tooShort || amountProblem !== undefined;

  const submit = async () => {
    setTouched(true);
    if (blocked) return;

    setWorking(true);
    setProblem(undefined);

    try {
      await onConfirm(reason.trim(), amount ? parsedAmount : undefined);
    } catch (caught) {
      setWorking(false);

      // IF THE CHANGE FAILS, SAY SO AND STAY OPEN. A dialog that closed and
      // announced "Done" whatever happened would make a change that never landed
      // look exactly like one that did — on a screen that approves refunds and
      // keeps deposits, the worst possible failure. So it stays where it is, with
      // the reason still typed, and says what happened.
      //
      // THE TWO KINDS OF FAILURE ARE WORDED DIFFERENTLY, and the difference is
      // about money. When the server answers "no", nothing changed and it has
      // said why — "a deposit is still being held for this account" — so that is
      // shown exactly as written. When the connection drops instead, we cannot
      // know: the change may have landed and only the reply been lost. Telling
      // somebody "nothing was changed" then could be false, so the panel asks
      // them to check before trying again.
      setProblem(
        caught instanceof ApiError
          ? `${presentError(caught)} Nothing was changed.`
          : 'We could not confirm whether this went through — the connection dropped before SXM Rentals answered. Refresh the page and check before trying again.',
      );
      return;
    }

    setWorking(false);
    onClose();
    showToast('Done, and written to the audit log.');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label="Cancel" variant="outline" size="md" onClick={onClose} />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            size="md"
            onClick={submit}
            loading={working}
            disabled={blocked}
          />
        </>
      }
    >
      <div className={styles.reasonBody}>
        {description ? (
          <Text variant="body" tone="ink2" as="p" raw>
            {description}
          </Text>
        ) : null}

        {/* What is about to change, shown before it changes. Somebody clicking
            through five of these in a row should still be able to see which one
            they are on. */}
        <div className={styles.changePreview}>
          <Text variant="caption" tone="ink3" as="p" raw>
            {change.field}
          </Text>
          <div className={styles.changeRow}>
            <Text variant="label" tone="ink2" as="span" raw>
              {change.before}
            </Text>
            <Icon name="arrow-forward" size={15} color="var(--ink3)" />
            <Text variant="label" tone={destructive ? 'danger' : 'success'} as="span" raw>
              {change.after}
            </Text>
          </div>
          <Text variant="small" tone="ink3" as="p" raw>
            {change.subjectLabel}
          </Text>
        </div>

        {problem ? (
          <div className={styles.dialogProblem} role="alert">
            <Icon name="alert-circle-outline" size={16} color="var(--danger)" />
            <Text variant="small" as="p" raw>
              {problem}
            </Text>
          </div>
        ) : null}

        {amount ? (
          <Input
            label={amount.label}
            inputMode="decimal"
            placeholder={`Up to ${money(amount.max)}`}
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            onBlur={() => setTouched(true)}
            error={touched ? amountProblem : undefined}
            hint={amount.hint ?? `${money(amount.max)} is being held. Whatever is not kept goes back to the customer.`}
            required
          />
        ) : null}

        <TextArea
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={reasonPlaceholder}
          rows={3}
          maxLength={MAX_REASON}
          showCount
          required
          error={touched && tooShort ? `Please give a reason of at least ${MIN_REASON} characters.` : undefined}
          hint={
            touched && tooShort
              ? undefined
              : 'Recorded in the audit log against your name. Write it for whoever reads it next year.'
          }
        />
      </div>
    </Sheet>
  );
}

export default ReasonDialog;
