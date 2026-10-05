'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One customer's conversation with us, oldest message first,
// and the box to answer them.
//
// EVERY MESSAGE IS SHOWN AS TEXT, NEVER AS MARK-UP. What a customer typed is put
// on the page as the string it is. Nothing here renders their words as HTML, and
// nothing turns a web address in them into a link — a message from a stranger is
// data, and the one screen where staff read strangers' words is the wrong place to
// start trusting them.
//
// AN ANSWER CARRIES NO REASON AND LEAVES NO AUDIT ENTRY, and the screen says so.
// The audit log records changes to records — money, access, somebody's account.
// This is correspondence: there is no before and after. What it needs instead is
// the plainest possible warning that it is sent as written, because unlike every
// other thing in this panel it cannot be explained away afterwards.

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { clockTime, longDate } from '@/lib/format';
import { presentError } from '@/lib/api/errors';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { Note } from '@/components/admin/shared';
import { Button, Icon, Skeleton, Text, TextArea, useToast } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

const MAX_REPLY = 4000;

export default function SupportConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { showToast } = useToast();
  // A viewer reads the whole conversation and answers none of it.
  const { whyNoChanges } = useAdminSession();

  const { data: conversation, loading, error, refresh } = useAsyncData(
    () => apiClient.getSupportConversation(id),
    [id],
  );

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  if (error) {
    return <LoadFailed title="Messages" what="This conversation" error={error} onRetry={refresh} />;
  }

  if (loading) return <Skeleton height={420} />;

  if (!conversation) {
    return (
      <>
        <PageHead title="Conversation not found" description="No customer with that reference has written in." />
        <Button label="Back to Messages" href="/support" variant="secondary" size="md" />
      </>
    );
  }

  const tooShort = reply.trim().length === 0;

  const send = async () => {
    if (tooShort) return;
    setSending(true);
    setProblem(undefined);
    try {
      await apiClient.replyToCustomer(conversation.customerId, reply.trim());
      setReply('');
      refresh();
      showToast('Sent.', `${conversation.customerName} will see it in the app.`);
    } catch (caught) {
      setProblem(presentError(caught));
    } finally {
      setSending(false);
    }
  };

  const last = conversation.messages[conversation.messages.length - 1];
  const waiting = last ? last.from === 'customer' : false;

  return (
    <>
      <PageHead
        title={conversation.customerName || 'A customer'}
        description={
          waiting
            ? 'They wrote last, so this is waiting for an answer.'
            : 'The last word here was ours.'
        }
        actions={
          <>
            <Button
              label="Their Account"
              href={`/users/${conversation.customerId}`}
              variant="secondary"
              size="md"
            />
            <Button label="Back to Messages" href="/support" variant="ghost" size="md" />
          </>
        }
      />

      <PageCard
        title="Conversation"
        subtitle={`${conversation.messages.length} ${conversation.messages.length === 1 ? 'message' : 'messages'}, oldest first`}
      >
        {conversation.messages.length === 0 ? (
          <Note>Nothing has been said yet.</Note>
        ) : (
          <div className={styles.messageList}>
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={message.from === 'staff' ? styles.messageFromUs : styles.messageFromThem}
              >
                <div className={styles.messageWho}>
                  <Icon
                    name={message.from === 'staff' ? 'shield-checkmark-outline' : 'person-outline'}
                    size={14}
                    color="var(--ink3)"
                  />
                  <Text variant="caption" tone="ink3" as="span" raw>
                    {message.from === 'staff'
                      ? `${message.staffName ?? 'SXM Rentals'} · ${longDate(message.sentAt)} at ${clockTime(message.sentAt)}`
                      : `Them · ${longDate(message.sentAt)} at ${clockTime(message.sentAt)}`}
                  </Text>
                  {message.bookingId ? (
                    <Link href={`/bookings/${message.bookingId}`}>
                      <Text variant="caption" tone="brand" as="span" raw>
                        about a booking →
                      </Text>
                    </Link>
                  ) : null}
                </div>
                {/* Their words as text. See the note at the top of this file. */}
                <Text variant="small" tone="ink" as="p" raw>
                  {message.body}
                </Text>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <PageCard title="Answer Them">
        <TextArea
          label="Your reply"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={4}
          maxLength={MAX_REPLY}
          showCount
          placeholder="Write as you would speak to them on the phone."
          hint="Sent to them exactly as written, in the app and by email. There is no editing it afterwards."
          disabled={whyNoChanges !== undefined}
        />

        {problem ? (
          <div style={{ marginTop: 'var(--space-md)' }} className={styles.dialogProblem} role="alert">
            <Icon name="alert-circle-outline" size={16} color="var(--danger)" />
            <Text variant="small" as="p" raw>
              {problem}
            </Text>
          </div>
        ) : null}

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
          <Button
            label="Send Reply"
            variant="primary"
            size="md"
            loading={sending}
            disabled={sending || tooShort || whyNoChanges !== undefined}
            title={whyNoChanges}
            onClick={send}
          />
          {reply !== '' ? (
            <Button label="Clear" variant="ghost" size="md" onClick={() => setReply('')} />
          ) : null}
        </div>

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Note icon={whyNoChanges ? 'lock-closed-outline' : 'warning-outline'} tone="ink2">
            {whyNoChanges ??
              'A reply is not in the audit log: nothing about a record changes, so there is no before and after to record. It is also the one thing in this panel that cannot be put right afterwards — read it once more before sending.'}
          </Note>
        </div>
      </PageCard>
    </>
  );
}
