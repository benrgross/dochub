import { createClient } from '@/lib/supabase/client'
import type { ChangeRequest, Comment, Commit } from './types'

const supabase = createClient()

// Document ID - we'll use a single document for this demo
let DOCUMENT_ID: string | null = null

export async function initializeDocument() {
  // Check if document exists
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('id')
    .limit(1)
  
  if (existingDocs && existingDocs.length > 0) {
    DOCUMENT_ID = existingDocs[0].id
    return DOCUMENT_ID
  }
  
  // Create initial document
  const { data: newDoc, error } = await supabase
    .from('documents')
    .insert({
      title: 'Project Requirements Document',
      content: `# Project Requirements Document

## Overview
This document outlines the requirements for our new product launch. Please review and submit changes through the change request system.

## Goals
1. Launch MVP by Q2 2024
2. Achieve 1000 active users in first month
3. Maintain 99.9% uptime

## Features
- User authentication
- Dashboard with analytics
- Real-time notifications
- Export functionality

## Timeline
- Phase 1: Core features (4 weeks)
- Phase 2: Beta testing (2 weeks)
- Phase 3: Launch (1 week)

## Team
- Product Manager: Sarah
- Lead Developer: Alex
- Designer: Jordan`,
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('[v0] Error creating document:', error)
    throw error
  }
  
  DOCUMENT_ID = newDoc.id
  return DOCUMENT_ID
}

export async function getDocumentId() {
  if (!DOCUMENT_ID) {
    await initializeDocument()
  }
  return DOCUMENT_ID!
}

export async function fetchDocument() {
  const docId = await getDocumentId()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()
  
  if (error) {
    console.error('[v0] Error fetching document:', error)
    throw error
  }
  
  return data
}

export async function updateDocument(content: string) {
  const docId = await getDocumentId()
  const { error } = await supabase
    .from('documents')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', docId)
  
  if (error) {
    console.error('[v0] Error updating document:', error)
    throw error
  }
}

export async function fetchChangeRequests(): Promise<ChangeRequest[]> {
  const docId = await getDocumentId()
  const { data, error } = await supabase
    .from('change_requests')
    .select('*, comments(*)')
    .eq('document_id', docId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[v0] Error fetching change requests:', error)
    throw error
  }
  
  return (data || []).map(cr => ({
    id: cr.id,
    title: cr.title,
    description: cr.description || '',
    author: cr.author,
    status: cr.status as ChangeRequest['status'],
    originalContent: cr.original_content,
    proposedContent: cr.proposed_content,
    createdAt: new Date(cr.created_at),
    approvedBy: cr.approved_by || undefined,
    approvedAt: cr.approved_at ? new Date(cr.approved_at) : undefined,
    comments: (cr.comments || []).map((c: { id: string; author: string; content: string; created_at: string }) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      createdAt: new Date(c.created_at),
    })),
  }))
}

export async function createChangeRequest(
  title: string,
  description: string,
  author: string,
  originalContent: string,
  proposedContent: string
): Promise<string> {
  const docId = await getDocumentId()
  const { data, error } = await supabase
    .from('change_requests')
    .insert({
      document_id: docId,
      title,
      description,
      author,
      original_content: originalContent,
      proposed_content: proposedContent,
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('[v0] Error creating change request:', error)
    throw error
  }
  
  return data.id
}

export async function updateChangeRequestStatus(
  id: string,
  status: ChangeRequest['status'],
  approvedBy?: string
) {
  const updates: Record<string, unknown> = { status }
  if (approvedBy) {
    updates.approved_by = approvedBy
    updates.approved_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('change_requests')
    .update(updates)
    .eq('id', id)
  
  if (error) {
    console.error('[v0] Error updating change request:', error)
    throw error
  }
}

export async function addCommentToChangeRequest(
  changeRequestId: string,
  author: string,
  content: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      change_request_id: changeRequestId,
      author,
      content,
    })
    .select('*')
    .single()
  
  if (error) {
    console.error('[v0] Error adding comment:', error)
    throw error
  }
  
  return {
    id: data.id,
    author: data.author,
    content: data.content,
    createdAt: new Date(data.created_at),
  }
}

export async function fetchCommits(): Promise<Commit[]> {
  const docId = await getDocumentId()
  const { data, error } = await supabase
    .from('commits')
    .select('*')
    .eq('document_id', docId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[v0] Error fetching commits:', error)
    throw error
  }
  
  return (data || []).map(c => ({
    id: c.id,
    message: c.message,
    author: c.author,
    createdAt: new Date(c.created_at),
  }))
}

export async function createCommit(message: string, author: string, changeRequestId?: string): Promise<Commit> {
  const docId = await getDocumentId()
  const { data, error } = await supabase
    .from('commits')
    .insert({
      document_id: docId,
      message,
      author,
      change_request_id: changeRequestId,
    })
    .select('*')
    .single()
  
  if (error) {
    console.error('[v0] Error creating commit:', error)
    throw error
  }
  
  return {
    id: data.id,
    message: data.message,
    author: data.author,
    createdAt: new Date(data.created_at),
  }
}
