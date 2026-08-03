/**
 * Selector generation utilities (runs in browser context)
 */

/**
 * Preferred ID attributes in order of priority
 */
const PREFERRED_ID_ATTRS = ['id', 'data-testid', 'data-test-id'];

/**
 * Max segment length for selectors
 */
const MAX_SEGMENT_LENGTH = 64;

/**
 * Generate CSS selector for element
 * Prefers stable identifiers: id, data-testid, then falls back to nth-of-type
 */
export function generateCssSelector(el: Element): string {
  const path: string[] = [];
  let current: Element | null = el;

  while (current?.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();

    // Check for preferred ID attributes
    let hasId = false;
    for (const idAttr of PREFERRED_ID_ATTRS) {
      const value = current.getAttribute(idAttr);
      if (value) {
        if (idAttr === 'id') {
          selector += '#' + CSS.escape(value);
        } else {
          selector += `[${idAttr}="${escapeCssAttributeValue(value)}"]`;
        }
        path.unshift(selector);
        hasId = true;
        break;
      }
    }

    if (hasId) {
      break; // ID is unique, stop here
    }

    // Check for aria-label + role combination (often stable)
    const ariaLabel = current.getAttribute('aria-label');
    const role = current.getAttribute('role');
    if (ariaLabel && role) {
      selector += `[role="${role}"][aria-label="${escapeCssAttributeValue(ariaLabel)}"]`;
      path.unshift(selector);
      // Continue to parent for context
      current = current.parentElement;
      continue;
    }

    // Fall back to nth-of-type
    const siblings = current.parentElement?.children;
    if (siblings && siblings.length > 1) {
      let nth = 1;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (!sibling) {
          continue;
        }
        if (sibling === current) {
          break;
        }
        if (sibling.nodeName === current.nodeName) {
          nth++;
        }
      }
      if (nth > 1 || (siblings.length > 1 && siblings[0] !== current)) {
        selector += `:nth-of-type(${nth})`;
      }
    }

    path.unshift(truncateSegment(selector));
    current = current.parentElement;

    // Stop at body
    if (current?.nodeName.toLowerCase() === 'body') {
      path.unshift('body');
      break;
    }
  }

  return path.join(' > ');
}

/**
 * Escape CSS attribute value
 */
function escapeCssAttributeValue(value: string): string {
  return value.replace(/"/g, '\\' + '"').substring(0, MAX_SEGMENT_LENGTH);
}

/**
 * Truncate selector segment
 */
function truncateSegment(segment: string): string {
  if (segment.length <= MAX_SEGMENT_LENGTH) {
    return segment;
  }
  return segment.substring(0, MAX_SEGMENT_LENGTH);
}
