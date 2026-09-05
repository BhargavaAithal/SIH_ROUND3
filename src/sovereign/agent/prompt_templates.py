"""
Prompt Templates for State-Isolated Anti-Collapse Loop
Provides clean, minimal prompts decoupling immutable specifications
from ephemeral tracebacks to prevent conversational drift.
"""


def build_initial_prompt(task_id: str, description: str, parameters: dict) -> str:
    """Build Turn 1 prompt containing only immutable specifications."""
    return (
        f"TASK_ID: {task_id}\n"
        f"DESCRIPTION: {description}\n"
        f"PARAMETERS: {parameters}\n"
        "Generate a standalone Python calculation script that computes the required engineering values "
        "and prints the resulting JSON dictionary to stdout.\n"
        "Do not import forbidden modules (socket, os, subprocess, sys, requests). Use pure math."
    )


def build_clean_retry_prompt(task_id: str, description: str, traceback_str: str) -> str:
    """
    Build clean-context retry prompt.
    Contains ONLY Immutable Spec + Immediate Failure Traceback (NO multi-turn chat history).
    """
    return (
        f"TASK_ID: {task_id}\n"
        f"DESCRIPTION: {description}\n"
        "--- PREVIOUS TURN FAILURE TRACEBACK ---\n"
        f"{traceback_str.strip()}\n"
        "-----------------------------------------\n"
        "Self-correct the script to fix the error above. Return ONLY the corrected executable Python code."
    )
