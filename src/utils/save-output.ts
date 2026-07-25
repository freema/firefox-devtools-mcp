/**
 * Helper for saving bulky tool output to disk instead of returning it inline.
 */

import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export interface SavedOutput {
  path: string;
  bytes: number;
}

function generatedName(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${baseName}-${timestamp}.${extension}`;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Write content to saveTo: a file path (absolute or CWD-relative, parent
 * directories created as needed), or an existing directory (a generated file
 * named after baseName is placed inside). When saveTo is empty, the generated
 * file goes to ~/.firefox-devtools-mcp/output/.
 */
export async function saveOutput(
  content: string | Buffer,
  saveTo: string | undefined,
  baseName: string,
  extension = 'json'
): Promise<SavedOutput> {
  let resolvedPath: string;
  if (saveTo) {
    resolvedPath = resolve(saveTo);
    if (await isDirectory(resolvedPath)) {
      resolvedPath = join(resolvedPath, generatedName(baseName, extension));
    }
  } else {
    resolvedPath = join(
      homedir(),
      '.firefox-devtools-mcp',
      'output',
      generatedName(baseName, extension)
    );
  }
  await mkdir(dirname(resolvedPath), { recursive: true });

  // Write via a sibling temp file and rename so a failed write never leaves a partial file.
  const tmpPath = `${resolvedPath}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(tmpPath, content);
    await rename(tmpPath, resolvedPath);
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }

  return { path: resolvedPath, bytes: Buffer.byteLength(content) };
}
