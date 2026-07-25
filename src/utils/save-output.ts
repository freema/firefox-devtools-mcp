/**
 * Helper for saving bulky tool output to disk instead of returning it inline.
 */

import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

export interface SavedOutput {
  path: string;
  bytes: number;
}

function homeRoot(): string {
  return join(homedir(), '.firefox-devtools-mcp');
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
 * Reject saveTo paths that escape the allowed roots, unless the server was
 * started with --unrestricted-save-paths. Relative paths must stay within the
 * current working directory; absolute paths must stay within
 * ~/.firefox-devtools-mcp.
 */
async function assertAllowedPath(saveTo: string, resolvedPath: string): Promise<void> {
  const { args } = await import('../index.js');
  if (args?.unrestrictedSavePaths) {
    return;
  }
  const root = isAbsolute(saveTo) ? homeRoot() : process.cwd();
  if (resolvedPath !== root && !resolvedPath.startsWith(root + sep)) {
    throw new Error(
      `saveTo "${saveTo}" resolves outside the allowed location (${resolvedPath}). Relative ` +
        `paths must stay within the current working directory and absolute paths within ` +
        `${homeRoot()}. Start the server with --unrestricted-save-paths to write to arbitrary ` +
        `locations.`
    );
  }
}

/**
 * Write content to saveTo: a file path (relative to the current working
 * directory, or absolute within ~/.firefox-devtools-mcp; parent directories are
 * created as needed), or an existing directory (a generated file named after
 * baseName is placed inside). When saveTo is empty, the generated file goes to
 * ~/.firefox-devtools-mcp/output/. Paths escaping the allowed roots are rejected
 * unless the server runs with --unrestricted-save-paths.
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
    await assertAllowedPath(saveTo, resolvedPath);
  } else {
    resolvedPath = join(homeRoot(), 'output', generatedName(baseName, extension));
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
