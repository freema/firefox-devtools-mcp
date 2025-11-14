/**
 * Unit tests for UidResolver
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UidResolver } from '@/firefox/snapshot/resolver.js';
import type { UidEntry } from '@/firefox/snapshot/types.js';

// Mock WebDriver
const createMockDriver = () => ({
  findElement: vi.fn(),
});

describe('UidResolver', () => {
  let mockDriver: any;
  let resolver: UidResolver;

  beforeEach(() => {
    mockDriver = createMockDriver();
    resolver = new UidResolver(mockDriver);
  });

  describe('setSnapshotId / getSnapshotId', () => {
    it('should start with snapshot ID 0', () => {
      expect(resolver.getSnapshotId()).toBe(0);
    });

    it('should set and get snapshot ID', () => {
      resolver.setSnapshotId(5);
      expect(resolver.getSnapshotId()).toBe(5);
    });

    it('should update snapshot ID', () => {
      resolver.setSnapshotId(1);
      expect(resolver.getSnapshotId()).toBe(1);

      resolver.setSnapshotId(10);
      expect(resolver.getSnapshotId()).toBe(10);
    });
  });

  describe('storeUidMappings', () => {
    it('should store UID mappings', () => {
      const uidMap: UidEntry[] = [
        { uid: '1_button', css: '#submit', xpath: '//button[@id="submit"]' },
        { uid: '1_input', css: 'input[name="email"]', xpath: '//input[@name="email"]' },
      ];

      resolver.setSnapshotId(1);
      resolver.storeUidMappings(uidMap);

      // Should not throw when resolving valid UIDs
      expect(() => resolver.resolveUidToSelector('1_button')).not.toThrow();
      expect(() => resolver.resolveUidToSelector('1_input')).not.toThrow();
    });

    it('should clear previous mappings when storing new ones', () => {
      const firstMap: UidEntry[] = [{ uid: '1_button', css: '#old', xpath: '//old' }];
      const secondMap: UidEntry[] = [{ uid: '2_button', css: '#new', xpath: '//new' }];

      resolver.setSnapshotId(1);
      resolver.storeUidMappings(firstMap);

      resolver.setSnapshotId(2);
      resolver.storeUidMappings(secondMap);

      // Old UID should not be found
      expect(() => resolver.resolveUidToSelector('1_button')).toThrow(/stale snapshot/);

      // New UID should be found
      expect(resolver.resolveUidToSelector('2_button')).toBe('#new');
    });
  });

  describe('validateUid', () => {
    beforeEach(() => {
      resolver.setSnapshotId(5);
    });

    it('should validate UID with matching snapshot ID', () => {
      expect(() => resolver.validateUid('5_button')).not.toThrow();
    });

    it('should throw on stale snapshot ID', () => {
      expect(() => resolver.validateUid('4_button')).toThrow(/stale snapshot/);
      expect(() => resolver.validateUid('6_button')).toThrow(/stale snapshot/);
    });

    it('should throw on invalid UID format (no underscore)', () => {
      expect(() => resolver.validateUid('invalid')).toThrow(/Invalid UID format/);
    });

    it('should throw on invalid UID format (non-numeric ID)', () => {
      expect(() => resolver.validateUid('abc_button')).toThrow(/Invalid UID format/);
    });

    it('should throw on empty UID', () => {
      expect(() => resolver.validateUid('')).toThrow(/Invalid UID format/);
    });

    it('should throw on UID with empty snapshot ID', () => {
      expect(() => resolver.validateUid('_button')).toThrow(/Invalid UID format/);
    });
  });

  describe('resolveUidToSelector', () => {
    beforeEach(() => {
      resolver.setSnapshotId(1);
      const uidMap: UidEntry[] = [
        { uid: '1_button', css: '#submit', xpath: '//button[@id="submit"]' },
        { uid: '1_input', css: 'input[name="email"]', xpath: null },
      ];
      resolver.storeUidMappings(uidMap);
    });

    it('should resolve UID to CSS selector', () => {
      expect(resolver.resolveUidToSelector('1_button')).toBe('#submit');
      expect(resolver.resolveUidToSelector('1_input')).toBe('input[name="email"]');
    });

    it('should throw on stale UID', () => {
      resolver.setSnapshotId(2);
      expect(() => resolver.resolveUidToSelector('1_button')).toThrow(/stale snapshot/);
    });

    it('should throw on unknown UID', () => {
      expect(() => resolver.resolveUidToSelector('1_unknown')).toThrow(/UID not found/);
    });

    it('should throw on invalid UID format', () => {
      expect(() => resolver.resolveUidToSelector('invalid')).toThrow(/Invalid UID format/);
    });
  });

  describe('resolveUidToElement', () => {
    let mockElement: any;

    beforeEach(() => {
      mockElement = {
        isDisplayed: vi.fn().mockResolvedValue(true),
      };

      resolver.setSnapshotId(1);
      const uidMap: UidEntry[] = [
        { uid: '1_button', css: '#submit', xpath: '//button[@id="submit"]' },
        { uid: '1_input', css: 'input[name="email"]', xpath: null },
      ];
      resolver.storeUidMappings(uidMap);
    });

    it('should resolve UID to element using CSS selector', async () => {
      mockDriver.findElement.mockResolvedValue(mockElement);

      const element = await resolver.resolveUidToElement('1_button');

      expect(element).toBe(mockElement);
      expect(mockDriver.findElement).toHaveBeenCalledOnce();
    });

    it('should cache resolved elements', async () => {
      mockDriver.findElement.mockResolvedValue(mockElement);

      // First call
      await resolver.resolveUidToElement('1_button');
      expect(mockDriver.findElement).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await resolver.resolveUidToElement('1_button');
      expect(mockDriver.findElement).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should re-find element if cached element is stale', async () => {
      mockDriver.findElement.mockResolvedValue(mockElement);

      // First call caches element
      await resolver.resolveUidToElement('1_button');

      // Make cached element stale
      mockElement.isDisplayed.mockRejectedValueOnce(new Error('Stale element'));

      // Mock new element
      const newElement = { isDisplayed: vi.fn().mockResolvedValue(true) };
      mockDriver.findElement.mockResolvedValueOnce(newElement);

      // Second call should re-find
      const element = await resolver.resolveUidToElement('1_button');
      expect(element).toBe(newElement);
      expect(mockDriver.findElement).toHaveBeenCalledTimes(2);
    });

    it('should fallback to XPath if CSS fails', async () => {
      const xpathElement = { isDisplayed: vi.fn().mockResolvedValue(true) };

      // CSS fails
      mockDriver.findElement
        .mockRejectedValueOnce(new Error('CSS not found'))
        // XPath succeeds
        .mockResolvedValueOnce(xpathElement);

      const element = await resolver.resolveUidToElement('1_button');

      expect(element).toBe(xpathElement);
      expect(mockDriver.findElement).toHaveBeenCalledTimes(2);
    });

    it('should throw if element not found by CSS and no XPath', async () => {
      mockDriver.findElement.mockRejectedValue(new Error('Not found'));

      await expect(resolver.resolveUidToElement('1_input')).rejects.toThrow(
        /Element not found for UID/
      );
    });

    it('should throw if element not found by CSS and XPath', async () => {
      mockDriver.findElement
        .mockRejectedValueOnce(new Error('CSS not found'))
        .mockRejectedValueOnce(new Error('XPath not found'));

      await expect(resolver.resolveUidToElement('1_button')).rejects.toThrow(
        /Element not found for UID/
      );
    });

    it('should throw on stale UID', async () => {
      resolver.setSnapshotId(2);

      await expect(resolver.resolveUidToElement('1_button')).rejects.toThrow(/stale snapshot/);
    });

    it('should throw on unknown UID', async () => {
      await expect(resolver.resolveUidToElement('1_unknown')).rejects.toThrow(/UID not found/);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      resolver.setSnapshotId(1);
      const uidMap: UidEntry[] = [{ uid: '1_button', css: '#submit', xpath: '//button' }];
      resolver.storeUidMappings(uidMap);
    });

    it('should clear all UID mappings', () => {
      resolver.clear();

      // UID should no longer be found
      expect(() => resolver.resolveUidToSelector('1_button')).toThrow(/UID not found/);
    });

    it('should clear element cache', async () => {
      const mockElement = { isDisplayed: vi.fn().mockResolvedValue(true) };
      mockDriver.findElement.mockResolvedValue(mockElement);

      // Cache element
      await resolver.resolveUidToElement('1_button');

      // Clear cache
      resolver.clear();

      // Re-add mapping
      const uidMap: UidEntry[] = [{ uid: '1_button', css: '#submit', xpath: '//button' }];
      resolver.storeUidMappings(uidMap);

      // Should re-find element (not use cache)
      await resolver.resolveUidToElement('1_button');
      expect(mockDriver.findElement).toHaveBeenCalledTimes(2); // Once before clear, once after
    });
  });
});
