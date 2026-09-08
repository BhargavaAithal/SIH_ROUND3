"""
Unit Test Suite for Sovereign RAG Ingestion Pipeline & Multimodal Chunking Engine
"""

import pytest
import networkx as nx
from sovereign.rag.ingestion import (
    ParentChildChunk,
    HierarchicalDocumentSplitter,
    MultimodalDiagramParser,
    PIDTopologySerializer,
    IngestionPipeline,
)


def test_hierarchical_document_splitter_basic():
    splitter = HierarchicalDocumentSplitter(parent_max_chars=500, child_max_chars=150)
    sample_markdown = """# Section 1: ASME B31.3 Pipe Wall Thickness
The minimum required pipe wall thickness t_m shall be calculated according to equation (3a).
Formula: t_m = (P * D) / (2 * (S * E + P * Y)) + c.

## Subsection 1.1: Allowable Stress Values
Allowable stress S for ASTM A106 Grade B carbon steel at 100°F is 20,000 psi.
Joint quality factor E is 1.00 for seamless pipe.

# Section 2: Hydrostatic Testing Criteria
Hydrostatic leak test pressure shall be not less than 1.5 times the design pressure.
"""

    metadata = {
        "doc_name": "ASME_B313.md",
        "clearance_level": "RESTRICTED",
        "tenant_id": "psu_refinery_1",
    }

    chunks = splitter.split_text(sample_markdown, metadata)
    assert len(chunks) > 0

    # Ensure parent chunks exist
    parent_chunks = [c for c in chunks if c.is_parent]
    child_chunks = [c for c in chunks if not c.is_parent]

    assert len(parent_chunks) >= 2
    assert len(child_chunks) >= 2

    for child in child_chunks:
        assert child.parent_chunk_id is not None
        assert child.metadata["clearance_level"] == "RESTRICTED"
        assert child.metadata["tenant_id"] == "psu_refinery_1"


def test_multimodal_diagram_parser():
    parser = MultimodalDiagramParser()
    parent_chunk, child_chunk = parser.parse_figure_description(
        figure_title="Figure 304.1.2 — Pipe Wall Thickness Geometry",
        structured_summary="Diagram showing outer diameter D, internal pressure P, corrosion allowance c, and wall thickness t.",
        doc_metadata={"doc_name": "ASME_B313.pdf"},
    )

    assert parent_chunk.is_parent is True
    assert child_chunk.is_parent is False
    assert child_chunk.parent_chunk_id == parent_chunk.chunk_id
    assert parent_chunk.metadata["is_vlm_diagram"] is True
    assert "Figure 304.1.2" in parent_chunk.text


def test_pid_topology_serializer():
    serializer = PIDTopologySerializer()

    # Create a synthetic NetworkX P&ID graph
    G = nx.DiGraph()
    G.add_node("V-101", tag="V-101", type="Pressure Vessel", spec="API 510")
    G.add_node("P-101A", tag="P-101A", type="Centrifugal Pump", spec="API 610")
    G.add_edge("V-101", "P-101A", line_tag='4"-CW-1001-A1')

    metadata = {"doc_name": "PID-001.svg", "clearance_level": "PUBLIC"}
    chunks = serializer.serialize_pid_graph(G, "PID-001", metadata)

    assert len(chunks) >= 2
    parent_chunk = chunks[0]
    assert parent_chunk.is_parent is True
    assert parent_chunk.metadata["is_pid_topology"] is True
    assert "V-101" in parent_chunk.text
    assert "4\"-CW-1001-A1" in parent_chunk.text


def test_unified_ingestion_pipeline():
    pipeline = IngestionPipeline()
    sample_text = "# Title\nThis is a sample document content for unified pipeline test."
    metadata = {"doc_name": "sample.txt"}

    chunks = pipeline.process_document(sample_text, metadata)
    assert len(chunks) > 0
    for chunk in chunks:
        assert "clearance_level" in chunk.metadata
        assert "tenant_id" in chunk.metadata
        assert "doc_family_id" in chunk.metadata
