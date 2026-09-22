// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Makes the actual requests to the SXM Rentals server. It
// is the only file in the panel that knows about addresses, JSON, status codes
// or cookies. Everything above it deals in functions and information.
//
// THE ADDRESS IS ALWAYS OUR OWN. Requests go to "/api/v1/…" — the panel's own
// address — and next.config.mjs quietly passes them on to the real server. That
// is what lets the sign-in cookie work at all; the note in that file explains
// why. Nothing here ever mentions the server's real address, and the browser
// never learns it.
//
// WHY THE REPLY IS READ AS TEXT BEFORE IT IS READ AS JSON: the server sleeps
// when nobody has used the panel for a quarter of an hour, and waking it takes
// most of a minute. While it wakes, a request does not come back as a polite
// error — the connection is dropped, and what arrives is a page of HTML saying
// "Internal Server Error". Asking for JSON first turns that into an unreadable
// parsing fault, which is how "the server is starting up" ends up being shown to
// a member of staff as "Something went wrong". So: read the text, then try to
// make sense of it, and treat "this is not JSON at all" as its own answer.

import { ApiError, NetworkError } from './errors';

// Every address in the panel hangs off this. It is a path rather than a full
// address on purpose — see the note above.
const BASE = '/api/v1';

// How long to wait before giving up. The long one is for the first request of a
// session, which is the one most likely to be waking the server up.
const TIMEOUT_NORMAL = 20_000;
const TIMEOUT_COLD = 75_000;

// How long after a successful request the server still counts as awake.
const WARM_FOR = 10 * 60_000;

let lastSuccessAt = 0;

// ---- WHEN A SESSION ENDS WHILE SOMEBODY IS STILL WORKING ----
// Sessions last half an hour of sitting still, and eight hours at the very most,
// so a request failing because the session quietly ended is an ordinary event
// rather than a rare one. The session provider registers itself here so it can
// be told, wherever in the panel it happens.
//
// WHY A PLAIN CALLBACK RATHER THAN REACT: there is one panel, one server and one
// session. Threading a React context down into this file would mean every screen
// asking a hook for the api client instead of simply importing it — which is the
// one rule this panel actually has. A single callback is the smaller price.
type SessionLostHandler = () => void;
let onSessionLost: SessionLostHandler | null = null;

export function setSessionLostHandler(handler: SessionLostHandler | null): void {
  onSessionLost = handler;
}

// ---- TELLING THE PANEL THE SERVER IS STILL WAKING ----
// So a screen can say "the server is waking up" rather than showing a loading
// skeleton for fifty seconds and looking broken.
type WakingListener = (waking: boolean) => void;
const wakingListeners = new Set<WakingListener>();

export function subscribeToWaking(listener: WakingListener): () => void {
  wakingListeners.add(listener);
  return () => {
    wakingListeners.delete(listener);
  };
}

function announceWaking(waking: boolean): void {
  wakingListeners.forEach((listener) => listener(waking));
}

export type RequestOptions = {
  // Sent as JSON. Left out entirely for a GET.
  body?: unknown;
  // Added to the address, with anything empty dropped, so callers do not have to
  // build the string themselves.
  query?: Record<string, string | number | boolean | undefined>;
  // For the sign-in calls and the "who am I" check, where being told no is an
  // ordinary answer rather than a session that has ended.
  expectUnauthorized?: boolean;
};

export async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = BASE + path + buildQuery(options.query);

  // ONLY A GET IS EVER TRIED AGAIN. A repeated POST could claim a deposit twice,
  // and the server has no way of knowing the second one was an accident.
  const attempts = method === 'GET' ? 3 : 1;
  const waitBetween = [5_000, 15_000];

  let lastFault: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await attemptOnce<T>(method, url, options);
      lastSuccessAt = Date.now();
      announceWaking(false);
      return result;
    } catch (caught) {
      lastFault = caught;

      // A refusal from the server is a real answer. Asking again would only get
      // the same one.
      if (caught instanceof ApiError) throw caught;

      if (attempt >= attempts - 1) break;

      // The failed request is itself what starts the server up, so waiting and
      // asking again is usually all that is needed.
      if (caught instanceof NetworkError && caught.waking) announceWaking(true);
      await pause(waitBetween[attempt] ?? 15_000);
    }
  }

  announceWaking(false);
  throw lastFault;
}

