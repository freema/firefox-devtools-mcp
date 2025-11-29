/**
 * Page navigation and management tools for MCP
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

// Tool definitions
export const listPagesTool = {
  name: 'list_pages',
  description: 'List open tabs (index, title, URL). Selected tab is marked.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const newPageTool = {
  name: 'new_page',
  description: 'Open new tab at URL. Returns tab index.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Target URL',
      },
    },
    required: ['url'],
  },
};

export const navigatePageTool = {
  name: 'navigate_page',
  description: 'Navigate selected tab to URL.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Target URL',
      },
    },
    required: ['url'],
  },
};

export const selectPageTool = {
  name: 'select_page',
  description: 'Select active tab by index, URL, or title. Index takes precedence.',
  inputSchema: {
    type: 'object',
    properties: {
      pageIdx: {
        type: 'number',
        description: 'Tab index (0-based, most reliable)',
      },
      url: {
        type: 'string',
        description: 'URL substring (case-insensitive)',
      },
      title: {
        type: 'string',
        description: 'Title substring (case-insensitive)',
      },
    },
    required: [],
  },
};

export const closePageTool = {
  name: 'close_page',
  description: 'Close tab by index.',
  inputSchema: {
    type: 'object',
    properties: {
      pageIdx: {
        type: 'number',
        description: 'Tab index to close',
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

export async function handleNewPage(args: unknown): Promise<McpToolResponse> {
  try {
    const { url } = args as { url: string };

    if (!url || typeof url !== 'string') {
      throw new Error('url parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const newIdx = await firefox.createNewPage(url);

    // Refresh tabs to update the list
    await firefox.refreshTabs();
    const tabs = firefox.getTabs();
    const newTab = tabs[newIdx];

    return successResponse(
      `✅ Created new page [${newIdx}] and navigated to: ${url}\n` +
        `   Title: ${newTab?.title || 'Loading...'}\n` +
        `   Total pages: ${tabs.length}`
    );
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

    // Refresh tabs to get latest list
    await firefox.refreshTabs();
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
    const { pageIdx, url, title } = args as { pageIdx?: number; url?: string; title?: string };

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    // Refresh tabs to get latest list
    await firefox.refreshTabs();
    const tabs = firefox.getTabs();

    let selectedIdx: number;
    let selectionMethod: string;

    // Priority 1: Select by index
    if (typeof pageIdx === 'number') {
      selectedIdx = pageIdx;
      selectionMethod = 'by index';
    }
    // Priority 2: Select by URL pattern
    else if (url && typeof url === 'string') {
      const urlLower = url.toLowerCase();
      const foundIdx = tabs.findIndex((tab) => tab.url?.toLowerCase().includes(urlLower));

      if (foundIdx === -1) {
        throw new Error(
          `No page found with URL matching "${url}". Use list_pages to see all available pages.`
        );
      }
      selectedIdx = foundIdx;
      selectionMethod = `by URL pattern "${url}"`;
    }
    // Priority 3: Select by title pattern
    else if (title && typeof title === 'string') {
      const titleLower = title.toLowerCase();
      const foundIdx = tabs.findIndex((tab) => tab.title?.toLowerCase().includes(titleLower));

      if (foundIdx === -1) {
        throw new Error(
          `No page found with title matching "${title}". Use list_pages to see all available pages.`
        );
      }
      selectedIdx = foundIdx;
      selectionMethod = `by title pattern "${title}"`;
    } else {
      throw new Error(
        'At least one of pageIdx, url, or title must be provided. Use list_pages to see available pages.'
      );
    }

    // Validate the selected index
    const page = tabs[selectedIdx];
    if (!page) {
      throw new Error(
        `Page at index ${selectedIdx} not found. Use list_pages to see valid indices.`
      );
    }

    // Select the tab
    await firefox.selectTab(selectedIdx);

    return successResponse(
      `✅ Selected page [${selectedIdx}] ${selectionMethod}\n` +
        `   Title: ${page.title || 'Untitled'}\n` +
        `   URL: ${page.url || 'about:blank'}`
    );
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

    // Refresh tabs to get latest list
    await firefox.refreshTabs();
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
