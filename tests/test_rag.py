"""自检：切分逻辑 + pgvector 入库检索闭环（不需要 API key，用假向量）。

    uv run python tests/test_rag.py
"""

import psycopg

from rag import config, db, pipeline

SELFTEST_SOURCE = "__selftest__"


def test_chunk_text():
    text = "abcdefghij" * 200
    chunks = pipeline.chunk_text(text, size=100, overlap=20)

    assert chunks, "非空文本不应切出空列表"
    assert all(len(c) <= 100 for c in chunks), "每块不能超过 CHUNK_SIZE"
    assert chunks[0][80:] == chunks[1][:20], "相邻块应保留 overlap 重叠"
    assert "".join(chunks) != "", "内容不应丢失"
    assert pipeline.chunk_text("   \n  ") == [], "空白文本应切出空列表"

    # 剩余长度不足 overlap 时会产生纯重复的尾块，应被丢弃
    tail_text = "abcdefghij" * 200 + "0123456789"  # 2010 字符，尾块只剩 10 字符
    tail_chunks = pipeline.chunk_text(tail_text, size=100, overlap=20)
    last_end = (len(tail_chunks) - 1) * 80 + len(tail_chunks[-1])
    prev_end = (len(tail_chunks) - 2) * 80 + len(tail_chunks[-2])
    assert last_end > prev_end, "尾块没有新内容，应被丢弃"
    assert any(tail_text[-20:] in c for c in tail_chunks), "丢弃重复尾块后内容不应丢失"

    # 去重尾块不能丢内容：按滑窗几何还原各块覆盖区间，合起来必须覆盖全文
    covered = bytearray(len(text))
    for k, piece in enumerate(chunks):
        covered[k * 80 : k * 80 + len(piece)] = b"\x01" * len(piece)
    assert all(covered), "切分后有字符没有落入任何块"

    try:
        pipeline.chunk_text(text, size=10, overlap=10)
    except ValueError:
        pass
    else:
        raise AssertionError("overlap >= size 时应报错")

    print("OK  chunk_text")


def test_pgvector_roundtrip():
    dim = config.EMBED_DIM
    apple = [0.0] * dim
    apple[0] = 1.0
    banana = [0.0] * dim
    banana[1] = 1.0

    with db.connect() as conn:
        db.init_schema(conn)
        db.replace_source(conn, SELFTEST_SOURCE, ["苹果", "香蕉"], [apple, banana])

        hits = db.search(conn, apple, top_k=2)
        assert len(hits) == 2, "应检索到 2 条"
        assert hits[0]["content"] == "苹果", "最相似的块应排第一"

        # 重复入库同一 source 应覆盖而不是累积
        db.replace_source(conn, SELFTEST_SOURCE, ["苹果"], [apple])
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS n FROM chunks WHERE source = %s", (SELFTEST_SOURCE,))
            assert cur.fetchone()["n"] == 1, "同 source 重入应覆盖旧数据"

        with conn.cursor() as cur:
            cur.execute("DELETE FROM chunks WHERE source = %s", (SELFTEST_SOURCE,))
        conn.commit()

    print("OK  pgvector 入库检索")


if __name__ == "__main__":
    test_chunk_text()
    try:
        test_pgvector_roundtrip()
    except psycopg.OperationalError as exc:
        print(f"SKIP pgvector 未验证（数据库未启动？）: {exc}".splitlines()[0])
        print("     先执行：docker compose up -d")
