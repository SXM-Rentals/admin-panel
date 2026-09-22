// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The contents of the Playbook screen — what SXM Rentals is
// actually built out of, organised the way the system is actually shaped:
// frontend, backend, the APIs between them, and the infrastructure underneath.
//
// WHY IT IS GROUPED BY LAYER rather than by vendor or by cost. "What are we
// using for X" is nearly always asked about a layer — what runs in the browser,
// what runs on the server, what we call out to, where it is all hosted. A flat
// list sorted by price answers a question nobody asks and forces everybody to
// scan the whole thing. Grouped this way, somebody can go straight to the third
// heading and stop reading.
//
// WHO IT IS FOR. Anybody on the team who needs an answer without opening the
// developer guide and reading a table of contents. Somebody on support gets
// asked which company checks passports. Somebody doing the books wants to know
// what Stripe takes. Somebody new wants to know what the four repositories are.
//
// NONE OF THIS IS MADE-UP DATA. It is a description of the real platform: what
// it is built from, what it costs, and which addresses on the SXM Rentals server
// this panel calls.
//
// KEEP IT IN STEP WITH THE DEVELOPER GUIDE. This is a second copy of information
// that lives there first, which is a real risk — a copy that has drifted is
// worse than no copy, because people trust it. The figures come from the
// Overview doc cost tables; when those change, change these.

import type { PlaybookRepo, PlaybookService } from '@/types';

// ---- THE LAYERS ----
// The four groups everything on the screen is sorted into, in the order data
// actually travels: what a person touches, what serves it, what it calls, and
// what it all runs on.
export type Layer = 'frontend' | 'backend' | 'api' | 'infrastructure';

export const layers: { id: Layer; title: string; blurb: string; icon: string }[] = [
  {
    id: 'frontend',
    title: 'Frontend',
    blurb: 'What a person actually looks at — the website, the phone app, and this panel.',
    icon: 'grid-outline',
  },
  {
    id: 'backend',
    title: 'Backend',
    blurb: 'The engine. Booking, availability, payment splitting, verification, notifications.',
    icon: 'layers-outline',
  },
  {
    id: 'api',
    title: 'APIs & Integrations',
    blurb: 'The outside companies the platform calls, and the API it offers to rental businesses.',
    icon: 'swap-horizontal',
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    blurb: 'Where all of it runs, and where the files and the database live.',
    icon: 'library-outline',
  },
];

// ---- WHAT EACH LAYER IS BUILT WITH ----
// The languages, frameworks and tools, filed under the layer they belong to.
// Version numbers for anything in THIS repository are read from package.json at
// build time rather than typed here, so that part cannot drift.
export const stack: {
  layer: Layer;
  name: string;
  role: string;
  note: string;
  // Set where the version can be read from package.json.
  versionKey?: string;
}[] = [
  // ---- FRONTEND ----
  {
    layer: 'frontend',
    name: 'TypeScript',
    role: 'The language every screen is written in',
    note: 'The same language across all four codebases, so a person can move between them.',
    versionKey: 'typescript',
  },
  {
    layer: 'frontend',
    name: 'Next.js (App Router)',
    role: 'The web framework',
    note: 'Handles the pages, the addresses and the building. Runs the customer website and this panel.',
    versionKey: 'next',
  },
  {
    layer: 'frontend',
    name: 'React',
    role: 'How screens are built',
    note: 'Screens are assembled from the shared components listed further down.',
    versionKey: 'react',
  },
  {
    layer: 'frontend',
    name: 'React Native / Expo',
    role: 'The phone app',
    note: 'One codebase producing both the iOS and the Android app.',
  },
  {
    layer: 'frontend',
    name: 'CSS Modules',
    role: 'How screens are styled',
    note: 'Every colour and spacing comes from app/globals.css. No screen writes a colour itself.',
  },
  {
    layer: 'frontend',
    name: 'Vitest',
    role: 'The tests',
    note: 'Run with npm test. The important ones check business rules, not appearance.',
    versionKey: 'vitest',
  },

  // ---- BACKEND ----
  {
    layer: 'backend',
    name: 'Fastify',
    role: 'The API server',
    note: 'Every route the website, the app and this panel call lives here.',
  },
  {
    layer: 'backend',
    name: 'PostgreSQL (Neon)',
    role: 'The database',
    note: 'Everything the platform knows. Identity documents are kept out of it, in encrypted storage.',
  },
  {
    layer: 'backend',
    name: 'Booking & Availability Engine',
    role: 'Works out what is free and holds it',
    note: 'The part that stops two people booking the same car for the same week.',
  },
  {
    layer: 'backend',
    name: 'Payment Splitting',
    role: 'Divides each payment three ways',
    note: 'What the business gets, what the platform keeps, and the deposit held apart from both.',
  },
  {
    layer: 'backend',
    name: 'Rewards Engine',
    role: 'Awards points and works out tiers',
    note: 'Reads the values set on the Rewards screen rather than hardcoding them.',
  },
  {
    layer: 'backend',
    name: 'Support Agent',
    role: 'Drafts replies for a person to approve',
    note: 'Calls the Claude API, posts the draft to Slack, and sends only once somebody approves.',
  },
];

