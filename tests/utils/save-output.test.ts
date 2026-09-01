/**
 * Unit tests for save-output helper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

const MOCK_HOME = join(tmpdir(), 'save-output-test-home');
const HOME_ROOT = join(MOCK_HOME, '.firefox-devtools-mcp');

vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal<typeof import('node:os')>();
  return { ...os, homedir: () => MOCK_HOME };
});

const mockArgs = vi.hoisted(() => ({ unrestrictedSavePaths: false }));
vi.mock('../../src/index.js', () => ({ args: mockArgs }));

import { saveOutput, isWithinRoot } from '../../src/utils/save-output.js';

describe('saveOutput', () => {
  const tempDir = join(tmpdir(), `save-output-test-${process.pid}`);
  const cwdDir = join(process.cwd(), `save-output-cwd-${process.pid}`);

  beforeEach(() => {
    mockArgs.unrestrictedSavePaths = false;
  });

  afterEach(() => {
    for (const dir of [tempDir, MOCK_HOME, cwdDir]) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  describe('write behavior (unrestricted)', () => {
    beforeEach(() => {
      mockArgs.unrestrictedSavePaths = true;
    });

    it('should write to an absolute path and report bytes', async () => {
      const filePath = join(tempDir, 'result.json');
      const saved = await saveOutput('{"a":1}', filePath, 'evaluate-script');

      expect(saved.path).toBe(filePath);
      expect(saved.bytes).toBe(7);
      expect(readFileSync(filePath, 'utf8')).toBe('{"a":1}');
    });

    it('should create missing parent directories', async () => {
      const filePath = join(tempDir, 'nested', 'deep', 'result.json');
      const saved = await saveOutput('data', filePath, 'evaluate-script');

      expect(saved.path).toBe(filePath);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should not leave temporary files behind', async () => {
      const filePath = join(tempDir, 'result.json');
      await saveOutput('data', filePath, 'evaluate-script');

      expect(readdirSync(tempDir)).toEqual(['result.json']);
    });

    it('should write Buffer content verbatim and report its byte length', async () => {
      const filePath = join(tempDir, 'image.png');
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10]);
      const saved = await saveOutput(buffer, filePath, 'screenshot', 'png');

      expect(saved.path).toBe(filePath);
      expect(saved.bytes).toBe(buffer.length);
      expect(readFileSync(filePath)).toEqual(buffer);
    });

    it('should place a generated file inside saveTo when it is an existing directory', async () => {
      mkdirSync(tempDir, { recursive: true });
      const saved = await saveOutput('{"a":1}', tempDir, 'network-requests', 'json');

      expect(saved.path.startsWith(tempDir + sep)).toBe(true);
      expect(basename(saved.path)).toMatch(/^network-requests-.*\.json$/);
      expect(existsSync(saved.path)).toBe(true);
    });
  });

  describe('path restriction (default)', () => {
    it('should allow a relative path within the current working directory', async () => {
      const filePath = join(cwdDir, 'result.json');
      const relativePath = relative(process.cwd(), filePath);
      const saved = await saveOutput('data', relativePath, 'evaluate-script');

      expect(saved.path).toBe(filePath);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should reject a relative path that escapes the current working directory', async () => {
      const escaping = join('..', `save-output-escape-${process.pid}.json`);
      await expect(saveOutput('data', escaping, 'evaluate-script')).rejects.toThrow(
        '--unrestricted-save-paths'
      );
    });

    it('should allow an absolute path within ~/.firefox-devtools-mcp', async () => {
      const filePath = join(HOME_ROOT, 'sub', 'result.json');
      const saved = await saveOutput('data', filePath, 'evaluate-script');

      expect(saved.path).toBe(filePath);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should reject an absolute path outside ~/.firefox-devtools-mcp', async () => {
      const filePath = join(tempDir, 'result.json');
      await expect(saveOutput('data', filePath, 'evaluate-script')).rejects.toThrow(
        '--unrestricted-save-paths'
      );
      expect(existsSync(filePath)).toBe(false);
    });

    it('should generate a timestamped file in the default output dir when no path is given', async () => {
      const saved = await saveOutput('data', undefined, 'evaluate-script');

      expect(saved.path.startsWith(join(HOME_ROOT, 'output') + sep)).toBe(true);
      expect(saved.path).toContain('evaluate-script-');
      expect(saved.path.endsWith('.json')).toBe(true);
      expect(readFileSync(saved.path, 'utf8')).toBe('data');
    });

    it('should use the custom extension in the generated file name', async () => {
      const saved = await saveOutput('tree', undefined, 'snapshot', 'txt');

      expect(saved.path).toContain('snapshot-');
      expect(saved.path.endsWith('.txt')).toBe(true);
    });
  });
});

describe('isWithinRoot', () => {
  const originalPlatform = process.platform;
  const root = join('C:', 'Users', 'me', '.firefox-devtools-mcp');

  const setPlatform = (platform: NodeJS.Platform) =>
    Object.defineProperty(process, 'platform', { value: platform, configurable: true });

  afterEach(() => setPlatform(originalPlatform));

  it('accepts the root itself and paths inside it', () => {
    expect(isWithinRoot(root, root)).toBe(true);
    expect(isWithinRoot(root, join(root, 'out.json'))).toBe(true);
    expect(isWithinRoot(root, join(root, 'nested', 'out.json'))).toBe(true);
  });

  it('rejects paths outside the root, including prefix look-alikes', () => {
    expect(isWithinRoot(root, join('C:', 'Users', 'me', 'secrets', 'out.json'))).toBe(false);
    expect(isWithinRoot(root, `${root}-evil`)).toBe(false);
  });

  it('ignores case on Windows, where the filesystem does too', () => {
    setPlatform('win32');
    expect(isWithinRoot(root, join(root.toLowerCase(), 'out.json'))).toBe(true);
    expect(isWithinRoot(root, join(root.toUpperCase(), 'out.json'))).toBe(true);
  });

  it('still rejects an escape when case is ignored', () => {
    setPlatform('win32');
    expect(isWithinRoot(root, join('c:', 'users', 'me', 'secrets', 'out.json'))).toBe(false);
  });

  it('matches case exactly off Windows', () => {
    setPlatform('linux');
    expect(isWithinRoot(root, join(root.toLowerCase(), 'out.json'))).toBe(false);
  });
});
