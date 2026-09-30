from typing import Protocol

from rag.domain.knowledge import RetrievedChunk, TextChunk


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...


class Answerer(Protocol):
    def answer(self, question: str, contexts: list[RetrievedChunk]) -> str: ...


class ChunkStore(Protocol):
    def init_schema(self) -> None: ...

    def count(self) -> int: ...

    def replace(self, chunks: list[TextChunk], vectors: list[list[float]]) -> int: ...

    def search(self, vector: list[float], top_k: int) -> list[RetrievedChunk]: ...
