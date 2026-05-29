import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="p-3 rounded-full bg-secondary/60 mb-4">
        <FileQuestion className="w-7 h-7 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        That page doesn&apos;t exist, or the change request may have been removed.
      </p>
      <Button asChild className="mt-6">
        <Link href="/document">Back to the document</Link>
      </Button>
    </div>
  )
}
