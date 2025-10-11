#!/usr/bin/env node

/**
 * Direct test script for Firefox DevTools MCP tools
 * Tests core functionality without MCP protocol overhead
 */

import { McpContext } from '../dist/index.js';

async function main() {
  console.log('🔧 Starting Firefox DevTools MCP Tool Test...\n');
  console.log('🚀 AUTO-LAUNCH enabled - Firefox will start automatically if needed\n');

  // Configuration with AUTO-LAUNCH enabled
  const options = {
    firefoxPath: undefined, // Auto-detect
    headless: false, // Visible browser for debugging
    rdpHost: '127.0.0.1', // Use explicit IPv4 to avoid IPv6 issues
    rdpPort: 6000,
    bidiPort: 9222,
    profilePath: undefined,
    viewport: { width: 1280, height: 720 },
    args: [],
  };

  let context = null;

  try {
    // 1. Create context and connect to Firefox
    console.log('📡 Connecting to Firefox...');
    context = await McpContext.create(options);
    console.log('✅ Connected to Firefox!\n');

    // 2. List current pages
    console.log('📄 Listing current pages:');
    const pages = await context.getPages();
    console.log(`Found ${pages.length} page(s)`);
    pages.forEach((page) => {
      console.log(`  [${page.idx}] ${page.title} - ${page.url}`);
    });
    console.log();

    // 3. Create new page and navigate
    console.log('🆕 Creating new page with URL: https://example.com');
    const newPageIdx = await context.createNewPage('https://example.com');
    console.log(`✅ Created new page at index: ${newPageIdx}\n`);

    // Wait a bit for page to load
    console.log('⏳ Waiting 2 seconds for page to load...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Get page content
    console.log('📖 Getting page content...');
    const content = await context.getPageContent();
    console.log(`✅ Page content length: ${content.length} chars`);
    console.log(`First 200 chars: ${content.substring(0, 200)}...\n`);

    // 5. Evaluate JavaScript
    console.log('⚡ Evaluating JavaScript: document.title');
    const title = await context.evaluateScript('document.title');
    console.log(`✅ Page title: ${title}\n`);

    // 6. Navigate to different URL
    console.log('🧭 Navigating to: https://www.mozilla.org');
    await context.navigatePage('https://www.mozilla.org');
    console.log('✅ Navigation initiated\n');

    // Wait for navigation
    console.log('⏳ Waiting 3 seconds for navigation...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 7. Get new page title
    console.log('⚡ Getting new page title...');
    const newTitle = await context.evaluateScript('document.title');
    console.log(`✅ New page title: ${newTitle}\n`);

    // 8. List console messages
    console.log('📝 Getting console messages...');
    const consoleMessages = await context.getConsoleMessages();
    console.log(`✅ Found ${consoleMessages.length} console message(s)`);
    consoleMessages.slice(0, 5).forEach((msg) => {
      console.log(`  [${msg.level}] ${msg.text}`);
    });
    console.log();

    // 9. Take screenshot
    console.log('📸 Taking screenshot...');
    const screenshot = await context.takeScreenshot({ format: 'png' });
    console.log(`✅ Screenshot captured: ${screenshot.length} bytes\n`);

    // 10. Save screenshot to file
    const screenshotPath = './test-screenshot.png';
    console.log(`💾 Saving screenshot to: ${screenshotPath}`);
    await context.saveFile(screenshot, screenshotPath);
    console.log(`✅ Screenshot saved!\n`);

    // 11. List pages again
    console.log('📄 Final page list:');
    const finalPages = await context.getPages();
    finalPages.forEach((page) => {
      const marker = page.selected ? '👉' : '  ';
      console.log(`${marker} [${page.idx}] ${page.title} - ${page.url}`);
    });
    console.log();

    console.log('✅ All tests passed successfully! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (context) {
      console.log('🧹 Cleaning up...');
      await context.close();
      console.log('✅ Context closed');
    }
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
