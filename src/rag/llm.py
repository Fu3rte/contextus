import json
import urllib.error
import urllib.request

from . import config

SYSTEM_PROMPT = (
    "你是知识库问答助手。只依据用户提供的上下文回答，不要编造。"
    "上下文不足时直接回答「根据现有资料无法回答」。回答末尾用 [序号] 标出依据的片段。"
)


def _post(url, api_key, path, payload):
    request = urllib.request.Request(
        url + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"{url}{path} 请求失败 {exc.code}: {detail}") from exc


def embed(texts):
    """批量向量化，返回与输入等长、同序的向量列表。走 EMBEDDING_URL。"""
    if not config.EMBEDDING_URL or not config.EMBEDDING_API_KEY:
        raise RuntimeError("EMBEDDING_URL / EMBEDDING_API_KEY 未设置，请检查 .env")

    vectors = []
    for start in range(0, len(texts), config.EMBED_BATCH_SIZE):
        batch = texts[start : start + config.EMBED_BATCH_SIZE]
        data = _post(
            config.EMBEDDING_URL,
            config.EMBEDDING_API_KEY,
            "/embeddings",
            {"model": config.EMBED_MODEL, "input": batch, "encoding_format": "float"},
        )
        vectors.extend(item["embedding"] for item in sorted(data["data"], key=lambda d: d["index"]))
    return vectors


def chat(question, contexts):
    """拼上下文让模型作答。走 LLM_URL。"""
    if not config.LLM_URL or not config.LLM_API_KEY:
        raise RuntimeError("LLM_URL / LLM_API_KEY 未设置，请检查 .env")

    context_block = "\n\n".join(
        f"[{i + 1}] 来源 {c['source']}#{c['chunk_index']}\n{c['content']}"
        for i, c in enumerate(contexts)
    )
    data = _post(
        config.LLM_URL,
        config.LLM_API_KEY,
        "/chat/completions",
        {
            "model": config.CHAT_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"上下文：\n{context_block}\n\n问题：{question}"},
            ],
        },
    )
    return data["choices"][0]["message"]["content"]
