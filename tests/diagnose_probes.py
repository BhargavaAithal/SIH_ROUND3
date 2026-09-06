import io
import json
import math
import sys
import zipfile
sys.path.insert(0, 'src')

from fastapi.testclient import TestClient
from sovereign.api.server import create_app, broadcaster
from sovereign.verifier.ast_guard import verify_python_ast
from sovereign.verifier.z3_asme import verify_asme_b31_3
from sovereign.verifier.z3_api510 import verify_api_510_invariants

print("=================================================================")
print("EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1 REPORT")
print("=================================================================\n")

app = create_app()
client = TestClient(app, raise_server_exceptions=False)

# ---------------------------------------------------------------------------
# 1. SECURITY & MTLS BOUNDARY PROBING
# ---------------------------------------------------------------------------
print(">>> 1. SECURITY & MTLS BOUNDARY PROBING")

# Spoofed headers test
proxy_probes = [
    ("X-Forwarded-For", "192.168.1.100", "Spoofed WAN IP in X-Forwarded-For"),
    ("X-Forwarded-For", "127.0.0.1, 10.0.0.1", "Multi-hop with WAN IP in X-Forwarded-For"),
    ("X-Forwarded-For", "127.0.0.1", "Valid loopback IP in X-Forwarded-For"),
    ("X-Real-IP", "10.0.0.1", "Spoofed WAN IP in X-Real-IP"),
    ("X-Real-IP", "192.168.1.50", "Spoofed private WAN IP in X-Real-IP"),
    ("Forwarded", "for=192.168.1.100;proto=http", "Standard RFC 7239 Forwarded header"),
    ("CF-Connecting-IP", "198.51.100.1", "Cloudflare WAN client IP header"),
    ("True-Client-IP", "203.0.113.50", "Akamai True-Client-IP header"),
    ("X-Client-IP", "10.0.0.1", "Generic proxy client IP header"),
]

for header_name, header_val, desc in proxy_probes:
    r = client.get("/api/v1/health", headers={header_name: header_val})
    status = r.status_code
    verdict = "BLOCKED (403)" if status == 403 else f"PERMITTED ({status})"
    print(f"  [{verdict}] {header_name}: {header_val} — {desc}")

# Security Headers on 200 vs 403 vs 404
print("\n>>> 1.1 SECURITY HEADERS AUDIT")
for test_name, endpoint, extra_headers in [
    ("200 OK (/api/v1/health)", "/api/v1/health", {}),
    ("403 Forbidden (Spoofed X-Forwarded-For)", "/api/v1/health", {"X-Forwarded-For": "192.168.1.100"}),
    ("404 Not Found (/api/v1/nonexistent)", "/api/v1/nonexistent", {}),
]:
    r = client.get(endpoint, headers=extra_headers)
    h = r.headers
    print(f"\n  Response: {test_name} [Status {r.status_code}]")
    print(f"    - Content-Security-Policy: {'PRESENT' if 'content-security-policy' in h else 'MISSING'}")
    if 'content-security-policy' in h:
        print(f"        Val: {h['content-security-policy'][:60]}...")
    print(f"    - X-AirGap-Status: {h.get('x-airgap-status', 'MISSING')}")
    print(f"    - X-WAN-Egress-Bytes: {h.get('x-wan-egress-bytes', 'MISSING')}")
    print(f"    - X-Frame-Options: {h.get('x-frame-options', 'MISSING')}")
    print(f"    - X-Content-Type-Options: {h.get('x-content-type-options', 'MISSING')}")

# ---------------------------------------------------------------------------
# 2. AST GUARD SECURITY BYPASS PROBING
# ---------------------------------------------------------------------------
print("\n>>> 2. AST GUARD SECURITY BYPASS PROBING")

