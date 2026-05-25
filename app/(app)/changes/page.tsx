import { GitMerge } from 'lucide-react'

export default function ChangesIndexPage() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <div className="text-4xl mb-4 opacity-20">
          <GitMerge className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-sm">Select a change request to view details</p>
      </div>
    </div>
  )
}
