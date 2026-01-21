/**
 * Shared UID error handling utilities
 */

/**
 * Transform UID resolution errors into concise messages
 */
export function handleUidError(error: Error, uid: string): Error {
  const errorMsg = error.message;

  if (
    errorMsg.includes('stale') ||
    errorMsg.includes('Snapshot') ||
    errorMsg.includes('UID') ||
    errorMsg.includes('not found')
  ) {
    return new Error(`${uid} stale/invalid. Call take_snapshot first.`);
  }

  return error;
}
