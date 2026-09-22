'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Where platform-wide promotional codes will be run from —
// what each one gives, who it applies to, how often it has been used, and
// whether it is running. For now it says plainly that none of that exists yet.
//
// WHY THE SCREEN STAYS, EMPTY, RATHER THAN BEING REMOVED. The SXM Rentals server
// has no promotions yet: no codes, no way to create one, no record of one being
// used. This screen used to be fully working on made-up codes, which was the
// worst of both worlds — it looked as if a code could be created or paused, and
// nothing anywhere would have happened. A screen that says "not connected yet"
// is honest; one that silently does nothing is not; and taking it out of the
// sidebar would leave somebody wondering whether promotions exist at all.
//
// TWO RULES FOR WHEN IT IS BUILT, kept here so they are not lost with the old
// screen: expired codes stay in the list, because a customer will ring in
// November asking why SUMMER26 stopped working and the answer has to be
// findable; and pausing is not deleting, because deleting a code would take its
// usage history with it.

import React from 'react';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { ComingSoon } from '@/components/ui';

export default function PromotionsPage() {
  return (
    <>
      <PageHead
        title="Promotions"
        description="Platform-wide discount codes and campaigns — what is running, what is coming, and what has finished."
      />

      <PageCard title="Promotional Codes">
        <ComingSoon
          icon="pricetag-outline"
          title="Not connected yet"
          body="The SXM Rentals server does not have promotions yet, so there are no codes to show and none can be created or paused here. When it does, this is where they will be run from."
        />
      </PageCard>
    </>
  );
}
