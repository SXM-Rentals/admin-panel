// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the rule the whole panel rests on — a change
// cannot be made without a written reason — and that when a change fails, the
// person is told the truth about it.
//
// WHY THIS IS THE MOST IMPORTANT TEST IN THE REPOSITORY. The admin brief names
// account-change tracking as the defining requirement, and one flat access level
// is only defensible because of it: everybody can do everything, and everything
// anybody does is on the record, with a reason. That trade collapses the moment
// a change can be made without one.
//
// WHAT CHANGED, AND WHY THESE TESTS CHANGED WITH IT. This file used to check
// that the dialog wrote an audit entry itself, even for a change that then
// failed. The dialog no longer writes the entry: the SXM Rentals server does,
// and it refuses any change that arrives without a reason. So the guarantee
// worth testing here moved. It is now two things. The reason always reaches the
// server, exactly as written. And a failed change never looks like a successful
// one — on screens that approve refunds and keep deposits, somebody walking away
// believing money moved when it did not is the worst thing this panel can do.

import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { ApiError, NetworkError } from '@/lib/api/errors';

const change = {
  subjectLabel: 'Aria Duncan',
  field: 'Rewards points',
  before: '1,240',
  after: '1,740',
};

async function setup(onConfirm: ReturnType<typeof vi.fn> = vi.fn(), extra: { amountMax?: number } = {}) {
  const onClose = vi.fn();
  render(
    <ReasonDialog
      open
      onClose={onClose}
      title="Adjust rewards points"
      confirmLabel="Adjust points"
      change={change}
      amount={extra.amountMax ? { label: 'Amount to keep', max: extra.amountMax } : undefined}
      onConfirm={onConfirm}
    />,
  );

  // WAIT FOR THE DIALOG TO PUT THE CURSOR IN ITS FIRST BOX. It does that a
  // moment after it opens — one animation frame — and a click made inside that
  // moment loses its focus to it, so whatever is typed next lands in the wrong
  // box. A person cannot click that fast; a test can, and did: a reason pasted
  // into the amount box read "…photographed at return.600". Every test here
  // waits for the dialog to settle before touching it.
  await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));

  return { onConfirm, onClose };
}

const confirmButton = () => screen.getByRole('button', { name: /adjust points/i });

// Puts a whole reason into the box in one go, the way pasting does. Typing a
// sixty-character sentence one key at a time is what these tests used to do,
// and on a slow, busy machine it took long enough to fail for reasons that had
// nothing to do with the dialog. What is being checked here is what happens to
// the reason, not how fast a keyboard is.
async function enterReason(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByLabelText(/reason/i));
  await user.paste(text);
}

describe('a change cannot be made without a reason', () => {
  it('will not go through with the reason box empty', async () => {
    const { onConfirm } = await setup();

    expect(confirmButton()).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('will not accept a reason too short to mean anything', async () => {
    const user = userEvent.setup();
    await setup();

    await user.type(screen.getByLabelText(/reason/i), 'ok');

    expect(confirmButton()).toBeDisabled();
  });

  it('sends the reason to the server exactly as it was written', async () => {
    const user = userEvent.setup();
    const { onConfirm } = await setup();

    const reason = 'Goodwill after the vehicle was delivered two hours late.';
    await enterReason(user, `  ${reason}  `);
    await user.click(confirmButton());

    // Trimmed, and otherwise untouched. The server writes this into the log.
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(reason, undefined));
  });

  it('stops at the thousand characters the server will accept', async () => {
    await setup();

    // A longer reason would be refused outright by the server, so the box
    // simply stops taking more rather than letting somebody write one and have
    // it thrown back.
    expect(screen.getByLabelText(/reason/i)).toHaveAttribute('maxLength', '1000');
  });

  it('shows what is about to change before it changes', async () => {
    await setup();

    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('1,740')).toBeInTheDocument();
    expect(screen.getByText('Aria Duncan')).toBeInTheDocument();
  });
});

describe('a failed change never looks like one that went through', () => {
  const reason = 'Customer asked in writing for their account to be closed.';

  it('shows the server’s own explanation when it refuses, and stays open with the reason kept', async () => {
    const user = userEvent.setup();
    const refusing = vi.fn().mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'has_held_deposit',
        message: 'A deposit is still being held for this account. It cannot be closed yet.',
      }),
    );
    const { onClose } = await setup(refusing);

    await enterReason(user, reason);
    await user.click(confirmButton());

    expect(
      await screen.findByText(/A deposit is still being held for this account\. It cannot be closed yet\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing was changed\./)).toBeInTheDocument();

    // Still open, with the reason still typed, so it can simply be tried again.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/reason/i)).toHaveValue(reason);
    expect(screen.queryByText(/Done, and written to the audit log/)).not.toBeInTheDocument();
  });

  it('does not claim nothing changed when the connection dropped and nobody can know', async () => {
    const user = userEvent.setup();
    // The request went out; no answer came back. It may well have landed.
    const dropped = vi.fn().mockRejectedValue(new NetworkError('The request took too long.'));
    await setup(dropped);

    await enterReason(user, reason);
    await user.click(confirmButton());

    expect(await screen.findByText(/could not confirm whether this went through/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing was changed/)).not.toBeInTheDocument();
  });
});

describe('keeping part of a deposit needs an amount the server will accept', () => {
  const reason = 'Kerbed alloy on the front nearside, photographed at return.';

  it('will not go through without an amount', async () => {
    const user = userEvent.setup();
    await setup(vi.fn(), { amountMax: 500 });

    await enterReason(user, reason);

    expect(confirmButton()).toBeDisabled();
  });

  it('refuses more than is being held', async () => {
    const user = userEvent.setup();
    await setup(vi.fn(), { amountMax: 500 });

    await enterReason(user, reason);
    await user.type(screen.getByLabelText(/amount to keep/i), '600');
    await user.tab();

    expect(confirmButton()).toBeDisabled();
    expect(screen.getByText(/more than the \$500/)).toBeInTheDocument();
  });

  it('accepts dollars and cents exactly as typed — including amounts a computer rounds badly', async () => {
    const user = userEvent.setup();
    const { onConfirm } = await setup(vi.fn(), { amountMax: 500 });

    await enterReason(user, reason);
    // 2.30 × 100 is 229.99999999999997 to a computer. A check built on that
    // arithmetic would refuse a perfectly ordinary amount.
    await user.type(screen.getByLabelText(/amount to keep/i), '2.30');
    await user.click(confirmButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0]).toEqual([reason, 2.3]);
  });
});
