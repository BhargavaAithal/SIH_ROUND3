"""
Sovereign AI Execution Plane — Core Test Fixtures & Harness
Provides synthetic P&ID generation, hermetic workspace isolation,
sandbox emulation, and zero-egress air-gap verification.
"""

from dataclasses import dataclass
import os
from pathlib import Path
import shutil
import socket
import stat
import sys
import tempfile
import time
from typing import Any, Dict, Generator, List, Tuple
import cv2
import numpy as np
import pytest

# Ensure src/ is on sys.path FIRST before any sovereign imports
root_dir = Path(__file__).resolve().parent.parent
src_dir = root_dir / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from sovereign.sandbox.launcher import run_sandboxed, SandboxResult
from sovereign.sandbox.auditor import AirGapVerdict, audit_network_egress

try:
    import psutil
except ImportError:
    psutil = None


# ---------------------------------------------------------------------------
# 0. Sandbox Test Fixtures (Milestone 1)
# ---------------------------------------------------------------------------

@pytest.fixture
def cmd_factory():
    """
    Provides cross-platform executable commands targeting the active Python interpreter.
    """
    class CmdFactory:
        @staticmethod
        def echo(text: str) -> list[str]:
            return [sys.executable, "-c", f"print({text!r})"]

        @staticmethod
        def arithmetic(expr: str) -> list[str]:
            return [sys.executable, "-c", f"print(eval({expr!r}))"]

        @staticmethod
        def sleep(sec: float) -> list[str]:
            return [sys.executable, "-c", f"import time; time.sleep({sec})"]

        @staticmethod
        def infinite_loop() -> list[str]:
            return [sys.executable, "-c", "while True: pass"]

        @staticmethod
        def memory_mb(mb: int) -> list[str]:
            return [sys.executable, "-c", f"x = bytearray({mb} * 1024 * 1024); print('ALLOC_OK')"]

        @staticmethod
        def socket_connect(ip: str = "8.8.8.8", port: int = 53) -> list[str]:
            return [
                sys.executable,
                "-c",
                f"import socket; s = socket.socket(); s.settimeout(2); s.connect(({ip!r}, {port}))"
            ]

        @staticmethod
        def dns_lookup(host: str = "example.com") -> list[str]:
            return [sys.executable, "-c", f"import socket; socket.gethostbyname({host!r})"]

        @staticmethod
        def spawn_child_and_sleep(sleep_sec: int = 30) -> list[str]:
            code = (
                "import subprocess, sys, time; "
                f"p = subprocess.Popen([{sys.executable!r}, '-c', 'import time; time.sleep({sleep_sec})']); "
                f"time.sleep({sleep_sec})"
            )
            return [sys.executable, "-c", code]

    return CmdFactory()


@pytest.fixture
def process_leak_tracker():
    """
    Ensures that test cases do not leave orphan child processes running in the background.
    """
    if psutil is None:
        yield
        return

    current_proc = psutil.Process()
    initial_children = set(p.pid for p in current_proc.children(recursive=True))
    yield
    time.sleep(0.1)
    final_children = set(p.pid for p in current_proc.children(recursive=True))
    leaked = final_children - initial_children
    for pid in leaked:
        try:
            p = psutil.Process(pid)
            p.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    assert not leaked, f"Sandbox test leaked background child process PIDs: {leaked}"


