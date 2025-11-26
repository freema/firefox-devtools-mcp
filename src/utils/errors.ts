/**
 * Custom error classes for Firefox DevTools MCP
 */

/**
 * Error thrown when Firefox browser is not connected or was closed
 * The message is designed to help AI assistants understand what happened
 * and what action to take.
 */
export class FirefoxDisconnectedError extends Error {
  constructor(reason?: string) {
    const baseMessage = 'Firefox browser is not connected';
    const instruction =
      'The Firefox browser window was closed by the user. ' +
      'To continue browser automation, ask the user to restart the firefox-devtools-mcp server ' +
      '(they need to restart Claude Code or the MCP connection). ' +
      'This will launch a new Firefox instance.';

    const fullMessage = reason
      ? `${baseMessage}: ${reason}. ${instruction}`
      : `${baseMessage}. ${instruction}`;

    super(fullMessage);
    this.name = 'FirefoxDisconnectedError';
  }
}

/**
 * Check if an error indicates Firefox disconnection
 */
export function isDisconnectionError(error: unknown): boolean {
  if (error instanceof FirefoxDisconnectedError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Common Selenium/WebDriver disconnection error patterns
    return (
      message.includes('session deleted') ||
      message.includes('session not created') ||
      message.includes('no such window') ||
      message.includes('no such session') ||
      message.includes('target window already closed') ||
      message.includes('unable to connect') ||
      message.includes('connection refused') ||
      message.includes('not connected') ||
      message.includes('driver not connected') ||
      message.includes('invalid session id') ||
      message.includes('browsing context has been discarded')
    );
  }

  return false;
}
