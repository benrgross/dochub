import { generateText } from 'ai'

export async function POST(req: Request) {
  try {
    const { document, instructions } = await req.json()
    
    console.log('[v0] AI edit request received', { 
      documentLength: document?.length, 
      instructions: instructions?.substring(0, 100) 
    })

    if (!document || !instructions) {
      return Response.json(
        { error: 'Missing document or instructions' },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      system: `You are a document editor AI. You receive a document and instructions for how to edit it.
Your job is to return the COMPLETE edited document - not just the changes, but the full document with all edits applied.

Rules:
- Return ONLY the edited document content, no explanations or markdown formatting
- Preserve the overall structure unless asked to change it
- Make the requested changes while keeping the rest intact
- If the instruction is unclear, make your best judgment
- Do not add any prefixes like "Here is the edited document:" - just return the document itself`,
      prompt: `## Original Document:
${document}

## Instructions:
${instructions}

Return the complete edited document:`,
    })

    console.log('[v0] AI edit completed', { resultLength: result.text?.length })

    return Response.json({ editedDocument: result.text })
  } catch (error) {
    console.error('[v0] AI edit error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate edits' },
      { status: 500 }
    )
  }
}
