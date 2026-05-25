import { notFound } from 'next/navigation'
import { ChangeRequestDetail } from '@/components/change-request-detail'
import { getChangeRequest } from '@/app/_data/change-requests'
import { getCurrentUser } from '@/lib/current-user'

interface PageProps {
  params: Promise<{ crId: string }>
}

export default async function ChangeRequestPage({ params }: PageProps) {
  const { crId } = await params
  const [cr, currentUser] = await Promise.all([getChangeRequest(crId), getCurrentUser()])
  if (!cr) notFound()
  return <ChangeRequestDetail changeRequest={cr} currentUser={currentUser} />
}
