import { HugeiconsIcon } from "@hugeicons/react"
import { AiSparklesIcon, Search01Icon, Upload01Icon } from "@hugeicons/core-free-icons"

import { IngestPanel } from "@/features/ingest/ingest-panel"
import { QueryPanel } from "@/features/qa/query-panel"
import { SearchPanel } from "@/features/retrieval/search-panel"
import { StatusHeader } from "@/shared/components/status-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { Toaster } from "@/shared/ui/sonner"
import { TooltipProvider } from "@/shared/ui/tooltip"

const TABS = [
  { value: "query", label: "问答生成", icon: AiSparklesIcon },
  { value: "search", label: "检索调试", icon: Search01Icon },
  { value: "ingest", label: "文档入库", icon: Upload01Icon },
]

export function App() {
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
            <StatusHeader />
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
              <IngestPanel />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
