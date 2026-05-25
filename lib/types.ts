export interface Document {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface ChangeRequest {
  id: string
  title: string
  description: string
  author: string
  status: 'open' | 'approved' | 'merged' | 'closed'
  originalContent: string
  proposedContent: string
  createdAt: Date
  comments: Comment[]
  approvedBy?: string
  approvedAt?: Date
}

export interface Comment {
  id: string
  author: string
  content: string
  createdAt: Date
}

export interface Commit {
  id: string
  message: string
  author: string
  content: string
  createdAt: Date
}

export type DiffLine = {
  type: 'add' | 'remove' | 'unchanged'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}
