/**
 * Unit tests for kit source serving
 *
 * The read_kit_file tool, the kit:// resource and the file shipped beside the
 * server bundle must hand out the same bytes: the agent reads a manual for the
 * code ensure_privileged_kit installs, so a drift between them is a lie.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleReadKitFile } from '../../src/tools/privileged-context.js';
import {
  KIT_URI_SCHEME,
  listKitDocs,
  listKitFiles,
  listKitResources,
  readKitResource,
} from '../../src/utils/kit.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const kitPath = resolve(__dirname, '../../kit');

const names = [...listKitFiles(), ...listKitDocs()];

describe('Kit sources', () => {
  it('should list every file in the shipped kit directory', () => {
    expect(names.length).toBeGreaterThan(0);
    expect([...names].sort()).toEqual(readdirSync(kitPath).sort());
  });

  it('should expose one kit:// resource per file', () => {
    expect(listKitResources().map((r) => r.uri)).toEqual(names.map((n) => KIT_URI_SCHEME + n));
  });

  for (const name of names) {
    it(`should serve ${name} byte-identically from tool, resource and disk`, async () => {
      const onDisk = readFileSync(resolve(kitPath, name), 'utf-8');
      const fromTool = await handleReadKitFile({ name });

      expect(fromTool.isError).toBeUndefined();
      expect(fromTool.content[0].text).toBe(onDisk);
      expect(readKitResource(KIT_URI_SCHEME + name).text).toBe(onDisk);
    });
  }
});
