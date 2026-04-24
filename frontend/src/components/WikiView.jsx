import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function freshnessTone(score) {
  if (score >= 0.7) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
  if (score >= 0.4) return "bg-amber-500/15 text-amber-400 border-amber-500/20"
  return "bg-rose-500/15 text-rose-400 border-rose-500/20"
}

function coverageDot(score) {
  if (score >= 0.7) return "bg-emerald-500"
  if (score >= 0.4) return "bg-amber-500"
  return "bg-rose-500"
}

function BrainStats({ index }) {
  const noteCount = Object.keys(index?.notes || {}).length
  const topicCount = Object.keys(index?.topics || {}).length
  const staleCount = Object.values(index?.notes || {}).filter((n) => n.freshness_score <= 0.4).length
  const avgCoverage =
    Object.values(index?.topics || {}).reduce((s, t) => s + (t.coverage_score || 0.5), 0) /
    Math.max(topicCount, 1)

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>🧠 <strong className="text-foreground">{noteCount}</strong> notes</span>
      <span>·</span>
      <span><strong className="text-foreground">{topicCount}</strong> topics</span>
      {staleCount > 0 && (
        <>
          <span>·</span>
          <span className="text-amber-400"><strong>{staleCount}</strong> stale</span>
        </>
      )}
      <span>·</span>
      <span><strong className="text-foreground">{Math.round(avgCoverage * 100)}%</strong> avg coverage</span>
    </div>
  )
}

export function WikiView({ index, activeTopic, setActiveTopic, onNoteClick }) {
  const topics = Object.entries(index?.topics || {})
  const activeTopicData = activeTopic ? index?.topics?.[activeTopic] : null

  if (activeTopicData) {
    const notes = (activeTopicData.note_ids || [])
      .map((nid) => ({ id: nid, ...index.notes[nid] }))
      .filter((n) => n.title)
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border/60 px-8 py-5">
          <button onClick={() => setActiveTopic(null)} className="text-xs text-muted-foreground hover:text-foreground">
            ← All topics
          </button>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{activeTopicData.title}</h1>
          {activeTopicData.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{activeTopicData.description}</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="group cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => onNoteClick?.(note.id)}
              >
                <CardHeader className="gap-2 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{note.title}</CardTitle>
                    <Badge variant="outline" className={cn("shrink-0 text-[10px]", freshnessTone(note.freshness_score))}>
                      {Math.round((note.freshness_score || 0) * 100)}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">{note.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="line-clamp-3 text-xs leading-relaxed">{note.preview}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border/60 px-8 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">Your Brain</h1>
        <div className="mt-1.5">
          <BrainStats index={index} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topics.map(([tid, t]) => (
            <Card
              key={tid}
              onClick={() => setActiveTopic(tid)}
              className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", coverageDot(t.coverage_score ?? 0.5))} />
                    <CardTitle className="truncate text-base">{t.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{t.note_ids?.length || 0} notes</Badge>
                </div>
                <CardDescription className="line-clamp-2 text-xs">{t.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
