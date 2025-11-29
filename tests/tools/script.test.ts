/**
 * Unit tests for script tools
 */

import { describe, it, expect } from 'vitest';
import { evaluateScriptTool } from '../../src/tools/script.js';

describe('Script Tools', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool name', () => {
      expect(evaluateScriptTool.name).toBe('evaluate_script');
    });

    it('should have valid description', () => {
      expect(evaluateScriptTool.description).toContain('JS');
    });

    it('should have valid input schema', () => {
      expect(evaluateScriptTool.inputSchema.type).toBe('object');
    });
  });

  describe('Schema Properties', () => {
    it('should require function parameter', () => {
      const { properties, required } = evaluateScriptTool.inputSchema;
      expect(properties).toBeDefined();
      expect(properties?.function).toBeDefined();
      expect(properties?.function.type).toBe('string');
      expect(required).toContain('function');
    });

    it('should have optional args parameter', () => {
      const { properties } = evaluateScriptTool.inputSchema;
      expect(properties?.args).toBeDefined();
      expect(properties?.args.type).toBe('array');
    });

    it('should have optional timeout parameter', () => {
      const { properties } = evaluateScriptTool.inputSchema;
      expect(properties?.timeout).toBeDefined();
      expect(properties?.timeout.type).toBe('number');
    });
  });
});
