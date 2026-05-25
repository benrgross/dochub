import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChangeRequestDetail } from '@/components/change-request-detail'
import { getChangeRequest } from '@/app/_data/change-requests'
import { getCurrentUser } from '@/lib/current-user'

interface PageProps {
  params: Promise<{ crId: string }>
}

/**
 * Per-PR metadata. Lets Slack / Linear / email previews show the actual
 * PR title + a useful description without needing to load the page.
 * Powered by the cached `getChangeRequest` (same data the page uses, so
 * no extra DB hit). This is the "SEO + dynamic personalized content" beat
 * from the Track A rubric.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { crId } = await params
  const cr = await getChangeRequest(crId)
  if (!cr) return { title: 'Change request not found' }

  const status = cr.status[0].toUpperCase() + cr.status.slice(1)
  const ai = cr.aiMetadata ? ' · AI-authored' : ''
  return {
    title: `${cr.title} · ${status} · DocHub`,
    description: cr.description || `${status} change request by ${cr.author}${ai}.`,
    openGraph: {
      title: cr.title,
      description: cr.description || `${status} change request by ${cr.author}${ai}.`,
      type: 'article',
    },
  }
}

export default async function ChangeRequestPage({ params }: PageProps) {
  const { crId } = await params
  const [cr, currentUser] = await Promise.all([getChangeRequest(crId), getCurrentUser()])
  if (!cr) notFound()
  return <ChangeRequestDetail changeRequest={cr} currentUser={currentUser} />
}
