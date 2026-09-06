"""
Sovereign AI Execution Plane - Sandboxed Process Launcher
Module: sovereign.sandbox.launcher

Provides ironclad process isolation, air-gap network enforcement, memory capping,
and CPU timeout enforcement using nsjail primary backend on Linux and cross-platform
kernel Job Objects / resource limits with concurrent watchdog fallback.
"""

from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

try:
    import psutil
except ImportError:
    psutil = None  # type: ignore

# Platform-specific memory limit imports
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes
else:
    try:
        import resource
    except ImportError:
        resource = None  # type: ignore


# ---------------------------------------------------------------------------
# Data Models & Interface Contracts
# ---------------------------------------------------------------------------

@dataclass
class SandboxResult:
    """
    Standard execution result returned by run_sandboxed.
    """
    stdout: str = ""
    stderr: str = ""
    returncode: int = 0
    execution_time_sec: float = 0.0
    memory_peak_mb: float = 0.0
    network_egress_bytes: int = 0

    def __init__(
        self,
        stdout: str = "",
        stderr: str = "",
        returncode: int = 0,
        execution_time_sec: float = 0.0,
        memory_peak_mb: float = 0.0,
        network_egress_bytes: int = 0,
        duration_sec: Optional[float] = None,
        **kwargs: Any,
    ):
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode
        self.execution_time_sec = duration_sec if duration_sec is not None else execution_time_sec
        self.memory_peak_mb = memory_peak_mb
        self.network_egress_bytes = network_egress_bytes

    @property
    def success(self) -> bool:
        """Returns True if process completed cleanly with exit code 0."""
        return self.returncode == 0

    @property
    def timed_out(self) -> bool:
        """Returns True if process was terminated due to timeout limit."""
        return self.returncode == 124

    @property
    def oom_killed(self) -> bool:
        """Returns True if process was terminated due to memory limit violation."""
        return self.returncode == 137

    @property
    def duration_sec(self) -> float:
        """Alias for execution_time_sec for backwards compatibility."""
        return self.execution_time_sec


# ---------------------------------------------------------------------------
# Interposition Guard Code for Air-Gap Network Blocking
# ---------------------------------------------------------------------------

_GUARD_MODULE_CODE = """
import socket
import errno

_orig_connect = socket.socket.connect
_orig_connect_ex = socket.socket.connect_ex
_orig_create_connection = getattr(socket, "create_connection", None)
_orig_getaddrinfo = socket.getaddrinfo
_orig_gethostbyname = socket.gethostbyname

ALLOWED_HOSTS = {"127.0.0.1", "localhost", "::1", "localhost6", "ip6-localhost"}

def _is_loopback(host: str) -> bool:
    if not host:
        return False
    h = str(host).strip().lower()
    if h in ALLOWED_HOSTS or h.startswith("127."):
        return True
    return False

def guarded_connect(self, address):
    host = address[0] if isinstance(address, (tuple, list)) else address
    if not _is_loopback(host):
        raise PermissionError(
            f"Air-Gap Sandbox Violation: Outbound network connection to {address} is prohibited."
        )
    return _orig_connect(self, address)

def guarded_connect_ex(self, address):
    host = address[0] if isinstance(address, (tuple, list)) else address
    if not _is_loopback(host):
        return errno.EACCES
    return _orig_connect_ex(self, address)

def guarded_getaddrinfo(host, port, *args, **kwargs):
    if not _is_loopback(host):
        raise PermissionError(
            f"Air-Gap Sandbox Violation: DNS resolution for '{host}' is prohibited."
        )
    return _orig_getaddrinfo(host, port, *args, **kwargs)

def guarded_gethostbyname(hostname):
    if not _is_loopback(hostname):
        raise PermissionError(
            f"Air-Gap Sandbox Violation: DNS lookup for '{hostname}' is prohibited."
        )
    return "127.0.0.1"

socket.socket.connect = guarded_connect
socket.socket.connect_ex = guarded_connect_ex
socket.getaddrinfo = guarded_getaddrinfo
socket.gethostbyname = guarded_gethostbyname

if _orig_create_connection:
    def guarded_create_connection(address, *args, **kwargs):
        host = address[0] if isinstance(address, (tuple, list)) else address
        if not _is_loopback(host):
            raise PermissionError(
                f"Air-Gap Sandbox Violation: Outbound connection to {address} is prohibited."
            )
        return _orig_create_connection(address, *args, **kwargs)
    socket.create_connection = guarded_create_connection
"""


# ---------------------------------------------------------------------------
# Windows Job Objects Manager (Hardware-Enforced Memory Limits)
# ---------------------------------------------------------------------------

