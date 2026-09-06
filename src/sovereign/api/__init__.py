"""
Sovereign AI Execution Plane & Industrial Workbench — API Package
Provides air-gapped FastAPI server, SSE streaming, and neurosymbolic verification endpoints.
"""

from sovereign.api.server import app, create_app

__all__ = ["app", "create_app"]
