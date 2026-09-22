// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: A stand-in for the SXM Rentals server that a test can
// set up in one line — "when the panel asks for the summary, answer this" — so a
// test can put a real screen in front of known figures and check what it draws.
//
// WHY TESTS USE THIS RATHER THAN THE REAL SERVER. A test that needs the real
// server needs a network, a signed-in session and the server to be awake, and
// the server sleeps. It would fail for reasons that have nothing to do with the
// panel. And the figures on the real server change, so a test could never say
// what the right answer is. Here the answer is written down next to the question.
//
// WHY THERE IS NO SAMPLE DATA IN HERE. Each test writes out only the handful of
// records it is about, beside the check that uses them. A shared pile of
// made-up records is how a panel ends up tested against numbers nobody chose.

import { vi } from 'vitest';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Answers each address in `routes` — written as the part after /api/v1, like
// "/admin/summary" — with the value given. Anything else gets the server's own
// "nothing here", and "who am I" answers "nobody" unless a test says otherwise.
// A fresh reply every time: a reply can only be read once.
export function fakeServer(routes: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://panel.test');
    const path = url.pathname.replace(/^\/api\/v1/, '');

    if (path in routes) return json(routes[path]);
    if (path === '/admin/me') {
      return json({ error: { code: 'unauthorized', message: 'Please sign in to the admin panel.' } }, 401);
    }
    return json({ error: { code: 'route_not_found', message: 'There is nothing at this address.' } }, 404);
  });
}

// Puts the stand-in in place of the real thing for one test.
export function serve(routes: Record<string, unknown>) {
  global.fetch = fakeServer(routes) as unknown as typeof fetch;
}
