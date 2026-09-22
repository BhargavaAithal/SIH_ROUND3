import pytest
import tempfile
import threading
import time
import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta

from src.sovereign.control_plane.models import (
    Mission, WorkUnit, Artifact, MissionStatus, WorkUnitStatus,
    ArtifactStatus, CommitDecision, VerificationResult,
    HumanOverrideResolution
)
from src.sovereign.control_plane.state_graph import StateGraph, _to_dict, _parse_work_unit

@pytest.fixture
def temp_db():
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_resilience.db")
    sg = StateGraph(db_path)
    yield sg, db_path, temp_dir
    sg.close()
    shutil.rmtree(temp_dir, ignore_errors=True)

def test_concurrent_writer_hammer(temp_db):
    """
    Stress-tests the serialized writer actor with 50 parallel threads writing simultaneously.
    Verifies: 0 SQLITE_BUSY errors, 0 lock timeouts, and a strictly linear SHA-256 Merkle chain.
    """
    sg, db_path, _ = temp_db
    mission_id = "M-TEST-CONCURRENCY-50"
    num_threads = 50
    events_per_thread = 5

    errors = []

    def _worker(thread_idx: int):
        try:
            for i in range(events_per_thread):
                entity_id = f"WU-T{thread_idx}-E{i}"
                sg.append_event(
                    mission_id=mission_id,
                    entity_type="WorkUnit",
                    entity_id=entity_id,
                    event_type="TEST_EVENT",
                    payload={"thread": thread_idx, "seq": i, "timestamp": time.time()}
                )
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=_worker, args=(i,)) for i in range(num_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10.0)

    assert len(errors) == 0, f"Encountered concurrency errors: {errors}"

    # Verify linear SHA-256 chain continuity from block 0 to tip
    integrity = sg.verify_integrity_on_boot()
    assert integrity["status"] == "INTACT"
    assert integrity["total_events"] == num_threads * events_per_thread

def test_synchronous_read_after_write(temp_db):
    """
    Verifies that state transitions return only after BEGIN IMMEDIATE commits,
    providing absolute read-after-write consistency across threads.
    """
    sg, db_path, _ = temp_db
    mission_id = "M-TEST-RAW"
    wu_id = "WU-RAW-001"

    wu = WorkUnit(
        id=wu_id,
        mission_id=mission_id,
        objective="Verify read-after-write guarantee",
        executor="Z3Prover",
        status=WorkUnitStatus.READY
    )

    sg.append_event(mission_id, "WorkUnit", wu_id, "INITIALIZE", _to_dict(wu))

    # Transition with lease
    lease_id = "LEASE-RAW-12345"
    sg.transition_work_unit(mission_id, wu_id, WorkUnitStatus.EXECUTING, lease_id=lease_id, ttl_seconds=60)

    # Immediately read from projection in fresh connection
    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status, data FROM work_units WHERE id = ?", (wu_id,))
        row = cur.fetchone()
        assert row is not None
        assert row[0] == WorkUnitStatus.EXECUTING.value
        parsed_wu = _parse_work_unit(row[1])
        assert parsed_wu.status == WorkUnitStatus.EXECUTING
        assert parsed_wu.execution_lease_id == lease_id

