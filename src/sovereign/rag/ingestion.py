"""
Sovereign RAG Subsystem: Ingestion Pipeline & Multimodal Chunking Engine
Implements Parent-Child Section Chunking, Multimodal Diagram Summarization,
and P&ID NetworkX Topology Serialization into Searchable Chunk Payloads.
"""

from __future__ import annotations

import hashlib
import logging
import re
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("sovereign.rag.ingestion")


# =====================================================================
# 1. PARENT-CHILD CHUNK DATA STRUCTURE
# =====================================================================

@dataclass
class ParentChildChunk:
    """
    Represents a granular chunk (parent or child) in the vector/sparse store.
    """
    chunk_id: str
    parent_chunk_id: Optional[str]
    is_parent: bool
    text: str
    token_count: int
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> ParentChildChunk:
        return cls(**data)


# =====================================================================
# 2. HIERARCHICAL DOCUMENT SPLITTER (SECTION & CHILD SPLITTING)
# =====================================================================

class HierarchicalDocumentSplitter:
    """
    Splits engineering text into Parent sections (~2000 tokens / ~8000 chars)
    and sub-splits each section into Child chunks (~400 tokens / ~1600 chars) with overlap.
    """

    def __init__(
        self,
        parent_max_chars: int = 8000,
        child_max_chars: int = 1600,
        child_overlap_chars: int = 200,
    ):
        self.parent_max_chars = parent_max_chars
        self.child_max_chars = child_max_chars
        self.child_overlap_chars = child_overlap_chars

    def split_text(
        self, text: str, doc_metadata: Dict[str, Any]
    ) -> List[ParentChildChunk]:
        """
        Splits document text into Parent and Child chunks.
        """
        chunks: List[ParentChildChunk] = []

        # Split document into structural sections by Markdown headers or double newlines
        sections = self._split_into_sections(text)

        for sec_idx, (sec_title, sec_text) in enumerate(sections):
            if not sec_text.strip():
                continue

            # Generate unique deterministic parent ID
            parent_hash = hashlib.sha256(
                f"{doc_metadata.get('doc_family_id', 'doc')}:{sec_idx}:{sec_text[:100]}".encode("utf-8")
            ).hexdigest()[:12]
            parent_id = f"parent_{parent_hash}"

            parent_metadata = dict(doc_metadata)
            parent_metadata["section_title"] = sec_title
            parent_metadata["section_index"] = sec_idx

            # Build Parent Chunk
            parent_chunk = ParentChildChunk(
                chunk_id=parent_id,
                parent_chunk_id=None,
                is_parent=True,
                text=sec_text,
                token_count=len(sec_text.split()),
                metadata=parent_metadata,
            )
            chunks.append(parent_chunk)

            # Sub-split into Child chunks
            child_texts = self._sub_split_text(sec_text)
            for child_idx, child_text in enumerate(child_texts):
                child_id = f"child_{parent_hash}_{child_idx}"
                child_metadata = dict(parent_metadata)
                child_metadata["child_index"] = child_idx

                child_chunk = ParentChildChunk(
                    chunk_id=child_id,
                    parent_chunk_id=parent_id,
                    is_parent=False,
                    text=child_text,
                    token_count=len(child_text.split()),
                    metadata=child_metadata,
                )
                chunks.append(child_chunk)

        return chunks

    def _split_into_sections(self, text: str) -> List[Tuple[str, str]]:
        """
        Splits text by markdown headings (#, ##, ###) or paragraph blocks.
        """
        heading_pattern = re.compile(r"^(#{1,4}\s+.*)$", re.MULTILINE)
        matches = list(heading_pattern.finditer(text))

        if not matches:
            # Fallback: Chunk by fixed parent size blocks
            blocks = []
            for i in range(0, len(text), self.parent_max_chars):
                blocks.append((f"Section {i // self.parent_max_chars + 1}", text[i:i + self.parent_max_chars]))
            return blocks

        sections = []
        for i, match in enumerate(matches):
            title = match.group(1).strip()
            start_pos = match.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            sec_content = text[start_pos:end_pos].strip()
            sections.append((title, sec_content))

        # Check for text before first header
        if matches[0].start() > 0:
            preamble = text[:matches[0].start()].strip()
            if preamble:
                sections.insert(0, ("Preamble", preamble))

        return sections

    def _sub_split_text(self, text: str) -> List[str]:
        """
        Sub-splits section text into overlapping child chunks.
        """
        paragraphs = text.split("\n\n")
        child_chunks = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) + 2 <= self.child_max_chars:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    child_chunks.append(current_chunk)
                
                # If paragraph itself exceeds max child size, break by sentences
                if len(para) > self.child_max_chars:
                    sentences = re.split(r"(?<=[.!?])\s+", para)
                    sub_chunk = ""
                    for sent in sentences:
                        if len(sub_chunk) + len(sent) + 1 <= self.child_max_chars:
                            sub_chunk = f"{sub_chunk} {sent}".strip()
                        else:
                            if sub_chunk:
                                child_chunks.append(sub_chunk)
                            sub_chunk = sent
                    if sub_chunk:
                        current_chunk = sub_chunk
                else:
                    current_chunk = para

        if current_chunk:
            child_chunks.append(current_chunk)

        return child_chunks or [text]


