/**
 * Firefox process launcher with RDP support
 */

import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import fs from 'node:fs/promises';
import nodePath from 'node:path';
import { platform, tmpdir } from 'os';
import { Socket } from 'net';
import type { FirefoxLaunchOptions } from './types.js';
import { log, logDebug, logError } from '../utils/logger.js';
import { FIREFOX_PREFS } from '../config/constants.js';
import { isExecutable } from '../utils/fs.js';

type FirefoxEdition = 'stable' | 'developer' | 'nightly';

/**
 * Get list of candidate Firefox executable paths based on platform and edition
 */
function getExecutableCandidates(edition?: FirefoxEdition): string[] {
  // If no edition specified, try developer first, then stable (nightly is less common)
  if (edition === undefined) {
    return [
      ...getExecutableCandidates('developer'),
      ...getExecutableCandidates('stable'),
      ...getExecutableCandidates('nightly'),
    ];
  }

  const plat = platform();

  // Linux/Unix: scan PATH directories
  if (['linux', 'freebsd', 'sunos'].includes(plat)) {
    const paths = (process.env.PATH || '').split(':').filter(Boolean);

    switch (edition) {
      case 'stable':
        return paths.map((dir) => nodePath.join(dir, 'firefox'));

      case 'developer':
        return [
          ...paths.map((dir) => nodePath.join(dir, 'firefox-developer-edition')),
          ...paths.map((dir) => nodePath.join(dir, 'firefox-developer')),
        ];

      case 'nightly':
        return paths.map((dir) => nodePath.join(dir, 'firefox-nightly'));
    }
  }

  // macOS and Windows: known installation paths
  switch (edition) {
    case 'stable':
      if (plat === 'darwin') {
        return ['/Applications/Firefox.app/Contents/MacOS/firefox'];
      } else if (plat === 'win32') {
        return [
          'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
          'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
        ];
      }
      break;

    case 'developer':
      if (plat === 'darwin') {
        return [
          '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
          '/Applications/FirefoxDeveloperEdition.app/Contents/MacOS/firefox',
        ];
      } else if (plat === 'win32') {
        return [
          'C:\\Program Files\\Firefox Developer Edition\\firefox.exe',
          'C:\\Program Files (x86)\\Firefox Developer Edition\\firefox.exe',
        ];
      }
      break;

    case 'nightly':
      if (plat === 'darwin') {
        return ['/Applications/Firefox Nightly.app/Contents/MacOS/firefox'];
      } else if (plat === 'win32') {
        return [
          'C:\\Program Files\\Firefox Nightly\\firefox.exe',
          'C:\\Program Files (x86)\\Firefox Nightly\\firefox.exe',
        ];
      }
      break;
  }

  return [];
}

/**
 * Find Firefox executable by path or edition
 */
async function findFirefoxExecutable(configuredPath?: string): Promise<string> {
  let candidates: string[];

  if (configuredPath) {
    // Check if it's an edition name
    if (['stable', 'developer', 'nightly'].includes(configuredPath)) {
      candidates = getExecutableCandidates(configuredPath as FirefoxEdition);
    } else if (await isExecutable(configuredPath)) {
      // Direct path that is executable
      return configuredPath;
    } else if (existsSync(configuredPath)) {
      // Path exists but is not executable
      throw new Error(
        `Firefox executable found at ${configuredPath} but is not executable. ` +
          `Please check file permissions or specify a different path with --firefox-path`
      );
    } else {
      // Path doesn't exist
      throw new Error(
        `Firefox executable not found at ${configuredPath}. ` +
          `Please check the path or use an edition name (stable|developer|nightly) or omit to auto-detect.`
      );
    }
  } else {
    // Auto-detect with priority: developer → stable → nightly
    candidates = getExecutableCandidates();
  }

  // Find first executable candidate
  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      logDebug(`Found Firefox executable: ${candidate}`);
      return candidate;
    }
  }

  // No executable found
  const editionHint = configuredPath
    ? ` for edition "${configuredPath}"`
    : ' (tried developer, stable, nightly)';
  throw new Error(
    `Firefox executable not found${editionHint}. ` +
      `Please install Firefox or specify the path with --firefox-path. ` +
      `You can also specify an edition: --firefox-path stable|developer|nightly`
  );
}

/**
 * Test if TCP port is accepting connections
 */
