from typing import NamedTuple

from rag.application.use_cases import AnswerQuestion, IngestDocuments, SearchKnowledge
from rag.infrastructure.openai_compat import ChatClient, EmbeddingsClient
from rag.infrastructure.pgvector_store import PgVectorStore
from rag.infrastructure.settings import load_settings


class RagApplication(NamedTuple):
    ingest: IngestDocuments
    search: SearchKnowledge
    answer: AnswerQuestion
    store: PgVectorStore


def build_application() -> RagApplication:
    cfg = load_settings()
    store, embedder = PgVectorStore(cfg), EmbeddingsClient(cfg)
    search = SearchKnowledge(embedder, store, cfg.top_k)
    return RagApplication(IngestDocuments(embedder, store, cfg.chunk_size, cfg.chunk_overlap),
                          search, AnswerQuestion(search, ChatClient(cfg)), store)
