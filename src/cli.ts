/**
 * CLI argument parsing for Firefox DevTools MCP server
 */

import type { Options as YargsOptions } from 'yargs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const cliOptions = {
  rdpHost: {
    type: 'string',
    description: 'Host where Firefox RDP server is running',
    default: process.env.RDP_HOST ?? '127.0.0.1',
  },
  rdpPort: {
    type: 'number',
    description: 'Port where Firefox RDP server is listening',
    default: Number(process.env.RDP_PORT ?? 6000),
  },
  bidiPort: {
    type: 'number',
    description: 'Port for WebDriver BiDi Remote Agent (used for screenshots)',
    default: Number(process.env.BIDI_PORT ?? 9223),
  },
  firefoxPath: {
    type: 'string',
    description: 'Path to Firefox executable (optional, uses system Firefox if not specified)',
    alias: 'f',
  },
  headless: {
    type: 'boolean',
    description: 'Whether to run Firefox in headless (no UI) mode',
    default: (process.env.FIREFOX_HEADLESS ?? 'false') === 'true',
  },
  autoLaunch: {
    type: 'boolean',
    description: 'Automatically launch Firefox with RDP enabled',
    default: (process.env.AUTO_LAUNCH_FIREFOX ?? 'true') === 'true',
  },
  viewport: {
    type: 'string',
    description:
      'Initial viewport size for Firefox instances. For example, `1280x720`. In headless mode, max size is 3840x2160px.',
    coerce: (arg: string | undefined) => {
      if (arg === undefined) {
        return;
      }
      const [width, height] = arg.split('x').map(Number);
      if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
        throw new Error('Invalid viewport. Expected format is `1280x720`.');
      }
      return {
        width,
        height,
      };
    },
  },
  acceptInsecureCerts: {
    type: 'boolean',
    description:
      'If enabled, ignores errors relative to self-signed and expired certificates. Use with caution.',
    default: (process.env.ACCEPT_INSECURE_CERTS ?? 'false') === 'true',
  },
  profilePath: {
    type: 'string',
    description: 'Path to Firefox profile directory (optional, for persistent profile)',
  },
  firefoxArg: {
    type: 'array',
    description:
      'Additional arguments for Firefox. Only applies when Firefox is launched by firefox-devtools-mcp.',
  },
} satisfies Record<string, YargsOptions>;

export function parseArguments(version: string, argv = process.argv) {
  const yargsInstance = yargs(hideBin(argv))
    .scriptName('npx firefox-devtools-mcp@latest')
    .options(cliOptions)
    .example([
      ['$0 --rdp-host 127.0.0.1 --rdp-port 6000', 'Connect to a running Firefox instance'],
      [
        '$0 --firefox-path /Applications/Firefox.app/Contents/MacOS/firefox',
        'Use specific Firefox',
      ],
      ['$0 --headless', 'Run Firefox in headless mode'],
      ['$0 --no-auto-launch', 'Do not automatically launch Firefox'],
      ['$0 --viewport 1280x720', 'Launch Firefox with viewport size of 1280x720px'],
      ['$0 --help', 'Print CLI options'],
    ]);

  return yargsInstance
    .wrap(Math.min(120, yargsInstance.terminalWidth()))
    .help()
    .version(version)
    .parseSync();
}
