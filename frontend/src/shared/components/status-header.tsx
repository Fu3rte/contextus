import { HugeiconsIcon } from "@hugeicons/react"
import {
  Moon01Icon,
  Refresh01Icon,
  ServerCrashIcon,
  Sun02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/shared/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
} from "@/shared/ui/item"
import { Separator } from "@/shared/ui/separator"
import { Skeleton } from "@/shared/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { cn } from "cn"

export type Theme = "light" | "dark"

export type HealthState =
  | { status: "loading" }
  | { status: "ok"; chunks: number }
  | { status: "down"; error: string }

interface StatusHeaderProps {
  health: HealthState
  onRefresh: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function StatusHeader({ health, onRefresh, theme, onToggleTheme }: StatusHeaderProps) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      <Item variant="outline" size="xs" className="rounded-4xl py-0 pr-1.5 text-xs">
        <ItemMedia>
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              health.status === "ok" && "bg-emerald-500",
              health.status === "loading" && "animate-pulse bg-muted-foreground/40",
              health.status === "down" && "bg-destructive"
            )}
          />
        </ItemMedia>
        <ItemContent className="min-w-0">
          {health.status === "loading" && <Skeleton className="h-3 w-20" />}
          {health.status === "ok" && (
            <span className="hidden text-muted-foreground sm:inline">
              知识库 {health.chunks} 块
            </span>
          )}
          {health.status === "down" && (
            <span className="hidden items-center gap-1.5 text-destructive sm:flex">
              <HugeiconsIcon icon={ServerCrashIcon} className="size-3.5" />
              后端未连接
            </span>
          )}
        </ItemContent>
        <ItemActions className="gap-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="刷新后端状态"
                onClick={onRefresh}
              >
                <HugeiconsIcon icon={Refresh01Icon} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {health.status === "down"
                ? health.error
                : "重新检查 http://127.0.0.1:8000/health"}
            </TooltipContent>
          </Tooltip>
        </ItemActions>
      </Item>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="icon" aria-label="切换深浅色" onClick={onToggleTheme}>
        <HugeiconsIcon icon={theme === "dark" ? Sun02Icon : Moon01Icon} />
      </Button>
    </div>
  )
}
