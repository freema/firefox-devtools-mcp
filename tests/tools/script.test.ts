/**
 * Unit tests for script tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateScriptTool } from '../../src/tools/script.js';

const MOCK_HOME = join(tmpdir(), 'script-test-home');

vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal<typeof import('node:os')>();
  return { ...os, homedir: () => MOCK_HOME };
});

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

    it('should have optional sandbox parameter', () => {
      const { properties, required } = evaluateScriptTool.inputSchema;
      expect(properties?.sandbox).toBeDefined();
      expect(properties?.sandbox.type).toBe('string');
      expect(required).not.toContain('sandbox');
    });

    it('should have optional saveTo parameter', () => {
      const { properties, required } = evaluateScriptTool.inputSchema;
      expect(properties?.saveTo).toBeDefined();
      expect(properties?.saveTo.type).toEqual(['boolean', 'string']);
      expect(required).not.toContain('saveTo');
    });

    it('should have optional preview parameter', () => {
      const { properties, required } = evaluateScriptTool.inputSchema;
      expect(properties?.preview).toBeDefined();
      expect(properties?.preview.type).toBe('number');
      expect(required).not.toContain('preview');
    });
  });

  describe('Handler: saveTo behavior', () => {
    const RESULT_VALUE = 'x'.repeat(5_000);
    let tempDir: string;

    beforeEach(() => {
      tempDir = join(tmpdir(), `script-test-${Date.now()}`);

      vi.doMock('../../src/index.js', () => ({
        args: { unrestrictedSavePaths: true },
        getFirefox: vi.fn().mockResolvedValue({
          getCurrentContextId: vi.fn().mockReturnValue('ctx-1'),
          sendBiDiCommand: vi.fn().mockResolvedValue({
            type: 'success',
            result: { type: 'string', value: RESULT_VALUE },
          }),
        }),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
      for (const dir of [tempDir, MOCK_HOME]) {
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      }
    });

    it('should save result to file and return the path without a preview by default', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const filePath = join(tempDir, 'result.json');
      const result = await handleEvaluateScript({ function: '() => 1', saveTo: filePath });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('Result saved to:');
      expect(text).toContain('KB)');
      expect(text).not.toContain('Preview:');
      expect(existsSync(filePath)).toBe(true);
      expect(JSON.parse(readFileSync(filePath, 'utf8'))).toBe(RESULT_VALUE);
    });

    it('should include a truncated preview when preview is given', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const filePath = join(tempDir, 'result.json');
      const result = await handleEvaluateScript({
        function: '() => 1',
        saveTo: filePath,
        preview: 100,
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('Preview:');
      // Truncated previews end with a short ellipsis rather than the full value.
      expect(text).toContain('...');
      expect(text).not.toContain(RESULT_VALUE);
    });

    it('should treat non-positive preview as no preview', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const filePath = join(tempDir, 'result.json');
      const result = await handleEvaluateScript({
        function: '() => 1',
        saveTo: filePath,
        preview: -1,
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).not.toContain('Preview:');
    });

    it('should save the string "undefined" when the script returns undefined', async () => {
      vi.resetModules();
      vi.doMock('../../src/index.js', () => ({
        args: { unrestrictedSavePaths: true },
        getFirefox: vi.fn().mockResolvedValue({
          getCurrentContextId: vi.fn().mockReturnValue('ctx-1'),
          sendBiDiCommand: vi.fn().mockResolvedValue({
            type: 'success',
            result: { type: 'undefined' },
          }),
        }),
      }));
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const filePath = join(tempDir, 'undef.json');
      const result = await handleEvaluateScript({ function: '() => undefined', saveTo: filePath });

      expect(result.isError).toBeUndefined();
      expect(readFileSync(filePath, 'utf8')).toBe('undefined');
    });

    it('should save to a generated file in the default output dir when saveTo is true', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const result = await handleEvaluateScript({ function: '() => 1', saveTo: true });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('Result saved to:');
      expect(text).toContain(join(MOCK_HOME, '.firefox-devtools-mcp', 'output'));
      expect(text).toContain('evaluate-script-');
    });

    it('should return result inline when saveTo is not provided', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const result = await handleEvaluateScript({ function: '() => 1' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('Script ran on page and returned:');
      expect(text).toContain(RESULT_VALUE);
    });
  });

  describe('Handler: sandbox target', () => {
    const sendBiDiCommand = vi.fn();

    beforeEach(() => {
      vi.resetModules();
      sendBiDiCommand.mockReset();
      sendBiDiCommand.mockResolvedValue({
        type: 'success',
        result: { type: 'number', value: 1 },
      });

      vi.doMock('../../src/index.js', () => ({
        getFirefox: vi.fn().mockResolvedValue({
          getCurrentContextId: vi.fn().mockReturnValue('ctx-1'),
          sendBiDiCommand,
        }),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should target the page realm when sandbox is not given', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const result = await handleEvaluateScript({ function: '() => 1' });

      expect(result.isError).toBeUndefined();
      expect(sendBiDiCommand).toHaveBeenCalledWith(
        'script.callFunction',
        expect.objectContaining({ target: { context: 'ctx-1' } })
      );
    });

    it('should pass the sandbox name in the target when given', async () => {
      const { handleEvaluateScript } = await import('../../src/tools/script.js');
      const result = await handleEvaluateScript({ function: '() => 1', sandbox: 'inspector' });

      expect(result.isError).toBeUndefined();
      expect(sendBiDiCommand).toHaveBeenCalledWith(
        'script.callFunction',
        expect.objectContaining({ target: { context: 'ctx-1', sandbox: 'inspector' } })
      );
    });
  });
});
