/**
 * Page navigation and management tools
 * Full implementation in task 06
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const listPagesTool = {
  name: 'list_pages',
  description:
    'Get a list of pages open in Firefox. ' +
    'Shows page index, title, URL, and indicates which page is currently selected.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const refreshPagesTool = {
  name: 'refresh_pages',
  description:
    'Refresh the list of pages and return current state. ' +
    'Call this after opening/closing tabs to update the page list. ' +
    'select_page sets the context for all subsequent tool calls.',
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

/**
 * Format page list with consistent output
 */
function formatPageList(
  tabs: Array<{ title?: string; url?: string }>,
  selectedIdx: number
): string {
  const lines: string[] = [`📄 Open pages (${tabs.length} total, selected: [${selectedIdx}]):`];

  if (tabs.length === 0) {
    lines.push('  (no pages open)');
  } else {
    for (const tab of tabs) {
      const idx = tabs.indexOf(tab);
      const indicator = idx === selectedIdx ? '👉' : '  ';
      const title = tab.title || 'Untitled';
      const url = tab.url || 'about:blank';
      lines.push(`${indicator} [${idx}] ${title}`);
      lines.push(`     ${url}`);
    }
  }

  return lines.join('\n');
}

// Handlers
export async function handleListPages(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    await firefox.refreshTabs();
    const tabs = firefox.getTabs();
    const selectedIdx = firefox.getSelectedTabIdx();

    return successResponse(formatPageList(tabs, selectedIdx));
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleRefreshPages(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    await firefox.refreshTabs();
    const tabs = firefox.getTabs();
    const selectedIdx = firefox.getSelectedTabIdx();

    return successResponse(`🔄 Page list refreshed.\n\n` + formatPageList(tabs, selectedIdx));
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

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const newIdx = await firefox.createNewPage(url);

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

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const tabs = firefox.getTabs();
    const selectedIdx = firefox.getSelectedTabIdx();
    const page = tabs[selectedIdx];

    if (!page) {
      throw new Error('No page selected');
    }

    await firefox.navigate(url);

    return successResponse(
      `✅ Navigated page [${selectedIdx}] to: ${url}\n` + `   Previous URL: ${page.url}`
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

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    await firefox.selectTab(pageIdx);
    const tabs = firefox.getTabs();
    const page = tabs[pageIdx];

    if (!page) {
      throw new Error(`Page at index ${pageIdx} not found`);
    }

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

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const tabs = firefox.getTabs();
    const pageToClose = tabs[pageIdx];

    if (!pageToClose) {
      throw new Error(`Page with index ${pageIdx} not found`);
    }

    await firefox.closeTab(pageIdx);

    return successResponse(
      `✅ Closed page [${pageIdx}]: ${pageToClose.title}\n   ${pageToClose.url}`
    );
  } catch (error) {
    return errorResponse(error as Error);
  }
}
