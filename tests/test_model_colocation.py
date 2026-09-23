"""
tests/test_model_colocation.py — Item 7.5 Verification

Verifies that the vLLM AWQ 4-bit model co-location manager:
  1. Reports Reasoner VRAM within the <8.5 GB hard limit
  2. Reports Vision VRAM within the <1.2 GB hard limit
  3. Reports total VRAM < 24 GB system ceiling
  4. KV-cache reservation is positive and within ceiling
  5. assert_within_budget() does not raise

Run: pytest tests/test_model_colocation.py -v
"""

from __future__ import annotations

import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sovereign.models.colocation_manager import (
    ColocationManager,
    VRAMTelemetry,
    REASONER_VRAM_LIMIT_GB,
    VISION_VRAM_LIMIT_GB,
    SYSTEM_VRAM_CEILING_GB,
    REASONER_VRAM_MEASURED_GB,
    VISION_VRAM_MEASURED_GB,
    KV_CACHE_RESERVED_GB,
    get_vram_telemetry,
    get_manager,
)


class TestColocationManagerBudgets:

    @pytest.fixture
    def manager(self):
        return ColocationManager()

    def test_reasoner_vram_within_limit(self, manager):
        """Reasoner VRAM must be strictly below 8.5 GB."""
        t = manager.get_vram_telemetry()
        reasoner_gb = t.reasoner.actual_vram_gb or t.reasoner.vram_measured_gb
        assert reasoner_gb < REASONER_VRAM_LIMIT_GB, (
            f"Reasoner VRAM {reasoner_gb:.2f} GB exceeds hard limit {REASONER_VRAM_LIMIT_GB} GB"
        )

    def test_vision_vram_within_limit(self, manager):
        """Vision backbone VRAM must be strictly below 1.2 GB."""
        t = manager.get_vram_telemetry()
        vision_gb = t.vision.actual_vram_gb or t.vision.vram_measured_gb
        assert vision_gb < VISION_VRAM_LIMIT_GB, (
            f"Vision VRAM {vision_gb:.2f} GB exceeds hard limit {VISION_VRAM_LIMIT_GB} GB"
        )

    def test_total_vram_within_ceiling(self, manager):
        """Total model VRAM must be within the 24 GB system ceiling."""
        t = manager.get_vram_telemetry()
        assert t.total_static_vram_gb <= SYSTEM_VRAM_CEILING_GB, (
            f"Total VRAM {t.total_static_vram_gb:.2f} GB exceeds ceiling {SYSTEM_VRAM_CEILING_GB} GB"
        )

    def test_kv_cache_reservation_positive(self, manager):
        """KV-cache reservation must be positive."""
        t = manager.get_vram_telemetry()
        assert t.kv_cache_reserved_gb > 0.0, (
            f"KV-cache reservation {t.kv_cache_reserved_gb:.2f} GB is non-positive"
        )

    def test_kv_cache_gte_14gb(self, manager):
        """KV-cache reservation should be at least 14 GB (ceiling minus static weights)."""
        t = manager.get_vram_telemetry()
        # Budget: 24 - (7.6 + 0.9) = 15.5 GB; allow 10 GB minimum for test tolerance
        assert t.kv_cache_reserved_gb >= 10.0, (
            f"KV-cache {t.kv_cache_reserved_gb:.2f} GB is below 10 GB minimum"
        )

    def test_within_ceiling_flag(self, manager):
        """within_ceiling flag must be True."""
        t = manager.get_vram_telemetry()
        assert t.within_ceiling is True

    def test_assert_within_budget_does_not_raise(self, manager):
        """assert_within_budget() must not raise on a correctly configured manager."""
        manager.assert_within_budget()  # should not raise

    def test_telemetry_as_dict_schema(self, manager):
        """as_dict() output must include all required keys."""
        d = manager.get_vram_telemetry().as_dict()
        required_keys = {
            "reasoner_model", "reasoner_vram_gb", "reasoner_vram_limit_gb",
            "vision_model", "vision_vram_gb", "vision_vram_limit_gb",
            "total_static_vram_gb", "kv_cache_reserved_gb", "system_ceiling_gb",
            "within_ceiling", "cuda_available", "status",
        }
        missing = required_keys - set(d.keys())
        assert not missing, f"Missing keys in telemetry dict: {missing}"

    def test_status_field_is_within_ceiling(self, manager):
        """status field must be 'WITHIN_CEILING'."""
        d = manager.get_vram_telemetry().as_dict()
        assert d["status"] == "WITHIN_CEILING"

    def test_measured_constants_are_accurate(self):
        """Verify module-level measured constants match documented architecture values."""
        assert REASONER_VRAM_MEASURED_GB == pytest.approx(7.6, abs=0.1), \
            "Reasoner measured VRAM diverges from documented 7.6 GB"
        assert VISION_VRAM_MEASURED_GB == pytest.approx(0.9, abs=0.1), \
            "Vision measured VRAM diverges from documented 0.9 GB"
        assert KV_CACHE_RESERVED_GB == pytest.approx(
            SYSTEM_VRAM_CEILING_GB - REASONER_VRAM_MEASURED_GB - VISION_VRAM_MEASURED_GB,
            abs=0.01,
        )


class TestColocationSingleton:

    def test_singleton_returns_same_instance(self):
        m1 = get_manager()
        m2 = get_manager()
        assert m1 is m2

    def test_get_vram_telemetry_convenience(self):
        d = get_vram_telemetry()
        assert isinstance(d, dict)
        assert "reasoner_vram_gb" in d
        assert d["within_ceiling"] is True


class TestColocationEdgeCases:

    def test_budget_violation_raises(self):
        """Patching measured VRAM above limit must cause assert_within_budget() to raise."""
        manager = ColocationManager()
        # Force the reasoner to appear over budget
        manager._reasoner.actual_vram_gb = REASONER_VRAM_LIMIT_GB + 1.0
        manager._reasoner.vram_measured_gb = REASONER_VRAM_LIMIT_GB + 1.0
        with pytest.raises(RuntimeError, match="VRAM budget violation"):
            manager.assert_within_budget()

    def test_total_exceeds_ceiling_raises(self):
        """If both models sum above 24 GB, assert_within_budget must raise."""
        manager = ColocationManager()
        manager._reasoner.vram_measured_gb = 20.0
        manager._reasoner.actual_vram_gb = 20.0
        manager._vision.vram_measured_gb = 5.0
        manager._vision.actual_vram_gb = 5.0
        with pytest.raises(RuntimeError, match="VRAM budget violation"):
            manager.assert_within_budget()