function testTcpPort(host: string, port: number, timeout = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);

    socket.once('connect', () => {
      clearTimeout(timer);
      cleanup();
      resolve(true);
    });

    socket.once('error', () => {
      clearTimeout(timer);
      cleanup();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

export class FirefoxLauncher {
  private process: ChildProcess | null = null;
  private options: FirefoxLaunchOptions;
  private ephemeralProfilePath: string | null = null;

  constructor(options: FirefoxLaunchOptions) {
    this.options = options;
  }

  async launch(): Promise<void> {
    log('🔍 Detecting Firefox executable...');

    let firefoxPath: string;
    try {
      firefoxPath = await findFirefoxExecutable(this.options.firefoxPath);
      log(`✅ Firefox found at: ${firefoxPath}`);
    } catch (error) {
      logError('Firefox detection failed', error);
      throw error;
    }

    // Ensure we have a profile with required DevTools prefs for RDP on Release builds
    // If user did not pass a profile, create a temporary one and write user.js
    if (!this.options.profilePath) {
      try {
        this.ephemeralProfilePath = await this.createEphemeralProfileWithPrefs();
        this.options.profilePath = this.ephemeralProfilePath;
        logDebug(`Using ephemeral Firefox profile at: ${this.options.profilePath}`);
      } catch (err) {
        logError('Failed to prepare Firefox profile with required prefs', err as Error);
        throw new Error('Could not prepare Firefox profile for RDP');
      }
    }

    const args = this.buildArgs();
    log(`🚀 Launching Firefox with args: ${args.join(' ')}`);
    logDebug(`Full command: ${firefoxPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      log('📦 Spawning Firefox process...');

      this.process = spawn(firefoxPath, args, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (!this.process) {
        logError('Failed to spawn Firefox process!', new Error('spawn returned null'));
        reject(new Error('Failed to spawn Firefox process'));
        return;
      }

      log(`✅ Firefox process spawned (PID: ${this.process.pid})`);
      log('⏳ Waiting for RDP server to start...');

      // Log stdout/stderr for debugging
      this.process.stdout?.on('data', (data) => {
        logDebug(`Firefox stdout: ${data.toString()}`);
      });

      this.process.stderr?.on('data', (data) => {
        logDebug(`Firefox stderr: ${data.toString()}`);
      });

      this.process.on('error', (err) => {
        logError('Firefox process error', err);
        reject(err);
      });

      this.process.on('exit', (code, signal) => {
        log(`Firefox process exited with code ${code}, signal ${signal}`);
        this.process = null;
      });

      // Active readiness check: poll TCP port
      const maxAttempts = 20;
      const pollInterval = 500;
      let attempt = 0;

      const pollPort = async () => {
        attempt++;
        logDebug(`Testing RDP port ${this.options.rdpPort} (attempt ${attempt}/${maxAttempts})...`);

        const isReady = await testTcpPort(this.options.rdpHost, this.options.rdpPort, 300);

        if (isReady) {
          log(`✅ Firefox RDP server ready on port ${this.options.rdpPort}`);
          resolve();
        } else if (attempt >= maxAttempts) {
          const errorMsg =
            `Firefox RDP server not ready after ${maxAttempts * pollInterval}ms. ` +
            `Troubleshooting:\n` +
            `  1. Check if port ${this.options.rdpPort} is already in use: lsof -i :${this.options.rdpPort}\n` +
            `  2. Try different port: --rdp-port <port>\n` +
            `  3. Check Firefox path: --firefox-path <path>`;
          logError('RDP readiness timeout', new Error(errorMsg));
          reject(new Error(errorMsg));
        } else {
          setTimeout(pollPort, pollInterval);
        }
      };

      // Start polling after a brief delay to let Firefox initialize
      setTimeout(pollPort, 500);
    });
  }

  private buildArgs(): string[] {
    const args: string[] = [];

    // Enable RDP server - use single-dash flags for better compatibility
    args.push('-start-debugger-server', String(this.options.rdpPort));

    // Enable WebDriver BiDi Remote Agent (for screenshots)
    args.push('-remote-debugging-port', String(this.options.bidiPort));

    // Headless mode
    if (this.options.headless) {
      args.push('-headless');
    }

    // Disable default browser check
    args.push('-no-remote');
    args.push('-foreground');

    // Set window size if viewport specified
    if (this.options.viewport) {
      args.push(`-width=${this.options.viewport.width}`);
      args.push(`-height=${this.options.viewport.height}`);
    }

    // Profile path - use single-dash flag
    if (this.options.profilePath) {
      args.push('-profile', this.options.profilePath);
    }

    // Additional args
    if (this.options.args && this.options.args.length > 0) {
      args.push(...this.options.args);
    }

    // Open blank page by default
    args.push('about:blank');

    return args;
  }

  private async createEphemeralProfileWithPrefs(): Promise<string> {
    const baseDir = nodePath.join(tmpdir(), 'firefox-devtools-mcp-profile-');
    const profileDir = await fs.mkdtemp(baseDir);
    const userJsPath = nodePath.join(profileDir, 'user.js');

    const lines: string[] = Object.entries(FIREFOX_PREFS).map(([key, value]) => {
      // Strings must be quoted, booleans/numbers can be as-is via JSON.stringify
      const serialized = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
      return `user_pref("${key}", ${serialized});`;
    });

    await fs.writeFile(userJsPath, lines.join('\n') + '\n', 'utf8');
    logDebug(`Wrote user.js with DevTools prefs to: ${userJsPath}`);

    return profileDir;
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  async close(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.process = null;
        resolve();
      });

      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }
}
