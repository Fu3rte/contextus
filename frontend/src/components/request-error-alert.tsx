import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon } from "@hugeicons/core-free-icons"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export function RequestErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <HugeiconsIcon icon={AlertCircleIcon} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="grid gap-1">
        <p>{message}</p>
        <p>
          确认后端已启动：
          <Badge variant="secondary" className="ml-1 align-middle font-mono">
            uv run rag serve
          </Badge>
        </p>
      </AlertDescription>
    </Alert>
  )
}