ast_attack_payloads = [
    ("OS Command Execution", "import os; os.system('ls')"),
    ("OS Popen Read", "import os; os.popen('whoami').read()"),
    ("Subprocess Call", "import subprocess; subprocess.call(['echo', 'pwned'])"),
    ("Socket Network Connect", "import socket; s = socket.socket()"),
    ("Urllib HTTP Egress", "import urllib.request; urllib.request.urlopen('http://evil.com')"),
    ("Dynamic Eval", "eval(\"__import__('os').system('whoami')\")"),
    ("Dynamic Exec", "exec(\"import os\")"),
    ("Dunder Import Socket", "__import__('socket')"),
    ("Dunder Import OS", "__import__('os')"),
    ("Globals Introspection", "globals()['__builtins__']"),
    ("Getattr Subclasses Sandbox Escape", "getattr(object, '__subclasses__')()"),
    ("Class MRO Subclasses Sandbox Escape", "\"\".__class__.__mro__[1].__subclasses__()"),
    ("Class Base Subclasses Sandbox Escape", "().__class__.__bases__[0].__subclasses__()"),
    ("File Write via open('w')", "with open('malicious.txt', 'w') as f: f.write('evil')"),
    ("File Append via open('a')", "with open('malicious.txt', 'a') as f: f.write('evil')"),
    ("Open Aliasing via variable", "f = open; f('malicious.txt', 'w')"),
    ("Pathlib Write Text (Evasion Probe)", "from pathlib import Path; Path('malicious.txt').write_text('evil')"),
    ("Pathlib Open Write (Evasion Probe)", "from pathlib import Path; Path('malicious.txt').open('w').write('evil')"),
    ("Pathlib Unlink Delete (Evasion Probe)", "from pathlib import Path; Path('target.txt').unlink()"),
    ("Sqlite3 DB Write (Evasion Probe)", "import sqlite3; conn = sqlite3.connect('evil.db')"),
    ("Tempfile Named (Evasion Probe)", "import tempfile; f = tempfile.NamedTemporaryFile('w')"),
]

for attack_name, payload in ast_attack_payloads:
    res = verify_python_ast(payload)
    r_api = client.post("/api/v1/sandbox/execute", json={"code": payload, "enforce_ast_guard": True})
    status_str = f"API {r_api.status_code}"
    is_safe = res.is_safe
    verdict = "BLOCKED" if (not is_safe and r_api.status_code == 422) else "EVADED/BYPASSED"
    print(f"  [{verdict}] {attack_name}")
    print(f"      Code: {payload}")
    print(f"      AST Safe: {is_safe} | Violations count: {len(res.violations)} | {status_str}")

# ---------------------------------------------------------------------------
# 3. Z3 FORMAL VERIFIER BOUNDARY & CRASH PROBING
# ---------------------------------------------------------------------------
print("\n>>> 3. Z3 FORMAL VERIFIER BOUNDARY & EXTREME VALUES PROBING")

