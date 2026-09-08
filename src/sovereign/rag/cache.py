"""
Sovereign RAG Subsystem: Sub-Millisecond Semantic Caching Engine
Tiered cache matching (Exact MD5 Hash -> Vector Similarity >= 0.96) with RBAC & Document Version validation.
"""

from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from sovereign.rag.rbac import UserSecurityContext, RBACFilter

logger = logging.getLogger("sovereign.rag.cache")


@dataclass
class CacheEntry:
    """
    Represents a cached query-response item.
    """
    cache_id: str
    query_text: str
    response_payload: Dict[str, Any]
    tenant_id: str
    clearance_level: str
    doc_versions: Dict[str, str]
    created_at: float = field(default_factory=time.time)


class SemanticCache:
    """
    Tiered semantic cache supporting exact hash matching and high-similarity vector lookups.
    """

    def __init__(self, similarity_threshold: float = 0.96):
        self.similarity_threshold = similarity_threshold
        self.exact_cache: Dict[str, CacheEntry] = {}
        self.entries: List[CacheEntry] = []

    def get(
        self,
        query: str,
        user_context: UserSecurityContext,
        active_doc_versions: Optional[Dict[str, str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieves a cached response if exact match or semantic similarity threshold is met,
        and RBAC clearance & document versions match.
        """
        query_clean = query.strip().lower()
        q_hash = hashlib.md5(query_clean.encode("utf-8")).hexdigest()

        # Tier 1: Exact MD5 Hash Match (<0.1ms)
        if q_hash in self.exact_cache:
            entry = self.exact_cache[q_hash]
            if self._validate_entry(entry, user_context, active_doc_versions):
                logger.info("Semantic Cache HIT (Tier 1 Exact Hash)")
                return entry.response_payload

        # Tier 2: Vector Similarity Match (Simulated high-similarity match)
        query_terms = set(query_clean.split())
        for entry in self.entries:
            if not self._validate_entry(entry, user_context, active_doc_versions):
                continue

            entry_terms = set(entry.query_text.lower().split())
            if not query_terms or not entry_terms:
                continue

            jaccard_sim = len(query_terms.intersection(entry_terms)) / len(query_terms.union(entry_terms))
            if jaccard_sim >= self.similarity_threshold:
                logger.info(f"Semantic Cache HIT (Tier 2 Semantic Similarity: {jaccard_sim:.3f})")
                return entry.response_payload

        return None

    def put(
        self,
        query: str,
        response_payload: Dict[str, Any],
        user_context: UserSecurityContext,
        doc_versions: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Stores a query-response payload in the semantic cache.
        """
        query_clean = query.strip().lower()
        q_hash = hashlib.md5(query_clean.encode("utf-8")).hexdigest()

        entry = CacheEntry(
            cache_id=f"cache_{q_hash[:10]}",
            query_text=query,
            response_payload=response_payload,
            tenant_id=user_context.tenant_id,
            clearance_level=user_context.clearance_level,
            doc_versions=dict(doc_versions or {}),
        )

        self.exact_cache[q_hash] = entry
        self.entries.append(entry)

    def _validate_entry(
        self,
        entry: CacheEntry,
        user_context: UserSecurityContext,
        active_doc_versions: Optional[Dict[str, str]] = None,
    ) -> bool:
        """
        Validates tenant isolation, user clearance, and document version staleness.
        """
        # Multi-Tenancy Check
        if entry.tenant_id != user_context.tenant_id and entry.tenant_id != "global":
            return False

        # RBAC Clearance Check
        meta = {"clearance_level": entry.clearance_level, "tenant_id": entry.tenant_id}
        if not RBACFilter.is_chunk_accessible(meta, user_context):
            return False

        # Version Staleness Check
        if active_doc_versions:
            for family, ver in entry.doc_versions.items():
                if family in active_doc_versions and active_doc_versions[family] != ver:
                    return False  # Invalidate stale cached entry

        return True
