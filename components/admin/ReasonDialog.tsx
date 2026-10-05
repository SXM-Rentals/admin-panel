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
import { ApiError, PartialChange, presentError } from '@/lib/api/errors';
import { money } from '@/lib/format';
import { useAdminSession } from '@/lib/auth';
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

  // ---- A LINE THE PERSON ON THE OTHER END WILL READ ----
  // Kept apart from the reason, and that separation is the whole point. The
  // reason is for the audit log and can be internal — "third request this month,
  // approved under the 48-hour rule". This is the sentence the customer reads:
  // why their refund was refused, or what was wrong with their licence photo.
  // Writing one sentence to serve both audiences produces either a log entry that
  // explains nothing or a message that should never have been sent.
  //
  // Like the amount below, one named thing rather than a slot for anything.
  customerNote?: {
    label: string;
    hint?: string;
    // Some decisions are unkind without one. A refusal with no explanation makes
    // somebody ring up to ask what to do instead.
    required?: boolean;
  };

  // ---- A REFERENCE FROM SOMEWHERE ELSE ----
  // The bank's own reference for a transfer somebody has already made. Required
  // whenever it is asked for, because a recorded payment nobody can match to a
  // bank statement is worse than no record: it looks like proof and is not.
  //
  // The third and last named field here. Each one is a specific thing with its
  // own rule, not a slot for anything — a general-purpose field is how a dialog
  // built to guarantee one rule slowly turns into a form.
  reference?: {
    label: string;
    hint?: string;
    placeholder?: string;
  };

  // ---- YOUR AUTHENTICATOR CODE, FOR THE CHANGES THAT DECIDE WHO GETS IN ----
  // Adding a member of staff, resetting one, taking one's access away. A session
  // left open on somebody's desk is enough to approve a refund; it is
  // deliberately not enough to create a new administrator or lock everybody else
  // out, so these ask for the six digits the person's own app shows right now.
  // Like the amount above, a single named thing rather than a slot for anything.
  confirmWithCode?: boolean;

  // What actually performs the change. Called only once the reason — and the
  // amount or the code, when they are asked for — passes. If it throws, the
  // dialog stays open with everything still typed, and says what went wrong.
  onConfirm: (
    reason: string,
    extras: { amount?: number; code?: string; customerNote?: string; reference?: string },
  ) => Promise<void> | void;
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
  customerNote,
  reference,
  confirmWithCode = false,
  onConfirm,
}: ReasonDialogProps) {
  const { showToast } = useToast();

  const [reason, setReason] = useState('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [code, setCode] = useState('');
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
      setCode('');
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

  // Six digits, exactly as the app shows them.
  const codeProblem = !confirmWithCode
    ? undefined
    : /^\d{6}$/.test(code)
      ? undefined
      : 'Enter the six digits your authenticator app shows now.';

  // ---- AN ACCOUNT THAT CHANGES NOTHING ----
  // Every change in this panel comes through this dialog, which makes it the one
  // place that can tell a viewer the truth wherever they pressed. Said here as
  // well as wherever the button was, because a dialog that opens and then refuses
  // without explaining is worse than a button that was never offered.
  //
  // It is not what stops them: the server refuses every change from a viewer by
  // the method of the request, whatever this panel does. See lib/tiers.ts.
  const { whyNoChanges } = useAdminSession();

  // A note that is asked for and required has to actually say something. Five
  // characters is not a sentence to send somebody.
  const noteProblem =
    !customerNote?.required || note.trim().length >= 5
      ? undefined
      : 'Write the line this person will read — it is the only explanation they get.';

  // Short enough that anything under four characters is a slip, not a reference.
  const referenceProblem =
    !reference || referenceText.trim().length >= 4
      ? undefined
      : 'Enter the reference the bank gave it — our record is matched to theirs by this alone.';

  const blocked =
    whyNoChanges !== undefined ||
    tooShort ||
    amountProblem !== undefined ||
    noteProblem !== undefined ||
    referenceProblem !== undefined ||
    codeProblem !== undefined;

  const submit = async () => {
    setTouched(true);
    if (blocked) return;

    setWorking(true);
    setProblem(undefined);

    // Only what was asked for goes back to the screen.
    const extras: { amount?: number; code?: string; customerNote?: string; reference?: string } = {};
    if (amount) extras.amount = parsedAmount;
    if (customerNote && note.trim() !== '') extras.customerNote = note.trim();
    if (reference) extras.reference = referenceText.trim();
    if (confirmWithCode) extras.code = code;

    try {
      await onConfirm(reason.trim(), extras);
    } catch (caught) {
      setWorking(false);
      // A code is good for about half a minute. Whatever went wrong, the next
      // attempt wants a fresh one, not the one that was just used.
      setCode('');

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
          : // Part of it went through. The message says which part, and adding
            // "nothing was changed" to it would be false.
            caught instanceof PartialChange
            ? presentError(caught)
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

        {whyNoChanges ? (
          <div className={styles.dialogProblem} role="alert">
            <Icon name="lock-closed-outline" size={16} color="var(--danger)" />
            <Text variant="small" as="p" raw>
              {whyNoChanges}
            </Text>
          </div>
        ) : null}

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

        {/* ---- WHAT THE OTHER PERSON READS ----
            After the reason, on purpose: the reason is why this is being done,
            and this is how it is explained to whoever it happens to. Somebody
            writing them in this order is less likely to send the first one by
            mistake. */}
        {customerNote ? (
          <TextArea
            label={customerNote.label}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            rows={3}
            maxLength={500}
            showCount
            required={customerNote.required}
            error={touched ? noteProblem : undefined}
            hint={
              customerNote.hint ??
              'Sent to them as written. Not in the audit log — the reason above is what is recorded.'
            }
          />
        ) : null}

        {reference ? (
          <Input
            label={reference.label}
            value={referenceText}
            onChange={(event) => setReferenceText(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={reference.placeholder}
            error={touched ? referenceProblem : undefined}
            hint={reference.hint ?? 'Copied from the bank, exactly as it appears there.'}
            required
          />
        ) : null}

        {confirmWithCode ? (
          <Input
            label="Your authenticator code"
            // The number pad rather than a full keyboard, and no autofill
            // guessing at it.
            inputMode="numeric"
            autoComplete="one-time-code"
            iconLeft="key-outline"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            onBlur={() => setTouched(true)}
            error={touched && code !== '' ? codeProblem : undefined}
            hint="This change decides who can get into the panel, so it needs you as well as your session: the six digits your app shows right now."
            required
          />
        ) : null}
      </div>
    </Sheet>
  );
}

export default ReasonDialog;
