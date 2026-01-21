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
