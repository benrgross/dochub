import { ImageResponse } from 'next/og'
import { diffLines } from 'diff'
import { getChangeRequest } from '@/app/_data/change-requests'

export const alt = 'DocHub change request'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_COLOR: Record<string, string> = {
  open: '#3ecf8e',
  approved: '#38bdf8',
  merged: '#a78bfa',
  closed: '#f87171',
}

/**
 * Dynamically generated social card for a change request. When a PR link is
 * shared in Slack / Linear / email, this renders a branded preview with the
 * title, author, status, and diff stats — generated on demand via next/og.
 *
 * Reuses the cached `getChangeRequest`, so it adds no extra database load.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ crId: string }>
}) {
  const { crId } = await params

  let title = 'Change request'
  let author = ''
  let status = 'open'
  let isAi = false
  let additions = 0
  let deletions = 0

  if (UUID_RE.test(crId)) {
    const cr = await getChangeRequest(crId)
    if (cr) {
      title = cr.title
      author = cr.author
      status = cr.status
      isAi = cr.aiMetadata != null
      for (const part of diffLines(cr.originalContent, cr.proposedContent)) {
        if (part.added) additions += part.count ?? 0
        if (part.removed) deletions += part.count ?? 0
      }
    }
  }

  const statusColor = STATUS_COLOR[status] ?? '#9aa0aa'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b0e14',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top row: brand + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#3ecf8e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                color: '#0b0e14',
                fontWeight: 700,
              }}
            >
              ⎇
            </div>
            <span style={{ fontSize: 32, fontWeight: 600, color: '#e6e6e6' }}>DocHub</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 22px',
              borderRadius: 999,
              border: `2px solid ${statusColor}`,
              color: statusColor,
              fontSize: 26,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {status}
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isAi && (
            <span style={{ fontSize: 26, color: '#a78bfa', fontWeight: 600 }}>
              ✦ AI-authored change
            </span>
          )}
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              display: 'flex',
            }}
          >
            {title.length > 90 ? `${title.slice(0, 90)}…` : title}
          </span>
        </div>

        {/* Bottom row: author + diff stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 30, color: '#9aa0aa' }}>{author}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 32, fontWeight: 600 }}>
            <span style={{ color: '#3ecf8e' }}>+{additions}</span>
            <span style={{ color: '#f87171' }}>−{deletions}</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
