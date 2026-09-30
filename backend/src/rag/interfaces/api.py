from contextlib import asynccontextmanager
from dataclasses import asdict

from fastapi import Depends, FastAPI, Request
from pydantic import BaseModel, Field

from rag.composition import RagApplication, build_application


@asynccontextmanager
async def lifespan(app: FastAPI):
    application = build_application()
    application.store.init_schema()
    app.state.rag = application
    yield


app = FastAPI(title="RAG 知识文档问答", lifespan=lifespan)


class IngestRequest(BaseModel):
    source: str = Field(description="文档标识，例如 policy.md")
    text: str = Field(description="文档正文")


class QueryRequest(BaseModel):
    question: str
    top_k: int | None = None


def use_cases(http: Request) -> RagApplication:
    return http.app.state.rag


@app.post("/ingest")
def ingest(payload: IngestRequest, rag: RagApplication = Depends(use_cases)):
    """入库：切分 -> 向量化 -> 落 pgvector。"""
    return {"source": payload.source, "chunks": rag.ingest.run(payload.source, payload.text)}


@app.post("/search")
def search(payload: QueryRequest, rag: RagApplication = Depends(use_cases)):
    """只检索，不调 LLM。"""
    hits = rag.search.run(payload.question, payload.top_k)
    return {"question": payload.question, "results": [asdict(hit) for hit in hits]}


@app.post("/query")
def query(payload: QueryRequest, rag: RagApplication = Depends(use_cases)):
    """检索 + LLM 生成答案。"""
    answer, sources = rag.answer.run(payload.question, payload.top_k)
    return {"answer": answer, "sources": [asdict(source) for source in sources]}


@app.get("/health")
def health(rag: RagApplication = Depends(use_cases)):
    return {"status": "ok", "chunks": rag.store.count()}
