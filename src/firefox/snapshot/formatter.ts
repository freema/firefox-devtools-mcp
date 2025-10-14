/**
 * Snapshot text formatter
 * Formats snapshot tree as LLM-friendly text
 */

import type { SnapshotNode } from './types.js';

/**
 * Max attribute value length
 */
const MAX_ATTR_LENGTH = 50;

/**
 * Format snapshot tree as human-readable text
 */
export function formatSnapshotTree(
  node: SnapshotNode,
  depth = 0
): string {
  const indent = '  '.repeat(depth);
  const attrs: string[] = [];

  // UID (always first)
  attrs.push(`uid=${node.uid}`);

  // Role or tag
  const role = node.role || node.tag;
  attrs.push(role);

  // Name (in quotes)
  if (node.name) {
    attrs.push(`"${truncate(node.name, MAX_ATTR_LENGTH)}"`);
  } else {
    attrs.push('""');
  }

  // Tag (for debugging)
  if (node.role && node.role !== node.tag) {
    attrs.push(`tag=${node.tag}`);
  }

  // Value
  if (node.value) {
    attrs.push(`value="${truncate(node.value, MAX_ATTR_LENGTH)}"`);
  }

  // Href
  if (node.href) {
    attrs.push(`href="${truncate(node.href, MAX_ATTR_LENGTH)}"`);
  }

  // Src
  if (node.src) {
    attrs.push(`src="${truncate(node.src, MAX_ATTR_LENGTH)}"`);
  }

  // Text
  if (node.text) {
    attrs.push(`text="${truncate(node.text, MAX_ATTR_LENGTH)}"`);
  }

  // ARIA attributes
  if (node.aria) {
    // Boolean states
    if (node.aria.disabled) attrs.push('disabled');
    if (node.aria.hidden) attrs.push('hidden');
    if (node.aria.selected) attrs.push('selected');
    if (node.aria.expanded !== undefined) {
      attrs.push(node.aria.expanded ? 'expanded' : 'collapsed');
    }

    // Mixed states
    if (node.aria.checked !== undefined) {
      if (node.aria.checked === 'mixed') {
        attrs.push('checked="mixed"');
      } else {
        attrs.push(node.aria.checked ? 'checked' : 'unchecked');
      }
    }

    if (node.aria.pressed !== undefined) {
      if (node.aria.pressed === 'mixed') {
        attrs.push('pressed="mixed"');
      } else {
        attrs.push(node.aria.pressed ? 'pressed' : 'unpressed');
      }
    }

    // String properties
    if (node.aria.autocomplete) {
      attrs.push(`autocomplete="${node.aria.autocomplete}"`);
    }
    if (node.aria.haspopup) {
      attrs.push(`haspopup="${node.aria.haspopup}"`);
    }
    if (node.aria.invalid) {
      attrs.push(`invalid="${node.aria.invalid}"`);
    }
    if (node.aria.level) {
      attrs.push(`level=${node.aria.level}`);
    }
  }

  // Computed properties
  if (node.computed) {
    if (node.computed.focusable) attrs.push('focusable');
    if (node.computed.interactive) attrs.push('interactive');
    if (!node.computed.visible) attrs.push('invisible');
    if (!node.computed.accessible) attrs.push('inaccessible');
  }

  // Iframe marker
  if (node.isIframe) {
    attrs.push('[iframe');
    if (node.frameSrc) {
      attrs.push(`src="${truncate(node.frameSrc, MAX_ATTR_LENGTH)}"`);
    }
    if (node.crossOrigin) {
      attrs.push('cross-origin');
    }
    attrs.push(']');
  }

  let result = indent + attrs.join(' ') + '\n';

  // Format children
  for (const child of node.children) {
    result += formatSnapshotTree(child, depth + 1);
  }

  return result;
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.substring(0, maxLen - 3) + '...';
}
