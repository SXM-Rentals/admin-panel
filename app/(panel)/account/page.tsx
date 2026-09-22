'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Your own account — who you are signed in as, and
// changing your password.
//
// THERE IS NO "EDIT MY NAME" OR "CHANGE MY AUTHENTICATOR" HERE, on purpose. Your
// name is what the audit log says against everything you have done, so it is
// not something to change on a whim from your own session. And a lost or new
// phone is a job for a colleague, from the Staff screen, because the one thing
// you cannot do without your authenticator app is prove it is you.

import React from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/lib/auth';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { InfoRow, InfoRows, Note } from '@/components/admin/shared';
import { Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function AccountPage() {
  const { staff } = useAdminSession();

  return (
    <>
      <PageHead title="Your Account" description="Who you are signed in as, and your password." />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="Change Your Password">
            <ChangePasswordForm />
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="Signed In As">
            <InfoRows>
              <InfoRow label="Name" value={staff?.name ?? '—'} />
              <InfoRow label="Email" value={staff?.email ?? '—'} />
              <InfoRow label="Access" value="Full access — one access level for all staff" />
            </InfoRows>
          </PageCard>

          <PageCard title="Lost Your Phone?">
            <Note>
              Ask another member of staff to reset your sign-in from the Staff screen. You will set up
              your authenticator app again the next time you sign in.
            </Note>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Link href="/staff">
                <Text variant="small" tone="brand" as="span" raw>
                  Go to Staff →
                </Text>
              </Link>
            </div>
          </PageCard>
        </div>
      </div>
    </>
  );
}
