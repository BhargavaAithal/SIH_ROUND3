from enum import Enum
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

# --- Enumerations ---

class MissionStatus(str, Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    WAITING_HUMAN = "WAITING_HUMAN"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class WorkUnitStatus(str, Enum):
    PROPOSED = "PROPOSED"
    READY = "READY"
    EXECUTING = "EXECUTING"
    EXECUTED = "EXECUTED"
    VERIFIED = "VERIFIED"
    COMMITTED = "COMMITTED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    INVALIDATED = "INVALIDATED"
    WAITING_HUMAN = "WAITING_HUMAN"

class ArtifactStatus(str, Enum):
    PROPOSED = "PROPOSED"
    VERIFIED = "VERIFIED"
    COMMITTED = "COMMITTED"
    INVALIDATED = "INVALIDATED"

class VerificationResult(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PENDING = "PENDING"

class PolicyResult(str, Enum):
    PERMITTED = "PERMITTED"
    VIOLATION = "VIOLATION"
    PENDING = "PENDING"

class AuthorizationResult(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PENDING = "PENDING"

class CommitDecision(str, Enum):
    COMMITTED = "COMMITTED"
    REJECTED = "REJECTED"
    PENDING = "PENDING"

class HumanOverrideResolution(str, Enum):
    RETRY_WITH_NEW_INPUTS = "RETRY_WITH_NEW_INPUTS"
    FORCE_VERIFIED = "FORCE_VERIFIED"
    ABORT_BRANCH = "ABORT_BRANCH"

# --- Models ---

class MissionBudget(BaseModel):
    max_work_units: int = 50
    max_graph_versions: int = 10
    max_replans: int = 5
    max_tokens: int = 200000
    max_compute_time_seconds: int = 3600
    max_wall_time_seconds: int = 86400
    max_human_escalations: int = 3
    max_cost_dollars: float = 10.0

class Artifact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    data_payload: Dict[str, Any]
    schema_version: str = "1.0"
    producer_wu_id: Optional[str] = None
    extraction_quality: float = 0.0
    model_quality: float = 0.0
    verification_quality: float = 0.0
    
    # Orthogonal Trust Vectors
    verification_result: VerificationResult = VerificationResult.PENDING
    policy_result: PolicyResult = PolicyResult.PENDING
    authorization_result: AuthorizationResult = AuthorizationResult.PENDING
    commit_decision: CommitDecision = CommitDecision.PENDING
    
    hash: str = "" # SHA-256 of data + parent_artifact_ids
    supersedes: Optional[str] = None
    reproducibility: Dict[str, Any] = Field(default_factory=dict)
    invariants: List[str] = Field(default_factory=list)

class WorkUnit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mission_id: str
    objective: str
    executor: str
    required_inputs: List[str] = Field(default_factory=list) # Artifact IDs
    produced_outputs: List[str] = Field(default_factory=list) # Artifact IDs
    dependencies: List[str] = Field(default_factory=list) # WU IDs
    status: WorkUnitStatus = WorkUnitStatus.PROPOSED
    preconditions: List[str] = Field(default_factory=list)
    postconditions: List[str] = Field(default_factory=list)
    execution_lease_id: Optional[str] = None
    lease_expires_at: Optional[datetime] = None
    last_heartbeat: Optional[datetime] = None
    retry_count: int = 0
    staging_dir: Optional[str] = None
    failure_signatures: List[str] = Field(default_factory=list)

class HumanOverridePayload(BaseModel):
    operator_id: str
    resolution: HumanOverrideResolution
    justification: str
    hmac_signature: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Workstream(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mission_id: str
    name: str
    work_units: List[WorkUnit] = Field(default_factory=list)

class MissionDAG(BaseModel):
    version: int
    work_units: List[WorkUnit] = Field(default_factory=list)
    edges: List[Dict[str, str]] = Field(default_factory=list) # from_id -> to_id
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Mission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    objective: str
    status: MissionStatus = MissionStatus.PLANNING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    operator_id: str
    workstreams: List[Workstream] = Field(default_factory=list)
    checkpoint_version: int = 0
    budget: MissionBudget = Field(default_factory=MissionBudget)
    invariants: List[str] = Field(default_factory=list)
    graph_versions: List[MissionDAG] = Field(default_factory=list)
