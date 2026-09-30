from rag.application.ports import Answerer, ChunkStore, Embedder
from rag.domain.chunking import split
from rag.domain.knowledge import RetrievedChunk, TextChunk


class IngestDocuments:
    def __init__(
        self, embedder: Embedder, store: ChunkStore, chunk_size: int, chunk_overlap: int
    ):
        self._embedder = embedder
        self._store = store
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

    def run(self, source: str, text: str) -> int:
        """切分 -> 向量化 -> 覆盖式入库，返回写入的块数。"""
        contents = split(text, self._chunk_size, self._chunk_overlap)
        if not contents:
            return 0
        chunks = [TextChunk(source, index, content) for index, content in enumerate(contents)]
        return self._store.replace(chunks, self._embedder.embed(contents))


class SearchKnowledge:
    def __init__(self, embedder: Embedder, store: ChunkStore, top_k: int):
        self._embedder = embedder
        self._store = store
        self._top_k = top_k

    def run(self, question: str, top_k: int | None = None) -> list[RetrievedChunk]:
        return self._store.search(self._embedder.embed([question])[0], top_k or self._top_k)


class AnswerQuestion:
    def __init__(self, search: SearchKnowledge, answerer: Answerer):
        self._search = search
        self._answerer = answerer

    def run(self, question: str, top_k: int | None = None) -> tuple[str, list[RetrievedChunk]]:
        contexts = self._search.run(question, top_k)
        if not contexts:
            return "知识库为空，请先入库。", []
        return self._answerer.answer(question, contexts), contexts
