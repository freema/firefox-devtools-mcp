/**
 * Integration tests for the privileged kit
 * Tests with real Firefox browser in headless mode
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestFirefox, closeFirefox, waitFor, waitForPageLoad } from '../helpers/firefox.js';
import {
  handleEnsurePrivilegedKit,
  handleEvaluatePrivilegedScript,
} from '../../src/tools/privileged-context.js';
import { listKitFiles } from '../../src/utils/kit.js';
import type { FirefoxClient } from '@/firefox/index.js';
import type { McpToolResponse } from '@/types/common.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mockGetFirefox = vi.hoisted(() => vi.fn());

vi.mock('../../src/index.js', () => ({
  getFirefox: () => mockGetFirefox(),
}));

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesPath = resolve(__dirname, '../fixtures');
const fixtureUrl = `file://${fixturesPath}/simple.html`;

// How a payload reaches the kit: it is anchored on the shared system global,
// not on the window the loader ran in.
const KIT = 'const S = Cu.getGlobalForObject(Services).__ffllm;';

// (rec) => uninstall, evaluated in every content process by hookChild.
const CHILD_SEAM = `(rec) => {
  const observer = { observe: (subject, topic) => rec({ topic }) };
  Services.obs.addObserver(observer, 'content-document-global-created');
  return () => Services.obs.removeObserver(observer, 'content-document-global-created');
}`;

function textOf(result: McpToolResponse): string {
  const item = result.content[0];
  return item?.type === 'text' ? item.text : '';
}

function jsonBlock(result: McpToolResponse): any {
  const text = textOf(result);
  if (result.isError) {
    throw new Error(text);
  }
  const match = /```json\n([\s\S]*)\n```/.exec(text);
  return match ? JSON.parse(match[1]) : undefined;
}

async function evalChrome(context: string, fn: string): Promise<any> {
  return jsonBlock(await handleEvaluatePrivilegedScript({ function: fn, context }));
}

async function chromeContext(firefox: FirefoxClient): Promise<string> {
  const tree = await firefox.sendBiDiCommand('browsingContext.getTree', { 'moz:scope': 'chrome' });
  return tree.contexts[0].context;
}

describe('Privileged Kit Install Integration Tests', () => {
  let firefox: FirefoxClient;
  let context: string;

  beforeAll(async () => {
    firefox = await createTestFirefox({ env: { MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' } });
    mockGetFirefox.mockResolvedValue(firefox);
    context = await chromeContext(firefox);
  }, 30000);

  afterAll(async () => {
    await closeFirefox(firefox);
  });

  it('should install the kit and keep live state on a second call', async () => {
    expect(await evalChrome(context, '() => typeof Cu.getGlobalForObject(Services).__ffllm')).toBe(
      'undefined'
    );

    const first = jsonBlock(await handleEnsurePrivilegedKit({ context }));

    expect(first.reused).toBe(false);
    expect(first.loaded).toEqual(listKitFiles().filter((name) => name !== 'loader.js'));
    expect(first.api).toEqual(expect.arrayContaining(['hook', 'drain', 'callChild', 'hookChild']));
    expect(await evalChrome(context, `() => { ${KIT} return typeof S.hook; }`)).toBe('function');

    await evalChrome(
      context,
      `async () => { ${KIT} return JSON.parse(await S.hook('kit-install', (rec) => { rec({ n: 1 }); return () => {}; })); }`
    );

    const second = jsonBlock(await handleEnsurePrivilegedKit({ context }));

    expect(second.reused).toBe(true);
    expect(second.loaded).toEqual(first.loaded);

    const drained = await evalChrome(
      context,
      `async () => { ${KIT} return JSON.parse(await S.drain('kit-install')); }`
    );

    expect(drained.events).toHaveLength(1);
    expect(drained.events[0].v).toEqual({ n: 1 });
  }, 30000);
});

describe('Privileged Kit Child Process Integration Tests', () => {
  let firefox: FirefoxClient;
  let context: string;

  beforeAll(async () => {
    firefox = await createTestFirefox({ env: { MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' } });
    mockGetFirefox.mockResolvedValue(firefox);
    context = await chromeContext(firefox);
    await firefox.navigate(fixtureUrl);
    await waitForPageLoad();
    jsonBlock(await handleEnsurePrivilegedKit({ context }));
  }, 30000);

  afterAll(async () => {
    await closeFirefox(firefox);
  });

  it('should return a value from a content process and rethrow a child throw', async () => {
    const answers = await evalChrome(
      context,
      `async () => { ${KIT} return await S.callChild('all', '() => ({ pid: Services.appinfo.processID, answer: 6 * 7 })'); }`
    );

    expect(answers.length).toBeGreaterThan(0);
    for (const answer of answers) {
      expect(answer.value).toEqual({ pid: answer.pid, answer: 42 });
    }

    const thrown = await handleEvaluatePrivilegedScript({
      function: `async () => { ${KIT} return await S.callChild(${answers[0].pid}, '() => { throw new Error("kit-child-boom"); }'); }`,
      context,
    });

    expect(thrown.isError).toBe(true);
    expect(textOf(thrown)).toContain('kit-child-boom');
    expect(textOf(thrown)).not.toContain('timeout');
  }, 30000);

  it('should stream records from every content process to the parent drain', async () => {
    const installed = await evalChrome(
      context,
      `async () => { ${KIT} return JSON.parse(await S.hookChild('kit-child', ${JSON.stringify(CHILD_SEAM)}, { targets: 'all', flushMs: 50 })); }`
    );

    expect(installed.installed).toBe(true);

    await firefox.navigate(fixtureUrl);
    await waitForPageLoad();

    const events: any[] = [];
    await waitFor(async () => {
      const drained = await evalChrome(
        context,
        `async () => { ${KIT} return JSON.parse(await S.drain('kit-child')); }`
      );
      events.push(...drained.events);
      return events.length > 0;
    }, 10000);

    expect(events.some((e) => e.v.v.topic === 'content-document-global-created')).toBe(true);
    expect(events.every((e) => typeof e.v.pid === 'number')).toBe(true);

    await evalChrome(
      context,
      `async () => { ${KIT} return JSON.parse(await S.unhook('kit-child')); }`
    );
  }, 45000);
});
