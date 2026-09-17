'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  branchesControllerListBranchesV1,
  configurationControllerGetPolicyConfigurationV1,
  configurationControllerUpdatePolicyConfigurationV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/shopcity';

type Branch = { id?: string; name?: string; status?: string };
type Policy = {
  branchId: string;
  branchName?: string;
  version: number;
  defaultEarnRateBps: number;
  minRedemptionKobo: number;
  maxRedemptionBasketPercent: number;
  purchaseFlagThresholdKobo: number;
  purchaseApprovalThresholdKobo: number;
  purchaseAmountCeilingKobo: number;
  redemptionApprovalThresholdKobo: number;
  offlineRedemptionDisabled: boolean;
};

const policyFields: Array<{
  key: Exclude<
    keyof Policy,
    'branchId' | 'branchName' | 'version' | 'offlineRedemptionDisabled'
  >;
  label: string;
}> = [
  { key: 'defaultEarnRateBps', label: 'Default earn rate (basis points)' },
  { key: 'minRedemptionKobo', label: 'Minimum redemption (kobo)' },
  { key: 'maxRedemptionBasketPercent', label: 'Maximum basket percentage' },
  { key: 'purchaseFlagThresholdKobo', label: 'Purchase flag threshold (kobo)' },
  {
    key: 'purchaseApprovalThresholdKobo',
    label: 'Purchase approval threshold (kobo)',
  },
  { key: 'purchaseAmountCeilingKobo', label: 'Purchase amount ceiling (kobo)' },
  {
    key: 'redemptionApprovalThresholdKobo',
    label: 'Redemption approval threshold (kobo)',
  },
];

export default function AdminPoliciesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [message, setMessage] = useState('Loading branches…');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await branchesControllerListBranchesV1(
          createApiRequest({ csrf: true }),
        );
        const items =
          response.status === 200 && Array.isArray(response.data.data)
            ? (response.data.data as Branch[]).filter(
                (item) => item.status !== 'INACTIVE',
              )
            : [];
        setBranches(items);
        setBranchId(items[0]?.id ?? '');
        setMessage(
          items.length
            ? 'Select a branch to load policy.'
            : 'No active branches found.',
        );
      } catch {
        setMessage('Branch configuration is unavailable.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!branchId) {
      setPolicy(null);
      return;
    }
    void (async () => {
      setMessage('Loading authoritative policy…');
      try {
        const response = await configurationControllerGetPolicyConfigurationV1(
          { branchId },
          createApiRequest({ csrf: true }),
        );
        if (response.status === 200 && response.data.data) {
          setPolicy(response.data.data as unknown as Policy);
          setMessage('Authoritative policy loaded.');
        } else {
          setMessage(`Policy unavailable (${response.status}).`);
        }
      } catch {
        setMessage('Policy configuration is unavailable.');
      }
    })();
  }, [branchId]);

  function updateField(key: keyof Policy, value: string | boolean) {
    setPolicy((current) =>
      current
        ? {
            ...current,
            [key]: typeof value === 'boolean' ? value : Number(value),
          }
        : current,
    );
  }

  async function save() {
    if (!policy) return;
    setSaving(true);
    setMessage('Saving policy…');
    try {
      const response = await configurationControllerUpdatePolicyConfigurationV1(
        {
          branchId: policy.branchId,
          defaultEarnRateBps: policy.defaultEarnRateBps,
          minRedemptionKobo: policy.minRedemptionKobo,
          maxRedemptionBasketPercent: policy.maxRedemptionBasketPercent,
          purchaseFlagThresholdKobo: policy.purchaseFlagThresholdKobo,
          purchaseApprovalThresholdKobo: policy.purchaseApprovalThresholdKobo,
          purchaseAmountCeilingKobo: policy.purchaseAmountCeilingKobo,
          redemptionApprovalThresholdKobo:
            policy.redemptionApprovalThresholdKobo,
          offlineRedemptionDisabled: policy.offlineRedemptionDisabled,
          expectedVersion: policy.version,
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status === 200 && response.data.data) {
        setPolicy(response.data.data as unknown as Policy);
        setMessage('Policy saved and audited.');
      } else if (response.status === 409) {
        setMessage('Policy changed elsewhere. Reload before saving.');
      } else {
        setMessage(`Policy was not saved (${response.status}).`);
      }
    } catch {
      setMessage('Policy was not saved. Check the values and retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={layout}>
      <header style={header}>
        <div>
          <p style={eyebrow}>ADMIN CONFIGURATION</p>
          <h1 style={{ margin: 0 }}>Policy configuration</h1>
          <p style={muted}>
            Branch-scoped values are validated by the backend, versioned, and
            recorded in the audit log.
          </p>
        </div>
        <Link href="/admin">Back to admin</Link>
      </header>

      <Alert tone="info" title="Server-authoritative policy">
        Cashier and Supervisor workspaces cannot mutate these values. A stale
        save is rejected rather than overwriting a newer Admin change.
      </Alert>

      <section style={card} aria-label="Policy editor">
        <div style={toolbar}>
          <label style={field}>
            <span>Branch</span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name ?? branch.id}
                </option>
              ))}
            </select>
          </label>
          <StatusBadge
            label={policy ? `Version ${policy.version}` : 'No policy loaded'}
            tone={policy ? 'success' : 'neutral'}
          />
        </div>

        <p role="status" style={muted}>
          {message}
        </p>

        {policy ? (
          <>
            <div style={grid}>
              {policyFields.map(({ key, label }) => (
                <Input
                  key={key}
                  aria-label={label}
                  type="number"
                  value={policy[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                />
              ))}
            </div>
            <label style={checkbox}>
              <input
                type="checkbox"
                checked={policy.offlineRedemptionDisabled}
                onChange={(event) =>
                  updateField('offlineRedemptionDisabled', event.target.checked)
                }
              />
              Disable offline redemption
            </label>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save policy'}
            </Button>
          </>
        ) : null}
      </section>
    </section>
  );
}

const layout = { display: 'grid', gap: 'var(--sc-spacing-6)' } as const;
const header = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-4)',
  alignItems: 'start',
} as const;
const card = {
  display: 'grid',
  gap: 'var(--sc-spacing-5)',
  padding: 'var(--sc-spacing-6)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  background: 'var(--sc-color-semantic-surface)',
} as const;
const toolbar = {
  display: 'flex',
  alignItems: 'end',
  gap: 'var(--sc-spacing-4)',
  flexWrap: 'wrap',
} as const;
const field = {
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
  minWidth: 280,
} as const;
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 'var(--sc-spacing-4)',
} as const;
const checkbox = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  alignItems: 'center',
} as const;
const eyebrow = {
  margin: 0,
  color: 'var(--sc-color-semantic-brand)',
  fontWeight: 700,
  letterSpacing: '0.08em',
} as const;
const muted = { color: 'var(--sc-color-semantic-textSecondary)' } as const;
