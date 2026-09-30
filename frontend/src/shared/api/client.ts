const BASE = "/api"

export interface Chunk {
  source: string
  chunk_index: number
  content: string
  score: number
}

export interface HealthResult {
  status: string
  chunks: number
}

export interface SearchResponse {
  question: string
  results: Chunk[]
}

export interface QueryResponse {
  answer: string
  sources: Chunk[]
}

export interface IngestResponse {
  source: string
  chunks: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = (await res.text()).trim()
    const detail = parseDetail(text)
    throw new Error(
      detail ??
        (text
          ? `${path} 返回 ${res.status}：${text.slice(0, 200)}`
          : `后端未响应，${path} 返回 ${res.status}`)
    )
  }
  return res.json() as Promise<T>
}

// FastAPI 的错误体是 {"detail":"..."}，代理失败时返回的是纯文本或 HTML
function parseDetail(text: string): string | null {
  try {
    const data = JSON.parse(text) as { detail?: unknown }
    return typeof data.detail === "string" ? data.detail : null
  } catch {
    return null
  }
}

function json(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}

export function getHealth() {
  return request<HealthResult>("/health")
}

export function search(question: string, top_k?: number) {
  return request<SearchResponse>("/search", json({ question, top_k }))
}

export function query(question: string, top_k?: number) {
  return request<QueryResponse>("/query", json({ question, top_k }))
}

export function ingest(source: string, text: string) {
  return request<IngestResponse>("/ingest", json({ source, text }))
}
