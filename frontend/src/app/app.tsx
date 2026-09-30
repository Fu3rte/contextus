import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiSparklesIcon, Search01Icon, Upload01Icon } from "@hugeicons/core-free-icons"

import { IngestPanel } from "@/features/ingest/ingest-panel"
import { QueryPanel } from "@/features/qa/query-panel"
import { SearchPanel } from "@/features/retrieval/search-panel"
import { getHealth } from "@/shared/api/client"
import { StatusHeader, type HealthState, type Theme } from "@/shared/components/status-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { Toaster } from "@/shared/ui/sonner"
import { TooltipProvider } from "@/shared/ui/tooltip"

const THEME_KEY = "rag-console-theme"

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

// 浅色为主：只有用户手动切过深色才用深色，不跟随系统偏好
const initialTheme: Theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"
applyTheme(initialTheme)

const TABS = [
  { value: "query", label: "问答生成", icon: AiSparklesIcon },
  { value: "search", label: "检索调试", icon: Search01Icon },
  { value: "ingest", label: "文档入库", icon: Upload01Icon },
]

export function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [health, setHealth] = useState<HealthState>({ status: "loading" })

  const refreshHealth = useCallback(async () => {
    try {
      const result = await getHealth()
      setHealth({ status: "ok", chunks: result.chunks })
    } catch (err) {
      setHealth({ status: "down", error: (err as Error).message })
    }
  }, [])

  useEffect(() => {
    refreshHealth()
  }, [refreshHealth])

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
    setTheme(next)
  }

  return (
    <TooltipProvider>
      <div className="min-h-svh bg-muted/30">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <HugeiconsIcon icon={AiSparklesIcon} strokeWidth={1.75} />
            </div>
            <div className="grid min-w-0">
              <h1 className="truncate font-heading text-lg leading-tight font-medium">
                RAG 控制台
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                入库 → 检索 → 生成，三段都能单独观察
              </p>
            </div>
            <StatusHeader
              health={health}
              onRefresh={refreshHealth}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Tabs defaultValue="query" className="gap-6">
            <TabsList>
              {TABS.map(({ value, label, icon }) => (
                <TabsTrigger key={value} value={value}>
                  <HugeiconsIcon icon={icon} />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="query">
              <QueryPanel />
            </TabsContent>
            <TabsContent value="search">
              <SearchPanel />
            </TabsContent>
            <TabsContent value="ingest">
              <IngestPanel onIngested={refreshHealth} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Toaster position="bottom-right" theme={theme} />
    </TooltipProvider>
  )
}
