import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getNote } from "@/api/client"
import { cn } from "@/lib/utils"
import { ArrowLeft, Clock, Tag, BookOpen } from "lucide-react"

function freshnessTone(score) {
  if (score >= 0.7) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
  if (score >= 0.4) return "bg-amber-500/15 text-amber-400 border-amber-500/20"
  return "bg-rose-500/15 text-rose-400 border-rose-500/20"
}

const typeColor = {
  decision: "bg-violet-500/15 text-violet-400",
  learning: "bg-sky-500/15 text-sky-400",
  gotcha: "bg-rose-500/15 text-rose-400",
  convention: "bg-amber-500/15 text-amber-400",
  reference: "bg-zinc-500/15 text-zinc-400",
}

export function NoteDetailView({ noteId, onBack, onNoteClick }) {
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!noteId) return
    setLoading(true)
    getNote(noteId)
      .then(setNote)
      .finally(() => setLoading(false))
  }, [noteId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading note…
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Note not found.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/60 px-8 py-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 mb-2 h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="flex-1 text-2xl font-semibold tracking-tight">{note.title}</h1>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px]", freshnessTone(note.freshness_score))}
          >
            <Clock className="mr-1 h-2.5 w-2.5" />
            {Math.round((note.freshness_score || 0) * 100)}% fresh
          </Badge>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {note.type && (
            <Badge className={cn("text-[10px]", typeColor[note.type] || typeColor.reference)}>
              {note.type}
            </Badge>
          )}
          {note.source_modality && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {note.source_modality}
            </Badge>
          )}
          {(note.tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              <Tag className="mr-1 h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 px-8 py-6">
        <div className="markdown-body max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="mb-2 mt-6 text-base font-semibold tracking-tight text-zinc-200 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 mt-4 text-sm font-semibold text-zinc-300">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-sm leading-relaxed text-zinc-300">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 ml-4 list-disc space-y-1 text-sm text-zinc-300">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm text-zinc-300">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
              code: ({ inline, children }) =>
                inline ? (
                  <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-violet-300">{children}</code>
                ) : (
                  <code className="block">{children}</code>
                ),
              pre: ({ children }) => (
                <pre className="mb-3 overflow-x-auto rounded-lg border border-border/60 bg-zinc-900 p-3 text-xs">{children}</pre>
              ),
            }}
          >
            {note.body || ""}
          </ReactMarkdown>
        </div>

        {/* Related notes */}
        {(note.related_notes || []).length > 0 && (
          <div className="mt-8 border-t border-border/60 pt-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Related notes
            </div>
            <div className="flex flex-wrap gap-2">
              {note.related_notes.map((relId) => (
                <Badge
                  key={relId}
                  variant="outline"
                  className="cursor-pointer text-[10px] hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                  onClick={() => onNoteClick(relId)}
                >
                  {relId}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