// ---- THE OUTSIDE COMPANIES ----
// Costs from the Overview doc. Confirm current pricing with each vendor before
// committing a budget; these are planning-baseline figures, not quotes.
export const services: PlaybookService[] = [
  {
    name: 'Stripe Connect',
    category: 'payments',
    purpose:
      'Takes the customer payment, splits it between the rental business and the platform commission, and pays the business out. Also holds security deposits as an authorisation against the card.',
    usedIn: 'Backend · payments and payouts. Seen in this panel on Payments, Refunds and Deposits.',
    cost: '2.9% + $0.30 per transaction, plus about 0.25% + $0.25 per payout',
  },
  {
    name: 'Stripe Identity',
    category: 'identity',
    purpose:
      'Checks that a passport, local ID or driving licence is genuine, and that the selfie matches the photograph on it. This is the automated check every customer goes through before they can book.',
    usedIn: 'Backend · verification. Its result is what the Users screen shows.',
    cost: '$1.50 per verification — see Settings for the provider actually in use',
  },
  {
    name: 'Resend / Postmark',
    category: 'messaging',
    purpose:
      'Sends the transactional email: booking confirmations, receipts, verification results, and approved support replies.',
    usedIn: 'Backend · notifications',
    cost: '$0–20 a month; free tiers cover early volume',
  },
  {
    name: 'Claude API',
    category: 'ai',
    purpose:
      'Drafts a reply to an incoming support email using the customer’s booking as context. It never sends anything: the draft goes to Slack for a person to approve, edit or reject first.',
    usedIn: 'Backend · support agent',
    cost: 'About $0.01–0.02 per drafted reply',
  },
  {
    name: 'Slack',
    category: 'messaging',
    purpose:
      'Where a drafted support reply is posted for approval. The approve button is what actually sends the email.',
    usedIn: 'Backend · support review step',
    cost: 'Free plan is enough for a small team; $7.25 per person a month for Pro',
  },
  {
    name: 'Provider API',
    category: 'integration',
    purpose:
      'Ours, not somebody else’s. Lets a rental business with its own booking system connect it directly instead of entering every vehicle twice. The reason established rental companies can join without feeling replaced.',
    usedIn: 'Backend · offered to providers. Switched on per business in Settings.',
    cost: 'No cost — it is our own API',
  },
];

export const serviceCategoryLabels: Record<PlaybookService['category'], string> = {
  payments: 'Payments',
  identity: 'Identity checks',
  messaging: 'Messaging and email',
  ai: 'AI',
  integration: 'Our own API',
  hosting: 'Hosting',
  storage: 'Storage',
  mobile: 'Mobile builds',
};

// ---- WHERE IT ALL RUNS ----
export const infrastructure: PlaybookService[] = [
  {
    name: 'Vercel',
    category: 'hosting',
    purpose: 'Runs the customer website and this admin panel.',
    usedIn: 'Web · Admin',
    cost: 'Free tier is non-commercial only; $20 per seat a month otherwise',
  },
  {
    name: 'Render',
    category: 'hosting',
    purpose: 'Runs the backend API — the booking engine, payments, verification and notifications.',
    usedIn: 'Backend',
    cost: '$7–25+ a month; expect to move up a tier and add a background worker as volume grows',
  },
  {
    name: 'Neon',
    category: 'hosting',
    purpose: 'The managed PostgreSQL database. Everything the platform knows lives here.',
    usedIn: 'Backend',
    cost: 'Free tier, then roughly $15–19 a month and rising with steady traffic',
  },
  {
    name: 'S3 or Cloudflare R2',
    category: 'storage',
    purpose:
      'Encrypted storage for identity documents, driving licences and signed rental agreements. Deliberately separate from the main database.',
    usedIn: 'Backend · storage',
    cost: '$1–10 a month',
  },
  {
    name: 'Expo / EAS',
    category: 'mobile',
    purpose: 'Builds the iOS and Android apps from the one mobile codebase.',
    usedIn: 'Mobile',
    cost: 'Free tier covers MVP testing; $19 a month once builds need to be faster',
  },
];

// ---- THE FOUR CODEBASES ----
export const repos: (PlaybookRepo & { layer: Layer })[] = [
  {
    name: 'sxm-rentals-web',
    layer: 'frontend',
    purpose: 'The customer website and the provider portal. Where a booking is actually made.',
    stack: 'Next.js · React · TypeScript · CSS Modules',
  },
  {
    name: 'sxm-rentals-mobile',
    layer: 'frontend',
    purpose: 'The iOS and Android app — one codebase, both platforms.',
    stack: 'React Native · Expo · TypeScript',
  },
  {
    name: 'sxm-rentals-admin',
    layer: 'frontend',
    purpose: 'This panel. Internal staff tooling, desktop only, dark only.',
    stack: 'Next.js · React · TypeScript · CSS Modules',
  },
  {
    name: 'sxm-rentals-backend',
    layer: 'backend',
    purpose:
      'The engine behind all of it: sign-in, availability, booking, payment splitting, payouts, verification, notifications, rewards, and the support agent.',
    stack: 'Fastify · TypeScript · Neon (PostgreSQL)',
  },
];

