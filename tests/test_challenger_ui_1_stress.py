"""
Adversarial Stress Test Suite — Challenger 1
Target: FastAPI Core Server (src/sovereign/api/server.py) & Security Boundaries
Empirically stress-tests:
  1. Security & mTLS Boundary Testing (Spoofed Proxy Headers, Zero-Outbound CSP, AirGap Headers)
  2. AST Guard Security Bypass Attacks on /api/v1/sandbox/execute
  3. Z3 Formal Verifier Boundary Testing on /api/v1/verifier/evaluate & /api/v1/pid/calculate
  4. SSE Streaming Stress Testing on /api/v1/events
  5. Binary Deliverables Integrity on /api/v1/deliverables/memo & /api/v1/deliverables/workbook
"""
from __future__ import annotations

import asyncio
import io
import json
import math
import os
import sys
import time
import zipfile
from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient

from sovereign.api.server import create_app, broadcaster
from sovereign.verifier.ast_guard import verify_python_ast
from sovereign.verifier.z3_asme import verify_asme_b31_3
from sovereign.verifier.z3_api510 import verify_api_510_invariants


@pytest.fixture(scope="module")
def client():
    """Create a synchronous TestClient for FastAPI."""
    app = create_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ============================================================================
# 1. Security & mTLS Boundary Testing
# ============================================================================

