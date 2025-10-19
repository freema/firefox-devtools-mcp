/**
 * Unit tests for snapshot tools
 */

import { describe, it, expect } from 'vitest';
import {
  takeSnapshotTool,
  resolveUidToSelectorTool,
  clearSnapshotTool,
} from '../../src/tools/snapshot.js';

describe('Snapshot Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      expect(takeSnapshotTool.name).toBe('take_snapshot');
      expect(resolveUidToSelectorTool.name).toBe('resolve_uid_to_selector');
      expect(clearSnapshotTool.name).toBe('clear_snapshot');
    });

    it('should have valid descriptions', () => {
      expect(takeSnapshotTool.description).toContain('snapshot');
      expect(resolveUidToSelectorTool.description).toContain('UID');
      expect(clearSnapshotTool.description).toContain('Clear');
    });

    it('should have valid input schemas', () => {
      expect(takeSnapshotTool.inputSchema.type).toBe('object');
      expect(resolveUidToSelectorTool.inputSchema.type).toBe('object');
      expect(clearSnapshotTool.inputSchema.type).toBe('object');
    });
  });

  describe('Schema Properties', () => {
    it('takeSnapshotTool should have snapshot options', () => {
      const { properties } = takeSnapshotTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.maxLines).toBeDefined();
      expect(properties?.includeAttributes).toBeDefined();
      expect(properties?.includeText).toBeDefined();
      expect(properties?.maxDepth).toBeDefined();
    });

    it('takeSnapshotTool options should have correct types', () => {
      const { properties } = takeSnapshotTool.inputSchema;
      expect(properties?.maxLines.type).toBe('number');
      expect(properties?.includeAttributes.type).toBe('boolean');
      expect(properties?.includeText.type).toBe('boolean');
      expect(properties?.maxDepth.type).toBe('number');
    });

    it('resolveUidToSelectorTool should require uid', () => {
      const { properties, required } = resolveUidToSelectorTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.uid).toBeDefined();
      expect(required).toContain('uid');
    });
  });
});
