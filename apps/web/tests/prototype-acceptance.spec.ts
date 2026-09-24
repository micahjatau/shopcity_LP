import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = path.resolve(process.cwd(), '..', '..');
const manifestPath = path.join(
  repoRoot,
  'docs/frontend/prototype-reference-manifest.json',
);

test.describe('prototype acceptance contract', () => {
  test('keeps every manifest reference present and dimensioned', async () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      referenceDirectory: string;
      routes: Record<
        string,
        {
          reference: string;
          viewport: [number, number];
          sourceViewport: [number, number];
          actualDimensions: [number, number];
          sourceBounds: [number, number, number, number] | null;
          targetLandmark: string;
          comparisonMode: string;
          category: string;
          status: string;
        }
      >;
      assets: Record<
        string,
        {
          sourceAsset: string;
          sourceSha: string;
          actualDimensions: [number, number];
          sourceBounds: [number, number, number, number] | null;
          targetLandmark: string;
          comparisonMode: string;
          category: string;
          status: string;
        }
      >;
    };

    expect(Object.keys(manifest.routes)).toHaveLength(8);
    expect(manifest.routes.registerCustomer.route).toBe(
      '/supervisor/customers/new',
    );
    expect(manifest.routes.registerCustomer.targetLandmark).toBe(
      '[data-od-id="register-flow"]',
    );
    expect(manifest.routes.registerCustomerAdmin.route).toBe(
      '/admin/customers/new',
    );
    expect(manifest.routes.registerCustomerAdmin.targetLandmark).toBe(
      '[data-od-id="register-flow"]',
    );
    expect(Object.keys(manifest.assets).length).toBeGreaterThanOrEqual(21);
    for (const [routeName, route] of Object.entries(manifest.routes)) {
      const referencePath = path.join(repoRoot, route.reference);
      expect(fs.existsSync(referencePath), `${routeName} reference`).toBe(true);
      expect(
        route.reference.startsWith(`${manifest.referenceDirectory}/`),
      ).toBe(true);
      expect(route.viewport).toEqual([1440, 923]);
      expect(route.sourceViewport).toEqual([1440, 923]);
      expect(route.targetLandmark).toMatch(/^\[data-od-id=/);
      expect(['A', 'B', 'C']).toContain(route.category);
      expect(route.status).toBe('source-bounds-blocked');
      const metadata = await sharp(referencePath).metadata();
      expect([metadata.width, metadata.height]).toEqual(route.actualDimensions);
    }

    for (const [assetName, asset] of Object.entries(manifest.assets)) {
      const referencePath = path.join(repoRoot, asset.sourceAsset);
      expect(fs.existsSync(referencePath), `${assetName} asset`).toBe(true);
      expect(asset.sourceSha).toBe('410ecd75');
      expect(asset.targetLandmark).toMatch(/^\[data-od-id=/);
      expect(['full-page', 'full-page-reference', 'crop-landmark']).toContain(
        asset.comparisonMode,
      );
      expect(['A', 'B', 'C']).toContain(asset.category);
      expect(['mapped', 'source-bounds-blocked']).toContain(asset.status);
      const metadata = await sharp(referencePath).metadata();
      expect([metadata.width, metadata.height]).toEqual(asset.actualDimensions);
      if (asset.status === 'source-bounds-blocked') {
        expect(asset.sourceBounds).toBeNull();
      }
    }
  });
});
