import {
  businessDate,
  formatReportMoney,
  lastReportNumber,
  recentReportPeriod,
  reportInsights,
  shiftReportDate,
  sumReportField,
} from '../lib/reports/supervisor-report-metrics';

describe('supervisor operational report aggregation', () => {
  const financial = [
    {
      reportDate: '2026-09-28T00:00:00.000Z',
      loyaltyPurchaseValueKobo: 200000,
      creditIssuedKobo: 4000,
      creditRedeemedKobo: 1500,
      outstandingLiabilityKobo: 120000,
      registeredCustomers: 12,
      activeCustomers: 8,
      transactionCount: 4,
    },
    {
      reportDate: '2026-09-29T00:00:00.000Z',
      loyaltyPurchaseValueKobo: 300000,
      creditIssuedKobo: 6000,
      creditRedeemedKobo: 2500,
      outstandingLiabilityKobo: 123500,
      registeredCustomers: 13,
      activeCustomers: 9,
      transactionCount: 6,
    },
  ];

  it('sums period flows but takes the latest closing stock', () => {
    expect(sumReportField(financial, 'loyaltyPurchaseValueKobo')).toBe(500000);
    expect(sumReportField(financial, 'creditIssuedKobo')).toBe(10000);
    expect(sumReportField(financial, 'creditRedeemedKobo')).toBe(4000);
    expect(lastReportNumber(financial, 'outstandingLiabilityKobo')).toBe(
      123500,
    );
    expect(lastReportNumber(financial, 'activeCustomers')).toBe(9);
  });

  it('does not turn missing data or unsafe money into a fabricated zero', () => {
    expect(sumReportField([], 'creditIssuedKobo')).toBeNull();
    expect(lastReportNumber([], 'outstandingLiabilityKobo')).toBeNull();
    expect(
      sumReportField(
        [{ creditIssuedKobo: Number.MAX_SAFE_INTEGER + 10 }],
        'creditIssuedKobo',
      ),
    ).toBeNull();
    expect(formatReportMoney(null)).toBe('—');
    expect(formatReportMoney(100050)).toContain('1,000.50');
  });

  it('uses inclusive Lagos business-date ranges for weekly and monthly filters', () => {
    const now = new Date('2026-09-30T23:30:00.000Z');
    expect(businessDate(now)).toBe('2026-10-01');
    expect(recentReportPeriod(7, now)).toEqual({
      from: '2026-09-25',
      to: '2026-10-01',
      label: 'Last 7 days',
    });
    expect(recentReportPeriod(30, now)).toEqual({
      from: '2026-09-02',
      to: '2026-10-01',
      label: 'Last 30 days',
    });
    expect(shiftReportDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('derives category-specific summaries from the selected report rows', () => {
    const sources = {
      financial,
      cashiers: [
        { cashierId: 'A', duplicateAttempts: 2, fraudFlagCount: 1 },
        { cashierId: 'A', duplicateAttempts: 0, fraudFlagCount: 0 },
        { cashierId: 'B', duplicateAttempts: 1, fraudFlagCount: 1 },
      ],
      redemptions: [
        { redemptionCount: 4, confirmedKobo: 1500, pendingApprovalCount: 1 },
        { redemptionCount: 6, confirmedKobo: 2500, pendingApprovalCount: 2 },
      ],
      sms: [{ queuedCount: 4, sentCount: 3, failedCount: 1 }],
    };
    expect(reportInsights('overview', sources)[0].value).toBe('10');
    expect(reportInsights('cashiers', sources)[0].value).toBe('2');
    expect(reportInsights('cashiers', sources)[1].value).toBe('3');
    expect(reportInsights('redemptions', sources)[1].value).toContain('40.00');
    expect(reportInsights('sms', sources)[2].value).toBe('1');
  });

  it('never treats a partial/missing report category as complete', () => {
    const insight = reportInsights('sms', {
      financial,
      cashiers: null,
      redemptions: null,
      sms: null,
    });
    expect(insight.every((entry) => entry.value === '—')).toBe(true);
  });
});
