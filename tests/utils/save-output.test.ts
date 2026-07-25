/**
 * Unit tests for save-output helper
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { saveOutput } from '../../src/utils/save-output.js';

const MOCK_HOME = join(tmpdir(), 'save-output-test-home');

vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal<typeof import('node:os')>();
  return { ...os, homedir: () => MOCK_HOME };
});

describe('saveOutput', () => {
  const tempDir = join(tmpdir(), `save-output-test-${Date.now()}`);

  afterEach(() => {
    for (const dir of [tempDir, MOCK_HOME]) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
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

  it('should resolve relative paths against the current working directory', async () => {
    const filePath = join(tempDir, 'relative.json');
    const relativePath = relative(process.cwd(), filePath);
    const saved = await saveOutput('data', relativePath, 'evaluate-script');

    expect(saved.path).toBe(filePath);
    expect(existsSync(filePath)).toBe(true);
  });

  it('should generate a timestamped file in the default output dir when no path is given', async () => {
    const saved = await saveOutput('data', undefined, 'evaluate-script');

    expect(saved.path.startsWith(join(MOCK_HOME, '.firefox-devtools-mcp', 'output') + sep)).toBe(
      true
    );
    expect(saved.path).toContain('evaluate-script-');
    expect(saved.path.endsWith('.json')).toBe(true);
    expect(readFileSync(saved.path, 'utf8')).toBe('data');
  });

  it('should write Buffer content verbatim and report its byte length', async () => {
    const filePath = join(tempDir, 'image.png');
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10]);
    const saved = await saveOutput(buffer, filePath, 'screenshot', 'png');

    expect(saved.path).toBe(filePath);
    expect(saved.bytes).toBe(buffer.length);
    expect(readFileSync(filePath)).toEqual(buffer);
  });

  it('should use the custom extension in the generated file name', async () => {
    const saved = await saveOutput('tree', undefined, 'snapshot', 'txt');

    expect(saved.path).toContain('snapshot-');
    expect(saved.path.endsWith('.txt')).toBe(true);
  });

  it('should place a generated file inside saveTo when it is an existing directory', async () => {
    mkdirSync(tempDir, { recursive: true });
    const saved = await saveOutput('{"a":1}', tempDir, 'network-requests', 'json');

    expect(saved.path.startsWith(tempDir + sep)).toBe(true);
    expect(basename(saved.path)).toMatch(/^network-requests-.*\.json$/);
    expect(existsSync(saved.path)).toBe(true);
  });
});
