/**
 * Integration tests for form interaction
 * Tests with real Firefox browser in headless mode
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestFirefox, closeFirefox } from '../helpers/firefox.js';
import type { FirefoxClient } from '@/firefox/index.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesPath = resolve(__dirname, '../fixtures');

describe('Form Interaction Integration Tests', () => {
  let firefox: FirefoxClient;

  beforeAll(async () => {
    firefox = await createTestFirefox();
  }, 30000);

  afterAll(async () => {
    await closeFirefox(firefox);
  });

  it('should hover over element by UID', async () => {
    const fixturePath = `file://${fixturesPath}/form.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find submit button
    const submitBtn = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#submitBtn') || entry.css.includes('submitBtn')
    );
    expect(submitBtn).toBeDefined();

    if (submitBtn) {
      // Hover should not throw
      await expect(firefox.hoverByUid(submitBtn.uid)).resolves.not.toThrow();
    }
  }, 15000);
});
