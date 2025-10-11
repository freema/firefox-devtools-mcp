/**
 * Common types shared across the Firefox DevTools MCP server
 */

export interface McpToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export interface FirefoxConfig {
  firefoxPath?: string;
  debugPort?: number;
  headless?: boolean;
  profilePath?: string;
}

export interface PageInfo {
  id: string;
  title: string;
  url: string;
  type: string;
}
