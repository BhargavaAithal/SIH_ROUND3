"""
Sovereign RAG Subsystem: Multi-Hop Query Decomposition & Knowledge Graph Router
Decomposes complex queries into RAG document queries and P&ID NetworkX graph traversal queries.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from sovereign.rag.ingestion import ParentChildChunk

logger = logging.getLogger("sovereign.rag.decomposer")

# Tag extraction pattern for ISA-5.1 equipment and piping line tags
TAG_DETECTION_PATTERN = re.compile(
    r'\b(?:\d+(?:/\d+)?|\d+(?:\.\d+)?)"[-_][A-Z]{1,4}[-_]\d{2,4}\b|'
    r'\b(?:V|P|E|T|TK|C|HV|FCV|PCV|LCV|TCV|PRV|PSV|MOV|XV|ESDV)[-_]?\d{2,4}[A-Z]?\b',
    re.IGNORECASE,
)


@dataclass
class SubQuery:
    """
    Represents a decomposed sub-query target.
    """
    sub_query_id: str
    query_text: str
    target_type: str  # "DOCUMENT_RAG" | "PID_GRAPH_TOPOLOGY"
    extracted_tags: List[str] = field(default_factory=list)


@dataclass
class DecomposedPlan:
    """
    Execution plan for a multi-hop query.
    """
    original_query: str
    sub_queries: List[SubQuery]
    requires_graph_traversal: bool


class MultiHopQueryDecomposer:
    """
    Decomposes user inquiries into document search streams and knowledge graph traversals.
    """

    def decompose_query(self, query: str) -> DecomposedPlan:
        """
        Analyzes and decomposes a user query into executable sub-queries.
        """
        extracted_tags = TAG_DETECTION_PATTERN.findall(query)
        sub_queries: List[SubQuery] = []
        requires_graph = len(extracted_tags) > 0

        # Sub-query 1: Primary Document RAG query
        sub_queries.append(
            SubQuery(
                sub_query_id="sub_rag_0",
                query_text=query,
                target_type="DOCUMENT_RAG",
                extracted_tags=[],
            )
        )

        # Sub-query 2 (if tags detected): P&ID Topology Graph Traversal
        if requires_graph:
            for idx, tag in enumerate(extracted_tags):
                sub_queries.append(
                    SubQuery(
                        sub_query_id=f"sub_graph_{idx}",
                        query_text=f"Find topology line spec and connected components for tag '{tag}'",
                        target_type="PID_GRAPH_TOPOLOGY",
                        extracted_tags=[tag],
                    )
                )

        return DecomposedPlan(
            original_query=query,
            sub_queries=sub_queries,
            requires_graph_traversal=requires_graph,
        )

    def merge_contexts(
        self,
        document_chunks: List[Tuple[ParentChildChunk, float]],
        graph_chunks: List[Tuple[ParentChildChunk, float]],
        top_k: int = 5,
    ) -> List[Tuple[ParentChildChunk, float]]:
        """
        Merges retrieved document chunks with knowledge graph topology chunks.
        """
        seen_ids = set()
        merged: List[Tuple[ParentChildChunk, float]] = []

        # Interleave graph topology chunks with top document chunks
        all_candidates = graph_chunks + document_chunks
        for chunk, score in all_candidates:
            if chunk.chunk_id not in seen_ids:
                seen_ids.add(chunk.chunk_id)
                merged.append((chunk, score))

        merged.sort(key=lambda x: x[1], reverse=True)
        return merged[:top_k]
