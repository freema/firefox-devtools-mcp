/**
 * Snapshot tools for DOM structure capture with UID mapping
 */

import { successResponse, errorResponse } from '../utils/response-helpers.js';
import type { McpToolResponse } from '../types/common.js';

const MAX_SNAPSHOT_LINES = 100;

// Tool definitions
export const takeSnapshotTool = {
  name: 'take_snapshot',
  description:
    'Take a textual snapshot of the current page including unique UIDs for elements. ' +
    'Always work with the latest snapshot. The snapshot is truncated for readability; use UIDs for further work.\n\n' +
    'IMPORTANT: Use only when the page changes or when UIDs become stale. ' +
    "Don't assume old UIDs are valid after navigation. " +
    'After navigation, always take a fresh snapshot before using UID-based tools.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const resolveUidToSelectorTool = {
  name: 'resolve_uid_to_selector',
  description:
    'Convert a UID to a CSS selector (for debugging/inspection). ' +
    'Not needed for regular UID-based actions - use UIDs directly.\n\n' +
    'WARNING: Throws error for stale UIDs. If this fails, call take_snapshot first to get fresh UIDs.',
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
    'Clear the UID/snapshot cache. ' +
    'After the next UID-dependent action, take a new snapshot. ' +
    'Note: Navigation automatically invalidates snapshots, so this is rarely needed.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

// Handlers
export async function handleTakeSnapshot(_args: unknown): Promise<McpToolResponse> {
  try {
    const { getFirefox } = await import('../index.js');
    const firefox = await getFirefox();

    const snapshot = await firefox.takeSnapshot();

    // Get snapshot text (truncated if needed)
    const lines = snapshot.text.split('\n');
    const truncated = lines.length > MAX_SNAPSHOT_LINES;
    const displayLines = truncated ? lines.slice(0, MAX_SNAPSHOT_LINES) : lines;

    let output = `📸 Snapshot taken (ID: ${snapshot.json.snapshotId})\n`;
    if (snapshot.json.truncated) {
      output += '⚠️  Snapshot was truncated (too many elements)\n';
    }
    output += '\n';
    output += displayLines.join('\n');

    if (truncated) {
      output += `\n\n... and ${lines.length - MAX_SNAPSHOT_LINES} more lines (truncated for readability)`;
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
