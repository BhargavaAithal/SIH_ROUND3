"""
tests/test_sandbox.py
Comprehensive test suite for Sovereign AI Execution Plane Sandbox & Air-Gap Enforcement.
Covers:
- Standard command execution & output stream separation
- Timeout enforcement & process tree cleanup
- Memory limit enforcement & peak tracking
- Network isolation (socket/DNS blocking & env sanitization)
- Network egress audit (audit_network_egress, AirGapMonitor, airgap_audit parser)
- Return structures, edge cases, and error handling
"""

from __future__ import annotations

import json
import os
import socket
import sys
import time
from unittest.mock import MagicMock, patch

import psutil
import pytest

from sovereign.sandbox.auditor import (
    AirGapMonitor,
    AirGapVerdict,
    assert_zero_egress,
    audit_network_egress,
    parse_airgap_audit_output,
    parse_tcpdump_log,
)
from sovereign.sandbox.launcher import SandboxResult, run_sandboxed


# ---------------------------------------------------------------------------
# Scenario 1: Standard Command Execution
# ---------------------------------------------------------------------------

class TestStandardExecution:
    def test_echo_stdout(self, cmd_factory):
        res = run_sandboxed(cmd_factory.echo("Hello Sovereign"), timeout_sec=5)
        assert res.returncode == 0
        assert res.success is True
        assert "Hello Sovereign" in res.stdout
        assert res.stderr == ""
        assert res.execution_time_sec >= 0.0
        assert res.memory_peak_mb > 0.0
        assert res.network_egress_bytes == 0

    def test_arithmetic_evaluation(self, cmd_factory):
        res = run_sandboxed(cmd_factory.arithmetic("100 * 12 + 45"), timeout_sec=5)
        assert res.returncode == 0
        assert res.success is True
        assert res.stdout.strip() == "1245"

    def test_stderr_capture_and_separation(self):
        cmd = [sys.executable, "-c", "import sys; sys.stderr.write('Calculation warning\\n')"]
        res = run_sandboxed(cmd, timeout_sec=5)
        assert res.returncode == 0
        assert "Calculation warning" in res.stderr
        assert res.stdout == ""

    def test_nonzero_exit_code(self):
        cmd = [sys.executable, "-c", "import sys; sys.exit(42)"]
        res = run_sandboxed(cmd, timeout_sec=5)
        assert res.returncode == 42
        assert res.success is False

    def test_uncaught_exception(self):
        cmd = [sys.executable, "-c", "raise ValueError('Corrosion allowance invalid')"]
        res = run_sandboxed(cmd, timeout_sec=5)
        assert res.returncode != 0
        assert res.success is False
        assert "ValueError: Corrosion allowance invalid" in res.stderr

    def test_interleaved_streams(self):
        cmd = [
            sys.executable,
            "-c",
            "import sys; sys.stdout.write('OUT\\n'); sys.stderr.write('ERR\\n')"
        ]
        res = run_sandboxed(cmd, timeout_sec=5)
        assert res.returncode == 0
        assert "OUT" in res.stdout
        assert "ERR" in res.stderr

    def test_standard_execution_metrics(self, cmd_factory):
        res = run_sandboxed(cmd_factory.echo("metric check"), timeout_sec=5)
        assert res.execution_time_sec >= 0.0
        assert res.duration_sec == res.execution_time_sec
        assert res.memory_peak_mb > 0.0
        assert res.network_egress_bytes == 0


# ---------------------------------------------------------------------------
# Scenario 2: Timeout Enforcement
# ---------------------------------------------------------------------------

