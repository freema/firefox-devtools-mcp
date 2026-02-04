/**
 * Snapshot module exports
 */

export { SnapshotManager, type SnapshotOptions } from './manager.js';
export type {
  Snapshot,
  SnapshotNode,
  SnapshotJson,
  UidEntry,
  AriaAttributes,
  ComputedProperties,
} from './types.js';
export { formatSnapshotTree } from './formatter.js';
