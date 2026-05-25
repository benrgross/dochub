'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useDocHubStore } from '@/lib/store'
import { Bot, GitBranch, Loader2, Sparkles, X, GitMerge, Check } from 'lucide-react'

interface AIBranchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AIBranchModal({ isOpen, onClose }: AIBranchModalProps) {
  const { document, createChangeRequest, mergeChangeRequest, selectChangeRequest, changeRequests, setActiveTab } = useDocHubStore()
  const masterDocument = document.content
  const [instructions, setInstructions] = useState('')
  const [branchName, setBranchName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoMerge, setAutoMerge] = useState(false)

  if (!isOpen) return null

  const handleGeneratePreview = async () => {
    if (!instructions.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: masterDocument,
          instructions: instructions.trim(),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate edits')
      }
      
      const data = await response.json()
      setPreview(data.editedDocument)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBranch = () => {
    if (!preview || !branchName.trim()) return
    
    const newId = createChangeRequest(
      branchName.trim(),
      `AI-generated changes based on: "${instructions}"`,
      'AI Assistant',
      preview
    )
    
    if (autoMerge) {
      // Auto-merge immediately
      mergeChangeRequest(newId)
      setActiveTab('history')
    } else {
      // Select the new CR and switch to changes tab
      const newCR = changeRequests.find(cr => cr.id === newId) || {
        id: newId,
        title: branchName.trim(),
        description: `AI-generated changes based on: "${instructions}"`,
        author: 'AI Assistant',
        status: 'open' as const,
        originalContent: masterDocument,
        proposedContent: preview,
        createdAt: new Date(),
        comments: [],
      }
      selectChangeRequest(newCR)
      setActiveTab('changes')
    }
    
    // Reset and close
    setInstructions('')
    setBranchName('')
    setPreview(null)
    setAutoMerge(false)
    onClose()
  }

  const handleClose = () => {
    setInstructions('')
    setBranchName('')
    setPreview(null)
    setError(null)
    setAutoMerge(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Branch</h2>
              <p className="text-sm text-muted-foreground">Let AI edit your document</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!preview ? (
            <>
              {/* Instructions Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  What changes should AI make?
                </label>
                <Textarea
                  placeholder="e.g., Make the tone more professional, fix grammar issues, add a conclusion paragraph..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="bg-background border-border resize-none"
                />
              </div>

              {/* Current Document Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Current master document
                </label>
                <div className="bg-background border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                    {masterDocument}
                  </pre>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Branch Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch name
                </label>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g., ai/improve-tone"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              {/* AI Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <label className="text-sm font-medium text-foreground">
                    AI-generated version
                  </label>
                </div>
                <div className="bg-background border border-purple-500/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                    {preview}
                  </pre>
                </div>
              </div>

              {/* Instructions reminder */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <strong>Instructions:</strong> {instructions}
              </div>

              {/* Auto-merge option */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={autoMerge}
                  onChange={(e) => setAutoMerge(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-accent"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-foreground">Auto-merge changes</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Skip review and merge directly into the master document
                  </p>
                </div>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          {!preview ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={!instructions.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Preview
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button
                onClick={handleCreateBranch}
                disabled={!branchName.trim()}
                className={autoMerge ? "bg-accent hover:bg-accent/90" : "bg-purple-600 hover:bg-purple-700"}
              >
                {autoMerge ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Merge Now
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create Branch
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
