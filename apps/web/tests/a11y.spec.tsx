import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as axe from 'axe-core';
import HomePage from '../app/page';
import LoginPage from '../app/(auth)/login/page';
import CashierPage from '../app/(shell)/cashier/page';
import SupervisorPage from '../app/(shell)/supervisor/page';
import AdminPage from '../app/(shell)/admin/page';
import { MoneyInput } from '../components/shopcity';
import { Button, Input } from '../components/ui';

async function runAxe(container: HTMLElement) {
  const { documentElement } = container.ownerDocument;
  documentElement.lang = 'en';
  container.ownerDocument.title = 'ShopCity';

  const { violations } = await axe.run(container.ownerDocument, {
    elementRef: container,
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  return violations;
}

describe('frontend accessibility gates', () => {
  it('keeps shared controls accessible', async () => {
    const { container } = render(
      <main>
        <Button>Primary action</Button>
        <Input aria-label="Lookup" placeholder="Search" />
        <MoneyInput label="Amount" hint="Enter naira only" />
      </main>,
    );

    expect(await runAxe(container)).toHaveLength(0);
  });

  it('keeps the login route accessible and keyboard navigable', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LoginPage />
      </div>,
    );

    expect(
      screen.getByRole('heading', {
        name: /sign in to the shopcity retail operations shell/i,
      }),
    ).toBeInTheDocument();
    expect(await runAxe(document.body)).toHaveLength(0);

    await user.tab();
    expect(
      screen.getByRole('link', { name: /back to overview/i }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/tenant/i)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
  });

  it('keeps cashier, supervisor and admin shells accessible', async () => {
    render(
      <main>
        <HomePage />
        <CashierPage />
        <SupervisorPage />
        <AdminPage />
      </main>,
    );

    expect(
      screen.getByRole('heading', { name: /cashier shell/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /supervisor shell/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /admin shell/i, level: 1 }),
    ).toBeInTheDocument();
    expect(await runAxe(document.body)).toHaveLength(0);
  });
});
