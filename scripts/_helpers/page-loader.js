/**
 * Offline test helpers for loading HTML without external dependencies
 */

/**
 * Load HTML into Firefox using about:blank + innerHTML injection
 * This avoids data: URL parsing issues and works offline
 *
 * @param {FirefoxDevTools} firefox - Firefox client instance
 * @param {string} htmlWithScript - HTML content (can include <script> tags)
 * @returns {Promise<void>}
 */
export async function loadHTML(firefox, htmlWithScript) {
  // Extract all <script> tags and their content
  const scriptMatches = [...htmlWithScript.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const htmlWithoutScript = htmlWithScript.replace(/<script>[\s\S]*?<\/script>/g, '');

  await firefox.navigate('about:blank');
  await waitShort();

  // Set HTML (without script tags)
  await firefox.evaluate(`document.documentElement.innerHTML = \`${htmlWithoutScript}\`;`);

  // Execute all scripts in order
  for (const match of scriptMatches) {
    if (match[1]) {
      await firefox.evaluate(match[1]);
    }
  }

  await waitShort();
}

/**
 * Short deterministic wait (setTimeout for Node.js test context)
 * More reliable than arbitrary long waits
 *
 * @param {number} ms - Milliseconds to wait (default: 300)
 * @returns {Promise<void>}
 */
export async function waitShort(ms = 300) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for browser frame update (uses requestAnimationFrame in browser)
 *
 * @param {FirefoxDevTools} firefox - Firefox client instance
 * @returns {Promise<void>}
 */
export async function waitForFrame(firefox) {
  await firefox.evaluate(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  });
}

/**
 * Wait for element to appear in DOM
 *
 * @param {FirefoxDevTools} firefox - Firefox client instance
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms (default: 5000)
 * @returns {Promise<boolean>} - true if element found, false on timeout
 */
export async function waitForElement(firefox, selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Pass selector as argument instead of template literal to avoid injection
    const exists = await firefox.evaluate(
      (sel) => !!document.querySelector(sel),
      selector
    );
    if (exists) {
      return true;
    }
    await waitShort(100);
  }

  return false;
}

/**
 * Wait for condition to be true
 *
 * @param {FirefoxDevTools} firefox - Firefox client instance
 * @param {string} condition - JavaScript expression to evaluate
 * @param {number} timeout - Max wait time in ms (default: 5000)
 * @returns {Promise<boolean>} - true if condition met, false on timeout
 */
export async function waitForCondition(firefox, condition, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await firefox.evaluate(`return (${condition})`);
    if (result) {
      return true;
    }
    await waitShort(100);
  }

  return false;
}

/**
 * Check if online tests should run
 * @returns {boolean}
 */
export function shouldRunOnlineTests() {
  return process.env.TEST_ONLINE === '1';
}

/**
 * Skip message for online tests
 * @param {string} testName - Name of the test being skipped
 */
export function skipOnlineTest(testName) {
  console.log(`⏭️  Skipping ${testName} (offline mode - set TEST_ONLINE=1 to enable)\n`);
}