# ---------------------------------------------------------------------------
# 1. Hermetic Temporary Workspace Isolation
# ---------------------------------------------------------------------------
def _handle_remove_readonly(func, path, exc_info):
    """Clear readonly bit on Windows file lock before retry."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


@pytest.fixture(scope="function")
def isolated_workspace() -> Generator[Dict[str, Path], None, None]:
    """Provides an isolated directory tree with clean Windows-safe teardown."""
    temp_dir = Path(tempfile.mkdtemp(prefix="sovereign_test_"))
    dirs = {
        "root": temp_dir,
        "inputs": temp_dir / "inputs",
        "outputs": temp_dir / "outputs",
        "sandbox": temp_dir / "sandbox",
        "logs": temp_dir / "logs",
    }
    for p in dirs.values():
        p.mkdir(parents=True, exist_ok=True)

    yield dirs

    # Teardown with Windows lock handling
    shutil.rmtree(temp_dir, onerror=_handle_remove_readonly)


# ---------------------------------------------------------------------------
# 2. Synthetic P&ID Image & Topology Generator Fixture
# ---------------------------------------------------------------------------
class SyntheticPIDFactory:
    """Generates high-resolution P&ID schematics with exact ground-truth topology."""

    @staticmethod
    def create_schematic(width: int = 4000, height: int = 3000) -> Tuple[np.ndarray, Dict[str, Any]]:
        # White canvas
        img = np.full((height, width, 3), 255, dtype=np.uint8)
        ground_truth = {
            "dimensions": (width, height),
            "equipment": [],
            "valves": [],
            "lines": [],
            "junctions": [],
            "endpoints": [],
        }

        # 1. Main process piping lines (7px thick)
        # Horizontal lines at Y=500, 1500, 2200
        cv2.line(img, (800, 500), (3200, 500), (0, 0, 0), 7)
        cv2.line(img, (800, 1500), (3200, 1500), (0, 0, 0), 7)
        cv2.line(img, (800, 2200), (3200, 2200), (0, 0, 0), 7)

        # Vertical lines at X=800, 2000, 3200
        cv2.line(img, (800, 500), (800, 2200), (0, 0, 0), 7)
        cv2.line(img, (2000, 500), (2000, 2200), (0, 0, 0), 7)
        cv2.line(img, (3200, 500), (3200, 2200), (0, 0, 0), 7)

        # Standard T-junctions
        ground_truth["junctions"].extend([
            {"type": "tee", "coordinate": (800, 1500)},
            {"type": "tee", "coordinate": (2000, 1500)},
            {"type": "tee", "coordinate": (3200, 2200)},
            {"type": "cross", "coordinate": (2000, 500)},
        ])

        # Terminal endpoints
        ground_truth["endpoints"].extend([
            {"coordinate": (800, 500)},
            {"coordinate": (3200, 500)},
            {"coordinate": (800, 2200)},
        ])

        # Equipment tags placed adjacent to line endpoints
        # 10-P-101-CS (Pump) at (750, 1500)
        cv2.circle(img, (750, 1500), 50, (0, 0, 0), 4)
        cv2.putText(img, "10-P-101-CS", (620, 1515), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
        ground_truth["equipment"].append({
            "tag": "10-P-101-CS", "type": "pump", "centroid": (750, 1500), "bbox": (700, 1450, 800, 1550)
        })

        # V-102 (Control Valve) at (2000, 1450)
        v_pts = np.array([[1970, 1430], [2000, 1450], [1970, 1470]], np.int32)
        v_pts2 = np.array([[2030, 1430], [2000, 1450], [2030, 1470]], np.int32)
        cv2.fillPoly(img, [v_pts, v_pts2], (0, 0, 0))
        cv2.putText(img, "V-102", (1960, 1410), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
        ground_truth["valves"].append({
            "tag": "V-102", "type": "valve", "centroid": (2000, 1450), "bbox": (1970, 1430, 2030, 1470)
        })

        # E-103 (Heat Exchanger) at (3200, 2150)
        cv2.rectangle(img, (3150, 2100), (3250, 2200), (0, 0, 0), 4)
        cv2.putText(img, "E-103", (3160, 2160), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
        ground_truth["equipment"].append({
            "tag": "E-103", "type": "exchanger", "centroid": (3200, 2150), "bbox": (3150, 2100, 3250, 2200)
        })

        return img, ground_truth


@pytest.fixture(scope="session")
def synthetic_pid_factory():
    return SyntheticPIDFactory


@pytest.fixture(scope="function")
def synthetic_pid_image() -> Tuple[np.ndarray, Dict[str, Any]]:
    """Yields an in-memory 4000x3000 P&ID binary raster array and ground truth."""
    img, gt = SyntheticPIDFactory.create_schematic(4000, 3000)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return gray, gt


# ---------------------------------------------------------------------------
# 3. Air-Gap & Zero-Egress Auditor Fixture
# ---------------------------------------------------------------------------
class AirgapAuditor:
    def __init__(self):
        self.egress_attempts: List[str] = []
        self._orig_socket = socket.socket

    def __enter__(self):
        self.egress_attempts.clear()
        auditor = self

        class BlockedSocket(socket.socket):
            def connect(self, address):
                host, port = address[0], address[1]
                if host not in ("127.0.0.1", "localhost", "::1"):
                    auditor.egress_attempts.append(f"TCP Connect -> {host}:{port}")
                    raise PermissionError(f"SOVEREIGN AIR-GAP BREACH: Connect to {host}:{port} blocked.")
                return super().connect(address)

            def sendto(self, data, address):
                host = address[0]
                if host not in ("127.0.0.1", "localhost", "::1"):
                    auditor.egress_attempts.append(f"UDP Packet -> {host}")
                    raise PermissionError(f"SOVEREIGN AIR-GAP BREACH: UDP egress to {host} blocked.")
                return super().sendto(data, address)

        socket.socket = BlockedSocket
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        socket.socket = self._orig_socket

    def assert_zero_egress(self):
        assert len(self.egress_attempts) == 0, (
            f"Air-gap audit failed! Captured {len(self.egress_attempts)} outbound egress attempts: "
            f"{self.egress_attempts}"
        )


@pytest.fixture(scope="function")
def airgap_monitor():
    """Context manager asserting 0 outbound network bytes during execution."""
    auditor = AirgapAuditor()
    with auditor:
        yield auditor
    auditor.assert_zero_egress()


# ---------------------------------------------------------------------------
# 4. Sandbox Mocking & Emulation Fixture
# ---------------------------------------------------------------------------
@dataclass
class EmulatedSandboxResult:
    stdout: str
    stderr: str
    returncode: int
    execution_time_sec: float
    memory_peak_mb: float
    network_egress_bytes: int = 0


class SandboxEmulator:
    """Controllable sandbox emulator simulating nsjail failure modes deterministically."""

    @staticmethod
    def success(stdout: str = "COMPLETED", execution_time: float = 0.42, memory_mb: float = 48.0) -> EmulatedSandboxResult:
        return EmulatedSandboxResult(stdout=stdout, stderr="", returncode=0, execution_time_sec=execution_time, memory_peak_mb=memory_mb)

    @staticmethod
    def timeout(limit: float = 10.0) -> EmulatedSandboxResult:
        return EmulatedSandboxResult(stdout="", stderr="TimeoutExpired: Execution exceeded 10.0s CPU limit", returncode=-15, execution_time_sec=limit, memory_peak_mb=32.0)

    @staticmethod
    def oom(limit_mb: float = 512.0) -> EmulatedSandboxResult:
        return EmulatedSandboxResult(stdout="", stderr="MemoryError: Exceeded cgroup 512MB RAM ceiling", returncode=-9, execution_time_sec=1.1, memory_peak_mb=limit_mb + 1.5)

    @staticmethod
    def airgap_violation() -> EmulatedSandboxResult:
        return EmulatedSandboxResult(stdout="", stderr="PermissionError: Network namespace isolated (--network none)", returncode=1, execution_time_sec=0.05, memory_peak_mb=12.0)

    @staticmethod
    def script_error(traceback_str: str) -> EmulatedSandboxResult:
        return EmulatedSandboxResult(stdout="", stderr=traceback_str, returncode=1, execution_time_sec=0.15, memory_peak_mb=24.0)


@pytest.fixture(scope="session")
def sandbox_emulator():
    return SandboxEmulator


@pytest.fixture(scope="function")
def sandbox_runner():
    return run_sandboxed


# ---------------------------------------------------------------------------
# 5. Domain Datasets
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def asme_b31_3_dataset() -> Dict[str, Any]:
    return {
        "valid": {
            "P": 2.5,
            "D": 323.8,
            "S": 137.9,
            "E": 1.0,
            "Y": 0.4,
            "c": 3.0,
            "t_actual": 9.52,
            "expected_t_min": 5.914,
            "expected_verdict": "SAT",
        },
        "corroded": {
            "P": 2.5,
            "D": 323.8,
            "S": 137.9,
            "E": 1.0,
            "Y": 0.4,
            "c": 3.0,
            "t_actual": 4.50,
            "expected_t_min": 5.914,
            "expected_verdict": "UNSAT",
        }
    }


@pytest.fixture(scope="session")
def api_510_vessel_dataset() -> Dict[str, Any]:
    return {
        "valid": {
            "t_actual": 14.2,
            "t_min": 10.0,
            "P": 3.5,
            "corrosion_rate": 0.25,
            "expected_life": 16.8,
            "expected_verdict": "SAT",
        },
        "invalid": {
            "t_actual": 8.5,
            "t_min": 10.0,
            "P": 3.5,
            "corrosion_rate": 0.25,
            "expected_verdict": "UNSAT",
        }
    }


@pytest.fixture(scope="session")
def unsafe_ast_code_snippets() -> List[str]:
    return [
        "import socket; s = socket.socket()",
        "import urllib.request; urllib.request.urlopen('http://1.1.1.1')",
        "import requests; requests.get('https://example.com')",
        "import os; os.system('echo 1')",
        "import subprocess; subprocess.Popen(['echo', '1'])",
        "eval('__import__(\"os\").system(\"echo 1\")')",
        "exec('import sys; sys.exit(0)')",
        "getattr(__builtins__, 'ex' + 'ec')('print(1)')",
    ]


@pytest.fixture(scope="session")
def clean_psu_report_data() -> Dict[str, Any]:
    return {
        "metadata": {
            "ref_no": "PSU/MECH/2026/01",
            "refinery": "Paradip Refinery",
            "unit": "CDU-1",
            "tag": "10-P-101-CS",
            "date": "2026-09-05",
            "engineer": "Chief Mech Eng",
            "approver": "Plant GM",
        },
        "calculations": [
            {"tag": "10-P-101-CS", "P": 2.5, "D": 323.8, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_act": 9.52, "t_min": 5.914, "margin": 3.606, "verdict": "SAT"},
            {"tag": "10-P-102-CS", "P": 2.5, "D": 323.8, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_act": 4.50, "t_min": 5.914, "margin": -1.414, "verdict": "UNSAT"},
            {"tag": "12-P-103-CS", "P": 3.0, "D": 323.8, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_act": 10.0, "t_min": 6.450, "margin": 3.550, "verdict": "SAT"},
            {"tag": "14-P-104-CS", "P": 2.0, "D": 323.8, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_act": 8.50, "t_min": 5.350, "margin": 3.150, "verdict": "SAT"},
        ],
        "citations": [
            "ASME B31.3-2022 Section 304.1.2",
            "API 510 10th Ed.",
            "Plant UT Inspection Sheet #8491",
        ]
    }
