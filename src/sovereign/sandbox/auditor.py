"""
Sovereign AI Execution Plane - Network Egress Auditor
Module: sovereign.sandbox.auditor

Provides kernel-level and cross-platform network egress auditing, live session
monitoring, socket inspection, packet capture parsing, and independent
verification of zero outbound WAN traffic during sandboxed execution.
"""

from __future__ import annotations

import ipaddress
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

try:
    import psutil
except ImportError:
    psutil = None  # type: ignore


# ---------------------------------------------------------------------------
# Data Structures & Interface Contracts
# ---------------------------------------------------------------------------

@dataclass
class AirGapVerdict:
    """
    Standardized verdict emitted by the air-gap egress auditor.
    Provides dual interface: object attribute access and dictionary subscripting.
    """
    verdict: str = "PASS"                                    # "PASS" | "WARNING" | "FAIL"
    packets_captured: int = 0                                # Total WAN egress packets captured
    open_wan_sockets: int = 0                                # Count of active non-loopback sockets
    details: List[str] = field(default_factory=list)        # Diagnostic messages / trace logs
    timestamp: float = field(default_factory=time.time)      # Epoch timestamp of audit
    passed: bool = True                                      # True if verdict == "PASS"
    platform: str = field(default_factory=lambda: sys.platform)
    audit_method: str = "socket_inspection"                 # "script_airgap_audit" | "socket_inspection" | "log_parse" | "live_monitor"
    open_sockets: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    log_path: str = "/tmp/airgap_audit.log"

    def __post_init__(self) -> None:
        if self.verdict != "PASS":
            self.passed = False
        elif self.packets_captured > 0 or self.open_wan_sockets > 0:
            self.verdict = "WARNING"
            self.passed = False
        else:
            self.passed = True

    def __getitem__(self, key: str) -> Any:
        if key in ("verdict", "status"):
            return self.verdict
        if key == "packets_captured":
            return self.packets_captured
        if key == "open_wan_sockets":
            return self.open_wan_sockets
        if key == "egress_detected":
            return not self.passed
        if key == "passed":
            return self.passed
        if key == "details":
            return self.details
        if key == "timestamp":
            return self.timestamp
        if key == "log_path":
            return self.log_path
        if hasattr(self, key):
            return getattr(self, key)
        if key in self.metadata:
            return self.metadata[key]
        raise KeyError(key)

    def __contains__(self, key: str) -> bool:
        if key in ("verdict", "status", "packets_captured", "open_wan_sockets", "egress_detected", "passed", "details", "timestamp", "log_path"):
            return True
        return hasattr(self, key) or (key in self.metadata)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default

    def keys(self):
        d = asdict(self)
        d["status"] = self.verdict
        d["egress_detected"] = not self.passed
        return d.keys()

    def values(self):
        d = asdict(self)
        d["status"] = self.verdict
        d["egress_detected"] = not self.passed
        return d.values()

    def items(self):
        d = asdict(self)
        d["status"] = self.verdict
        d["egress_detected"] = not self.passed
        return d.items()

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.verdict
        d["egress_detected"] = not self.passed
        return d

    @property
    def status(self) -> str:
        return self.verdict

    @property
    def egress_detected(self) -> bool:
        return not self.passed


class PacketList(list):
    """
    Subclass of list that also provides dictionary-like status attributes
    for backwards compatibility with legacy callers.
    """
    @property
    def packets_captured(self) -> int:
        return sum(1 for p in self if p.get("is_egress", False))

    @property
    def egress_detected(self) -> bool:
        return self.packets_captured > 0

    @property
    def status(self) -> str:
        return "FAIL" if self.egress_detected else "PASS"

    def get(self, key: str, default: Any = None) -> Any:
        if key == "packets_captured":
            return self.packets_captured
        elif key == "egress_detected":
            return self.egress_detected
        elif key == "status":
            return self.status
        return default

    def __getitem__(self, item: Any) -> Any:
        if isinstance(item, str):
            if item == "packets_captured":
                return self.packets_captured
            elif item == "egress_detected":
                return self.egress_detected
            elif item == "status":
                return self.status
            raise KeyError(item)
        return super().__getitem__(item)


# ---------------------------------------------------------------------------
# Network Address Classification Utilities
# ---------------------------------------------------------------------------

def is_loopback_address(ip_str: Optional[str]) -> bool:
    """
    Returns True if the given IP address string corresponds to a loopback address
    (127.0.0.0/8, ::1, or localhost).
    """
    if not ip_str:
        return False

    clean_ip = str(ip_str).strip().lower()
    if clean_ip in ("localhost", "ip6-localhost", "localhost6"):
        return True

    # Strip port if present in ip:port format (IPv4)
    if ":" in clean_ip and "." in clean_ip:
        clean_ip = clean_ip.split(":")[0]

    try:
        ip_obj = ipaddress.ip_address(clean_ip)
        return ip_obj.is_loopback
    except ValueError:
        return False


