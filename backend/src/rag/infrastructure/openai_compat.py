import json
import urllib.error
import urllib.request

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


class EmbeddingsClient:
    def __init__(self, settings):
        self._settings = settings

    def embed(self, texts):
        """批量向量化，返回与输入等长、同序的向量列表。走 EMBEDDING_URL。"""
        settings = self._settings
        if not settings.embedding_url or not settings.embedding_api_key:
            raise RuntimeError("EMBEDDING_URL / EMBEDDING_API_KEY 未设置，请检查 .env")

        vectors = []
        for start in range(0, len(texts), settings.embed_batch_size):
            batch = texts[start : start + settings.embed_batch_size]
            data = _post(
                settings.embedding_url,
                settings.embedding_api_key,
                "/embeddings",
                {"model": settings.embed_model, "input": batch, "encoding_format": "float"},
            )
            vectors.extend(
                item["embedding"] for item in sorted(data["data"], key=lambda d: d["index"])
            )
        return vectors


class ChatClient:
    def __init__(self, settings):
        self._settings = settings

    def answer(self, question, contexts):
        """拼上下文让模型作答。走 LLM_URL。"""
        settings = self._settings
        if not settings.llm_url or not settings.llm_api_key:
            raise RuntimeError("LLM_URL / LLM_API_KEY 未设置，请检查 .env")

        context_block = "\n\n".join(
            f"[{i + 1}] 来源 {c.source}#{c.chunk_index}\n{c.content}"
            for i, c in enumerate(contexts)
        )
        data = _post(
            settings.llm_url,
            settings.llm_api_key,
            "/chat/completions",
            {
                "model": settings.chat_model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"上下文：\n{context_block}\n\n问题：{question}"},
                ],
            },
        )
        return data["choices"][0]["message"]["content"]