class TestSecurityAndMTLSBoundaries:
    """Stress-test proxy spoofing, air-gap enforcement, and security headers."""

    @pytest.mark.parametrize("spoofed_ip", [
        "192.168.1.100",
        "10.0.0.1",
        "172.16.0.5",
        "203.0.113.195",
        "8.8.8.8",
        "1.1.1.1",
    ])
    def test_spoofed_x_forwarded_for_immediate_403(self, client, spoofed_ip):
        """Verify that requests with non-loopback X-Forwarded-For are strictly rejected with 403 Forbidden."""
        resp = client.get("/api/v1/health", headers={"X-Forwarded-For": spoofed_ip})
        assert resp.status_code == 403, f"Expected 403 Forbidden for X-Forwarded-For: {spoofed_ip}, got {resp.status_code}"
        data = resp.json()
        assert "Non-loopback proxy forwarding forbidden" in data["detail"]

    def test_multi_hop_x_forwarded_for_rejection(self, client):
        """Verify multi-hop X-Forwarded-For containing any non-loopback IP is rejected."""
        resp = client.get("/api/v1/health", headers={"X-Forwarded-For": "127.0.0.1, 192.168.1.100"})
        assert resp.status_code == 403
        data = resp.json()
        assert "Non-loopback proxy" in data["detail"]

    @pytest.mark.parametrize("loopback_ip", ["127.0.0.1", "::1", "localhost"])
    def test_loopback_x_forwarded_for_allowed(self, client, loopback_ip):
        """Verify that legitimate local proxy forwarding (127.0.0.1, ::1, localhost) is permitted."""
        resp = client.get("/api/v1/health", headers={"X-Forwarded-For": loopback_ip})
        assert resp.status_code == 200

    def test_spoofed_x_real_ip_vulnerability_probe(self, client):
        """
        Hardened probe: Confirms that X-Real-IP: 10.0.0.1 is rejected with 403 Forbidden.
        MTLSSecurityMiddleware inspects X-Real-IP and blocks non-loopback forwarding.
        """
        resp = client.get("/api/v1/health", headers={"X-Real-IP": "10.0.0.1"})
        assert resp.status_code == 403
        assert "Non-loopback proxy" in resp.json()["detail"]

    @pytest.mark.parametrize("proxy_header, value", [
        ("Forwarded", "for=192.168.1.100;proto=http"),
        ("X-Client-IP", "10.0.0.1"),
        ("CF-Connecting-IP", "198.51.100.1"),
        ("True-Client-IP", "203.0.113.50"),
    ])
    def test_alternative_proxy_headers_bypass_probe(self, client, proxy_header, value):
        """Alternative proxy headers with non-loopback IPs are blocked with 403 Forbidden."""
        resp = client.get("/api/v1/health", headers={proxy_header: value})
        assert resp.status_code == 403
        assert "Non-loopback proxy" in resp.json()["detail"]

    @pytest.mark.parametrize("endpoint", [
        "/api/v1/health",
        "/api/v1/telemetry/airgap",
        "/api/v1/pid/topology",
    ])
    def test_strict_security_headers_present_on_200_responses(self, client, endpoint):
        """Verify strict CSP, X-AirGap-Status, and frame protection on standard API responses."""
        resp = client.get(endpoint)
        assert resp.status_code == 200
        h = resp.headers

        # Check strict zero-external-egress CSP
        assert "Content-Security-Policy" in h, f"Missing Content-Security-Policy on {endpoint}"
        csp = h["Content-Security-Policy"]
        assert "default-src 'self'" in csp
        assert "connect-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "object-src 'none'" in csp

        # Check airgap and isolation headers
        assert h.get("X-AirGap-Status") == "ACTIVE", f"Missing or invalid X-AirGap-Status on {endpoint}"
        assert h.get("X-WAN-Egress-Bytes") == "0", f"Missing or invalid X-WAN-Egress-Bytes on {endpoint}"
        assert h.get("X-Frame-Options") == "DENY"
        assert h.get("X-Content-Type-Options") == "nosniff"
        assert h.get("Referrer-Policy") == "no-referrer"

    def test_security_headers_omission_on_403_proxy_rejected_response(self, client):
        """
        Hardened verification: 403 responses generated by MTLSSecurityMiddleware
        include all standard security headers (CSP, X-AirGap-Status, X-WAN-Egress-Bytes, etc.).
        """
        resp = client.get("/api/v1/health", headers={"X-Forwarded-For": "192.168.1.100"})
        assert resp.status_code == 403
        h = resp.headers
        assert "Content-Security-Policy" in h
        assert h.get("X-AirGap-Status") == "ACTIVE"
        assert h.get("X-WAN-Egress-Bytes") == "0"
        assert h.get("X-Frame-Options") == "DENY"
        assert h.get("X-Content-Type-Options") == "nosniff"

    def test_mtls_strict_mode_blocks_unverified(self, monkeypatch):
        """Verify SOVEREIGN_ENFORCE_MTLS=1 blocks unverified requests with 401 Unauthorized."""
        monkeypatch.setenv("SOVEREIGN_ENFORCE_MTLS", "1")
        app = create_app()
        with TestClient(app) as c:
            # Without verification header -> 401
            resp = c.get("/api/v1/health")
            assert resp.status_code == 401
            assert "mTLS client certificate required" in resp.json()["detail"]

            # With failed verification -> 401
            resp_fail = c.get("/api/v1/health", headers={"X-SSL-Client-Verify": "FAILED"})
            assert resp_fail.status_code == 401

            # With SUCCESS verification -> 200
            resp_ok = c.get("/api/v1/health", headers={
                "X-SSL-Client-Verify": "SUCCESS",
                "X-SSL-Client-DN": "CN=Engineer-01,O=Refinery,C=IN"
            })
            assert resp_ok.status_code == 200


# ============================================================================
# 2. AST Guard Security Bypass Attacks on /api/v1/sandbox/execute
# ============================================================================

