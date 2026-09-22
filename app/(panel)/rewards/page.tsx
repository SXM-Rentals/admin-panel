'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Where the rewards programme will be set — the tiers, what
// it takes to reach each one, and how many points each activity is worth. For
// now it says plainly that the programme itself is not built.
//
// WHAT IS REAL AND WHAT IS NOT. Customers' points balances ARE real: they are a
// ledger on the SXM Rentals server, and staff adjust them, with a reason, on
// each customer's own screen. What does not exist yet is the programme around
// them — tiers anybody can set, points earned automatically for an activity.
// That is deliberately not built. This screen used to let somebody edit made-up
// tier thresholds and press Save, which changed nothing anywhere; that is gone.
//
// POINTS AND ISLANDER STATUS ARE SEPARATE, and nothing here will ever touch
// Islander. It is a residency flag — you get it by living on the island and
// proving it. No amount of spending earns it, and it is not a fifth tier.

import React from 'react';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { Note } from '@/components/admin/shared';
import { ComingSoon } from '@/components/ui';

export default function RewardsPage() {
  return (
    <>
      <PageHead
        title="Rewards"
        description="Tier thresholds and point values for the rewards programme."
      />

      <PageCard title="The Programme">
        <ComingSoon
          icon="gift-outline"
          title="Not connected yet"
          body="The rewards programme is deliberately not built yet, so there are no tiers or point values to set here. Nothing on this screen can be saved."
        />

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Note>
            Customers&rsquo; points balances are real. Adjust one — always with a reason — from that
            customer&rsquo;s own screen under Users.
          </Note>
        </div>
      </PageCard>
    </>
  );
}
