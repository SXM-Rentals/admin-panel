// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that the Playbook screen's list of server
// addresses is exactly the list of addresses the panel actually calls — nothing
// missing, and nothing listed that the panel does not use.
//
// WHY A LIST ON A HELP SCREEN NEEDS A TEST. The Playbook is where somebody new
// goes to learn how the panel talks to the server, and people trust what it
// says. It has already drifted once: it listed an address, "POST
// /admin/verification", that never existed, alongside promotions, rewards and
// settings addresses the server does not have. A copy that has drifted is worse
// than no copy, because it is believed.
//
// So instead of relying on somebody remembering to update it, this reads the
// two files that make every call to the server — lib/api-client.ts and
// lib/api/auth.ts — and compares. Adding a call without listing it, or listing
// one that is never made, fails here with the difference spelled out.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { backendRoutes } from '@/lib/playbook';

const METHOD: Record<string, string> = { get: 'GET', post: 'POST', patch: 'PATCH', del: 'DELETE' };

// Every call in a source file, as "METHOD /admin/…", with anything worked out
// at the time — an id, a reference — written as ":id", the way the list writes
// it.
function callsIn(file: string): string[] {
  const source = readFileSync(join(process.cwd(), file), 'utf8');
  const found: string[] = [];
  const call = /api\.(get|post|patch|del)<[^(]*>\(\s*([`'"])(\/admin\/[^`'"]*)\2/g;
  for (const match of source.matchAll(call)) {
    const [, method, , path] = match;
    found.push(`${METHOD[method]} ${path.replace(/\$\{[^}]*\}/g, ':id')}`);
  }
  return found;
}

describe('the Playbook lists exactly the addresses the panel calls', () => {
  const called = [...new Set([...callsIn('lib/api-client.ts'), ...callsIn('lib/api/auth.ts')])].sort();
  const listed = backendRoutes.map((route) => route.group).sort();

  it('finds the calls it is checking', () => {
    // A guard on the guard: if the pattern above ever stopped matching, the
    // comparison below would pass by comparing two empty lists.
    expect(called.length).toBeGreaterThan(30);
  });

  it('lists every address the panel calls', () => {
    const missing = called.filter((route) => !listed.includes(route));
    expect(missing).toEqual([]);
  });

  it('lists nothing the panel does not call', () => {
    const invented = listed.filter((route) => !called.includes(route));
    expect(invented).toEqual([]);
  });

  it('lists each address once', () => {
    expect(new Set(listed).size).toBe(listed.length);
  });
});
