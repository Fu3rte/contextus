def split(text, size, overlap):
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
