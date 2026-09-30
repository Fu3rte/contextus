import psycopg
from psycopg.rows import dict_row

from . import config

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


def connect():
    return psycopg.connect(config.DATABASE_URL, row_factory=dict_row)


def init_schema(conn):
    with conn.cursor() as cur:
        cur.execute(SCHEMA.format(dim=config.EMBED_DIM))
    conn.commit()


def to_vector_literal(vector):
    return "[" + ",".join(f"{x:.7f}" for x in vector) + "]"


def replace_source(conn, source, chunks, vectors):
    """同一个 source 重新入库时先清掉旧数据，避免重复累积。"""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM chunks WHERE source = %s", (source,))
        cur.executemany(
            "INSERT INTO chunks (source, chunk_index, content, embedding)"
            " VALUES (%s, %s, %s, %s::vector)",
            [
                (source, i, content, to_vector_literal(vector))
                for i, (content, vector) in enumerate(zip(chunks, vectors))
            ],
        )
    conn.commit()


def search(conn, vector, top_k):
    # ponytail: 全表精确扫描。数据量到百万级再建 HNSW 索引
    # (CREATE INDEX ... USING hnsw (embedding vector_cosine_ops))。
    literal = to_vector_literal(vector)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT source, chunk_index, content,"
            "       1 - (embedding <=> %s::vector) AS score"
            " FROM chunks"
            " ORDER BY embedding <=> %s::vector"
            " LIMIT %s",
            (literal, literal, top_k),
        )
        return cur.fetchall()
