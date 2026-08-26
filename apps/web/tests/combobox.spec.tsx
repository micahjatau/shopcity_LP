import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from '../components/ui/combobox';

describe('Combobox', () => {
  it('uses aria-activedescendant while navigating options', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();

    render(
      <Combobox
        ariaLabel="Route"
        placeholder="Choose route"
        options={[
          { value: 'cashier', label: 'Cashier' },
          { value: 'supervisor', label: 'Supervisor' },
          { value: 'admin', label: 'Admin', disabled: true },
        ]}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Route' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-activedescendant');

    await user.keyboard('{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('supervisor');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});
