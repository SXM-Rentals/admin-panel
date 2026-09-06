// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The handful of SXM Rentals staff who use this panel.
//
// THERE ARE NO ROLES HERE, AND THAT IS THE DESIGN. The admin doc is explicit:
// one flat access level at MVP, every admin account can see and do everything.
// Adding a "role" field that nothing checks would be worse than not having one —
// it would look like permissions exist. When the team grows past the point where
// that stops making sense, the field and the checks that read it get added
// together, in one piece of work.
//
// Staff still appear individually throughout the panel, because "who did this"
// is a different question from "who is allowed to". That is the whole point of
// the audit log.

import type { AdminStaff } from '@/types';

export const mockStaff: AdminStaff[] = [
  { id: 's1', name: 'Kayla Brooks', email: 'kayla@sxmrentals.com', avatarInitials: 'KB' },
  { id: 's2', name: 'Devon Illidge', email: 'devon@sxmrentals.com', avatarInitials: 'DI' },
  { id: 's3', name: 'Renée Laurent', email: 'renee@sxmrentals.com', avatarInitials: 'RL' },
  { id: 's4', name: 'Marlon Gumbs', email: 'marlon@sxmrentals.com', avatarInitials: 'MG' },
];

// Who the panel pretends is signed in during development. Real sign-in is a
// backend job — see lib/auth.tsx.
export const signedInStaff: AdminStaff = mockStaff[0];

export function findStaff(id: string): AdminStaff | undefined {
  return mockStaff.find((s) => s.id === id);
}