class TestTimeoutEnforcement:
    def test_sleep_timeout_terminates_promptly(self, cmd_factory):
        start = time.perf_counter()
        res = run_sandboxed(cmd_factory.sleep(10), timeout_sec=1)
        duration = time.perf_counter() - start

        assert res.returncode == 124
        assert res.timed_out is True
        assert res.success is False
        assert duration < 3.5
        assert res.execution_time_sec <= 3.5
        assert "timeout" in res.stderr.lower()

    def test_infinite_cpu_loop_terminates(self, cmd_factory):
        start = time.perf_counter()
        res = run_sandboxed(cmd_factory.infinite_loop(), timeout_sec=1)
        duration = time.perf_counter() - start

        assert res.returncode == 124
        assert res.timed_out is True
        assert res.success is False
        assert duration < 3.5

    def test_timeout_process_tree_cleanup(self, tmp_path):
        pid_file = tmp_path / "child.pid"
        code = (
            "import subprocess, sys, time\n"
            f"p = subprocess.Popen([{sys.executable!r}, '-c', 'import time; time.sleep(30)'])\n"
            f"open({str(pid_file)!r}, 'w').write(str(p.pid))\n"
            "time.sleep(30)\n"
        )
        res = run_sandboxed([sys.executable, "-c", code], timeout_sec=1)
        assert res.returncode == 124
        assert res.timed_out is True

        assert pid_file.exists()
        child_pid = int(pid_file.read_text().strip())
        time.sleep(0.3)
        assert not psutil.pid_exists(child_pid) or psutil.Process(child_pid).status() == psutil.STATUS_ZOMBIE

    def test_fast_command_not_delayed(self, cmd_factory):
        res = run_sandboxed(cmd_factory.echo("speed test"), timeout_sec=10)
        assert res.returncode == 0
        assert res.execution_time_sec < 2.0
        assert "speed test" in res.stdout


# ---------------------------------------------------------------------------
# Scenario 3: Memory Limit Enforcement
# ---------------------------------------------------------------------------

class TestMemoryLimitEnforcement:
    def test_allocation_within_limit_succeeds(self, cmd_factory):
        res = run_sandboxed(cmd_factory.memory_mb(10), memory_limit_mb=128, timeout_sec=5)
        assert res.returncode == 0
        assert "ALLOC_OK" in res.stdout

    def test_allocation_exceeding_limit_fails(self, cmd_factory):
        # Requesting 150MB with a 30MB limit
        res = run_sandboxed(cmd_factory.memory_mb(150), memory_limit_mb=30, timeout_sec=5)
        assert res.returncode != 0 or "MemoryError" in res.stderr
        assert res.success is False

    def test_peak_memory_is_recorded(self, cmd_factory):
        res = run_sandboxed(cmd_factory.memory_mb(20), memory_limit_mb=128, timeout_sec=5)
        assert res.returncode == 0
        assert res.memory_peak_mb >= 15.0

    def test_invalid_memory_limit_raises_value_error(self, cmd_factory):
        with pytest.raises(ValueError):
            run_sandboxed(cmd_factory.echo("test"), memory_limit_mb=0)

        with pytest.raises(ValueError):
            run_sandboxed(cmd_factory.echo("test"), memory_limit_mb=-50)


# ---------------------------------------------------------------------------
# Scenario 4: Network Isolation Enforcement
# ---------------------------------------------------------------------------

