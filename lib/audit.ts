// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Writes a line in the audit log every time a member of
// staff changes something. Who did it, what they changed, what the value was
// before and after, why, and when.
//
// WHY THIS IS ONE SHARED FUNCTION RATHER THAN CODE ON EACH SCREEN: the audit log
// is the defining requirement of this panel, and a log is only worth having if
// it is complete. Twelve screens each writing their own version of "record this"
// is twelve chances for one of them to forget, or to record it in a slightly
// different shape that the filter then cannot find. One function, called from
// one dialog, is what makes "every change is logged" a fact about the code
// rather than a hope about the people writing it.
//
// THE PAIRING THAT MAKES IT WORK: every action that changes something goes
// through components/admin/ReasonDialog.tsx, and that dialog will not submit
// without a written reason. So the reason field below can be required rather
// than optional — there is no path through the panel that produces a change
// without one.
//
// MOCK. TODO: replace the append below with POST /admin/audit. Right now entries
// are held in memory and disappear on a page refresh, which is honest about what
// this is: the shape of the feature, not the feature.

import { appendAuditEntry } from '@/lib/mock/audit';
import type { AuditAction, AuditEntry } from '@/types';

export type AuditDraft = {
  staffId: string;
  staffName: string;
  action: AuditAction;
  subjectType: AuditEntry['subjectType'];
  subjectId: string;
  // What was acted on, in words a person will recognise a year from now:
  // "Aria Duncan", "Toyota RAV4 · SXM-V-118", "Booking SXM-4228".
  subjectLabel: string;
  // Which field changed: "Rewards points", "Insurance document".
  field: string;
  // The values as they should READ, not as they are stored. "Explorer" rather
  // than 2, "$500" rather than 50000. Somebody reading this later has no access
  // to the database to look up what a number meant.
  before: string;
  after: string;
  // Required. This is the whole point.
  reason: string;
};

export function recordAuditEntry(draft: AuditDraft): AuditEntry {
  const entry: AuditEntry = {
    id: `au-live-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    at: new Date().toISOString(),
    ...draft,
  };

  appendAuditEntry(entry);
  return entry;
}

// Turns a value into the way it should appear in a log line. Small, but it is
// the difference between a row that reads "1,240 → 1,740" and one that reads
// "1240 → 1740", and the log is a document people read rather than a table
// people scan.
export function auditValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
}
