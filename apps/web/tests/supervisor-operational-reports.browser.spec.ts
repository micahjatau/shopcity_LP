import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type Route } from '@playwright/test';

const mockSession = (role: 'SUPERVISOR' | 'ADMIN') => ({
  user: {
    id: `${role.toLowerCase()}-visual-1`,
    username: `${role.toLowerCase()}@shopcity.local`,
    role,
    branchId: 'branch-visual-1',
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
});

test('reviews operational reports at desktop, tablet, and mobile widths', async ({
  page,
}) => {
  await mockSupervisorReports(page);
  await page.clock.install({ time: new Date('2026-10-15T12:00:00.000Z') });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/supervisor/reports');
  await expect(page.locator('.shell-loading-screen')).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Operational reports' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Branch at a glance' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Filtered operational summaries' }),
  ).toBeVisible();
  await expect(page.getByText('SUPERVISOR · REPORTING')).toHaveCount(0);
  await expect(
    page.getByText(
      'Period financial flows and the latest available closing balance.',
    ),
  ).toHaveCount(0);
  await expect(page.locator('.supervisor-reports-period-tag')).toHaveCount(0);
  await expect(page.getByText(/Updated .* WAT · Africa\/Lagos/)).toBeVisible();
  await expect(page.getByText('· Main branch', { exact: true })).toBeVisible();
  await expect(page.getByText('How to read these figures')).toHaveCount(0);
  await expect(page.getByText('₦4,500.00').first()).toBeVisible();
  await expect(page.locator('.supervisor-reports-page')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await page.screenshot({
    path: '/tmp/shopcity-supervisor-reports-desktop-top.png',
    fullPage: false,
  });

  await page
    .getByRole('button', { name: 'Summary category: Overall activity' })
    .click();
  await page.getByRole('option', { name: 'Cashier performance' }).click();
  await expect(page.getByText('Duplicate attempts')).toBeVisible();

  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(
    page.locator(
      '#supervisor-reports-panel-insights .supervisor-reports-insights',
    ),
  ).toHaveCount(0);
  await expect(page.getByText('OVER TIME', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('DATA-BASED INSIGHTS', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/This chart reports ShopCity loyalty activity/),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Summaries are deterministic calculations/),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Trend metric: Loyalty purchase value' })
    .click();
  await page.getByRole('option', { name: 'Credit issued' }).click();
  await page.getByRole('tab', { name: 'Reports' }).click();
  await expect(page.getByText('Main branch', { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Copy Branch ID: branch-visual-1' }),
  ).toHaveCount(0);
  await expect(page.getByRole('table').first()).toBeVisible();
  const reportSuite = page.locator('.reports-workspace__report-suite');
  await expect(reportSuite).toHaveCount(1);
  await expect(
    reportSuite.locator(':scope > .reports-workspace__controls'),
  ).toHaveCount(1);
  await expect(
    reportSuite.locator(':scope > .reports-workspace__current'),
  ).toHaveCount(1);
  await expect(reportSuite.locator('.reports-workspace__current')).toHaveCSS(
    'border-top-width',
    '0px',
  );
  await expect(
    reportSuite.locator(':scope > .reports-workspace__results'),
  ).toHaveCount(1);
  await expect(
    reportSuite.locator('.reports-workspace__freshness'),
  ).toHaveCount(0);
  const scopePanel = reportSuite.locator('.reports-workspace__scope');
  const scopePanelBounds = await scopePanel.boundingBox();
  const firstScopeFieldBounds = await scopePanel
    .locator('.reports-workspace__scope-item')
    .first()
    .boundingBox();
  const lastScopeFieldBounds = await scopePanel
    .locator('.reports-workspace__scope-item')
    .last()
    .boundingBox();
  expect(scopePanelBounds).not.toBeNull();
  expect(firstScopeFieldBounds).not.toBeNull();
  expect(lastScopeFieldBounds).not.toBeNull();
  if (scopePanelBounds && firstScopeFieldBounds && lastScopeFieldBounds) {
    expect(firstScopeFieldBounds.width).toBeCloseTo(
      lastScopeFieldBounds.width,
      0,
    );
    expect(firstScopeFieldBounds.width).toBeGreaterThan(
      scopePanelBounds.width / 5,
    );
  }
  const reportTypeRow = reportSuite.locator(
    '.reports-workspace__report-type-row',
  );
  const reportTypeBox = await reportTypeRow.getByLabel('Report').boundingBox();
  const loadReportBox = await reportTypeRow
    .getByRole('button', { name: 'Load report' })
    .boundingBox();
  const exportCsvBox = await reportTypeRow
    .getByRole('button', { name: 'Export CSV' })
    .boundingBox();
  expect(reportTypeBox).not.toBeNull();
  expect(loadReportBox).not.toBeNull();
  expect(exportCsvBox).not.toBeNull();
  if (reportTypeBox && loadReportBox && exportCsvBox) {
    expect(Math.abs(reportTypeBox.y - loadReportBox.y)).toBeLessThan(2);
    expect(Math.abs(reportTypeBox.y - exportCsvBox.y)).toBeLessThan(2);
  }
  const chooserBox = await reportSuite
    .locator('.reports-workspace__report-type-row')
    .boundingBox();
  const tableBox = await reportSuite
    .locator('.reports-workspace__table-scroll')
    .boundingBox();
  expect(chooserBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  if (chooserBox && tableBox) {
    expect(Math.abs(chooserBox.x - tableBox.x)).toBeLessThan(2);
    expect(Math.abs(chooserBox.width - tableBox.width)).toBeLessThan(2);
  }
  const rowsPerPageBox = await reportSuite
    .locator('.reports-workspace__pagination-summary')
    .getByLabel('Rows per page')
    .boundingBox();
  expect(rowsPerPageBox).not.toBeNull();
  if (rowsPerPageBox && tableBox) {
    expect(rowsPerPageBox.x).toBeCloseTo(tableBox.x, 0);
    expect(rowsPerPageBox.y).toBeGreaterThan(tableBox.y + tableBox.height);
  }
  await expect(
    reportSuite
      .getByRole('button', { name: 'Previous report page' })
      .locator('svg'),
  ).toHaveCount(1);
  await expect(
    reportSuite
      .getByRole('button', { name: 'Next report page' })
      .locator('svg'),
  ).toHaveCount(1);
  const reportResults = page.getByRole('region', {
    name: 'Report summary items',
  });
  const resultsDescription = reportResults.getByText(
    'Key fields are shown here; select a row to inspect all populated fields.',
  );
  await expect(resultsDescription).toBeHidden();
  const resultsTitle = reportResults.locator(
    '.reports-workspace__report-title h3',
  );
  const resultsTitleBox = await resultsTitle.boundingBox();
  const resultsInfoButton = reportResults.getByRole('button', {
    name: 'About report results',
  });
  const resultsInfoBox = await resultsInfoButton.boundingBox();
  expect(resultsTitleBox).not.toBeNull();
  expect(resultsInfoBox).not.toBeNull();
  if (resultsTitleBox && resultsInfoBox) {
    expect(
      resultsInfoBox.x - (resultsTitleBox.x + resultsTitleBox.width),
    ).toBeLessThanOrEqual(8);
  }
  await resultsInfoButton.focus();
  await page.keyboard.press('Enter');
  const resultsPopup = page.getByRole('dialog', {
    name: 'Report results',
  });
  await expect(resultsPopup).toBeVisible();
  await expect(resultsPopup).not.toHaveAttribute('aria-modal', 'true');
  await expect(resultsPopup).toHaveAttribute('aria-labelledby', /.+/);
  await expect(resultsPopup).toHaveAttribute('aria-describedby', /.+/);
  await expect(resultsPopup.locator('h2')).toHaveText('Report results');
  await expect(page.locator('.sc-dialog')).toHaveCount(0);
  await expect(resultsPopup).toHaveCSS('position', 'fixed');
  await expect(resultsDescription).toBeVisible();
  const resultsPopupBox = await resultsPopup.boundingBox();
  const resultsTriggerBox = await resultsInfoButton.boundingBox();
  expect(resultsPopupBox).not.toBeNull();
  expect(resultsTriggerBox).not.toBeNull();
  if (resultsPopupBox && resultsTriggerBox) {
    expect(resultsPopupBox.x).toBeGreaterThan(
      resultsTriggerBox.x + resultsTriggerBox.width,
    );
    expect(resultsPopupBox.y).toBeGreaterThanOrEqual(12);
    expect(resultsPopupBox.y + resultsPopupBox.height).toBeLessThanOrEqual(
      (page.viewportSize()?.height ?? 0) - 12,
    );
    expect(resultsPopupBox.width).toBeLessThan(480);
    expect(resultsPopupBox.height).toBeLessThan(180);
  }
  await page.keyboard.press('Escape');
  await expect(resultsPopup).toBeHidden();
  await expect(resultsInfoButton).toBeFocused();
  const currentReport = page.getByRole('region', { name: 'Current report' });
  const reportDescription = currentReport.getByText(
    'Period activity and the latest available liability snapshot.',
  );
  await expect(reportDescription).toBeHidden();
  const reportTitle = currentReport.locator(
    '.reports-workspace__report-title h3',
  );
  const reportTitleBox = await reportTitle.boundingBox();
  const reportInfoButton = currentReport.getByRole('button', {
    name: 'About Executive summary',
  });
  const reportInfoBox = await reportInfoButton.boundingBox();
  expect(reportTitleBox).not.toBeNull();
  expect(reportInfoBox).not.toBeNull();
  if (reportTitleBox && reportInfoBox) {
    expect(
      reportInfoBox.x - (reportTitleBox.x + reportTitleBox.width),
    ).toBeLessThanOrEqual(8);
  }
  await reportInfoButton.focus();
  await page.keyboard.press('Enter');
  const executiveSummaryPopup = page.getByRole('dialog', {
    name: 'Executive summary',
  });
  await expect(executiveSummaryPopup).toBeVisible();
  await expect(executiveSummaryPopup).not.toHaveAttribute('aria-modal', 'true');
  await expect(reportDescription).toBeVisible();
  const executivePopupBox = await executiveSummaryPopup.boundingBox();
  const executiveTriggerBox = await reportInfoButton.boundingBox();
  expect(executivePopupBox).not.toBeNull();
  expect(executiveTriggerBox).not.toBeNull();
  if (executivePopupBox && executiveTriggerBox) {
    expect(executivePopupBox.x).toBeGreaterThan(
      executiveTriggerBox.x + executiveTriggerBox.width,
    );
    expect(Math.abs(executivePopupBox.y - executiveTriggerBox.y)).toBeLessThan(
      3,
    );
    expect(executivePopupBox.width).toBeLessThan(480);
    expect(executivePopupBox.height).toBeLessThan(180);
  }
  await page.getByRole('heading', { name: 'Operational reports' }).click();
  await expect(executiveSummaryPopup).toBeHidden();
  const reportTable = page.locator('.reports-workspace__table');
  await expect(reportTable.getByRole('columnheader')).toHaveCount(7);
  await expect(page.locator('.reports-workspace__details')).toHaveCount(0);
  const reportRows = reportTable.locator('tbody tr');
  const reportRowCount = await reportRows.count();
  const rowDetailsButtons = reportTable.getByRole('button', {
    name: /^More details for /,
  });
  await expect(rowDetailsButtons).toHaveCount(reportRowCount);
  const detailRow = reportRows.nth(1);
  const moreDetailsButton = detailRow.getByRole('button', {
    name: /^More details for /,
  });
  await expect(moreDetailsButton).toBeVisible();
  await moreDetailsButton.click();
  const selectedItemPopup = page.getByRole('dialog', {
    name: /^Details for /,
  });
  await expect(selectedItemPopup).toBeVisible();
  await expect(selectedItemPopup.getByText('Credit expired')).toBeVisible();
  await expect(detailRow).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(selectedItemPopup).toBeHidden();
  await expect(moreDetailsButton).toBeFocused();
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  await expect(
    page.getByText('DETAILED REPORTING', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('REPORT BUILDER', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('ROW DETAILS', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(/Branch access is determined by your Supervisor session/),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      /Data scope and access are enforced by the authenticated Supervisor session/,
    ),
  ).toHaveCount(0);
  const reportTypeSelect = page.locator(
    '.reports-workspace__controls select[aria-label="Report"]',
  );
  await reportTypeSelect.selectOption('customer-performance');
  await expect(
    reportTable.getByRole('columnheader', { name: 'Customer name' }),
  ).toBeVisible();
  await expect(
    reportTable.getByRole('columnheader', { name: 'Customer ID' }),
  ).toHaveCount(0);
  const customerRow = reportTable.locator('tbody tr').first();
  await expect(
    customerRow.locator('td').first().getByText('Amina Bello', { exact: true }),
  ).toBeVisible();
  const customerMoreDetails = customerRow.getByRole('button', {
    name: /^More details for /,
  });
  await customerMoreDetails.click();
  const customerPopup = page.getByRole('dialog', {
    name: 'Details for Amina Bello',
  });
  await expect(customerPopup).toBeVisible();
  await expect(customerPopup.getByText('Customer name')).toBeVisible();
  await expect(customerPopup.getByText('customer-visual-1')).toHaveCount(0);
  await page.keyboard.press('Escape');
  const customerFallbackRow = reportTable.locator('tbody tr').nth(1);
  await expect(
    customerFallbackRow
      .locator('td')
      .first()
      .getByText('customer-visual-2', { exact: true }),
  ).toBeVisible();
  await customerFallbackRow
    .getByRole('button', { name: 'More details for customer-visual-2' })
    .click();
  const customerFallbackPopup = page.getByRole('dialog', {
    name: 'Details for customer-visual-2',
  });
  await expect(customerFallbackPopup.getByText('Customer ID')).toBeVisible();
  await page.keyboard.press('Escape');

  await reportTypeSelect.selectOption('cashier-activity');
  await expect(
    reportTable.getByRole('columnheader', { name: 'Cashier email' }),
  ).toBeVisible();
  await expect(
    reportTable.getByRole('columnheader', { name: 'Cashier ID' }),
  ).toHaveCount(0);
  const cashierRow = reportTable.locator('tbody tr').first();
  await expect(
    cashierRow
      .locator('td')
      .first()
      .getByText('cashier.one@shopcity.local', { exact: true }),
  ).toBeVisible();
  const cashierMoreDetails = cashierRow.getByRole('button', {
    name: /^More details for /,
  });
  await cashierMoreDetails.click();
  const cashierPopup = page.getByRole('dialog', {
    name: /^Details for /,
  });
  await expect(cashierPopup).toBeVisible();
  await expect(
    cashierPopup
      .locator('.reports-workspace__definition-list')
      .getByText('cashier.one@shopcity.local', { exact: true }),
  ).toBeVisible();
  await expect(cashierPopup.getByText('cashier-visual-1')).toHaveCount(0);
  await page.keyboard.press('Escape');
  const cashierFallbackRow = reportTable.locator('tbody tr').nth(1);
  await expect(
    cashierFallbackRow
      .locator('td')
      .first()
      .getByText('cashier-visual-2', { exact: true }),
  ).toBeVisible();
  await cashierFallbackRow
    .getByRole('button', { name: 'More details for cashier-visual-2' })
    .click();
  const cashierFallbackPopup = page.getByRole('dialog', {
    name: 'Details for cashier-visual-2',
  });
  await expect(cashierFallbackPopup.getByText('Cashier ID')).toBeVisible();
  await page.keyboard.press('Escape');

  await reportTypeSelect.selectOption('materialization-state');
  await expect(
    page.getByText('Read-model freshness and report materialization status.'),
  ).toHaveCount(0);
  const materializationCurrentReport = page.getByRole('region', {
    name: 'Current report',
  });
  const materializationInfo = materializationCurrentReport.getByRole('button', {
    name: 'About Materialization state',
  });
  await expect(materializationInfo).toBeVisible();
  await materializationInfo.click();
  const materializationPopup = page.getByRole('dialog', {
    name: 'Materialization state',
  });
  await expect(materializationPopup).toBeVisible();
  await expect(
    materializationPopup.getByText(
      'Read-model freshness and report materialization status.',
    ),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(materializationPopup).toBeHidden();
  await expect(page.getByText(/Expected freshness:/)).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'Audit report' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('option', { name: 'Pilot operations summary' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Refresh materialization' }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Insights' }).click();
  const dailyChart = page.locator('.supervisor-reports-chart__bar');
  await expect(
    page.getByText(/Over 7 days, the highest value was/),
  ).toBeVisible();
  const sevenDayBarWidth = Number.parseFloat(
    await dailyChart
      .first()
      .evaluate((element) => getComputedStyle(element).width),
  );
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await expect(
    page.getByText(/Over 30 days, the highest value was/),
  ).toBeVisible();
  await expect(
    page.locator('.supervisor-reports-chart-y-axis > span'),
  ).toHaveText(['₦200.00', '₦150.00', '₦100.00', '₦50.00', '₦0.00']);
  const thirtyDayBarWidth = Number.parseFloat(
    await dailyChart
      .first()
      .evaluate((element) => getComputedStyle(element).width),
  );
  expect(thirtyDayBarWidth).toBeLessThan(sevenDayBarWidth);
  const monthLabels = await page
    .locator('.supervisor-reports-chart__label')
    .allTextContents();
  const octoberLabelIndex = monthLabels.indexOf('Oct');
  expect(octoberLabelIndex).toBeGreaterThanOrEqual(0);
  expect(monthLabels.slice(octoberLabelIndex, octoberLabelIndex + 4)).toEqual([
    'Oct',
    '2',
    '3',
    '4',
  ]);
  await page.setViewportSize({ width: 390, height: 960 });
  const yAxis = page.locator('.supervisor-reports-chart-y-axis');
  const yAxisBeforeScroll = await yAxis.boundingBox();
  const chartScroll = page.locator('.supervisor-reports-chart-scroll');
  await chartScroll.evaluate((element) => {
    element.scrollLeft = 200;
  });
  await expect
    .poll(() => chartScroll.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  expect(await yAxis.boundingBox()).toMatchObject({
    x: yAxisBeforeScroll?.x,
    y: yAxisBeforeScroll?.y,
  });
  await page.getByLabel('Reporting period menu').selectOption('week');

  const content = page.locator('.supervisor-reports-page');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(content).toBeVisible();
    const periodHeading = await page
      .locator('.supervisor-reports-period__bar > strong')
      .boundingBox();
    const refreshButton = await page
      .getByRole('button', { name: 'Refresh dashboard data' })
      .boundingBox();
    const dateControl = await (
      width > 1024
        ? page.locator('.supervisor-reports-period__buttons')
        : page.getByLabel('Reporting period menu')
    ).boundingBox();
    const freshness = await page
      .locator('.supervisor-reports-freshness')
      .boundingBox();
    expect(periodHeading).not.toBeNull();
    expect(refreshButton).not.toBeNull();
    expect(dateControl).not.toBeNull();
    expect(freshness).not.toBeNull();
    if (periodHeading && refreshButton && dateControl && freshness) {
      const headerOverlap =
        Math.min(
          periodHeading.y + periodHeading.height,
          refreshButton.y + refreshButton.height,
        ) - Math.max(periodHeading.y, refreshButton.y);
      expect(headerOverlap).toBeGreaterThan(0);
      expect(
        Math.abs(
          periodHeading.y +
            periodHeading.height / 2 -
            (refreshButton.y + refreshButton.height / 2),
        ),
      ).toBeLessThanOrEqual(1);
      expect(dateControl.y).toBeGreaterThan(
        Math.max(
          periodHeading.y + periodHeading.height,
          refreshButton.y + refreshButton.height,
        ),
      );
      expect(freshness.y).toBeGreaterThan(
        dateControl.y + dateControl.height - 1,
      );
    }
    if (width <= 1024) {
      for (const label of ['Trend metric']) {
        const trigger = page.getByRole('button', {
          name: new RegExp(`^${label}:`),
        });
        const box = await trigger.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(150);
          expect(box.width).toBeLessThanOrEqual(240);
          expect(box.height).toBeLessThanOrEqual(44);
        }
      }
      const barRects = await dailyChart.evaluateAll((elements) =>
        elements.map((element) => {
          const { left, right } = element.getBoundingClientRect();
          return { left, right };
        }),
      );
      for (let index = 1; index < barRects.length; index += 1) {
        expect(barRects[index].left).toBeGreaterThanOrEqual(
          barRects[index - 1].right,
        );
      }
    }
    if (width > 1024) {
      await expect(
        page.getByRole('group', { name: 'Reporting period presets' }),
      ).toBeVisible();
      await expect(page.getByLabel('Reporting period menu')).toBeHidden();
    } else {
      const periodMenu = page.getByLabel('Reporting period menu');
      await expect(periodMenu).toBeVisible();
      await expect(
        page.getByRole('group', { name: 'Reporting period presets' }),
      ).toBeHidden();
      const updatedAtBox = await page
        .locator('.supervisor-reports-freshness')
        .boundingBox();
      const branchNameBox = await page
        .locator('.supervisor-reports-branch-name')
        .boundingBox();
      expect(updatedAtBox).not.toBeNull();
      expect(branchNameBox).not.toBeNull();
      if (updatedAtBox && branchNameBox) {
        const verticalOverlap =
          Math.min(
            updatedAtBox.y + updatedAtBox.height,
            branchNameBox.y + branchNameBox.height,
          ) - Math.max(updatedAtBox.y, branchNameBox.y);
        expect(verticalOverlap).toBeGreaterThan(0);
      }
      if (width === 1024) {
        await periodMenu.selectOption('month');
        await expect(periodMenu).toHaveValue('month');
        await periodMenu.selectOption('week');
      }
    }
    const dimensions = await content.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    if (width === 390) {
      await expect(
        page.getByRole('link', { name: 'Back to supervisor' }),
      ).toHaveCount(0);
      await page.screenshot({
        path: '/tmp/shopcity-supervisor-reports-mobile-top.png',
        fullPage: false,
      });
    }
  }

  await page.getByRole('tab', { name: 'Reports' }).click();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(
    page.getByRole('heading', { name: 'Report results' }),
  ).toBeVisible();
  await page.screenshot({
    path: '/tmp/shopcity-supervisor-reports-desktop-bottom.png',
    fullPage: false,
  });
});

test('downloads the CSV response from the report workspace', async ({
  page,
}) => {
  await mockSupervisorReports(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/supervisor/reports');

  await page.getByRole('tab', { name: 'Reports' }).click();
  const exportButton = page.getByRole('button', { name: 'Export CSV' });
  await expect(exportButton).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('executive-summary.csv');
  expect(await download.failure()).toBeNull();
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (!downloadPath) throw new Error('CSV download did not produce a file.');
  expect(await readFile(downloadPath, 'utf8')).toBe(
    'report,value\nexample,1\n',
  );
});

test('maps role-authorized reports and scope controls to Admin', async ({
  page,
}) => {
  const requests: Array<{ method: string; url: string }> = [];
  page.on('request', (request) =>
    requests.push({ method: request.method(), url: request.url() }),
  );
  await mockSupervisorReports(page, 'ADMIN');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/admin/reports');
  await expect(page.locator('.shell-loading-screen')).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Operational reports' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tenant at a glance' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to admin' })).toBeVisible();
  await page.getByRole('tab', { name: 'Reports' }).click();
  await expect(
    page.getByRole('option', { name: 'Audit report' }),
  ).toBeAttached();
  await expect(
    page.getByRole('option', { name: 'Pilot operations summary' }),
  ).toBeAttached();
  await expect(
    page.getByRole('button', { name: 'Refresh materialization' }),
  ).toBeEnabled();

  await page.getByText('Admin scope filters').click();
  await page.getByLabel('Admin branch filter').fill('branch-visual-1');
  await page.getByLabel('Admin timezone filter').fill('Africa/Lagos');
  await page.getByRole('button', { name: 'Apply scope' }).click();
  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(
    page.getByRole('heading', { name: 'Branch at a glance' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some((request) => {
        const url = new URL(request.url);
        return (
          url.pathname === '/api/v1/reports/executive-summary' &&
          url.searchParams.get('branchId') === 'branch-visual-1' &&
          url.searchParams.get('timezone') === 'Africa/Lagos'
        );
      }),
    )
    .toBe(true);
  await page.getByRole('tab', { name: 'Reports' }).click();
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('BRANCH', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('Main branch', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Refresh materialization' }).click();
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.method === 'POST' &&
          request.url.includes('/api/v1/reports/executive-summary/refresh'),
      ),
    )
    .toBe(true);
  const refreshRequest = requests.find(
    (request) =>
      request.method === 'POST' &&
      request.url.includes('/api/v1/reports/executive-summary/refresh'),
  );
  expect(refreshRequest).toBeDefined();
  expect(
    refreshRequest
      ? new URL(refreshRequest.url).searchParams.get('branchId')
      : null,
  ).toBe('branch-visual-1');

  await page
    .getByRole('combobox', { name: 'Report', exact: true })
    .selectOption('audit-report');
  await expect(
    page.getByRole('heading', { name: 'Audit report', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some((request) =>
        request.url.includes('/api/v1/reports/audit-report'),
      ),
    )
    .toBe(true);
  const auditRequest = requests.find((request) =>
    request.url.includes('/api/v1/reports/audit-report'),
  );
  const auditUrl = auditRequest ? new URL(auditRequest.url) : null;
  expect(auditUrl).not.toBeNull();
  expect(auditUrl?.searchParams.has('branchId')).toBe(false);
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('TENANT', { exact: true }),
  ).toBeVisible();

  await page
    .getByRole('combobox', { name: 'Report', exact: true })
    .selectOption('pilot-operations-summary');
  await expect(
    page.getByRole('heading', { name: 'Pilot operations summary' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some((request) =>
        request.url.includes('/api/v1/reports/pilot-operations-summary'),
      ),
    )
    .toBe(true);
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('TENANT', { exact: true }),
  ).toBeVisible();

  const content = page.locator('.supervisor-reports-page');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    const dimensions = await content.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: '/tmp/shopcity-admin-reports-desktop.png',
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 960 });
  await expect(page.getByRole('link', { name: 'Back to admin' })).toBeVisible();
  await page.screenshot({
    path: '/tmp/shopcity-admin-reports-mobile.png',
    fullPage: false,
  });
});

async function mockSupervisorReports(
  page: Page,
  role: 'SUPERVISOR' | 'ADMIN' = 'SUPERVISOR',
) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    const path = pathname.replace(/^\/api\/v1/, '');

    if (path === '/auth/me') {
      return fulfill(route, {
        success: true,
        data: mockSession(role),
        meta: meta(path),
      });
    }
    if (path === '/auth/refresh' || path === '/auth/logout') {
      return fulfill(route, {
        success: true,
        data: null,
        meta: meta(path),
      });
    }
    if (path === '/config/public' || path === '/config/operational') {
      return fulfill(route, {
        success: true,
        data: {
          tenant: { id: 'tenant-visual-1', name: 'ShopCity' },
          branch: {
            id: 'branch-visual-1',
            name: 'Main branch',
            timezone: 'Africa/Lagos',
            receiptWeekStartDay: 1,
          },
          policies: {
            defaultEarnRateBps: 500,
            minRedemptionKobo: 1000,
            maxRedemptionBasketPercent: 50,
            purchaseFlagThresholdKobo: 100000,
            purchaseApprovalThresholdKobo: 200000,
            redemptionApprovalThresholdKobo: 100000,
            offlineRedemptionDisabled: false,
          },
        },
        meta: meta(path),
      });
    }
    if (path.startsWith('/reports/')) {
      if (path.endsWith('/refresh') && route.request().method() === 'POST') {
        return fulfill(
          route,
          {
            success: true,
            data: { status: 'accepted' },
            meta: meta(path),
          },
          202,
        );
      }
      if (path === '/reports/pilot-operations-summary') {
        return fulfill(route, {
          success: true,
          data: {
            release: {
              version: '1.0.0',
              sha: 'abc123',
              sentryConfigured: false,
            },
            generatedAt: new Date().toISOString(),
            outbox: { backlogCount: 1, staleCount: 0 },
            sms: { failedCount: 0 },
            offlineSync: { failureCount: 0 },
            fraud: { openCount: 0 },
            reports: { staleCount: 0 },
            reconciliation: { healthy: true, mismatchCount: 0 },
          },
          meta: meta(path),
        });
      }
      if (path.endsWith('/export')) {
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/csv; charset=utf-8' },
          body: 'report,value\nexample,1\n',
        });
      }
      const reportDate =
        searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
      const isTenantReport =
        role === 'ADMIN' &&
        (!searchParams.has('branchId') || path === '/reports/audit-report');
      const financialRow = {
        branchId: isTenantReport ? null : 'branch-visual-1',
        reportDate: `${reportDate}T00:00:00.000Z`,
        materializedAt: new Date().toISOString(),
        loyaltyPurchaseValueKobo: 450000,
        creditIssuedKobo: 12000,
        creditRedeemedKobo: 3000,
        creditExpiredKobo: 200,
        outstandingLiabilityKobo: 125000,
        registeredCustomers: 41,
        activeCustomers: 28,
        transactionCount: 12,
      };
      const rangeStart = new Date(
        `${searchParams.get('from') ?? reportDate}T12:00:00.000Z`,
      );
      const rangeEnd = new Date(`${reportDate}T12:00:00.000Z`);
      const rangeDays = Math.min(
        366,
        Math.max(
          1,
          Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) +
            1,
        ),
      );
      const financialRows = Array.from({ length: rangeDays }, (_, index) => {
        const date = new Date(rangeStart);
        date.setUTCDate(date.getUTCDate() + index);
        const isLatestDay = index === rangeDays - 1;
        return {
          ...financialRow,
          reportDate: `${date.toISOString().slice(0, 10)}T00:00:00.000Z`,
          loyaltyPurchaseValueKobo: isLatestDay ? 450000 : 0,
          creditIssuedKobo: isLatestDay ? 12000 : 0,
          creditRedeemedKobo: isLatestDay ? 3000 : 0,
          creditExpiredKobo: isLatestDay ? 200 : 0,
          transactionCount: isLatestDay ? 12 : 0,
        };
      });
      const items =
        path === '/reports/cashier-activity'
          ? [
              {
                cashierId: 'cashier-visual-1',
                cashierEmail: 'cashier.one@shopcity.local',
                transactionCount: 12,
                duplicateAttempts: 0,
              },
              {
                cashierId: 'cashier-visual-2',
                transactionCount: 1,
                duplicateAttempts: 0,
              },
            ]
          : path === '/reports/redemption-summary'
            ? [
                {
                  redemptionCount: 2,
                  confirmedKobo: 3000,
                  pendingApprovalCount: 0,
                },
              ]
            : path === '/reports/sms-operations'
              ? [
                  {
                    queuedCount: 3,
                    sentCount: 2,
                    deliveredCount: 2,
                    failedCount: 0,
                  },
                ]
              : path === '/reports/customer-performance'
                ? [
                    {
                      customerId: 'customer-visual-1',
                      customerName: 'Amina Bello',
                      purchaseValueKobo: 450000,
                      currentBalanceKobo: 125000,
                      visitCount: 12,
                    },
                    {
                      customerId: 'customer-visual-2',
                      purchaseValueKobo: 250000,
                      currentBalanceKobo: 80000,
                      visitCount: 7,
                    },
                  ]
                : path === '/reports/materialization-state'
                  ? [
                      {
                        status: 'COMPLETED',
                        materializedAt: financialRow.materializedAt,
                      },
                    ]
                  : path === '/reports/executive-summary'
                    ? financialRows
                    : [financialRow];
      return fulfill(route, {
        success: true,
        data: {
          scope: isTenantReport ? 'TENANT' : 'BRANCH',
          scopeKey: isTenantReport ? 'tenant-visual-1' : 'branch-visual-1',
          branchId: isTenantReport ? null : 'branch-visual-1',
          timezone: searchParams.get('timezone') ?? 'Africa/Lagos',
          items,
        },
        meta: meta(path),
      });
    }
    return fulfill(route, {
      success: true,
      data: { items: [] },
      meta: meta(path),
    });
  });
}

async function fulfill(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function meta(path: string) {
  return {
    timestamp: new Date().toISOString(),
    path,
    requestId: 'req-supervisor-report-visual',
  };
}
