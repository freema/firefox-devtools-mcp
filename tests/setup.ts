// Vitest setup file
// This file runs before all tests

import { beforeAll, afterAll } from 'vitest';
import { execSync, execFileSync } from 'child_process';

const isWindows = process.platform === 'win32';

// Track if we're in cleanup mode
let isCleaningUp = false;

beforeAll(() => {
  // Setup code runs before all tests
});

afterAll(() => {
  // Global cleanup: kill any remaining Firefox/geckodriver processes
  cleanup();
});

/**
 * Cleanup function to kill leftover test Firefox and geckodriver processes
 * This ensures no zombie processes are left after test runs
 */
function cleanup() {
  if (isCleaningUp) {
    return; // Prevent recursive cleanup
  }
  isCleaningUp = true;

  try {
    if (isWindows) {
      cleanupWindows();
    } else {
      cleanupUnix();
    }
  } catch {
    // Ignore errors - processes might already be dead
  } finally {
    isCleaningUp = false;
  }
}

function cleanupUnix() {
  try {
    // Find Firefox processes started with --marionette (test instances)
    const firefoxPids = execSync('pgrep -f "firefox.*marionette" || true', {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    // Kill children of each Firefox test process, then kill the parent
    for (const pid of firefoxPids) {
      try {
        execSync(`pkill -9 -P ${pid} 2>/dev/null || true`, { stdio: 'ignore' });
      } catch {
        // Ignore errors - child processes might already be dead
      }
      try {
        execSync(`kill -9 ${pid} 2>/dev/null || true`, { stdio: 'ignore' });
      } catch {
        // Ignore errors - process might already be dead
      }
    }

    // Kill all geckodriver processes
    execSync('pkill -9 -f geckodriver || true', {
      stdio: 'ignore',
    });

    console.log('✅ Global cleanup: All test Firefox processes terminated');
  } catch {
    // Ignore errors - processes might already be dead
  }
}

// Only matches Firefox instances whose command line carries --marionette,
// so regular user-launched Firefox windows are never touched.
function findWindowsProcessIds(imageName: string, commandLinePattern?: string): number[] {
  const filter = commandLinePattern
    ? `Name='${imageName}' AND CommandLine LIKE '%${commandLinePattern}%'`
    : `Name='${imageName}'`;
  const script =
    `Get-CimInstance Win32_Process -Filter "${filter}" | ` +
    'Select-Object -ExpandProperty ProcessId';
  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line))
    .map(Number);
}

function cleanupWindows() {
  try {
    const firefoxPids = findWindowsProcessIds('firefox.exe', '--marionette');
    for (const pid of firefoxPids) {
      try {
        // /T kills the whole process tree, replacing the Unix child-kill step
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // Ignore errors - process might already be dead
      }
    }

    for (const pid of findWindowsProcessIds('geckodriver.exe')) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // Ignore errors - process might already be dead
      }
    }

    if (firefoxPids.length > 0) {
      console.log('✅ Global cleanup: All test Firefox processes terminated');
    }
  } catch {
    // Ignore errors - processes might already be dead
  }
}

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, cleaning up Firefox processes...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, cleaning up Firefox processes...');
  cleanup();
  process.exit(0);
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  cleanup();
  process.exit(1);
});
