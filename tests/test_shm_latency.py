"""
tests/test_shm_latency.py — Item 7.2 Verification

Measures round-trip latency for the smitrace shared memory ring buffer
using the Python SHMRingProducer / SHMRingConsumer bridge.

Targets:
  - Average roundtrip latency < 5,000 ns  (Python bridge; bare-metal Rust target is <250 ns)
  - 0 dropped messages over 10,000 roundtrips

Run: pytest tests/test_shm_latency.py -v
"""

from __future__ import annotations

import sys
import os
import time
import struct

import pytest

# Ensure project src is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sovereign.daemon.shm_matrix import (
    SHMRingProducer,
    SHMRingConsumer,
    RING_CAPACITY,
    SLOT_DATA_BYTES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def ring_pair():
    """Create a producer + consumer pair sharing the same in-process SHM."""
    prod = SHMRingProducer(create=True)
    cons = SHMRingConsumer(create=False)
    yield prod, cons
    prod.close()
    cons.close()


# ---------------------------------------------------------------------------
# Correctness tests
# ---------------------------------------------------------------------------

class TestSHMRingCorrectness:

    def test_single_roundtrip(self, ring_pair):
        """A published payload is returned correctly by the consumer."""
        prod, cons = ring_pair
        payload = b"smitrace-matrix-row-0001"
        assert prod.publish(payload, timeout_ns=1_000_000)
        received = cons.consume(timeout_ns=1_000_000)
        assert received == payload

    def test_empty_ring_returns_none(self, ring_pair):
        """Consuming from an empty ring returns None within timeout."""
        _, cons = ring_pair
        result = cons.consume(timeout_ns=100_000)
        assert result is None

    def test_multiple_payloads_fifo_order(self, ring_pair):
        """Messages are consumed in FIFO order."""
        prod, cons = ring_pair
        messages = [f"msg-{i:04d}".encode() for i in range(10)]
        for msg in messages:
            assert prod.publish(msg, timeout_ns=1_000_000)
        for expected in messages:
            received = cons.consume(timeout_ns=1_000_000)
            assert received == expected

    def test_max_payload_size(self, ring_pair):
        """Payloads up to SLOT_DATA_BYTES are stored and retrieved correctly."""
        prod, cons = ring_pair
        payload = bytes(range(256)) * (SLOT_DATA_BYTES // 256)
        assert prod.publish(payload, timeout_ns=1_000_000)
        received = cons.consume(timeout_ns=1_000_000)
        assert received == payload[:SLOT_DATA_BYTES]

    def test_binary_payload_integrity(self, ring_pair):
        """Binary payloads (e.g., packed struct) survive roundtrip."""
        prod, cons = ring_pair
        # Pack a simulated matrix header: timestamp, rows, cols, dtype
        header = struct.pack("<QHHb", int(time.time_ns()), 480, 640, 3)
        assert prod.publish(header, timeout_ns=1_000_000)
        received = cons.consume(timeout_ns=1_000_000)
        ts, rows, cols, dtype = struct.unpack("<QHHb", received)
        assert rows == 480
        assert cols == 640
        assert dtype == 3


# ---------------------------------------------------------------------------
# Latency benchmark (always runs; asserts CI-friendly ceiling)
# ---------------------------------------------------------------------------

class TestSHMLatency:

    def test_roundtrip_latency_10k_iterations(self, ring_pair):
        """
        Average publish + consume roundtrip must be <5,000 ns.
        (Python bridge; Rust-to-Rust target is <250 ns.)
        """
        prod, cons = ring_pair
        payload = b"X" * 256   # typical matrix header size

        # Warm up JIT / caches
        for _ in range(500):
            prod.publish(payload, timeout_ns=1_000_000)
            cons.consume(timeout_ns=1_000_000)

        N = 10_000
        start = time.perf_counter_ns()
        for _ in range(N):
            prod.publish(payload, timeout_ns=1_000_000)
            cons.consume(timeout_ns=1_000_000)
        elapsed = time.perf_counter_ns() - start

        ns_per_roundtrip = elapsed / N
        print(f"\n[shm_latency] Average roundtrip: {ns_per_roundtrip:.1f} ns over {N:,} iterations")
        print(f"[shm_latency] Python bridge overhead target: <5,000 ns | Rust bare-metal target: <250 ns")

        # CI ceiling: 5 µs (5,000 ns) for Python bridge on any hardware
        assert ns_per_roundtrip < 5_000, (
            f"Average roundtrip {ns_per_roundtrip:.1f} ns exceeds 5,000 ns CI ceiling. "
            f"Rust-to-Rust bare-metal target is <250 ns."
        )

    def test_zero_drops_100k_roundtrips(self, ring_pair):
        """No messages dropped over 100,000 sequential roundtrips."""
        prod, cons = ring_pair
        N = 100_000
        dropped = 0
        for i in range(N):
            payload = i.to_bytes(8, "little")
            ok = prod.publish(payload, timeout_ns=2_000_000)
            if not ok:
                dropped += 1
                continue
            received = cons.consume(timeout_ns=2_000_000)
            if received is None or received != payload:
                dropped += 1

        assert dropped == 0, f"{dropped} messages dropped or corrupted out of {N}"

    def test_throughput_items_per_second(self, ring_pair):
        """Must sustain at least 100,000 roundtrips/second in the Python bridge."""
        prod, cons = ring_pair
        payload = b"Z" * 128
        N = 50_000

        start = time.perf_counter()
        for _ in range(N):
            prod.publish(payload, timeout_ns=1_000_000)
            cons.consume(timeout_ns=1_000_000)
        elapsed = time.perf_counter() - start

        rate = N / elapsed
        print(f"\n[shm_latency] Throughput: {rate:,.0f} roundtrips/sec")
        assert rate >= 100_000, (
            f"Throughput {rate:,.0f} rps is below 100,000 rps minimum"
        )
