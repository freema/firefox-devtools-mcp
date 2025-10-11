#!/usr/bin/env node

/**
 * Test script for new BiDi-based FirefoxDevTools
 * Tests all main functionality with clean BiDi implementation
 */

import { FirefoxDevTools } from '../dist/index.js';

async function main() {
  console.log('🧪 Testing BiDi-based FirefoxDevTools...\n');

  const options = {
    firefoxPath: undefined, // Auto-detect
    headless: false,
    profilePath: undefined,
    viewport: { width: 1280, height: 720 },
    args: [],
    startUrl: 'https://www.centrum.cz/',
  };

  const firefox = new FirefoxDevTools(options);

  try {
    // 1. Connect
    console.log('📡 Connecting to Firefox via BiDi...');
    await firefox.connect();
    console.log('✅ Connected!\n');

    // 2. List tabs
    console.log('📄 Listing tabs...');
    await firefox.refreshTabs();
    const tabs = firefox.getTabs();
    console.log(`✅ Found ${tabs.length} tab(s):`);
    tabs.forEach((tab, idx) => {
      console.log(`   [${idx}] ${tab.title} - ${tab.url}`);
    });
    console.log();

    // 3. Wait for page to load
    console.log('⏳ Waiting 5 seconds for centrum.cz to load...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 4. Get page title
    console.log('📖 Getting page title via evaluate...');
    console.log('   Testing evaluate with simple expression...');
    const test1 = await firefox.evaluate('return 1 + 1');
    console.log(`   1 + 1 = ${test1}`);
    const test2 = await firefox.evaluate('return document.title');
    console.log(`   document.title = ${test2}`);
    const title = await firefox.evaluate('return document.title');
    console.log(`✅ Page title: ${title}\n`);

    // 5. Get console messages
    console.log('📝 Getting console messages...');
    const messages = await firefox.getConsoleMessages();
    console.log(`✅ Found ${messages.length} console message(s):\n`);

    messages.slice(0, 10).forEach((msg, idx) => {
      const levelEmoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[msg.level] || '📘';

      console.log(`   ${idx + 1}. ${levelEmoji} [${msg.level}] ${msg.text.substring(0, 100)}`);
    });

    if (messages.length > 10) {
      console.log(`   ... and ${messages.length - 10} more messages`);
    }
    console.log();

    // 6. Trigger our own console messages
    console.log('⚡ Triggering custom console messages...');
    await firefox.evaluate(`
      console.log('🎯 BiDi test log message!');
      console.warn('⚠️ BiDi test warning!');
      console.error('❌ BiDi test error!');
      console.info('ℹ️ BiDi test info!');
    `);
    console.log('✅ Console messages triggered\n');

    // Wait for messages to arrive
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 7. Get updated console messages
    console.log('📊 Updated console messages:');
    const updatedMessages = await firefox.getConsoleMessages();
    console.log(`   Total: ${updatedMessages.length} messages`);
    console.log(`   New messages since last check:`);

    updatedMessages.slice(messages.length).forEach((msg, idx) => {
      const levelEmoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[msg.level] || '📘';

      console.log(`   ${levelEmoji} [${msg.level}] ${msg.text}`);
    });
    console.log();

    // 8. Get performance metrics
    console.log('📊 Getting performance metrics...');
    const perfMetrics = await firefox.evaluate(`
      return JSON.stringify({
        timing: {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domInteractive: performance.timing.domInteractive - performance.timing.navigationStart
        },
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null,
        resources: performance.getEntriesByType('resource').length
      })
    `);

    const metrics = JSON.parse(perfMetrics);
    console.log('✅ Performance Metrics:');
    console.log(`   DOM Content Loaded: ${metrics.timing.domContentLoaded}ms`);
    console.log(`   Page Load Complete: ${metrics.timing.loadComplete}ms`);
    console.log(`   DOM Interactive: ${metrics.timing.domInteractive}ms`);
    console.log(`   Resources Loaded: ${metrics.resources}`);

    if (metrics.memory) {
      console.log(`   JS Heap Used: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   JS Heap Total: ${(metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log();

    // 9. Navigate to another page
    console.log('🧭 Navigating to example.com...');
    await firefox.navigate('https://example.com');
    console.log('✅ Navigation completed');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newTitle = await firefox.evaluate('return document.title');
    console.log(`✅ New page title: ${newTitle}\n`);

    // 10. Test tab management
    console.log('📑 Creating new tab...');
    const newTabIdx = await firefox.createNewPage('https://www.mozilla.org');
    console.log(`✅ Created new tab [${newTabIdx}]\n`);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // List all tabs
    await firefox.refreshTabs();
    const allTabs = firefox.getTabs();
    console.log('📄 All tabs:');
    allTabs.forEach((tab, idx) => {
      const marker = idx === firefox.getSelectedTabIdx() ? '👉' : '  ';
      console.log(`${marker} [${idx}] ${tab.title.substring(0, 50)} - ${tab.url}`);
    });
    console.log();

    console.log('✅ All BiDi DevTools tests passed! 🎉\n');
    console.log('🎯 BiDi implementation is working perfectly!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
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