class TestNetworkIsolation:
    def test_wan_socket_connect_blocked_when_network_false(self, cmd_factory):
        res = run_sandboxed(
            cmd_factory.socket_connect("8.8.8.8", 53),
            network=False,
            timeout_sec=3
        )
        assert res.returncode != 0
        assert res.network_egress_bytes == 0

    def test_http_request_blocked_when_network_false(self):
        cmd = [
            sys.executable,
            "-c",
            "import urllib.request; urllib.request.urlopen('http://1.1.1.1', timeout=2)"
        ]
        res = run_sandboxed(cmd, network=False, timeout_sec=3)
        assert res.returncode != 0
        assert res.network_egress_bytes == 0

    def test_dns_resolution_blocked_when_network_false(self, cmd_factory):
        res = run_sandboxed(cmd_factory.dns_lookup("example.com"), network=False, timeout_sec=3)
        assert res.returncode != 0

    def test_proxy_environment_variables_scrubbed(self):
        cmd = [sys.executable, "-c", "import os, json; print(json.dumps(dict(os.environ)))"]
        with patch.dict(os.environ, {
            "HTTP_PROXY": "http://evil-proxy:8080",
            "HTTPS_PROXY": "http://evil-proxy:8080",
            "ALL_PROXY": "socks5://evil-proxy",
            "AWS_SECRET_ACCESS_KEY": "leak_me",
            "GITHUB_TOKEN": "ghp_secret123",
        }):
            res = run_sandboxed(cmd, network=False, timeout_sec=5)
            assert res.returncode == 0
            child_env = json.loads(res.stdout)
            assert "HTTP_PROXY" not in child_env
            assert "HTTPS_PROXY" not in child_env
            assert "ALL_PROXY" not in child_env
            assert "AWS_SECRET_ACCESS_KEY" not in child_env
            assert "GITHUB_TOKEN" not in child_env

    def test_loopback_isolation_vs_wan(self):
        # Verify that WAN connection is unconditionally blocked with 0 egress bytes
        res = run_sandboxed(
            [sys.executable, "-c", "import socket; s = socket.socket(); s.connect(('93.184.216.34', 80))"],
            network=False,
            timeout_sec=3
        )
        assert res.returncode != 0
        assert res.network_egress_bytes == 0


# ---------------------------------------------------------------------------
# Scenario 5: Network Egress Audit
# ---------------------------------------------------------------------------

class TestNetworkEgressAudit:
    def test_audit_clean_system_passes(self):
        verdict = audit_network_egress()
        assert verdict["verdict"] == "PASS"
        assert verdict["packets_captured"] == 0
        assert verdict["open_wan_sockets"] == 0
        assert verdict.passed is True
        assert_zero_egress(verdict)

    def test_audit_detects_wan_socket_warning(self):
        mock_conn = MagicMock()
        mock_conn.pid = 9999
        mock_conn.laddr = MagicMock(ip="127.0.0.1", port=50000)
        mock_conn.raddr = MagicMock(ip="8.8.8.8", port=53)
        mock_conn.status = "ESTABLISHED"

        with patch("psutil.net_connections", return_value=[mock_conn]):
            verdict = audit_network_egress(target_pid=9999)
            assert verdict["verdict"] in ("WARNING", "FAIL")
            assert verdict["open_wan_sockets"] == 1
            assert verdict.passed is False
            with pytest.raises(AssertionError):
                assert_zero_egress(verdict)

    def test_airgap_monitor_context_manager(self, cmd_factory):
        with AirGapMonitor() as monitor:
            res = run_sandboxed(cmd_factory.echo("Clean execution"), network=False)
            assert res.returncode == 0
        v = monitor.get_verdict()
        assert v.verdict == "PASS"
        assert v.packets_captured == 0
        assert v.passed is True

    def test_audit_script_parser_pass_verdict(self):
        sample_output = (
            "========================================================\n"
            "   SOVEREIGN AIR-GAP INDEPENDENT VERIFICATION MONITOR   \n"
            "========================================================\n"
            "0 packets captured\n"
            "VERDICT: [PASS] ZERO OUTBOUND NETWORK TRAFFIC DETECTED.\n"
        )
        verdict = parse_airgap_audit_output(sample_output)
        assert verdict["verdict"] == "PASS"
        assert verdict["packets_captured"] == 0
        assert verdict.passed is True

    def test_audit_script_parser_warning_verdict(self):
        sample_output = (
            "========================================================\n"
            "   SOVEREIGN AIR-GAP INDEPENDENT VERIFICATION MONITOR   \n"
            "========================================================\n"
            "10 packets captured\n"
            "VERDICT: [WARNING] NETWORK ANOMALY DETECTED.\n"
        )
        verdict = parse_airgap_audit_output(sample_output)
        assert verdict["verdict"] in ("WARNING", "FAIL")
        assert verdict["packets_captured"] == 10
        assert verdict.passed is False

    def test_parse_tcpdump_log(self):
        log_sample = (
            "10:15:32.123456 IP 192.168.1.100.45678 > 8.8.8.8.443: Flags [S], seq 123456789\n"
            "10:15:33.654321 IP 127.0.0.1.5000 > 127.0.0.1.8000: Flags [P.], seq 1:10\n"
        )
        packets = parse_tcpdump_log(log_sample)
        assert len(packets) == 2
        assert packets[0]["is_egress"] is True
        assert packets[0]["dst_ip"] == "8.8.8.8"
        assert packets[1]["is_egress"] is False
        assert packets[1]["dst_ip"] == "127.0.0.1"

    def test_assert_zero_egress_helper(self):
        pass_verdict = AirGapVerdict(verdict="PASS", packets_captured=0, open_wan_sockets=0)
        assert_zero_egress(pass_verdict)

        warn_verdict = AirGapVerdict(verdict="WARNING", packets_captured=1, open_wan_sockets=1)
        with pytest.raises(AssertionError):
            assert_zero_egress(warn_verdict)