async function attemptOnce<T>(
  method: string,
  url: string,
  options: RequestOptions,
): Promise<T> {
  const cold = Date.now() - lastSuccessAt > WARM_FOR;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      // The sign-in cookie. The browser attaches it; the panel never sees it.
      credentials: 'same-origin',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(cold ? TIMEOUT_COLD : TIMEOUT_NORMAL),
    });
  } catch (caught) {
    // Nothing came back at all: no signal, or we gave up waiting. If we had not
    // spoken to the server recently, the likeliest explanation by far is that it
    // is asleep and starting up.
    const timedOut = caught instanceof DOMException && caught.name === 'TimeoutError';
    throw new NetworkError(
      timedOut
        ? 'The request took too long.'
        : 'We could not reach SXM Rentals. Check your connection and try again.',
      cold,
    );
  }

  // Nothing to read. Signing out answers this way, and so does a document review.
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = tryParseJson(text);

  if (response.ok) {
    if (body === undefined) {
      throw new NetworkError('The server sent something we could not read.', false);
    }
    return body as T;
  }

  // Not JSON, and not a success: this is the waking-up case described at the top
  // of this file, or something else sitting between the panel and the server.
  if (body === undefined) {
    throw new NetworkError('The server did not answer properly.', response.status >= 500);
  }

  // A FAILURE THAT DID NOT COME FROM SXM RENTALS AT ALL. Between the panel and
  // the server sits Vercel, which passes each request on. When the server is
  // asleep and slow to wake, Vercel can give up waiting and answer with an error
  // of its own — and that answer may well be JSON with an "error" in it. Taken
  // at face value it would be shown as if SXM Rentals had refused, in Vercel's
  // words, and never tried again. Every answer SXM Rentals itself gives carries
  // its own reference for the request, so an error without one is treated as
  // what it is: the server not having answered yet.
  if (response.status >= 500 && !fromSxmRentals(body)) {
    throw new NetworkError('The server did not answer in time.', true);
  }

  const failure = asApiError(response.status, body);

  // The session has ended. The panel is told once, centrally, so the person can
  // sign in again without losing the screen they were on.
  if (failure.status === 401 && !options.expectUnauthorized) onSessionLost?.();

  throw failure;
}

// ---- READING THE SERVER'S REFUSAL ----
// Every refusal is the same shape. Anything that is not that shape is treated as
// unreadable rather than guessed at.
// Whether an error was written by the SXM Rentals server: it always says what
// went wrong in its own envelope, with its own reference for the request.
function fromSxmRentals(body: unknown): boolean {
  const envelope = (body as { error?: Record<string, unknown> } | null)?.error;
  return typeof envelope?.requestId === 'string' && typeof envelope?.code === 'string';
}

function asApiError(status: number, body: unknown): ApiError {
  const envelope = (body as { error?: Record<string, unknown> } | null)?.error;

  const message =
    typeof envelope?.message === 'string' && envelope.message.trim() !== ''
      ? envelope.message
      : 'SXM Rentals refused that, without saying why.';

  return new ApiError({
    status,
    code: typeof envelope?.code === 'string' ? envelope.code : 'unknown',
    message,
    requestId: typeof envelope?.requestId === 'string' ? envelope.requestId : undefined,
    details: Array.isArray(envelope?.details)
      ? (envelope.details as { field: string; message: string }[])
      : undefined,
  });
}

function tryParseJson(text: string): unknown {
  if (text.trim() === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function buildQuery(query: RequestOptions['query']): string {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- THE FOUR WAYS THE PANEL ASKS FOR THINGS ----
export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
