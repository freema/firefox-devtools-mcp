/**
 * Integration tests for snapshot workflow
 * Tests with real Firefox browser in headless mode
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestFirefox, closeFirefox } from '../helpers/firefox.js';
import type { FirefoxClient } from '@/firefox/index.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesPath = resolve(__dirname, '../fixtures');

describe('Snapshot Integration Tests', () => {
  let firefox: FirefoxClient;

  beforeAll(async () => {
    firefox = await createTestFirefox();
  }, 30000); // 30 second timeout for browser startup

  afterAll(async () => {
    await closeFirefox(firefox);
  });

  it('should take snapshot and generate UIDs', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.json).toBeDefined();
    expect(snapshot.json.root).toBeDefined();
    expect(snapshot.json.uidMap).toBeDefined();
    expect(snapshot.json.uidMap.length).toBeGreaterThan(0);
    expect(snapshot.text).toBeDefined();
    expect(snapshot.text.length).toBeGreaterThan(0);
  }, 10000);

  it('should resolve UID to selector', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find a UID from the snapshot (by id=#clickBtn)
    const buttonUid = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#clickBtn') || entry.css.includes('id="clickBtn"')
    );

    expect(buttonUid).toBeDefined();

    if (buttonUid) {
      const selector = firefox.resolveUidToSelector(buttonUid.uid);
      expect(selector).toBeDefined();
      expect(typeof selector).toBe('string');
    }
  }, 10000);

  it('should click element by UID', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find button UID (by id=#clickBtn)
    const buttonUid = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#clickBtn') || entry.css.includes('id="clickBtn"')
    );
    expect(buttonUid).toBeDefined();

    if (buttonUid) {
      // Click button - should not throw
      await expect(firefox.clickByUid(buttonUid.uid)).resolves.not.toThrow();
    }
  }, 10000);

  it('should detect stale UIDs after navigation', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot1 = await firefox.takeSnapshot();
    const firstUid = snapshot1.json.uidMap[0]?.uid;

    expect(firstUid).toBeDefined();

    // Navigate to different page
    await firefox.navigate(fixturePath);

    // Old UID should be stale or not found
    if (firstUid) {
      await expect(firefox.clickByUid(firstUid)).rejects.toThrow(/(stale snapshot|UID not found)/);
    }
  }, 10000);

  it('should clear snapshot cache on navigation', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot1 = await firefox.takeSnapshot();
    const snapshotId1 = snapshot1.json.snapshotId;

    // Navigate to same page
    await firefox.navigate(fixturePath);

    const snapshot2 = await firefox.takeSnapshot();
    const snapshotId2 = snapshot2.json.snapshotId;

    // Snapshot IDs should be different
    expect(snapshotId2).toBeGreaterThan(snapshotId1);
  }, 10000);

  it('should handle double-click by UID', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find double-click button UID (by id=#dblClickBtn)
    const dblClickBtnUid = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#dblClickBtn') || entry.css.includes('id="dblClickBtn"')
    );
    expect(dblClickBtnUid).toBeDefined();

    if (dblClickBtnUid) {
      // Double-click button - should not throw
      await expect(firefox.clickByUid(dblClickBtnUid.uid, true)).resolves.not.toThrow();
    }
  }, 10000);

  it('should clear snapshot manually', async () => {
    const fixturePath = `file://${fixturesPath}/simple.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();
    const firstUid = snapshot.json.uidMap[0]?.uid;

    expect(firstUid).toBeDefined();

    // Clear snapshot manually
    firefox.clearSnapshot();

    // UID should be stale after manual clear
    if (firstUid) {
      await expect(firefox.clickByUid(firstUid)).rejects.toThrow();
    }
  }, 10000);
});
