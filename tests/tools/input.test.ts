/**
 * Unit tests for input tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clickByUidTool,
  hoverByUidTool,
  fillByUidTool,
  dragByUidToUidTool,
  fillFormByUidTool,
  uploadFileByUidTool,
  pressKeyTool,
} from '../../src/tools/input.js';

function textOf(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('Input Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      expect(clickByUidTool.name).toBe('click_by_uid');
      expect(hoverByUidTool.name).toBe('hover_by_uid');
      expect(fillByUidTool.name).toBe('fill_by_uid');
      expect(dragByUidToUidTool.name).toBe('drag_by_uid_to_uid');
      expect(fillFormByUidTool.name).toBe('fill_form_by_uid');
      expect(uploadFileByUidTool.name).toBe('upload_file_by_uid');
      expect(pressKeyTool.name).toBe('press_key');
    });

    it('should have valid descriptions', () => {
      expect(clickByUidTool.description).toContain('Click');
      expect(hoverByUidTool.description).toContain('Hover');
      expect(fillByUidTool.description).toContain('Fill');
      expect(dragByUidToUidTool.description).toContain('drag');
      expect(fillFormByUidTool.description).toContain('form');
      expect(uploadFileByUidTool.description).toContain('Upload');
      expect(pressKeyTool.description).toContain('Press');
    });

    it('should steer press_key away from entering text', () => {
      expect(pressKeyTool.description).toMatch(/single key/i);
      expect(pressKeyTool.description).toContain('fill_by_uid');
    });

    it('should have valid input schemas', () => {
      expect(clickByUidTool.inputSchema.type).toBe('object');
      expect(hoverByUidTool.inputSchema.type).toBe('object');
      expect(fillByUidTool.inputSchema.type).toBe('object');
      expect(dragByUidToUidTool.inputSchema.type).toBe('object');
      expect(fillFormByUidTool.inputSchema.type).toBe('object');
      expect(uploadFileByUidTool.inputSchema.type).toBe('object');
      expect(pressKeyTool.inputSchema.type).toBe('object');
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

    it('pressKeyTool should require key and accept an optional uid', () => {
      const { properties, required } = pressKeyTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.key.type).toBe('string');
      expect(properties?.uid.type).toBe('string');
      expect(required).toEqual(['key']);
    });
  });

  describe('handlePressKey', () => {
    let pressKey: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.resetModules();
      pressKey = vi.fn().mockResolvedValue(undefined);
      vi.doMock('../../src/index.js', () => ({
        args: {},
        getFirefox: vi.fn().mockResolvedValue({ pressKey }),
      }));
    });

    afterEach(() => {
      vi.doUnmock('../../src/index.js');
      vi.restoreAllMocks();
    });

    it('should send the key to the focused element when no uid is given', async () => {
      const { handlePressKey } = await import('../../src/tools/input.js');
      const result = await handlePressKey({ key: 'ctrl+shift+t' });

      expect(result.isError).toBeUndefined();
      expect(pressKey).toHaveBeenCalledWith('ctrl+shift+t', undefined);
      expect(textOf(result)).toContain('ctrl+shift+t');
    });

    it('should send the key to the given uid', async () => {
      const { handlePressKey } = await import('../../src/tools/input.js');
      const result = await handlePressKey({ key: 'Escape', uid: 'uid-3' });

      expect(result.isError).toBeUndefined();
      expect(pressKey).toHaveBeenCalledWith('Escape', 'uid-3');
      expect(textOf(result)).toContain('uid-3');
    });

    it('should reject a missing or non-string key', async () => {
      const { handlePressKey } = await import('../../src/tools/input.js');

      for (const args of [{}, { key: '' }, { key: 42 }]) {
        const result = await handlePressKey(args);
        expect(result.isError).toBe(true);
        expect(textOf(result)).toContain('key parameter is required');
      }
      expect(pressKey).not.toHaveBeenCalled();
    });

    it('should report a stale uid as such', async () => {
      pressKey.mockRejectedValue(new Error('UID uid-9 not found in snapshot'));
      const { handlePressKey } = await import('../../src/tools/input.js');
      const result = await handlePressKey({ key: 'Enter', uid: 'uid-9' });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('take_snapshot');
    });

    it('should surface a parse error unchanged', async () => {
      pressKey.mockRejectedValue(new Error('press_key: unknown key "foobar" in "foobar"'));
      const { handlePressKey } = await import('../../src/tools/input.js');
      const result = await handlePressKey({ key: 'foobar', uid: 'uid-1' });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('unknown key "foobar"');
    });
  });
});
