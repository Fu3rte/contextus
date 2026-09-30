from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel, Field

from . import db, pipeline


@asynccontextmanager
async def lifespan(_app):
    with db.connect() as conn:
        db.init_schema(conn)
    yield


app = FastAPI(title="RAG 知识文档问答", lifespan=lifespan)


class IngestRequest(BaseModel):
    source: str = Field(description="文档标识，例如 policy.md")
    text: str = Field(description="文档正文")


class QueryRequest(BaseModel):
    question: str
    top_k: int | None = None


@app.post("/ingest")
def ingest(request: IngestRequest):
    """入库：切分 -> 向量化 -> 落 pgvector。"""
    with db.connect() as conn:
        chunks = pipeline.ingest_text(conn, request.source, request.text)
    return {"source": request.source, "chunks": chunks}


@app.post("/search")
def search(request: QueryRequest):
    """只检索，不调 LLM。"""
    with db.connect() as conn:
        results = pipeline.search(conn, request.question, request.top_k)
    return {"question": request.question, "results": results}


@app.post("/query")
def query(request: QueryRequest):
    """检索 + LLM 生成答案。"""
    with db.connect() as conn:
        return pipeline.answer(conn, request.question, request.top_k)


@app.get("/health")
def health():
    with db.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS n FROM chunks")
            return {"status": "ok", "chunks": cur.fetchone()["n"]}


def main():
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
