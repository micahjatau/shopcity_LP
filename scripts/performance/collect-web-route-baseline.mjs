#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../apps/web/node_modules/playwright/index.mjs';

const baseUrl = process.env.WEB_PERF_BASE_URL ?? 'http://127.0.0.1:3100';
const outputPath =
  process.env.WEB_PERF_OUTPUT ??
  'tmp/performance/frontend-stabilization-baseline.json';
const routes = (
  process.env.WEB_PERF_ROUTES ??
  '/cashier,/cashier/lookup,/cashier/earn,/cashier/redeem,/supervisor/approvals,/admin/operations'
)
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const warmNavigation = process.env.WEB_PERF_WARM_NAVIGATION !== 'false';

function sumResourceBytes(resources) {
  return resources.reduce(
    (total, resource) => {
      const encoded = Number(resource.encodedBodySize ?? 0);
      const decoded = Number(resource.decodedBodySize ?? 0);
      return {
        encoded: total.encoded + encoded,
        decoded: total.decoded + decoded,
      };
    },
    { encoded: 0, decoded: 0 },
  );
}

function classifyResource(resource) {
  const url = resource.name.toLowerCase();
  const type = resource.initiatorType;
  if (url.includes('/auth/me')) return 'authMe';
  if (url.includes('/config/public')) return 'publicConfig';
  if (type === 'fetch' || type === 'xmlhttprequest') return 'api';
  if (type === 'script' || url.includes('/_next/static/')) return 'javascript';
  if (url.includes('rsc=1') || resource.name.includes('_rsc')) return 'rsc';
  return 'other';
}

function summarizeResources(resources) {
  const groups = new Map();
  for (const resource of resources) {
    const group = classifyResource(resource);
    const current = groups.get(group) ?? [];
    current.push(resource);
    groups.set(group, current);
  }

  const summary = {};
  for (const [group, groupResources] of groups) {
    summary[group] = {
      requests: groupResources.length,
      ...sumResourceBytes(groupResources),
    };
  }

  return summary;
}

async function measureRoute(page, route) {
  const requestUrls = [];
  const responseTimings = [];
  const requestListener = (request) => requestUrls.push(request.url());
  const responseListener = async (response) => {
    if (!response.url().includes('/api/')) return;
    responseTimings.push({
      url: response.url(),
      status: response.status(),
      timing: response.request().timing(),
    });
  };

  page.on('request', requestListener);
  page.on('response', responseListener);
  try {
    const startedAt = Date.now();
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'networkidle',
    });
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      if (!entry) return null;
      const lcpEntries = performance.getEntriesByType(
        'largest-contentful-paint',
      );
      const interactionEntries = performance
        .getEntriesByType('event')
        .filter((event) => event.duration > 0);
      const hydrationMeasure = performance
        .getEntriesByType('measure')
        .find((measure) => /hydration/i.test(measure.name));
      return {
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        responseStart: entry.responseStart,
        domContentLoaded: entry.domContentLoadedEventEnd,
        loadEventEnd: entry.loadEventEnd,
        lcpMs: lcpEntries.at(-1)?.startTime ?? null,
        inpMs: interactionEntries.length
          ? Math.max(...interactionEntries.map((event) => event.duration))
          : null,
        hydrationDurationMs: hydrationMeasure?.duration ?? null,
      };
    });
    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
      })),
    );

    return {
      route,
      url: page.url(),
      status: response?.status() ?? null,
      durationMs: Date.now() - startedAt,
      navigation,
      resources: summarizeResources(resources),
      requestCounts: {
        total: requestUrls.length,
        authMe: requestUrls.filter((url) => url.includes('/auth/me')).length,
        publicConfig: requestUrls.filter((url) =>
          url.includes('/config/public'),
        ).length,
        api: requestUrls.filter((url) => url.includes('/api/')).length,
        duplicateApiUrls: [
          ...new Set(
            requestUrls
              .filter((url) => url.includes('/api/'))
              .filter((url, index, values) => values.indexOf(url) !== index),
          ),
        ],
      },
      apiResponseTimings: responseTimings,
    };
  } finally {
    page.off('request', requestListener);
    page.off('response', responseListener);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: 'light',
    locale: 'en-NG',
    timezoneId: 'Africa/Lagos',
    ...(process.env.WEB_PERF_STORAGE_STATE
      ? { storageState: process.env.WEB_PERF_STORAGE_STATE }
      : {}),
  });
  const page = await context.newPage();
  const results = [];

  try {
    for (const route of routes) {
      results.push({ cold: await measureRoute(page, route) });
      if (warmNavigation) {
        results.at(-1).warm = await measureRoute(page, route);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GIT_COMMIT_SHA ?? null,
    baseUrl,
    productionBuildRequired: true,
    authenticatedEvidence: Boolean(process.env.WEB_PERF_STORAGE_STATE),
    routes,
    thresholds: {
      warmNavigationPayloadBytes: 150000,
      authMeWarmRequests: 0,
      publicConfigWarmRequests: 0,
      duplicateApiRequests: 0,
      lcpMs: 2500,
      inpMs: 200,
    },
    results,
  };

  await mkdir(outputPath.split('/').slice(0, -1).join('/') || '.', {
    recursive: true,
  });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
