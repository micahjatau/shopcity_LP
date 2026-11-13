'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SupervisorCardAssignment } from './supervisor-card-assignment';
import { SupervisorIssuedCardDirectory } from './supervisor-issued-card-directory';
import { Button, Dialog } from '../ui';
import { CashierPageHeader } from '../shopcity';

export function SupervisorCardWorkflows({
  audience = 'supervisor',
}: Readonly<{ audience?: 'supervisor' | 'admin' }> = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const isAdmin = audience === 'admin';
  const cardsHref = isAdmin ? '/admin/cards' : '/supervisor/cards';
  const assignmentRouteRequested = params.get('tab') === 'assign';
  const [assignmentOpen, setAssignmentOpen] = useState(
    assignmentRouteRequested,
  );

  useEffect(() => {
    if (assignmentRouteRequested) setAssignmentOpen(true);
  }, [assignmentRouteRequested]);

  function openAssignment() {
    setAssignmentOpen(true);
  }

  function closeAssignment() {
    if (
      document.querySelector(
        '[role="dialog"][aria-label="Assignment eligibility"]',
      )
    ) {
      return;
    }
    setAssignmentOpen(false);
    if (assignmentRouteRequested) {
      router.replace(cardsHref, { scroll: false });
    }
  }

  return (
    <section
      className={`supervisor-page sc-page${isAdmin ? ' admin-card-management-page' : ''}`}
      aria-label={isAdmin ? 'Card management workspace' : undefined}
    >
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Cards"
        description="Review issued cards or assign a card."
      />
      <div inert={assignmentOpen}>
        <SupervisorIssuedCardDirectory
          audience={audience}
          onAssignCard={openAssignment}
        />
      </div>
      <Dialog
        open={assignmentOpen}
        title="Assign card"
        onClose={closeAssignment}
      >
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={closeAssignment}>
            Close assignment
          </Button>
        </div>
        <SupervisorCardAssignment
          customerId={params.get('id')}
          initialQuery={params.get('q') ?? ''}
          onCustomerId={(id) => {
            const next = new URLSearchParams(params.toString());
            if (id) next.set('id', id);
            else next.delete('id');
            next.set('tab', 'assign');
            router.replace(`${cardsHref}?${next.toString()}`, {
              scroll: false,
            });
          }}
        />
      </Dialog>
    </section>
  );
}
