// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: A stand-in for the SXM Rentals server that a test can
// set up in one line — "when the panel asks for the summary, answer this" — so a
// test can put a real screen in front of known figures and check what it draws,
// and what it sent.
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
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// An answer other than a plain success: a refusal, or "done, nothing to say".
// The body is sent exactly as given, so a test can hand back the server's own
// refusal shape — { error: { code, message, requestId } }.
export function reply(status: number, body?: unknown) {
  return { __reply: true as const, status, body };
}

type Answer = unknown;

// Answers each address in `routes`. A key can be the bare address —
// "/admin/summary" — which answers any method, or the method and address —
// "POST /admin/staff" — when the same address means two different things.
// Anything else gets the server's own "nothing here", and "who am I" answers
// "nobody" unless a test says otherwise. A fresh reply every time: a reply can
// only be read once.
export function fakeServer(routes: Record<string, Answer>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://panel.test');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = (init?.method ?? 'GET').toUpperCase();

    const answer = `${method} ${path}` in routes ? routes[`${method} ${path}`] : routes[path];

    if (answer !== undefined) {
      const special = answer as { __reply?: true; status?: number; body?: unknown };
      if (special.__reply) return json(special.body, special.status);
      return json(answer);
    }
    if (path === '/admin/me') {
      return json({ error: { code: 'unauthorized', message: 'Please sign in to the admin panel.' } }, 401);
    }
    return json(
      { error: { code: 'route_not_found', message: 'There is nothing at this address.', requestId: 'test' } },
      404,
    );
  });
}

// Puts the stand-in in place of the real thing for one test, and hands it back
// so the test can look at what the panel sent.
export function serve(routes: Record<string, Answer>) {
  const server = fakeServer(routes);
  global.fetch = server as unknown as typeof fetch;
  return server;
}

// What the panel sent to one address, as the object it was, or undefined if it
// never asked.
export function sentTo(server: ReturnType<typeof fakeServer>, method: string, path: string): unknown {
  const call = server.mock.calls.find(([input, init]) => {
    const url = new URL(String(input), 'http://panel.test');
    return (
      (init?.method ?? 'GET').toUpperCase() === method &&
      url.pathname.replace(/^\/api\/v1/, '') === path
    );
  });
  const body = call?.[1]?.body;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}
