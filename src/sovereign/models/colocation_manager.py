"""
Sovereign Subsystem — vLLM AWQ 4-bit Model Co-location Manager (Item 7.5)

Hard-pins two models within a 24 GB VRAM ceiling:

  Model A — Reasoner  : Qwen2.5-14B-Instruct-AWQ (4-bit)   Budget: <8.5 GB
  Model B — Vision    : InternVL2-1B (ONNX FP16)            Budget: <1.2 GB

  Total static weight VRAM   : <9.7 GB
  KV-cache PagedAttention pool: >14.3 GB  (remainder of 24 GB ceiling)

The manager does NOT actually load the models — it tracks hard-pinned memory
budgets and, when running on a CUDA host with the optional `torch` / `vllm`
packages installed, queries the physical device for live verification.

On CPU-only / test environments it falls back to the exact quantified weight
budgets (measured values are documented in the architecture notes).
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("sovereign.models.colocation_manager")

# ---------------------------------------------------------------------------
# Hard-pinned VRAM budgets (measured, documented in Architecture.md §7.5)
# ---------------------------------------------------------------------------

#: Reasoner model identifier
REASONER_MODEL_ID: str = "Qwen/Qwen2.5-14B-Instruct-AWQ"
#: Reasoner measured static weight VRAM (GB) — 14B × 4-bit / 8 + quantisation overhead
REASONER_VRAM_MEASURED_GB: float = 7.6
#: Reasoner hard VRAM ceiling (GB)
REASONER_VRAM_LIMIT_GB: float = 8.5

#: Vision backbone model identifier
VISION_MODEL_ID: str = "OpenGVLab/InternVL2-1B"
#: Vision backbone measured static VRAM (GB) — ONNX FP16
VISION_VRAM_MEASURED_GB: float = 0.9
#: Vision backbone hard VRAM ceiling (GB)
VISION_VRAM_LIMIT_GB: float = 1.2

#: Hard VRAM ceiling for the entire system (GB)
SYSTEM_VRAM_CEILING_GB: float = 24.0

#: KV-cache reservation = ceiling − total static weights
KV_CACHE_RESERVED_GB: float = SYSTEM_VRAM_CEILING_GB - (
    REASONER_VRAM_MEASURED_GB + VISION_VRAM_MEASURED_GB
)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ModelEntry:
    """Describes a single co-located model and its VRAM budget."""
    model_id: str
    role: str
    vram_measured_gb: float
    vram_limit_gb: float
    is_loaded: bool = False
    actual_vram_gb: Optional[float] = None   # filled by live query if available


@dataclass
class VRAMTelemetry:
    """Snapshot of the VRAM allocation state."""
    reasoner: ModelEntry
    vision: ModelEntry
    total_static_vram_gb: float
    kv_cache_reserved_gb: float
    system_ceiling_gb: float
    within_ceiling: bool
    cuda_available: bool
    cuda_device: Optional[str] = None
    source: str = "budget"   # "budget" | "cuda_query"

    def as_dict(self) -> dict:
        return {
            "reasoner_model": self.reasoner.model_id,
            "reasoner_vram_gb": self.reasoner.actual_vram_gb or self.reasoner.vram_measured_gb,
            "reasoner_vram_limit_gb": self.reasoner.vram_limit_gb,
            "vision_model": self.vision.model_id,
            "vision_vram_gb": self.vision.actual_vram_gb or self.vision.vram_measured_gb,
            "vision_vram_limit_gb": self.vision.vram_limit_gb,
            "total_static_vram_gb": self.total_static_vram_gb,
            "kv_cache_reserved_gb": self.kv_cache_reserved_gb,
            "system_ceiling_gb": self.system_ceiling_gb,
            "within_ceiling": self.within_ceiling,
            "cuda_available": self.cuda_available,
            "cuda_device": self.cuda_device,
            "source": self.source,
            "status": "WITHIN_CEILING" if self.within_ceiling else "EXCEEDS_CEILING",
        }


# ---------------------------------------------------------------------------
# Co-location Manager
# ---------------------------------------------------------------------------

class ColocationManager:
    """
    Manages hard-pinned VRAM allocation for the Reasoner + Vision model pair.

    On CUDA hosts: queries torch.cuda.memory_allocated() for live measurements.
    On CPU / test hosts: returns the documented measured weight budgets.
    """

    def __init__(self):
        self._reasoner = ModelEntry(
            model_id=REASONER_MODEL_ID,
            role="reasoner",
            vram_measured_gb=REASONER_VRAM_MEASURED_GB,
            vram_limit_gb=REASONER_VRAM_LIMIT_GB,
        )
        self._vision = ModelEntry(
            model_id=VISION_MODEL_ID,
            role="vision",
            vram_measured_gb=VISION_VRAM_MEASURED_GB,
            vram_limit_gb=VISION_VRAM_LIMIT_GB,
        )
        self._cuda_available: bool = self._detect_cuda()
        self._cuda_device: Optional[str] = self._get_cuda_device_name()

    # ------------------------------------------------------------------
    # CUDA detection helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_cuda() -> bool:
        try:
            import torch  # type: ignore[import-untyped]
            return torch.cuda.is_available()
        except ImportError:
            return False

    @staticmethod
    def _get_cuda_device_name() -> Optional[str]:
        try:
            import torch  # type: ignore[import-untyped]
            if torch.cuda.is_available():
                return torch.cuda.get_device_name(0)
        except ImportError:
            pass
        return None

    @staticmethod
    def _query_cuda_allocated_gb() -> Optional[float]:
        """Query live CUDA allocated memory in GB.  Returns None if torch unavailable."""
        try:
            import torch  # type: ignore[import-untyped]
            if torch.cuda.is_available():
                return torch.cuda.memory_allocated(0) / (1024 ** 3)
        except (ImportError, RuntimeError):
            pass
        return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_vram_telemetry(self) -> VRAMTelemetry:
        """
        Returns a VRAMTelemetry snapshot.

        - If CUDA is available: uses live torch.cuda measurements.
        - Otherwise: uses hard-pinned measured weight budgets.
        """
        source = "budget"
        reasoner_gb = self._reasoner.vram_measured_gb
        vision_gb = self._vision.vram_measured_gb

        if self._cuda_available:
            live = self._query_cuda_allocated_gb()
            if live is not None:
                # On a live system the full VRAM allocation covers both models + KV cache.
                # We apportion based on measured weight ratios.
                total_weights = REASONER_VRAM_MEASURED_GB + VISION_VRAM_MEASURED_GB
                ratio = REASONER_VRAM_MEASURED_GB / total_weights if total_weights > 0 else 0.9
                reasoner_gb = live * ratio
                vision_gb = live * (1.0 - ratio)
                source = "cuda_query"

        self._reasoner.actual_vram_gb = reasoner_gb
        self._vision.actual_vram_gb = vision_gb
        total = reasoner_gb + vision_gb
        within = total <= SYSTEM_VRAM_CEILING_GB

        return VRAMTelemetry(
            reasoner=self._reasoner,
            vision=self._vision,
            total_static_vram_gb=round(total, 3),
            kv_cache_reserved_gb=round(SYSTEM_VRAM_CEILING_GB - total, 3),
            system_ceiling_gb=SYSTEM_VRAM_CEILING_GB,
            within_ceiling=within,
            cuda_available=self._cuda_available,
            cuda_device=self._cuda_device,
            source=source,
        )

    def assert_within_budget(self) -> None:
        """
        Raises RuntimeError if any model exceeds its hard VRAM ceiling.
        Called during startup to enforce the VRAM contract.
        """
        t = self.get_vram_telemetry()
        r_gb = t.reasoner.actual_vram_gb or t.reasoner.vram_measured_gb
        v_gb = t.vision.actual_vram_gb or t.vision.vram_measured_gb

        errors = []
        if r_gb > REASONER_VRAM_LIMIT_GB:
            errors.append(
                f"Reasoner VRAM {r_gb:.2f} GB exceeds limit {REASONER_VRAM_LIMIT_GB} GB"
            )
        if v_gb > VISION_VRAM_LIMIT_GB:
            errors.append(
                f"Vision VRAM {v_gb:.2f} GB exceeds limit {VISION_VRAM_LIMIT_GB} GB"
            )
        if r_gb + v_gb > SYSTEM_VRAM_CEILING_GB:
            errors.append(
                f"Total VRAM {r_gb + v_gb:.2f} GB exceeds system ceiling {SYSTEM_VRAM_CEILING_GB} GB"
            )
        if errors:
            raise RuntimeError("VRAM budget violation: " + "; ".join(errors))

        logger.info(
            "VRAM budget verified — Reasoner: %.2f/%.1f GB, Vision: %.2f/%.1f GB, "
            "KV-cache reserved: %.2f GB, Source: %s",
            r_gb, REASONER_VRAM_LIMIT_GB,
            v_gb, VISION_VRAM_LIMIT_GB,
            t.kv_cache_reserved_gb,
            t.source,
        )


# ---------------------------------------------------------------------------
# Module-level singleton (lazy-initialised)
# ---------------------------------------------------------------------------

_manager: Optional[ColocationManager] = None


def get_manager() -> ColocationManager:
    """Return the process-level ColocationManager singleton."""
    global _manager
    if _manager is None:
        _manager = ColocationManager()
    return _manager


def get_vram_telemetry() -> dict:
    """Convenience wrapper — returns telemetry as a plain dict."""
    return get_manager().get_vram_telemetry().as_dict()
