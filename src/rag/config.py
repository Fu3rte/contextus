import os

from dotenv import load_dotenv

load_dotenv()

# 向量模型。和对话模型是两个独立的服务，可以指向不同的服务商。
EMBEDDING_URL = os.getenv("EMBEDDING_URL", "").rstrip("/")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-v4")
# 必须等于 embedding 模型实际输出的维度：百炼 text-embedding-v4/v3 默认都是 1024
# 改这个值必须重建表：docker compose down -v && docker compose up -d
EMBED_DIM = int(os.getenv("EMBED_DIM", "1024"))

# 对话模型
LLM_URL = os.getenv("LLM_URL", "").rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
CHAT_MODEL = os.getenv("CHAT_MODEL", "qwen-plus")

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/rag"
)

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "120"))
TOP_K = int(os.getenv("TOP_K", "5"))

# 单次 embeddings 请求最多带几条文本。百炼 text-embedding-v3/v4 上限是 10 条
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "10"))
