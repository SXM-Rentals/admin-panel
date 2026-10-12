'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: What happened when records were put back from a saved
// version — how many went back, how many were already there, anything that went back
// not quite as it was, and anything that could not go back and why.
//
// WHY IT IS A PANEL AND NOT A TOAST. Putting records back is the one action in the
// panel whose answer is a list: some went, some were left alone, some could not go,
// and each of the last group has its own reason. A message that said "done" would
// hide exactly the part somebody needs, and it would disappear before they had read
// the third reason.
//
// EVERY SENTENCE THE SERVER WRITES IS SHOWN AS WRITTEN: the detail, each note, and the
// reason each failed record gives. The panel adds nothing to what they say, with one
// exception that is not a rewrite: the server's detail already ends with the first few
// notes joined on, so that tail is lifted off before the notes are listed beneath it.
// Left in, the same sentences would be read twice.
//
// WHEN SOMETHING COULD NOT GO BACK BECAUSE WHAT IT BELONGS TO IS STILL DELETED — a car
// whose business is gone, a booking whose customer is — the panel says what to do about
// it and puts the button for it right there. The server already knows the right order
// (customers, businesses, cars, payouts, bookings and the rest); somebody restoring a
// single car does not, and should not have to.

import React from 'react';
import type { RestoreResult as Result, SavedKind } from '@/types';
import { Note } from '@/components/admin/shared';
import { Button, Icon, Text } from '@/components/ui';
import styles from './admin.module.css';

// The server's detail ends with the first five notes joined by spaces. Take exactly
// that tail off when it is there, and nothing else.
export function detailWithoutNotes(detail: string, notes: string[]): string {
  const tail = notes.slice(0, 5).join(' ');
  if (tail && detail.endsWith(tail)) return detail.slice(0, detail.length - tail.length).trim();
  return detail.trim();
}

// Whether a reason is the server saying that something has to be put back first.
// Matches the wording the server uses for it, not a guess at meaning.
export function needsSomethingPutBackFirst(why: string): boolean {
  return /back first|since been deleted|is not there/i.test(why);
}

export function RestoreResult({
  result,
  kinds,
  suggestion,
  onDismiss,
}: {
  result: Result;
  kinds: SavedKind[];
  // THE BUTTON FOR PUTTING EVERYTHING BACK, already wired to its own confirmation,
  // shown only when the failures say something has to go back first. Handed in as a
  // finished button rather than as a callback so that pressing it opens the real
  // dialog — with the code and the same wording as everywhere else — instead of
  // being a second, lesser way of doing the same thing. Absent on a result that was
  // already "everything", where there is nothing wider to suggest.
  suggestion?: React.ReactNode;
  onDismiss: () => void;
}) {
  const labelFor = (kind: string) => kinds.find((entry) => entry.kind === kind)?.label ?? kind.replace(/_/g, ' ');
  const lead = detailWithoutNotes(result.detail, result.notes);
  const kindsTouched = Object.entries(result.byKind);
  const suggestEverything =
    suggestion !== undefined && result.failed.some((record) => needsSomethingPutBackFirst(record.why));

  return (
    <div className={styles.restoreResult} role="status" aria-live="polite">
      <div className={styles.restoreHead}>
        <Icon
          name={result.failedCount > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          size={18}
          color={result.failedCount > 0 ? 'var(--warning)' : 'var(--success)'}
        />
        <Text variant="label" as="p" raw>
          {lead}
        </Text>
        <Button label="Dismiss" variant="ghost" size="sm" onClick={onDismiss} />
      </div>

      {/* ---- WENT BACK, BUT NOT QUITE AS IT WAS ---- */}
      {result.notes.length > 0 ? (
        <ul className={styles.restoreList}>
          {result.notes.map((note, index) => (
            <li key={index}>
              <Text variant="small" tone="ink2" as="span" raw>
                {note}
              </Text>
            </li>
          ))}
        </ul>
      ) : null}

      {/* ---- A LINE PER KIND, from the server's own list of what it holds ---- */}
      {kindsTouched.length > 0 ? (
        <div className={styles.restoreKinds}>
          {kindsTouched.map(([kind, tally]) => (
            <Text key={kind} variant="caption" tone="ink3" as="span" raw>
              {labelFor(kind)}: {tally.restored} back
              {tally.alreadyThere > 0 ? `, ${tally.alreadyThere} already there` : ''}
              {tally.failed > 0 ? `, ${tally.failed} could not` : ''}
            </Text>
          ))}
        </div>
      ) : null}

      {/* ---- WHAT COULD NOT GO BACK, each with its own reason as written ---- */}
      {result.failed.length > 0 ? (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <Text variant="caption" tone="ink3" as="p" raw>
            COULD NOT BE PUT BACK — THE REST WENT
            {result.failedCount > result.failed.length
              ? ` (${result.failed.length} of ${result.failedCount} shown)`
              : ''}
          </Text>
          <ul className={styles.restoreList}>
            {result.failed.map((record) => (
              <li key={record.id}>
                <Text variant="small" as="span" raw>
                  {record.summary}
                </Text>
                <Text variant="small" tone="ink3" as="span" raw>
                  {' — '}
                  {record.why}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggestEverything ? (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <Note icon="warning-outline" tone="ink2">
            Something these belong to is still deleted, so they have nowhere to go back to. Putting
            everything back does it in the right order — customers, then businesses, cars, payouts,
            bookings and the rest — and puts back only what is missing.
          </Note>
          <div style={{ marginTop: 'var(--space-sm)' }}>{suggestion}</div>
        </div>
      ) : null}
    </div>
  );
}

export default RestoreResult;