# =====================================================================
# 3. MULTIMODAL DIAGRAM PARSER (VLM FIGURES & TABLES)
# =====================================================================

class MultimodalDiagramParser:
    """
    Parses embedded figures, tables, and visual engineering schematics into
    textual descriptions using local VLM inference or fallback metadata.
    """

    def parse_figure_description(
        self,
        figure_title: str,
        structured_summary: str,
        image_path: Optional[str] = None,
        doc_metadata: Optional[Dict[str, Any]] = None,
    ) -> ParentChildChunk:
        """
        Generates a Parent-Child chunk pair representing a visual diagram/figure.
        """
        doc_meta = dict(doc_metadata or {})
        doc_meta["is_vlm_diagram"] = True
        doc_meta["figure_title"] = figure_title
        if image_path:
            doc_meta["image_path"] = image_path

        fig_hash = hashlib.sha256(f"{figure_title}:{structured_summary[:100]}".encode("utf-8")).hexdigest()[:12]
        parent_id = f"parent_fig_{fig_hash}"
        child_id = f"child_fig_{fig_hash}_0"

        text_content = f"### [FIGURE / DIAGRAM]: {figure_title}\n\n{structured_summary}"

        parent_chunk = ParentChildChunk(
            chunk_id=parent_id,
            parent_chunk_id=None,
            is_parent=True,
            text=text_content,
            token_count=len(text_content.split()),
            metadata=doc_meta,
        )

        child_chunk = ParentChildChunk(
            chunk_id=child_id,
            parent_chunk_id=parent_id,
            is_parent=False,
            text=text_content,
            token_count=len(text_content.split()),
            metadata=doc_meta,
        )

        return parent_chunk, child_chunk


# =====================================================================
# 4. P&ID TOPOLOGY SERIALIZER (NETWORKX TO TEXTUAL CHUNKS)
# =====================================================================

