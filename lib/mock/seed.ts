// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The raw ingredients every other mock file is built from —
// a list of names, a list of towns on both sides of the island, and a small
// number generator that always produces the same "random" answer.
//
// WHY THE RANDOMNESS IS FAKE: if these lists used Math.random(), every page
// refresh would shuffle the data. A booking would change its price, a customer
// would change their tier, and nobody could tell a genuine bug from the numbers
// simply moving about. The generator below is a well-known trick: given the same
// starting number it produces the same sequence forever. So the panel looks
// randomly populated but is in fact identical on every load, on every computer,
// which is what makes a screenshot or a bug report worth anything.
//
// WHEN THE REAL BACKEND ARRIVES this whole folder is deleted. Nothing outside
// lib/api-client.ts is allowed to import from it — see the note in that file.

// A tiny deterministic generator (a "mulberry32"). Hand it a seed, get back a
// function that produces the same run of numbers between 0 and 1 every time.
export function seeded(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Picks one item out of a list using the generator above.
export function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

// A whole number between min and max, both ends included.
export function between(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ---- DATES ----
// Everything is dated relative to this one day rather than to "now", so the
// screens do not slowly drift into showing nothing but ancient bookings as time
// passes. Change this one line to move the whole dataset.
export const TODAY = new Date('2026-09-05T09:00:00Z');

// A date this many days before TODAY, as the ISO text the real API will send.
//
// The optional "atHour" moves the clock as well as the calendar. Without it
// every generated moment lands at the same time of day, which is invisible on a
// screen showing dates and glaring on one showing times — an audit log where
// forty separate changes all happened at 5:00 AM reads as made up, and the
// timestamp is the column that screen exists to be trusted on.
export function daysAgo(days: number, atHour?: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  if (atHour !== undefined) d.setUTCHours(atHour, (atHour * 17) % 60, 0, 0);
  return d.toISOString();
}

// A date this many days after TODAY.
export function daysAhead(days: number): string {
  return daysAgo(-days);
}

// Just the calendar day, for fields that hold a date rather than a moment.
export function dayOnly(iso: string): string {
  return iso.slice(0, 10);
}

// ---- PEOPLE ----
// Names drawn from the mix actually found on the island: Dutch, French, English,
// and the Caribbean and Latin American communities alongside them. Deliberately
// not "User One, User Two" — a list of placeholder names tells you nothing about
// whether a column is wide enough for a real one.
export const FIRST_NAMES = [
  'Aria', 'Marcel', 'Shanice', 'Jean-Luc', 'Priya', 'Kwame', 'Elodie', 'Damian',
  'Noelia', 'Bastien', 'Chantal', 'Rashid', 'Imani', 'Thijs', 'Camille', 'Devon',
  'Yolanda', 'Pierre', 'Anouk', 'Terrence', 'Solange', 'Mateo', 'Fenna', 'Kelvin',
  'Josette', 'Ravi', 'Margot', 'Andre', 'Lucienne', 'Otis',
] as const;

export const LAST_NAMES = [
  'Duncan', 'Hodge', 'Richardson', 'Beauperthuy', 'Gumbs', 'Peterson', 'Laurent',
  'Arrindell', 'van Heyningen', 'Fleming', 'Brooks', 'Illidge', 'Carty', 'Mercier',
  'Wathey', 'Boasman', 'Lake', 'Rombley', 'Halley', 'Sasso', 'Marlin', 'Connor',
  'Bryson', 'Emmanuel', 'Vlaun', 'Dormoy', 'Simmons', 'Philips', 'Cannegieter', 'Roos',
] as const;

// ---- PLACES ----
// The Dutch side is Sint Maarten, the French side is Saint-Martin. Keeping the
// two lists apart means a provider on the French side never ends up with a
// Philipsburg address, which is the sort of detail that makes mock data read as
// real to somebody who knows the island.
export const DUTCH_TOWNS = [
  'Philipsburg', 'Simpson Bay', 'Cole Bay', 'Cupecoy', 'Maho', 'Dutch Quarter',
  'Pointe Blanche', 'Oyster Pond',
] as const;

export const FRENCH_TOWNS = [
  'Marigot', 'Grand Case', 'Orient Bay', 'Anse Marcel', 'Cul-de-Sac', 'Colombier',
  'Sandy Ground', 'Quartier d’Orléans',
] as const;

// ---- VEHICLES ----
// Small, economical and rugged, which is what actually gets rented on a small
// island with steep roads and expensive fuel.
export const CAR_MODELS = [
  { make: 'Toyota', model: 'Yaris', vehicleClass: 'economy', rate: 45 },
  { make: 'Kia', model: 'Picanto', vehicleClass: 'economy', rate: 42 },
  { make: 'Hyundai', model: 'Accent', vehicleClass: 'compact', rate: 52 },
  { make: 'Suzuki', model: 'Swift', vehicleClass: 'compact', rate: 48 },
  { make: 'Nissan', model: 'Kicks', vehicleClass: 'suv', rate: 68 },
  { make: 'Toyota', model: 'RAV4', vehicleClass: 'suv', rate: 82 },
  { make: 'Jeep', model: 'Wrangler', vehicleClass: 'fourByFour', rate: 110 },
  { make: 'Suzuki', model: 'Jimny', vehicleClass: 'fourByFour', rate: 88 },
  { make: 'Toyota', model: 'Hiace', vehicleClass: 'van', rate: 95 },
  { make: 'Mercedes-Benz', model: 'C-Class', vehicleClass: 'luxury', rate: 165 },
] as const;
