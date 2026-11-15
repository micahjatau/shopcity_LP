'use client';

import { useEffect, useState } from 'react';
import {
  branchesControllerListBranchesV1,
  configurationControllerGetPolicyConfigurationV1,
  configurationControllerUpdatePolicyConfigurationV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import {
  formatBasisPointsAsPercent,
  parsePercentAsBasisPoints,
} from '../../../../lib/policy-money';
import pageFrameStyles from '../../../../components/workflows/admin-workspace-page.module.css';
import styles from '../../../../components/workflows/admin-policies-page.module.css';
import { Alert, Button, Input } from '../../../../components/ui';
import {
  formatMoneyInputDraft,
  parseNaira,
  StatusBadge,
} from '../../../../components/shopcity';

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
  { key: 'defaultEarnRateBps', label: 'Earn rate (%)' },
  { key: 'minRedemptionKobo', label: 'Minimum redemption (₦)' },
  {
    key: 'maxRedemptionBasketPercent',
    label: 'Max redemption per basket (%)',
  },
  { key: 'purchaseFlagThresholdKobo', label: 'Flag purchases over (₦)' },
  {
    key: 'purchaseApprovalThresholdKobo',
    label: 'Purchase approval over (₦)',
  },
  { key: 'purchaseAmountCeilingKobo', label: 'Maximum purchase (₦)' },
  {
    key: 'redemptionApprovalThresholdKobo',
    label: 'Redemption approval over (₦)',
  },
];

export default function AdminPoliciesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [drafts, setDrafts] = useState<
    Partial<Record<(typeof policyFields)[number]['key'], string>>
  >({});
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
            ? 'Choose a branch to view its policy.'
            : 'No active branches.',
        );
      } catch {
        setMessage("Couldn't load branches.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!branchId) {
      setPolicy(null);
      return;
    }
    void (async () => {
      setMessage('Loading policy…');
      try {
        const response = await configurationControllerGetPolicyConfigurationV1(
          { branchId },
          createApiRequest({ csrf: true }),
        );
        if (response.status === 200 && response.data.data) {
          const loadedPolicy = response.data.data as unknown as Policy;
          setPolicy(loadedPolicy);
          setDrafts(
            Object.fromEntries(
              policyFields.map(({ key }) => [
                key,
                formatPolicyField(loadedPolicy, key),
              ]),
            ),
          );
          setMessage('Policy loaded.');
        } else {
          setMessage(`Policy unavailable (HTTP ${response.status}).`);
        }
      } catch {
        setMessage("Couldn't load this policy.");
      }
    })();
  }, [branchId]);

  function updateField(
    key: (typeof policyFields)[number]['key'],
    value: string,
  ) {
    setDrafts((current) => ({ ...current, [key]: value }));
    const parsed = parsePolicyField(key, value);
    if (parsed !== null) {
      setPolicy((current) =>
        current ? { ...current, [key]: parsed } : current,
      );
    }
  }

  async function save() {
    if (!policy) return;
    const parsedDrafts = Object.fromEntries(
      policyFields.map(({ key }) => [
        key,
        parsePolicyField(key, drafts[key] ?? formatPolicyField(policy, key)),
      ]),
    ) as Record<(typeof policyFields)[number]['key'], number | null>;
    if (Object.values(parsedDrafts).some((value) => value === null)) {
      setMessage('Check the policy values before saving.');
      return;
    }
    const valueFor = (key: (typeof policyFields)[number]['key']) =>
      parsePolicyField(key, drafts[key] ?? formatPolicyField(policy, key)) ??
      policy[key];
    setSaving(true);
    setMessage('Saving changes…');
    try {
      const response = await configurationControllerUpdatePolicyConfigurationV1(
        {
          branchId: policy.branchId,
          defaultEarnRateBps: valueFor('defaultEarnRateBps'),
          minRedemptionKobo: valueFor('minRedemptionKobo'),
          maxRedemptionBasketPercent: valueFor('maxRedemptionBasketPercent'),
          purchaseFlagThresholdKobo: valueFor('purchaseFlagThresholdKobo'),
          purchaseApprovalThresholdKobo: valueFor(
            'purchaseApprovalThresholdKobo',
          ),
          purchaseAmountCeilingKobo: valueFor('purchaseAmountCeilingKobo'),
          redemptionApprovalThresholdKobo: valueFor(
            'redemptionApprovalThresholdKobo',
          ),
          offlineRedemptionDisabled: policy.offlineRedemptionDisabled,
          expectedVersion: policy.version,
        },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      if (response.status === 200 && response.data.data) {
        const savedPolicy = response.data.data as unknown as Policy;
        setPolicy(savedPolicy);
        setDrafts(
          Object.fromEntries(
            policyFields.map(({ key }) => [
              key,
              formatPolicyField(savedPolicy, key),
            ]),
          ),
        );
        setMessage('Policy saved.');
      } else if (response.status === 409) {
        setMessage('This policy changed elsewhere. Reload it before saving.');
      } else {
        setMessage(`Couldn't save policy (HTTP ${response.status}).`);
      }
    } catch {
      setMessage("Couldn't save changes. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={pageFrameStyles.page}
      data-testid="admin-workspace-page"
    >
      <header className={pageFrameStyles.header}>
        <h1 className={pageFrameStyles.title}>Policies</h1>
        <p className={pageFrameStyles.description}>
          Set purchase and redemption rules for each branch.
        </p>
      </header>

      <Alert tone="info" title="Policy changes">
        Changes are checked and recorded. If someone updates a policy while you
        edit it, reload it before saving.
      </Alert>

      <section className={styles.panel} aria-label="Policy editor">
        <div className={styles.toolbar}>
          <label className={styles.branchField}>
            <span className={styles.label}>Branch</span>
            <select
              className={styles.select}
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Choose a branch</option>
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

        <p role="status" className={styles.status}>
          {message}
        </p>

        {policy ? (
          <>
            <div className={styles.formGrid} data-testid="policy-fields">
              {policyFields.map(({ key, label }) => (
                <label
                  key={key}
                  htmlFor={`policy-${key}`}
                  className={styles.formField}
                >
                  <span>{label}</span>
                  <Input
                    id={`policy-${key}`}
                    className={styles.input}
                    type="text"
                    inputMode="decimal"
                    value={drafts[key] ?? formatPolicyField(policy, key)}
                    onChange={(event) => updateField(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={policy.offlineRedemptionDisabled}
                onChange={(event) =>
                  setPolicy((current) =>
                    current
                      ? {
                          ...current,
                          offlineRedemptionDisabled: event.target.checked,
                        }
                      : current,
                  )
                }
              />
              Disable offline redemption
            </label>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        ) : null}
      </section>
    </section>
  );
}

function formatPolicyField(
  policy: Policy,
  key: (typeof policyFields)[number]['key'],
) {
  if (key === 'defaultEarnRateBps') {
    return formatBasisPointsAsPercent(policy.defaultEarnRateBps);
  }
  if (key === 'maxRedemptionBasketPercent') {
    return String(policy.maxRedemptionBasketPercent);
  }
  return formatMoneyInputDraft(policy[key]);
}

function parsePolicyField(
  key: (typeof policyFields)[number]['key'],
  value: string,
) {
  if (key === 'defaultEarnRateBps') return parsePercentAsBasisPoints(value);
  if (key === 'maxRedemptionBasketPercent') {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100
      ? parsed
      : null;
  }
  return parseNaira(value);
}
