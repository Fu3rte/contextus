# 自检：pgvector 入库检索闭环，不需要 API key，用假向量。
#     uv run python tests/test_pgvector_store.py

import psycopg

from rag.domain.knowledge import TextChunk
from rag.infrastructure.pgvector_store import PgVectorStore, connect
from rag.infrastructure.settings import load_settings

SELFTEST_SOURCE = "__selftest__"


def test_pgvector_roundtrip():
    settings = load_settings()
    dim = settings.embed_dim
    apple = [0.0] * dim
    apple[0] = 1.0
    banana = [0.0] * dim
    banana[1] = 1.0

    store = PgVectorStore(settings)
    store.init_schema()

    store.replace(
        [TextChunk(SELFTEST_SOURCE, 0, "苹果"), TextChunk(SELFTEST_SOURCE, 1, "香蕉")],
        [apple, banana],
    )

    hits = store.search(apple, top_k=2)
    assert len(hits) == 2, "应检索到 2 条"
    assert hits[0].content == "苹果", "最相似的块应排第一"

    # 重复入库同一 source 应覆盖而不是累积
    store.replace([TextChunk(SELFTEST_SOURCE, 0, "苹果")], [apple])
    with connect(settings) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS n FROM chunks WHERE source = %s", (SELFTEST_SOURCE,))
            assert cur.fetchone()["n"] == 1, "同 source 重入应覆盖旧数据"

            cur.execute("DELETE FROM chunks WHERE source = %s", (SELFTEST_SOURCE,))
        conn.commit()

    print("OK  pgvector 入库检索")


if __name__ == "__main__":
    try:
        test_pgvector_roundtrip()
    except psycopg.OperationalError as exc:
        print(f"SKIP pgvector 未验证（数据库未启动？）: {exc}".splitlines()[0])
        print("     先执行：docker compose up -d")
