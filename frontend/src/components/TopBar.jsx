import { Brain, Plus, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopBar({ onCaptureClick, onExportClick }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">Unscatter</div>
          <div className="text-[11px] text-muted-foreground">your team's living brain</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExportClick}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>
        <Button size="sm" onClick={onCaptureClick}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Capture
        </Button>
      </div>
    </header>
  )
}
