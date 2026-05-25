'use client'

import { useState, useEffect } from 'react'
import { useDocHubStore } from '@/lib/store'
import { ChangeRequestList } from '@/components/change-request-list'
import { ChangeRequestDetail } from '@/components/change-request-detail'
import { CommitHistory } from '@/components/commit-history'
import { DocumentView } from '@/components/document-view'
import { NewChangeRequestModal } from '@/components/new-change-request-modal'
import { AIBranchModal } from '@/components/ai-branch-modal'
import { Button } from '@/components/ui/button'
import { FileText, GitPullRequest, History, GitBranch, Bot, Loader2 } from 'lucide-react'

export default function DocHubPage() {
  const { activeTab, setActiveTab, document, isLoading, isInitialized, initialize } = useDocHubStore()
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading || !isInitialized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading DocHub...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.65_0.15_145)] flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-[oklch(0.12_0.01_240)]" />
            </div>
            <span className="text-lg font-semibold text-foreground">DocHub</span>
          </div>

          {/* Document name */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">{document.name}</span>
          </div>
        </div>

                <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAIModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Branch
          </Button>
          <NewChangeRequestModal />
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/50">
        <TabButton
          icon={<FileText className="w-4 h-4" />}
          label="Document"
          isActive={activeTab === 'document'}
          onClick={() => setActiveTab('document')}
        />
        <TabButton
          icon={<GitPullRequest className="w-4 h-4" />}
          label="Change Requests"
          isActive={activeTab === 'changes'}
          onClick={() => setActiveTab('changes')}
        />
        <TabButton
          icon={<History className="w-4 h-4" />}
          label="History"
          isActive={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        />
      </nav>

      {/* Main content */}
      <main className="flex-1 min-h-0">
        {activeTab === 'document' && (
          <div className="h-full">
            <DocumentView />
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="h-full flex">
            {/* Sidebar - Change Request List */}
            <div className="w-80 border-r border-border bg-card flex-shrink-0">
              <ChangeRequestList />
            </div>

            {/* Main - Change Request Detail */}
            <div className="flex-1 bg-background">
              <ChangeRequestDetail />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-full max-w-3xl mx-auto">
            <CommitHistory />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 border-t border-border bg-card/50 text-xs text-muted-foreground flex items-center justify-between">
        <span>Built for SA Interview Demo</span>
        <span>Source Control for Documents</span>
      </footer>

      {/* AI Branch Modal */}
      <AIBranchModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
    </div>
  )
}

function TabButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