// ---- THE SERVER ADDRESSES THIS PANEL CALLS ----
// Every address the panel uses, one line each, in the order the screens use
// them. This list has drifted before — it once listed addresses that never
// existed — so tests/rules/the-playbook-lists-what-the-panel-calls.test.ts now
// compares it with lib/api-client.ts and lib/api/auth.ts. Add a call there
// without adding it here, or the other way round, and that test fails.
export const backendRoutes: { group: string; purpose: string }[] = [
  // ---- SIGNING IN ----
  { group: 'POST /admin/auth/login', purpose: 'The password — the first of two steps, and not enough alone' },
  { group: 'POST /admin/auth/mfa/enroll', purpose: 'Setting up the authenticator app, on a first sign-in' },
  { group: 'POST /admin/auth/mfa/verify', purpose: 'The six-digit code — the step that actually signs somebody in' },
  { group: 'POST /admin/auth/logout', purpose: 'Signing out' },
  { group: 'GET /admin/me', purpose: 'Who is signed in, asked every time the panel opens' },

  // ---- THE DASHBOARD AND THE LOG ----
  { group: 'GET /admin/summary', purpose: 'The headline figures, all-time' },
  { group: 'GET /admin/queue', purpose: 'Everything waiting on somebody, oldest first' },
  { group: 'GET /admin/analytics', purpose: 'Money, bookings and sign-ups between any two dates' },
  { group: 'GET /admin/audit', purpose: 'Who changed what, when and why — written by the server' },
  { group: 'GET /admin/staff', purpose: 'Staff names, for assigning disputes and filtering the log' },

  // ---- CUSTOMERS ----
  { group: 'GET /admin/users', purpose: 'The customer list, searchable by name and email' },
  { group: 'GET /admin/users/:id', purpose: 'One customer in full' },
  { group: 'PATCH /admin/users/:id', purpose: 'Changing one detail of a customer, with a reason' },
  { group: 'PATCH /admin/users/:id/points', purpose: 'Adding or taking away points, with a reason' },
  { group: 'DELETE /admin/users/:id', purpose: 'Closing an account, with a reason — refused while money is outstanding' },

  // ---- RENTAL BUSINESSES ----
  { group: 'GET /admin/providers', purpose: 'The rental business list' },
  { group: 'GET /admin/providers/:id', purpose: 'One business in full' },
  { group: 'POST /admin/providers/:id/verification', purpose: 'The SXM Verified decision, with a reason' },

  // ---- VEHICLES ----
  { group: 'GET /admin/vehicles', purpose: 'Every vehicle and whether it is listed' },
  { group: 'GET /admin/vehicles/:id', purpose: 'One vehicle, with its paperwork' },
  { group: 'POST /admin/vehicles/:id/listing', purpose: 'Putting a vehicle live or taking it down, with a reason' },
  { group: 'POST /admin/vehicles/documents/:id/review', purpose: 'Approving or rejecting one document, with a reason' },

  // ---- BOOKINGS ----
  { group: 'GET /admin/bookings', purpose: 'Every booking, or one found by its reference' },
  { group: 'GET /admin/bookings/:id', purpose: 'One booking in full, with its money split three ways' },

  // ---- MONEY ----
  { group: 'GET /admin/payments', purpose: 'The ledger: charges, refunds, payouts and commission' },
  { group: 'GET /admin/payouts', purpose: 'Money sent on to businesses — ready, not yet on a screen' },
  { group: 'GET /admin/refunds', purpose: 'The refund queue' },
  { group: 'POST /admin/refunds/:id/decision', purpose: 'Approving or denying a refund, with a reason' },
  { group: 'GET /admin/deposits', purpose: 'Every security deposit — never revenue' },
  { group: 'POST /admin/deposits/:id/release', purpose: 'Giving a deposit back, with a reason' },
  { group: 'POST /admin/deposits/:id/claim', purpose: 'Keeping part or all of a deposit, with the amount and a reason' },

  // ---- DISPUTES ----
  { group: 'GET /admin/disputes', purpose: 'Open and resolved disputes' },
  { group: 'GET /admin/disputes/:id', purpose: 'One dispute in full' },
  { group: 'POST /admin/disputes/:id/assign', purpose: 'Giving a dispute to somebody, with a reason' },
  { group: 'POST /admin/disputes/:id/resolve', purpose: 'Closing a dispute — the notes for the record, the reason for the log' },
];

// What the server does not have yet, so the panel cannot do it either. The
// screens for these say plainly that they are not connected.
export const notOnTheServerYet: string[] = [
  'Promotional codes',
  'The rewards programme — tiers and point values',
  'Platform settings, including the commission rate',
  'Reading the messages on a booking',
  'A rental business\u2019s own documents and payout account',
  'Editing or closing a rental business',
  'Resetting a staff password or authenticator',
];
