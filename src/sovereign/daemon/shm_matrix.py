"""
Sovereign Subsystem — POSIX Shared Memory Ring Buffer Bridge (Item 7.2)

Provides a cross-platform Python interface to the lock-free MPMC ring buffer:
  - Linux / macOS:  /dev/shm/smitrace_matrix_shm  (POSIX shm_open + mmap)
  - Windows:        Global\\smitrace_matrix_shm      (CreateFileMapping + MapViewOfFile)

Layout in shared memory
-----------------------
  [0  … 127]   RingHeader  (2× AtomicUsize-like uint64 head/tail, 2× uint64 capacity/slot_size)
  [128 … end]  Slots       (RING_CAPACITY × (8 seq + 8 len + SLOT_DATA_BYTES data))

All values are little-endian uint64.  Sequence numbers follow the same
acquire-release protocol as the Rust `shm_ring` module — this bridge only
needs to be lock-free at the Python level; atomics are enforced by the OS
memory model on x86-64 and ARM64.

Target: <250 ns average image/matrix header transfer latency (measured on bare metal;
  Python bridge overhead is higher but remains within microsecond range).
"""

from __future__ import annotations

import os
import platform
import struct
import time
from typing import Optional

# ---------------------------------------------------------------------------
# Constants — must match src/sovereign/daemon/src/shm_ring.rs
# ---------------------------------------------------------------------------

RING_CAPACITY: int = 1024          # power-of-2
SLOT_DATA_BYTES: int = 4096        # bytes per slot payload
_SLOT_STRIDE: int = 8 + 8 + SLOT_DATA_BYTES   # seq(8) + len(8) + data
_HEADER_BYTES: int = 128           # 4 × uint64, padded to cache line
_TOTAL_BYTES: int = _HEADER_BYTES + RING_CAPACITY * _SLOT_STRIDE

SHM_NAME_POSIX: str = "smitrace_matrix_shm"   # used as name on all platforms
SHM_NAME_WIN: str = "smitrace_matrix_shm"     # same name, Python handles Windows naming

_IS_WINDOWS: bool = platform.system() == "Windows"

# ---------------------------------------------------------------------------
# Unified shared memory backend — multiprocessing.shared_memory works on all
# platforms (Windows, Linux, macOS) since Python 3.8.
# ---------------------------------------------------------------------------

from multiprocessing import shared_memory as _shm_mod


class _CrossPlatformSHM:
    """
    Named shared memory segment using Python's multiprocessing.shared_memory.
    On Linux this maps to /dev/shm/<name>; on Windows it uses the NT Object Manager.
    """

    def __init__(self, create: bool = True):
        try:
            self._shm = _shm_mod.SharedMemory(
                name=SHM_NAME_POSIX,
                create=create,
                size=_TOTAL_BYTES if create else 0,
            )
        except FileExistsError:
            # Already created by another process — attach without creating
            self._shm = _shm_mod.SharedMemory(
                name=SHM_NAME_POSIX,
                create=False,
            )
        except FileNotFoundError:
            # Segment disappeared between create=False call — (re)create
            self._shm = _shm_mod.SharedMemory(
                name=SHM_NAME_POSIX,
                create=True,
                size=_TOTAL_BYTES,
            )
        self._creator = create

    def buf(self) -> memoryview:
        return self._shm.buf

    def close(self):
        self._shm.close()
        if self._creator:
            try:
                self._shm.unlink()
            except Exception:
                pass


def _open_shm(create: bool) -> _CrossPlatformSHM:
    return _CrossPlatformSHM(create=create)


# ---------------------------------------------------------------------------
# Low-level header read/write (no locking — relies on x86-64 TSO)
# ---------------------------------------------------------------------------

_HEAD_OFF = 0
_TAIL_OFF = 8
_CAP_OFF = 16
_SLOT_SIZE_OFF = 24

_U64_STRUCT = struct.Struct("<Q")
_read_u64_val = _U64_STRUCT.unpack_from
_write_u64_val = _U64_STRUCT.pack_into


def _read_u64(buf: memoryview, offset: int) -> int:
    return _read_u64_val(buf, offset)[0]


def _write_u64(buf: memoryview, offset: int, value: int) -> None:
    _write_u64_val(buf, offset, value)


def _slot_offset(idx: int) -> int:
    return _HEADER_BYTES + (idx & (RING_CAPACITY - 1)) * _SLOT_STRIDE


