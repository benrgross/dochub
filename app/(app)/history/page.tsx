import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { CommitHistory } from '@/components/commit-history'
import { listCommits } from '@/app/_data/commits'
import { getPinnedDocument } from '@/app/_data/documents'

export default async function HistoryPage() {
  const doc = await getPinnedDocument()
  if (!doc) redirect('/upload')

  return (
    <div className="h-full max-w-3xl mx-auto">
      <Suspense fallback={<Skeleton />}>
        <List docId={doc.id} updatedAt={doc.updatedAt} />
      </Suspense>
    </div>
  )
}

async function List({ docId, updatedAt }: { docId: string; updatedAt: Date }) {
  const commits = await listCommits(docId)
  return <CommitHistory commits={commits} currentDocUpdatedAt={updatedAt} />
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-4 w-32 bg-secondary/60 rounded animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 bg-secondary/30 rounded-md animate-pulse" />
      ))}
    </div>
  )
}
