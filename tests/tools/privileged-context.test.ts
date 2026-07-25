import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluatePrivilegedScriptTool,
  handleEvaluatePrivilegedScript,
} from '../../src/tools/privileged-context.js';

// Mock the index module (used by handler tests)
const mockGetFirefox = vi.hoisted(() => vi.fn());

vi.mock('../../src/index.js', () => ({
  getFirefox: () => mockGetFirefox(),
}));

describe('Privileged Context Tool Definitions', () => {
  describe('evaluatePrivilegedScriptTool', () => {
    it('should have correct name', () => {
      expect(evaluatePrivilegedScriptTool.name).toBe('evaluate_privileged_script');
    });

    it('should require function parameter', () => {
      expect(evaluatePrivilegedScriptTool.inputSchema.required).toContain('function');
    });

    it('should have optional saveTo parameter of type boolean|string', () => {
      const { properties, required } = evaluatePrivilegedScriptTool.inputSchema;
      expect(properties?.saveTo).toBeDefined();
      expect(properties?.saveTo.type).toEqual(['boolean', 'string']);
      expect(required).not.toContain('saveTo');
    });

    it('should have optional numeric preview parameter', () => {
      const { properties, required } = evaluatePrivilegedScriptTool.inputSchema;
      expect(properties?.preview).toBeDefined();
      expect(properties?.preview.type).toBe('number');
      expect(required).not.toContain('preview');
    });
  });
});

describe('Privileged Context Tool Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleEvaluatePrivilegedScript', () => {
    it('should return error when function parameter is missing', async () => {
      const result = await handleEvaluatePrivilegedScript({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('function parameter is required');
    });

    it('should reject plain expressions (not function strings)', async () => {
      const result = await handleEvaluatePrivilegedScript({ function: 'document.title' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid function format');
    });

    it('should execute valid function successfully', async () => {
      const mockFirefox = {
        getCurrentContextId: vi.fn().mockReturnValue('context-1'),
        sendBiDiCommand: vi.fn().mockResolvedValue({
          type: 'success',
          result: { type: 'string', value: 'test-result' },
        }),
      };

      mockGetFirefox.mockResolvedValue(mockFirefox);

      const result = await handleEvaluatePrivilegedScript({
        function: '() => Services.prefs.getBoolPref("foo")',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('chrome context');
      expect(result.content[0].text).toContain('test-result');
    });

    it('should surface BiDi exception details', async () => {
      const mockFirefox = {
        getCurrentContextId: vi.fn().mockReturnValue('context-1'),
        sendBiDiCommand: vi.fn().mockResolvedValue({
          type: 'exception',
          exceptionDetails: {
            text: 'ReferenceError: Services is not defined',
            exception: { type: 'object', value: [] },
          },
        }),
      };

      mockGetFirefox.mockResolvedValue(mockFirefox);

      const result = await handleEvaluatePrivilegedScript({
        function: '() => Services.prefs.getBoolPref("foo")',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Services is not defined');
    });
  });
});