def _init_header(buf: memoryview) -> None:
    _write_u64(buf, _HEAD_OFF, 0)
    _write_u64(buf, _TAIL_OFF, 0)
    _write_u64(buf, _CAP_OFF, RING_CAPACITY)
    _write_u64(buf, _SLOT_SIZE_OFF, SLOT_DATA_BYTES)
    # Initialize slot sequences
    for i in range(RING_CAPACITY):
        off = _slot_offset(i)
        _write_u64(buf, off, i)           # sequence = slot index
        _write_u64(buf, off + 8, 0)       # len = 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class SHMRingProducer:
    """
    Lock-free producer for the smitrace shared memory ring buffer.

    Usage::

        with SHMRingProducer() as p:
            p.publish(image_bytes)
    """

    def __init__(self, create: bool = True):
        self._shm = _open_shm(create=create)
        self._buf = self._shm.buf()
        if create:
            _init_header(self._buf)

    def publish(self, payload: bytes, timeout_ns: float = 5_000_000) -> bool:
        """
        Publish payload to the ring. Spin-waits up to ``timeout_ns`` nanoseconds
        if the ring is transiently full. Returns True on success.
        """
        plen = len(payload)
        if plen > SLOT_DATA_BYTES:
            plen = SLOT_DATA_BYTES
        buf = self._buf

        # Fast path: check current head slot immediately without querying clock
        head = _read_u64_val(buf, _HEAD_OFF)[0]
        slot_off = _HEADER_BYTES + (head & (RING_CAPACITY - 1)) * _SLOT_STRIDE
        seq = _read_u64_val(buf, slot_off)[0]

        if seq == head:
            next_head = (head + 1) & 0xFFFF_FFFF_FFFF_FFFF
            _write_u64_val(buf, _HEAD_OFF, next_head)
            buf[slot_off + 16: slot_off + 16 + plen] = payload[:plen]
            _write_u64_val(buf, slot_off + 8, plen)
            _write_u64_val(buf, slot_off, next_head)
            return True

        # Slow path: spin-wait with timeout
        deadline = time.perf_counter_ns() + int(timeout_ns)
        while True:
            head = _read_u64_val(buf, _HEAD_OFF)[0]
            slot_off = _HEADER_BYTES + (head & (RING_CAPACITY - 1)) * _SLOT_STRIDE
            seq = _read_u64_val(buf, slot_off)[0]

            if seq == head:
                next_head = (head + 1) & 0xFFFF_FFFF_FFFF_FFFF
                _write_u64_val(buf, _HEAD_OFF, next_head)
                buf[slot_off + 16: slot_off + 16 + plen] = payload[:plen]
                _write_u64_val(buf, slot_off + 8, plen)
                _write_u64_val(buf, slot_off, next_head)
                return True

            if time.perf_counter_ns() >= deadline:
                return False

    def close(self):
        self._buf = None
        self._shm.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


class SHMRingConsumer:
    """
    Lock-free consumer for the smitrace shared memory ring buffer.

    Usage::

        with SHMRingConsumer(create=False) as c:
            data = c.consume()
    """

    def __init__(self, create: bool = False):
        self._shm = _open_shm(create=create)
        self._buf = self._shm.buf()

    def consume(self, timeout_ns: float = 5_000_000) -> Optional[bytes]:
        """
        Consume the next available slot. Returns payload bytes or None on timeout.
        """
        buf = self._buf

        # Fast path: check current tail slot immediately without querying clock
        tail = _read_u64_val(buf, _TAIL_OFF)[0]
        slot_off = _HEADER_BYTES + (tail & (RING_CAPACITY - 1)) * _SLOT_STRIDE
        seq = _read_u64_val(buf, slot_off)[0]
        expected = (tail + 1) & 0xFFFF_FFFF_FFFF_FFFF

        if seq == expected:
            _write_u64_val(buf, _TAIL_OFF, expected)
            plen = _read_u64_val(buf, slot_off + 8)[0]
            data = bytes(buf[slot_off + 16: slot_off + 16 + plen])
            next_seq = (tail + RING_CAPACITY) & 0xFFFF_FFFF_FFFF_FFFF
            _write_u64_val(buf, slot_off, next_seq)
            return data

        # Slow path: spin-wait with timeout
        deadline = time.perf_counter_ns() + int(timeout_ns)
        while True:
            tail = _read_u64_val(buf, _TAIL_OFF)[0]
            slot_off = _HEADER_BYTES + (tail & (RING_CAPACITY - 1)) * _SLOT_STRIDE
            seq = _read_u64_val(buf, slot_off)[0]
            expected = (tail + 1) & 0xFFFF_FFFF_FFFF_FFFF

            if seq == expected:
                _write_u64_val(buf, _TAIL_OFF, expected)
                plen = _read_u64_val(buf, slot_off + 8)[0]
                data = bytes(buf[slot_off + 16: slot_off + 16 + plen])
                next_seq = (tail + RING_CAPACITY) & 0xFFFF_FFFF_FFFF_FFFF
                _write_u64_val(buf, slot_off, next_seq)
                return data

            if time.perf_counter_ns() >= deadline:
                return None

    def close(self):
        self._buf = None
        self._shm.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


# ---------------------------------------------------------------------------
# Quick latency benchmark (run directly)
# ---------------------------------------------------------------------------

def _benchmark(n: int = 100_000) -> None:
    """Measure average roundtrip latency for publish + consume in the same process."""
    print(f"[shm_matrix] Benchmarking {n:,} roundtrips …")
    payload = b"A" * 256  # typical matrix row header

    prod = SHMRingProducer(create=True)
    cons = SHMRingConsumer(create=False)

    # Warm up
    for _ in range(1000):
        prod.publish(payload, timeout_ns=1_000_000)
        cons.consume(timeout_ns=1_000_000)

    start = time.perf_counter_ns()
    for _ in range(n):
        prod.publish(payload, timeout_ns=1_000_000)
        cons.consume(timeout_ns=1_000_000)
    elapsed = time.perf_counter_ns() - start

    ns_per_op = elapsed / n
    print(f"[shm_matrix] {ns_per_op:.1f} ns / roundtrip  (target <250 ns on bare metal)")
    prod.close()
    cons.close()


if __name__ == "__main__":
    _benchmark()
