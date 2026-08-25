/**
 * Firefox binary discovery.
 *
 * On Windows geckodriver only searches the Program Files directories and
 * HKEY_LOCAL_MACHINE, so it cannot see a per-user install (%LOCALAPPDATA%,
 * registered under HKCU) — what the installer produces without admin rights.
 * Finding the binary here and passing it as moz:firefoxOptions.binary fixes
 * that. Only used on Windows: geckodriver's own lookup suffices elsewhere.
 *
 * The lookup belongs in geckodriver itself, tracked as
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1921933; this can go once that
 * ships.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { win32 as windowsPath } from 'node:path';
import { logDebug } from '../utils/logger.js';

/** Install directory name plus executable, relative to a candidate root. */
const WINDOWS_RELATIVE_PATH = windowsPath.join('Mozilla Firefox', 'firefox.exe');

/**
 * Probed in geckodriver's own order — Program Files before the per-user
 * location — so setups that already work keep resolving to the same binary.
 */
const WINDOWS_ROOT_ENV_VARS = ['ProgramFiles', 'ProgramW6432', 'ProgramFiles(x86)', 'LOCALAPPDATA'];

/** Registry values holding the path to firefox.exe; HKCU is the per-user install. */
const WINDOWS_REGISTRY_KEYS = [
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\firefox.exe',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\firefox.exe',
];

/**
 * Extracts the value from `reg query ... /ve` output. Splits on the `REG_SZ`
 * type tag because the value name is localised on non-English Windows.
 */
export function parseRegQueryOutput(output: string): string | null {
  for (const line of output.split(/\r?\n/)) {
    const match = /\bREG_(?:SZ|EXPAND_SZ)\b\s+(.+)$/.exec(line);
    if (match?.[1]) {
      const value = match[1].trim();
      if (value) {
        return value;
      }
    }
  }
  return null;
}

function isExecutableFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false; // Unreadable candidate — treat as absent.
  }
}

/**
 * Absolute path to reg.exe. Resolving it by name would go through PATH, and an
 * MCP client can launch the server with a minimal environment — the registry is
 * the last resort, so it must not depend on PATH being populated.
 */
function regExecutable(): string {
  const systemRoot = process.env.SystemRoot ?? process.env.windir;
  return systemRoot ? windowsPath.join(systemRoot, 'System32', 'reg.exe') : 'reg';
}

function queryWindowsRegistry(key: string): string | null {
  try {
    const output = execFileSync(regExecutable(), ['query', key, '/ve'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    return parseRegQueryOutput(output);
  } catch {
    return null; // Missing key, or reg.exe unavailable.
  }
}

/**
 * Locates firefox.exe when the caller did not supply a binary. Returns null
 * when nothing was found.
 */
export function findFirefoxBinaryWindows(): string | null {
  for (const envVar of WINDOWS_ROOT_ENV_VARS) {
    const root = process.env[envVar];
    if (!root) {
      continue;
    }
    const candidate = windowsPath.join(root, WINDOWS_RELATIVE_PATH);
    if (isExecutableFile(candidate)) {
      logDebug(`Found Firefox via %${envVar}%: ${candidate}`);
      return candidate;
    }
  }

  // A PATH-exposed firefox.exe is deliberate (and how CI images pin a build).
  for (const dir of (process.env.PATH ?? '').split(windowsPath.delimiter)) {
    if (!dir) {
      continue;
    }
    const candidate = windowsPath.join(dir, 'firefox.exe');
    if (isExecutableFile(candidate)) {
      logDebug(`Found Firefox on PATH: ${candidate}`);
      return candidate;
    }
  }

  // Last resort: ask Windows, which also covers relocated installs.
  for (const key of WINDOWS_REGISTRY_KEYS) {
    const value = queryWindowsRegistry(key);
    if (value && isExecutableFile(value)) {
      logDebug(`Found Firefox via registry ${key}: ${value}`);
      return value;
    }
  }

  return null;
}
