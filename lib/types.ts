export interface DocumentRow {
  id: string
  title: string
  content: string
  pinned: boolean
  createdAt: Date
  updatedAt: Date
}

export type ChangeRequestStatus = 'open' | 'approved' | 'merged' | 'closed'

export interface ToolCallRecord {
  name: 'proposeReplacement' | 'proposeInsertion'
  input: Record<string, unknown>
  rationale?: string
}

export interface AiMetadata {
  model: string
  provider?: string
  instructions: string
  toolCalls: ToolCallRecord[]
}

export interface ChangeRequest {
  id: string
  documentId: string
  title: string
  description: string
  author: string
  status: ChangeRequestStatus
  originalContent: string
  proposedContent: string
  aiMetadata: AiMetadata | null
  createdAt: Date
  approvedBy?: string
  approvedAt?: Date
  comments: Comment[]
}

export interface Comment {
  id: string
  changeRequestId: string
  author: string
  content: string
  createdAt: Date
}

export interface Commit {
  id: string
  documentId: string
  changeRequestId: string | null
  message: string
  author: string
  contentSnapshot: string
  createdAt: Date
}

export type DiffLine = {
  type: 'add' | 'remove' | 'unchanged'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}
