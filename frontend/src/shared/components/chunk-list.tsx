import { HugeiconsIcon } from "@hugeicons/react"
import { ClipboardCopyIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import type { Chunk } from "@/shared/api/client"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible"
import { Progress } from "@/shared/ui/progress"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Separator } from "@/shared/ui/separator"
import { cn } from "cn"

function scorePercent(score: number) {
  return Math.max(0, Math.min(100, score * 100))
}

function ChunkRow({ chunk, rank }: { chunk: Chunk; rank: number }) {
  async function copy() {
    await navigator.clipboard.writeText(chunk.content)
    toast.success(`已复制 ${chunk.source} 第 ${chunk.chunk_index} 块`)
  }

  return (
    <Card size="sm" className={cn(rank === 1 && "ring-primary/40")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Badge variant={rank === 1 ? "default" : "outline"} className="font-mono">
            [{rank}]
          </Badge>
          <span className="truncate">{chunk.source}</span>
        </CardTitle>
        <CardDescription className="line-clamp-2 font-normal">
          {chunk.content.slice(0, 120)}
        </CardDescription>
        <CardAction className="flex flex-col items-end gap-1 self-start">
          <Badge variant={rank === 1 ? "default" : "outline"}>
            相似度 {chunk.score.toFixed(3)}
          </Badge>
          <span className="text-xs text-muted-foreground">块 {chunk.chunk_index}</span>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Progress value={scorePercent(chunk.score)} />
        <Collapsible className="grid gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="xs" className="justify-self-start gap-1.5">
              <HugeiconsIcon icon={UnfoldMoreIcon} />
              展开全文
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-72 rounded-lg bg-muted/60 p-3">
              <p className="pr-3 text-xs leading-relaxed whitespace-pre-wrap">{chunk.content}</p>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
        <Button variant="ghost" size="xs" className="justify-self-start gap-1.5" onClick={copy}>
          <HugeiconsIcon icon={ClipboardCopyIcon} />
          复制片段
        </Button>
      </CardContent>
    </Card>
  )
}

export function ChunkList({ chunks }: { chunks: Chunk[] }) {
  const sources = new Set(chunks.map((c) => c.source))

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>召回 {chunks.length} 块</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{sources.size} 个来源</span>
        <Separator orientation="vertical" className="h-3" />
        <span>按余弦相似度倒序</span>
      </div>
      {chunks.map((chunk, i) => (
        <ChunkRow key={`${chunk.source}-${chunk.chunk_index}`} chunk={chunk} rank={i + 1} />
      ))}
    </div>
  )
}