z3_boundary_probes = [
    ("ASME Baseline Valid", "ASME_B31_3", {"P": 1.96, "D": 406.4, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 9.52}),
    ("ASME Zero Pressure (P = 0)", "ASME_B31_3", {"P": 0.0, "D": 406.4, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 9.52}),
    ("ASME Negative Pressure (P = -5.0)", "ASME_B31_3", {"P": -5.0, "D": 406.4, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 9.52}),
    ("ASME Zero Diameter (D = 0)", "ASME_B31_3", {"P": 1.96, "D": 0.0, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 9.52}),
    ("ASME Negative Thickness (t = -1.0)", "ASME_B31_3", {"P": 1.96, "D": 406.4, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": -1.0}),
    ("ASME Zero Thickness (t = 0.0)", "ASME_B31_3", {"P": 1.96, "D": 406.4, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 0.0}),
    ("ASME Extreme Pressure (P = 10^6)", "ASME_B31_3", {"P": 1_000_000.0, "D": 406.4, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 9.52}),
    ("ASME Sub-micron Deficit (t_actual = tm - 1e-6)", "ASME_B31_3", {"P": 100.0, "D": 10.0, "S": 20000.0, "E": 1.0, "Y": 0.4, "c": 0.125, "t_actual": (601.0/4008.0) - 1e-6}),
    ("ASME Nano Deficit (t_actual = tm - 1e-9)", "ASME_B31_3", {"P": 100.0, "D": 10.0, "S": 20000.0, "E": 1.0, "Y": 0.4, "c": 0.125, "t_actual": (601.0/4008.0) - 1e-9}),
    ("API 510 Baseline Valid", "API_510", {"P": 1.5, "t_actual": 10.0, "t_min": 8.0, "corrosion_rate": 0.1}),
    ("API 510 Zero Pressure (P = 0)", "API_510", {"P": 0.0, "t_actual": 10.0, "t_min": 8.0, "corrosion_rate": 0.1}),
    ("API 510 Zero Corrosion Rate (Cr = 0)", "API_510", {"P": 1.5, "t_actual": 10.0, "t_min": 8.0, "corrosion_rate": 0.0}),
    ("API 510 Negative Thickness (t = -2.0)", "API_510", {"P": 1.5, "t_actual": -2.0, "t_min": 8.0, "corrosion_rate": 0.1}),
    ("API 510 Sub-micron Deficit (t = t_min - 1e-6)", "API_510", {"P": 1.5, "t_actual": 8.0 - 1e-6, "t_min": 8.0, "corrosion_rate": 0.1}),
]

for test_name, std, params in z3_boundary_probes:
    r_ev = client.post("/api/v1/verifier/evaluate", json={"standard": std, "parameters": params})
    r_pid = client.post("/api/v1/pid/calculate", json={"standard": std, "parameters": params})
    
    ev_status = r_ev.status_code
    pid_status = r_pid.status_code
    
    ev_detail = ""
    if ev_status == 200:
        d = r_ev.json()
        ev_detail = f"valid={d.get('is_valid')}, status={d.get('status')}, margin={d.get('margin')}"
    elif ev_status == 500:
        ev_detail = "CRASH: 500 Internal Server Error (-inf JSON serialization crash)"
    else:
        ev_detail = f"Status {ev_status}"

    pid_detail = ""
    if pid_status == 200:
        d_p = r_pid.json()
        pid_detail = f"verdict={d_p.get('verdict')}, margin={d_p.get('margin')}"
    elif pid_status == 500:
        pid_detail = "CRASH: 500 Internal Server Error"
    else:
        pid_detail = f"Status {pid_status}"

    print(f"  Probe: {test_name}")
    print(f"    /api/v1/verifier/evaluate: [{ev_status}] {ev_detail}")
    print(f"    /api/v1/pid/calculate:     [{pid_status}] {pid_detail}")

# ---------------------------------------------------------------------------
# 4. SSE STREAMING INTEGRITY
# ---------------------------------------------------------------------------
print("\n>>> 4. SSE STREAMING RESILIENCE PROBING")
r_sse = client.get("/api/v1/events?max_events=1")
print(f"  SSE Status: {r_sse.status_code}")
print(f"  Content-Type: {r_sse.headers.get('content-type')}")
print(f"  Initial Event Received:\n    {r_sse.text.strip().replace(chr(10), chr(10) + '    ')}")

# ---------------------------------------------------------------------------
# 5. BINARY DELIVERABLES INTEGRITY
# ---------------------------------------------------------------------------
print("\n>>> 5. BINARY DELIVERABLES INTEGRITY PROBING")

for deliv_name, deliv_route, expected_ext, marker in [
    ("Memo DOCX", "/api/v1/deliverables/memo", ".docx", "word/document.xml"),
    ("Workbook XLSX", "/api/v1/deliverables/workbook", ".xlsx", "xl/workbook.xml"),
]:
    r = client.get(deliv_route)
    content = r.content
    magic = content[:4]
    is_pk = (magic == b"\x50\x4B\x03\x04")
    size = len(content)
    
    valid_zip = False
    has_marker = False
    if is_pk:
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                valid_zip = True
                namelist = zf.namelist()
                has_marker = marker in namelist
        except Exception:
            pass

    print(f"  {deliv_name} ({deliv_route}):")
    print(f"    Status: {r.status_code} | Content-Type: {r.headers.get('content-type')}")
    print(f"    Size: {size} bytes | Magic: {magic.hex()} (PK magic: {is_pk})")
    print(f"    Valid OOXML ZIP: {valid_zip} | Contains {marker}: {has_marker}")

print("\n=================================================================")
print("PROBING COMPLETE.")
print("=================================================================")
