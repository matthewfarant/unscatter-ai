import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { postChat, postCorrection } from "@/api/client"
import { cn } from "@/lib/utils"
import { Send, Brain, Loader2, CheckCircle2 } from "lucide-react"

function renderWithCitations(text, onNoteClick) {
  const parts = text.split(/(\[note_\w+\])/g)
  return parts.map((part, i) => {
    const match = part.match(/^\[(note_\w+)\]$/)
    if (match) {
      return (
        <Badge
          key={i}
          variant="outline"
          className="mx-0.5 inline-flex cursor-pointer text-[10px] hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
          onClick={() => onNoteClick(match[1])}
        >
          {match[1]}
        </Badge>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function CorrectionRow({ targetNoteId, onCorrected }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    try {
      await postCorrection({ note_id: targetNoteId, correction: text.trim() })
      setDone(true)
      onCorrected()
    } catch (e) {
      console.error("Correction failed", e)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Note updated.
      </div>
    )
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-2 h-6 text-[11px]"
        onClick={() => setOpen(true)}
      >
        Update {targetNoteId}
      </Button>
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      <Textarea
        autoFocus
        rows={2}
        placeholder="What's the correction?"
        className="text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-6 text-[11px]" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function SuggestedQuestions({ index, onAsk }) {
  const topics = Object.values(index?.topics || {}).slice(0, 2)
  const questions = topics.map((t) => `What are the gotchas in ${t.title.toLowerCase()}?`)
  const all = ["How do I capture a voice note?", ...questions].slice(0, 3)

  return (
    <div className="px-0 pb-3 flex flex-col gap-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Try asking</div>
      {all.map((q, i) => (
        <button
          key={i}
          onClick={() => onAsk(q)}
          className="text-left text-xs rounded-md border border-border/50 px-3 py-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  )
}

export function ChatPanel({ onNoteClick, onCorrected, index }) {
  const [history, setHistory] = useState([])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [history, loading])

  async function send() {
    await sendRaw(question.trim())
  }

  async function sendRaw(q) {
    if (!q || loading) return
    setQuestion("")
    setLoading(true)

    const userMsg = { role: "user", content: q }
    setHistory((h) => [...h, userMsg])

    try {
      const res = await postChat({
        question: q,
        history: history.map((m) => ({
          user: m.role === "user" ? m.content : "",
          assistant: m.role === "assistant" ? m.content : "",
        })).filter((m) => m.user || m.assistant),
      })
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: res.answer,
          cited_note_ids: res.cited_note_ids || [],
          suggests_edit: res.suggests_edit,
          edit_target: res.edit_target_note_id,
          follow_up_questions: res.follow_up_questions || [],
        },
      ])
    } catch (e) {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: "Error: " + (e.message || "Unknown"), cited_note_ids: [] },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border/60 bg-zinc-950">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Ask your brain</span>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 px-4 py-4">
        {history.length === 0 && (
          <div className="space-y-4">
            <p className="text-center text-xs text-muted-foreground">
              Ask anything. Claude answers from your notes.
            </p>
            {index && <SuggestedQuestions index={index} onAsk={(q) => sendRaw(q)} />}
          </div>
        )}
        <div className="space-y-4">
          {history.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "text-sm leading-relaxed",
                msg.role === "user" ? "text-zinc-100" : "text-zinc-300"
              )}
            >
              {msg.role === "user" ? (
                <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-xs">{msg.content}</div>
              ) : (
                <div>
                  <div className="text-xs leading-relaxed">
                    {renderWithCitations(msg.content, onNoteClick)}
                  </div>
                  {msg.suggests_edit && msg.edit_target && (
                    <CorrectionRow
                      targetNoteId={msg.edit_target}
                      onCorrected={onCorrected}
                    />
                  )}
                  {msg.follow_up_questions && msg.follow_up_questions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {msg.follow_up_questions.map((fq, fi) => (
                        <button
                          key={fi}
                          onClick={() => sendRaw(fq)}
                          className="text-left text-[11px] rounded border border-border/50 px-2.5 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                        >
                          {fq}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking…
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/60 p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            sendRaw(question.trim())
          }}
        >
          <Input
            placeholder="Ask a question…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="h-8 text-xs"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={loading || !question.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
