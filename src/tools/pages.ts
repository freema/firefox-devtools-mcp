/**
 * Page navigation and management tools
 * Full implementation in task 06
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const listPagesTool = {
  name: 'list_pages',
  description: 'Get a list of pages open in Firefox',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const newPageTool = {
  name: 'new_page',
  description: 'Creates a new page and navigates to URL',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to load in a new page',
      },
    },
    required: ['url'],
  },
};

export const navigatePageTool = {
  name: 'navigate_page',
  description: 'Navigates the currently selected page to a URL',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to navigate the page to',
      },
    },
    required: ['url'],
  },
};

export const selectPageTool = {
  name: 'select_page',
  description: 'Select a page as context for future tool calls',
  inputSchema: {
    type: 'object',
    properties: {
      pageIdx: {
        type: 'number',
        description: 'The index of the page to select. Call list_pages to list pages.',
      },
    },
    required: ['pageIdx'],
  },
};

export const closePageTool = {
  name: 'close_page',
  description: 'Closes the page by its index',
  inputSchema: {
    type: 'object',
    properties: {
      pageIdx: {
        type: 'number',
        description: 'The index of the page to close',
      },
    },
    required: ['pageIdx'],
  },
};

// Handlers
export async function handleListPages(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getContext } = await import('../index.js');
    const context = await getContext();

    const pages = await context.getPages();
    const selectedIdx = context.getSelectedPageIdx();

    // Format output similar to Chrome implementation
    const lines: string[] = ['📄 Open pages:'];

    if (pages.length === 0) {
      lines.push('  (no pages open)');
    } else {
      for (const page of pages) {
        const indicator = page.idx === selectedIdx ? '👉' : '  ';
        const title = page.title || 'Untitled';
        const url = page.url || 'about:blank';
        lines.push(`${indicator} [${page.idx}] ${title}`);
        lines.push(`     ${url}`);
      }
    }

    return successResponse(lines.join('\n'));
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleNewPage(args: unknown): Promise<McpToolResponse> {
  try {
    const { url } = args as { url: string };

    if (!url || typeof url !== 'string') {
      throw new Error('url parameter is required and must be a string');
    }

    const { getContext } = await import('../index.js');
    const context = await getContext();

    // Create new page by navigating a newly created tab
    const newIdx = await context.createNewPage(url);

    return successResponse(`✅ Created new page [${newIdx}] and navigated to: ${url}`);
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleNavigatePage(args: unknown): Promise<McpToolResponse> {
  try {
    const { url } = args as { url: string };

    if (!url || typeof url !== 'string') {
      throw new Error('url parameter is required and must be a string');
    }

    const { getContext } = await import('../index.js');
    const context = await getContext();

    const page = await context.getSelectedPage();
    await context.navigatePage(url);

    return successResponse(
      `✅ Navigated page [${page.idx}] to: ${url}\n` + `   Previous URL: ${page.url}`
    );
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleSelectPage(args: unknown): Promise<McpToolResponse> {
  try {
    const { pageIdx } = args as { pageIdx: number };

    if (typeof pageIdx !== 'number') {
      throw new Error('pageIdx parameter is required and must be a number');
    }

    const { getContext } = await import('../index.js');
    const context = await getContext();

    await context.setSelectedPageIdx(pageIdx);
    const page = await context.getSelectedPage();

    return successResponse(`✅ Selected page [${pageIdx}]: ${page.title}\n   ${page.url}`);
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleClosePage(args: unknown): Promise<McpToolResponse> {
  try {
    const { pageIdx } = args as { pageIdx: number };

    if (typeof pageIdx !== 'number') {
      throw new Error('pageIdx parameter is required and must be a number');
    }

    const { getContext } = await import('../index.js');
    const context = await getContext();

    const pages = await context.getPages();
    const pageToClose = pages.find((p) => p.idx === pageIdx);

    if (!pageToClose) {
      throw new Error(`Page with index ${pageIdx} not found`);
    }

    await context.closePage(pageIdx);

    return successResponse(
      `✅ Closed page [${pageIdx}]: ${pageToClose.title}\n   ${pageToClose.url}`
    );
  } catch (error) {
    return errorResponse(error as Error);
  }
}
