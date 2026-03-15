/**
 * Split cache time configuration for React Query.
 * Stats/analytics: 10 minutes (rarely changes)
 * Table/list data: 1 minute (changes frequently)
 */

export const CACHE_TIMES = {
  /** For stats, analytics, KPIs, dashboard summaries */
  STATS: 1000 * 60 * 10, // 10 minutes

  /** For table/list data that changes frequently */
  TABLE: 1000 * 60 * 1, // 1 minute

  /** For semi-static data like categories, counters, settings */
  CONFIG: 1000 * 60 * 5, // 5 minutes

  /** Garbage collection time */
  GC: 1000 * 60 * 30, // 30 minutes
} as const;

/** Standard page size for server-side pagination */
export const PAGE_SIZE = 25;
