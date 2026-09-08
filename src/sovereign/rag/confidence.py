"""
Sovereign RAG Subsystem: Confidence Scoring, Refusal Gate & Temporal Warning Engine
Evaluates grounding scores, enforces honest refusal for scores < 0.45,
and detects superseded/historical document versions.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from sovereign.rag.ingestion import ParentChildChunk

logger = logging.getLogger("sovereign.rag.confidence")


@dataclass
class ConfidenceResult:
    """
    Evaluation metrics for retrieval grounding and safety.
    """
    score: float
    tier: str  # "HIGH", "MODERATE", "LOW_REFUSAL"
    should_refuse: bool
    refusal_message: Optional[str] = None
    temporal_warnings: List[str] = field(default_factory=list)


class ConfidenceEvaluator:
    """
    Evaluates grounding quality, threshold gates, and temporal validity of retrieved context.
    """

    def __init__(
        self,
        refusal_threshold: float = 0.45,
        high_confidence_threshold: float = 0.75,
    ):
        self.refusal_threshold = refusal_threshold
        self.high_confidence_threshold = high_confidence_threshold

    def evaluate_retrieval(
        self,
        query: str,
        retrieved_candidates: List[Tuple[ParentChildChunk, float]],
        active_doc_versions: Optional[Dict[str, str]] = None,
    ) -> ConfidenceResult:
        """
        Evaluates retrieved chunks for grounding score, refusal gates, and temporal warnings.
        """
        if not retrieved_candidates:
            return ConfidenceResult(
                score=0.0,
                tier="LOW_REFUSAL",
                should_refuse=True,
                refusal_message=(
                    "Insufficient domain context found in the air-gapped knowledge base "
                    "to safely answer this query according to engineering standards."
                ),
            )

        # Average rerank / similarity score across top candidates
        top_scores = [score for _, score in retrieved_candidates]
        avg_score = sum(top_scores) / len(top_scores)
        max_score = max(top_scores)
        grounding_score = round((avg_score * 0.4) + (max_score * 0.6), 3)

        # Determine Confidence Tier & Honest Refusal Gate
        if grounding_score < self.refusal_threshold:
            tier = "LOW_REFUSAL"
            should_refuse = True
            refusal_msg = (
                f"Grounding score ({grounding_score:.2f}) fell below safety threshold ({self.refusal_threshold}). "
                "Insufficient domain context found in knowledge base."
            )
        elif grounding_score >= self.high_confidence_threshold:
            tier = "HIGH"
            should_refuse = False
            refusal_msg = None
        else:
            tier = "MODERATE"
            should_refuse = False
            refusal_msg = None

        # Detect Temporal Warnings (Outdated / Superseded Documents)
        temporal_warnings: List[str] = []
        for chunk, _ in retrieved_candidates:
            meta = chunk.metadata
            doc_family = meta.get("doc_family_id")
            doc_version = meta.get("version_number", "1.0")
            effective_date = meta.get("effective_date")
            is_active = meta.get("is_active", True)

            if not is_active or (
                active_doc_versions
                and doc_family in active_doc_versions
                and active_doc_versions[doc_family] != doc_version
            ):
                doc_name = meta.get("doc_name", "Document")
                warning_msg = (
                    f"⚠️ NOTICE: Retrieved source '{doc_name}' (Version {doc_version}, Effective: {effective_date or 'N/A'}) "
                    "is superseded by a newer edition in the knowledge base."
                )
                if warning_msg not in temporal_warnings:
                    temporal_warnings.append(warning_msg)

        return ConfidenceResult(
            score=grounding_score,
            tier=tier,
            should_refuse=should_refuse,
            refusal_message=refusal_msg,
            temporal_warnings=temporal_warnings,
        )
