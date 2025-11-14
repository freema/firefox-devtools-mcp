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

  it('should fill input field by UID', async () => {
    const fixturePath = `file://${fixturesPath}/form.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find name input UID
    const nameInput = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#name') || entry.css.includes('name=')
    );
    expect(nameInput).toBeDefined();

    if (nameInput) {
      // Fill input
      await firefox.fillByUid(nameInput.uid, 'John Doe');

      // Verify value
      const value = await firefox.evaluate('document.getElementById("name").value');
      expect(value).toBe('John Doe');
    }
  }, 15000);

  it('should fill multiple form fields using fillFormByUid', async () => {
    const fixturePath = `file://${fixturesPath}/form.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find input UIDs
    const nameInput = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#name') || entry.css.includes('name=')
    );
    const emailInput = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#email') || entry.css.includes('email')
    );

    expect(nameInput).toBeDefined();
    expect(emailInput).toBeDefined();

    if (nameInput && emailInput) {
      // Fill multiple fields at once
      await firefox.fillFormByUid([
        { uid: nameInput.uid, value: 'Jane Smith' },
        { uid: emailInput.uid, value: 'jane@example.com' },
      ]);

      // Verify values
      const nameValue = await firefox.evaluate('document.getElementById("name").value');
      const emailValue = await firefox.evaluate('document.getElementById("email").value');

      expect(nameValue).toBe('Jane Smith');
      expect(emailValue).toBe('jane@example.com');
    }
  }, 15000);

  it('should fill textarea by UID', async () => {
    const fixturePath = `file://${fixturesPath}/form.html`;
    await firefox.navigate(fixturePath);

    const snapshot = await firefox.takeSnapshot();

    // Find message textarea UID
    const messageTextarea = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#message') || entry.css.includes('message')
    );
    expect(messageTextarea).toBeDefined();

    if (messageTextarea) {
      const testMessage = 'This is a test message\nWith multiple lines';

      // Fill textarea
      await firefox.fillByUid(messageTextarea.uid, testMessage);

      // Verify value
      const value = await firefox.evaluate('document.getElementById("message").value');
      expect(value).toBe(testMessage);
    }
  }, 15000);

  it('should submit form and verify result', async () => {
    const fixturePath = `file://${fixturesPath}/form.html`;
    await firefox.navigate(fixturePath);

    let snapshot = await firefox.takeSnapshot();

    // Find form field UIDs
    const nameInput = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#name') || entry.css.includes('name=')
    );
    const emailInput = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#email') || entry.css.includes('email')
    );
    const messageTextarea = snapshot.json.uidMap.find(
      (entry) => entry.css.includes('#message') || entry.css.includes('message')
    );

    expect(nameInput).toBeDefined();
    expect(emailInput).toBeDefined();
    expect(messageTextarea).toBeDefined();

    if (nameInput && emailInput && messageTextarea) {
      // Fill form
      await firefox.fillFormByUid([
        { uid: nameInput.uid, value: 'Test User' },
        { uid: emailInput.uid, value: 'test@example.com' },
        { uid: messageTextarea.uid, value: 'Test message' },
      ]);

      // Take new snapshot for submit button (form fields may have changed)
      snapshot = await firefox.takeSnapshot();
      const submitBtn = snapshot.json.uidMap.find(
        (entry) => entry.css.includes('#submitBtn') || entry.css.includes('submitBtn')
      );
      expect(submitBtn).toBeDefined();

      if (submitBtn) {
        // Submit form
        await firefox.clickByUid(submitBtn.uid);

        // Wait for result
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Verify result
        const result = await firefox.evaluate('document.getElementById("formResult").textContent');
        expect(result).toBeDefined();
        expect(result).toContain('Test User');
        expect(result).toContain('test@example.com');
      }
    }
  }, 20000);

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
