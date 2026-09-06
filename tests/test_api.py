"""
Unit and Integration Tests for SMITRACE FastAPI Server & API Endpoints
Module: tests.test_api
"""
import json
import os
import pytest
from fastapi.testclient import TestClient

from sovereign.api.server import create_app, app


@pytest.fixture(scope="module")
def client():
    """Create test client for the FastAPI application."""
    test_app = create_app()
    with TestClient(test_app, raise_server_exceptions=False) as c:
        yield c


class TestStaticAndSPARouting:
    """Test static file serving and single-page application route fallback."""

    def test_root_serves_spa(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "text/html" in resp.headers["content-type"]
        assert "SMITRACE" in resp.text or "AIR-GAP ACTIVE" in resp.text

    def test_spa_client_side_routing_fallback(self, client):
        # Client-side routes must fall back to index.html with status 200
        for route in ["/pid", "/sandbox", "/z3", "/deliverables", "/custom/view"]:
            resp = client.get(route)
            assert resp.status_code == 200
            assert "text/html" in resp.headers["content-type"]
            assert "SMITRACE" in resp.text or "AIR-GAP ACTIVE" in resp.text

    def test_api_route_not_found_returns_404_json(self, client):
        resp = client.get("/api/v1/nonexistent")
        assert resp.status_code == 404
        data = resp.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()


class TestSecurityMiddlewares:
    """Test zero-outbound CSP, airgap headers, and mTLS proxy protection."""

    def test_security_headers_present(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        headers = resp.headers

        assert "Content-Security-Policy" in headers
        assert "default-src 'self'" in headers["Content-Security-Policy"]
        assert "connect-src 'self'" in headers["Content-Security-Policy"]
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-AirGap-Status") == "ACTIVE"
        assert headers.get("X-WAN-Egress-Bytes") == "0"

    def test_non_loopback_proxy_rejected(self, client):
        resp = client.get("/api/v1/health", headers={"X-Forwarded-For": "203.0.113.195"})
        assert resp.status_code == 403
        data = resp.json()
        assert "Non-loopback proxy" in data["detail"]

    def test_loopback_proxy_allowed(self, client):
        resp = client.get("/api/v1/health", headers={"X-Forwarded-For": "127.0.0.1"})
        assert resp.status_code == 200

    def test_mtls_strict_mode_blocks_unverified(self, monkeypatch):
        monkeypatch.setenv("SOVEREIGN_ENFORCE_MTLS", "1")
        strict_app = create_app()
        with TestClient(strict_app) as c:
            # Without verification header -> 401
            resp = c.get("/api/v1/health")
            assert resp.status_code == 401

            # With verification header -> 200
            resp_verified = c.get("/api/v1/health", headers={
                "X-SSL-Client-Verify": "SUCCESS",
                "X-SSL-Client-DN": "CN=Engineer-01,O=Refinery,C=IN"
            })
            assert resp_verified.status_code == 200


class TestAirgapTelemetry:
    """Test telemetry reporting, socket inspection, and zero egress."""

    def test_get_airgap_telemetry(self, client):
        resp = client.get("/api/v1/telemetry/airgap")
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] in ("PASS", "WARNING")
        assert data["airgap_active"] is True
        assert data["wan_egress_bytes"] == 0
        assert data["live_throughput_kbps"] == 0.0
        assert data["packets_captured"] == 0
        assert data["open_wan_sockets"] == 0
        assert len(data["integrity_hash"]) == 64
        assert isinstance(data["sockets"], list)
        assert len(data["sockets"]) >= 1


class TestEventStreamSSE:
    """Test real-time Server-Sent Events (SSE) streaming endpoint."""

    def test_events_stream_endpoint(self, client):
        with client.stream("GET", "/api/v1/events?max_events=2") as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]
            lines = list(resp.iter_lines())
            text = "\n".join(lines)
            assert "event: connect" in text
            assert '"airgap": "PASS"' in text or '"status": "connected"' in text


