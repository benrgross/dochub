'use client'

import { create } from 'zustand'
import { Document, ChangeRequest, Commit } from './types'
import * as db from './db'

interface DocHubStore {
  document: Document
  changeRequests: ChangeRequest[]
  commits: Commit[]
  activeTab: 'document' | 'changes' | 'history'
  selectedChangeRequest: ChangeRequest | null
  isLoading: boolean
  isInitialized: boolean
  
  // Actions
  initialize: () => Promise<void>
  setDocument: (content: string) => void
  setActiveTab: (tab: 'document' | 'changes' | 'history') => void
  createChangeRequest: (title: string, description: string, author: string, proposedContent: string) => string
  selectChangeRequest: (cr: ChangeRequest | null) => void
  approveChangeRequest: (id: string, approver: string) => void
  mergeChangeRequest: (id: string) => void
  closeChangeRequest: (id: string) => void
  addComment: (crId: string, author: string, content: string) => void
}

const defaultDocument: Document = {
  id: '1',
  name: 'product-requirements.md',
  content: '',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const useDocHubStore = create<DocHubStore>((set, get) => ({
  document: defaultDocument,
  changeRequests: [],
  commits: [],
  activeTab: 'changes',
  selectedChangeRequest: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return
    
    try {
      set({ isLoading: true })
      
      // Fetch all data from database
      const [docData, changeRequests, commits] = await Promise.all([
        db.fetchDocument(),
        db.fetchChangeRequests(),
        db.fetchCommits(),
      ])
      
      set({
        document: {
          id: docData.id,
          name: docData.title,
          content: docData.content,
          createdAt: new Date(docData.created_at),
          updatedAt: new Date(docData.updated_at),
        },
        changeRequests,
        commits,
        isLoading: false,
        isInitialized: true,
      })
    } catch (error) {
      console.error('[v0] Failed to initialize store:', error)
      set({ isLoading: false })
    }
  },

  setDocument: (content) => {
    set((state) => ({
      document: { ...state.document, content, updatedAt: new Date() },
    }))
    // Persist to database
    db.updateDocument(content).catch(console.error)
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  createChangeRequest: (title, description, author, proposedContent) => {
    const tempId = `cr-${Date.now()}`
    const currentContent = get().document.content
    
    // Optimistically add to state
    set((state) => ({
      changeRequests: [
        {
          id: tempId,
          title,
          description,
          author,
          status: 'open',
          originalContent: currentContent,
          proposedContent,
          createdAt: new Date(),
          comments: [],
        },
        ...state.changeRequests,
      ],
    }))
    
    // Persist to database and update with real ID
    db.createChangeRequest(title, description, author, currentContent, proposedContent)
      .then((realId) => {
        set((state) => ({
          changeRequests: state.changeRequests.map((cr) =>
            cr.id === tempId ? { ...cr, id: realId } : cr
          ),
          selectedChangeRequest: state.selectedChangeRequest?.id === tempId 
            ? { ...state.selectedChangeRequest, id: realId }
            : state.selectedChangeRequest,
        }))
      })
      .catch(console.error)
    
    return tempId
  },

  selectChangeRequest: (cr) => set({ selectedChangeRequest: cr }),

  approveChangeRequest: (id, approver) => {
    set((state) => {
      const updatedCRs = state.changeRequests.map((c) =>
        c.id === id ? { ...c, status: 'approved' as const, approvedBy: approver, approvedAt: new Date() } : c
      )
      const updatedCR = updatedCRs.find((c) => c.id === id)
      return {
        changeRequests: updatedCRs,
        selectedChangeRequest: updatedCR || state.selectedChangeRequest,
      }
    })
    
    // Persist to database
    db.updateChangeRequestStatus(id, 'approved', approver).catch(console.error)
  },

  mergeChangeRequest: (id) => {
    const state = get()
    const cr = state.changeRequests.find((c) => c.id === id)
    if (!cr) return

    // Update local state
    set({
      document: { ...state.document, content: cr.proposedContent, updatedAt: new Date() },
      changeRequests: state.changeRequests.map((c) =>
        c.id === id ? { ...c, status: 'merged' } : c
      ),
      selectedChangeRequest: null,
    })

    // Persist to database
    Promise.all([
      db.updateDocument(cr.proposedContent),
      db.updateChangeRequestStatus(id, 'merged'),
      db.createCommit(cr.title, cr.author, id),
    ])
      .then(([, , commit]) => {
        set((state) => ({
          commits: [commit, ...state.commits],
        }))
      })
      .catch(console.error)
  },

  closeChangeRequest: (id) => {
    set((state) => ({
      changeRequests: state.changeRequests.map((c) =>
        c.id === id ? { ...c, status: 'closed' } : c
      ),
      selectedChangeRequest: null,
    }))
    
    // Persist to database
    db.updateChangeRequestStatus(id, 'closed').catch(console.error)
  },

  addComment: (crId, author, content) => {
    const tempId = `c-${Date.now()}`
    
    // Optimistically add comment
    set((state) => ({
      changeRequests: state.changeRequests.map((cr) =>
        cr.id === crId
          ? {
              ...cr,
              comments: [
                ...cr.comments,
                { id: tempId, author, content, createdAt: new Date() },
              ],
            }
          : cr
      ),
    }))
    
    // Persist to database
    db.addCommentToChangeRequest(crId, author, content)
      .then((comment) => {
        set((state) => ({
          changeRequests: state.changeRequests.map((cr) =>
            cr.id === crId
              ? {
                  ...cr,
                  comments: cr.comments.map((c) =>
                    c.id === tempId ? { ...c, id: comment.id } : c
                  ),
                }
              : cr
          ),
        }))
      })
      .catch(console.error)
  },
}))
