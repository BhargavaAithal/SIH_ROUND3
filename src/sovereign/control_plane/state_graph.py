import sqlite3
import json
import hashlib
import threading
import queue
import time
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timedelta

from .models import (
    Mission, WorkUnit, Artifact, MissionStatus, WorkUnitStatus,
    ArtifactStatus, VerificationResult, CommitDecision,
    HumanOverrideResolution, HumanOverridePayload
)

def _to_dict(model_instance: Any) -> Dict[str, Any]:
    if hasattr(model_instance, "model_dump"):
        return model_instance.model_dump()
    return model_instance.dict()

def _parse_work_unit(data_str: str) -> WorkUnit:
    if hasattr(WorkUnit, "model_validate_json"):
        return WorkUnit.model_validate_json(data_str)
    return WorkUnit.parse_raw(data_str)

def _parse_artifact(data_str: str) -> Artifact:
    if hasattr(Artifact, "model_validate_json"):
        return Artifact.model_validate_json(data_str)
    return Artifact.parse_raw(data_str)

class StateGraph:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._write_queue: queue.Queue = queue.Queue()
        self._writer_stop_event = threading.Event()
        self._watchdog_stop_event = threading.Event()
        self._watchdog_thread: Optional[threading.Thread] = None

        self._init_db()

        # Launch dedicated serialized writer actor thread
        self._writer_thread = threading.Thread(target=self._writer_loop, name="StateGraphWriterActor", daemon=True)
        self._writer_thread.start()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        return conn

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            
            # Authoritative Event Log
            conn.execute('''
                CREATE TABLE IF NOT EXISTS event_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mission_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL,      -- 'Mission', 'WorkUnit', 'Artifact'
                    entity_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,       -- e.g., 'TRANSITION_TO_EXECUTING'
                    payload TEXT NOT NULL,
                    previous_hash TEXT,
                    hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Projections
            conn.execute('''
                CREATE TABLE IF NOT EXISTS missions (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS work_units (
                    id TEXT PRIMARY KEY,
                    mission_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    lease_expires_at TEXT,
                    last_heartbeat TEXT,
                    retry_count INTEGER DEFAULT 0,
                    data TEXT NOT NULL
                )
            ''')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS artifacts (
                    id TEXT PRIMARY KEY,
                    producer_wu_id TEXT,
                    status TEXT NOT NULL,
                    data TEXT NOT NULL
                )
            ''')

            conn.commit()

    def _writer_loop(self):
        """
        Dedicated single-writer actor loop.
        Executes mutations sequentially under BEGIN IMMEDIATE transactions.
        Guarantees strict linear SHA-256 Merkle hash chain without SQLITE_BUSY concurrency conflicts.
        """
        conn = self._get_connection()
        while not self._writer_stop_event.is_set():
            try:
                task = self._write_queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if task is None:
                self._write_queue.task_done()
                break

            action_fn, barrier_event, result_holder = task
            try:
                # Exponential backoff retry for BEGIN IMMEDIATE
                committed = False
                attempts = 0
                max_attempts = 10
                backoff_ms = 0.005

                while not committed and attempts < max_attempts:
                    attempts += 1
                    try:
                        conn.execute("BEGIN IMMEDIATE")
                        res = action_fn(conn)
                        conn.commit()
                        result_holder["result"] = res
                        committed = True
                    except sqlite3.OperationalError as op_err:
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                        if "locked" in str(op_err).lower() or "busy" in str(op_err).lower():
                            time.sleep(backoff_ms)
                            backoff_ms = min(backoff_ms * 2, 0.5)
                        else:
                            raise op_err
                    except Exception as e:
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                        raise e

                if not committed:
                    raise sqlite3.OperationalError("Exhausted retries acquiring BEGIN IMMEDIATE write lock")

            except Exception as e:
                result_holder["error"] = e
            finally:
                barrier_event.set()
                self._write_queue.task_done()

        try:
            conn.close()
        except Exception:
            pass

    def _execute_write(self, action_fn, timeout: float = 5.0) -> Any:
        """
        Synchronous barrier interface. Mutating callers enqueue work and block
        until the writer actor commits or signals failure.
        """
        barrier = threading.Event()
        result_holder = {}
        self._write_queue.put((action_fn, barrier, result_holder))

        if not barrier.wait(timeout=timeout):
            raise TimeoutError(f"Writer actor timed out after {timeout}s waiting for commit barrier")

        if "error" in result_holder:
            raise result_holder["error"]

        return result_holder.get("result")

    def _get_last_hash(self, conn: sqlite3.Connection, mission_id: str) -> Optional[str]:
        cur = conn.cursor()
        cur.execute('''
            SELECT hash FROM event_log 
            WHERE mission_id = ? 
            ORDER BY id DESC LIMIT 1
        ''', (mission_id,))
        row = cur.fetchone()
        return row[0] if row else None

    def _compute_hash(self, payload: str, previous_hash: Optional[str]) -> str:
        h = hashlib.sha256()
        if previous_hash:
            h.update(previous_hash.encode('utf-8'))
        h.update(payload.encode('utf-8'))
        return h.hexdigest()

    def append_event(self, mission_id: str, entity_type: str, entity_id: str, event_type: str, payload: Dict[str, Any]):
        """
        Appends an event to the authoritative log and updates the projection through the serialized writer actor.
        """
        def _action(conn: sqlite3.Connection):
            payload_str = json.dumps(payload, default=str, sort_keys=True)
            prev_hash = self._get_last_hash(conn, mission_id)
            new_hash = self._compute_hash(payload_str, prev_hash)

            conn.execute('''
                INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (mission_id, entity_type, entity_id, event_type, payload_str, prev_hash, new_hash))

            self._update_projection(conn, entity_type, entity_id, event_type, payload)
            return new_hash

        return self._execute_write(_action)

    def _update_projection(self, conn: sqlite3.Connection, entity_type: str, entity_id: str, event_type: str, payload: Dict[str, Any]):
        if entity_type == "Mission":
            conn.execute("INSERT OR REPLACE INTO missions (id, data) VALUES (?, ?)", (entity_id, json.dumps(payload, default=str)))
        elif entity_type == "WorkUnit":
            status = payload.get("status", WorkUnitStatus.PROPOSED.value)
            lease_expires_at = payload.get("lease_expires_at")
            last_heartbeat = payload.get("last_heartbeat")
            retry_count = payload.get("retry_count", 0)
            conn.execute('''
                INSERT OR REPLACE INTO work_units (id, mission_id, status, lease_expires_at, last_heartbeat, retry_count, data) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (entity_id, payload.get("mission_id", ""), status, str(lease_expires_at) if lease_expires_at else None, str(last_heartbeat) if last_heartbeat else None, retry_count, json.dumps(payload, default=str)))
        elif entity_type == "Artifact":
            status = payload.get("commit_decision", payload.get("verification_result", ArtifactStatus.PROPOSED.value))
            conn.execute("INSERT OR REPLACE INTO artifacts (id, producer_wu_id, status, data) VALUES (?, ?, ?, ?)", 
                         (entity_id, payload.get("producer_wu_id"), status, json.dumps(payload, default=str)))

    def transition_work_unit(self, mission_id: str, wu_id: str, new_status: WorkUnitStatus, lease_id: Optional[str] = None, ttl_seconds: int = 60, staging_dir: Optional[str] = None) -> bool:
        """
        Strict state transition guardrails enforced synchronously via the writer actor.
        """
        def _action(conn: sqlite3.Connection):
            cur = conn.cursor()
            cur.execute("SELECT data FROM work_units WHERE id = ?", (wu_id,))
            row = cur.fetchone()
            if not row:
                return False

            wu = _parse_work_unit(row[0])
            current_status = wu.status

            valid_transitions = {
                WorkUnitStatus.PROPOSED: [WorkUnitStatus.READY, WorkUnitStatus.INVALIDATED],
                WorkUnitStatus.READY: [WorkUnitStatus.EXECUTING, WorkUnitStatus.BLOCKED, WorkUnitStatus.WAITING_HUMAN],
                WorkUnitStatus.EXECUTING: [WorkUnitStatus.EXECUTED, WorkUnitStatus.FAILED, WorkUnitStatus.READY, WorkUnitStatus.WAITING_HUMAN],
                WorkUnitStatus.EXECUTED: [WorkUnitStatus.VERIFIED, WorkUnitStatus.FAILED, WorkUnitStatus.WAITING_HUMAN],
                WorkUnitStatus.VERIFIED: [WorkUnitStatus.COMMITTED, WorkUnitStatus.FAILED],
                WorkUnitStatus.FAILED: [WorkUnitStatus.READY, WorkUnitStatus.INVALIDATED, WorkUnitStatus.WAITING_HUMAN],
                WorkUnitStatus.BLOCKED: [WorkUnitStatus.READY, WorkUnitStatus.INVALIDATED],
                WorkUnitStatus.WAITING_HUMAN: [WorkUnitStatus.READY, WorkUnitStatus.VERIFIED, WorkUnitStatus.FAILED, WorkUnitStatus.INVALIDATED],
                WorkUnitStatus.COMMITTED: [WorkUnitStatus.INVALIDATED],
                WorkUnitStatus.INVALIDATED: []
            }

            if new_status not in valid_transitions.get(current_status, []):
                raise ValueError(f"Illegal transition: {current_status} -> {new_status}")

            now = datetime.utcnow()
            if new_status == WorkUnitStatus.EXECUTING:
                if not lease_id:
                    raise ValueError("Lease ID required to transition to EXECUTING")
                wu.execution_lease_id = lease_id
                wu.lease_expires_at = now + timedelta(seconds=ttl_seconds)
                wu.last_heartbeat = now
                if staging_dir:
                    wu.staging_dir = staging_dir
            elif new_status in [WorkUnitStatus.COMMITTED, WorkUnitStatus.READY, WorkUnitStatus.WAITING_HUMAN]:
                wu.execution_lease_id = None
                wu.lease_expires_at = None

            wu.status = new_status

            wu_dict = _to_dict(wu)
            payload_str = json.dumps(wu_dict, default=str, sort_keys=True)
            prev_hash = self._get_last_hash(conn, mission_id)
            new_hash = self._compute_hash(payload_str, prev_hash)

            conn.execute('''
                INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (mission_id, "WorkUnit", wu_id, f"TRANSITION_TO_{new_status.value}", payload_str, prev_hash, new_hash))

            self._update_projection(conn, "WorkUnit", wu_id, f"TRANSITION_TO_{new_status.value}", wu_dict)
            return True

        return self._execute_write(_action)

    def renew_lease(self, mission_id: str, wu_id: str, lease_id: str, ttl_seconds: int = 60) -> bool:
        """
        Extends lease TTL and updates last_heartbeat for an active worker.
        """
        def _action(conn: sqlite3.Connection):
            cur = conn.cursor()
            cur.execute("SELECT data FROM work_units WHERE id = ?", (wu_id,))
            row = cur.fetchone()
            if not row:
                return False

            wu = _parse_work_unit(row[0])
            if wu.status != WorkUnitStatus.EXECUTING or wu.execution_lease_id != lease_id:
                return False

            now = datetime.utcnow()
            wu.last_heartbeat = now
            wu.lease_expires_at = now + timedelta(seconds=ttl_seconds)

            wu_dict = _to_dict(wu)
            payload_str = json.dumps(wu_dict, default=str, sort_keys=True)
            prev_hash = self._get_last_hash(conn, mission_id)
            new_hash = self._compute_hash(payload_str, prev_hash)

            conn.execute('''
                INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (mission_id, "WorkUnit", wu_id, "LEASE_RENEWED", payload_str, prev_hash, new_hash))

            self._update_projection(conn, "WorkUnit", wu_id, "LEASE_RENEWED", wu_dict)
            return True

        return self._execute_write(_action)

    def reclaim_expired_leases(self) -> List[str]:
        """
        Reclaims leases whose lease_expires_at is in the past.
        Increments retry count. If retry_count >= 3, escalates to WAITING_HUMAN and suspends downstream dependents.
        """
        def _action(conn: sqlite3.Connection):
            cur = conn.cursor()
            cur.execute("SELECT id, mission_id, data FROM work_units WHERE status = ?", (WorkUnitStatus.EXECUTING.value,))
            rows = cur.fetchall()

            now = datetime.utcnow()
            reclaimed_ids = []

            for wu_id, mission_id, data_str in rows:
                wu = _parse_work_unit(data_str)
                if wu.lease_expires_at and wu.lease_expires_at < now:
                    wu.retry_count += 1
                    staging_path = wu.staging_dir

                    if wu.retry_count >= 3:
                        wu.status = WorkUnitStatus.WAITING_HUMAN
                        wu.execution_lease_id = None
                        wu.lease_expires_at = None
                        event_type = "ESCALATED_TO_HUMAN"
                    else:
                        wu.status = WorkUnitStatus.READY
                        wu.execution_lease_id = None
                        wu.lease_expires_at = None
                        event_type = "LEASE_TIMEOUT"

                    # Quarantine / purge staging directory
                    if staging_path:
                        try:
                            p = Path(staging_path)
                            if p.exists() and p.is_dir():
                                shutil.rmtree(p, ignore_errors=True)
                        except Exception:
                            pass
                        wu.staging_dir = None

                    wu_dict = _to_dict(wu)
                    payload_str = json.dumps(wu_dict, default=str, sort_keys=True)
                    prev_hash = self._get_last_hash(conn, mission_id)
                    new_hash = self._compute_hash(payload_str, prev_hash)

                    conn.execute('''
                        INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (mission_id, "WorkUnit", wu_id, event_type, payload_str, prev_hash, new_hash))

                    self._update_projection(conn, "WorkUnit", wu_id, event_type, wu_dict)

                    # If escalated to WAITING_HUMAN, surgically suspend downstream dependents
                    if wu.status == WorkUnitStatus.WAITING_HUMAN:
                        dependents = self._get_downstream_dependents_conn(conn, mission_id, wu_id)
                        for dep_id in dependents:
                            cur.execute("SELECT data FROM work_units WHERE id = ?", (dep_id,))
                            d_row = cur.fetchone()
                            if d_row:
                                dep_wu = _parse_work_unit(d_row[0])
                                if dep_wu.status in [WorkUnitStatus.READY, WorkUnitStatus.PROPOSED]:
                                    dep_wu.status = WorkUnitStatus.BLOCKED
                                    dep_wu_dict = _to_dict(dep_wu)
                                    d_payload_str = json.dumps(dep_wu_dict, default=str, sort_keys=True)
                                    d_prev_hash = self._get_last_hash(conn, mission_id)
                                    d_new_hash = self._compute_hash(d_payload_str, d_prev_hash)
                                    conn.execute('''
                                        INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                                        VALUES (?, ?, ?, ?, ?, ?, ?)
                                    ''', (mission_id, "WorkUnit", dep_id, "TRANSITION_TO_BLOCKED", d_payload_str, d_prev_hash, d_new_hash))
                                    self._update_projection(conn, "WorkUnit", dep_id, "TRANSITION_TO_BLOCKED", dep_wu_dict)

                    reclaimed_ids.append(wu_id)

            return reclaimed_ids

        return self._execute_write(_action)

    def start_lease_watchdog(self, interval_seconds: float = 10.0):
        """
        Starts the background watchdog sweeper thread.
        """
        if self._watchdog_thread and self._watchdog_thread.is_alive():
            return

        self._watchdog_stop_event.clear()

        def _watchdog_loop():
            while not self._watchdog_stop_event.is_set():
                try:
                    self.reclaim_expired_leases()
                except Exception:
                    pass
                self._watchdog_stop_event.wait(interval_seconds)

        self._watchdog_thread = threading.Thread(target=_watchdog_loop, name="LeaseWatchdogSweeper", daemon=True)
        self._watchdog_thread.start()

    def stop_lease_watchdog(self):
        """
        Stops the background watchdog sweeper.
        """
        self._watchdog_stop_event.set()
        if self._watchdog_thread and self._watchdog_thread.is_alive():
            self._watchdog_thread.join(timeout=2.0)

    def _get_downstream_dependents_conn(self, conn: sqlite3.Connection, mission_id: str, root_wu_id: str) -> List[str]:
        cur = conn.cursor()
        cur.execute("SELECT id, data FROM work_units WHERE mission_id = ?", (mission_id,))
        rows = cur.fetchall()

        # Build adjacency graph: parent -> children
        children_map: Dict[str, List[str]] = {}
        for wu_id, data_str in rows:
            wu = _parse_work_unit(data_str)
            for dep in wu.dependencies:
                children_map.setdefault(dep, []).append(wu_id)

        # BFS downstream
        visited: Set[str] = set()
        queue_list = list(children_map.get(root_wu_id, []))
        for q in queue_list:
            visited.add(q)

        while queue_list:
            curr = queue_list.pop(0)
            for child in children_map.get(curr, []):
                if child not in visited:
                    visited.add(child)
                    queue_list.append(child)

        return list(visited)

    def get_downstream_dependents(self, mission_id: str, root_wu_id: str) -> List[str]:
        with self._get_connection() as conn:
            return self._get_downstream_dependents_conn(conn, mission_id, root_wu_id)

    def apply_human_override(self, mission_id: str, wu_id: str, operator_id: str, resolution: HumanOverrideResolution, justification: str, hmac_signature: str) -> bool:
        """
        Logs an immutable statutory HUMAN_OVERRIDE event and resolves a blocked/waiting work unit.
        Enforces justification length >= 20 characters and valid operator attribution.
        """
        if len(justification.strip()) < 20:
            raise ValueError("Statutory audit compliance requires physical justification of at least 20 characters")
        if not operator_id.strip():
            raise ValueError("Operator ID is required for non-repudiation logging")
        if not hmac_signature.strip():
            raise ValueError("HMAC digital signature is required for statutory non-repudiation")

        def _action(conn: sqlite3.Connection):
            cur = conn.cursor()
            cur.execute("SELECT data FROM work_units WHERE id = ?", (wu_id,))
            row = cur.fetchone()
            if not row:
                return False

            wu = _parse_work_unit(row[0])
            override_payload = HumanOverridePayload(
                operator_id=operator_id,
                resolution=resolution,
                justification=justification,
                hmac_signature=hmac_signature,
                timestamp=datetime.utcnow()
            )

            if resolution == HumanOverrideResolution.RETRY_WITH_NEW_INPUTS:
                wu.status = WorkUnitStatus.READY
                wu.retry_count = 0
                wu.execution_lease_id = None
                wu.lease_expires_at = None
            elif resolution == HumanOverrideResolution.FORCE_VERIFIED:
                wu.status = WorkUnitStatus.VERIFIED
                wu.execution_lease_id = None
                wu.lease_expires_at = None
            elif resolution == HumanOverrideResolution.ABORT_BRANCH:
                wu.status = WorkUnitStatus.FAILED
                wu.execution_lease_id = None
                wu.lease_expires_at = None

            wu_dict = _to_dict(wu)
            override_dict = _to_dict(override_payload)
            payload_dict = {
                "work_unit": wu_dict,
                "override": override_dict
            }
            payload_str = json.dumps(payload_dict, default=str, sort_keys=True)
            prev_hash = self._get_last_hash(conn, mission_id)
            new_hash = self._compute_hash(payload_str, prev_hash)

            conn.execute('''
                INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (mission_id, "WorkUnit", wu_id, "HUMAN_OVERRIDE", payload_str, prev_hash, new_hash))

            self._update_projection(conn, "WorkUnit", wu_id, "HUMAN_OVERRIDE", wu_dict)

            # If resolved to READY or VERIFIED, unblock downstream dependents whose other dependencies are met
            if resolution in [HumanOverrideResolution.RETRY_WITH_NEW_INPUTS, HumanOverrideResolution.FORCE_VERIFIED]:
                dependents = self._get_downstream_dependents_conn(conn, mission_id, wu_id)
                for dep_id in dependents:
                    cur.execute("SELECT data FROM work_units WHERE id = ?", (dep_id,))
                    d_row = cur.fetchone()
                    if d_row:
                        dep_wu = _parse_work_unit(d_row[0])
                        if dep_wu.status == WorkUnitStatus.BLOCKED:
                            dep_wu.status = WorkUnitStatus.READY
                            dep_wu_dict = _to_dict(dep_wu)
                            d_payload_str = json.dumps(dep_wu_dict, default=str, sort_keys=True)
                            d_prev_hash = self._get_last_hash(conn, mission_id)
                            d_new_hash = self._compute_hash(d_payload_str, d_prev_hash)
                            conn.execute('''
                                INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            ''', (mission_id, "WorkUnit", dep_id, "TRANSITION_TO_READY", d_payload_str, d_prev_hash, d_new_hash))
                            self._update_projection(conn, "WorkUnit", dep_id, "TRANSITION_TO_READY", dep_wu_dict)

            return True

        return self._execute_write(_action)

    def verify_integrity_on_boot(self) -> Dict[str, Any]:
        """
        Cold-boot verification:
        1. Validates linear SHA-256 hash continuity from block 0 to tip.
        2. Automatically sweeps orphaned EXECUTING tasks from prior ungraceful shutdown.
        3. If hash mismatch is detected, replays all events to rebuild projection tables.
        """
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, mission_id, payload, previous_hash, hash FROM event_log ORDER BY id ASC")
            rows = cur.fetchall()

            last_hashes: Dict[str, str] = {}
            corrupted = False
            total_events = len(rows)

            for event_id, mission_id, payload, prev_hash, stored_hash in rows:
                expected_prev = last_hashes.get(mission_id)
                if prev_hash != expected_prev:
                    corrupted = True
                    break

                expected_hash = self._compute_hash(payload, prev_hash)
                if stored_hash != expected_hash:
                    corrupted = True
                    break

                last_hashes[mission_id] = stored_hash

            if corrupted:
                # Deterministic projection replay
                conn.execute("DELETE FROM missions")
                conn.execute("DELETE FROM work_units")
                conn.execute("DELETE FROM artifacts")

                cur.execute("SELECT entity_type, entity_id, event_type, payload FROM event_log ORDER BY id ASC")
                for e_type, e_id, e_event, e_payload_str in cur.fetchall():
                    payload_data = json.loads(e_payload_str)
                    # Extract raw model if nested under human override
                    if "work_unit" in payload_data:
                        payload_data = payload_data["work_unit"]
                    self._update_projection(conn, e_type, e_id, e_event, payload_data)
                conn.commit()

            # Sweep orphaned EXECUTING units to READY
            cur.execute("SELECT id, mission_id, data FROM work_units WHERE status = ?", (WorkUnitStatus.EXECUTING.value,))
            orphaned = cur.fetchall()
            reclaimed_count = 0
            for wu_id, mission_id, data_str in orphaned:
                wu = _parse_work_unit(data_str)
                wu.status = WorkUnitStatus.READY
                wu.execution_lease_id = None
                wu.lease_expires_at = None
                wu.staging_dir = None
                
                wu_dict = _to_dict(wu)
                payload_str = json.dumps(wu_dict, default=str, sort_keys=True)
                prev_h = self._get_last_hash(conn, mission_id)
                new_h = self._compute_hash(payload_str, prev_h)

                conn.execute('''
                    INSERT INTO event_log (mission_id, entity_type, entity_id, event_type, payload, previous_hash, hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (mission_id, "WorkUnit", wu_id, "BOOT_RECLAIM_ORPHAN", payload_str, prev_h, new_h))
                self._update_projection(conn, "WorkUnit", wu_id, "BOOT_RECLAIM_ORPHAN", wu_dict)
                reclaimed_count += 1

            conn.commit()

            return {
                "status": "CORRUPTED_REBUILT" if corrupted else "INTACT",
                "total_events": total_events,
                "orphans_reclaimed": reclaimed_count
            }

    def get_ready_units(self, mission_id: str) -> List[WorkUnit]:
        """
        Dual-graph scheduler logic to find WUs ready for execution.
        """
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT data FROM work_units WHERE mission_id = ? AND status = ?", (mission_id, WorkUnitStatus.READY.value))
            rows = cur.fetchall()
            
            ready_wus = []
            for row in rows:
                wu = _parse_work_unit(row[0])
                
                deps_satisfied = True
                for dep_id in wu.dependencies:
                    cur.execute("SELECT status FROM work_units WHERE id = ?", (dep_id,))
                    dep_row = cur.fetchone()
                    if not dep_row or dep_row[0] != WorkUnitStatus.COMMITTED.value:
                        deps_satisfied = False
                        break
                
                if not deps_satisfied:
                    continue
                    
                inputs_satisfied = True
                for art_id in wu.required_inputs:
                    cur.execute("SELECT data FROM artifacts WHERE id = ?", (art_id,))
                    art_row = cur.fetchone()
                    if not art_row:
                        inputs_satisfied = False
                        break
                    art = _parse_artifact(art_row[0])
                    if art.commit_decision != CommitDecision.COMMITTED:
                        inputs_satisfied = False
                        break
                        
                if inputs_satisfied:
                    ready_wus.append(wu)
                    
            return ready_wus

    def close(self):
        """
        Gracefully stops writer actor and watchdog sweeper.
        """
        self.stop_lease_watchdog()
        self._writer_stop_event.set()
        self._write_queue.put(None)
        if self._writer_thread.is_alive():
            self._writer_thread.join(timeout=2.0)
