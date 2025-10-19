/**
 * Unit tests for pages tools
 */

import { describe, it, expect } from 'vitest';
import {
  listPagesTool,
  selectPageTool,
  navigatePageTool,
  newPageTool,
  closePageTool,
} from '../../src/tools/pages.js';

describe('Pages Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      expect(listPagesTool.name).toBe('list_pages');
      expect(selectPageTool.name).toBe('select_page');
      expect(navigatePageTool.name).toBe('navigate_page');
      expect(newPageTool.name).toBe('new_page');
      expect(closePageTool.name).toBe('close_page');
    });

    it('should have valid descriptions', () => {
      expect(listPagesTool.description).toContain('tab');
      expect(selectPageTool.description).toContain('Select');
      expect(navigatePageTool.description).toContain('Navigate');
      expect(newPageTool.description).toContain('new');
      expect(closePageTool.description).toContain('Close');
    });

    it('should have valid input schemas', () => {
      expect(listPagesTool.inputSchema.type).toBe('object');
      expect(selectPageTool.inputSchema.type).toBe('object');
      expect(navigatePageTool.inputSchema.type).toBe('object');
      expect(newPageTool.inputSchema.type).toBe('object');
      expect(closePageTool.inputSchema.type).toBe('object');
    });
  });

  describe('Schema Properties', () => {
    it('selectPageTool should accept pageIdx, url, or title', () => {
      const { properties } = selectPageTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.pageIdx).toBeDefined();
      expect(properties?.url).toBeDefined();
      expect(properties?.title).toBeDefined();
    });

    it('navigatePageTool should require url', () => {
      const { properties } = navigatePageTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.url).toBeDefined();
      expect(properties?.url.type).toBe('string');
    });

    it('newPageTool should accept url', () => {
      const { properties } = newPageTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.url).toBeDefined();
    });

    it('closePageTool should require pageIdx', () => {
      const { properties, required } = closePageTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.pageIdx).toBeDefined();
      expect(required).toContain('pageIdx');
    });
  });
});