if sys.platform == "win32":
    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_uint64),
            ("WriteOperationCount", ctypes.c_uint64),
            ("OtherOperationCount", ctypes.c_uint64),
            ("ReadTransferCount", ctypes.c_uint64),
            ("WriteTransferCount", ctypes.c_uint64),
            ("OtherTransferCount", ctypes.c_uint64),
        ]

    class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
            ("IoInfo", IO_COUNTERS),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000
    JOB_OBJECT_LIMIT_JOB_MEMORY = 0x00000200
    JobObjectExtendedLimitInformation = 9
    PROCESS_ALL_ACCESS = 0x1F0FFF

    class WindowsJobManager:
        def __init__(self, memory_limit_mb: int):
            self.k32 = ctypes.windll.kernel32
            self.handle = self.k32.CreateJobObjectW(None, None)
            limit_bytes = int(memory_limit_mb * 1024 * 1024)

            info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
            info.BasicLimitInformation.LimitFlags = (
                JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_JOB_MEMORY
            )
            info.JobMemoryLimit = limit_bytes

            self.k32.SetInformationJobObject(
                self.handle,
                JobObjectExtendedLimitInformation,
                ctypes.byref(info),
                ctypes.sizeof(info)
            )

        def assign_process(self, pid: int) -> bool:
            if not self.handle:
                return False
            proc_handle = self.k32.OpenProcess(PROCESS_ALL_ACCESS, False, pid)
            if not proc_handle:
                return False
            try:
                ret = self.k32.AssignProcessToJobObject(self.handle, proc_handle)
                return bool(ret)
            finally:
                self.k32.CloseHandle(proc_handle)

        def get_peak_memory_mb(self) -> float:
            if not self.handle:
                return 0.0
            info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
            if self.k32.QueryInformationJobObject(
                self.handle,
                JobObjectExtendedLimitInformation,
                ctypes.byref(info),
                ctypes.sizeof(info),
                None
            ):
                return info.PeakJobMemoryUsed / (1024 * 1024)
            return 0.0

        def close(self) -> None:
            if self.handle:
                self.k32.CloseHandle(self.handle)
                self.handle = None
else:
    class WindowsJobManager:  # type: ignore
        def __init__(self, memory_limit_mb: int):
            pass
        def assign_process(self, pid: int) -> bool:
            return False
        def get_peak_memory_mb(self) -> float:
            return 0.0
        def close(self) -> None:
            pass


# ---------------------------------------------------------------------------
# High-Frequency Process Tree Watchdog Thread
# ---------------------------------------------------------------------------

class ProcessTreeWatchdog(threading.Thread):
    """
    Monitors aggregate memory usage and network socket states across the sandboxed
    process tree at high frequency (10-20ms). Terminates runaways exceeding limits.
    """
    def __init__(
        self,
        pid: int,
        memory_limit_mb: int,
        poll_interval_sec: float = 0.02,
        check_network: bool = True
    ):
        super().__init__(name=f"SandboxWatchdog-{pid}", daemon=True)
        self.pid = pid
        self.memory_limit_mb = memory_limit_mb
        self.poll_interval_sec = poll_interval_sec
        self.check_network = check_network
        self.stop_event = threading.Event()
        self.peak_memory_mb = 0.0
        self.oom_killed = False
        self.network_violation = False
        self.egress_bytes_detected = 0

    def run(self) -> None:
        if psutil is None:
            return

        while not self.stop_event.is_set():
            try:
                proc = psutil.Process(self.pid)
                children = proc.children(recursive=True)
                procs = [proc] + children

                total_rss = 0
                for p in procs:
                    try:
                        total_rss += p.memory_info().rss
                        if self.check_network:
                            for conn in p.net_connections(kind="inet"):
                                raddr = getattr(conn, "raddr", None)
                                r_ip = getattr(raddr, "ip", None) if raddr else None
                                if r_ip and str(r_ip) not in ("127.0.0.1", "::1", "localhost"):
                                    if not str(r_ip).startswith("127."):
                                        self.network_violation = True
                                        self._kill_tree(procs)
                                        return
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue

                mem_mb = total_rss / (1024 * 1024)
                if mem_mb > self.peak_memory_mb:
                    self.peak_memory_mb = mem_mb

                if self.memory_limit_mb and mem_mb > self.memory_limit_mb:
                    self.oom_killed = True
                    self._kill_tree(procs)
                    return

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                break

            self.stop_event.wait(self.poll_interval_sec)

    def _kill_tree(self, procs: List[Any]) -> None:
        for p in reversed(procs):
            try:
                p.kill()
            except Exception:
                pass

    def stop(self) -> float:
        self.stop_event.set()
        self.join(timeout=0.5)
        return self.peak_memory_mb


