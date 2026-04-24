import { useEffect, useRef, useState } from "react"
import { Mic, Square, FileText, Upload, Loader2, Sparkles, ArrowRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ingestText, captureVoice, captureFile } from "@/api/client"
import { cn } from "@/lib/utils"

function opLabel(op) {
  switch (op.type) {
    case "create_note": return { verb: "Created note", tail: op.frontmatter?.title || op.note_id, tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" }
    case "update_note": return { verb: "Updated note", tail: op.note_id, tone: "bg-blue-500/15 text-blue-400 border-blue-500/20" }
    case "create_topic": return { verb: "Created topic", tail: op.title || op.topic_id, tone: "bg-violet-500/15 text-violet-400 border-violet-500/20" }
    case "update_topic": return { verb: "Updated topic", tail: op.topic_id, tone: "bg-violet-500/15 text-violet-400 border-violet-500/20" }
    case "add_edge": return { verb: "Linked", tail: `${op.from} → ${op.to}`, tone: "bg-sky-500/15 text-sky-400 border-sky-500/20" }
    case "flag_contradiction": return { verb: "Flagged contradiction", tail: op.note_id, tone: "bg-rose-500/15 text-rose-400 border-rose-500/20" }
    default: return { verb: op.type || "Op", tail: "", tone: "bg-secondary text-secondary-foreground" }
  }
}

export function CaptureModal({ open, onOpenChange, onIngested }) {
  const [mode, setMode] = useState("text")
  const [textInput, setTextInput] = useState("")
  const [userNote, setUserNote] = useState("")
  const [status, setStatus] = useState("idle")
  const [result, setResult] = useState(null)
  const [visibleOps, setVisibleOps] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!open) {
      setStatus("idle"); setResult(null); setVisibleOps(0); setErrorMsg("")
      setTextInput(""); setUserNote("")
    }
  }, [open])

  useEffect(() => {
    if (!result?.operations?.length) return
    setVisibleOps(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setVisibleOps(i)
      if (i >= result.operations.length) clearInterval(id)
    }, 260)
    return () => clearInterval(id)
  }, [result])

  async function runIngest(payload) {
    setStatus("ingesting")
    setErrorMsg("")
    try {
      const data = await ingestText(payload)
      setResult(data)
      setStatus("done")
      onIngested?.()
    } catch (e) {
      setErrorMsg(e?.response?.data?.detail || e.message || "Ingest failed.")
      setStatus("error")
    }
  }

  async function submitText() {
    if (!textInput.trim()) return
    await runIngest({ modality: "text", raw_text: textInput, user_note: userNote })
  }

  async function submitVoice(blob) {
    setStatus("transcribing")
    setErrorMsg("")
    try {
      const { raw_text } = await captureVoice(blob)
      if (!raw_text || !raw_text.trim()) {
        setErrorMsg("Empty transcript — say a bit more next time.")
        setStatus("error")
        return
      }
      await runIngest({ modality: "voice", raw_text, user_note: userNote })
    } catch (e) {
      setErrorMsg(e?.response?.data?.detail || e.message || "Voice capture failed.")
      setStatus("error")
    }
  }

  async function submitFile(file) {
    setStatus("extracting")
    setErrorMsg("")
    try {
      const { raw_text } = await captureFile(file)
      if (!raw_text?.trim()) {
        setErrorMsg("No text extracted from file.")
        setStatus("error")
        return
      }
      await runIngest({ modality: "file", raw_text, user_note: userNote || file.name })
    } catch (e) {
      setErrorMsg(e?.response?.data?.detail || e.message || "File capture failed.")
      setStatus("error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Capture knowledge
          </DialogTitle>
          <DialogDescription>
            Dump raw thoughts — Claude will organize them into your brain.
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text"><FileText className="mr-1.5 h-3.5 w-3.5" />Text</TabsTrigger>
              <TabsTrigger value="voice"><Mic className="mr-1.5 h-3.5 w-3.5" />Voice</TabsTrigger>
              <TabsTrigger value="file"><Upload className="mr-1.5 h-3.5 w-3.5" />File</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Dump whatever's in your head. Half-formed thoughts fine."
                className="min-h-[160px] resize-none"
              />
              <Button onClick={submitText} disabled={!textInput.trim()} className="w-full">
                Process <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </TabsContent>

            <TabsContent value="voice">
              <VoiceTab onSubmit={submitVoice} />
            </TabsContent>

            <TabsContent value="file">
              <FileTab onSubmit={submitFile} />
            </TabsContent>
          </Tabs>
        )}

        {(status === "transcribing" || status === "extracting" || status === "ingesting") && (
          <ProcessingStep status={status} />
        )}

        {status === "done" && result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="text-sm leading-relaxed">{result.summary_for_user || "Captured."}</div>
              </div>
            </div>

            {result.operations?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Brain updates
                </div>
                <div className="flex flex-col gap-1.5">
                  {result.operations.slice(0, visibleOps).map((op, i) => {
                    const { verb, tail, tone } = opLabel(op)
                    return (
                      <Badge
                        key={i}
                        variant="outline"
                        className={cn(
                          "w-full justify-start gap-2 px-3 py-2 text-xs font-normal animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
                          tone
                        )}
                      >
                        <span className="font-semibold">{verb}</span>
                        {tail && <span className="truncate opacity-80">· {tail}</span>}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); setResult(null) }}>
                Capture more
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              {errorMsg}
            </div>
            <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProcessingStep({ status }) {
  const label = {
    transcribing: "Transcribing audio…",
    extracting: "Extracting text…",
    ingesting: "Claude is organizing your brain…",
  }[status]
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <div className="mt-3 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function VoiceTab({ onSubmit }) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState("")
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  async function start() {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        onSubmit(blob)
      }
      mr.start()
      recorderRef.current = mr
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch (e) {
      setError(e.message || "Mic access denied.")
    }
  }

  function stop() {
    clearInterval(timerRef.current)
    recorderRef.current?.stop()
    setRecording(false)
  }

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0")
  const secs = (elapsed % 60).toString().padStart(2, "0")

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <button
        onClick={recording ? stop : start}
        className={cn(
          "group relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all",
          recording
            ? "border-rose-500 bg-rose-500/10 text-rose-500"
            : "border-primary bg-primary/10 text-primary hover:scale-105"
        )}
      >
        {recording ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-7 w-7" />}
        {recording && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" />}
      </button>
      <div className="text-center">
        {recording ? (
          <div>
            <div className="font-mono text-xl">{mins}:{secs}</div>
            <div className="mt-1 text-xs text-muted-foreground">Click to stop and ingest</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Click to record</div>
        )}
      </div>
      {error && <div className="text-xs text-destructive-foreground/90">{error}</div>}
    </div>
  )
}

function FileTab({ onSubmit }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFiles(files) {
    if (!files?.length) return
    onSubmit(files[0])
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        Drop a PDF, .md, or .txt file — or click to browse
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.md,.txt"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
