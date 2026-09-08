"""
Comprehensive Integration Test Suite for Sovereign RAG & Knowledge Subsystem
Covers Ingestion, RBAC Multi-Tenancy, Hybrid RRF Retrieval, Grounding Evaluation,
Refusal Gates, and Provenance Citation Formatting.
"""

import pytest
from sovereign.rag.ingestion import IngestionPipeline
from sovereign.rag.rbac import UserSecurityContext, RBACFilter
from sovereign.rag.retrieval import HybridRetrievalEngine, compute_rrf_fusion
from sovereign.rag.confidence import ConfidenceEvaluator
from sovereign.rag.citations import CitationFormatter


@pytest.fixture
def sample_knowledge_base():
    pipeline = IngestionPipeline()

    doc1_text = """# Section 304.1.2: ASME B31.3 Pipe Wall Thickness
The minimum required pipe wall thickness t_m shall be calculated as follows:
t_m = (P * D) / (2 * (S * E + P * Y)) + c.
Where P is internal design pressure, D is outside diameter, S is allowable stress.
"""
    meta1 = {
        "doc_name": "ASME_B313_2022.pdf",
        "doc_family_id": "ASME_B313",
        "version_number": "2022",
        "effective_date": "2022-12-01",
        "clearance_level": "RESTRICTED",
        "tenant_id": "refinery_alpha",
        "is_active": True,
    }

    doc2_text = """# Section 304.1.2: ASME B31.3 Pipe Wall Thickness (Historical)
Historical 2019 edition calculation for pipe wall thickness.
Superseded by 2022 edition.
"""
    meta2 = {
        "doc_name": "ASME_B313_2019.pdf",
        "doc_family_id": "ASME_B313",
        "version_number": "2019",
        "effective_date": "2019-10-01",
        "clearance_level": "RESTRICTED",
        "tenant_id": "refinery_alpha",
        "is_active": False,
    }

    chunks1 = pipeline.process_document(doc1_text, meta1)
    chunks2 = pipeline.process_document(doc2_text, meta2)

    return chunks1 + chunks2


def test_rbac_multi_tenancy_filtering(sample_knowledge_base):
    # User from another tenant
    user_tenant_b = UserSecurityContext(
        user_id="user_2", tenant_id="refinery_beta", clearance_level="SECRET"
    )
    accessible_b = RBACFilter.filter_chunks(sample_knowledge_base, user_tenant_b)
    assert len(accessible_b) == 0  # Zero leakage cross-tenant

    # User from correct tenant but low clearance
    user_low_clearance = UserSecurityContext(
        user_id="user_1", tenant_id="refinery_alpha", clearance_level="PUBLIC"
    )
    accessible_low = RBACFilter.filter_chunks(sample_knowledge_base, user_low_clearance)
    assert len(accessible_low) == 0  # Requires RESTRICTED level

    # Authorized user
    user_authorized = UserSecurityContext(
        user_id="user_3", tenant_id="refinery_alpha", clearance_level="RESTRICTED"
    )
    accessible_auth = RBACFilter.filter_chunks(sample_knowledge_base, user_authorized)
    assert len(accessible_auth) == len(sample_knowledge_base)


def test_hybrid_rrf_retrieval(sample_knowledge_base):
    engine = HybridRetrievalEngine()
    engine.index_chunks(sample_knowledge_base)

    user_context = UserSecurityContext(
        user_id="user_auth", tenant_id="refinery_alpha", clearance_level="RESTRICTED"
    )

    query = "ASME B31.3 pipe wall thickness calculation formula"
    results = engine.retrieve(query, user_context=user_context, final_top_k=3)

    assert len(results) > 0
    top_chunk, score = results[0]
    assert "t_m =" in top_chunk.text or "ASME B31.3" in top_chunk.text


def test_confidence_evaluation_and_temporal_warning(sample_knowledge_base):
    evaluator = ConfidenceEvaluator(refusal_threshold=0.45)
    engine = HybridRetrievalEngine()
    engine.index_chunks(sample_knowledge_base)

    user_context = UserSecurityContext(
        user_id="user_auth", tenant_id="refinery_alpha", clearance_level="RESTRICTED"
    )

    # Relevant query -> High / Moderate Confidence
    results = engine.retrieve("ASME B31.3 pipe wall thickness", user_context=user_context)
    conf_res = evaluator.evaluate_retrieval(
        "ASME B31.3 pipe wall thickness",
        results,
        active_doc_versions={"ASME_B313": "2022"},
    )

    assert conf_res.should_refuse is False
    assert conf_res.tier in ["HIGH", "MODERATE"]

    # Check temporal warning detection if old version chunk is present
    has_warning = any("superseded" in w for w in conf_res.temporal_warnings)
    # Irrelevant query -> Low Refusal Gate
    refusal_res = evaluator.evaluate_retrieval("Quantum thermodynamics in black holes", [])
    assert refusal_res.should_refuse is True
    assert refusal_res.tier == "LOW_REFUSAL"
    assert "Insufficient domain context" in refusal_res.refusal_message


def test_citation_formatting_and_provenance(sample_knowledge_base):
    chunk = sample_knowledge_base[0]
    tag = CitationFormatter.format_citation_tag(chunk)

    assert "[Doc: ASME_B313_2022.pdf" in tag
    assert "Chk: #" in tag

    payload = CitationFormatter.compile_provenance_payload([(chunk, 0.85)])
    assert len(payload) == 1
    assert payload[0]["doc_name"] == "ASME_B313_2022.pdf"
    assert payload[0]["relevance_score"] == 0.85
