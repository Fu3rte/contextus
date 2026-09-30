import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    # 向量模型。和对话模型是两个独立的服务，可以指向不同的服务商。
    embedding_url: str
    embedding_api_key: str
    embed_model: str
    # 必须等于 embedding 模型实际输出的维度：百炼 text-embedding-v4/v3 默认都是 1024
    # 改这个值必须重建表：docker compose down -v && docker compose up -d
    embed_dim: int
    # 对话模型
    llm_url: str
    llm_api_key: str
    chat_model: str
    database_url: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    # 单次 embeddings 请求最多带几条文本。百炼 text-embedding-v3/v4 上限是 10 条
    embed_batch_size: int


def load_settings():
    load_dotenv()

    return Settings(
        embedding_url=os.getenv("EMBEDDING_URL", "").rstrip("/"),
        embedding_api_key=os.getenv("EMBEDDING_API_KEY", ""),
        embed_model=os.getenv("EMBED_MODEL", "text-embedding-v4"),
        embed_dim=int(os.getenv("EMBED_DIM", "1024")),
        llm_url=os.getenv("LLM_URL", "").rstrip("/"),
        llm_api_key=os.getenv("LLM_API_KEY", ""),
        chat_model=os.getenv("CHAT_MODEL", "qwen-plus"),
        database_url=os.getenv(
            "DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/rag"
        ),
        chunk_size=int(os.getenv("CHUNK_SIZE", "800")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "120")),
        top_k=int(os.getenv("TOP_K", "5")),
        embed_batch_size=int(os.getenv("EMBED_BATCH_SIZE", "10")),
    )