# ---------------------------------------------------------------------------
# Environment Sanitization & Security Hardening
# ---------------------------------------------------------------------------

def prepare_sanitized_environment(
    network: bool,
    custom_env: Optional[Dict[str, str]] = None,
    guard_dir: Optional[str] = None
) -> Dict[str, str]:
    """
    Cleanses environment by scrubbing proxies, tokens, secrets, and credentials.
    Sets hardening flags and injects socket interception guards into PYTHONPATH.
    """
    env = os.environ.copy()

    # Sensitive variables and patterns to purge
    forbidden_exact = {
        "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
        "http_proxy", "https_proxy", "all_proxy", "no_proxy",
        "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
        "GOOGLE_APPLICATION_CREDENTIALS", "AZURE_CLIENT_SECRET",
        "GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
        "SSH_AUTH_SOCK", "SSH_AGENT_PID", "GPG_AGENT_INFO",
        "CURL_CA_BUNDLE", "SSL_CERT_FILE",
    }
    forbidden_prefixes = (
        "AWS_", "AZURE_", "GCP_", "DATABASE_", "DB_", "SECRET_", "TOKEN_",
        "API_KEY", "SUPER_SECRET", "PASSWORD", "SSH_", "GITHUB_", "GH_"
    )

    for k in list(env.keys()):
        k_upper = k.upper()
        if k in forbidden_exact or any(k_upper.startswith(prefix) for prefix in forbidden_prefixes):
            env.pop(k, None)

    # Security flags
    env["SOVEREIGN_AIRGAP"] = "1"
    env["PYTHONSAFEPATH"] = "1"
    env["PYTHONNOUSERSITE"] = "1"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PYTHONUNBUFFERED"] = "1"

    # Inject socket guard via PYTHONPATH & PATH
    if guard_dir and not network:
        current_pythonpath = env.get("PYTHONPATH", "")
        if current_pythonpath:
            env["PYTHONPATH"] = f"{guard_dir}{os.pathsep}{current_pythonpath}"
        else:
            env["PYTHONPATH"] = guard_dir

        current_path = env.get("PATH", "")
        if current_path:
            env["PATH"] = f"{guard_dir}{os.pathsep}{current_path}"
        else:
            env["PATH"] = guard_dir

    if custom_env:
        # Apply custom overrides
        for k, v in custom_env.items():
            env[k] = v

    return env


# ---------------------------------------------------------------------------
# Main Entry Point: run_sandboxed
# ---------------------------------------------------------------------------

def run_sandboxed(
    command: Union[List[str], str],
    timeout_sec: int = 10,
    memory_limit_mb: int = 512,
    network: bool = False,
    cwd: Optional[Union[str, Path]] = None,
    env: Optional[Dict[str, str]] = None,
    input_data: Optional[str] = None
) -> SandboxResult:
    """
    Executes a command inside an air-gapped, resource-bounded sandbox.
    
    Args:
        command: List of command arguments or shell command string.
        timeout_sec: Maximum execution duration before SIGKILL (default: 10).
        memory_limit_mb: Maximum memory threshold in MB (default: 512).
        network: False to enforce strict air-gap isolation; True to allow network.
        cwd: Working directory for sandboxed process.
        env: Custom environment variables.
        input_data: Optional stdin string.
        
    Returns:
        SandboxResult with stdout, stderr, returncode, elapsed time, peak RAM, egress bytes.
    """
    if isinstance(command, str):
        command = shlex.split(command, posix=(sys.platform != "win32"))

    if not command:
        raise ValueError("command cannot be empty")

    if timeout_sec <= 0:
        raise ValueError(f"timeout_sec must be positive, got {timeout_sec}")

    if memory_limit_mb <= 0:
        raise ValueError(f"memory_limit_mb must be positive, got {memory_limit_mb}")

    # Resolve python binary if invoked generically
    if command[0] in ("python", "python3") and not shutil.which(command[0]):
        command = [sys.executable] + command[1:]

    # Check nsjail availability on Linux
    is_linux = sys.platform.startswith("linux")
    nsjail_bin = shutil.which("nsjail") if is_linux else None
    force_fallback = os.environ.get("SOVEREIGN_FORCE_FALLBACK") == "1"

    if is_linux and nsjail_bin and not force_fallback:
        return _run_nsjail(
            command=command,
            timeout_sec=timeout_sec,
            memory_limit_mb=memory_limit_mb,
            network=network,
            cwd=cwd,
            env=env,
            input_data=input_data
        )
    else:
        return _run_fallback(
            command=command,
            timeout_sec=timeout_sec,
            memory_limit_mb=memory_limit_mb,
            network=network,
            cwd=cwd,
            env=env,
            input_data=input_data
        )


