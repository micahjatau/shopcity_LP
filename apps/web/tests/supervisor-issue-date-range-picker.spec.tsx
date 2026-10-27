import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { SupervisorIssueDateRangePicker } from '../components/workflows/supervisor-issue-date-range-picker';

jest.mock('next/dynamic', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: () =>
      function MockSomCalendar({
        monthsNb,
        onDateChange,
      }: {
        monthsNb?: number;
        onDateChange?: (
          event: CustomEvent<{ date1?: Date; date2?: Date }>,
        ) => void;
      }) {
        const selectionCount = React.useRef(0);
        return React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'som-calendar-select',
            'data-months-nb': monthsNb,
            onClick: () => {
              selectionCount.current += 1;
              onDateChange?.({
                detail: {
                  date1: new Date(2025, 0, 10),
                  date2:
                    selectionCount.current > 1
                      ? new Date(2025, 0, 12)
                      : undefined,
                },
              } as CustomEvent<{ date1?: Date; date2?: Date }>);
            },
          },
          'Select calendar date',
        );
      },
  };
});

function ControlledDateRangePicker({
  onChange,
}: Readonly<{
  onChange: (value: { startDate: string; endDate: string }) => void;
}>) {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  return (
    <SupervisorIssueDateRangePicker
      className="test-date-trigger"
      {...range}
      onChange={(value) => {
        setRange(value);
        onChange(value);
      }}
    />
  );
}

describe('SupervisorIssueDateRangePicker', () => {
  it('shows selected dates and completes a single-calendar range in two selections', async () => {
    const onChange = jest.fn();
    render(<ControlledDateRangePicker onChange={onChange} />);

    const trigger = screen.getByRole('button', { name: 'Date issued' });
    expect(trigger).toHaveClass(
      'test-date-trigger',
      'supervisor-customer-directory__filter',
    );
    expect(screen.queryByText('Date issued', { selector: 'label' })).toBeNull();

    fireEvent.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'Choose issue date range' }),
    ).toBeVisible();
    const calendar = screen.getByTestId('som-calendar-select');
    expect(calendar).toHaveAttribute('data-months-nb', '1');
    expect(screen.getByText('Select a start date')).toBeVisible();

    fireEvent.click(calendar);
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '1/10/2025',
      endDate: '',
    });
    expect(screen.getByText('1/10/2025 – Select end date')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();

    fireEvent.click(calendar);
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '1/10/2025',
      endDate: '1/12/2025',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    fireEvent.click(trigger);
    expect(await screen.findByText('1/10/2025 – 1/12/2025')).toBeVisible();
  });
});
