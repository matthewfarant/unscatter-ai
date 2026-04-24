import { BookOpen, Network } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { api } from "@/api/client"

export function Sidebar({ index, view, setView, activeTopic, setActiveTopic }) {
  const [daemonConnected, setDaemonConnected] = useState(false)

  useEffect(() => {
    const check = () =>
      api.get("/api/daemon/ping")
        .then(() => setDaemonConnected(true))
        .catch(() => setDaemonConnected(false))
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])
  const topics = Object.entries(index?.topics || {})

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-background/40">
      <div className="space-y-1 p-3">
        <SidebarButton
          active={view === "wiki"}
          onClick={() => setView("wiki")}
          icon={<BookOpen className="h-4 w-4" />}
          label="Wiki"
        />
        <SidebarButton
          active={view === "graph"}
          onClick={() => setView("graph")}
          icon={<Network className="h-4 w-4" />}
          label="Graph"
        />
      </div>
      <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Topics
      </div>
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-border/50 bg-background/60 px-3 py-2">
        <span className={cn("h-2 w-2 rounded-full shrink-0", daemonConnected ? "bg-green-500" : "bg-yellow-500")} />
        <span className="text-[11px] text-muted-foreground leading-tight">
          {daemonConnected ? "Menu bar connected" : "Menu bar not running"}
        </span>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {topics.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No topics yet. Capture something to begin.
            </div>
          )}
          {topics.map(([tid, t]) => {
            const count = t.note_ids?.length || 0
            return (
              <button
                key={tid}
                onClick={() => { setActiveTopic(tid); setView("wiki") }}
                className={cn(
                  "group flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent/40",
                  activeTopic === tid && "bg-accent/50 text-foreground"
                )}
              >
                <span className="truncate">{t.title}</span>
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{count}</Badge>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}

function SidebarButton({ active, onClick, icon, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
      {disabled && <span className="ml-auto text-[10px] uppercase tracking-wider">soon</span>}
    </button>
  )
}