def test_lease_watchdog_reclamation_and_escalation(temp_db):
    """
    Verifies:
    1. Expired worker leases are automatically reclaimed to READY.
    2. Units exceeding 3 retries automatically escalate to WAITING_HUMAN.
    """
    sg, db_path, temp_dir = temp_db
    mission_id = "M-TEST-WATCHDOG"
    wu_id = "WU-TIMEOUT-001"

    staging_dir = os.path.join(temp_dir, "staging_test")
    os.makedirs(staging_dir, exist_ok=True)
    test_artifact_file = os.path.join(staging_dir, "draft_output.docx")
    with open(test_artifact_file, "w") as f:
        f.write("unverified draft content")

    wu = WorkUnit(
        id=wu_id,
        mission_id=mission_id,
        objective="Simulate hanging worker process",
        executor="HangingWorker",
        status=WorkUnitStatus.READY,
        retry_count=0
    )
    sg.append_event(mission_id, "WorkUnit", wu_id, "INITIALIZE", _to_dict(wu))

    # Claim lease with immediate expiration in the past
    sg.transition_work_unit(mission_id, wu_id, WorkUnitStatus.EXECUTING, lease_id="LEASE-EXPIRED", ttl_seconds=-10, staging_dir=staging_dir)

    # Trigger watchdog sweep 1 -> should revert to READY and increment retry_count to 1
    reclaimed = sg.reclaim_expired_leases()
    assert wu_id in reclaimed

    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status, retry_count FROM work_units WHERE id = ?", (wu_id,))
        status, retries = cur.fetchone()
        assert status == WorkUnitStatus.READY.value
        assert retries == 1

    # Simulate 2nd failure
    sg.transition_work_unit(mission_id, wu_id, WorkUnitStatus.EXECUTING, lease_id="LEASE-EXPIRED-2", ttl_seconds=-10)
    sg.reclaim_expired_leases()

    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status, retry_count FROM work_units WHERE id = ?", (wu_id,))
        status, retries = cur.fetchone()
        assert status == WorkUnitStatus.READY.value
        assert retries == 2

    # Simulate 3rd failure -> should escalate to WAITING_HUMAN
    sg.transition_work_unit(mission_id, wu_id, WorkUnitStatus.EXECUTING, lease_id="LEASE-EXPIRED-3", ttl_seconds=-10)
    sg.reclaim_expired_leases()

    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status, retry_count FROM work_units WHERE id = ?", (wu_id,))
        status, retries = cur.fetchone()
        assert status == WorkUnitStatus.WAITING_HUMAN.value
        assert retries == 3

def test_surgical_branch_suspension_and_sibling_survival(temp_db):
    """
    Verifies that when a work unit fails or escalates to WAITING_HUMAN:
    - Only its direct downstream dependents transition to BLOCKED.
    - Sibling parallel branches continue to execute and commit without stalling.
    """
    sg, db_path, _ = temp_db
    mission_id = "M-TEST-BRANCH-SURVIVAL"

    # Branch A: WU-A1 (fails) -> WU-A2 (downstream dependent)
    # Branch B: WU-B1 (sibling) -> WU-B2 (sibling dependent)
    wu_a1 = WorkUnit(id="WU-A1", mission_id=mission_id, objective="Piping Branch A1", executor="Calc", status=WorkUnitStatus.READY, retry_count=2)
    wu_a2 = WorkUnit(id="WU-A2", mission_id=mission_id, objective="Piping Branch A2", executor="Report", status=WorkUnitStatus.READY, dependencies=["WU-A1"])

    wu_b1 = WorkUnit(id="WU-B1", mission_id=mission_id, objective="Tank Branch B1", executor="Calc", status=WorkUnitStatus.READY)
    wu_b2 = WorkUnit(id="WU-B2", mission_id=mission_id, objective="Tank Branch B2", executor="Report", status=WorkUnitStatus.READY, dependencies=["WU-B1"])

    for wu in [wu_a1, wu_a2, wu_b1, wu_b2]:
        sg.append_event(mission_id, "WorkUnit", wu.id, "INIT", _to_dict(wu))

    # Branch A1 times out and hits 3rd strike
    sg.transition_work_unit(mission_id, "WU-A1", WorkUnitStatus.EXECUTING, lease_id="LEASE-A1", ttl_seconds=-1)
    sg.reclaim_expired_leases()

    # Verify WU-A1 is WAITING_HUMAN, and WU-A2 was surgically suspended to BLOCKED
    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status FROM work_units WHERE id = 'WU-A1'")
        assert cur.fetchone()[0] == WorkUnitStatus.WAITING_HUMAN.value

        cur.execute("SELECT status FROM work_units WHERE id = 'WU-A2'")
        assert cur.fetchone()[0] == WorkUnitStatus.BLOCKED.value

        # SIBLING PROTECTION GUARANTEE: Branch B units must remain unblocked!
        cur.execute("SELECT status FROM work_units WHERE id = 'WU-B1'")
        assert cur.fetchone()[0] == WorkUnitStatus.READY.value

        cur.execute("SELECT status FROM work_units WHERE id = 'WU-B2'")
        assert cur.fetchone()[0] == WorkUnitStatus.READY.value

    # Branch B1 can execute and transition to COMMITTED without impediment
    sg.transition_work_unit(mission_id, "WU-B1", WorkUnitStatus.EXECUTING, lease_id="LEASE-B1", ttl_seconds=60)
    sg.transition_work_unit(mission_id, "WU-B1", WorkUnitStatus.EXECUTED)
    sg.transition_work_unit(mission_id, "WU-B1", WorkUnitStatus.VERIFIED)
    sg.transition_work_unit(mission_id, "WU-B1", WorkUnitStatus.COMMITTED)

    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status FROM work_units WHERE id = 'WU-B1'")
        assert cur.fetchone()[0] == WorkUnitStatus.COMMITTED.value

