'use client'

import { diffLines as computeDiff } from 'diff'
import { DiffLine } from '@/lib/types'

interface DiffViewerProps {
  original: string
  modified: string
  viewMode?: 'split' | 'unified'
}

export function DiffViewer({ original, modified, viewMode = 'unified' }: DiffViewerProps) {
  const changes = computeDiff(original, modified)
  
  const diffLines: DiffLine[] = []
  let oldLine = 1
  let newLine = 1

  changes.forEach((change) => {
    const lines = change.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || change.value.slice(-1) !== '\n' ? true : i < arr.length - 1)
    
    lines.forEach((line) => {
      if (change.added) {
        diffLines.push({
          type: 'add',
          content: line,
          newLineNumber: newLine++,
        })
      } else if (change.removed) {
        diffLines.push({
          type: 'remove',
          content: line,
          oldLineNumber: oldLine++,
        })
      } else {
        diffLines.push({
          type: 'unchanged',
          content: line,
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        })
      }
    })
  })

  // Calculate stats
  const additions = diffLines.filter(l => l.type === 'add').length
  const deletions = diffLines.filter(l => l.type === 'remove').length

  if (viewMode === 'split') {
    return <SplitView diffLines={diffLines} additions={additions} deletions={deletions} />
  }

  return (
    <div className="font-mono text-sm">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-secondary/50 border-b border-border text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.15_145)]" />
          <span className="text-[oklch(0.75_0.12_145)]">{additions} additions</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.55_0.22_25)]" />
          <span className="text-[oklch(0.75_0.12_25)]">{deletions} deletions</span>
        </span>
      </div>
      
      {/* Diff content */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <tbody>
            {diffLines.map((line, index) => (
              <tr
                key={index}
                className={
                  line.type === 'add'
                    ? 'bg-[oklch(0.18_0.04_145)]'
                    : line.type === 'remove'
                    ? 'bg-[oklch(0.18_0.04_25)]'
                    : 'hover:bg-secondary/30'
                }
              >
                <td className="w-12 px-2 py-0.5 text-right align-top text-[oklch(0.45_0_0)] select-none border-r border-border/50 text-xs">
                  {line.oldLineNumber || ''}
                </td>
                <td className="w-12 px-2 py-0.5 text-right align-top text-[oklch(0.45_0_0)] select-none border-r border-border/50 text-xs">
                  {line.newLineNumber || ''}
                </td>
                <td className="w-6 px-2 py-0.5 text-center align-top select-none text-xs">
                  {line.type === 'add' && <span className="text-[oklch(0.75_0.12_145)]">+</span>}
                  {line.type === 'remove' && <span className="text-[oklch(0.75_0.12_25)]">-</span>}
                </td>
                <td className="px-4 py-0.5 align-top whitespace-pre-wrap wrap-break-word">
                  <span
                    className={
                      line.type === 'add'
                        ? 'text-[oklch(0.75_0.12_145)]'
                        : line.type === 'remove'
                        ? 'text-[oklch(0.75_0.12_25)]'
                        : 'text-foreground'
                    }
                  >
                    {line.content || ' '}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SplitView({ diffLines, additions, deletions }: { diffLines: DiffLine[], additions: number, deletions: number }) {
  const leftLines: (DiffLine | null)[] = []
  const rightLines: (DiffLine | null)[] = []
  
  let i = 0
  while (i < diffLines.length) {
    const line = diffLines[i]
    
    if (line.type === 'unchanged') {
      leftLines.push(line)
      rightLines.push(line)
      i++
    } else if (line.type === 'remove') {
      // Check if next line is an add (modification)
      if (i + 1 < diffLines.length && diffLines[i + 1].type === 'add') {
        leftLines.push(line)
        rightLines.push(diffLines[i + 1])
        i += 2
      } else {
        leftLines.push(line)
        rightLines.push(null)
        i++
      }
    } else if (line.type === 'add') {
      leftLines.push(null)
      rightLines.push(line)
      i++
    }
  }

  return (
    <div className="font-mono text-sm">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-secondary/50 border-b border-border text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.15_145)]" />
          <span className="text-[oklch(0.75_0.12_145)]">{additions} additions</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.55_0.22_25)]" />
          <span className="text-[oklch(0.75_0.12_25)]">{deletions} deletions</span>
        </span>
      </div>
      
      <div className="flex">
        {/* Left side (original) */}
        <div className="flex-1 border-r border-border min-w-0">
          <div className="px-3 py-1.5 bg-secondary/30 text-xs text-muted-foreground border-b border-border">
            Original
          </div>
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {leftLines.map((line, index) => (
                <tr
                  key={index}
                  className={
                    line?.type === 'remove'
                      ? 'bg-[oklch(0.18_0.04_25)]'
                      : line === null
                      ? 'bg-secondary/20'
                      : 'hover:bg-secondary/30'
                  }
                >
                  <td className="w-10 px-2 py-0.5 text-right align-top text-[oklch(0.45_0_0)] select-none border-r border-border/50 text-xs">
                    {line?.oldLineNumber || ''}
                  </td>
                  <td className="px-4 py-0.5 align-top whitespace-pre-wrap wrap-break-word">
                    <span
                      className={
                        line?.type === 'remove'
                          ? 'text-[oklch(0.75_0.12_25)]'
                          : 'text-foreground'
                      }
                    >
                      {line?.content || ' '}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Right side (modified) */}
        <div className="flex-1 min-w-0">
          <div className="px-3 py-1.5 bg-secondary/30 text-xs text-muted-foreground border-b border-border">
            Modified
          </div>
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {rightLines.map((line, index) => (
                <tr
                  key={index}
                  className={
                    line?.type === 'add'
                      ? 'bg-[oklch(0.18_0.04_145)]'
                      : line === null
                      ? 'bg-secondary/20'
                      : 'hover:bg-secondary/30'
                  }
                >
                  <td className="w-10 px-2 py-0.5 text-right align-top text-[oklch(0.45_0_0)] select-none border-r border-border/50 text-xs">
                    {line?.newLineNumber || ''}
                  </td>
                  <td className="px-4 py-0.5 align-top whitespace-pre-wrap wrap-break-word">
                    <span
                      className={
                        line?.type === 'add'
                          ? 'text-[oklch(0.75_0.12_145)]'
                          : 'text-foreground'
                      }
                    >
                      {line?.content || ' '}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
