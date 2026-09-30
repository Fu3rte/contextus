# RAG 控制台前端

React 19 + TypeScript + Vite 8 + Tailwind v4 + shadcn（radix-maia 风格）。

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

## 接口代理

`vite.config.ts` 的 `server.proxy` 把 `/api` 代理到后端 `http://127.0.0.1:8000`，
并把路径前缀 `/api` 去掉。后端地址、端口变化时改这里的 `target` 即可。

前端调用统一走 `src/shared/api/client.ts`。

## 目录分层

- `src/app/` —— 应用外壳：入口组件 `app.tsx`（header + 页签 + Toaster）。
- `src/features/` —— 按业务功能分文件夹，每个页签一个：
  - `qa/query-panel.tsx` —— 问答生成
  - `retrieval/search-panel.tsx` —— 检索调试
  - `ingest/ingest-panel.tsx` —— 文档入库
- `src/shared/` —— 跨功能复用：
  - `api/` —— HTTP 客户端
  - `components/` —— 共享组件（表单、结果列表、错误提示、状态栏）
  - `hooks/` —— 主题与健康状态
  - `lib/` —— `cn` 等工具
  - `ui/` —— shadcn 生成组件

跨目录引用一律用 `@/...` 别名（`@` 指向 `src`），不写 `../` 相对跳转。

`components.json` 的 aliases 已指向 `src/shared/` 下各层，新增 shadcn 组件直接落位：

```bash
npx shadcn@latest add <component>
```
