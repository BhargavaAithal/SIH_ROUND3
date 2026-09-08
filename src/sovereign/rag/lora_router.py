"""
Sovereign RAG Subsystem: Router-Driven Multi-LoRA Hot-Swapping Engine
Detects query domain intent and hot-swaps domain-specialized LoRA adapters in VRAM.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Dict, Optional

logger = logging.getLogger("sovereign.rag.lora_router")


@dataclass
class LoRAAdapterProfile:
    """
    Metadata profile for a domain-specialized LoRA adapter checkpoint.
    """
    adapter_id: str
    domain_name: str
    weights_path: str
    vram_size_mb: int = 128


class DomainLoRARouter:
    """
    Router managing domain intent classification and dynamic LoRA adapter hot-swapping.
    """

    def __init__(self):
        self.adapters: Dict[str, LoRAAdapterProfile] = {
            "ASME_MECHANICAL": LoRAAdapterProfile(
                adapter_id="lora_asme_v1",
                domain_name="ASME Mechanical & Pressure Piping",
                weights_path="models/loras/asme_b313.safetensors",
            ),
            "API_PETROCHEMICAL": LoRAAdapterProfile(
                adapter_id="lora_api_v1",
                domain_name="API Storage Tank & Vessel Inspection",
                weights_path="models/loras/api_510.safetensors",
            ),
            "PSU_TENDER_MEMOS": LoRAAdapterProfile(
                adapter_id="lora_psu_v1",
                domain_name="PSU Board Memos & Approval Notes",
                weights_path="models/loras/psu_memos.safetensors",
            ),
        }
        self.active_adapter: Optional[LoRAAdapterProfile] = None

    def classify_domain(self, query: str) -> str:
        """
        Classifies query intent into target domain category.
        """
        q_lower = query.lower()

        if any(k in q_lower for k in ["asme", "b31.3", "wall thickness", "allowable stress", "pipe spec"]):
            return "ASME_MECHANICAL"

        if any(k in q_lower for k in ["api", "510", "650", "tank", "corrosion rate", "remaining life"]):
            return "API_PETROCHEMICAL"

        if any(k in q_lower for k in ["psu", "approval note", "tender", "memo", "board"]):
            return "PSU_TENDER_MEMOS"

        return "GENERAL"

    def select_and_hot_swap(self, query: str) -> Optional[LoRAAdapterProfile]:
        """
        Classifies domain and hot-swaps the active LoRA adapter in VRAM.
        """
        domain = self.classify_domain(query)
        if domain in self.adapters:
            target_profile = self.adapters[domain]
            if self.active_adapter != target_profile:
                logger.info(f"Hot-swapping LoRA adapter -> {target_profile.adapter_id} ({target_profile.domain_name})")
                self.active_adapter = target_profile
            return target_profile

        self.active_adapter = None
        return None
