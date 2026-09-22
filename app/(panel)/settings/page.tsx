'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Where the platform-wide settings will be changed — the
// commission SXM Rentals keeps, which identity-check company is used, which
// legal entity Stripe pays out from, and the feature switches. For now it says
// plainly that none of them can be changed from here.
//
// WHY IT SAYS SO RATHER THAN SHOWING THE OLD SCREEN. The SXM Rentals server has
// no settings the panel can read or change. The old screen showed made-up
// values with working switches: flip a feature flag and it said "saved", and
// nothing anywhere had changed. On the screen that decides what every rental
// business is paid, that is the most dangerous kind of pretend.
//
// TWO OPEN QUESTIONS ARE KEPT HERE, because they are real, they have money
// behind them, and they must be settled before this screen is built rather than
// discovered after:
//
//   Whether a passport check and a licence check bill as one identity
//   verification or two. The Overview doc flags this as the thing that either
//   doubles the per-customer cost or does not, and says to confirm it with the
//   provider directly.
//
//   Whether a Sint Maarten entity can receive Stripe payouts at all. It does not
//   appear on Stripe's standard supported list. The US entity is the working
//   answer because it covers payouts platform-wide.

import React from 'react';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { Note } from '@/components/admin/shared';
import { ComingSoon } from '@/components/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHead
        title="Settings"
        description="What the platform charges, who checks identities, where payouts come from, and what is switched on."
      />

      <PageCard title="Platform Settings">
        <ComingSoon
          icon="settings-outline"
          title="Not connected yet"
          body="The SXM Rentals server does not let the panel read or change platform settings yet. Nothing here can be changed, and the commission rate is set on the server."
        />
      </PageCard>

      <PageCard title="Two Questions To Settle First" subtitle="Before this screen is built">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Note icon="warning-outline" tone="ink2">
            Whether a passport check and a licence check bill as one identity verification or two.
            It either doubles the cost of checking each customer or it does not — confirm it with
            the provider directly.
          </Note>
          <Note icon="warning-outline" tone="ink2">
            Whether a Sint Maarten entity can receive Stripe payouts at all. It is not on
            Stripe&rsquo;s standard supported list; the US entity is the working answer because it
            covers payouts platform-wide.
          </Note>
        </div>
      </PageCard>
    </>
  );
}
