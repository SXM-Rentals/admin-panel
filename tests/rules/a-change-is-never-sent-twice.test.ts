// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that asking for information again when the
// connection fails is fine, and that asking to CHANGE something again is not.
//
// WHY THIS IS WORTH A TEST OF ITS OWN: the SXM Rentals server sleeps when the
// panel has been quiet, and the request that wakes it usually fails. Trying
// again a moment later is the right answer for reading — nobody minds a customer
// list being fetched twice.
//
// It is the wrong answer for anything that moves money. "Claim $240 against this
// deposit" sent twice is $480 claimed, and the server has no way of knowing the
// second one was the panel being helpful rather than a member of staff meaning
// it. There is no way to undo that from this panel. So reads are retried and
// changes never are, and this test is what stops somebody adding a well-meaning
// retry to the wrong one later.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request } from '@/lib/api/http';
import { ApiError, NetworkError } from '@/lib/api/errors';

const originalFetch = global.fetch;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  global.fetch = originalFetch;
});

describe('a change is only ever sent once', () => {
  it('does not try a change again when the connection fails', async () => {
    const attempt = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    global.fetch = attempt as unknown as typeof fetch;

    const claim = request('POST', '/admin/deposits/dep-1/claim', {
      body: { amount: 240, reason: 'Kerbed alloy, photographed at return.' },
    });
    const settled = claim.catch((caught: unknown) => caught);

    await vi.runAllTimersAsync();

    expect(await settled).toBeInstanceOf(NetworkError);
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});

describe('reading is tried again, because the first request is what wakes the server', () => {
  it('asks again when the connection fails, and gives up in the end', async () => {
    const attempt = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    global.fetch = attempt as unknown as typeof fetch;

    const read = request('GET', '/admin/users');
    const settled = read.catch((caught: unknown) => caught);

    await vi.runAllTimersAsync();

    expect(await settled).toBeInstanceOf(NetworkError);
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('stops as soon as one of them works', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 'u-1' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    global.fetch = attempt as unknown as typeof fetch;

    const read = request<{ id: string }[]>('GET', '/admin/users');
    const settled = read.catch((caught: unknown) => caught);

    await vi.runAllTimersAsync();

    expect(await settled).toEqual([{ id: 'u-1' }]);
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});

describe('an error that did not come from SXM Rentals is treated as the server not answering yet', () => {
  // Vercel passes every request on to the server, and gives up if the server is
  // too slow to wake — answering with an error of its own. That answer can look
  // like JSON with an "error" in it. It is not a refusal from SXM Rentals, and
  // must not be shown or treated as one.
  it('asks again when the error has no SXM Rentals reference on it', async () => {
    const attempt = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 'ROUTER_EXTERNAL_TARGET_ERROR', message: 'An error occurred' } }),
          { status: 504, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 'u-1' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    global.fetch = attempt as unknown as typeof fetch;

    const read = request<{ id: string }[]>('GET', '/admin/users');
    const settled = read.catch((caught: unknown) => caught);

    await vi.runAllTimersAsync();

    expect(await settled).toEqual([{ id: 'u-1' }]);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('believes a refusal that SXM Rentals signed, and does not ask again', async () => {
    // A real answer from the server — refunds cannot be approved until Stripe
    // is connected. It carries the server's own reference, so it is shown as
    // written, and asking again would only get the same answer.
    const attempt = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'stripe_unavailable',
            message: 'Refunds cannot be approved until Stripe is connected.',
            requestId: 'req-503',
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    global.fetch = attempt as unknown as typeof fetch;

    const read = request('GET', '/admin/refunds');
    const settled = read.catch((caught: unknown) => caught);

    await vi.runAllTimersAsync();

    const outcome = await settled;
    expect(outcome).toBeInstanceOf(ApiError);
    expect((outcome as ApiError).message).toBe('Refunds cannot be approved until Stripe is connected.');
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
