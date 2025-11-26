/**
 * Snapshot tools for DOM structure capture with UID mapping
 */

import { successResponse, errorResponse, TOKEN_LIMITS } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

const DEFAULT_SNAPSHOT_LINES = 100;

// Tool definitions
export const takeSnapshotTool = {
  name: 'take_snapshot',
  description:
    'Capture a textual page snapshot with stable UIDs for elements. Always take a fresh snapshot after navigation or major DOM changes. TIP: Use the UIDs with click_by_uid / fill_by_uid / hover_by_uid. The output may be truncated for readability.',
  inputSchema: {
    type: 'object',
    properties: {
      maxLines: {
        type: 'number',
        description: 'Maximum number of lines to return in output (default: 100)',
      },
      includeAttributes: {
        type: 'boolean',
        description: 'Include detailed ARIA and computed attributes in output (default: false)',
      },
      includeText: {
        type: 'boolean',
        description: 'Include text content in output (default: true)',
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth of tree to include (default: unlimited)',
      },
    },
  },
};

export const resolveUidToSelectorTool = {
  name: 'resolve_uid_to_selector',
  description:
    'Resolve a UID to a CSS selector (debugging aid). Fails on stale UIDs—take a fresh snapshot first.',
  inputSchema: {
    type: 'object',
    properties: {
      uid: {
        type: 'string',
        description: 'The UID from a snapshot to resolve',
      },
    },
    required: ['uid'],
  },
};

export const clearSnapshotTool = {
  name: 'clear_snapshot',
  description:
    'Clear the snapshot/UID cache. Usually not needed, as navigation invalidates snapshots automatically.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

// Handlers
export async function handleTakeSnapshot(args: unknown): Promise<McpToolResponse> {
  try {
    const {
      maxLines: requestedMaxLines = DEFAULT_SNAPSHOT_LINES,
      includeAttributes = false,
      includeText = true,
      maxDepth,
    } = (args as {
      maxLines?: number;
      includeAttributes?: boolean;
      includeText?: boolean;
      maxDepth?: number;
    }) || {};

    // Apply hard cap on maxLines to prevent token overflow
    const maxLines = Math.min(
      Math.max(1, requestedMaxLines),
      TOKEN_LIMITS.MAX_SNAPSHOT_LINES_CAP
    );
    const wasCapped = requestedMaxLines > TOKEN_LIMITS.MAX_SNAPSHOT_LINES_CAP;

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const snapshot = await firefox.takeSnapshot();

    // Import formatter to apply custom options
    const { formatSnapshotTree } = await import('../firefox/snapshot/formatter.js');
    const options: any = {
      includeAttributes,
      includeText,
    };
    if (maxDepth !== undefined) {
      options.maxDepth = maxDepth;
    }
    const formattedText = formatSnapshotTree(snapshot.json.root, 0, options);

    // Get snapshot text (truncated if needed)
    const lines = formattedText.split('\n');

    const truncated = lines.length > maxLines;
    const displayLines = truncated ? lines.slice(0, maxLines) : lines;

    // Build output with guidance
    let output = '📸 Snapshot taken\n\n';

    // Add warning if maxLines was capped
    if (wasCapped) {
      output += `⚠️ maxLines capped at ${TOKEN_LIMITS.MAX_SNAPSHOT_LINES_CAP} (requested: ${requestedMaxLines}) to prevent token overflow\n\n`;
    }

    // Add guidance section
    output += '═══ HOW TO USE THIS SNAPSHOT ═══\n';
    output +=
      '• To interact with elements: use click_by_uid, hover_by_uid, or fill_by_uid with the UID\n';
    output += '• After navigation: always call take_snapshot again (UIDs become stale)\n';
    output += '• On stale UID errors: call take_snapshot → retry your action\n';
    output += '═════════════════════════════════\n\n';

    // Add snapshot metadata
    output += `Snapshot ID: ${snapshot.json.snapshotId}\n`;
    if (snapshot.json.truncated) {
      output += '⚠️  Snapshot content was truncated (too many elements in DOM)\n';
    }
    output += '\n';

    // Add snapshot tree
    output += displayLines.join('\n');

    if (truncated) {
      output += `\n\n... and ${lines.length - maxLines} more lines (use maxLines parameter to see more)`;
    }

    return successResponse(output);
  } catch (error) {
    return errorResponse(
      new Error(
        `Failed to take snapshot: ${(error as Error).message}\n\n` +
          'The page may not be fully loaded or accessible.'
      )
    );
  }
}

export async function handleResolveUidToSelector(args: unknown): Promise<McpToolResponse> {
  try {
    const { uid } = args as { uid: string };

    if (!uid || typeof uid !== 'string') {
      throw new Error('uid parameter is required and must be a string');
    }

    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    try {
      const selector = firefox.resolveUidToSelector(uid);
      return successResponse(`CSS Selector for UID "${uid}":\n\n${selector}`);
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Friendly error for stale UIDs
      if (
        errorMsg.includes('stale') ||
        errorMsg.includes('Snapshot') ||
        errorMsg.includes('UID') ||
        errorMsg.includes('not found')
      ) {
        throw new Error(
          `UID "${uid}" is from an old snapshot or not found.\n\n` +
            'The page structure may have changed since the snapshot was taken.\n' +
            'Please call take_snapshot to get fresh UIDs and try again.'
        );
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function handleClearSnapshot(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    firefox.clearSnapshot();

    return successResponse(
      '🧹 Snapshot cache cleared.\n\n' +
        'For the next UID-dependent action, take a fresh snapshot first.'
    );
  } catch (error) {
    return errorResponse(error as Error);
  }
}