# ---------------------------------------------------------------------------
# Scenario 6: Return Structures & Error Handling
# ---------------------------------------------------------------------------

class TestReturnStructuresAndErrors:
    def test_result_fields_and_types(self, cmd_factory):
        res = run_sandboxed(cmd_factory.echo("type check"), timeout_sec=5)
        assert isinstance(res, SandboxResult)
        assert isinstance(res.stdout, str)
        assert isinstance(res.stderr, str)
        assert isinstance(res.returncode, int)
        assert isinstance(res.execution_time_sec, float)
        assert isinstance(res.memory_peak_mb, float)
        assert isinstance(res.network_egress_bytes, int)
        assert isinstance(res.success, bool)
        assert isinstance(res.timed_out, bool)
        assert isinstance(res.oom_killed, bool)

    def test_empty_command_raises_value_error(self):
        with pytest.raises(ValueError):
            run_sandboxed([])

    def test_invalid_timeout_raises_value_error(self, cmd_factory):
        with pytest.raises(ValueError):
            run_sandboxed(cmd_factory.echo("test"), timeout_sec=-1)

        with pytest.raises(ValueError):
            run_sandboxed(cmd_factory.echo("test"), timeout_sec=0)

    def test_nonexistent_binary_handled(self):
        res = run_sandboxed(["nonexistent_cmd_xyz_12345"])
        assert res.returncode != 0
        assert res.success is False
        assert "not found" in res.stderr.lower() or "error" in res.stderr.lower()

    def test_unicode_and_special_characters(self):
        cmd = [
            sys.executable,
            "-c",
            "import sys; sys.stdout.buffer.write('Sovereign \\u2699\\ufe0f ASME B31.3 \\u2265 0'.encode('utf-8'))"
        ]
        res = run_sandboxed(cmd, timeout_sec=5)
        assert res.returncode == 0
        assert "Sovereign" in res.stdout
        assert "ASME B31.3" in res.stdout

    def test_large_output_stream_buffer_no_deadlock(self):
        code = (
            "import sys\n"
            "sys.stdout.write('A' * (1024 * 1024))\n"
            "sys.stderr.write('B' * (1024 * 1024))\n"
        )
        res = run_sandboxed([sys.executable, "-c", code], timeout_sec=10)
        assert res.returncode == 0
        assert len(res.stdout) >= 1024 * 1024
        assert len(res.stderr) >= 1024 * 1024

    def test_stdin_input_data_passed_properly(self):
        code = (
            "import sys\n"
            "data = sys.stdin.read()\n"
            "sys.stdout.write(f'ECHO: {data}')\n"
        )
        res = run_sandboxed(
            [sys.executable, "-c", code],
            timeout_sec=5,
            input_data="Payload for ASME calculation\n"
        )
        assert res.returncode == 0
        assert "ECHO: Payload for ASME calculation" in res.stdout
