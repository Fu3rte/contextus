import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  InformationCircleIcon,
  Loading03Icon,
  QuoteIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { AskForm } from "@/components/ask-form"
import { ChunkList } from "@/components/chunk-list"
import { RequestErrorAlert } from "@/components/request-error-alert"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { search } from "@/lib/api"
import type { SearchResponse } from "@/lib/api"

const SEARCH_SAMPLES = [
  "pgvector 用什么运算符算余弦距离？",
  "为什么要对文档做切分？",
  "调休几天内有效？",
  "离职要提前多久提交申请？",
]

interface Ask {
  question: string
  topK: number
}

type Phase =
  | { status: "idle" }
  | { status: "pending"; ask: Ask }
  | { status: "error"; ask: Ask; message: string }
  | { status: "success"; ask: Ask; result: SearchResponse }

function AskLine({ ask }: { ask: Ask }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <HugeiconsIcon icon={QuoteIcon} className="mt-0.5 size-3.5 shrink-0" />
      <span className="break-all">
        本次问题：{ask.question} · top_k = {ask.topK}
      </span>
    </p>
  )
}

function IdleCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={Search01Icon} className="size-4 text-muted-foreground" />
          等待检索
        </CardTitle>
        <CardDescription>左侧输入问题，或点示例问题</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-relaxed text-muted-foreground">
          问题向量化 → pgvector 余弦召回 top_k 片段 → 按相似度倒序列出候选，全程不调用对话模型
        </p>
      </CardContent>
    </Card>
  )
}

function PendingView({ ask }: { ask: Ask }) {
  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />
        正在向量化问题并扫描全表…
      </p>
      <AskLine ask={ask} />
      <div className="grid gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

function SuccessView({ ask, results }: { ask: Ask; results: SearchResponse["results"] }) {
  return (
    <div className="grid gap-4">
      <AskLine ask={ask} />
      {results.length === 0 ? (
        <Alert>
          <HugeiconsIcon icon={InformationCircleIcon} />
          <AlertTitle>无召回结果</AlertTitle>
          <AlertDescription>
            没有召回任何片段，先用 uv run rag ingest data 入库
          </AlertDescription>
        </Alert>
      ) : (
        <ChunkList chunks={results} />
      )}
    </div>
  )
}

export function SearchPanel() {
  const [phase, setPhase] = useState<Phase>({ status: "idle" })

  async function run(question: string, topK: number) {
    const ask = { question, topK }
    setPhase({ status: "pending", ask })
    try {
      const result = await search(question, topK)
      setPhase({ status: "success", ask, result })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPhase({ status: "error", ask, message })
      toast.error(message)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <AskForm
        mode="search"
        pending={phase.status === "pending"}
        samples={SEARCH_SAMPLES}
        onSubmit={run}
      />
      <div className="grid gap-4">
        {phase.status === "idle" && <IdleCard />}
        {phase.status === "pending" && <PendingView ask={phase.ask} />}
        {phase.status === "error" && (
          <RequestErrorAlert title="请求失败" message={phase.message} />
        )}
        {phase.status === "success" && (
          <SuccessView ask={phase.ask} results={phase.result.results} />
        )}
      </div>
    </div>
  )
}
