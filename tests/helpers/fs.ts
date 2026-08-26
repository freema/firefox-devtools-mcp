import { rmSync } from 'node:fs';

/**
 * Recursive delete that tolerates Windows still holding the handles: `force`
 * suppresses ENOENT but not the ENOTEMPTY/EPERM a just-closed file causes.
 */
export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}
