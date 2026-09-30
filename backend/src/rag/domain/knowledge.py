from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    source: str
    chunk_index: int
    content: str


@dataclass(frozen=True)
class RetrievedChunk:
    source: str
    chunk_index: int
    content: str
    score: float
