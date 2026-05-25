import { UploadForm } from '@/components/upload-form'
import { getPinnedDocument } from '@/app/_data/documents'

export default async function UploadPage() {
  const existing = await getPinnedDocument()

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {existing ? 'Pin a new source of truth' : 'Pin your source of truth'}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a markdown or plain-text document. Once pinned, every edit goes through a
            review-and-merge flow — including AI-authored edits.
          </p>
          {existing && (
            <p className="text-xs text-muted-foreground mt-2">
              Pinning a new doc unpins <span className="font-medium">{existing.title}</span>.
              Its merge history stays intact.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <UploadForm />
        </div>
      </div>
    </div>
  )
}
