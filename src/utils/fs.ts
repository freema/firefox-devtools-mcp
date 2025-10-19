/**
 * File system utilities
 */

import { access, constants } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Check if a file exists and is executable
 */
export async function isExecutable(path: string): Promise<boolean> {
  if (!existsSync(path)) {
    return false;
  }

  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file exists (sync)
 */
export function fileExists(path: string): boolean {
  return existsSync(path);
}
