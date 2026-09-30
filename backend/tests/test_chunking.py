# 自检：切分逻辑，不需要任何外部服务。
#     uv run python tests/test_chunking.py

from rag.domain.chunking import split


def test_chunk_text():
    text = "abcdefghij" * 200
    chunks = split(text, size=100, overlap=20)

    assert chunks, "非空文本不应切出空列表"
    assert all(len(c) <= 100 for c in chunks), "每块不能超过 CHUNK_SIZE"
    assert chunks[0][80:] == chunks[1][:20], "相邻块应保留 overlap 重叠"
    assert "".join(chunks) != "", "内容不应丢失"
    assert split("   \n  ", size=100, overlap=20) == [], "空白文本应切出空列表"

    # 剩余长度不足 overlap 时会产生纯重复的尾块，应被丢弃
    tail_text = "abcdefghij" * 200 + "0123456789"  # 2010 字符，尾块只剩 10 字符
    tail_chunks = split(tail_text, size=100, overlap=20)
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
        split(text, size=10, overlap=10)
    except ValueError:
        pass
    else:
        raise AssertionError("overlap >= size 时应报错")

    print("OK  chunk_text")


if __name__ == "__main__":
    test_chunk_text()
