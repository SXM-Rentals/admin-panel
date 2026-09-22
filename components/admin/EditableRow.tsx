'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: A row on a detail screen showing a value that a member of
// staff is allowed to change — an email address, a phone number, a business
// name. Clicking Edit turns it into a box; saving opens the reason dialog and
// writes the change to the audit log.
//
// ONE FIELD AT A TIME, AND THAT IS THE WHOLE DESIGN. It would be easy to put the
// card into an "edit mode" where six fields become boxes and one Save button
// commits them together. It would also make the audit log useless: an entry
// records one field with a before and an after, so a six-field save either
// writes six entries with one shared reason that explains none of them, or one
// entry saying "account updated" with no way to see what actually changed.
//
// Editing one field at a time produces exactly the record the log is shaped for:
// this person changed this field from this to that, for this reason, at this
// time. It is slightly slower to use and enormously more useful to read, and
// reading it is the entire point of keeping it.
//
// This is the component that makes "every account update is logged" true for
// account updates, the same way ReasonDialog makes it true for approvals.

import React, { useState } from 'react';
import { ReasonDialog } from './ReasonDialog';
import { Button, Icon, Text } from '@/components/ui';
import type { AuditEntry } from '@/types';
import styles from './admin.module.css';

export type EditableRowProps = {
  label: string;
  value: string;
  // What to call this field in the audit log. Usually the same as the label.
  auditField?: string;
  // What the record being changed is, for the log.
  subjectType: AuditEntry['subjectType'];
  subjectId: string;
  subjectLabel: string;
  // A fixed set of choices instead of a free-text box, e.g. Local or Tourist.
  options?: { value: string; label: string }[];
  inputType?: 'text' | 'email' | 'tel' | 'url';
  // Some fields legitimately have no value — a business with no website.
  emptyText?: string;
  // A line under the box explaining anything that follows from the change.
  hint?: string;
  // Given the new value AND the reason typed into the dialog. The reason used to
  // stop here — the dialog kept it for its own log entry and the save never saw
  // it. Now the server writes the log entry, so the save has to carry the reason
  // there with the change, or the server refuses it.
  onSave: (next: string, reason: string) => Promise<void> | void;
};

export function EditableRow({
  label,
  value,
  auditField,
  subjectType,
  subjectId,
  subjectLabel,
  options,
  inputType = 'text',
  emptyText = 'None on file',
  hint,
  onSave,
}: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [confirming, setConfirming] = useState(false);

  const start = () => {
    setDraft(value);
    setEditing(true);
  };

  const changed = draft.trim() !== value.trim() && draft.trim().length > 0;

  // The label shown for a choice, so the audit entry reads "Tourist → Local"
  // rather than "tourist → local".
  const readable = (raw: string) =>
    options?.find((o) => o.value === raw)?.label ?? raw ?? emptyText;

  return (
    <>
      <div className={styles.infoRow}>
        <Text variant="small" tone="ink3" as="span" raw>
          {label}
        </Text>

        {editing ? (
          <div className={styles.editControl}>
            {options ? (
              <select
                className={styles.select}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label={label}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={styles.editInput}
                type={inputType}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label={label}
                autoFocus
              />
            )}

            <Button
              label="Save"
              variant="secondary"
              size="sm"
              disabled={!changed}
              onClick={() => setConfirming(true)}
            />
            <Button label="Cancel" variant="ghost" size="sm" onClick={() => setEditing(false)} />
          </div>
        ) : (
          <span className={styles.editControl}>
            <Text variant="label" tone={value ? 'ink' : 'ink3'} as="span" raw>
              {value ? readable(value) : emptyText}
            </Text>
            {/* A quiet pencil rather than a button on every row. The rows are
                mostly read, and a column of Edit buttons would make the record
                look like a form. */}
            <button
              type="button"
              className={styles.editButton}
              onClick={start}
              aria-label={`Edit ${label.toLowerCase()}`}
              title={`Edit ${label.toLowerCase()}`}
            >
              <Icon name="create-outline" size={15} />
            </button>
          </span>
        )}
      </div>

      <ReasonDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Change ${label.toLowerCase()}`}
        description={
          hint ??
          'Account changes are what the audit log exists to record, so this one needs a reason.'
        }
        confirmLabel="Save change"
        reasonPlaceholder="e.g. Customer could not receive booking confirmations; new address confirmed by phone."
        change={{
          subjectLabel,
          field: auditField ?? label,
          before: value ? readable(value) : emptyText,
          after: readable(draft.trim()),
        }}
        onConfirm={async (reason) => {
          await onSave(draft.trim(), reason);
          setEditing(false);
        }}
      />
    </>
  );
}

export default EditableRow;
