// Vitest setup file
// This file runs before all tests

import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

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
 * Cleanup function to kill all Firefox and geckodriver processes
 * This ensures no zombie processes are left after test runs
 */
function cleanup() {
  if (isCleaningUp) {
    return; // Prevent recursive cleanup
  }
  isCleaningUp = true;

  try {
    // Kill all Firefox processes started with --marionette flag (test instances)
    execSync('pkill -9 -f "firefox.*marionette" 2>/dev/null || true', {
      stdio: 'ignore',
    });

    // Kill all geckodriver processes
    execSync('pkill -9 -f geckodriver 2>/dev/null || true', {
      stdio: 'ignore',
    });

    // Kill plugin containers (child processes of Firefox)
    execSync('pkill -9 -f "plugin-container" 2>/dev/null || true', {
      stdio: 'ignore',
    });

    console.log('✅ Global cleanup: All test Firefox processes terminated');
  } catch (error) {
    // Ignore errors - processes might already be dead
  } finally {
    isCleaningUp = false;
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
