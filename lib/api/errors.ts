// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Decides what a member of staff is told when something
// goes wrong. There are exactly two kinds of "wrong" and they deserve different
// answers, which is why there are two error types below rather than one.
//
// THE TWO KINDS, AND WHY THE DIFFERENCE MATTERS:
//
//   ApiError     — the SXM Rentals server answered, and the answer was no. It
//                  said why, in a sentence written to be read by the person
//                  holding the mouse: "This customer still has a rental
//                  running." That sentence is the best thing we have and it is
//                  shown exactly as it arrived.
//
//   NetworkError — the request never got there, or what came back was not an
//                  answer at all. Nobody wrote a message for this, so the panel
//                  supplies one.
//
// WHY THE API'S OWN WORDS ARE NEVER REWRITTEN: the panel used to run every
// failure through a list of patterns — "404" became "We could not find that",
// anything unrecognised became "Something went wrong. Please try again." That
// was right when there was no server to say anything better. It is actively
// harmful now: a refusal explaining that a deposit is still held would be
// replaced with "Something went wrong", and the member of staff would be left
// with no idea what to fix. So the patterns still exist, below, but they only
// ever see faults that never reached the server.

// ---- WHEN THE SERVER SAID NO ----
// Every refusal from the API arrives in the same shape:
//   { "error": { "code": "has_live_rental", "message": "…", "requestId": "…" } }
// The code is for the panel to switch on; the message is for the person.
export class ApiError extends Error {
  readonly status: number;
  // A short, stable name for what went wrong: 'unauthorized', 'has_live_rental',
  // 'already_decided'. Screens branch on this, never on the wording.
  readonly code: string;
  // The server's own reference for this exact request. Worth showing on the
  // unexpected ones, because it is what makes a report to the backend useful
  // rather than "it broke this morning".
  readonly requestId?: string;
  // Only on 400 invalid_input: which field, and what is wrong with it.
  readonly details?: { field: string; message: string }[];

  constructor(init: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    details?: { field: string; message: string }[];
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.details = init.details;
  }
}

// ---- WHEN IT NEVER GOT THERE ----
// No signal, the request timed out, or the reply was not something we can read.
// The last one matters more than it sounds: see the note in http.ts about what
// the server sends back while it is waking up.
export class NetworkError extends Error {
  // True when the shape of the failure says the server is probably asleep and
  // starting up, rather than gone. The panel words that case differently.
  readonly waking: boolean;

  constructor(message: string, waking = false) {
    super(message);
    this.name = 'NetworkError';
    this.waking = waking;
  }
}

// ---- WHAT THE PERSON IS SHOWN ----
// The single place that turns any thrown thing into a sentence. Every screen
// reaches this through useAsyncData, so there is one answer to "what do we say"
// rather than one per screen.
export function presentError(caught: unknown): string {
  // The server already wrote this for the person reading it. Passed through
  // untouched, on purpose — see the note at the top of this file.
  if (caught instanceof ApiError) return caught.message;

  if (caught instanceof NetworkError) {
    return caught.waking
      ? 'The SXM Rentals server is waking up. This takes up to a minute when nobody has used the panel for a while — please try again in a moment.'
      : caught.message;
  }

  return friendlyFault(caught);
}

// ---- FAULTS NOBODY WROTE A MESSAGE FOR ----
// This is the panel's original list, kept because it is still exactly right for
// what it now handles: things that broke before the server was ever reached.
// Nobody should be shown "TypeError: Failed to fetch".
function friendlyFault(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught);

  if (/network|fetch|timeout|connection|abort/i.test(raw)) {
    return 'We could not reach SXM Rentals. Check your connection and try again.';
  }

  return 'Something went wrong. Please try again.';
}
