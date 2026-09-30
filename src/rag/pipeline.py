from pathlib import Path

from . import config, db, llm

TEXT_SUFFIXES = {".md", ".txt", ".markdown"}


def chunk_text(text, size=config.CHUNK_SIZE, overlap=config.CHUNK_OVERLAP):
    """按字符数滑窗切分，相邻块保留 overlap 个字符的上下文。"""
    if overlap >= size:
        raise ValueError("CHUNK_OVERLAP 必须小于 CHUNK_SIZE")

    text = text.strip()
    if not text:
        return []

    step = size - overlap
    chunks = []
    for start in range(0, len(text), step):
        # 剩余部分不超过 overlap 时，它已被前一块完整覆盖，再切就是纯重复
        if start and len(text) - start <= overlap:
            break
        piece = text[start : start + size].strip()
        if piece:
            chunks.append(piece)
    return chunks


def ingest_text(conn, source, text):
    """入库一份文本，返回写入的块数。"""
    chunks = chunk_text(text)
    if not chunks:
        return 0
    db.replace_source(conn, source, chunks, llm.embed(chunks))
    return len(chunks)


def ingest_path(conn, path):
    """入库文件或目录（递归 .md/.txt），返回 [(source, 块数), ...]。"""
    root = Path(path)
    files = (
        sorted(p for p in root.rglob("*") if p.suffix.lower() in TEXT_SUFFIXES)
        if root.is_dir()
        else [root]
    )
    results = []
    for file in files:
        source = file.relative_to(root).as_posix() if root.is_dir() else file.name
        results.append((source, ingest_text(conn, source, file.read_text(encoding="utf-8"))))
    return results


def search(conn, question, top_k=None):
    """只检索，返回最相关的块（带相似度和出处）。"""
    return db.search(conn, llm.embed([question])[0], top_k or config.TOP_K)


def answer(conn, question, top_k=None):
    """检索 + 拼上下文让 LLM 生成答案。"""
    contexts = search(conn, question, top_k)
    if not contexts:
        return {"answer": "知识库为空，请先执行入库。", "sources": []}
    return {"answer": llm.chat(question, contexts), "sources": contexts}
