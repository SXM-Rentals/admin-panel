// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that when SXM Rentals refuses to do something and
// says why, the member of staff is shown that reason and not a replacement.
//
// WHY THIS IS A RULE AND NOT A DETAIL: the panel used to run every failure
// through a list of patterns, and anything the list did not recognise came out
// as "Something went wrong. Please try again." Once there is a real server, that
// list is actively harmful — it is the difference between a person being told
// "This customer still has a rental running" and being told nothing useful at
// all, on a screen where the next thing they do involves somebody's money.
//
// The trap worth guarding is subtler than it looks: the server's message can
// happen to contain a word the old list matched on. A refusal explaining that a
// booking was "not found" would have been rewritten into the panel's own wording
// and lost the part that mattered. So the first test below is deliberately built
// around exactly that collision.

import { describe, it, expect } from 'vitest';
import { ApiError, NetworkError, presentError } from '@/lib/api/errors';

describe('when the server explains itself, the person hears the server', () => {
  it('shows the refusal exactly as it was written', () => {
    const refusal = new ApiError({
      status: 409,
      code: 'has_live_rental',
      message: 'This customer still has a rental running. Close it first.',
      requestId: 'req-1',
    });

    expect(presentError(refusal)).toBe(
      'This customer still has a rental running. Close it first.',
    );
  });

  it('does not rewrite a message that happens to contain words the panel once matched on', () => {
    // "not found" used to be matched and replaced. The server's sentence says
    // far more than the replacement would have.
    const refusal = new ApiError({
      status: 404,
      code: 'not_found',
      message: 'That booking was not found — it may have been cancelled and removed.',
    });

    expect(presentError(refusal)).toBe(
      'That booking was not found — it may have been cancelled and removed.',
    );
  });

  it('never lets a refusal fall through to the panel’s catch-all wording', () => {
    const refusal = new ApiError({
      status: 503,
      code: 'stripe_unavailable',
      message: 'Refunds cannot be approved until Stripe is connected.',
    });

    expect(presentError(refusal)).not.toBe('Something went wrong. Please try again.');
    expect(presentError(refusal)).toBe('Refunds cannot be approved until Stripe is connected.');
  });
});

describe('when the server was never reached, the panel supplies the words', () => {
  it('turns a raw browser fault into something a person can act on', () => {
    const shown = presentError(new TypeError('Failed to fetch'));

    expect(shown).not.toContain('Failed to fetch');
    expect(shown).toBe('We could not reach SXM Rentals. Check your connection and try again.');
  });

  it('says the server is waking rather than that it is broken', () => {
    const shown = presentError(new NetworkError('The request took too long.', true));

    expect(shown).toContain('waking up');
  });

  it('falls back to plain wording for anything else', () => {
    expect(presentError(new Error('something unexpected'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
