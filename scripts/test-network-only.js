#!/usr/bin/env node

/**
 * Quick network test
 */

import { FirefoxDevTools } from '../dist/index.js';

async function main() {
  console.log('🧪 Testing Network Monitoring...\n');

  const options = {
    firefoxPath: undefined,
    headless: false,
    profilePath: undefined,
    viewport: { width: 1280, height: 720 },
    args: [],
    startUrl: 'about:blank',
  };

  const firefox = new FirefoxDevTools(options);

  try {
    console.log('📡 Connecting...');
    await firefox.connect();
    console.log('✅ Connected\n');

    // Start monitoring FIRST
    console.log('🌐 Starting network monitoring...');
    await firefox.startNetworkMonitoring();
    console.log('✅ Monitoring started\n');

    // Wait a bit
    await new Promise((r) => setTimeout(r, 500));

    // Navigate to a page with resources
    console.log('🧭 Navigating to example.com...');
    await firefox.navigate('https://example.com');
    console.log('✅ Navigation completed\n');

    // Wait for resources to load
    console.log('⏳ Waiting 5s for resources...');
    await new Promise((r) => setTimeout(r, 5000));

    // Get network requests
    console.log('📊 Fetching network requests...');
    const requests = await firefox.getNetworkRequests();
    console.log(`✅ Captured ${requests.length} network request(s):\n`);

    // Show all requests
    requests.forEach((req, idx) => {
      const statusEmoji = req.status >= 400 ? '❌' : req.status >= 300 ? '⚠️' : '✅';
      console.log(`${idx + 1}. ${statusEmoji} [${req.method}] ${req.status || '?'} ${req.url}`);
      if (req.resourceType) {
        console.log(`   Type: ${req.resourceType}`);
      }
      if (req.timings?.duration) {
        console.log(`   Duration: ${req.timings.duration}ms`);
      }
      console.log();
    });

    // Stop monitoring
    await firefox.stopNetworkMonitoring();
    console.log('✅ Network monitoring stopped\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    console.log('🧹 Closing...');
    await firefox.close();
    console.log('✅ Done');
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
