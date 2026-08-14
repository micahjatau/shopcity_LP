import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Money,
  MoneyInput,
  formatMoneyInputDraft,
  parseNaira,
} from '../components/shopcity/money';

describe('money parsing and formatting', () => {
  it('parses Nigerian and pasted formatted money strings safely', () => {
    expect(parseNaira('1,234')).toBe(123400);
    expect(parseNaira('1,234.50')).toBe(123450);
    expect(parseNaira('₦1,234.50')).toBe(123450);
    expect(parseNaira('1.234,50')).toBe(123450);
    expect(parseNaira('0.01')).toBe(1);
    expect(parseNaira('0')).toBe(0);
    expect(parseNaira('-1,234.50')).toBe(-123450);
    expect(parseNaira('12.345')).toBeNull();
    expect(parseNaira('1,2,3')).toBeNull();
    expect(parseNaira('')).toBeNull();
  });

  it('formats input drafts without changing the amount', () => {
    expect(formatMoneyInputDraft(123450)).toBe('1,234.50');
    expect(formatMoneyInputDraft(-123450)).toBe('-1,234.50');
  });

  it('updates MoneyInput with a canonical value on blur', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();

    render(
      <MoneyInput label="Amount" defaultValueKobo={0} onValueChange={onValueChange} />,
    );

    const input = screen.getByLabelText('Amount');
    await user.clear(input);
    await user.type(input, '1,234.50');
    await user.tab();

    expect(onValueChange).toHaveBeenLastCalledWith(123450);
    expect(input).toHaveValue('1,234.50');
  });

  it('keeps negative money visually negative', () => {
    render(<Money amountKobo={-123450} />);
    const value = screen.getByText(/^-?₦1,234\.50$/);
    expect(value).toBeInTheDocument();
    expect(value).toHaveAttribute('aria-label', value.textContent);
  });
});
