import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckSquare, Download, FileText, Loader2, Square, Zap } from "lucide-react"
import { exportSkills, exportLiveSkill, getExportTopics } from "@/api/client"
import { Separator } from "@/components/ui/separator"

export function ExportModal({ open, onOpenChange }) {
  const [topics, setTopics] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState([])
  const [preview, setPreview] = useState(null)
  const [liveSkillLoading, setLiveSkillLoading] = useState(false)

  useEffect(() => {
    if (open && topics.length === 0) {
      getExportTopics().then((d) => setTopics(d.topics || []))
    }
    if (!open) {
      setSkills([])
      setPreview(null)
      setSelected(new Set())
    }
  }, [open])

  function toggle(tid) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(tid) ? next.delete(tid) : next.add(tid)
      return next
    })
  }

  async function handleGenerate() {
    if (!selected.size) return
    setLoading(true)
    setSkills([])
    setPreview(null)
    try {
      const data = await exportSkills(Array.from(selected))
      const generated = data.skills || []
      setSkills(generated)
      if (generated.length > 0) setPreview(generated[0])
    } finally {
      setLoading(false)
    }
  }

  function downloadAll() {
    for (const skill of skills) {
      const blob = new Blob([skill.content], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = skill.filename.replace("/", "-")
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h + flex-col so the inner flex-1 children can shrink properly */}
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        <DialogHeader className="shrink-0">
          <DialogTitle>Export to Claude Skills</DialogTitle>
          <DialogDescription>
            Generate SKILL.md files Claude Code loads automatically — giving your AI tools full context about your team's conventions.
          </DialogDescription>
        </DialogHeader>

        {/* min-h-0 is the key: allows flex children to shrink below content size */}
        <div className="flex min-h-0 flex-1 gap-4">

          {/* Left: topic checklist */}
          <div className="flex w-48 shrink-0 flex-col gap-3 min-h-0">
            <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select Topics
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-1">
                {topics.map((t) => {
                  const on = selected.has(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggle(t.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40 ${on ? "bg-accent/50" : ""}`}
                    >
                      {on ? (
                        <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {t.note_count} note{t.note_count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
            <Button
              size="sm"
              className="shrink-0"
              onClick={handleGenerate}
              disabled={!selected.size || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                `Generate ${selected.size ? selected.size + " " : ""}Skill${selected.size !== 1 ? "s" : ""}`
              )}
            </Button>

            <Separator className="my-1" />

            <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live Access
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-primary/40 text-primary hover:bg-primary/10"
              onClick={async () => {
                setLiveSkillLoading(true)
                try {
                  const data = await exportLiveSkill()
                  const blob = new Blob([data.content], { type: "text/markdown" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "unscatter-brain-SKILL.md"
                  a.click()
                  URL.revokeObjectURL(url)
                  setPreview({ topic_id: "live", filename: "unscatter-brain/SKILL.md", content: data.content })
                } finally {
                  setLiveSkillLoading(false)
                }
              }}
              disabled={liveSkillLoading}
            >
              {liveSkillLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="mr-1.5 h-3.5 w-3.5" />
              )}
              Live Brain Skill
            </Button>
          </div>

          {/* Right: preview pane */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            {/* Skill tab switcher + download */}
            {skills.length > 0 && (
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <button
                      key={s.topic_id}
                      onClick={() => setPreview(s)}
                      className={`rounded border px-2 py-1 text-xs transition-colors ${
                        preview?.topic_id === s.topic_id
                          ? "border-primary text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.filename}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={downloadAll} className="shrink-0">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download All
                </Button>
              </div>
            )}

            {/* Preview area — flex-1 + min-h-0 so it fills remaining space */}
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border/60 bg-zinc-950">
              {loading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <div className="text-sm">Claude is writing your skill{selected.size !== 1 ? "s" : ""}…</div>
                  <div className="text-xs">This takes 10–20 seconds per topic.</div>
                </div>
              ) : preview ? (
                <ScrollArea className="flex-1">
                  <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-zinc-300">
                    {preview.content}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <FileText className="h-8 w-8 opacity-30" />
                  <div className="text-sm">Select topics then click Generate</div>
                  <div className="max-w-xs text-center text-xs">
                    Each SKILL.md tells Claude exactly when to load it and what conventions to follow.
                  </div>
                </div>
              )}
            </div>

            {/* Tutorial block — only after generation */}
            {skills.length > 0 && (
              <div className="shrink-0 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs">
                <div className="text-sm font-semibold text-foreground">
                  How to wire this into Claude Code
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p>1. Download and drop into your repo's <code className="text-primary">.claude/skills/</code> directory.</p>
                  <p>2. Claude Code auto-discovers skills — no config needed.</p>
                  <p>3. When Claude touches relevant files, it loads the skill and applies your team's conventions.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
