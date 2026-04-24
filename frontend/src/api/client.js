import axios from "axios"

// VITE_API_URL is set at build time for deployed environments; falls back to local.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 120000,
})

export async function getIndex() {
  const { data } = await api.get("/api/brain/index")
  return data
}

export async function ingestText({ modality, raw_text, user_note = "" }) {
  const { data } = await api.post("/api/ingest", { modality, raw_text, user_note })
  return data
}

export async function captureVoice(blob) {
  const form = new FormData()
  form.append("file", blob, "capture.webm")
  const { data } = await api.post("/api/capture/voice", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function captureFile(file) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await api.post("/api/capture/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function getNote(noteId) {
  const { data } = await api.get(`/api/brain/notes/${noteId}`)
  return data
}

export async function postChat({ question, history }) {
  const { data } = await api.post("/api/chat", { question, history })
  return data
}

export async function postCorrection({ note_id, correction }) {
  const { data } = await api.post("/api/chat/apply_correction", { note_id, correction })
  return data
}

export async function getGraph() {
  const { data } = await api.get("/api/brain/graph")
  return data
}

export async function getExportTopics() {
  const { data } = await api.get("/api/export/topics")
  return data
}

export async function exportSkills(topic_ids) {
  const { data } = await api.post("/api/export/skills", { topic_ids })
  return data
}

export async function exportLiveSkill() {
  const { data } = await api.get("/api/export/live-skill")
  return data
}
