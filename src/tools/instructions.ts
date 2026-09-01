/**
 * Builds the `instructions` string sent in the initialize response. Clients
 * deferring tool definitions load only tool names and this string upfront, and
 * may truncate it, so keep it short and front-load the purpose.
 */

import { MODULES } from './index.js';

const INSTRUCTIONS_INTRO = [
  'Browse and debug the web with Firefox.',
  'Use this for any browser or web page task: opening a URL, automating a web flow,',
  'or debugging a page (console errors, network requests, DOM state).',
  'The task does not need to name Firefox, reach for these tools unless another',
  'browser is explicitly requested.',
  'Chrome-only browser tools do not control Firefox, do not assume they cover this.',
].join(' ');

// Basic tools worth pushing towards the client in any case.
const CORE_TOOLS = ['list_pages', 'new_page', 'navigate_page', 'take_snapshot', 'get_page_text'];

// Additional tool suggestions for specific tasks.
// Note: this does not have to cover all possible tools.
const TASK_TOOLS: Array<{ purpose: string; tools: string[] }> = [
  { purpose: 'interaction', tools: ['click_by_uid', 'fill_by_uid', 'hover_by_uid'] },
  { purpose: 'debugging', tools: ['list_console_messages', 'list_network_requests'] },
  { purpose: 'visuals', tools: ['screenshot_page', 'screenshot_by_uid'] },
  { purpose: 'one-off JS', tools: ['evaluate_script'] },
];

export function buildInstructions(moduleNames: string[], toolNames: Set<string>): string {
  const byName = new Map(MODULES.map((m) => [m.name, m]));
  const capabilities = moduleNames.flatMap((name) => {
    const module = byName.get(name);
    return module ? [`- ${module.name}: ${module.description}`] : [];
  });
  const sections = [INSTRUCTIONS_INTRO, ['Enabled capabilities:', ...capabilities].join('\n')];

  const core = CORE_TOOLS.filter((name) => toolNames.has(name));
  if (core.length > 0) {
    const groups = TASK_TOOLS.flatMap(({ purpose, tools }) => {
      const available = tools.filter((name) => toolNames.has(name));
      return available.length > 0 ? [`${available.join(' / ')} for ${purpose}`] : [];
    });
    const extra =
      groups.length > 0 ? ` Add task-specific tools to the same search: ${groups.join(', ')}.` : '';
    sections.push(
      `When these tools are deferred, load the core set in one search rather than one at a time: ${core.join(', ')}.${extra}`
    );
  }

  return sections.join('\n\n');
}
