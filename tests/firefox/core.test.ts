/**
 * Unit tests for FirefoxCore module
 */

import { describe, it, expect } from 'vitest';
import { FirefoxCore } from '@/firefox/core.js';
import type { FirefoxLaunchOptions } from '@/firefox/types.js';

describe('FirefoxCore', () => {
  describe('constructor', () => {
    it('should create instance with options', () => {
      const options: FirefoxLaunchOptions = {
        headless: true,
        width: 1920,
        height: 1080,
      };

      const core = new FirefoxCore(options);
      expect(core).toBeInstanceOf(FirefoxCore);
    });
  });

  describe('getCurrentContextId', () => {
    it('should return null when not connected', () => {
      const core = new FirefoxCore({ headless: true });
      expect(core.getCurrentContextId()).toBe(null);
    });
  });

  describe('setCurrentContextId', () => {
    it('should set context ID', () => {
      const core = new FirefoxCore({ headless: true });
      const contextId = 'test-context-123';

      core.setCurrentContextId(contextId);
      expect(core.getCurrentContextId()).toBe(contextId);
    });

    it('should update context ID', () => {
      const core = new FirefoxCore({ headless: true });

      core.setCurrentContextId('context-1');
      expect(core.getCurrentContextId()).toBe('context-1');

      core.setCurrentContextId('context-2');
      expect(core.getCurrentContextId()).toBe('context-2');
    });
  });

  describe('getDriver', () => {
    it('should throw error when not connected', () => {
      const core = new FirefoxCore({ headless: true });
      expect(() => core.getDriver()).toThrow('Driver not connected');
    });
  });

  describe('isConnected', () => {
    it('should return false when driver is null', async () => {
      const core = new FirefoxCore({ headless: true });
      const connected = await core.isConnected();
      expect(connected).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset driver and context to null', () => {
      const core = new FirefoxCore({ headless: true });
      core.setCurrentContextId('test-context');

      core.reset();

      expect(core.getCurrentContextId()).toBe(null);
      expect(() => core.getDriver()).toThrow('Driver not connected');
    });
  });
});
