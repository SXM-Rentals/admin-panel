// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the rule the whole panel rests on — a change
// cannot be made without a written reason, and making one always leaves an entry
// in the audit log.
//
// WHY THIS IS THE MOST IMPORTANT TEST IN THE REPOSITORY. The admin brief names
// account-change tracking as the defining requirement, and one flat access level
// is only defensible because of it: everybody can do everything, and everything
// anybody does is on the record. That trade collapses the moment a change can be
// made without leaving a trace.
//
// The design that makes it hold is that ReasonDialog is the only way to make a
// change, and it writes the entry itself rather than trusting each screen to
// remember. These tests check that piece directly, because it is the piece the
// promise depends on.

import { describe, expect, it, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { allAuditEntries, clearLiveAuditEntries } from '@/lib/mock/audit';

// The dialog reads who is signed in, and the test provider starts signed out.
// Signing in is what the panel itself does before any of this is reachable.
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    useAdminSession: () => ({
      staff: { id: 's1', name: 'Kayla Brooks', email: 'kayla@sxmrentals.com', avatarInitials: 'KB' },
      isSignedIn: true,
      loading: false,
      signIn: async () => {},
      signOut: async () => {},
    }),
  };
});

const audit = {
  action: 'points_adjusted' as const,
  subjectType: 'customer' as const,
  subjectId: 'u1',
  subjectLabel: 'Aria Duncan',
  field: 'Rewards points',
  before: '1,240',
  after: '1,740',
};

function setup(onConfirm = vi.fn()) {
  render(
    <ReasonDialog
      open
      onClose={() => {}}
      title="Adjust rewards points"
      confirmLabel="Adjust points"
      audit={audit}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe('a change cannot be made without a reason', () => {
  beforeEach(() => {
    clearLiveAuditEntries();
  });

  it('will not go through with the reason box empty', async () => {
    const onConfirm = setup();

    const confirm = screen.getByRole('button', { name: /adjust points/i });
    expect(confirm).toBeDisabled();

    // Nothing happened, so nothing should have been written either.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(allAuditEntries().some((entry) => entry.subjectId === 'u1' && entry.reason === '')).toBe(
      false,
    );
  });

  it('will not accept a reason too short to mean anything', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/reason/i), 'ok');

    expect(screen.getByRole('button', { name: /adjust points/i })).toBeDisabled();
  });

  it('writes an audit entry carrying the who, the what and the why', async () => {
    const user = userEvent.setup();
    const onConfirm = setup();

    const reason = 'Goodwill after the vehicle was delivered two hours late.';
    await user.type(screen.getByLabelText(/reason/i), reason);

    const confirm = screen.getByRole('button', { name: /adjust points/i });
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(reason));

    const entry = allAuditEntries().find((e) => e.reason === reason);
    expect(entry).toBeDefined();
    expect(entry!.staffName).toBe('Kayla Brooks');
    expect(entry!.subjectLabel).toBe('Aria Duncan');
    expect(entry!.field).toBe('Rewards points');
    expect(entry!.before).toBe('1,240');
    expect(entry!.after).toBe('1,740');
    expect(entry!.action).toBe('points_adjusted');
  });

  it('records the change before performing it, so a failure still leaves a trace', async () => {
    const user = userEvent.setup();
    // A change that fails — a network error, a rejected write. The record of the
    // attempt should survive it.
    const failing = vi.fn().mockRejectedValue(new Error('the server said no'));
    setup(failing);

    const reason = 'Correcting a double credit on the same booking.';
    await user.type(screen.getByLabelText(/reason/i), reason);
    await user.click(screen.getByRole('button', { name: /adjust points/i })).catch(() => {});

    await waitFor(() => {
      expect(allAuditEntries().some((e) => e.reason === reason)).toBe(true);
    });
  });

  it('shows what is about to change before it changes', () => {
    setup();

    // Both values on screen, so somebody clicking through five of these in a row
    // can still see which one they are on.
    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('1,740')).toBeInTheDocument();
    expect(screen.getByText('Aria Duncan')).toBeInTheDocument();
  });
});
