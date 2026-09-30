import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiSparklesIcon,
  BrainIcon,
  ClipboardCopyIcon,
  InformationCircleIcon,
  Loading03Icon,
  QuoteIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { AskForm } from "@/components/ask-form"
import { ChunkList } from "@/components/chunk-list"
import { RequestErrorAlert } from "@/components/request-error-alert"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { query } from "@/lib/api"
import type { QueryResponse } from "@/lib/api"

const QUERY_SAMPLES = [
  "全勤奖是多少钱，什么情况下会取消？",
  "我一周能有几天不去公司？",
  "年假按司龄分别是几天？",
  "公司有免费健身房吗？",
]

interface Ask {
  question: string
  topK: number
}

type Phase =
  | { status: "idle" }
  | { status: "pending"; ask: Ask }
  | { status: "error"; ask: Ask; message: string }
  | { status: "success"; ask: Ask; result: QueryResponse }

function AskLine({ ask }: { ask: Ask }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <HugeiconsIcon icon={QuoteIcon} className="mt-0.5 size-3.5 shrink-0" />
      <span className="break-all">
        针对「{ask.question}」· top_k = {ask.topK}
      </span>
    </p>
  )
}

function IdleCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={BrainIcon} className="size-4 text-muted-foreground" />
          等待提问
        </CardTitle>
        <CardDescription>左侧输入问题，或点示例问题</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-relaxed text-muted-foreground">
          问题向量化 → pgvector 余弦召回 top_k 片段 → 片段拼进提示词交给对话模型 → 答案带 [1] [2] 出处编号
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
        正在召回片段并交给模型生成…
      </p>
      <AskLine ask={ask} />
      <Skeleton className="h-24" />
      <div className="grid gap-2">
        <Skeleton className="h-4" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}

function SuccessView({ ask, result }: { ask: Ask; result: QueryResponse }) {
  async function copyAnswer() {
    await navigator.clipboard.writeText(result.answer)
    toast.success("答案已复制到剪贴板")
  }

  return (
    <div className="grid gap-4">
      <AskLine ask={ask} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={AiSparklesIcon} className="size-4 text-primary" />
            答案
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="xs" className="gap-1.5" onClick={copyAnswer}>
              <HugeiconsIcon icon={ClipboardCopyIcon} />
              复制答案
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
        </CardContent>
      </Card>
      {result.sources.length === 0 ? (
        <Alert>
          <HugeiconsIcon icon={InformationCircleIcon} />
          <AlertTitle>知识库为空</AlertTitle>
          <AlertDescription>
            先入库再问答：切到「文档入库」页提交内容，或执行 uv run rag ingest data
          </AlertDescription>
        </Alert>
      ) : (
        <ChunkList chunks={result.sources} />
      )}
    </div>
  )
}

export function QueryPanel() {
  const [phase, setPhase] = useState<Phase>({ status: "idle" })

  async function run(question: string, topK: number) {
    const ask = { question, topK }
    setPhase({ status: "pending", ask })
    try {
      const result = await query(question, topK)
      setPhase({ status: "success", ask, result })
      toast.success("已生成答案")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPhase({ status: "error", ask, message })
      toast.error(message)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <AskForm
        mode="query"
        pending={phase.status === "pending"}
        samples={QUERY_SAMPLES}
        onSubmit={run}
      />
      <div className="grid gap-4">
        {phase.status === "idle" && <IdleCard />}
        {phase.status === "pending" && <PendingView ask={phase.ask} />}
        {phase.status === "error" && (
          <RequestErrorAlert title="请求失败" message={phase.message} />
        )}
        {phase.status === "success" && (
          <SuccessView ask={phase.ask} result={phase.result} />
        )}
      </div>
    </div>
  )
}
