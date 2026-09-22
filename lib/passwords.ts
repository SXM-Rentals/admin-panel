// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Makes up a temporary password for a new or reset member
// of staff, and holds the one rule every staff password has to meet.
//
// A TEMPORARY PASSWORD IS MEANT TO BE READ OUT OR RETYPED ONCE. It is passed to
// its owner privately — by phone, or written down and handed over — and they
// replace it the first time they sign in. So it avoids the characters people
// mistake for each other (0 and O, 1 and l and I), and comes in four groups of
// four so it can be read out a chunk at a time: "k7Qm-Wx3p-…".
//
// IT COMES FROM THE BROWSER'S CRYPTOGRAPHIC RANDOM SOURCE, not Math.random,
// which is fine for shuffling a list and not for anything guarding a door.
// Sixteen characters from fifty-five is about ninety bits: a temporary password
// nobody is going to guess in the hour or two before it is replaced.

// The server's own limits for every staff password (lib/passwords.ts in the
// backend): length is what makes a password strong, so there are deliberately
// no "must contain a symbol" rules.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// No 0/O, no 1/l/I: nothing that reads as something else.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function temporaryPassword(): string {
  const chars: string[] = [];
  // Values from the top of the range that would favour the first few letters
  // are thrown away rather than folded back in, so every character is exactly
  // as likely as every other.
  const usable = 256 - (256 % ALPHABET.length);
  while (chars.length < 16) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < usable && chars.length < 16) chars.push(ALPHABET[byte % ALPHABET.length]!);
    }
  }
  return [0, 4, 8, 12].map((start) => chars.slice(start, start + 4).join('')).join('-');
}

// What is wrong with a proposed password, in words, or nothing if it is fine.
// The server checks again — including whether it has appeared in a known data
// breach, which only it can — so this is for saying so before a round trip.
export function passwordProblem(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `At least ${PASSWORD_MIN_LENGTH} characters. A short sentence is easier to remember than a jumble.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `No more than ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return undefined;
}
