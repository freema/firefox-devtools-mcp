/**
 * Simple logger for Firefox DevTools MCP server
 */

export function log(message: string, ...args: unknown[]): void {
  console.error(`[firefox-devtools-mcp] ${message}`, ...args);
}

export function logError(message: string, error?: unknown): void {
  if (error instanceof Error) {
    console.error(`[firefox-devtools-mcp] ERROR: ${message}`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(`[firefox-devtools-mcp] ERROR: ${message}`, error);
  }
}

export function logDebug(message: string, ...args: unknown[]): void {
  if (process.env.DEBUG === '*' || process.env.DEBUG?.includes('firefox-devtools')) {
    console.error(`[firefox-devtools-mcp] DEBUG: ${message}`, ...args);
  }
}
