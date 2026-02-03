/**
 * Element collection and relevance filtering (runs in browser context)
 */

/**
 * Interactive element tags
 */
const INTERACTIVE_TAGS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'img',
  'video',
  'audio',
  'iframe',
];

/**
 * Semantic container tags
 */
const SEMANTIC_TAGS = ['nav', 'main', 'section', 'article', 'header', 'footer', 'form'];

/**
 * Common container tags (need additional checks)
 */
const CONTAINER_TAGS = ['div', 'span', 'p', 'li', 'ul', 'ol'];

/**
 * Max direct text content length for containers
 */
const MAX_DIRECT_TEXT_CONTENT = 500;

/**
 * Get direct text content of an element (text nodes that are direct children only)
 * This excludes text from nested elements, solving the issue where
 * el.textContent returns ALL descendant text making wrapper divs seem to have huge content
 */
function getDirectTextContent(el: Element): string {
  let text = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node && node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    }
  }
  return text.trim();
}

/**
 * Check if element has any relevant interactive descendants
 * Used to include container elements that wrap interactive content
 */
function hasInteractiveDescendant(el: Element): boolean {
  // Check immediate children only (one level) to avoid performance issues
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (!child) continue;
    const tag = child.tagName.toLowerCase();
    if (INTERACTIVE_TAGS.indexOf(tag) !== -1) {
      return true;
    }
    if (child.hasAttribute('role')) {
      return true;
    }
  }
  return false;
}

/**
 * Check if element is relevant for snapshot
 * Filters out hidden/irrelevant elements
 *
 * Note: Even if this returns false, the tree walker will still
 * traverse children to find nested relevant elements.
 */
export function isRelevant(el: Element): boolean {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  // Check visibility
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
  } catch (e) {
    return false;
  }

  const tag = el.tagName.toLowerCase();

  // Always include interactive elements
  if (INTERACTIVE_TAGS.indexOf(tag) !== -1) {
    return true;
  }

  // Include elements with role
  if (el.hasAttribute('role')) {
    return true;
  }

  // Include elements with aria-label
  if (el.hasAttribute('aria-label')) {
    return true;
  }

  // Include headings
  if (/^h[1-6]$/.test(tag)) {
    return true;
  }

  // Include semantic elements
  if (SEMANTIC_TAGS.indexOf(tag) !== -1) {
    return true;
  }

  // Common containers - need additional checks
  if (CONTAINER_TAGS.indexOf(tag) !== -1) {
    // Has direct meaningful text? (not descendant text)
    const directText = getDirectTextContent(el);
    if (directText.length > 0 && directText.length < MAX_DIRECT_TEXT_CONTENT) {
      return true;
    }
    // Has id or class?
    if (el.id || el.className) {
      return true;
    }
    // Has immediate interactive children?
    if (hasInteractiveDescendant(el)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if element is focusable
 */
export function isFocusable(el: Element): boolean {
  const htmlEl = el as HTMLElement;

  // Has tabindex >= 0
  if (htmlEl.tabIndex >= 0) {
    return true;
  }

  // Naturally focusable elements
  const tag = el.tagName.toLowerCase();
  if (['a', 'button', 'input', 'select', 'textarea'].indexOf(tag) !== -1) {
    return true;
  }

  return false;
}

/**
 * Check if element is interactive
 */
export function isInteractive(el: Element): boolean {
  const tag = el.tagName.toLowerCase();

  // Interactive tags
  if (INTERACTIVE_TAGS.indexOf(tag) !== -1) {
    return true;
  }

  // Has click handler role
  const role = el.getAttribute('role');
  if (role && ['button', 'link', 'menuitem', 'tab'].indexOf(role) !== -1) {
    return true;
  }

  // Has onclick or similar
  if (el.hasAttribute('onclick')) {
    return true;
  }

  return false;
}