class TestPIDTopologyAndCalculate:
    """Test P&ID topology retrieval and mechanical thickness calculation."""

    def test_get_topology(self, client):
        resp = client.get("/api/v1/pid/topology")
        assert resp.status_code == 200
        data = resp.json()

        assert data["drawing_id"] == "PID-CDU-01-REV4"
        assert data["dimensions"]["width"] == 4000
        assert data["dimensions"]["height"] == 3000
        assert len(data["nodes"]) >= 5
        assert len(data["edges"]) >= 4

        # Verify key tags exist
        node_tags = {n["tag"] for n in data["nodes"]}
        assert "V-101" in node_tags
        assert "10-P-101A" in node_tags
        assert "FCV-202" in node_tags
        assert "E-101" in node_tags
        assert "TK-500" in node_tags

    def test_calculate_pid_asme_b31_3_sat(self, client):
        payload = {
            "standard": "ASME_B31_3",
            "line_tag": "16-P-101-CS-150",
            "parameters": {
                "P": 1.96,
                "D": 406.4,
                "S": 137.9,
                "E": 1.0,
                "Y": 0.4,
                "c": 3.0,
                "t_actual": 9.52,
            }
        }
        resp = client.post("/api/v1/pid/calculate", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["is_valid"] is True
        assert data["verdict"] == "SAT"
        assert data["margin"] > 0
        assert data["t_min"] > 0
        assert len(data["steps"]) == 5
        assert data["z3_verified"] is True

    def test_calculate_pid_asme_b31_3_unsat(self, client):
        payload = {
            "standard": "ASME_B31_3",
            "line_tag": "12-P-105-CS-150",
            "parameters": {
                "P": 2.45,
                "D": 323.8,
                "S": 137.9,
                "E": 1.0,
                "Y": 0.4,
                "c": 3.0,
                "t_actual": 5.20,
            }
        }
        resp = client.post("/api/v1/pid/calculate", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["is_valid"] is False
        assert data["verdict"] == "UNSAT"
        assert data["margin"] < 0
        assert len(data["violations"]) >= 1

    def test_calculate_pid_api_510(self, client):
        payload = {
            "standard": "API_510",
            "parameters": {
                "t_actual": 12.0,
                "t_min": 8.0,
                "P": 2.0,
                "corrosion_rate": 0.15,
            }
        }
        resp = client.post("/api/v1/pid/calculate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is True
        assert data["verdict"] == "SAT"
        assert data["margin"] == 4.0


class TestSandboxAndASTGuard:
    """Test process isolation, AST security checker, and zero egress in execution."""

    def test_sandbox_execute_clean_code(self, client):
        code = "import json\nout = {'val': 42}\nprint(json.dumps(out))"
        payload = {
            "code": code,
            "timeout_sec": 5.0,
            "memory_limit_mb": 256,
            "enforce_ast_guard": True,
        }
        resp = client.post("/api/v1/sandbox/execute", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["success"] is True
        assert data["returncode"] == 0
        assert data["network_egress_bytes"] == 0
        assert '{"val": 42}' in data["stdout"]
        assert data["ast_guard"]["is_safe"] is True

    def test_sandbox_ast_guard_blocks_forbidden_network_import(self, client):
        code = "import socket\ns = socket.socket()\nprint('hack')"
        payload = {
            "code": code,
            "timeout_sec": 5.0,
            "enforce_ast_guard": True,
        }
        resp = client.post("/api/v1/sandbox/execute", json=payload)
        assert resp.status_code == 422
        data = resp.json()
        assert "AST Security Policy Violation" in data["detail"]["error"]
        assert any("socket" in v for v in data["detail"]["violations"])

    def test_sandbox_ast_guard_blocks_os_subprocess(self, client):
        code = "import subprocess\nsubprocess.run(['ls'])"
        payload = {"code": code, "enforce_ast_guard": True}
        resp = client.post("/api/v1/sandbox/execute", json=payload)
        assert resp.status_code == 422

    def test_sandbox_ast_guard_blocks_eval(self, client):
        code = "res = eval('2 + 2')\nprint(res)"
        payload = {"code": code, "enforce_ast_guard": True}
        resp = client.post("/api/v1/sandbox/execute", json=payload)
        assert resp.status_code == 422


class TestVerifierEvaluate:
    """Test direct Z3 formal verifier endpoint."""

    def test_verifier_evaluate_asme_sat(self, client):
        payload = {
            "standard": "ASME_B31_3",
            "parameters": {
                "P": 400.0,
                "D": 16.0,
                "S": 20000.0,
                "E": 1.0,
                "Y": 0.4,
                "c": 0.0625,
                "t_actual": 0.320,
            }
        }
        resp = client.post("/api/v1/verifier/evaluate", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["is_valid"] is True
        assert data["status"] == "SAT"
        assert data["far_rate"] == 0.0
        assert data["margin"] > 0
        assert "t_m" in data["proof_log"] or "tm" in data["proof_log"]

    def test_verifier_evaluate_asme_unsat(self, client):
        payload = {
            "standard": "ASME_B31_3",
            "parameters": {
                "P": 400.0,
                "D": 16.0,
                "S": 20000.0,
                "E": 1.0,
                "Y": 0.4,
                "c": 0.0625,
                "t_actual": 0.210,
            }
        }
        resp = client.post("/api/v1/verifier/evaluate", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        assert data["margin"] < 0
        assert len(data["violations"]) >= 1


class TestDeliverables:
    """Test OOXML deliverables generation (.docx memo and .xlsx workbook)."""

    def test_get_deliverable_memo(self, client):
        resp = client.get("/api/v1/deliverables/memo")
        assert resp.status_code == 200
        assert "wordprocessingml.document" in resp.headers["content-type"]
        assert resp.content.startswith(b"PK\x03\x04")  # Valid ZIP / OOXML header
        assert len(resp.content) > 1000

    def test_get_deliverable_workbook(self, client):
        resp = client.get("/api/v1/deliverables/workbook")
        assert resp.status_code == 200
        assert "spreadsheetml.sheet" in resp.headers["content-type"]
        assert resp.content.startswith(b"PK\x03\x04")  # Valid ZIP / OOXML header
        assert len(resp.content) > 1000

    def test_post_deliverable_memo_custom(self, client):
        custom_payload = {
            "metadata": {
                "title": "CUSTOM REFINERY MEMORANDUM",
                "ref_no": "TEST/2026/01",
                "facility": "Gujarat Refinery",
                "pipeline_section": "VGO Hydrotreater",
                "tag": "14-HC-201",
            },
            "calculations": [
                {
                    "point_id": "UT-01",
                    "tag": "14-HC-201",
                    "pressure": "500 psi",
                    "diameter": "14 in",
                    "t_min": "0.30 in",
                    "t_actual": "0.45 in",
                    "margin": "+0.15 in",
                    "verdict": "SAT",
                }
            ],
            "citations": ["ASME B31.3 Section 304.1.2"]
        }
        resp = client.post("/api/v1/deliverables/memo", json=custom_payload)
        assert resp.status_code == 200
        assert resp.content.startswith(b"PK\x03\x04")

    def test_post_deliverable_workbook_custom(self, client):
        custom_payload = {
            "sheets_data": {
                "AuditSummary": [{"Metric": "Safety Score", "Value": "100%"}]
            }
        }
        resp = client.post("/api/v1/deliverables/workbook", json=custom_payload)
        assert resp.status_code == 200
        assert resp.content.startswith(b"PK\x03\x04")


class TestAgentRunAndHealth:
    """Test ReAct state machine trigger and health check."""

    def test_agent_run_endpoint(self, client):
        payload = {
            "task_id": "TASK-API-TEST",
            "task_description": "Verify CDU crude line thickness per ASME B31.3",
            "parameters": {
                "P": 2.5,
                "D": 323.8,
                "S": 137.9,
                "E": 1.0,
                "Y": 0.4,
                "c": 3.0,
                "t_actual": 9.52,
            }
        }
        resp = client.post("/api/v1/agent/run", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["turns_used"] <= 3
        assert "t_min" in data["stdout"] or data["returncode"] == 0

    def test_health_check(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "HEALTHY"
        assert data["airgap"] == "ACTIVE"
        assert data["wan_egress_bytes"] == 0


class TestZeroCDNAudit:
    """Verify that ui/dist contains zero external CDN dependencies."""

    def test_zero_cdn_links_in_dist(self):
        from pathlib import Path
        import re

        dist_dir = Path("ui/dist")
        assert dist_dir.exists(), "ui/dist directory must exist"

        # Block external CDN patterns (unpkg, cdnjs, fonts.googleapis, etc.)
        cdn_domains = ["cdn.", "unpkg.com", "cdnjs.cloudflare.com", "jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"]

        for file_path in dist_dir.rglob("*"):
            if file_path.suffix in (".html", ".js", ".css"):
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for domain in cdn_domains:
                    assert domain not in content, f"Found external CDN reference '{domain}' in {file_path}"

