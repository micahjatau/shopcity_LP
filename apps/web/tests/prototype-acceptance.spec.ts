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
      routes: Record<string, { reference: string; viewport: [number, number] }>;
    };

    expect(Object.keys(manifest.routes)).toHaveLength(7);
    for (const [routeName, route] of Object.entries(manifest.routes)) {
      const referencePath = path.join(repoRoot, route.reference);
      expect(fs.existsSync(referencePath), `${routeName} reference`).toBe(true);
      expect(
        route.reference.startsWith(`${manifest.referenceDirectory}/`),
      ).toBe(true);
      expect(route.viewport).toEqual([1440, 923]);
      const metadata = await sharp(referencePath).metadata();
      expect(metadata.width, `${routeName} width`).toBeGreaterThan(0);
      expect(metadata.height, `${routeName} height`).toBeGreaterThan(0);
    }
  });
});
