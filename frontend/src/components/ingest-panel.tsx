import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Database01Icon,
  File01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { RequestErrorAlert } from "@/components/request-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { refreshHealth } from "@/hooks/use-health"
import { ingest } from "@/lib/api"
import type { IngestResponse } from "@/lib/api"

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 120
const CHUNK_STEP = CHUNK_SIZE - CHUNK_OVERLAP

const SAMPLE_SOURCE = "refund-policy.md"
const SAMPLE_TEXT = `退款政策：支付后 7 天内可无理由退款，退款原路返回。
开票：需要增值税专用发票的同事，请在下单前提交开票信息。
争议处理：若对退款金额有异议，请联系财务并提供订单号，5 个工作日内答复。`

function estimateChunks(len: number) {
  if (len === 0) return 0
  // 后端滑窗在剩余长度不超过 overlap 时停止切分，故不足一块时仍产出一块
  return Math.max(1, Math.ceil((len - CHUNK_OVERLAP) / CHUNK_STEP))
}

export function IngestPanel() {
  const [source, setSource] = useState("")
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<IngestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const charCount = text.trim().length
  const canSubmit = source.trim().length > 0 && charCount > 0 && !pending

  async function submit() {
    if (!canSubmit) return
    setPending(true)
    setError(null)
    try {
      const res = await ingest(source.trim(), text.trim())
      setResult(res)
      toast.success(`${res.source} 已写入 ${res.chunks} 块`)
      refreshHealth()
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  function fillSample() {
    setSource(SAMPLE_SOURCE)
    setText(SAMPLE_TEXT)
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>入库文本</CardTitle>
          <CardDescription>切分 → 向量化 → 写入 pgvector，同名 source 覆盖旧数据</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ingest-source">source</Label>
            <Input
              id="ingest-source"
              value={source}
              placeholder="employee-handbook.md"
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ingest-text">正文</Label>
            <Textarea
              id="ingest-text"
              rows={12}
              value={text}
              placeholder="粘贴要入库的文档正文，支持 Markdown 与纯文本"
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              已输入 {charCount} 字符，预计 {estimateChunks(charCount)} 块
            </p>
          </div>
        </CardContent>
        <CardFooter className="gap-3">
          <Button onClick={submit} disabled={!canSubmit} className="flex-1">
            <HugeiconsIcon icon={Upload01Icon} className={pending ? "animate-pulse" : undefined} />
            {pending ? "入库中…" : "开始入库"}
          </Button>
          <Button variant="ghost" onClick={fillSample} disabled={pending}>
            填入示例
          </Button>
        </CardFooter>
      </Card>

      {error ? (
        <RequestErrorAlert title="入库失败" message={error} />
      ) : result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-6 text-emerald-500" />
              {result.chunks} 块
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge variant="secondary" className="max-w-72 truncate font-mono">
                <HugeiconsIcon icon={File01Icon} />
                {result.source}
              </Badge>
              已写入
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              同名 source 会整体覆盖，可用检索调试面板确认召回
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Database01Icon} />
              尚未入库
            </CardTitle>
            <CardDescription>
              左侧填表可单独入库一段文本，批量灌语料走命令行更省事
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
              批量入库整个目录：
              <Badge variant="secondary" className="font-mono">
                uv run rag ingest data
              </Badge>
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              后端递归读取目录，接受的文件后缀：
              <Badge variant="outline" className="font-mono">
                .md
              </Badge>
              <Badge variant="outline" className="font-mono">
                .txt
              </Badge>
              <Badge variant="outline" className="font-mono">
                .markdown
              </Badge>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