class PIDTopologySerializer:
    """
    Converts NetworkX topological graphs (from graph_builder.py) into queryable
    textual parent-child chunk payloads for vector and sparse search indexing.
    """

    def serialize_pid_graph(
        self, graph: Any, drawing_name: str, doc_metadata: Dict[str, Any]
    ) -> List[ParentChildChunk]:
        """
        Serializes a NetworkX graph of a P&ID schematic into textual chunks.
        """
        chunks: List[ParentChildChunk] = []
        meta = dict(doc_metadata)
        meta["is_pid_topology"] = True
        meta["drawing_name"] = drawing_name

        parent_id = f"parent_pid_{hashlib.sha256(drawing_name.encode('utf-8')).hexdigest()[:12]}"

        # Collect node & edge descriptions
        node_lines: List[str] = []
        edge_lines: List[str] = []

        if hasattr(graph, "nodes"):
            for node, data in graph.nodes(data=True):
                tag = data.get("tag") or str(node)
                node_type = data.get("type", "Equipment/Junction")
                spec = data.get("spec", "")
                node_lines.append(f"- Tag: {tag} | Type: {node_type} | Spec: {spec}")

        if hasattr(graph, "edges"):
            for u, v, data in graph.edges(data=True):
                u_tag = graph.nodes[u].get("tag", str(u)) if hasattr(graph, "nodes") and u in graph.nodes else str(u)
                v_tag = graph.nodes[v].get("tag", str(v)) if hasattr(graph, "nodes") and v in graph.nodes else str(v)
                line_tag = data.get("line_tag", "Piping Connection")
                edge_lines.append(f"- Line '{line_tag}' connects {u_tag} ---> {v_tag}")

        parent_text = (
            f"### [P&ID TOPOLOGY GRAPH]: {drawing_name}\n\n"
            f"**Equipment & Nodes ({len(node_lines)} total):**\n"
            + "\n".join(node_lines[:50])
            + "\n\n**Piping Connections & Edges ({len(edge_lines)} total):**\n"
            + "\n".join(edge_lines[:50])
        )

        parent_chunk = ParentChildChunk(
            chunk_id=parent_id,
            parent_chunk_id=None,
            is_parent=True,
            text=parent_text,
            token_count=len(parent_text.split()),
            metadata=meta,
        )
        chunks.append(parent_chunk)

        # Generate child chunks for node batches
        batch_size = 15
        for i in range(0, max(len(node_lines), 1), batch_size):
            node_batch = node_lines[i : i + batch_size]
            child_id = f"child_pid_{parent_id}_{i // batch_size}"
            child_text = f"P&ID Drawing '{drawing_name}' Topology Component Summary:\n" + "\n".join(node_batch)

            child_meta = dict(meta)
            child_meta["batch_index"] = i // batch_size

            child_chunk = ParentChildChunk(
                chunk_id=child_id,
                parent_chunk_id=parent_id,
                is_parent=False,
                text=child_text,
                token_count=len(child_text.split()),
                metadata=child_meta,
            )
            chunks.append(child_chunk)

        return chunks


# =====================================================================
# 5. UNIFIED INGESTION PIPELINE
# =====================================================================

class IngestionPipeline:
    """
    Unified entry point for document and diagram ingestion.
    """

    def __init__(self):
        self.text_splitter = HierarchicalDocumentSplitter()
        self.diagram_parser = MultimodalDiagramParser()
        self.pid_serializer = PIDTopologySerializer()

    def process_document(
        self, text: str, metadata: Dict[str, Any]
    ) -> List[ParentChildChunk]:
        """
        Processes a raw text or markdown document into Parent-Child chunks.
        """
        # Ensure mandatory metadata defaults
        meta = dict(metadata)
        meta.setdefault("clearance_level", "PUBLIC")
        meta.setdefault("tenant_id", "default_tenant")
        meta.setdefault("doc_family_id", str(uuid.uuid4())[:8])
        meta.setdefault("version_number", "1.0")
        meta.setdefault("is_active", True)

        return self.text_splitter.split_text(text, meta)

    def process_pid_topology(
        self, graph: Any, drawing_name: str, metadata: Dict[str, Any]
    ) -> List[ParentChildChunk]:
        """
        Processes a NetworkX P&ID graph into queryable Parent-Child chunks.
        """
        meta = dict(metadata)
        meta.setdefault("clearance_level", "PUBLIC")
        meta.setdefault("tenant_id", "default_tenant")
        meta.setdefault("doc_family_id", str(uuid.uuid4())[:8])
        meta.setdefault("version_number", "1.0")
        meta.setdefault("is_active", True)

        return self.pid_serializer.serialize_pid_graph(graph, drawing_name, meta)
