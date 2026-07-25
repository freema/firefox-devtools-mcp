/**
 * Tool module primitives.
 *
 * Each tool source file declares its own module with `defineModule`, co-locating
 * the module metadata with the tool definitions and handlers it contains. The
 * registry collects these module objects; it does not repeat the tool list.
 */

import type { McpToolResponse } from '../types/common.js';

export interface ToolDefinition {
  name: string;
  description: string;
  annotations?: { readOnlyHint?: boolean; [key: string]: unknown };
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (input: unknown) => Promise<McpToolResponse>;

export interface ToolEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * A group of related tools that can be enabled or disabled as a unit.
 * `privileged` modules require the moz build and MOZ_REMOTE_ALLOW_SYSTEM_ACCESS
 * at runtime; they are dropped entirely when the server is not allowed to expose
 * privileged tools (see buildToolset).
 */
export interface ToolModule {
  name: string;
  description: string;
  privileged?: boolean;
  tools: ToolEntry[];
}

export interface ModuleConfig {
  name: string;
  description: string;
  privileged?: boolean;
  /** Each entry pairs a tool definition with its handler. */
  tools: Array<[ToolDefinition, ToolHandler]>;
}

export function defineModule(config: ModuleConfig): ToolModule {
  return {
    name: config.name,
    description: config.description,
    ...(config.privileged ? { privileged: true } : {}),
    tools: config.tools.map(([definition, handler]) => ({ definition, handler })),
  };
}