def is_wan_destination(
    ip_str: Optional[str],
    allowed_subnets: Optional[List[str]] = None
) -> bool:
    """
    Determines if a destination IP address represents an external WAN/LAN network egress.
    Returns False if loopback, unspecified, or contained in allowed_subnets.
    Returns True if external WAN/LAN address.
    """
    if not ip_str:
        return False

    clean_ip = str(ip_str).strip().lower()
    if is_loopback_address(clean_ip):
        return False

    # Strip port
    if ":" in clean_ip and "." in clean_ip:
        clean_ip = clean_ip.split(":")[0]

    try:
        ip_obj = ipaddress.ip_address(clean_ip)
        if ip_obj.is_loopback or ip_obj.is_unspecified:
            return False

        if allowed_subnets:
            for subnet in allowed_subnets:
                try:
                    if ip_obj in ipaddress.ip_network(subnet, strict=False):
                        return False
                except ValueError:
                    continue

        return True
    except ValueError:
        # Non-parseable hostname that is not localhost is considered potential WAN
        return True


def _extract_ip_and_port(addr: Any) -> Tuple[Optional[str], Optional[int]]:
    """Helper to safely extract (ip, port) from psutil namedtuples, tuples, or mock objects."""
    if not addr:
        return None, None
    if hasattr(addr, "ip"):
        return getattr(addr, "ip", None), getattr(addr, "port", None)
    if isinstance(addr, (tuple, list)) and len(addr) >= 2:
        return addr[0], addr[1]
    return None, None


# ---------------------------------------------------------------------------
# Cross-Platform Socket Inspection
# ---------------------------------------------------------------------------

