import { route } from 'ziggy-js';

/**
 * Like Ziggy's route(), but returns null instead of throwing when the route
 * name is not present in the current Ziggy config (e.g. during a deploy while
 * the route cache is still stale). Prevents the whole dashboard from crashing.
 */
export function routeIfExists(
  name: string,
  params?: Record<string, unknown> | string | number | null | undefined
): string | null {
  try {
    const ziggy = (globalThis as Record<string, unknown>).Ziggy as
      | { routes?: Record<string, unknown> }
      | undefined;
    if (ziggy?.routes && !(name in ziggy.routes)) {
      return null;
    }
    return route(name, params as never);
  } catch {
    return null;
  }
}