# ---------------------------------------------------------------------------
# Backend: nsjail (Linux Kernel Namespaces)
# ---------------------------------------------------------------------------

def _run_nsjail(
    command: List[str],
    timeout_sec: int,
    memory_limit_mb: int,
    network: bool,
    cwd: Optional[Union[str, Path]],
    env: Optional[Dict[str, str]],
    input_data: Optional[str]
) -> SandboxResult:
    """Executes using nsjail namespace isolation."""
    scratch_dir = tempfile.mkdtemp(prefix="sovereign_nsjail_")
    nsjail_bin = shutil.which("nsjail") or "nsjail"
    work_dir = str(cwd) if cwd else scratch_dir

    cmd = [
        nsjail_bin,
        "--mode", "o",
        "--time_limit", str(timeout_sec),
        "--rlimit_as", str(memory_limit_mb),
        "--rlimit_cpu", str(timeout_sec),
        "--rlimit_nproc", "16",
        "--rlimit_nofile", "128",
        "--chroot", "/",
        "-R", "/bin",
        "-R", "/usr",
        "-R", "/lib",
        "-R", "/lib64",
        "-R", "/etc",
        "-R", "/dev/urandom",
        "-R", "/dev/null",
        "-R", "/dev/zero",
        "-R", "/proc",
        "-T", "/tmp",
        "-B", f"{work_dir}:/workspace",
        "--cwd", "/workspace",
    ]

    if network:
        cmd.append("--disable_clone_newnet")

    cmd.append("--")
    cmd.extend(command)

    sanitized_env = prepare_sanitized_environment(network=network, custom_env=env)
    start_time = time.perf_counter()

    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE if input_data else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=sanitized_env,
        )

        watchdog = ProcessTreeWatchdog(
            pid=proc.pid,
            memory_limit_mb=memory_limit_mb,
            check_network=not network
        )
        watchdog.start()

        stdout, stderr = proc.communicate(input=input_data, timeout=timeout_sec + 2)
        exec_time = round(time.perf_counter() - start_time, 4)
        peak_mem = watchdog.stop()
        returncode = proc.returncode

        if watchdog.oom_killed or returncode in (137, -9):
            returncode = 137
            stderr = (stderr or "") + f"\n[Sandbox Violation] Process killed due to memory limit ({memory_limit_mb}MB)."

        return SandboxResult(
            stdout=stdout or "",
            stderr=stderr or "",
            returncode=returncode,
            execution_time_sec=exec_time,
            memory_peak_mb=round(peak_mem, 2),
            network_egress_bytes=0
        )

    except subprocess.TimeoutExpired:
        if psutil:
            try:
                p = psutil.Process(proc.pid)
                for c in p.children(recursive=True):
                    c.kill()
                p.kill()
            except Exception:
                proc.kill()
        else:
            proc.kill()

        try:
            stdout, stderr = proc.communicate(timeout=1.0)
        except Exception:
            stdout, stderr = "", ""

        exec_time = round(time.perf_counter() - start_time, 4)
        return SandboxResult(
            stdout=stdout or "",
            stderr=(stderr or "") + f"\n[Sandbox Timeout] Process exceeded timeout of {timeout_sec}s.",
            returncode=124,
            execution_time_sec=exec_time,
            memory_peak_mb=0.0,
            network_egress_bytes=0
        )
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Backend: Cross-Platform Fallback (Windows Job Objects & Watchdog)
# ---------------------------------------------------------------------------

