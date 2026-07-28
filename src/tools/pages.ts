/**
 * Page navigation and management tools for MCP
 */

import {
  successResponse,
  errorResponse,
  previewExcerpt,
  truncationFooter,
} from '../utils/response-helpers.js';
import { saveOutput } from '../utils/save-output.js';
import { defineModule } from './module.js';
import type { McpToolResponse } from '../types/common.js';

const DEFAULT_MAX_CONTENT_CHARS = 20_000;

// Tool definitions
export const listPagesTool = {
  name: 'list_pages',
  description: 'List open tabs (index, title, URL). Selected tab is marked.',
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const newPageTool = {
  name: 'new_page',
  description: 'Open new tab at URL. Returns tab index.',
  annotations: {
    readOnlyHint: false,
  },
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
  annotations: {
    readOnlyHint: false,
  },
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
  annotations: {
    readOnlyHint: false,
  },
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
  annotations: {
    readOnlyHint: false,
  },
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

export const getPageTextTool = {
  name: 'get_page_text',
  description:
    'Get the visible text of the page (document.body.innerText). Caps at maxLength (default 20000 chars); saveTo saves the full text to a file.',
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      maxLength: {
        type: 'number',
        description:
          'Max characters to return inline (default: 20000). Ignored when saveTo is used.',
      },
      saveTo: {
        type: ['boolean', 'string'],
        description:
          'Save the full untruncated text to a file instead of returning it inline. Pass a file path, an existing directory (generated file inside), or true (generated file under ~/.firefox-devtools-mcp/output/). Relative paths resolve against the current working directory.',
      },
      preview: {
        type: 'number',
        description:
          'Number of characters of the saved text to return inline as a preview when saveTo is used. Omit for no preview.',
      },
    },
  },
};

/**
 * Format page list compactly
 */
function formatPageList(
  tabs: Array<{ title?: string; url?: string }>,
  selectedIdx: number
): string {
  if (tabs.length === 0) {
    return 'No pages';
  }
  const lines: string[] = [`${tabs.length} pages (selected: ${selectedIdx})`];
  for (const tab of tabs) {
    const idx = tabs.indexOf(tab);
    const marker = idx === selectedIdx ? '>' : ' ';
    const title = (tab.title || 'Untitled').substring(0, 40);
    const url = (tab.url || 'URL unavailable').substring(0, 200);
    lines.push(`${marker}[${idx}] ${title} (${url})`);
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

    return successResponse(`new page [${newIdx}] → ${url}`);
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

    return successResponse(`[${selectedIdx}] → ${url}`);
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

    // Priority 1: Select by index
    if (typeof pageIdx === 'number') {
      selectedIdx = pageIdx;
    }
    // Priority 2: Select by URL pattern
    else if (url && typeof url === 'string') {
      const urlLower = url.toLowerCase();
      const foundIdx = tabs.findIndex((tab) => tab.url?.toLowerCase().includes(urlLower));
      if (foundIdx === -1) {
        throw new Error(`No page matching URL "${url}"`);
      }
      selectedIdx = foundIdx;
    }
    // Priority 3: Select by title pattern
    else if (title && typeof title === 'string') {
      const titleLower = title.toLowerCase();
      const foundIdx = tabs.findIndex((tab) => tab.title?.toLowerCase().includes(titleLower));
      if (foundIdx === -1) {
        throw new Error(`No page matching title "${title}"`);
      }
      selectedIdx = foundIdx;
    } else {
      throw new Error('Provide pageIdx, url, or title');
    }

    // Validate the selected index
    if (!tabs[selectedIdx]) {
      throw new Error(`Page [${selectedIdx}] not found`);
    }

    // Select the tab
    await firefox.selectTab(selectedIdx);

    return successResponse(`selected [${selectedIdx}]`);
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

    return successResponse(`closed [${pageIdx}]`);
  } catch (error) {
    return errorResponse(error as Error);
  }
}

async function respondWithContent(
  content: string,
  args: unknown,
  baseName: string,
  extension: string
): Promise<McpToolResponse> {
  const {
    maxLength = DEFAULT_MAX_CONTENT_CHARS,
    saveTo,
    preview,
  } = (args as { maxLength?: number; saveTo?: boolean | string; preview?: number }) || {};

  if (saveTo) {
    const saved = await saveOutput(
      content,
      saveTo === true ? undefined : saveTo,
      baseName,
      extension
    );
    let output = `${baseName} saved to: ${saved.path} (${(saved.bytes / 1024).toFixed(1)}KB)`;
    const excerpt = previewExcerpt(content, preview);
    if (excerpt) {
      output += '\nPreview:\n' + excerpt;
    }
    return successResponse(output);
  }

  // Always end with a status marker so the model can tell "this is everything"
  // from "this was cut" instead of inferring completeness from a missing footer.
  if (content.length <= maxLength) {
    return successResponse(content + `\n\n[full content, ${content.length} chars]`);
  }

  const footer = truncationFooter(content.length - maxLength, 'chars', [
    'maxLength to show more',
    'saveTo to save the full content to a file',
  ]);
  return successResponse(content.slice(0, maxLength) + '\n\n' + footer);
}

export async function handleGetPageText(args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const text = (await firefox.evaluate(
      'document.body ? document.body.innerText : document.documentElement.innerText'
    )) as string | null | undefined;

    return respondWithContent(text ?? '', args, 'page-text', 'txt');
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export const module = defineModule({
  name: 'pages',
  description: 'Open, navigate, select, and close pages.',
  tools: [
    [listPagesTool, handleListPages],
    [newPageTool, handleNewPage],
    [navigatePageTool, handleNavigatePage],
    [selectPageTool, handleSelectPage],
    [closePageTool, handleClosePage],
    [getPageTextTool, handleGetPageText],
  ],
});
