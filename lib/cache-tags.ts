/**
 * Cache tag conventions for `cacheTag()` / `updateTag()`.
 *
 * We use coarse tags ("document", "commits") for list views and
 * scoped tags ("document:<id>", "commits:<docId>") for record-level
 * invalidation so a single CR merge doesn't blow the cache for every
 * doc in the system.
 */
export const tag = {
  /** The pinned source-of-truth document content. */
  document: (id?: string) => (id ? `document:${id}` : 'document'),
  /** Open change requests list (do NOT cache; this is dynamic — used only for documentation). */
  changeRequests: (docId?: string) =>
    docId ? `change-requests:${docId}` : 'change-requests',
  /** Merge history. */
  commits: (docId?: string) => (docId ? `commits:${docId}` : 'commits'),
  /** A single change request and its comments. */
  changeRequest: (id: string) => `change-request:${id}`,
  /** AI-generated summary for a change request (expensive to compute — cached separately). */
  crSummary: (id: string) => `cr-summary:${id}`,
}
