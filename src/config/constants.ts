/**
 * Configuration constants for Firefox DevTools MCP server
 */

export const DEFAULT_FIREFOX_PORT = 6000;
export const DEFAULT_HEADLESS = false;

export const SERVER_NAME = 'firefox-devtools';
export const SERVER_VERSION = '0.1.0';

export const FIREFOX_ARGS = ['--start-debugger-server', '--no-remote', '--foreground'];

export const FIREFOX_PREFS = {
  // Remote debugging settings (critical for RDP)
  'devtools.chrome.enabled': true,
  'devtools.debugger.remote-enabled': true,
  'devtools.debugger.prompt-connection': false,

  // Extension settings
  'extensions.autoDisableScopes': 10,
  'xpinstall.signatures.required': false,
  'extensions.sdk.console.logLevel': 'all',

  // Browser behavior
  'browser.shell.checkDefaultBrowser': false,
  'browser.sessionstore.resume_from_crash': false,
  'browser.warnOnQuit': false,

  // Telemetry and updates
  'datareporting.policy.dataSubmissionPolicyBypassNotification': true,
  'browser.startup.homepage_override.mstone': 'ignore',

  // UI
  'browser.uitour.enabled': false,

  // macOS stability (prevent safe mode after kill)
  'toolkit.startup.max_resumed_crashes': -1,
};