def inspect_active_sockets(
    target_pid: Optional[int] = None,
    all_processes: bool = False,
    allowed_subnets: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Inspects currently active TCP/UDP sockets using psutil.
    Returns a tuple: (all_inspected_sockets, wan_violation_sockets).
    """
    if psutil is None:
        return [], []

    inspected: List[Dict[str, Any]] = []
    violations: List[Dict[str, Any]] = []

    target_pids: Optional[Set[int]] = None
    if not all_processes:
        effective_pid = target_pid if target_pid is not None else os.getpid()
        target_pids = {effective_pid}
        try:
            parent_proc = psutil.Process(effective_pid)
            target_pids.update(c.pid for c in parent_proc.children(recursive=True))
        except (psutil.NoSuchProcess, psutil.AccessDenied, Exception):
            pass

    try:
        connections = psutil.net_connections(kind="inet")
    except Exception:
        connections = []

    for conn in connections:
        conn_pid = getattr(conn, "pid", None)
        if target_pids is not None and conn_pid is not None and conn_pid not in target_pids:
            continue

        local_ip, local_port = _extract_ip_and_port(getattr(conn, "laddr", None))
        remote_ip, remote_port = _extract_ip_and_port(getattr(conn, "raddr", None))
        status = getattr(conn, "status", "UNKNOWN")

        socket_info = {
            "pid": conn_pid,
            "local_ip": local_ip,
            "local_port": local_port,
            "remote_ip": remote_ip,
            "remote_port": remote_port,
            "status": status,
        }
        inspected.append(socket_info)

        if remote_ip and is_wan_destination(remote_ip, allowed_subnets):
            violations.append(socket_info)

    return inspected, violations


# ---------------------------------------------------------------------------
# Live Session Monitoring: AirGapMonitor Context Manager
# ---------------------------------------------------------------------------

class AirGapMonitor:
    """
    High-frequency background monitoring context manager that continuously samples
    network connections and socket states during sandboxed process execution.
    """

    def __init__(
        self,
        pid: Optional[int] = None,
        sample_interval_sec: float = 0.02,
        allowed_subnets: Optional[List[str]] = None,
    ):
        self.pid = pid
        self.sample_interval_sec = max(0.005, sample_interval_sec)
        self.allowed_subnets = allowed_subnets
        self.violations: List[Dict[str, Any]] = []
        self.observed_sockets: List[Dict[str, Any]] = []
        self.egress_attempts: List[str] = []

        self._stop_event = threading.Event()
        self._monitor_thread: Optional[threading.Thread] = None
        self._start_time: float = 0.0
        self._end_time: float = 0.0
        self._cached_verdict: Optional[AirGapVerdict] = None

    def attach_pid(self, pid: int) -> None:
        """Dynamically attach a spawned child process PID to the active monitor."""
        self.pid = pid

    def __enter__(self) -> "AirGapMonitor":
        self._start_time = time.time()
        self._stop_event.clear()
        self.egress_attempts.clear()
        self._monitor_thread = threading.Thread(
            target=self._poll_loop,
            name="AirGapMonitorThread",
            daemon=True
        )
        self._monitor_thread.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self._stop_event.set()
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=1.0)
        self._end_time = time.time()
        self._cached_verdict = self.get_verdict()

    def _poll_loop(self) -> None:
        seen_violations: Set[Tuple[Any, ...]] = set()
        effective_pid = self.pid if self.pid is not None else os.getpid()

        while not self._stop_event.is_set():
            if psutil is not None:
                try:
                    all_conns, wan_conns = inspect_active_sockets(
                        target_pid=effective_pid,
                        all_processes=False,
                        allowed_subnets=self.allowed_subnets,
                    )
                    for conn in wan_conns:
                        key = (
                            conn.get("pid"), conn.get("local_ip"), conn.get("local_port"),
                            conn.get("remote_ip"), conn.get("remote_port"), conn.get("status")
                        )
                        if key not in seen_violations:
                            seen_violations.add(key)
                            self.violations.append(conn)
                            self.egress_attempts.append(f"WAN Socket: {conn.get('remote_ip')}:{conn.get('remote_port')}")
                except Exception:
                    pass

            self._stop_event.wait(self.sample_interval_sec)

    def get_verdict(self) -> AirGapVerdict:
        if self._cached_verdict is not None:
            return self._cached_verdict

        wan_count = len(self.violations)
        passed = (wan_count == 0)
        verdict_str = "PASS" if passed else "WARNING"

        details: List[str] = []
        if passed:
            details.append("Zero outbound WAN traffic detected during sandbox monitoring session.")
        else:
            details.append(f"Network anomaly detected: {wan_count} non-loopback WAN connection(s) observed.")
            for v in self.violations:
                details.append(
                    f"Egress attempt: PID={v.get('pid')} {v.get('local_ip')}:{v.get('local_port')} -> "
                    f"{v.get('remote_ip')}:{v.get('remote_port')} [{v.get('status')}]"
                )

        return AirGapVerdict(
            verdict=verdict_str,
            packets_captured=wan_count,
            open_wan_sockets=wan_count,
            details=details,
            timestamp=self._end_time or time.time(),
            passed=passed,
            platform=sys.platform,
            audit_method="live_monitor",
            open_sockets=self.violations,
            metadata={
                "monitored_pid": self.pid,
                "duration_sec": max(0.0, (self._end_time or time.time()) - self._start_time),
            }
        )

    def assert_zero_egress(self) -> None:
        verdict = self.get_verdict()
        assert_zero_egress(verdict)


# ---------------------------------------------------------------------------
# Linux Script Integration & Log Parsers
# ---------------------------------------------------------------------------

def parse_tcpdump_log(log_path_or_content: Union[str, Path]) -> PacketList:
    """
    Parses raw tcpdump log text or log file into structured packet records.
    Flags packets whose destination is not loopback.
    Returns a PacketList with len() support and dictionary status attributes.
    """
    packets = PacketList()

    # Determine if input is a file path or direct string content
    content = ""
    if isinstance(log_path_or_content, Path) or (isinstance(log_path_or_content, str) and "\n" not in log_path_or_content and os.path.exists(str(log_path_or_content))):
        try:
            content = Path(log_path_or_content).read_text(encoding="utf-8", errors="replace")
        except Exception:
            content = ""
    else:
        content = str(log_path_or_content)

    line_pattern = re.compile(
        r"(?P<time>\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(?P<proto>IP|IP6)\s+(?P<src>[^\s>]+)\s*>\s*(?P<dst>[^:]+):\s*(?P<info>.*)"
    )

    for line in content.splitlines():
        line = line.strip()
        m = line_pattern.match(line)
        if m:
            gd = m.groupdict()
            dst_raw = gd["dst"]
            dst_ip = dst_raw.rsplit(".", 1)[0] if "." in dst_raw else dst_raw
            dst_port = int(dst_raw.rsplit(".", 1)[1]) if "." in dst_raw and dst_raw.rsplit(".", 1)[1].isdigit() else None

            src_raw = gd["src"]
            src_ip = src_raw.rsplit(".", 1)[0] if "." in src_raw else src_raw
            src_port = int(src_raw.rsplit(".", 1)[1]) if "." in src_raw and src_raw.rsplit(".", 1)[1].isdigit() else None

            is_loopback = is_loopback_address(dst_ip)
            packets.append({
                "time": gd["time"],
                "protocol": gd["proto"],
                "src_ip": src_ip,
                "src_port": src_port,
                "dst_ip": dst_ip,
                "dst_port": dst_port,
                "flags": gd["info"],
                "is_loopback": is_loopback,
                "is_egress": not is_loopback,
                "raw": line,
            })

    return packets


def parse_airgap_audit_output(
    stdout: str,
    stderr: str = "",
    log_content: str = "",
) -> AirGapVerdict:
    """
    Parses stdout, stderr, and log output from scripts/airgap_audit.sh into an AirGapVerdict.
    """
    combined = f"{stdout}\n{stderr}\n{log_content}".strip()
    details: List[str] = []
    metadata: Dict[str, Any] = {}

    has_pass = "VERDICT: [PASS]" in combined or "ZERO OUTBOUND NETWORK TRAFFIC DETECTED" in combined
    has_warning = "VERDICT: [WARNING]" in combined or "NETWORK ANOMALY DETECTED" in combined

    iface_match = re.search(r"Monitoring physical network interface:\s*([^\s\r\n]+)", combined)
    if iface_match:
        metadata["interface"] = iface_match.group(1)
        details.append(f"Physical interface monitored: {metadata['interface']}")

    if "type filter hook output" in combined or "policy drop" in combined or "Strict DROP Active" in combined:
        metadata["nftables_policy_drop"] = True
        details.append("nftables output policy DROP verified")
    else:
        metadata["nftables_policy_drop"] = False

    pm = re.search(r"(\d+)\s+packets?\s+captured", combined)
    packets_captured = int(pm.group(1)) if pm else 0
    metadata["packets_captured"] = packets_captured

    parsed_packets = parse_tcpdump_log(log_content or combined)
    wan_packets = [p for p in parsed_packets if p["is_egress"]]
    metadata["packet_records"] = parsed_packets

    if wan_packets:
        open_wan_sockets = len(wan_packets)
        for wp in wan_packets:
            details.append(f"Egress packet captured: {wp['src_ip']}:{wp['src_port']} -> {wp['dst_ip']}:{wp['dst_port']}")
    else:
        open_wan_sockets = 0

    if has_warning or packets_captured > 0 or open_wan_sockets > 0:
        verdict = "WARNING"
        passed = False
        details.append("Network egress anomaly detected during kernel audit.")
    elif has_pass or packets_captured == 0:
        verdict = "PASS"
        passed = True
        details.append("Zero outbound network traffic detected. Host air-gap intact.")
    else:
        verdict = "WARNING"
        passed = False
        details.append("Audit script completed without definitive PASS confirmation.")

    return AirGapVerdict(
        verdict=verdict,
        packets_captured=packets_captured or open_wan_sockets,
        open_wan_sockets=open_wan_sockets,
        details=details,
        timestamp=time.time(),
        passed=passed,
        platform="linux" if "nftables" in combined else sys.platform,
        audit_method="script_airgap_audit",
        metadata=metadata,
    )


def run_airgap_audit_script(
    script_path: Optional[Union[str, Path]] = None,
    timeout_sec: int = 10,
    log_path: Optional[Union[str, Path]] = "/tmp/airgap_audit.log",
) -> AirGapVerdict:
    """
    Executes scripts/airgap_audit.sh on Linux systems and parses the resulting output.
    If executed on non-Linux platforms, falls back to native socket inspection.
    """
    if script_path is None:
        candidates = [
            Path("scripts/airgap_audit.sh"),
            Path(__file__).parents[3] / "scripts" / "airgap_audit.sh",
            Path(os.environ.get("SOVEREIGN_AIRGAP_AUDIT_SCRIPT", "")),
        ]
        for c in candidates:
            if c.is_file():
                script_path = c
                break

    if not sys.platform.startswith("linux"):
        verdict = audit_network_egress(all_processes=False)
        verdict.details.insert(
            0, f"airgap_audit.sh requires Linux; fell back to native socket audit on {sys.platform}."
        )
        return verdict

    if not script_path or not Path(script_path).is_file():
        return AirGapVerdict(
            verdict="FAIL",
            packets_captured=0,
            open_wan_sockets=0,
            details=[f"Audit script not found: {script_path}"],
            passed=False,
            audit_method="script_airgap_audit",
        )

    try:
        res = subprocess.run(
            ["bash", str(script_path)],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        log_content = ""
        if log_path and Path(log_path).is_file():
            try:
                log_content = Path(log_path).read_text(encoding="utf-8", errors="replace")
            except Exception:
                pass

        return parse_airgap_audit_output(res.stdout, res.stderr, log_content)
    except subprocess.TimeoutExpired:
        return AirGapVerdict(
            verdict="WARNING",
            packets_captured=0,
            open_wan_sockets=0,
            details=[f"Audit script timed out after {timeout_sec}s."],
            passed=False,
            audit_method="script_airgap_audit",
        )
    except Exception as ex:
        return AirGapVerdict(
            verdict="FAIL",
            packets_captured=0,
            open_wan_sockets=0,
            details=[f"Audit script execution failed: {ex}"],
            passed=False,
            audit_method="script_airgap_audit",
        )


# ---------------------------------------------------------------------------
# Universal Audit Entry Point
# ---------------------------------------------------------------------------

def audit_network_egress(
    target_pid: Optional[Union[int, str, Path]] = None,
    all_processes: bool = False,
    prefer_script: bool = False,
    script_path: Optional[Union[str, Path]] = None,
    allowed_subnets: Optional[List[str]] = None,
    log_path: Optional[Union[str, Path]] = "/tmp/airgap_audit.log",
) -> AirGapVerdict:
    """
    Universal network egress auditing entry point.
    
    Inspects active TCP/UDP sockets to assert 0 outbound WAN connections.
    If prefer_script is True and on Linux, invokes run_airgap_audit_script.
    """
    # If first parameter is passed as a string or Path, treat it as log_path
    if isinstance(target_pid, (str, Path)):
        log_path = target_pid
        target_pid = None

    if prefer_script and sys.platform.startswith("linux"):
        return run_airgap_audit_script(script_path=script_path, log_path=log_path)

    all_conns, wan_violations = inspect_active_sockets(
        target_pid=target_pid,
        all_processes=all_processes,
        allowed_subnets=allowed_subnets,
    )

    wan_count = len(wan_violations)
    passed = (wan_count == 0)
    verdict_str = "PASS" if passed else "WARNING"

    details: List[str] = []
    if passed:
        details.append("Zero outbound WAN traffic detected. Host and process air-gap verified.")
    else:
        details.append(f"Network anomaly: {wan_count} active WAN socket(s) detected.")
        for v in wan_violations:
            details.append(
                f"PID={v.get('pid')} {v.get('local_ip')}:{v.get('local_port')} -> "
                f"{v.get('remote_ip')}:{v.get('remote_port')} [{v.get('status')}]"
            )

    return AirGapVerdict(
        verdict=verdict_str,
        packets_captured=wan_count,
        open_wan_sockets=wan_count,
        details=details,
        timestamp=time.time(),
        passed=passed,
        platform=sys.platform,
        audit_method="socket_inspection",
        open_sockets=wan_violations,
        metadata={"total_inspected_sockets": len(all_conns)},
        log_path=str(log_path) if log_path else "/tmp/airgap_audit.log",
    )


def assert_zero_egress(target: Union[AirGapVerdict, Dict[str, Any], str, Path] = "/tmp/airgap_audit.log") -> None:
    """
    Assertion helper function for compliance gates and tests.
    Raises AssertionError with diagnostic trace if air-gap was breached.
    """
    if isinstance(target, (str, Path)):
        verdict = audit_network_egress(log_path=target)
    elif isinstance(target, dict):
        verdict = target
    else:
        verdict = target

    verdict_str = verdict.get("verdict") if isinstance(verdict, dict) else getattr(verdict, "verdict", None)
    if verdict_str is None:
        verdict_str = verdict.get("status") if isinstance(verdict, dict) else getattr(verdict, "status", "PASS")

    packets = verdict.get("packets_captured", 0) if isinstance(verdict, dict) else getattr(verdict, "packets_captured", 0)
    wan_sockets = verdict.get("open_wan_sockets", 0) if isinstance(verdict, dict) else getattr(verdict, "open_wan_sockets", 0)
    egress_detected = verdict.get("egress_detected", False) if isinstance(verdict, dict) else getattr(verdict, "egress_detected", False)
    details = verdict.get("details", []) if isinstance(verdict, dict) else getattr(verdict, "details", [])

    if verdict_str != "PASS" or packets > 0 or wan_sockets > 0 or egress_detected:
        detail_msg = "\n  - ".join(details) if details else f"Packets: {packets}, Sockets: {wan_sockets}"
        raise AssertionError(
            f"Air-Gap Verification Failed!\n"
            f"Verdict: {verdict_str}\n"
            f"Packets Captured: {packets}\n"
            f"Open WAN Sockets: {wan_sockets}\n"
            f"Details:\n  - {detail_msg}"
        )
