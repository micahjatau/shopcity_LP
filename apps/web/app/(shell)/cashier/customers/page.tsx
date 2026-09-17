import { CustomerWorkspace } from '../../../../components/workflows/customer-workspace';

export default function CashierCustomersPage() {
  return (
    <section
      className="cashier-customer-route"
      style={{
        display: 'grid',
        gap: 'var(--sc-spacing-5)',
        padding: 'clamp(4px, 1vw, 12px)',
        borderRadius: 'var(--sc-radius-xl)',
        background:
          'linear-gradient(145deg, rgba(255, 241, 241, 0.72), var(--sc-color-neutral-0))',
      }}
    >
      <CustomerWorkspace canManage={false} />
    </section>
  );
}
