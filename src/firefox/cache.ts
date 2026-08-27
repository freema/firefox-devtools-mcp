/**
 * Network cache behaviour (WebDriver BiDi network.setCacheBehavior)
 */

export type BiDiCommandFn = (method: string, params: Record<string, any>) => Promise<any>;

/**
 * WebDriver BiDi network.CacheBehavior.
 * - "default": normal HTTP cache behaviour
 * - "bypass": skip the cache, so every request goes to the network
 */
export const CACHE_BEHAVIORS = ['default', 'bypass'] as const;

export type CacheBehavior = (typeof CACHE_BEHAVIORS)[number];

export function isCacheBehavior(value: unknown): value is CacheBehavior {
  return CACHE_BEHAVIORS.includes(value as CacheBehavior);
}

export class CacheManagement {
  constructor(
    private getCurrentContextId: () => string | null,
    private sendBiDiCommand: BiDiCommandFn
  ) {}

  async setCacheBehavior(behavior: CacheBehavior, options?: { global?: boolean }): Promise<void> {
    const params: Record<string, unknown> = { cacheBehavior: behavior };

    // Omitting `contexts` applies the behaviour globally; passing the current
    // context scopes it to the selected tab, which is the default.
    if (!options?.global) {
      const contextId = this.getCurrentContextId();
      if (!contextId) {
        throw new Error('Cannot set cache behavior: no browsing context ID');
      }
      params.contexts = [contextId];
    }

    await this.sendBiDiCommand('network.setCacheBehavior', params);
  }
}
