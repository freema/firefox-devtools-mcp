#!/usr/bin/env node

/**
 * Direct Firefox DevTools API test
 * Tests low-level Firefox RDP functionality
 */

import { FirefoxDevTools } from '../dist/index.js';

async function main() {
  console.log('🔧 Testing Firefox DevTools API directly (pure RDP)...\n');

  const options = {
    firefoxPath: undefined,
    headless: false,
    rdpHost: '127.0.0.1',
    rdpPort: 6000,
    profilePath: undefined,
    viewport: { width: 1280, height: 720 },
    args: [],
    startUrl: 'https://example.com', // Start with content instead of about:blank
  };

  const firefox = new FirefoxDevTools(options);

  try {
    // 1. Connect
    console.log('📡 Connecting to Firefox...');
    await firefox.connect();
    console.log('✅ Connected!\n');

    // 2. Select first tab (should have content from startUrl)
    console.log('📌 Selecting tab [0]...');
    await firefox.selectTab(0);
    console.log('✅ Tab selected\n');

    // 6. Wait for page load
    console.log('⏳ Waiting 3 seconds for page to load...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 7. Refresh tabs to see updated info
    console.log('🔄 Refreshing tabs...');
    await firefox.refreshTabs();
    const finalTabs = firefox.getTabs();
    console.log('Updated tabs:');
    // Recompute active tab index after navigation
    let activeIdx = 0;
    finalTabs.forEach((tab, idx) => {
      if (tab.url && tab.url !== 'about:blank') activeIdx = idx;
    });
    finalTabs.forEach((tab, idx) => {
      const marker = idx === activeIdx ? '👉' : '  ';
      console.log(`${marker} [${idx}] ${tab.title} - ${tab.url}`);
    });
    console.log();

    // 4. Evaluate JavaScript
    console.log('⚡ Evaluating JavaScript: document.title');
    const title = await firefox.evaluate('document.title');
    console.log(`✅ Page title: ${title}\n`);

    // 5. Get page content
    console.log('📖 Getting page content...');
    const content = await firefox.getContent();
    console.log(`✅ Content length: ${content.length} characters`);
    console.log(`First 100 chars: ${content.substring(0, 100)}...\n`);

    // 6. Navigate to another URL and re-check
    const url2 = 'https://www.mozilla.org';
    console.log(`🧭 Navigating to: ${url2}`);
    await firefox.navigate(url2);
    console.log('✅ Navigation initiated');
    console.log('⏳ Waiting 3 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const title2 = await firefox.evaluate('document.title');
    console.log(`✅ New page title: ${title2}\n`);

    // 7. Get console messages
    console.log('📝 Getting console messages...');
    const messages = await firefox.getConsoleMessages();
    console.log(`✅ Found ${messages.length} console message(s)`);
    messages.slice(0, 3).forEach((msg) => {
      console.log(`  [${msg.level}] ${msg.text.substring(0, 80)}`);
    });
    console.log();

    console.log('✅ All Firefox API tests passed! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    console.log('🧹 Closing connection...');
    await firefox.close();
    console.log('✅ Done');
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
