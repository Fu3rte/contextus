import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiSparklesIcon, Search01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const TOP_K_OPTIONS = ["1", "3", "5", "8", "10"]

interface AskFormProps {
  mode: "query" | "search"
  pending: boolean
  samples: string[]
  onSubmit: (question: string, topK: number) => void
}

export function AskForm({ mode, pending, samples, onSubmit }: AskFormProps) {
  const [question, setQuestion] = useState("")
  const [topK, setTopK] = useState("3")

  const canSubmit = question.trim().length > 0 && !pending

  function submit() {
    if (!canSubmit) return
    onSubmit(question.trim(), Number(topK))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "query" ? "提问" : "检索调试"}</CardTitle>
        <CardDescription>
          {mode === "query"
            ? "召回片段拼进提示词后交给对话模型，答案带出处编号"
            : "只走向量检索，不调用生成，先看召回质量"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="question">问题</Label>
          <Textarea
            id="question"
            rows={5}
            value={question}
            placeholder="例如：我一周能有几天不去公司？"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="top-k">top_k</Label>
          <Select value={topK} onValueChange={setTopK}>
            <SelectTrigger id="top-k" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOP_K_OPTIONS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            语料只有 7 块时用 3 才有筛选效果，调大可以看到更多候选
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <div className="flex flex-wrap gap-1.5">
          {samples.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="xs"
              className="rounded-4xl font-normal"
              onClick={() => setQuestion(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={!canSubmit} className="flex-1">
            <HugeiconsIcon
              icon={pending ? AiSparklesIcon : mode === "query" ? AiSparklesIcon : Search01Icon}
              className={pending ? "animate-pulse" : undefined}
            />
            {pending
              ? mode === "query"
                ? "生成中…"
                : "检索中…"
              : mode === "query"
                ? "获取答案"
                : "只检索"}
          </Button>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>Ctrl</Kbd>
            <span className="text-xs text-muted-foreground">+</span>
            <Kbd>Enter</Kbd>
          </KbdGroup>
        </div>
      </CardFooter>
    </Card>
  )
}
