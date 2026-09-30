import psycopg
from psycopg.rows import dict_row

from rag.domain.knowledge import RetrievedChunk

CONNECT_TIMEOUT = 5

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
    id          bigserial PRIMARY KEY,
    source      text    NOT NULL,
    chunk_index int     NOT NULL,
    content     text    NOT NULL,
    embedding   vector({dim}) NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_source_idx ON chunks (source);
"""


def connect(settings):
    # connect_timeout 必须显式给：端口不可达时 loopback TCP 会一直阻塞而不是报错
    return psycopg.connect(
        settings.database_url, row_factory=dict_row, connect_timeout=CONNECT_TIMEOUT
    )


def to_vector_literal(vector):
    return "[" + ",".join(f"{x:.7f}" for x in vector) + "]"


class PgVectorStore:
    def __init__(self, settings):
        self._settings = settings

    def init_schema(self):
        with connect(self._settings) as conn:
            with conn.cursor() as cur:
                cur.execute(SCHEMA.format(dim=self._settings.embed_dim))
            conn.commit()

    def count(self):
        with connect(self._settings) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) AS n FROM chunks")
                return cur.fetchone()["n"]

    def replace(self, chunks, vectors):
        """一次调用只处理一个 source，入库前先清掉它的旧数据，避免重复累积。"""
        with connect(self._settings) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM chunks WHERE source = %s", (chunks[0].source,))
                cur.executemany(
                    "INSERT INTO chunks (source, chunk_index, content, embedding)"
                    " VALUES (%s, %s, %s, %s::vector)",
                    [
                        (chunk.source, chunk.chunk_index, chunk.content, to_vector_literal(vector))
                        for chunk, vector in zip(chunks, vectors)
                    ],
                )
            conn.commit()
        return len(chunks)

    def search(self, vector, top_k):
        # ponytail: 全表精确扫描。数据量到百万级再建 HNSW 索引
        # (CREATE INDEX ... USING hnsw (embedding vector_cosine_ops))。
        literal = to_vector_literal(vector)
        with connect(self._settings) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT source, chunk_index, content,"
                    "       1 - (embedding <=> %s::vector) AS score"
                    " FROM chunks"
                    " ORDER BY embedding <=> %s::vector"
                    " LIMIT %s",
                    (literal, literal, top_k),
                )
                return [RetrievedChunk(**row) for row in cur.fetchall()]
