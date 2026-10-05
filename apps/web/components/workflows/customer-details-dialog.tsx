'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Dialog, Input } from '../ui';
import { SupervisorCustomerStatusBadge } from './supervisor-customer-status-badge';

export type SupervisorCustomerRecord = Record<string, unknown> & {
  id?: string;
  fullName?: string;
  phoneE164?: string;
  email?: string;
  status?: string;
  activeCardStatus?: string;
  activeCardSerialNumber?: string;
  activeCard?: unknown;
};

export type CustomerProfileValues = Readonly<{
  fullName: string;
  phone: string;
  email: string;
}>;

export function CustomerDetailsDialog({
  open,
  customer,
  profile,
  profileDirty,
  loading,
  loadFailed,
  busy,
  message,
  status,
  confirmation,
  statusEditorOpen,
  onProfileChange,
  onConfirmationChange,
  onStatusChange,
  onOpenStatusEditor,
  onCancelStatusEditor,
  onRetry,
  onSave,
  onChangeStatus,
  onClose,
}: Readonly<{
  open: boolean;
  customer: SupervisorCustomerRecord | null;
  profile: CustomerProfileValues;
  profileDirty: boolean;
  loading: boolean;
  loadFailed: boolean;
  busy: boolean;
  message: string;
  status: 'ACTIVE' | 'BLOCKED';
  confirmation: string;
  statusEditorOpen: boolean;
  onProfileChange: (field: keyof CustomerProfileValues, value: string) => void;
  onConfirmationChange: (value: string) => void;
  onStatusChange: (status: 'ACTIVE' | 'BLOCKED') => void;
  onOpenStatusEditor: () => void;
  onCancelStatusEditor: () => void;
  onRetry: () => void;
  onSave: () => void;
  onChangeStatus: () => void;
  onClose: () => void;
}>) {
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const activeCard =
    customer?.activeCard && typeof customer.activeCard === 'object'
      ? (customer.activeCard as Record<string, unknown>)
      : null;
  const cardStatus = customer?.activeCardStatus ?? activeCard?.status;
  const cardSerial =
    typeof customer?.activeCardSerialNumber === 'string'
      ? customer.activeCardSerialNumber.trim()
      : typeof activeCard?.serialNumber === 'string'
        ? activeCard.serialNumber.trim()
        : '';
  const cardStatusLabel =
    cardStatus === 'ACTIVE'
      ? 'Active card'
      : cardStatus === 'BLOCKED'
        ? 'Blocked card'
        : 'Card status not included';
  const expectedConfirmation = status === 'BLOCKED' ? 'BLOCK' : 'ACTIVATE';
  const hasPendingEdits =
    profileDirty || statusEditorOpen || Boolean(confirmation.trim());

  useEffect(() => {
    if (discardPrompt) keepEditingRef.current?.focus();
  }, [discardPrompt]);

  useEffect(() => {
    setDiscardPrompt(false);
  }, [customer?.id, open]);

  function requestClose() {
    if (busy) return;
    if (hasPendingEdits) {
      setDiscardPrompt(true);
      return;
    }
    onClose();
  }

  function discardChanges() {
    setDiscardPrompt(false);
    onClose();
  }

  function keepEditing() {
    setDiscardPrompt(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy && !loading && profileDirty) onSave();
  }

  return (
    <Dialog open={open} title="Customer details" onClose={requestClose}>
      <div className="sc-customer-details">
        <button
          type="button"
          aria-label="Close customer details"
          className="sc-customer-details__close"
          disabled={busy}
          onClick={requestClose}
        >
          <span aria-hidden="true">×</span>
        </button>

        {discardPrompt ? (
          <section
            className="sc-customer-details__discard"
            aria-labelledby="customer-discard-title"
            aria-describedby="customer-discard-description"
          >
            <h2 id="customer-discard-title">Discard unsaved changes?</h2>
            <p id="customer-discard-description">
              Your edits haven&apos;t been saved.
            </p>
            <div className="sc-customer-details__actions">
              <Button
                ref={keepEditingRef}
                type="button"
                variant="secondary"
                onClick={keepEditing}
              >
                Keep editing
              </Button>
              <Button type="button" variant="danger" onClick={discardChanges}>
                Discard
              </Button>
            </div>
          </section>
        ) : (
          <>
            {customer ? (
              <>
                <header className="sc-customer-details__identity">
                  <div className="min-w-0">
                    <h2>{String(customer.fullName ?? 'Customer')}</h2>
                    <p>{String(customer.phoneE164 ?? 'Phone not provided')}</p>
                  </div>
                  <div className="sc-customer-details__badges">
                    <div>
                      <span>Customer</span>
                      <SupervisorCustomerStatusBadge
                        status={customer.status}
                        fallback="Status not provided"
                      />
                    </div>
                    <div>
                      <span>Linked card</span>
                      <span className="sc-customer-details__card-status">
                        {cardStatusLabel}
                      </span>
                    </div>
                  </div>
                </header>

                {message ? (
                  <p role="status" aria-live="polite" className="text-sm">
                    {message}
                  </p>
                ) : null}
                {loadFailed ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || loading}
                    onClick={onRetry}
                  >
                    Retry customer details
                  </Button>
                ) : null}

                <form
                  className="sc-customer-details__form"
                  onSubmit={submitProfile}
                >
                  <section
                    className="sc-customer-details__section"
                    aria-labelledby="customer-profile-heading"
                  >
                    <h3 id="customer-profile-heading">Profile</h3>
                    <div className="sc-customer-details__fields">
                      <label htmlFor="manage-customer-name">
                        Full name
                        <Input
                          ref={nameRef}
                          id="manage-customer-name"
                          required
                          disabled={busy || loading}
                          value={profile.fullName}
                          onChange={(event) =>
                            onProfileChange('fullName', event.target.value)
                          }
                        />
                      </label>
                      <label htmlFor="manage-customer-phone">
                        Phone number
                        <Input
                          id="manage-customer-phone"
                          type="tel"
                          required
                          disabled={busy || loading}
                          value={profile.phone}
                          onChange={(event) =>
                            onProfileChange('phone', event.target.value)
                          }
                        />
                      </label>
                      <label
                        className="sc-customer-details__email"
                        htmlFor="manage-customer-email"
                      >
                        Email
                        <Input
                          id="manage-customer-email"
                          type="email"
                          disabled={busy || loading}
                          value={profile.email}
                          onChange={(event) =>
                            onProfileChange('email', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <section
                    className="sc-customer-details__section sc-customer-details__account"
                    aria-labelledby="customer-account-status-heading"
                  >
                    <div className="sc-customer-details__section-heading">
                      <div>
                        <h3 id="customer-account-status-heading">
                          Account status
                        </h3>
                        <p>Manage whether this customer can use ShopCity.</p>
                      </div>
                      <SupervisorCustomerStatusBadge
                        status={customer.status}
                        fallback="Status not provided"
                      />
                    </div>
                    {statusEditorOpen ? (
                      <div className="sc-customer-details__status-editor">
                        <label htmlFor="customer-status">
                          New status
                          <select
                            id="customer-status"
                            className="sc-control sc-input"
                            disabled={busy || loading || profileDirty}
                            value={status}
                            onChange={(event) =>
                              onStatusChange(
                                event.target.value as 'ACTIVE' | 'BLOCKED',
                              )
                            }
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </label>
                        <label htmlFor="customer-status-confirmation">
                          Type {expectedConfirmation} to confirm
                          <input
                            id="customer-status-confirmation"
                            className="sc-control sc-input"
                            disabled={busy || loading || profileDirty}
                            value={confirmation}
                            onChange={(event) =>
                              onConfirmationChange(event.target.value)
                            }
                          />
                        </label>
                        {profileDirty ? (
                          <p>
                            Save or discard profile edits before changing
                            account status.
                          </p>
                        ) : null}
                        <div className="sc-customer-details__actions">
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={busy || loading}
                            onClick={onCancelStatusEditor}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant={
                              status === 'BLOCKED' ? 'danger' : 'primary'
                            }
                            loading={busy}
                            disabled={
                              loading ||
                              profileDirty ||
                              status === customer.status ||
                              confirmation.trim().toUpperCase() !==
                                expectedConfirmation
                            }
                            onClick={onChangeStatus}
                          >
                            {status === 'BLOCKED'
                              ? 'Block customer'
                              : 'Activate customer'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">
                          Change status only when the customer account needs to
                          be blocked or restored.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || loading || profileDirty}
                          onClick={onOpenStatusEditor}
                        >
                          Change status
                        </Button>
                        {profileDirty ? (
                          <p className="text-sm">
                            Save or discard profile edits before changing
                            account status.
                          </p>
                        ) : null}
                      </>
                    )}
                  </section>

                  <section
                    className="sc-customer-details__section sc-customer-details__linked-card"
                    aria-labelledby="customer-linked-card-heading"
                  >
                    <h3 id="customer-linked-card-heading">Linked card</h3>
                    {cardSerial ? (
                      <p>
                        Card ending {cardSerial.replace(/\W/g, '').slice(-4)}
                      </p>
                    ) : (
                      <p>Card serial not included in customer details.</p>
                    )}
                    {customer.id ? (
                      <Link
                        className="sc-customer-details__card-link"
                        href={`/supervisor/cards?tab=assign&id=${encodeURIComponent(customer.id)}`}
                      >
                        Manage linked card →
                      </Link>
                    ) : null}
                  </section>

                  <footer className="sc-customer-details__actions">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={requestClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={busy}
                      disabled={loading || !profileDirty}
                    >
                      Save changes
                    </Button>
                  </footer>
                </form>
              </>
            ) : (
              <section className="sc-customer-details__load-state">
                <p role="status" aria-live="polite">
                  {loading
                    ? 'Loading customer details…'
                    : message || 'Customer details could not be loaded.'}
                </p>
                {loadFailed ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || loading}
                    onClick={onRetry}
                  >
                    Retry customer details
                  </Button>
                ) : null}
                <div className="sc-customer-details__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
