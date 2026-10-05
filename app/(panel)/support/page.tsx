'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Customers who have written to us from the app or the
// website, and whether anybody has answered them.
//
// ONE CONVERSATION PER CUSTOMER, NOT A TICKET EACH. Somebody who writes three
// times about the same rental has one conversation here, because that is how the
// person answering wants to read it — the whole history, in order, rather than
// three threads that each make sense only next to the others.
//
// WAITING FIRST, AND THAT ORDER IS THE SERVER'S. A conversation is waiting when
// the customer wrote last. The screen does not re-sort what arrives: the server
// puts the unanswered ones at the top, and second-guessing that here would mean
// two places deciding what matters most.

import React from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { CellStack, DataTable, type Column } from '@/components/tables/DataTable';
import { Note } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { SupportSummary } from '@/types';

export default function SupportPage() {
  const router = useRouter();
  const { data: conversations, loading, error, refresh } = useAsyncData(
    () => apiClient.listSupportConversations(),
    [],
  );

  const rows = conversations ?? [];
  const waiting = rows.filter((row) => row.waitingForStaff).length;

  const columns: Column<SupportSummary>[] = [
    {
      id: 'customer',
      header: 'Customer',
      sortValue: (c) => c.customerName,
      cell: (c) => (
        <CellStack
          title={c.customerName || 'Name not on file'}
          detail={`${c.messageCount} ${c.messageCount === 1 ? 'message' : 'messages'}`}
        />
      ),
    },
    {
      id: 'last',
      header: 'Last message',
      sortValue: (c) => c.lastMessageAt,
      // The last thing said, cut short by the server. Enough to know whether this
      // is a lost key or a disputed charge before opening it.
      cell: (c) => <CellStack title={relativeDay(c.lastMessageAt)} detail={c.preview} />,
    },
    {
      id: 'waiting',
      header: 'State',
      sortValue: (c) => (c.waitingForStaff ? 0 : 1),
      cell: (c) =>
        c.waitingForStaff ? (
          <StatusPill label="Waiting For Us" tone="warning" />
        ) : (
          <StatusPill label="Answered" tone="success" />
        ),
    },
  ];

  // Could not be fetched is not the same as nobody writing in. See LoadFailed.
  if (error) return <LoadFailed title="Messages" what="These conversations" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Messages"
        description="Customers who have written to us through the app or the website."
      />

      <PageCard
        title="Conversations"
        subtitle={
          rows.length === 0
            ? undefined
            : `${waiting} waiting for an answer · ${rows.length} in all`
        }
        flush
      >
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(c) => c.customerId}
          rowMuted={(c) => !c.waitingForStaff}
          loading={loading}
          // Waiting first, then the longest wait: the same order the server sent.
          initialSort={{ columnId: 'waiting', direction: 'asc' }}
          emptyTitle="Nobody has written in"
          emptyMessage="Messages from customers appear here."
          rowActions={(c) => (
            <Button
              label={c.waitingForStaff ? 'Answer' : 'Read'}
              variant={c.waitingForStaff ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => router.push(`/support/${c.customerId}`)}
            />
          )}
        />
      </PageCard>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          An answer here goes to the customer as written, and it is not in the audit log — the log
          records changes to records, and a reply changes nothing. Read the whole conversation before
          writing.
        </Note>
      </div>

      <Text variant="small" tone="ink3" as="p" raw>
        Messages about one booking still sit in the customer&rsquo;s own conversation. The booking they
        wrote from is named on each message.
      </Text>
    </>
  );
}
