"""
Sovereign RAG Subsystem: Chunk-Level RBAC & Multi-Tenancy Module
Implements zero-leakage search-time access control filtering for Qdrant vector space
and BM25 sparse candidate lists.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Union

logger = logging.getLogger("sovereign.rag.rbac")

# Role Clearance Hierarchy Ranking (higher numerical value = higher clearance)
CLEARANCE_LEVELS: Dict[str, int] = {
    "PUBLIC": 0,
    "INTERNAL": 1,
    "RESTRICTED": 2,
    "CONFIDENTIAL": 3,
    "SECRET": 4,
    "TOP_SECRET": 5,
}


@dataclass
class UserSecurityContext:
    """
    Security context associated with an authenticated request.
    """
    user_id: str
    tenant_id: str
    clearance_level: str = "PUBLIC"
    allowed_doc_families: Optional[Set[str]] = None

    @property
    def clearance_rank(self) -> int:
        return CLEARANCE_LEVELS.get(self.clearance_level.upper(), 0)


class RBACFilter:
    """
    Evaluates chunk accessibility against user security clearance and multi-tenancy rules.
    """

    @staticmethod
    def is_chunk_accessible(
        chunk_metadata: Dict[str, Any], user_context: UserSecurityContext
    ) -> bool:
        """
        Evaluates whether a single chunk is accessible by the user.
        """
        # 1. Multi-Tenancy Isolation Check
        chunk_tenant = chunk_metadata.get("tenant_id", "default_tenant")
        if chunk_tenant != user_context.tenant_id and chunk_tenant != "global":
            return False

        # 2. Security Clearance Level Check
        chunk_clearance = chunk_metadata.get("clearance_level", "PUBLIC").upper()
        chunk_rank = CLEARANCE_LEVELS.get(chunk_clearance, 0)
        if chunk_rank > user_context.clearance_rank:
            return False

        # 3. Document Family Access Check (if restricted)
        if user_context.allowed_doc_families is not None:
            chunk_family = chunk_metadata.get("doc_family_id")
            if chunk_family and chunk_family not in user_context.allowed_doc_families:
                return False

        return True

    @staticmethod
    def filter_chunks(
        chunks: List[Any], user_context: UserSecurityContext
    ) -> List[Any]:
        """
        Filters an in-memory list of chunks (or search candidates) by RBAC permissions.
        """
        accessible = []
        for c in chunks:
            meta = getattr(c, "metadata", {}) if hasattr(c, "metadata") else c
            if RBACFilter.is_chunk_accessible(meta, user_context):
                accessible.append(c)
        return accessible

    @staticmethod
    def build_qdrant_filter(user_context: UserSecurityContext) -> Dict[str, Any]:
        """
        Builds a Qdrant-compatible payload filter structure.
        """
        allowed_clearances = [
            lvl
            for lvl, rank in CLEARANCE_LEVELS.items()
            if rank <= user_context.clearance_rank
        ]

        qdrant_must = [
            {"key": "tenant_id", "match": {"value": user_context.tenant_id}},
            {"key": "clearance_level", "match": {"any": allowed_clearances}},
        ]

        return {"must": qdrant_must}
