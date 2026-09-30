# contextus

最基础的 RAG 知识文档问答：**入库 → 检索 → 返回结果**。

- 切分：按字符滑窗，块间保留重叠
- 向量化：走 `EMBEDDING_URL` 的 `/embeddings`（OpenAI 兼容，默认接阿里云百炼）
- 存储检索：PostgreSQL + pgvector，余弦距离 `<=>`
- 生成：把 top-k 片段拼进提示词，走 `LLM_URL` 的 `/chat/completions` 得到答案 + 出处

向量模型和对话模型是**两套独立配置**，可以指向不同的服务商（比如向量用百炼、对话用别的）。

## 快速开始

```bash
uv sync
cp .env.example .env        # 填 EMBEDDING_API_KEY 和 LLM_API_KEY，两个服务各一套
docker compose up -d        # pgvector，监听 5433
uv run python tests/test_rag.py
```

`.env` 里每一项都有注释，照着填即可。要点：

- 两个 URL 都填 **base_url**，不要带 `/embeddings` / `/chat/completions`，代码会自己拼
- 百炼的 API Key **分地域**，必须和 `EMBEDDING_URL` 同地域，否则报 401 `Incorrect API key`
- `EMBED_DIM` 必须等于 embedding 模型实际输出的维度（百炼 `text-embedding-v4` / `v3` 都是 1024）
- `EMBED_BATCH_SIZE` 别超过服务商上限，百炼 v3/v4 是 **10 条/次**

## 用法

```bash
# 入库文件或目录（递归 .md/.txt），同一 source 重复入库会覆盖
uv run rag ingest data

# 只检索，不调 LLM —— 先确认召回质量
uv run rag search "pgvector 用什么运算符算余弦距离"

# 检索 + 生成答案
uv run rag query "为什么要切分文档"

# HTTP 服务
uv run rag serve
```

## HTTP 接口

```bash
curl -X POST localhost:8000/ingest -H 'Content-Type: application/json' \
  -d '{"source":"faq.md","text":"退款政策：支付后 7 天内可无理由退款。"}'

curl -X POST localhost:8000/search -H 'Content-Type: application/json' \
  -d '{"question":"退款要几天内申请","top_k":3}'

curl -X POST localhost:8000/query -H 'Content-Type: application/json' \
  -d '{"question":"退款要几天内申请"}'
```

## 控制台前端

`frontend/` 是 React + TS + Vite + shadcn 的调试界面，对应上面三个接口。

```bash
cd frontend && npm install && npm run dev     # http://localhost:5173
```

前端只请求 `/api/*`，由 Vite 代理转发到 `http://127.0.0.1:8000`（target 写在 `frontend/vite.config.ts`），
所以后端保持默认的 127.0.0.1 监听即可，不需要开 CORS。

三个页签分别对应链路的三段：**问答生成**（`/query`）、**检索调试**（`/search`，不调模型）、**文档入库**（`/ingest`）。
页头的状态灯读 `/health`，显示库里现有块数。

## 上手试试

测试语料和问题清单在 [`QUESTIONS.md`](QUESTIONS.md)：`data/employee-handbook.md` 是一份虚构的员工手册，
清单里按「直查 / 换说法 / 精确数字 / 跨段落 / 该拒答」分组给了可以照着问的问题和预期答案。

接口文档在 http://127.0.0.1:8000/docs（`uv run rag serve` 之后）。

- 换自己的文档：把 `.md` / `.txt` 放进 `data/`，或换成任意目录再入库
- 看切分效果：改 `.env` 里的 `CHUNK_SIZE` / `CHUNK_OVERLAP`，重新入库后用 `search` 对比召回
- 看召回质量：`uv run rag search "问题" --top-k 10`，先确认检索对了再调生成
- 换模型或换服务商：向量侧改 `EMBEDDING_URL` / `EMBEDDING_API_KEY` / `EMBED_MODEL`，
  对话侧改 `LLM_URL` / `LLM_API_KEY` / `CHAT_MODEL`，两边互不影响
- 看库里存了什么：

```bash
docker exec -it rag-learning-db psql -U postgres -d rag \
  -c "select source, chunk_index, left(content, 40) from chunks order by source, chunk_index;"
```

- 清空知识库重来：

```bash
uv run python -c "from rag import db; c=db.connect(); c.cursor().execute('TRUNCATE chunks'); c.commit()"
```

注意：`EMBED_DIM` 改了必须重建表，向量维度是写死在表结构里的。

```bash
docker compose down -v && docker compose up -d
```

## 结构

```
src/rag/
  config.py    环境变量（向量模型与对话模型两套）
  db.py        建表 + pgvector 检索
  llm.py       embeddings / chat（stdlib urllib，各走各的 URL）
  pipeline.py  切分 / 入库 / 检索 / 问答
  api.py       FastAPI（/ingest /search /query /health）
  cli.py       命令行入口
```

## 已知取舍

- 检索是全表精确扫描，数据量到百万级再建 HNSW 索引（`db.py` 有注释说明）
- 切分只按字符数，没有做语义/标题感知切分。一块 800 字符里可能塞进四五个小节，
  带来两个副作用：相似度整体偏低，而且块开头的内容常常和问题无关、答案埋在块中间。
  想让每块尽量只讲一件事，把 `CHUNK_SIZE` 调到 300 左右重新入库。
- 没有重排（rerank）、没有多轮对话历史、没有鉴权
