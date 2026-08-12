const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guard raw route/action params before they reach a Postgres uuid column,
// where a malformed string throws a cast error instead of returning 404.
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