def test_statutory_cryptographic_human_override(temp_db):
    """
    Verifies that an authorized engineer can resolve a WAITING_HUMAN task
    with a mandatory >= 20 char justification and HMAC signature,
    unblocking downstream dependents with complete statutory provenance.
    """
    sg, db_path, _ = temp_db
    mission_id = "M-TEST-STATUTORY-OVERRIDE"

    wu_parent = WorkUnit(id="WU-PARENT", mission_id=mission_id, objective="Parent calculation", executor="Calc", status=WorkUnitStatus.WAITING_HUMAN)
    wu_child = WorkUnit(id="WU-CHILD", mission_id=mission_id, objective="Child report", executor="Report", status=WorkUnitStatus.BLOCKED, dependencies=["WU-PARENT"])

    sg.append_event(mission_id, "WorkUnit", "WU-PARENT", "INIT", _to_dict(wu_parent))
    sg.append_event(mission_id, "WorkUnit", "WU-CHILD", "INIT", _to_dict(wu_child))

    # Attempt override with short justification -> must be rejected
    with pytest.raises(ValueError, match="at least 20 characters"):
        sg.apply_human_override(
            mission_id=mission_id,
            wu_id="WU-PARENT",
            operator_id="ENG-OFFICER-4412",
            resolution=HumanOverrideResolution.RETRY_WITH_NEW_INPUTS,
            justification="too short",
            hmac_signature="sig-12345"
        )

    # Apply valid statutory human override
    valid_justification = "Reviewed ultrasonic A-scan echograms; physical wall thickness verified at 9.42mm per MTC heat cert 4471."
    success = sg.apply_human_override(
        mission_id=mission_id,
        wu_id="WU-PARENT",
        operator_id="ENG-OFFICER-4412",
        resolution=HumanOverrideResolution.RETRY_WITH_NEW_INPUTS,
        justification=valid_justification,
        hmac_signature="HMAC-SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
    assert success is True

    # Check projection states: parent is READY with reset retries; child is unblocked to READY
    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT status, retry_count FROM work_units WHERE id = 'WU-PARENT'")
        status, retries = cur.fetchone()
        assert status == WorkUnitStatus.READY.value
        assert retries == 0

        cur.execute("SELECT status FROM work_units WHERE id = 'WU-CHILD'")
        assert cur.fetchone()[0] == WorkUnitStatus.READY.value

    # Verify event_log recorded the statutory HUMAN_OVERRIDE event
    with sg._get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT event_type, payload FROM event_log WHERE entity_id = 'WU-PARENT' AND event_type = 'HUMAN_OVERRIDE'")
        row = cur.fetchone()
        assert row is not None
        assert "ENG-OFFICER-4412" in row[1]
        assert "Reviewed ultrasonic" in row[1]
