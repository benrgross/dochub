/**
 * Server-safe proposal model + application logic.
 *
 * Mirrors the client-side `applyProposals` in `components/ai-branch-modal.tsx`
 * so the durable workflow (which runs headless, without the browser) can turn
 * AI tool calls into a final proposed document. Kept as a standalone pure
 * module (no React, no `server-only`) so both contexts can share the shape.
 */

export type Proposal =
  | { kind: 'replacement'; find: string; replace: string; rationale: string }
  | { kind: 'insertion'; afterHeading: string; content: string; rationale: string }

/**
 * Apply proposals to the source document in order. Each replacement assumes
 * its `find` is unique in the *current* (post-prior-edits) document; if it's
 * no longer present we skip it (the AI sometimes proposes overlapping edits).
 */
export function applyProposals(original: string, proposals: Proposal[]): string {
  let out = original
  for (const p of proposals) {
    if (p.kind === 'replacement') {
      const idx = out.indexOf(p.find)
      if (idx === -1) continue
      out = out.slice(0, idx) + p.replace + out.slice(idx + p.find.length)
    } else {
      const idx = out.indexOf(p.afterHeading)
      if (idx === -1) continue
      const endOfHeading = out.indexOf('\n', idx)
      const insertAt = endOfHeading === -1 ? out.length : endOfHeading + 1
      const insertion = p.content.endsWith('\n') ? p.content : `${p.content}\n`
      out = out.slice(0, insertAt) + insertion + out.slice(insertAt)
    }
  }
  return out
}
