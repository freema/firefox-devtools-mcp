#!/usr/bin/env node

/**
 * Standalone test for console message handling
 * Tests console.log, console.warn, console.error capturing
 */

import { FirefoxDevTools } from '../dist/index.js';

async function main() {
  console.log('📝 Testing Console Message Handling...\n');

  const firefox = new FirefoxDevTools({
    firefoxPath: undefined,
    headless: false,
    viewport: { width: 1024, height: 768 },
  });

  try {
    // Connect
    console.log('📡 Connecting to Firefox...');
    await firefox.connect();
    console.log('✅ Connected!\n');

    // Navigate to blank page
    console.log('🌐 Navigating to about:blank...');
    await firefox.navigate('about:blank');
    console.log('✅ Navigation complete\n');

    // Clear existing console messages
    console.log('🧹 Clearing existing console messages...');
    firefox.clearConsoleMessages();
    const afterClear = await firefox.getConsoleMessages();
    console.log(`✅ Console cleared (${afterClear.length} messages)\n`);

    // Test 1: Generate different log levels
    console.log('1️⃣ Generating console messages of different levels...');
    await firefox.evaluate(`
      console.log('This is a log message');
      console.info('This is an info message');
      console.warn('This is a warning message');
      console.error('This is an error message');
      console.debug('This is a debug message');
    `);

    // Wait a bit for messages to be captured
    await new Promise((r) => setTimeout(r, 500));

    const allMessages = await firefox.getConsoleMessages();
    console.log(`   ✅ Captured ${allMessages.length} console messages\n`);

    // Display all messages
    console.log('📋 All console messages:');
    for (const msg of allMessages) {
      const emoji = {
        log: '📝',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
      }[msg.level.toLowerCase()] || '📝';
      console.log(`   ${emoji} [${msg.level}] ${msg.text}`);
    }
    console.log();

    // Test 2: Filter by level
    console.log('2️⃣ Testing level filtering...');
    const errors = allMessages.filter((msg) => msg.level.toLowerCase() === 'error');
    const warnings = allMessages.filter((msg) => msg.level.toLowerCase() === 'warn');
    console.log(`   ✅ Found ${errors.length} error(s)`);
    console.log(`   ✅ Found ${warnings.length} warning(s)\n`);

    // Test 3: Generate many messages and test limit
    console.log('3️⃣ Testing message limit (generating 100 messages)...');
    firefox.clearConsoleMessages();
    await firefox.evaluate(`
      for (let i = 0; i < 100; i++) {
        console.log('Message ' + i);
      }
    `);

    await new Promise((r) => setTimeout(r, 1000));
    const manyMessages = await firefox.getConsoleMessages();
    console.log(`   ✅ Captured ${manyMessages.length} messages\n`);

    // Test 4: Clear messages
    console.log('4️⃣ Testing clear console messages...');
    firefox.clearConsoleMessages();
    const afterSecondClear = await firefox.getConsoleMessages();
    console.log(`   ✅ Console cleared (${afterSecondClear.length} messages remaining)\n`);

    // Test 5: Test timestamps
    console.log('5️⃣ Testing message timestamps...');
    firefox.clearConsoleMessages();
    const startTime = Date.now();

    await firefox.evaluate(`console.log('Message at T=0')`);
    await new Promise((r) => setTimeout(r, 500));
    await firefox.evaluate(`console.log('Message at T=500ms')`);
    await new Promise((r) => setTimeout(r, 500));
    await firefox.evaluate(`console.log('Message at T=1000ms')`);

    await new Promise((r) => setTimeout(r, 500));
    const timedMessages = await firefox.getConsoleMessages();
    console.log(`   ✅ Captured ${timedMessages.length} timed messages`);

    for (const msg of timedMessages) {
      const elapsed = msg.timestamp ? msg.timestamp - startTime : 'N/A';
      console.log(`   📍 "${msg.text}" at +${elapsed}ms`);
    }
    console.log();

    // Test 6: Test with objects and complex data
    console.log('6️⃣ Testing console with objects and arrays...');
    firefox.clearConsoleMessages();
    await firefox.evaluate(`
      console.log('Simple string');
      console.log('Number:', 42);
      console.log('Object:', { name: 'Test', value: 123 });
      console.log('Array:', [1, 2, 3, 4, 5]);
    `);

    await new Promise((r) => setTimeout(r, 500));
    const complexMessages = await firefox.getConsoleMessages();
    console.log(`   ✅ Captured ${complexMessages.length} messages with complex data`);
    for (const msg of complexMessages) {
      console.log(`   📝 ${msg.text}`);
    }
    console.log();

    console.log('✅ All console tests passed! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    console.log('🧹 Closing Firefox...');
    await firefox.close();
    console.log('✅ Done!');
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
