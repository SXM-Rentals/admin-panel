'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Creating a promotional code — the form behind the New
// Code button on the Promotions screen.
//
// THE COST IS SHOWN BEFORE THE CODE EXISTS. A discount is the one thing on this
// panel that a member of staff can create out of nothing and that costs the
// business real money on every single use. "20% off, limit 1,000 uses" is a
// number nobody can hold in their head; "up to about $70,000 given away if every
// use is taken" is a number somebody stops and thinks about. So the form works
// it out as you type, against the average booking, and says it plainly.
//
// A USAGE LIMIT IS ENCOURAGED RATHER THAN REQUIRED. An unlimited code is a
// legitimate thing to want and an easy thing to regret, so leaving it blank is
// allowed and says out loud what it means.

import React, { useMemo, useState } from 'react';
import { money } from '@/lib/format';
import { Button, Icon, Input, Sheet, Text, useToast } from '@/components/ui';
import { recordAuditEntry } from '@/lib/audit';
import { useAdminSession } from '@/lib/auth';
import type { PromoCode } from '@/types';
import styles from './admin.module.css';

// What a typical booking is worth, used only to turn a discount into a number
// somebody can weigh. The real version should read this from the analytics.
const AVERAGE_BOOKING = 350;

export function NewPromotion({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (draft: Omit<PromoCode, 'id' | 'usedCount'>) => Promise<void> | void;
}) {
  const { staff } = useAdminSession();
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<PromoCode['kind']>('percent');
  const [value, setValue] = useState('10');
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState('');
  const [appliesTo, setAppliesTo] = useState<PromoCode['appliesTo']>('all');
  const [limit, setLimit] = useState('');
  const [working, setWorking] = useState(false);
  const [touched, setTouched] = useState(false);

  const numericValue = Number(value);
  const numericLimit = limit.trim() === '' ? undefined : Number(limit);

  // Every reason the form is not ready, as things somebody can go and fix.
  const problems = useMemo(() => {
    const found: string[] = [];
    if (code.trim().length < 3) found.push('A code of at least three characters');
    if (/\s/.test(code.trim())) found.push('A code with no spaces in it');
    if (description.trim().length < 10) found.push('A line saying what it is for');
    if (!Number.isFinite(numericValue) || numericValue <= 0) found.push('A discount above zero');
    if (kind === 'percent' && numericValue > 100) found.push('A percentage of 100 or less');
    if (!endsAt) found.push('An end date');
    if (endsAt && endsAt < startsAt) found.push('An end date after the start date');
    return found;
  }, [code, description, kind, numericValue, startsAt, endsAt]);

  // What this could cost if every allowed use is taken.
  const exposure = useMemo(() => {
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    const perUse = kind === 'percent' ? (AVERAGE_BOOKING * numericValue) / 100 : numericValue;
    return { perUse, total: numericLimit ? perUse * numericLimit : null };
  }, [kind, numericValue, numericLimit]);

  const reset = () => {
    setCode('');
    setDescription('');
    setKind('percent');
    setValue('10');
    setEndsAt('');
    setAppliesTo('all');
    setLimit('');
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (problems.length > 0 || !staff) return;

    setWorking(true);
    const draft: Omit<PromoCode, 'id' | 'usedCount'> = {
      code: code.trim().toUpperCase(),
      description: description.trim(),
      kind,
      value: numericValue,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      // A code dated in the future is scheduled rather than running, so the list
      // does not claim something is live when it has not started.
      status: new Date(startsAt) > new Date() ? 'scheduled' : 'active',
      usageLimit: numericLimit,
      appliesTo,
    };

    await onCreated(draft);

    // Creating a discount is a change to the platform, so it lands in the log
    // like every other one. There is no reason dialog here because the
    // description is the reason — it is required, and it is what the code is.
    recordAuditEntry({
      staffId: staff.id,
      staffName: staff.name,
      action: 'promotion_changed',
      subjectType: 'platform',
      subjectId: draft.code,
      subjectLabel: `Promotion ${draft.code}`,
      field: 'Promotion created',
      before: 'Did not exist',
      after: `${draft.kind === 'percent' ? `${draft.value}% off` : `${money(draft.value)} off`} · ${draft.usageLimit ? `${draft.usageLimit} uses` : 'no usage limit'}`,
      reason: draft.description,
    });

    setWorking(false);
    reset();
    onClose();
    showToast(`${draft.code} created.`, 'Written to the audit log.');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New promotional code"
      footer={
        <>
          <Button label="Cancel" variant="outline" size="md" onClick={onClose} />
          <Button
            label="Create Code"
            variant="primary"
            size="md"
            onClick={submit}
            loading={working}
            disabled={problems.length > 0}
          />
        </>
      }
    >
      <div className={styles.reasonBody}>
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onBlur={() => setTouched(true)}
          placeholder="SUMMER26"
          hint="What the customer types at checkout. Capitals, no spaces."
          required
        />

        <Input
          label="What it is for"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ten percent off any rental for verified residents."
          hint="Shown in the list, and recorded in the audit log as the reason this was created."
          required
        />

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="promo-kind" raw>
              DISCOUNT
            </Text>
            <select
              id="promo-kind"
              className={styles.select}
              value={kind}
              onChange={(event) => setKind(event.target.value as PromoCode['kind'])}
            >
              <option value="percent">A Percentage Off</option>
              <option value="fixed">A Fixed Amount Off</option>
            </select>
          </div>

          <div className={styles.formField}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="promo-value" raw>
              {kind === 'percent' ? 'PERCENT' : 'AMOUNT'}
            </Text>
            <input
              id="promo-value"
              className={styles.numberInput}
              type="number"
              min={1}
              max={kind === 'percent' ? 100 : undefined}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="promo-audience" raw>
              WHO CAN USE IT
            </Text>
            <select
              id="promo-audience"
              className={styles.select}
              value={appliesTo}
              onChange={(event) => setAppliesTo(event.target.value as PromoCode['appliesTo'])}
            >
              <option value="all">Everybody</option>
              <option value="local">Residents Only</option>
              <option value="tourist">Visitors Only</option>
              <option value="first_booking">First Booking Only</option>
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="promo-start" raw>
              STARTS
            </Text>
            <input
              id="promo-start"
              className={styles.dateInput}
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="promo-end" raw>
              ENDS
            </Text>
            <input
              id="promo-end"
              className={styles.dateInput}
              type="date"
              value={endsAt}
              min={startsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="promo-limit" raw>
              USAGE LIMIT
            </Text>
            <input
              id="promo-limit"
              className={styles.numberInput}
              type="number"
              min={1}
              value={limit}
              placeholder="None"
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>
        </div>

        {/* ---- WHAT THIS COULD COST ---- */}
        {exposure ? (
          <div className={styles.changePreview}>
            <Text variant="caption" tone="ink3" as="p" raw>
              WHAT THIS COULD COST
            </Text>
            <Text variant="label" as="p" raw>
              About {money(exposure.perUse)} a booking
              {exposure.total !== null
                ? ` · up to about ${money(exposure.total)} if every one of the ${numericLimit?.toLocaleString()} uses is taken`
                : ''}
            </Text>
            <Text variant="small" tone="ink3" as="p" raw>
              Worked against an average booking of {money(AVERAGE_BOOKING)}.
            </Text>
            {numericLimit === undefined ? (
              <div className={styles.inlineNote} style={{ marginTop: 'var(--space-sm)' }}>
                <Icon name="warning-outline" size={15} color="var(--warning)" />
                <Text variant="small" tone="ink2" as="p" raw>
                  With no usage limit there is no ceiling on this. That is allowed, and worth
                  meaning to do.
                </Text>
              </div>
            ) : null}
          </div>
        ) : null}

        {touched && problems.length > 0 ? (
          <div className={styles.openQuestion}>
            <Icon name="alert-circle-outline" size={16} color="var(--warning)" />
            <div>
              <Text variant="label" as="p" raw>
                Still needed
              </Text>
              <ul style={{ marginTop: 6 }}>
                {problems.map((problem) => (
                  <li key={problem}>
                    <Text variant="small" tone="ink2" as="span" raw>
                      · {problem}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

export default NewPromotion;
