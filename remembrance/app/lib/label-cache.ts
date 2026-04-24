// Module-level cache shared across route handlers in the same process.
export const labelCache = new Map<string, string>();

export function invalidateLabel(memoryId: string) {
  labelCache.delete(memoryId);
}