def _run_fallback(
    command: List[str],
    timeout_sec: int,
    memory_limit_mb: int,
    network: bool,
    cwd: Optional[Union[str, Path]],
    env: Optional[Dict[str, str]],
    input_data: Optional[str]
) -> SandboxResult:
    """Executes using cross-platform sanitized subprocess, Job Objects, and watchdogs."""
    temp_dir = tempfile.mkdtemp(prefix="sovereign_fallback_")
    job_mgr: Optional[WindowsJobManager] = None
    preexec_fn = None

    try:
        # If network isolation active, set up socket interposition and shims
        if not network:
            sitecustomize_path = os.path.join(temp_dir, "sitecustomize.py")
            with open(sitecustomize_path, "w", encoding="utf-8") as f:
                f.write(_GUARD_MODULE_CODE)

            # Create shims to block network CLI tools
            if sys.platform == "win32":
                for tool in ("curl", "wget", "nc", "netcat", "ssh", "scp", "ftp", "telnet"):
                    cmd_file = os.path.join(temp_dir, f"{tool}.cmd")
                    with open(cmd_file, "w", encoding="utf-8") as f:
                        f.write(
                            "@echo off\n"
                            "echo Security Violation: Network binary is prohibited in air-gapped sandbox. >&2\n"
                            "exit /b 126\n"
                        )
            else:
                for tool in ("curl", "wget", "nc", "netcat", "ssh", "scp", "ftp", "telnet"):
                    sh_file = os.path.join(temp_dir, tool)
                    with open(sh_file, "w", encoding="utf-8") as f:
                        f.write(
                            "#!/bin/sh\n"
                            "echo 'Security Violation: Network binary is prohibited in air-gapped sandbox.' >&2\n"
                            "exit 126\n"
                        )
                    try:
                        os.chmod(sh_file, 0o755)
                    except Exception:
                        pass

        sanitized_env = prepare_sanitized_environment(
            network=network,
            custom_env=env,
            guard_dir=temp_dir if not network else None
        )

        work_dir = str(cwd) if cwd else os.getcwd()

        if sys.platform.startswith("linux") and resource is not None:
            limit_bytes = int(memory_limit_mb * 1024 * 1024)
            def _set_rlimit():
                try:
                    resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))
                except Exception:
                    pass
            preexec_fn = _set_rlimit

        start_time = time.perf_counter()

        try:
            proc = subprocess.Popen(
                command,
                stdin=subprocess.PIPE if input_data else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=work_dir,
                env=sanitized_env,
                preexec_fn=preexec_fn,
            )
        except (FileNotFoundError, OSError) as exc:
            return SandboxResult(
                stdout="",
                stderr=f"Execution error: {exc} (command not found or inaccessible)",
                returncode=127,
                execution_time_sec=round(time.perf_counter() - start_time, 4),
                memory_peak_mb=0.0,
                network_egress_bytes=0,
            )

        # Attach Windows Job Object if on Windows
        if sys.platform == "win32":
            try:
                job_mgr = WindowsJobManager(memory_limit_mb)
                job_mgr.assign_process(proc.pid)
            except Exception:
                job_mgr = None

        # Start concurrent process tree watchdog
        watchdog = ProcessTreeWatchdog(
            pid=proc.pid,
            memory_limit_mb=memory_limit_mb,
            check_network=not network
        )
        watchdog.start()

        try:
            stdout, stderr = proc.communicate(input=input_data, timeout=timeout_sec)
            exec_time = round(time.perf_counter() - start_time, 4)
            peak_mem = watchdog.stop()
            returncode = proc.returncode

            # Check peak memory from Windows Job Object if higher
            if job_mgr:
                job_peak = job_mgr.get_peak_memory_mb()
                if job_peak > peak_mem:
                    peak_mem = job_peak

            if watchdog.oom_killed or returncode == 137:
                returncode = 137
                stderr = (stderr or "") + f"\n[Sandbox Violation] Process killed due to memory limit ({memory_limit_mb}MB)."

            if watchdog.network_violation:
                returncode = 126
                stderr = (stderr or "") + "\n[Sandbox Violation] Process terminated: unauthorized network egress attempted."

            return SandboxResult(
                stdout=stdout or "",
                stderr=stderr or "",
                returncode=returncode,
                execution_time_sec=exec_time,
                memory_peak_mb=round(peak_mem, 2),
                network_egress_bytes=watchdog.egress_bytes_detected
            )

        except subprocess.TimeoutExpired:
            # Terminate parent and all descendant processes
            if psutil:
                try:
                    parent = psutil.Process(proc.pid)
                    for child in parent.children(recursive=True):
                        try:
                            child.kill()
                        except Exception:
                            pass
                    parent.kill()
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
            else:
                proc.kill()

            watchdog.stop()

            try:
                stdout, stderr = proc.communicate(timeout=1.0)
            except Exception:
                stdout, stderr = "", ""

            exec_time = round(time.perf_counter() - start_time, 4)
            return SandboxResult(
                stdout=stdout or "",
                stderr=(stderr or "") + f"\n[Sandbox Timeout] Process exceeded timeout of {timeout_sec}s.",
                returncode=124,
                execution_time_sec=exec_time,
                memory_peak_mb=0.0,
                network_egress_bytes=0
            )

    finally:
        if job_mgr:
            job_mgr.close()
        shutil.rmtree(temp_dir, ignore_errors=True)
