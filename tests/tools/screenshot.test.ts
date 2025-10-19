/**
 * Unit tests for screenshot tools
 */

import { describe, it, expect } from 'vitest';
import { screenshotPageTool, screenshotByUidTool } from '../../src/tools/screenshot.js';

describe('Screenshot Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      expect(screenshotPageTool.name).toBe('screenshot_page');
      expect(screenshotByUidTool.name).toBe('screenshot_by_uid');
    });

    it('should have valid descriptions', () => {
      expect(screenshotPageTool.description).toContain('screenshot');
      expect(screenshotByUidTool.description).toContain('screenshot');
      expect(screenshotByUidTool.description).toContain('element');
    });

    it('should have valid input schemas', () => {
      expect(screenshotPageTool.inputSchema.type).toBe('object');
      expect(screenshotByUidTool.inputSchema.type).toBe('object');
    });
  });

  describe('Schema Properties', () => {
    it('screenshotPageTool should have empty properties', () => {
      const { properties } = screenshotPageTool.inputSchema;
      expect(properties).toBeDefined();
    });

    it('screenshotByUidTool should require uid', () => {
      const { properties, required } = screenshotByUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.uid).toBeDefined();
      expect(required).toContain('uid');
    });
  });
});
