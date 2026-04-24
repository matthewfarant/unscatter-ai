import { useCallback, useEffect, useRef, useState } from "react"
import ForceGraph2D from "react-force-graph-2d"
import { getGraph } from "@/api/client"
import { Button } from "@/components/ui/button"

const TYPE_COLORS = {
  decision: "#3B82F6",
  learning: "#22C55E",
  gotcha: "#F97316",
  convention: "#8B5CF6",
  reference: "#94A3B8",
}

function freshnessColor(s) {
  if (s > 0.7) return "#22C55E"
  if (s > 0.4) return "#EAB308"
  return "#EF4444"
}

function coverageColor(s) {
  if (s > 0.6) return "#22C55E"
  if (s > 0.3) return "#EAB308"
  return "#EF4444"
}

export function GraphView({ onNoteClick }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [onboardingPath, setOnboardingPath] = useState([])
  const [overlay, setOverlay] = useState("coverage")
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 })
  const containerRef = useRef(null)
  const fgRef = useRef()

  useEffect(() => {
    getGraph().then((data) => {
      const links = (data.edges || [])
        .filter((e) => e.from && e.to)
        .map((e) => ({
          source: e.from,
          target: e.to.startsWith("topic:") ? e.to.slice(6) : e.to,
          type: e.type,
          strength: e.strength || 0.5,
        }))
      setGraphData({ nodes: data.nodes || [], links })
      setOnboardingPath(data.onboarding_path || [])
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const getNodeColor = useCallback(
    (node) => {
      if (node.group === "topic") {
        return overlay === "coverage"
          ? coverageColor(node.coverage ?? 0.5)
          : "#71717A"
      }
      if (overlay === "freshness") return freshnessColor(node.freshness ?? 1.0)
      if (overlay === "onboarding" && onboardingPath.includes(node.id))
        return "#8B5CF6"
      return TYPE_COLORS[node.type] ?? "#94A3B8"
    },
    [overlay, onboardingPath]
  )

  const getNodeRadius = useCallback(
    (node) => (node.group === "topic" ? Math.max(8, (node.note_count || 1) * 3) : 5),
    []
  )

  const getLinkColor = useCallback(
    (link) => {
      if (overlay === "connections" && link.type === "related" && link.strength > 0.6)
        return "#8B5CF6"
      if (overlay === "onboarding") {
        const srcId = link.source?.id ?? link.source
        const tgtId = link.target?.id ?? link.target
        if (onboardingPath.includes(srcId) && onboardingPath.includes(tgtId))
          return "#8B5CF6"
      }
      return "rgba(113,113,122,0.25)"
    },
    [overlay, onboardingPath]
  )

  const getLinkWidth = useCallback(
    (link) =>
      overlay === "connections" && link.type === "related" && link.strength > 0.6
        ? 2
        : 0.5,
    [overlay]
  )

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const r = getNodeRadius(node)
      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
      ctx.fillStyle = getNodeColor(node)
      ctx.fill()

      if (node.group === "topic" || globalScale > 2.5) {
        const label = node.label || node.id
        const fontSize = Math.max(7, 10 / globalScale)
        ctx.font = `${fontSize}px sans-serif`
        ctx.fillStyle = "rgba(255,255,255,0.75)"
        ctx.textAlign = "center"
        ctx.fillText(label, node.x, node.y + r + fontSize * 1.2)
      }
    },
    [getNodeColor, getNodeRadius]
  )

  const nodePointerAreaPaint = useCallback(
    (node, color, ctx) => {
      const r = getNodeRadius(node) + 4
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
      ctx.fill()
    },
    [getNodeRadius]
  )

  const OVERLAYS = ["coverage", "freshness", "connections", "onboarding"]

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex gap-2 border-b border-border/60 px-4 py-3">
          {OVERLAYS.map((o) => (
            <Button
              key={o}
              size="sm"
              variant={overlay === o ? "default" : "outline"}
              className="h-7 capitalize text-xs"
              onClick={() => setOverlay(o)}
            >
              {o}
            </Button>
          ))}
        </div>

        <div ref={containerRef} className="flex-1 bg-zinc-950">
          {graphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#09090b"
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={nodePointerAreaPaint}
              nodeLabel={(n) => n.label || n.id}
              linkColor={getLinkColor}
              linkWidth={getLinkWidth}
              onNodeClick={(node) => {
                if (node.group === "note" && onNoteClick) onNoteClick(node.id)
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading graph…
            </div>
          )}
        </div>
      </div>

      <ActionPanel
        overlay={overlay}
        graphData={graphData}
        onboardingPath={onboardingPath}
      />
    </div>
  )
}

function ActionPanel({ overlay, graphData, onboardingPath }) {
  const topics = graphData.nodes.filter((n) => n.group === "topic")
  const notes = graphData.nodes.filter((n) => n.group === "note")

  const panelCls =
    "w-64 shrink-0 border-l border-border/60 p-4 flex flex-col gap-3 overflow-y-auto"
  const sectionLabel =
    "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
  const card =
    "rounded-md border border-border/60 px-3 py-2 text-xs"

  if (overlay === "coverage") {
    const gaps = topics
      .filter((t) => (t.coverage ?? 0.5) < 0.45)
      .slice(0, 4)
    return (
      <div className={panelCls}>
        <div className="text-sm font-semibold">Coverage Map</div>
        <div className="text-xs text-muted-foreground">
          Green = well-documented. Red = knowledge gap.
        </div>
        <div className="flex gap-2 text-[11px]">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />covered</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />partial</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />gap</span>
        </div>
        {gaps.length > 0 ? (
          <div className="space-y-2">
            <div className={sectionLabel}>Needs more knowledge</div>
            {gaps.map((t) => (
              <div key={t.id} className={card}>
                <div className="font-medium">{t.label}</div>
                <div className="mt-0.5 text-muted-foreground">
                  coverage {Math.round((t.coverage ?? 0) * 100)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">All topics well-covered.</div>
        )}
      </div>
    )
  }

  if (overlay === "freshness") {
    const stale = notes
      .filter((n) => (n.freshness ?? 1) < 0.5)
      .slice(0, 4)
    return (
      <div className={panelCls}>
        <div className="text-sm font-semibold">Freshness Map</div>
        <div className="text-xs text-muted-foreground">
          Green = recently verified. Red = may be out of date.
        </div>
        <div className="flex gap-2 text-[11px]">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />fresh</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />aging</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />stale</span>
        </div>
        {stale.length > 0 ? (
          <div className="space-y-2">
            <div className={sectionLabel}>{stale.length} stale note{stale.length !== 1 ? "s" : ""}</div>
            {stale.map((n) => (
              <div key={n.id} className={card}>
                <div className="truncate font-medium">{n.label}</div>
                <div className="mt-0.5 text-muted-foreground">
                  freshness {Math.round((n.freshness ?? 0) * 100)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">All notes fresh.</div>
        )}
      </div>
    )
  }

  if (overlay === "connections") {
    const crossLinks = (graphData.links || [])
      .filter((l) => l.type === "related" && (l.strength ?? 0) > 0.6)
      .slice(0, 4)
    return (
      <div className={panelCls}>
        <div className="text-sm font-semibold">Connection Finder</div>
        <div className="text-xs text-muted-foreground">
          Purple edges = strong cross-topic relationships. These are hidden insights.
        </div>
        {crossLinks.length > 0 ? (
          <div className="space-y-2">
            <div className={sectionLabel}>Strong cross-links</div>
            {crossLinks.map((l, i) => {
              const src = l.source?.id ?? l.source
              const tgt = l.target?.id ?? l.target
              const srcNode = graphData.nodes.find((n) => n.id === src)
              const tgtNode = graphData.nodes.find((n) => n.id === tgt)
              return (
                <div key={i} className={card}>
                  <div className="truncate text-muted-foreground">
                    {srcNode?.label ?? src}
                  </div>
                  <div className="text-center text-primary">↕</div>
                  <div className="truncate text-muted-foreground">
                    {tgtNode?.label ?? tgt}
                  </div>
                  <div className="mt-1 font-medium">
                    strength {Math.round((l.strength ?? 0) * 100)}%
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No strong cross-topic links yet. Add more notes across topics.
          </div>
        )}
      </div>
    )
  }

  if (overlay === "onboarding") {
    return (
      <div className={panelCls}>
        <div className="text-sm font-semibold">Onboarding Path</div>
        <div className="text-xs text-muted-foreground">
          AI-suggested reading order for new team members. Purple = on the path.
        </div>
        {onboardingPath.length > 0 ? (
          <div className="space-y-1">
            <div className={sectionLabel}>Recommended order</div>
            {onboardingPath.slice(0, 6).map((nid, i) => {
              const node = graphData.nodes.find((n) => n.id === nid)
              return (
                <div key={nid} className={`${card} flex items-start gap-2`}>
                  <span className="shrink-0 font-bold text-primary">{i + 1}.</span>
                  <span className="truncate">{node?.label ?? nid}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No onboarding path defined yet. Add more notes to generate one.
          </div>
        )}
      </div>
    )
  }

  return null
}
