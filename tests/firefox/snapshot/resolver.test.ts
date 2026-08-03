/**
 * Unit tests for UidResolver
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UidResolver } from '@/firefox/snapshot/resolver.js';

// Mock WebDriver
const createMockDriver = () => ({
  executeScript: vi.fn(),
});

describe('UidResolver', () => {
  let mockDriver: any;
  let resolver: UidResolver;

  beforeEach(() => {
    mockDriver = createMockDriver();
    resolver = new UidResolver(mockDriver);
  });

  describe('resolveUidToElement', () => {
    it('should return the element looked up in the page', async () => {
      const mockElement = { getId: vi.fn() };
      mockDriver.executeScript.mockResolvedValue(mockElement);

      const element = await resolver.resolveUidToElement('e0');

      expect(element).toBe(mockElement);
      expect(mockDriver.executeScript).toHaveBeenCalledWith(expect.any(String), 'e0');
    });

    it('should throw when the page has no element for the UID', async () => {
      mockDriver.executeScript.mockResolvedValue(null);

      await expect(resolver.resolveUidToElement('e0')).rejects.toThrow(/UID not found/);
    });
  });

  describe('resolveUidToSelector', () => {
    it('should return the selector generated in the page', async () => {
      mockDriver.executeScript.mockResolvedValue('body > button#submit');

      await expect(resolver.resolveUidToSelector('e0')).resolves.toBe('body > button#submit');
    });

    it('should throw when the page has no element for the UID', async () => {
      mockDriver.executeScript.mockResolvedValue(null);

      await expect(resolver.resolveUidToSelector('e0')).rejects.toThrow(/UID not found/);
    });
  });

  describe('clear', () => {
    it('should clear the UID registry in the page', async () => {
      mockDriver.executeScript.mockResolvedValue(undefined);

      await resolver.clear();

      expect(mockDriver.executeScript).toHaveBeenCalledOnce();
      expect(mockDriver.executeScript.mock.calls[0][0]).toContain('__clearUidRegistry');
    });

    it('should not throw when the page cannot be reached', async () => {
      mockDriver.executeScript.mockRejectedValue(new Error('no such window'));

      await expect(resolver.clear()).resolves.toBeUndefined();
    });
  });
});