class TestASTGuardSandboxSecurityBypass:
    """Stress-test the AST guard on /api/v1/sandbox/execute against malicious payloads."""

    MALICIOUS_PAYLOADS = [
        # OS / Process Execution Attacks
        ("os_system", "import os\nos.system('ls')"),
        ("os_popen", "import os\nos.popen('whoami').read()"),
        ("subprocess_call", "import subprocess\nsubprocess.call(['echo', 'pwned'])"),
        ("subprocess_run", "import subprocess\nsubprocess.run(['ls', '-la'])"),
        ("shutil_rmtree", "import shutil\nshutil.rmtree('/tmp')"),
        ("pty_spawn", "import pty\npty.spawn('/bin/sh')"),
        ("from_os_system", "from os import system\nsystem('whoami')"),
        ("from_subprocess_popen", "from subprocess import Popen\nPopen(['calc'])"),

        # Network Egress & Protocol Attacks
        ("socket_connect", "import socket\ns = socket.socket()\ns.connect(('1.1.1.1', 80))"),
        ("from_socket_import", "from socket import socket, AF_INET, SOCK_STREAM\ns = socket(AF_INET, SOCK_STREAM)"),
        ("urllib_request", "import urllib.request\nurllib.request.urlopen('http://evil.com')"),
        ("requests_get", "import requests\nrequests.get('http://google.com')"),
        ("http_client", "import http.client\nconn = http.client.HTTPConnection('example.com')"),
        ("asyncio_network", "import asyncio\nasyncio.get_event_loop()"),

        # Dynamic Code Execution & Builtin Tampering
        ("dunder_import_socket", "__import__('socket').socket()"),
        ("dunder_import_os", "__import__('os').system('dir')"),
        ("eval_attack", "eval(\"__import__('os').system('whoami')\")"),
        ("exec_attack", "exec(\"import os; os.system('whoami')\")"),
        ("compile_attack", "c = compile(\"import os\", \"<str>\", \"exec\")\nexec(c)"),
        ("globals_access", "g = globals()\ng['__builtins__']"),
        ("locals_access", "l = locals()"),
        ("vars_access", "v = vars()"),
        ("dir_access", "d = dir()"),
        ("breakpoint_call", "breakpoint()"),

        # Dunder Introspection / Subclass Sandbox Escapes
        ("getattr_subclasses", "getattr(object, '__subclasses__')()"),
        ("class_base_subclasses", "().__class__.__base__.__subclasses__()"),
        ("mro_subclasses", "\"\".__class__.__mro__[1].__subclasses__()"),
        ("tuple_subclasses", "().__class__.__bases__[0].__subclasses__()"),
        ("int_subclasses", "(1).__class__.__base__.__subclasses__()"),

        # Destructive / Non-Read File Operations
        ("open_write_mode", "with open('malicious.txt', 'w') as f:\n    f.write('pwned')"),
        ("open_append_mode", "with open('malicious.txt', 'a') as f:\n    f.write('pwned')"),
        ("open_write_binary", "with open('malicious.bin', 'wb') as f:\n    f.write(b'pwned')"),
        ("open_alias_write", "f = open\nwith f('test.txt', 'w') as out:\n    out.write('test')"),
    ]

    @pytest.mark.parametrize("payload_name, code", MALICIOUS_PAYLOADS)
    def test_ast_guard_blocks_malicious_payload(self, client, payload_name, code):
        """Verify AST guard rejects malicious payload with HTTP 422 Unprocessable Entity."""
        req_body = {
            "code": code,
            "timeout_sec": 5.0,
            "memory_limit_mb": 256,
            "enforce_ast_guard": True,
        }
        resp = client.post("/api/v1/sandbox/execute", json=req_body)
        assert resp.status_code == 422, (
            f"VULNERABILITY: Payload '{payload_name}' bypassed AST guard! "
            f"Status: {resp.status_code}, Body: {resp.text}"
        )
        data = resp.json()
        assert "detail" in data
        assert data["detail"]["error"] == "AST Security Policy Violation"
        assert len(data["detail"]["violations"]) > 0

    def test_valid_engineering_code_passes_ast_guard(self, client):
        """Verify benign engineering calculation passes AST guard and executes successfully."""
        benign_code = (
            "import math\n"
            "P = 1.96\n"
            "D = 406.4\n"
            "S = 137.9\n"
            "E = 1.0\n"
            "Y = 0.4\n"
            "c = 3.0\n"
            "t_min = (P * D) / (2 * (S * E + P * Y)) + c\n"
            "print(f'CALC_SUCCESS: t_min={t_min:.4f}')\n"
        )
        req_body = {
            "code": benign_code,
            "timeout_sec": 5.0,
            "memory_limit_mb": 256,
            "enforce_ast_guard": True,
        }
        resp = client.post("/api/v1/sandbox/execute", json=req_body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "CALC_SUCCESS: t_min=5.87" in data["stdout"]
        assert data["ast_guard"]["is_safe"] is True

    @pytest.mark.parametrize("evasion_payload, description", [
        ("from pathlib import Path\nPath('malicious.txt').write_text('evil')", "Pathlib write_text file creation"),
        ("from pathlib import Path\nPath('malicious.txt').open('w').write('evil')", "Pathlib open write mode bypass"),
        ("from pathlib import Path\nPath('target.txt').unlink()", "Pathlib unlink file deletion"),
        ("import sqlite3\nconn = sqlite3.connect('evil.db')", "sqlite3 disk file creation"),
        ("import tempfile\nf = tempfile.NamedTemporaryFile('w')", "tempfile disk file write"),
    ])
    def test_ast_guard_evasion_vulnerabilities(self, client, evasion_payload, description):
        """
        Hardened verification: AST guard traps pathlib modification methods, sqlite3, and tempfile.
        Static verification returns is_safe=False and sandbox execute returns HTTP 422.
        """
        res = verify_python_ast(evasion_payload)
        assert res.is_safe is False, f"Expected violation for {description}"
        assert len(res.violations) > 0

        resp = client.post("/api/v1/sandbox/execute", json={
            "code": evasion_payload,
            "timeout_sec": 5.0,
            "memory_limit_mb": 256,
            "enforce_ast_guard": True,
        })
        assert resp.status_code == 422


# ============================================================================
# 3. Z3 Formal Verifier Boundary Testing (/api/v1/verifier/evaluate & /api/v1/pid/calculate)
# ============================================================================

class TestZ3FormalVerifierBoundaries:
    """Stress-test Z3 verifier on boundary, singular, and adversarial parameters."""

    # ASME B31.3 Baseline valid parameters
    ASME_VALID = {
        "P": 1.96,
        "D": 406.4,
        "S": 137.9,
        "E": 1.0,
        "Y": 0.4,
        "c": 3.0,
        "t_actual": 9.52,
    }

    # API 510 Baseline valid parameters
    API510_VALID = {
        "P": 1.5,
        "t_actual": 10.0,
        "t_min": 8.0,
        "corrosion_rate": 0.1,
    }

    @pytest.mark.parametrize("p_zero", [0.0, -0.0, -1.0, -100.0])
    def test_asme_zero_and_negative_pressure_boundary_crashes_with_500(self, client, p_zero):
        """
        Hardened verification: verify_asme_b31_3 clamps margin to safe finite float on invalid P.
        Endpoints return HTTP 200 with structured UNSAT instead of crashing with HTTP 500.
        """
        params = dict(self.ASME_VALID)
        params["P"] = p_zero

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        assert math.isfinite(data["margin"])

        resp_pid = client.post("/api/v1/pid/calculate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp_pid.status_code == 200
        data_pid = resp_pid.json()
        assert data_pid["is_valid"] is False
        assert data_pid["verdict"] == "UNSAT"
        assert math.isfinite(data_pid["margin"])

    @pytest.mark.parametrize("p_zero", [0.0, -0.0, -2.5])
    def test_api510_zero_and_negative_pressure_boundary(self, client, p_zero):
        """Verify zero or negative pressure is handled as UNSAT under API 510."""
        params = dict(self.API510_VALID)
        params["P"] = p_zero

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "API_510", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        assert any("pressure" in v.lower() for v in data["violations"])

    @pytest.mark.parametrize("t_neg", [-5.0, -0.001, 0.0])
    def test_asme_negative_or_zero_thickness_crashes_with_500(self, client, t_neg):
        """Negative or zero thickness on ASME returns HTTP 200 with structured UNSAT without crash."""
        params = dict(self.ASME_VALID)
        params["t_actual"] = t_neg

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        assert math.isfinite(data["margin"])

    @pytest.mark.parametrize("d_val", [0.0, -10.0, -406.4])
    def test_asme_zero_or_negative_diameter_crashes_with_500(self, client, d_val):
        """Zero or negative diameter on ASME returns HTTP 200 with structured UNSAT without crash."""
        params = dict(self.ASME_VALID)
        params["D"] = d_val

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        assert math.isfinite(data["margin"])

    def test_asme_sub_micron_deficit_rejection(self, client):
        """
        Verify that actual thickness strictly below required thickness by sub-micron amount (1e-6)
        is strictly rejected as UNSAT with negative margin.
        """
        tm_exact = 601.0 / 4008.0
        t_actual = tm_exact - 1e-6

        params = {
            "P": 100.0,
            "D": 10.0,
            "S": 20000.0,
            "E": 1.0,
            "Y": 0.4,
            "c": 0.125,
            "t_actual": t_actual,
        }

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        assert data["margin"] < 0.0
        assert data["far_rate"] == 0.0

    def test_asme_nano_deficit_masked_by_rounding(self, client):
        """
        Adversarial discovery: For deficit delta = 1e-9 mm (t_actual = tm - 1e-9),
        server rounds margin to 6 decimal places: round(-1e-9, 6) == -0.0.
        Since -0.0 < 0 is False, the negative margin sign is masked in downstream float comparisons.
        """
        tm_exact = 601.0 / 4008.0
        t_actual = tm_exact - 1e-9

        params = {
            "P": 100.0,
            "D": 10.0,
            "S": 20000.0,
            "E": 1.0,
            "Y": 0.4,
            "c": 0.125,
            "t_actual": t_actual,
        }

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert data["status"] == "UNSAT"
        # EMPIRICAL FINDING: margin is rounded to -0.0
        assert data["margin"] == -0.0
        assert not (data["margin"] < 0.0), "Deficit is masked by round(margin, 6) producing -0.0"

    def test_api510_zero_corrosion_rate_pid_divide_by_zero_crash(self, client):
        """
        Hardened verification: On /api/v1/pid/calculate with API_510, when corrosion_rate == 0,
        Remaining life calculation is guarded and returns 999.0 years instead of dividing by zero.
        """
        params = dict(self.API510_VALID)
        params["corrosion_rate"] = 0.0

        resp = client.post("/api/v1/pid/calculate", json={"standard": "API_510", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["steps"][1]["result"] == 999.0

    def test_asme_extreme_pressure_behavior(self, client):
        """
        Verify extreme pressure (P = 10^6 psi) evaluates without crashing or overflow.
        With P = 1,000,000 psi and standard thickness, it returns UNSAT gracefully.
        """
        params = dict(self.ASME_VALID)
        params["P"] = 1_000_000.0

        resp = client.post("/api/v1/verifier/evaluate", json={"standard": "ASME_B31_3", "parameters": params})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "UNSAT"
        assert data["far_rate"] == 0.0


# ============================================================================
# 4. SSE Streaming Stress Testing (/api/v1/events)
# ============================================================================

class TestSSEStreamingResilience:
    """Stress-test SSE streaming endpoint (/api/v1/events) under connection, events, and closure."""

    def test_sse_client_initial_connect_greeting(self, client):
        """Verify SSE endpoint streams initial connect event with airgap and status payload."""
        resp = client.get("/api/v1/events?max_events=1")
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        body = resp.text

        assert "event: connect" in body
        assert '"status": "connected"' in body
        assert '"airgap": "PASS"' in body
        assert '"wan_egress": 0' in body

    def test_sse_max_events_clean_closure(self, client):
        """Verify passing max_events terminates stream cleanly without server hanging."""
        t0 = time.time()
        resp = client.get("/api/v1/events?max_events=2")
        duration = time.time() - t0

        assert resp.status_code == 200
        body = resp.text
        lines = [l for l in body.split("\n") if l.startswith("event:")]
        assert len(lines) >= 1
        assert duration < 5.0, f"SSE stream took too long to terminate: {duration:.2f}s"

    def test_sse_broadcaster_subscribe_unsubscribe_cycle(self):
        """Verify EventBroadcaster correctly registers and unregisters subscriber queues."""
        q1 = broadcaster.subscribe()
        q2 = broadcaster.subscribe()
        assert q1 in broadcaster._subscribers
        assert q2 in broadcaster._subscribers

        broadcaster.unsubscribe(q1)
        assert q1 not in broadcaster._subscribers
        assert q2 in broadcaster._subscribers

        broadcaster.unsubscribe(q2)
        assert q2 not in broadcaster._subscribers

    @pytest.mark.asyncio
    async def test_sse_broadcaster_event_dispatch(self):
        """Verify that broadcaster.broadcast delivers payload to active subscribers."""
        q = broadcaster.subscribe()
        try:
            test_data = {"test_key": "adversarial_probe", "ts": time.time()}
            await broadcaster.broadcast("test_event", test_data)

            msg = await asyncio.wait_for(q.get(), timeout=2.0)
            assert msg["event"] == "test_event"
            payload = json.loads(msg["data"])
            assert payload["test_key"] == "adversarial_probe"
        finally:
            broadcaster.unsubscribe(q)

    @pytest.mark.asyncio
    async def test_sse_broadcaster_concurrent_subscribers(self):
        """Verify EventBroadcaster reliably fans out messages across 20 concurrent subscriber queues."""
        subscribers = [broadcaster.subscribe() for _ in range(20)]
        try:
            event_type = "stress_multicast"
            data = {"message": "fanout_check", "count": 20}
            await broadcaster.broadcast(event_type, data)

            for q in subscribers:
                msg = await asyncio.wait_for(q.get(), timeout=2.0)
                assert msg["event"] == event_type
                assert json.loads(msg["data"])["message"] == "fanout_check"
        finally:
            for q in subscribers:
                broadcaster.unsubscribe(q)


# ============================================================================
# 5. Binary Deliverables Integrity (/api/v1/deliverables/memo & /api/v1/deliverables/workbook)
# ============================================================================

class TestBinaryDeliverablesIntegrity:
    """Stress-test binary document generation, MIME types, headers, and OOXML/ZIP integrity."""

    PK_MAGIC = b"\x50\x4B\x03\x04"

    def test_deliverable_memo_get_integrity(self, client):
        """Verify GET /api/v1/deliverables/memo returns valid WordprocessingML OOXML ZIP."""
        resp = client.get("/api/v1/deliverables/memo")
        assert resp.status_code == 200

        # Verify MIME and disposition headers
        ct = resp.headers["content-type"]
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in ct
        assert "attachment" in resp.headers.get("content-disposition", "")
        assert resp.headers.get("x-deliverable-format") == "ISO_IEC_29500_OOXML"

        # Verify binary body
        content = resp.content
        assert len(content) > 1024, f"Memo content size too small: {len(content)} bytes"
        assert content[:4] == self.PK_MAGIC, f"Invalid ZIP magic bytes: {content[:4]}"

        # Verify internal OOXML structure
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            namelist = zf.namelist()
            assert "[Content_Types].xml" in namelist
            assert "word/document.xml" in namelist
            assert "_rels/.rels" in namelist

            # Verify document.xml is valid XML
            doc_xml = zf.read("word/document.xml")
            assert b"<w:document" in doc_xml

    def test_deliverable_workbook_get_integrity(self, client):
        """Verify GET /api/v1/deliverables/workbook returns valid SpreadsheetML OOXML ZIP."""
        resp = client.get("/api/v1/deliverables/workbook")
        assert resp.status_code == 200

        # Verify MIME and disposition headers
        ct = resp.headers["content-type"]
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in ct
        assert "attachment" in resp.headers.get("content-disposition", "")
        assert resp.headers.get("x-deliverable-format") == "ISO_IEC_29500_OOXML"

        # Verify binary body
        content = resp.content
        assert len(content) > 1024, f"Workbook content size too small: {len(content)} bytes"
        assert content[:4] == self.PK_MAGIC, f"Invalid ZIP magic bytes: {content[:4]}"

        # Verify internal OOXML structure
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            namelist = zf.namelist()
            assert "[Content_Types].xml" in namelist
            assert "xl/workbook.xml" in namelist
            assert "_rels/.rels" in namelist

            # Verify workbook.xml is valid XML
            wb_xml = zf.read("xl/workbook.xml")
            assert b"<workbook" in wb_xml

    def test_deliverable_memo_post_custom_payload(self, client):
        """Verify POST /api/v1/deliverables/memo with custom metadata and calculations."""
        custom_payload = {
            "metadata": {
                "title": "ADVERSARIAL STRESS TEST AUDIT MEMO",
                "ref_no": "TEST/ADV/2026/001",
                "facility": "Paradip Refinery - CDU-1 Hostile Ingestion",
                "pipeline_section": "16\" Crude Transfer Run",
                "tag": "16\"-P-101-CS-150",
                "date": "2026-09-06",
                "department": "Mechanical Integrity Assurance",
                "classification": "STRICTLY AIR-GAPPED INTERNAL USE",
            },
            "calculations": [
                {
                    "point_id": "PT-ADV-01",
                    "tag": "16\"-P-101",
                    "pressure": "500.0 psig",
                    "diameter": "16.0 in",
                    "t_min": "0.2500 in",
                    "t_actual": "0.3500 in",
                    "margin": "+0.1000 in",
                    "verdict": "SAT",
                },
                {
                    "point_id": "PT-ADV-02",
                    "tag": "12\"-P-105",
                    "pressure": "600.0 psig",
                    "diameter": "12.75 in",
                    "t_min": "0.3000 in",
                    "t_actual": "0.2800 in",
                    "margin": "-0.0200 in",
                    "verdict": "UNSAT",
                },
            ],
            "citations": [
                "ASME B31.3 Section 304.1.2: Minimum Required Wall Thickness.",
                "API 510 Section 7.1.1: Invariant Safety Thresholds.",
            ]
        }

        resp = client.post("/api/v1/deliverables/memo", json=custom_payload)
        assert resp.status_code == 200
        content = resp.content
        assert content[:4] == self.PK_MAGIC

        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            doc_xml = zf.read("word/document.xml").decode("utf-8")
            assert "ADVERSARIAL STRESS TEST AUDIT MEMO" in doc_xml
            assert "PT-ADV-01" in doc_xml

    def test_deliverable_workbook_post_custom_payload(self, client):
        """Verify POST /api/v1/deliverables/workbook with custom sheet tables."""
        custom_payload = {
            "sheets_data": {
                "Audit_Summary": [
                    {"Parameter": "Audit Run", "Value": "Adversarial UI-1"},
                    {"Parameter": "Engine", "Value": "Z3 Arbitrary Precision"},
                    {"Parameter": "FAR", "Value": "0.0000%"},
                ],
                "Deficit_Pipes": [
                    {
                        "Tag": "12\"-P-105-CS-150",
                        "Design_Pressure_psi": 600.0,
                        "t_act_in": 0.280,
                        "t_min_in": 0.300,
                        "Verdict": "UNSAT",
                    }
                ]
            }
        }

        resp = client.post("/api/v1/deliverables/workbook", json=custom_payload)
        assert resp.status_code == 200
        content = resp.content
        assert content[:4] == self.PK_MAGIC

        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            assert "xl/workbook.xml" in zf.namelist()
