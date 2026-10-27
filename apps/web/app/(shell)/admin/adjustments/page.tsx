'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  adjustmentsControllerCreateV1,
  customersControllerGetCustomerV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import {
  ADJUSTMENT_IDENTITY_FAILURE_MESSAGE,
  clearAdjustmentOperationIdentity,
  getAdjustmentOperationIdentity,
} from '../../../../lib/adjustment-operation';
import {
  Alert,
  Button,
  Input,
  RadioGroup,
  Table,
  Textarea,
} from '../../../../components/ui';
import {
  Money,
  MoneyInput,
  StatusBadge,
} from '../../../../components/shopcity';

const routeLinks = [
  ['/admin/users', 'Users'],
  ['/admin/devices', 'Devices'],
  ['/admin/branches', 'Branches'],
  ['/admin/cards', 'Cards'],
  ['/admin/audit', 'Audit'],
] as const;

export default function AdminAdjustmentsPage() {
  const [customerId, setCustomerId] = useState('');
  const [amountKobo, setAmountKobo] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [kind, setKind] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const submissionInFlight = useRef(false);
  const [customerRecord, setCustomerRecord] = useState<{
    fullName?: string;
    balanceKobo?: number;
    availableBalanceKobo?: number;
  } | null>(null);
  const [message, setMessage] = useState(
    'Prepare an adjustment with consequence preview.',
  );
  const [actionMessage, setActionMessage] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);
  useEffect(() => {
    let ignore = false;

    async function loadCustomer() {
      if (!customerId.trim()) {
        setCustomerRecord(null);
        return;
      }

      try {
        const response = await customersControllerGetCustomerV1(
          customerId.trim(),
          createApiRequest({ csrf: true }),
        );
        if (!ignore && response.status === 200) {
          setCustomerRecord(response.data.data);
          return;
        }
      } catch {
        // fall through to clear the preview
      }

      if (!ignore) {
        setCustomerRecord(null);
      }
    }

    void loadCustomer();

    return () => {
      ignore = true;
    };
  }, [customerId]);

  const preview = useMemo(() => {
    if (amountKobo === null || amountKobo <= 0) return null;
    const currentBalanceKobo =
      customerRecord?.balanceKobo ??
      customerRecord?.availableBalanceKobo ??
      null;
    const projectedBalanceKobo =
      currentBalanceKobo === null
        ? null
        : kind === 'CREDIT'
          ? currentBalanceKobo + amountKobo
          : currentBalanceKobo - amountKobo;
    return {
      label: kind === 'CREDIT' ? 'Credit' : 'Debit',
      amountKobo,
      currentBalanceKobo,
      projectedBalanceKobo,
      impact: kind === 'CREDIT' ? 'Balance increases' : 'Balance decreases',
    };
  }, [amountKobo, customerRecord, kind]);

  const selectedPreview = useMemo(
    () => [
      [
        'Customer',
        customerRecord?.fullName ?? customerId ?? 'Enter a customer ID',
      ],
      [
        'Current balance',
        preview?.currentBalanceKobo ??
          customerRecord?.balanceKobo ??
          customerRecord?.availableBalanceKobo ??
          '—',
      ],
      ['Adjustment', preview ? preview.amountKobo : amountKobo],
      ['Projected balance', preview?.projectedBalanceKobo ?? '—'],
      ['Reason', reason || 'Enter a reason'],
      ['Kind', kind],
      ['Confirmation', confirmation || 'Type SUBMIT'],
    ],
    [
      amountKobo,
      confirmation,
      customerId,
      customerRecord,
      kind,
      preview,
      reason,
    ],
  );

  async function submit() {
    if (submissionInFlight.current) return;
    if (!customerId.trim() || amountKobo === null || amountKobo <= 0) {
      setMessage('Enter a customer ID and positive amount first.');
      return;
    }
    if (confirmation.trim().toUpperCase() !== 'SUBMIT') {
      setMessage('Type SUBMIT to confirm the adjustment.');
      return;
    }

    const payload = {
      customerId: customerId.trim(),
      amountKobo,
      reason: reason.trim(),
      kind,
    };
    submissionInFlight.current = true;
    try {
      setActionMessage('Submitting adjustment…');
      const identity = await getAdjustmentOperationIdentity(payload);
      const response = await adjustmentsControllerCreateV1(
        { ...payload, effectiveAt: identity.effectiveAt },
        createApiRequest({
          csrf: true,
          idempotencyKey: identity.idempotencyKey,
        }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? response.data
          : null,
      );
      setMessage(
        response.status === 201
          ? 'Adjustment created.'
          : `Adjustment unavailable (${response.status}).`,
      );
      if (response.status === 201) {
        await clearAdjustmentOperationIdentity(payload, identity);
        setConfirmation('');
      }
    } catch (error) {
      setMessage(
        error instanceof Error &&
          error.message === ADJUSTMENT_IDENTITY_FAILURE_MESSAGE
          ? ADJUSTMENT_IDENTITY_FAILURE_MESSAGE
          : 'Adjustment outcome is uncertain. Retry the unchanged draft to avoid creating a second adjustment.',
      );
    } finally {
      submissionInFlight.current = false;
      setActionMessage('');
    }
  }

  return (
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Adjustments</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Manual credit and debit adjustments with consequence preview.
        </p>
        <Link href="/admin">Back to admin</Link>
        <div style={routeRow}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </header>

      <div style={summaryRow}>
        <StatusBadge
          label={kind === 'CREDIT' ? 'Credit' : 'Debit'}
          tone={kind === 'CREDIT' ? 'success' : 'warning'}
        />
        <StatusBadge
          label={
            confirmation.trim() ? 'Confirmation ready' : 'Confirmation required'
          }
          tone={confirmation.trim() ? 'info' : 'warning'}
        />
        <StatusBadge label={customerId || 'Customer pending'} tone="neutral" />
      </div>

      <Alert tone="info" title="Review first">
        Adjustments are audited and should be submitted deliberately.
      </Alert>

      <section style={cardStyle} aria-label="Adjustment form">
        <h2 style={{ marginTop: 0 }}>Adjustment form</h2>
        <div style={formGrid}>
          <Input
            aria-label="Customer ID"
            placeholder="Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
          <MoneyInput
            aria-label="Amount"
            placeholder="Amount in naira"
            valueKobo={amountKobo}
            onValueChange={setAmountKobo}
          />
        </div>
        <RadioGroup
          name="adjustment-kind"
          legend="Adjustment type"
          value={kind}
          onValueChange={(value) => setKind(value as 'CREDIT' | 'DEBIT')}
          options={[
            { value: 'CREDIT', label: 'Credit' },
            { value: 'DEBIT', label: 'Debit' },
          ]}
        />
        <Textarea
          aria-label="Reason"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <Input
          aria-label="Confirmation"
          placeholder="Type SUBMIT to confirm"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <div style={toolbarRow}>
          <Button onClick={() => void submit()}>Submit adjustment</Button>
        </div>
      </section>

      {preview ? (
        <section style={cardStyle} aria-label="Consequence preview">
          <Alert
            tone={kind === 'CREDIT' ? 'success' : 'warning'}
            title="Consequence preview"
          >
            <div style={previewHeaderRow}>
              <StatusBadge
                label={preview.label}
                tone={kind === 'CREDIT' ? 'success' : 'warning'}
              />
              <StatusBadge label={preview.impact} tone="info" />
            </div>
            <Money amountKobo={preview.amountKobo} />
          </Alert>
          <Table>
            <tbody>
              {selectedPreview.map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{renderValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      ) : null}

      <section style={cardStyle} aria-label="Action response">
        <h2 style={{ marginTop: 0 }}>Action response</h2>
        <p style={muted}>
          {actionMessage ||
            'Submit an adjustment to see the backend response here.'}
        </p>
        <p style={muted}>{message}</p>
        {actionResponse ? (
          <Table>
            <tbody>
              {Object.entries(actionResponse)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        ) : null}
      </section>
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

const layoutGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const headerGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-4)',
  background: 'var(--sc-color-neutral-0)',
  boxShadow: 'var(--sc-shadow-level1)',
};

const formGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
};

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const summaryRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const previewHeaderRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  flexWrap: 'wrap',
  marginBottom: 'var(--sc-spacing-2)',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};
