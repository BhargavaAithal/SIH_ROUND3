"""
Sovereign RAG Subsystem: Citation Provenance Formatter & Payload Compiler
Formats inline bracketed citations and compiles rich provenance metadata
for the React UI slide-out Provenance Drawer.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from sovereign.rag.ingestion import ParentChildChunk

logger = logging.getLogger("sovereign.rag.citations")


@dataclass
class ProvenanceItem:
    """
    Detailed provenance entry for a cited source chunk.
    """
    chunk_id: str
    doc_name: str
    section_title: str
    effective_date: Optional[str]
    clearance_level: str
    relevance_score: float
    text_snippet: str
    full_text: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CitationFormatter:
    """
    Injects inline bracketed tags into LLM responses and builds UI provenance payloads.
    """

    @staticmethod
    def format_citation_tag(chunk: ParentChildChunk) -> str:
        """
        Formats an inline bracketed citation tag for prompt assembly.
        Example: [Doc: ASME_B31.3.pdf, Sec: Section 304.1.2, Chk: #child_a8f9]
        """
        doc_name = chunk.metadata.get("doc_name", "Document")
        section = chunk.metadata.get("section_title", "General")
        cid_short = chunk.chunk_id[-8:]
        return f"[Doc: {doc_name}, Sec: {section}, Chk: #{cid_short}]"

    @staticmethod
    def compile_provenance_payload(
        candidates: List[tuple[ParentChildChunk, float]]
    ) -> List[Dict[str, Any]]:
        """
        Compiles provenance items into JSON payloads for the frontend UI.
        """
        provenance_items: List[Dict[str, Any]] = []

        for chunk, score in candidates:
            item = ProvenanceItem(
                chunk_id=chunk.chunk_id,
                doc_name=chunk.metadata.get("doc_name", "Unknown Document"),
                section_title=chunk.metadata.get("section_title", "General Section"),
                effective_date=chunk.metadata.get("effective_date"),
                clearance_level=chunk.metadata.get("clearance_level", "PUBLIC"),
                relevance_score=round(score, 3),
                text_snippet=chunk.text[:250] + "..." if len(chunk.text) > 250 else chunk.text,
                full_text=chunk.text,
            )
            provenance_items.append(item.to_dict())

        return provenance_items
