import { useCallback, useEffect, useState } from "react"
import { TopBar } from "@/components/TopBar"
import { Sidebar } from "@/components/Sidebar"
import { WikiView } from "@/components/WikiView"
import { NoteDetailView } from "@/components/NoteDetailView"
import { GraphView } from "@/components/GraphView"
import { ChatPanel } from "@/components/ChatPanel"
import { CaptureModal } from "@/components/CaptureModal"
import { ExportModal } from "@/components/ExportModal"
import { getIndex } from "@/api/client"

export default function App() {
  const [index, setIndex] = useState(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [view, setView] = useState("wiki")
  const [activeTopic, setActiveTopic] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const [loadError, setLoadError] = useState("")

  const refresh = useCallback(async () => {
    try {
      setIndex(await getIndex())
      setLoadError("")
    } catch (e) {
      setLoadError(e.message || "Failed to reach backend. Is uvicorn running on 127.0.0.1:8000?")
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function openNote(noteId) {
    setActiveNote(noteId)
    setView("wiki")
  }

  function closeNote() {
    setActiveNote(null)
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar
        onCaptureClick={() => setCaptureOpen(true)}
        onExportClick={() => setExportOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          index={index}
          view={view}
          setView={(v) => {
            setView(v)
            setActiveNote(null)
          }}
          activeTopic={activeTopic}
          setActiveTopic={(tid) => {
            setActiveTopic(tid)
            setActiveNote(null)
            setView("wiki")
          }}
        />

        {/* Main content area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {loadError ? (
            <div className="m-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              {loadError}
            </div>
          ) : view === "graph" ? (
            <GraphView onNoteClick={openNote} />
          ) : activeNote ? (
            <NoteDetailView
              noteId={activeNote}
              onBack={closeNote}
              onNoteClick={openNote}
            />
          ) : (
            <WikiView
              index={index}
              activeTopic={activeTopic}
              setActiveTopic={setActiveTopic}
              onNoteClick={openNote}
            />
          )}
        </main>

        {/* Permanent chat panel */}
        <ChatPanel
          onNoteClick={openNote}
          onCorrected={refresh}
          index={index}
        />
      </div>

      <CaptureModal
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onIngested={refresh}
      />
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </div>
  )
}
