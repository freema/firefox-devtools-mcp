/**
 * Unit tests for input tools
 */

import { describe, it, expect } from 'vitest';
import {
  clickByUidTool,
  hoverByUidTool,
  fillByUidTool,
  dragByUidToUidTool,
  fillFormByUidTool,
  uploadFileByUidTool,
} from '../../src/tools/input.js';

describe('Input Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      expect(clickByUidTool.name).toBe('click_by_uid');
      expect(hoverByUidTool.name).toBe('hover_by_uid');
      expect(fillByUidTool.name).toBe('fill_by_uid');
      expect(dragByUidToUidTool.name).toBe('drag_by_uid_to_uid');
      expect(fillFormByUidTool.name).toBe('fill_form_by_uid');
      expect(uploadFileByUidTool.name).toBe('upload_file_by_uid');
    });

    it('should have valid descriptions', () => {
      expect(clickByUidTool.description).toContain('Click');
      expect(hoverByUidTool.description).toContain('Hover');
      expect(fillByUidTool.description).toContain('Fill');
      expect(dragByUidToUidTool.description).toContain('drag');
      expect(fillFormByUidTool.description).toContain('form');
      expect(uploadFileByUidTool.description).toContain('Upload');
    });

    it('should have valid input schemas', () => {
      expect(clickByUidTool.inputSchema.type).toBe('object');
      expect(hoverByUidTool.inputSchema.type).toBe('object');
      expect(fillByUidTool.inputSchema.type).toBe('object');
      expect(dragByUidToUidTool.inputSchema.type).toBe('object');
      expect(fillFormByUidTool.inputSchema.type).toBe('object');
      expect(uploadFileByUidTool.inputSchema.type).toBe('object');
    });
  });

  describe('Schema Properties', () => {
    it('clickByUidTool should require uid and accept dblClick', () => {
      const { properties, required } = clickByUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.uid).toBeDefined();
      expect(properties?.dblClick).toBeDefined();
      expect(required).toContain('uid');
    });

    it('hoverByUidTool should require uid', () => {
      const { properties, required } = hoverByUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.uid).toBeDefined();
      expect(required).toContain('uid');
    });

    it('fillByUidTool should require uid and value', () => {
      const { properties, required } = fillByUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.uid).toBeDefined();
      expect(properties?.value).toBeDefined();
      expect(required).toContain('uid');
      expect(required).toContain('value');
    });

    it('dragByUidToUidTool should require fromUid and toUid', () => {
      const { properties, required } = dragByUidToUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.fromUid).toBeDefined();
      expect(properties?.toUid).toBeDefined();
      expect(required).toContain('fromUid');
      expect(required).toContain('toUid');
    });

    it('fillFormByUidTool should require elements array', () => {
      const { properties, required } = fillFormByUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.elements).toBeDefined();
      expect(properties?.elements.type).toBe('array');
      expect(required).toContain('elements');
    });

    it('uploadFileByUidTool should require uid and filePath', () => {
      const { properties, required } = uploadFileByUidTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.uid).toBeDefined();
      expect(properties?.filePath).toBeDefined();
      expect(required).toContain('uid');
      expect(required).toContain('filePath');
    });
  });
});
