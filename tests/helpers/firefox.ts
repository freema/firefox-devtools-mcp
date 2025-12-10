/**
 * Integration test helpers for Firefox automation
 * Provides shared Firefox client instance and utilities for integration tests
 */

import { FirefoxClient } from '@/firefox/index.js';
import type { FirefoxLaunchOptions } from '@/firefox/types.js';

/**
 * Creates a headless Firefox client for testing
 */
export async function createTestFirefox(options?: Partial<FirefoxLaunchOptions>): Promise<FirefoxClient> {
  const defaultOptions: FirefoxLaunchOptions = {
    headless: true,
    enableBidiLogging: false,
    width: 1280,
    height: 720,
    ...options,
  };

  const firefox = new FirefoxClient(defaultOptions);
  await firefox.connect();
  return firefox;
}

/**
 * Cleanup helper to close Firefox instance
 * Handles the case where firefox is undefined (e.g., when beforeAll times out)
 */
export async function closeFirefox(firefox: FirefoxClient | undefined | null): Promise<void> {
  if (!firefox) {
    // Firefox was never initialized (e.g., beforeAll timed out)
    return;
  }
  try {
    await firefox.close();
  } catch (error) {
    // Ignore errors during cleanup
    console.warn('Error closing Firefox:', error);
  }
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
