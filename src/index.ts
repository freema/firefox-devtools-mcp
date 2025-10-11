#!/usr/bin/env node

/**
 * Firefox DevTools MCP Server
 * Model Context Protocol server for Firefox browser automation via Remote Debugging Protocol
 */

// Load .env file in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config } = await import('dotenv');
    const result = config();
    if (result.parsed) {
      console.error('📋 Loaded .env file for development');
    }
  } catch (error) {
    // dotenv not required in production
  }
}

import { version } from 'node:process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_NAME, SERVER_VERSION } from './config/constants.js';
import { log, logError, logDebug } from './utils/logger.js';
import { parseArguments } from './cli.js';
import { McpContext } from './McpContext.js';
import type { FirefoxLaunchOptions } from './firefox/types.js';
import * as tools from './tools/index.js';

// Export McpContext for direct usage in scripts
export { McpContext };

// Validate Node.js version
const [major] = version.substring(1).split('.').map(Number);
if (!major || major < 18) {
  console.error(`Node ${version} is not supported. Please use Node.js >=18.`);
  process.exit(1);
}

// Parse CLI arguments
export const args = parseArguments(SERVER_VERSION);

// Global context (lazy initialized on first tool call)
let context: McpContext | null = null;

export async function getContext(): Promise<McpContext> {
  if (!context) {
    log('Initializing Firefox DevTools connection...');

    const options: FirefoxLaunchOptions = {
      firefoxPath: args.firefoxPath ?? undefined,
      headless: args.headless,
      rdpHost: args.rdpHost,
      rdpPort: args.rdpPort,
      bidiPort: args.bidiPort,
      profilePath: args.profilePath ?? undefined,
      viewport: args.viewport ?? undefined,
      args: (args.firefoxArg as string[] | undefined) ?? undefined,
    };

    context = await McpContext.create(options);
    log('Firefox DevTools connection established');
  }

  return context;
}

// Tool handler mapping
const toolHandlers = new Map<
  string,
  (input: unknown) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
>([
  // Page management (task 06)
  ['list_pages', tools.handleListPages],
  ['new_page', tools.handleNewPage],
  ['navigate_page', tools.handleNavigatePage],
  ['select_page', tools.handleSelectPage],
  ['close_page', tools.handleClosePage],

  // Screenshot and snapshot (task 07)
  ['take_screenshot', tools.handleTakeScreenshot],
  ['take_snapshot', tools.handleTakeSnapshot],

  // Script evaluation (task 08)
  ['evaluate_script', tools.handleEvaluateScript],

  // Console (task 08)
  ['list_console_messages', tools.handleListConsoleMessages],

  // Network (task 09)
  ['list_network_requests', tools.handleListNetworkRequests],
  ['get_network_request', tools.handleGetNetworkRequest],
  ['start_network_monitoring', tools.handleStartNetworkMonitoring],
  ['stop_network_monitoring', tools.handleStopNetworkMonitoring],

  // Performance (task 09)
  ['performance_get_metrics', tools.handlePerformanceGetMetrics],
  ['performance_start_trace', tools.handlePerformanceStartTrace],
  ['performance_stop_trace', tools.handlePerformanceStopTrace],
]);

// All tool definitions
const allTools = [
  // Navigation tools
  tools.listPagesTool,
  tools.newPageTool,
  tools.navigatePageTool,
  tools.selectPageTool,
  tools.closePageTool,

  // Screenshot tools
  tools.takeScreenshotTool,
  tools.takeSnapshotTool,

  // Script tools
  tools.evaluateScriptTool,

  // Console tools
  tools.listConsoleMessagesTool,

  // Network tools
  tools.listNetworkRequestsTool,
  tools.getNetworkRequestTool,
  tools.startNetworkMonitoringTool,
  tools.stopNetworkMonitoringTool,

  // Performance tools
  tools.performanceGetMetricsTool,
  tools.performanceStartTraceTool,
  tools.performanceStopTraceTool,
];

async function main() {
  log(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);
  log(`Node.js ${version}`);

  // Log configuration
  logDebug(`Configuration:`);
  logDebug(`  RDP Host: ${args.rdpHost}`);
  logDebug(`  RDP Port: ${args.rdpPort}`);
  logDebug(`  BiDi Port: ${args.bidiPort}`);
  logDebug(`  Auto Launch: ${args.autoLaunch}`);
  logDebug(`  Headless: ${args.headless}`);
  if (args.firefoxPath) {
    logDebug(`  Firefox Path: ${args.firefoxPath}`);
  }
  if (args.viewport) {
    logDebug(`  Viewport: ${args.viewport.width}x${args.viewport.height}`);
  }

  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log('Listing available tools');
    return {
      tools: allTools,
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    log(`Executing tool: ${name}`);

    const handler = toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await handler(args);
    } catch (error) {
      logError(`Error executing tool ${name}`, error);
      throw error;
    }
  });

  // List resources (not implemented for this server)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });

  // Read resource (not implemented for this server)
  server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error('Resource reading not implemented');
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('Firefox DevTools MCP server running on stdio');
  log('Ready to accept tool requests');
}

// Only run main() if this file is executed directly (not imported)
// In ES modules, check if import.meta.url matches the executed file
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logError('Fatal error in main', error);
    process.exit(1);
  });
}
