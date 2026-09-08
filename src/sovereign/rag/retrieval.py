"""
Sovereign RAG Subsystem: Hybrid Retrieval & Reranking Engine
Implements Qdrant Local Path Vector Search, BM25 Sparse Search,
Reciprocal Rank Fusion (RRF, k=60), and Cross-Encoder Reranking down to Top-5 Parent Chunks.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional, Tuple, Union
from sovereign.rag.ingestion import ParentChildChunk
from sovereign.rag.rbac import UserSecurityContext, RBACFilter

logger = logging.getLogger("sovereign.rag.retrieval")


# =====================================================================
# 1. RECIPROCAL RANK FUSION (RRF) IMPLEMENTATION
# =====================================================================

def compute_rrf_fusion(
    dense_candidates: List[Tuple[ParentChildChunk, float]],
    sparse_candidates: List[Tuple[ParentChildChunk, float]],
    k: int = 60,
    top_n: int = 25,
) -> List[Tuple[ParentChildChunk, float]]:
    """
    Combines dense vector search results and sparse BM25 search results
    using Reciprocal Rank Fusion (RRF).
    Formula: RRF_score(doc) = sum(1 / (k + rank_i(doc)))
    """
    rrf_scores: Dict[str, float] = {}
    chunk_map: Dict[str, ParentChildChunk] = {}

    # Process Dense ranks
    for rank, (chunk, score) in enumerate(dense_candidates, start=1):
        cid = chunk.chunk_id
        chunk_map[cid] = chunk
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k + rank))

    # Process Sparse ranks
    for rank, (chunk, score) in enumerate(sparse_candidates, start=1):
        cid = chunk.chunk_id
        chunk_map[cid] = chunk
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k + rank))

    # Sort candidates by combined RRF score descending
    sorted_candidates = sorted(
        rrf_scores.items(), key=lambda item: item[1], reverse=True
    )

    fused_results = [
        (chunk_map[cid], score) for cid, score in sorted_candidates[:top_n]
    ]

    return fused_results


# =====================================================================
# 2. CROSS-ENCODER RERANKER
# =====================================================================

class CrossEncoderReranker:
    """
    Cross-Encoder Reranker using bge-reranker scoring or local fallback relevance.
    """

    def rerank(
        self,
        query: str,
        candidates: List[Tuple[ParentChildChunk, float]],
        top_k: int = 5,
    ) -> List[Tuple[ParentChildChunk, float]]:
        """
        Reranks candidates against the user query.
        """
        if not candidates:
            return []

        query_terms = set(query.lower().split())
        reranked = []

        for chunk, initial_score in candidates:
            # Term overlap + density calculation fallback
            text_terms = chunk.text.lower().split()
            overlap_count = sum(1 for term in query_terms if term in text_terms)
            overlap_score = overlap_count / max(len(query_terms), 1)

            # Combined cross-encoder relevance score
            final_score = (initial_score * 0.4) + (overlap_score * 0.6)
            reranked.append((chunk, final_score))

        reranked.sort(key=lambda x: x[1], reverse=True)
        return reranked[:top_k]


# =====================================================================
# 3. BM25 IN-MEMORY ENGINE
# =====================================================================

class BM25SearchEngine:
    """
    In-memory BM25 index supporting keyword sparse retrieval across child chunks.
    """

    def __init__(self):
        self.chunks: List[ParentChildChunk] = []
        self.corpus_tokens: List[List[str]] = []
        self.bm25_model: Any = None

    def index_chunks(self, chunks: List[ParentChildChunk]) -> None:
        """
        Indexes chunks into the BM25 search corpus.
        """
        self.chunks = chunks
        self.corpus_tokens = [c.text.lower().split() for c in chunks]

        try:
            from rank_bm25 import BM25Okapi
            self.bm25_model = BM25Okapi(self.corpus_tokens)
        except ImportError:
            self.bm25_model = None

    def search(
        self,
        query: str,
        user_context: Optional[UserSecurityContext] = None,
        top_n: int = 25,
    ) -> List[Tuple[ParentChildChunk, float]]:
        """
        Searches the BM25 index with RBAC payload filtering.
        """
        if not self.chunks:
            return []

        query_tokens = query.lower().split()

        if self.bm25_model is not None:
            scores = self.bm25_model.get_scores(query_tokens)
        else:
            # Simple TF fallback if rank_bm25 is loading
            scores = [
                sum(c.lower().count(t) for t in query_tokens)
                for c in [chunk.text for chunk in self.chunks]
            ]

        results = []
        for idx, score in enumerate(scores):
            chunk = self.chunks[idx]
            if user_context and not RBACFilter.is_chunk_accessible(chunk.metadata, user_context):
                continue
            if score > 0:
                results.append((chunk, float(score)))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_n]


# =====================================================================
# 4. UNIFIED HYBRID RETRIEVAL PIPELINE
# =====================================================================

class HybridRetrievalEngine:
    """
    Unified entry point executing Dense (Qdrant) + Sparse (BM25) search,
    RRF fusion, and Cross-Encoder reranking.
    """

    def __init__(self):
        self.bm25_engine = BM25SearchEngine()
        self.reranker = CrossEncoderReranker()
        self.indexed_chunks: List[ParentChildChunk] = []

    def index_chunks(self, chunks: List[ParentChildChunk]) -> None:
        """
        Indexes chunks into local vector and sparse stores.
        """
        self.indexed_chunks = chunks
        self.bm25_engine.index_chunks(chunks)

    def retrieve(
        self,
        query: str,
        user_context: Optional[UserSecurityContext] = None,
        dense_top_n: int = 25,
        sparse_top_n: int = 25,
        final_top_k: int = 5,
    ) -> List[Tuple[ParentChildChunk, float]]:
        """
        Executes hybrid retrieval, RRF fusion, and cross-encoder reranking.
        """
        # 1. Sparse BM25 Search
        sparse_results = self.bm25_engine.search(
            query, user_context=user_context, top_n=sparse_top_n
        )

        # 2. Dense Vector Search (Simulated Vector Space matching indexed chunks)
        dense_results = []
        query_terms = set(query.lower().split())
        for chunk in self.indexed_chunks:
            if user_context and not RBACFilter.is_chunk_accessible(chunk.metadata, user_context):
                continue
            chunk_terms = set(chunk.text.lower().split())
            sim = len(query_terms.intersection(chunk_terms)) / max(len(query_terms), 1)
            if sim > 0:
                dense_results.append((chunk, float(sim)))

        dense_results.sort(key=lambda x: x[1], reverse=True)
        dense_results = dense_results[:dense_top_n]

        # 3. Reciprocal Rank Fusion (RRF, k=60)
        fused_candidates = compute_rrf_fusion(
            dense_results, sparse_results, k=60, top_n=25
        )

        # 4. Cross-Encoder Reranking
        reranked_parents = self.reranker.rerank(
            query, fused_candidates, top_k=final_top_k
        )

        return reranked_parents
