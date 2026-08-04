/**
 * UID <-> Element registry (runs in browser context)
 *
 * Both maps live on the window so they survive across injected script calls: a tree walk reuses the
 * UIDs assigned by earlier walks, and a UID can later be resolved back to its element without
 * guessing a selector. Elements are held weakly so the registry never keeps detached DOM alive.
 */

interface UidRegistry {
  uidToElement: Map<string, WeakRef<Element>>;
  elementToUid: WeakMap<Element, string>;
}

const REGISTRY_PROPERTY = '__uidRegistry';

function getRegistry(): UidRegistry {
  const target = window as unknown as Record<string, UidRegistry | undefined>;

  let registry = target[REGISTRY_PROPERTY];
  if (!registry) {
    registry = { uidToElement: new Map(), elementToUid: new WeakMap() };
    target[REGISTRY_PROPERTY] = registry;
  }

  return registry;
}

/**
 * UID assigned to this element by a previous tree walk, if any
 */
export function getUid(el: Element): string | undefined {
  return getRegistry().elementToUid.get(el);
}

/**
 * Remember the UIDs a tree walk assigned, so they can be resolved and reused later
 */
export function registerUids(uids: Map<string, Element>): void {
  const registry = getRegistry();

  for (const [uid, el] of uids) {
    registry.uidToElement.set(uid, new WeakRef(el));
    registry.elementToUid.set(el, uid);
  }
}

/**
 * Element for this UID, or null if it was garbage collected or removed from the DOM
 */
export function lookupElement(uid: string): Element | null {
  const registry = getRegistry();

  const el = registry.uidToElement.get(uid)?.deref();
  if (!el?.isConnected) {
    registry.uidToElement.delete(uid);
    return null;
  }

  return el;
}

export function clearRegistry(): void {
  const registry = getRegistry();
  registry.uidToElement.clear();
  registry.elementToUid = new WeakMap();
}
