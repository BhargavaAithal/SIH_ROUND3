import React, { useState } from 'react';

const FILES_DATABASE = {
  'src/physics/corrosion_evaluator.py': {
    id: 'corrosion_evaluator',
    name: 'corrosion_evaluator.py',
    dir: 'src/physics/',
    lang: 'Python 3.11.8',
    status: 'MODIFIED',
    initialCode: `# SMITRACE Physics Engine - API 510 Corrosion Model
# File: src/physics/corrosion_evaluator.py

def calculate_corrosion_rate(t_initial: float, t_current: float, delta_years: float) -> float:
    """
    Calculates annualized corrosion rate (inches/year).
    Statutory standard: API 510 Section 7.1.1
    """
    # BUGGY: Raw subtraction produces negative rates during ultrasonic sensor jitter!
    corrosion_rate = (t_initial - t_current) / delta_years
    return corrosion_rate
`,
    patchedCode: `# SMITRACE Physics Engine - API 510 Corrosion Model
# File: src/physics/corrosion_evaluator.py

def calculate_corrosion_rate(t_initial: float, t_current: float, delta_years: float) -> float:
    """
    Calculates annualized corrosion rate (inches/year).
    Statutory standard: API 510 Section 7.1.1
    """
    if delta_years <= 0:
        raise ValueError("delta_years must be strictly positive (> 0.0)")
    
    raw_rate = (t_initial - t_current) / delta_years
    # API 510 §7.1.1: Physical boundary constraint (rate >= 0.0)
    # Replaces negative measurement jitter with zero wear boundary
    return max(0.0, round(raw_rate, 4))
`
  },
  'tests/test_corrosion_bounds.py': {
    id: 'test_corrosion_bounds',
    name: 'test_corrosion_bounds.py',
    dir: 'tests/',
    lang: 'Python 3.11.8 / Pytest',
    status: 'TEST_SUITE',
    code: `# tests/test_corrosion_bounds.py
# Statutory Verification Suite: API 510 §7.1.1 & ASME B31.3

import pytest
from src.physics.corrosion_evaluator import calculate_corrosion_rate

def test_nominal_thinning():
    # Nominal wear case: 0.280" to 0.260" over 2 years = 0.010 in/yr
    rate = calculate_corrosion_rate(0.280, 0.260, delta_years=2.0)
    assert rate == 0.0100

def test_zero_wear():
    # Steady state: no material loss over 1.5 years
    rate = calculate_corrosion_rate(0.280, 0.280, delta_years=1.5)
    assert rate == 0.0

def test_measurement_noise_physical_bound():
    # Ultrasonic probe jitter: surface oxide causes t_current > t_initial
    # API 510 §7.1.1 mandates rate must never be negative (rate >= 0.0)
    rate = calculate_corrosion_rate(0.250, 0.271, delta_years=2.0)
    assert rate >= 0.0, "Physical violation: Negative corrosion rate detected!"
`
  },
  'src/verification/asme_b31_solver.py': {
    id: 'asme_b31_solver',
    name: 'asme_b31_solver.py',
    dir: 'src/verification/',
    lang: 'Python 3.11.8',
    status: 'VERIFIED',
    code: `# src/verification/asme_b31_solver.py
# ASME B31.3 Section 304.1.2 Minimum Wall Thickness Solver

def calculate_b31_tmin(p_design_psi: float, d_outer_in: float, s_allowable_psi: float, e_weld: float = 1.0, y_coeff: float = 0.4) -> float:
    numerator = p_design_psi * d_outer_in
    denominator = 2.0 * (s_allowable_psi * e_weld + p_design_psi * y_coeff)
    return numerator / denominator
`
  },
  'src/security/ast_guard.py': {
    id: 'ast_guard',
    name: 'ast_guard.py',
    dir: 'src/security/',
    lang: 'Python 3.11.8',
    status: 'VERIFIED',
    code: `# src/security/ast_guard.py
# Antigravity Invariant: AST Security Interceptor for Sandbox Execution

FORBIDDEN_CALLS = {'os.system', 'subprocess.Popen', 'socket.socket', 'urllib.request'}

def assert_ast_safety(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and get_call_name(node) in FORBIDDEN_CALLS:
            raise SecurityViolation(f"Forbidden call detected: {get_call_name(node)}")
`
  },
  'config/sovereign_sandboxes.json': {
    id: 'sovereign_sandboxes',
    name: 'sovereign_sandboxes.json',
    dir: 'config/',
    lang: 'JSON',
    status: 'CONFIG',
    code: `{
  "sandbox_type": "posix_namespace_jail",
  "isolation_layer": "cgroups_v2 + unshare",
  "network_egress": "NONE",
  "memory_limit_mb": 512,
  "cpu_quota_ms": 10000,
  "read_only_rootfs": true,
  "statutory_assurance": "FAIL_CLOSED"
}`
  },
  'docs/api510_clause7_specification.md': {
    id: 'api510_spec',
    name: 'api510_clause7_specification.md',
    dir: 'docs/',
    lang: 'Markdown Spec',
    status: 'SPEC',
    code: `# API 510 §7.1.1 Corrosion Rate Determination
## Statutory Boundary Constraint
Corrosion rates for in-service pressure piping shall be calculated from ultrasonic thickness surveys.
In all evaluations:
1. Annualized rate 'r' shall be non-negative: r >= 0.0 in/year.
2. Apparent negative loss caused by surface oxide or probe jitter shall be bounded to 0.0.
3. Negative values must never be used to project artificial remaining equipment life.`
  }
};

export default function CodebaseScenario({ currentUser, addAuditLog, lastIngestedDoc, onStatusChange }) {
  const [activeFileKey, setActiveFileKey] = useState('src/physics/corrosion_evaluator.py');
  const [testStatus, setTestStatus] = useState('READY'); // 'READY', 'RUNNING', 'FAILED', 'PASSED'
  const [isPatching, setIsPatching] = useState(false);
  const [patchApplied, setPatchApplied] = useState(false);

  React.useEffect(() => {
    if (!onStatusChange) return;
    if (testStatus === 'READY') {
      onStatusChange({
        state: 'STANDBY',
        icon: '▷',
        badgeClass: 'status-degraded',
        detail: 'API 510 REPO LOADED · AWAITING TEST SUITE',
        execution: 'READY TO RUN',
        execIcon: '▷',
        execColor: '#9a671a',
        caseId: 'CASE-2026-API510',
      });
    } else if (testStatus === 'RUNNING') {
      onStatusChange({
        state: 'RUNNING',
        icon: '⚡',
        badgeClass: 'status-running',
        detail: 'EXECUTING PYTEST IN MICRO-SANDBOX...',
        execution: 'SANDBOX ACTIVE',
        execIcon: '⚡',
        execColor: '#2563eb',
        caseId: 'CASE-2026-API510',
      });
    } else if (testStatus === 'PASSED') {
      onStatusChange({
        state: 'PASSED',
        icon: '●',
        badgeClass: 'status-active',
        detail: 'PASSED · ALL API 510 CONSTRAINTS SATISFIED (9/9)',
        execution: 'ACTIVE',
        execIcon: '●',
        execColor: '#1b6a4a',
        caseId: 'CASE-2026-API510',
      });
    } else if (testStatus === 'FAILED') {
      onStatusChange({
        state: 'FAILED',
        icon: '■',
        badgeClass: 'status-blocked',
        detail: 'FAILED · NEGATIVE CORROSION RATE DETECTED',
        execution: 'HALTED',
        execIcon: '■',
        execColor: '#a62a2a',
        caseId: 'CASE-2026-API510',
      });
    }
  }, [testStatus, onStatusChange]);
  
  // AI Engineer Prompt Box State
  const [promptInput, setPromptInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState('READY'); // 'READY', 'ANALYZING', 'GENERATED'
  
  // Editor view modes: 'STANDARD', 'DIFF', 'BEFORE_AFTER_WHY'
  const [editorViewMode, setEditorViewMode] = useState('DIFF');
  
  // AI Engineer tabs: 'DIAGNOSIS', 'EVIDENCE', 'PATCH', 'VERIFICATION'
  const [assistantTab, setAssistantTab] = useState('DIAGNOSIS');
  
  // Bottom execution console drawer state:
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState('OUTPUT'); // 'OUTPUT', 'MATRIX', 'AUDIT'

  // Modals
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deploySuccessId, setDeploySuccessId] = useState(null);

  const activeFileData = FILES_DATABASE[activeFileKey] || FILES_DATABASE['src/physics/corrosion_evaluator.py'];
  const activeCode = activeFileKey === 'src/physics/corrosion_evaluator.py'
    ? (patchApplied ? activeFileData.patchedCode : activeFileData.initialCode)
    : (activeFileData.code || '');

  // Workflow Handlers
  const handlePromptSubmit = (e) => {
    if (e) e.preventDefault();
    const query = promptInput.trim() || 'Find and fix the negative corrosion rate bug in calculate_corrosion_rate';
    
    setIsAnalyzing(true);
    setAnalysisPhase('ANALYZING');
    
    addAuditLog({
      actor: 'USER',
      action: `Submitted request to AI Engineer: "${query.substring(0, 45)}..."`,
      hash: 'ai:prompt:' + Math.random().toString(16).substr(2, 8),
      details: `Target: ${activeFileKey} | Persona: Qwen 2.5 Coder 32B (Offline)`
    });

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisPhase('GENERATED');
      setAssistantTab('PATCH');
      
      addAuditLog({
        actor: 'AGENT',
        action: 'AI Engineer generated surgical remediation patch for API 510 §7.1.1',
        hash: 'patch:gen:0x91d4',
        details: 'Root cause identified: Sensor jitter raw subtraction produces negative corrosion rate.'
      });
    }, 700);
  };

  const handleApplyPatch = () => {
    setIsPatching(true);
    addAuditLog({
      actor: 'USER',
      action: 'Applied surgical patch to src/physics/corrosion_evaluator.py',
      hash: 'git:apply:patch:0x89e2',
      details: 'Lines modified: 6 | Code AST validated by offline security guard'
    });

    setTimeout(() => {
      setPatchApplied(true);
      setIsPatching(false);
      setTestStatus('PASSED');
      setAssistantTab('VERIFICATION');

      addAuditLog({
        actor: 'SANDBOX',
        action: 'All test suite matrix cases passed cleanly (9/9 passing)',
        hash: 'test:passed:0x44a1',
        details: 'Exit Code 0 | Zero regressions | Runtime: 84ms'
      });

      addAuditLog({
        actor: 'PLATFORM',
        action: 'Cryptographic competency verification sealed into vault',
        hash: 'competency:sha256:verified',
        details: `Sealed to identity: ${currentUser.name}`
      });
    }, 600);
  };

  const handleRunSandbox = () => {
    setTestStatus('RUNNING');
    addAuditLog({
      actor: 'USER',
      action: 'Executed test matrix in isolated micro-sandbox',
      hash: 'sandbox:run:' + Math.random().toString(16).substr(2, 8),
      details: 'Target: tests/test_corrosion_bounds.py | Isolation: --network none, 512MB RAM'
    });

    setTimeout(() => {
      if (patchApplied) {
        setTestStatus('PASSED');
        addAuditLog({
          actor: 'SANDBOX',
          action: 'All test cases passed cleanly (9/9 passing)',
          hash: 'test:passed:0x44a1',
          details: 'Exit Code 0 | Zero regressions | Runtime: 84ms'
        });
      } else {
        setTestStatus('FAILED');
        addAuditLog({
          actor: 'SANDBOX',
          action: 'Micro-sandbox returned non-zero exit code: AssertionError',
          hash: 'sandbox:err:0x7b12',
          details: 'AssertionError: Negative corrosion rate (-0.0105 in/yr) violates physical boundary!'
        });
      }
    }, 500);
  };

  const handleReset = () => {
    setPatchApplied(false);
    setTestStatus('READY');
    setAssistantTab('DIAGNOSIS');
    setAnalysisPhase('READY');
    setPromptInput('');
    setDeploySuccessId(null);
    addAuditLog({
      actor: 'USER',
      action: 'Reset codebase workspace to initial state',
      hash: 'git:checkout:clean',
      details: 'Reverted src/physics/corrosion_evaluator.py to initial unpatched commit'
    });
  };

  const handleConfirmDeploy = () => {
    const deployId = `DEPLOY-CAP-2026-API510-${Math.floor(1000 + Math.random() * 9000)}`;
    setDeploySuccessId(deployId);
    addAuditLog({
      actor: 'PLATFORM',
      action: `Deployed verified capability ${deployId} to Sovereign Enclave`,
      hash: 'deploy:sha256:active',
      details: 'Module: calculate_corrosion_rate | Standard: API 510 §7.1.1 | 100% Offline'
    });
  };

  // Primary Action Button text
  let primaryActionLabel = '▶ Run Sandbox Tests';
  let primaryActionHandler = handleRunSandbox;
  let primaryActionClass = 'btn-glass btn-primary-bold';

  if (testStatus === 'RUNNING') {
    primaryActionLabel = '⚙️ Running Sandbox Tests...';
    primaryActionHandler = () => {};
  } else if (isPatching) {
    primaryActionLabel = '⚙️ Applying Patch...';
    primaryActionHandler = () => {};
  } else if (!patchApplied && testStatus === 'FAILED') {
    primaryActionLabel = '⚡ Apply Surgical Patch';
    primaryActionHandler = handleApplyPatch;
    primaryActionClass = 'btn-glass btn-primary-bold';
  } else if (patchApplied && testStatus === 'PASSED') {
    primaryActionLabel = '✓ All 9 Tests Passing';
    primaryActionHandler = handleRunSandbox;
    primaryActionClass = 'btn-glass';
  }

  // Split lines for editor line numbering
  const codeLines = activeCode.split('\n');

  return (
    <div style={styles.container}>
      {/* Live Ingestion Alert Banner */}
      {lastIngestedDoc && (
        <div style={styles.ingestionAlert}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1a1612' }}>
                Live Vault Sync: {lastIngestedDoc.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#685e50' }}>
                Provenance: <code style={{ fontFamily: 'monospace', color: '#8b4513' }}>{lastIngestedDoc.hash.substring(0, 24)}...</code> • Ready for sandbox mounting
              </div>
            </div>
          </div>
          <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
            MANUAL INGESTION
          </span>
        </div>
      )}

      {/* 1. Compact Top Banner */}
      <div style={styles.compactBanner} className="glass-card">
        <div style={styles.bannerLeft}>
          <div style={styles.bannerTitleRow}>
            <span style={styles.brandTitle}>ENGINEERING CODE LAB</span>
            <div style={styles.chipsGroup}>
              <span className="badge badge-cipher">
                SANDBOX: POSIX JAIL
              </span>
              <span className="badge badge-gold">
                AI: QWEN 2.5 CODER
              </span>
              <span className="badge badge-crimson" style={{ padding: '3px 8px' }}>
                NETWORK: NONE
              </span>
            </div>
          </div>
          <p style={styles.bannerSubtext}>
            Runs automated tests on pipe calculation code in a secure offline sandbox to detect and repair bugs.
          </p>
        </div>

        <div style={styles.bannerActions}>
          <button
            onClick={primaryActionHandler}
            disabled={testStatus === 'RUNNING' || isPatching}
            className={primaryActionClass}
            style={styles.primaryActionButton}
          >
            {primaryActionLabel}
          </button>
          
          <button
            onClick={() => setShowDeployModal(true)}
            disabled={!patchApplied || testStatus !== 'PASSED'}
            className={`btn-glass ${patchApplied && testStatus === 'PASSED' ? 'btn-primary-bold' : ''}`}
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            title={patchApplied ? 'Deploy verified capability to enclave runtime' : 'Pass all verification gates first'}
          >
            🚀 Deploy Capability
          </button>

          <button
            onClick={handleReset}
            className="btn-glass"
            style={styles.resetButton}
            title="Reset repository to initial failing commit"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* 2. Main 3-Column IDE Cockpit Layout */}
      <div className="cockpit-layout-3col">
        
        {/* Column 1: Real File Explorer + Sandbox Card */}
        <aside style={styles.leftCol} className="glass-card">
          <div style={styles.explorerHeader}>
            <span style={styles.panelTitleText}>REPOSITORY</span>
            <span className="mono-tag" style={{ fontSize: '0.65rem' }}>GIT: MAIN</span>
          </div>

          {/* Hierarchical File Tree */}
          <div style={styles.treeContainer}>
            {/* src/ */}
            <div style={styles.treeFolder}>
              <span style={styles.folderName}>📁 src/</span>
              
              {/* src/physics/ */}
              <div style={styles.treeSubfolder}>
                <span style={styles.subfolderName}>📁 physics/</span>
                <div
                  onClick={() => setActiveFileKey('src/physics/corrosion_evaluator.py')}
                  style={{
                    ...styles.treeFileItem,
                    ...(activeFileKey === 'src/physics/corrosion_evaluator.py' ? styles.treeFileItemActive : {})
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🐍</span>
                    <span>corrosion_evaluator.py</span>
                  </span>
                  <span style={patchApplied ? styles.statusCheckVerified : styles.statusDotModified} title={patchApplied ? 'Verified' : 'Worktree Modified'}>
                    {patchApplied ? '✓' : '●'}
                  </span>
                </div>
              </div>

              {/* src/verification/ */}
              <div style={styles.treeSubfolder}>
                <span style={styles.subfolderName}>📁 verification/</span>
                <div
                  onClick={() => setActiveFileKey('src/verification/asme_b31_solver.py')}
                  style={{
                    ...styles.treeFileItem,
                    ...(activeFileKey === 'src/verification/asme_b31_solver.py' ? styles.treeFileItemActive : {})
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚙️</span>
                    <span>asme_b31_solver.py</span>
                  </span>
                  <span style={styles.statusCheckVerified} title="Verified">✓</span>
                </div>
              </div>

              {/* src/security/ */}
              <div style={styles.treeSubfolder}>
                <span style={styles.subfolderName}>📁 security/</span>
                <div
                  onClick={() => setActiveFileKey('src/security/ast_guard.py')}
                  style={{
                    ...styles.treeFileItem,
                    ...(activeFileKey === 'src/security/ast_guard.py' ? styles.treeFileItemActive : {})
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔒</span>
                    <span>ast_guard.py</span>
                  </span>
                  <span style={styles.statusCheckVerified} title="Verified">✓</span>
                </div>
              </div>
            </div>

            {/* tests/ */}
            <div style={styles.treeFolder}>
              <span style={styles.folderName}>📁 tests/</span>
              <div
                onClick={() => setActiveFileKey('tests/test_corrosion_bounds.py')}
                style={{
                  ...styles.treeFileItem,
                  ...(activeFileKey === 'tests/test_corrosion_bounds.py' ? styles.treeFileItemActive : {})
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🧪</span>
                  <span>test_corrosion_bounds.py</span>
                </span>
                {testStatus === 'PASSED' ? (
                  <span style={styles.statusCheckVerified} title="All Tests Passed">✓</span>
                ) : (
                  <span style={styles.statusDotFailed} title="Assertion Failure">!</span>
                )}
              </div>
            </div>

            {/* config/ */}
            <div style={styles.treeFolder}>
              <span style={styles.folderName}>📁 config/</span>
              <div
                onClick={() => setActiveFileKey('config/sovereign_sandboxes.json')}
                style={{
                  ...styles.treeFileItem,
                  ...(activeFileKey === 'config/sovereign_sandboxes.json' ? styles.treeFileItemActive : {})
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚙️</span>
                  <span>sovereign_sandboxes.json</span>
                </span>
                <span style={styles.statusCheckVerified} title="Verified">✓</span>
              </div>
            </div>

            {/* docs/ */}
            <div style={styles.treeFolder}>
              <span style={styles.folderName}>📁 docs/</span>
              <div
                onClick={() => setActiveFileKey('docs/api510_clause7_specification.md')}
                style={{
                  ...styles.treeFileItem,
                  ...(activeFileKey === 'docs/api510_clause7_specification.md' ? styles.treeFileItemActive : {})
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📄</span>
                  <span>api510_spec.md</span>
                </span>
                <span style={styles.statusCheckVerified} title="Verified">✓</span>
              </div>
            </div>
          </div>

          {/* Sandbox Info Block */}
          <div style={styles.sandboxSpecCard} className="glass-inset">
            <div style={styles.sandboxSpecTitle}>SANDBOX SPECIFICATION</div>
            <div style={styles.specRow}>
              <span>Type:</span>
              <strong>POSIX Jail</strong>
            </div>
            <div style={styles.specRow}>
              <span>Memory Limit:</span>
              <strong>512 MB</strong>
            </div>
            <div style={styles.specRow}>
              <span>CPU Quota:</span>
              <strong>10,000 ms</strong>
            </div>
            <div style={styles.specRow}>
              <span>WAN Egress:</span>
              <strong style={{ color: '#1b6a4a' }}>BLOCKED (0 pkts)</strong>
            </div>
          </div>
        </aside>

        {/* Column 2: Center Code Editor with Inline Diff & Before/After/Why */}
        <section style={styles.centerCol} className="glass-card">
          <div style={styles.editorHeaderBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>📄</span>
              <span style={{ fontWeight: '800', fontSize: '0.86rem', color: '#1a1612' }}>
                {activeFileData.name}
              </span>
              <span className="mono-tag" style={{ fontSize: '0.68rem' }}>
                {activeFileData.lang}
              </span>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {activeFileKey === 'src/physics/corrosion_evaluator.py' && (
                <div style={styles.viewModeGroup} className="glass-inset">
                  <button
                    onClick={() => setEditorViewMode('STANDARD')}
                    style={{
                      ...styles.viewModeBtn,
                      background: editorViewMode === 'STANDARD' ? '#181512' : 'transparent',
                      color: editorViewMode === 'STANDARD' ? '#ffffff' : '#5c5244',
                    }}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setEditorViewMode('DIFF')}
                    style={{
                      ...styles.viewModeBtn,
                      background: editorViewMode === 'DIFF' ? '#181512' : 'transparent',
                      color: editorViewMode === 'DIFF' ? '#ffffff' : '#5c5244',
                    }}
                  >
                    Inline Diff
                  </button>
                  <button
                    onClick={() => setEditorViewMode('BEFORE_AFTER_WHY')}
                    style={{
                      ...styles.viewModeBtn,
                      background: editorViewMode === 'BEFORE_AFTER_WHY' ? '#181512' : 'transparent',
                      color: editorViewMode === 'BEFORE_AFTER_WHY' ? '#ffffff' : '#5c5244',
                    }}
                  >
                    Before / After / Why
                  </button>
                </div>
              )}

              <span
                className={`badge ${testStatus === 'PASSED' ? 'badge-green' : 'badge-crimson'}`}
                style={{ fontSize: '0.64rem', padding: '2px 7px' }}
              >
                {testStatus === 'PASSED' ? 'VERIFIED ✓' : 'TEST FAILING !'}
              </span>
            </div>
          </div>

          {/* Main Code Editor Window */}
          {editorViewMode === 'BEFORE_AFTER_WHY' && activeFileKey === 'src/physics/corrosion_evaluator.py' ? (
            <div style={styles.beforeAfterWhyContainer} className="glass-inset">
              <div style={styles.bawSection}>
                <div style={{ ...styles.bawHeader, color: '#a62a2a' }}>
                  <span>CURRENT / BEFORE (Buggy Formulation)</span>
                  <span className="badge badge-crimson" style={{ fontSize: '0.6rem' }}>FAILS ON SENSOR JITTER</span>
                </div>
                <pre style={styles.bawCodePreOld}>
{`def calculate_corrosion_rate(t_initial: float, t_current: float, delta_years: float) -> float:
    # BUG: Raw subtraction produces negative rates when t_current > t_initial
    corrosion_rate = (t_initial - t_current) / delta_years
    return corrosion_rate`}
                </pre>
              </div>

              <div style={styles.bawSection}>
                <div style={{ ...styles.bawHeader, color: '#1b6a4a' }}>
                  <span>PROPOSED / AFTER (API 510 §7.1.1 Bounded Formulation)</span>
                  <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>STATUTORY COMPLIANT</span>
                </div>
                <pre style={styles.bawCodePreNew}>
{`def calculate_corrosion_rate(t_initial: float, t_current: float, delta_years: float) -> float:
    if delta_years <= 0:
        raise ValueError("delta_years must be strictly positive (> 0.0)")
    raw_rate = (t_initial - t_current) / delta_years
    # API 510 §7.1.1: Physical boundary constraint (rate >= 0.0)
    return max(0.0, round(raw_rate, 4))`}
                </pre>
              </div>

              <div style={styles.bawWhyBox}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#7a7061', marginBottom: '2px' }}>
                  WHY THIS CHANGE IS REQUIRED:
                </div>
                <p style={{ fontSize: '0.78rem', color: '#2d2721', margin: 0, lineHeight: '1.4' }}>
                  Ultrasonic probe oxide layers cause apparent thickness growth (<code>t_current &gt; t_initial</code>). API 510 mandates non-negative corrosion rates (<code>rate &gt;= 0.0</code>) to prevent mathematical falsification of remaining equipment life.
                </p>
              </div>
            </div>
          ) : (
            <div className="editor-window" style={{ flex: 1 }}>
              {/* Gutter with line numbers */}
              <div className="editor-gutter">
                {codeLines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Code container with surgical highlight or diff formatting */}
              <div className="editor-code-container">
                <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>
                  {codeLines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const isPatchedLine = activeFileKey === 'src/physics/corrosion_evaluator.py' && patchApplied && (lineNum >= 12 && lineNum <= 16);
                    const isFailingLine = activeFileKey === 'src/physics/corrosion_evaluator.py' && !patchApplied && (lineNum >= 10 && lineNum <= 11);
                    
                    let lineClass = '';
                    if (editorViewMode === 'DIFF') {
                      if (isPatchedLine) lineClass = 'editor-line-highlight-add';
                      else if (isFailingLine) lineClass = 'editor-line-highlight-del';
                    }

                    return (
                      <div
                        key={idx}
                        className={lineClass}
                        style={{ whiteSpace: 'pre', display: 'flex', alignItems: 'center' }}
                      >
                        {editorViewMode === 'DIFF' && (
                          <span style={{ width: '18px', color: isPatchedLine ? '#4ade80' : isFailingLine ? '#f87171' : '#7a7061', userSelect: 'none' }}>
                            {isPatchedLine ? '+' : isFailingLine ? '-' : ' '}
                          </span>
                        )}
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </pre>
              </div>
            </div>
          )}
        </section>

        {/* Column 3: AI Engineer Panel (Prompt Box + 4 Tabs + Deploy) */}
        <aside style={styles.rightCol} className="glass-card">
          {/* Header */}
          <div style={styles.assistantHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.64rem', padding: '2px 6px' }}>
                  AI ENGINEER
                </span>
                <span className="mono-tag" style={{ fontSize: '0.64rem' }}>
                  API 510 §7.1.1
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1a1612', marginTop: '4px' }}>
                {testStatus === 'PASSED' ? (
                  <span style={{ color: '#1b6a4a' }}>● REPAIRED & VERIFIED (9/9 TESTS PASS)</span>
                ) : (
                  <span style={{ color: '#a62a2a' }}>● 1 FAILING TEST DETECTED</span>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Input Box */}
          <form onSubmit={handlePromptSubmit} style={styles.promptForm} className="glass-inset">
            <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#7a7061', marginBottom: '4px' }}>
              PROMPT AI ENGINEER:
            </div>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. Find and fix the negative corrosion rate bug..."
              style={styles.promptInput}
              disabled={isAnalyzing}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setPromptInput('Fix negative corrosion rate jitter under sensor noise');
                }}
                style={styles.suggestionPill}
              >
                ⚡ "Fix negative rate jitter"
              </button>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="btn-glass btn-primary-bold"
                style={{ padding: '4px 12px', fontSize: '0.74rem' }}
              >
                {isAnalyzing ? 'Analyzing...' : 'Ask AI →'}
              </button>
            </div>
          </form>

          {/* Epistemic Status Banner */}
          <div style={styles.epistemicBox} className="glass-inset">
            <div style={styles.epistemicItem}>
              <div style={styles.epistemicLabel}>AI CONFIDENCE</div>
              <div style={styles.epistemicValueModel}>
                Confidence 98.4%
              </div>
              <div style={styles.epistemicSubtext}>
                {analysisPhase === 'ANALYZING' ? 'Synthesizing fix...' : 'API 510 Bounded Fix'}
              </div>
            </div>

            <div style={styles.epistemicDivider} />

            <div style={styles.epistemicItem}>
              <div style={styles.epistemicLabel}>AUTOMATED TEST PROOF</div>
              <div style={testStatus === 'PASSED' ? styles.epistemicValueAssurancePass : styles.epistemicValueAssuranceFail}>
                {testStatus === 'PASSED' ? '✓ 9/9 PASSED' : '✕ 1 TEST FAILED'}
              </div>
              <div style={styles.epistemicSubtext}>
                Isolated micro-sandbox
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={styles.assistantTabsBar}>
            <button
              onClick={() => setAssistantTab('DIAGNOSIS')}
              style={{
                ...styles.tabBtn,
                ...(assistantTab === 'DIAGNOSIS' ? styles.tabBtnActive : {})
              }}
            >
              Diagnose
            </button>
            <button
              onClick={() => setAssistantTab('EVIDENCE')}
              style={{
                ...styles.tabBtn,
                ...(assistantTab === 'EVIDENCE' ? styles.tabBtnActive : {})
              }}
            >
              Evidence
            </button>
            <button
              onClick={() => setAssistantTab('PATCH')}
              style={{
                ...styles.tabBtn,
                ...(assistantTab === 'PATCH' ? styles.tabBtnActive : {})
              }}
            >
              Patch
            </button>
            <button
              onClick={() => setAssistantTab('VERIFICATION')}
              style={{
                ...styles.tabBtn,
                ...(assistantTab === 'VERIFICATION' ? styles.tabBtnActive : {})
              }}
            >
              Verify
            </button>
          </div>

          {/* Tab Content Display */}
          <div style={styles.assistantTabContent}>
            
            {/* 1. DIAGNOSIS TAB */}
            {assistantTab === 'DIAGNOSIS' && (
              <div style={styles.tabPane}>
                <div style={styles.sectionHeader}>ROOT CAUSE</div>
                <div style={styles.diagnosisQuoteBox}>
                  <strong>Negative corrosion rate calculated.</strong><br />
                  <code style={styles.formulaInline}>t_current (0.2710 in) &gt; t_initial (0.2500 in)</code><br />
                  Raw subtraction produces negative rate (<code>-0.0105 in/yr</code>) during ultrasonic surface jitter.
                </div>

                <div style={styles.sectionHeader}>STANDARD RULE (API 510 §7.1.1)</div>
                <p style={{ fontSize: '0.78rem', color: '#443c30', lineHeight: '1.45', margin: '4px 0 10px 0' }}>
                  Corrosion rates must be strictly non-negative (<code>rate &gt;= 0.0 in/yr</code>). Surface noise cannot be used to project false equipment life expansion.
                </p>

                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button
                    onClick={() => setAssistantTab('PATCH')}
                    className="btn-glass btn-primary-bold"
                    style={{ flex: 1, fontSize: '0.76rem', padding: '8px 12px' }}
                  >
                    View Patch &rarr;
                  </button>
                  <button
                    onClick={() => setEditorViewMode('BEFORE_AFTER_WHY')}
                    className="btn-glass"
                    style={{ fontSize: '0.76rem', padding: '8px 12px' }}
                  >
                    Explain Why
                  </button>
                </div>
              </div>
            )}

            {/* 2. EVIDENCE TAB */}
            {assistantTab === 'EVIDENCE' && (
              <div style={styles.tabPane}>
                <div style={styles.sectionHeader}>SUPPORTING DATA & READINGS</div>

                <div style={styles.evidenceTable}>
                  <div style={styles.evidenceGroupHeader}>INPUT READINGS</div>
                  <div style={styles.evidenceRow}>
                    <span style={styles.evidenceKey}>t_initial:</span>
                    <span style={styles.evidenceVal}>0.2500 in</span>
                  </div>
                  <div style={styles.evidenceRow}>
                    <span style={styles.evidenceKey}>t_current:</span>
                    <span style={styles.evidenceVal}>0.2710 in</span>
                  </div>
                  <div style={styles.evidenceRow}>
                    <span style={styles.evidenceKey}>Δt:</span>
                    <span style={styles.evidenceVal}>2.0 years</span>
                  </div>

                  <div style={{ ...styles.evidenceGroupHeader, marginTop: '8px' }}>DERIVED VALUE (RAW)</div>
                  <div style={styles.evidenceRow}>
                    <span style={styles.evidenceKey}>raw_rate:</span>
                    <span style={{ ...styles.evidenceVal, color: '#a62a2a', fontWeight: '800' }}>-0.0105 in/year</span>
                  </div>

                  <div style={{ ...styles.evidenceGroupHeader, marginTop: '8px' }}>PHYSICAL CONSTRAINT</div>
                  <div style={styles.evidenceRow}>
                    <span style={styles.evidenceKey}>API 510 bound:</span>
                    <span style={{ ...styles.evidenceVal, color: '#1b6a4a', fontWeight: '800' }}>rate &ge; 0.0</span>
                  </div>

                  <div style={{ ...styles.evidenceGroupHeader, marginTop: '8px' }}>SOURCE FILE</div>
                  <div style={styles.evidenceRow}>
                    <span style={styles.evidenceKey}>inspection_file:</span>
                    <span style={styles.evidenceVal}>CML_UT_Survey_2026.csv</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PATCH TAB */}
            {assistantTab === 'PATCH' && (
              <div style={styles.tabPane}>
                <div style={styles.sectionHeader}>PROPOSED SURGICAL DIFF</div>
                
                <div style={styles.diffContainer}>
                  <div style={{ color: '#f87171' }}>-    corrosion_rate = (t_initial - t_current) / delta_years</div>
                  <div style={{ color: '#f87171' }}>-    return corrosion_rate</div>
                  <div style={{ color: '#4ade80' }}>+    if delta_years &lt;= 0:</div>
                  <div style={{ color: '#4ade80' }}>+        raise ValueError("delta_years must be &gt; 0")</div>
                  <div style={{ color: '#4ade80' }}>+    raw_rate = (t_initial - t_current) / delta_years</div>
                  <div style={{ color: '#4ade80' }}>+    return max(0.0, round(raw_rate, 4))</div>
                </div>

                <div style={{ ...styles.sectionHeader, marginTop: '8px' }}>PATCH REASON</div>
                <p style={{ fontSize: '0.78rem', color: '#443c30', lineHeight: '1.45', margin: '2px 0 10px 0' }}>
                  Enforces lower bound 0.0 with positive delta validation per API 510 §7.1.1.
                </p>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {!patchApplied ? (
                    <button
                      onClick={handleApplyPatch}
                      disabled={isPatching}
                      className="btn-glass btn-primary-bold"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '9px 12px' }}
                    >
                      {isPatching ? 'Applying...' : 'Apply Diff'}
                    </button>
                  ) : (
                    <div style={{ ...styles.appliedBanner, flex: 1 }}>
                      ✓ Diff Applied to Editor
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setEditorViewMode('BEFORE_AFTER_WHY');
                      setAssistantTab('DIAGNOSIS');
                    }}
                    className="btn-glass"
                    style={{ fontSize: '0.8rem', padding: '9px 12px' }}
                  >
                    Explain
                  </button>
                </div>
              </div>
            )}

            {/* 4. VERIFICATION TAB */}
            {assistantTab === 'VERIFICATION' && (
              <div style={styles.tabPane}>
                <div style={styles.sectionHeader}>VERIFICATION GATES CHECKLIST</div>

                <div style={styles.verificationList}>
                  <div style={styles.verificationItem}>
                    <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                    <div>
                      <strong>Security Checks:</strong> 0 forbidden syscalls detected. No network egress.
                    </div>
                  </div>

                  <div style={styles.verificationItem}>
                    <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                    <div>
                      <strong>Syntax Integrity:</strong> Python 3.11 AST clean.
                    </div>
                  </div>

                  <div style={styles.verificationItem}>
                    <span style={{ color: testStatus === 'PASSED' ? '#1b6a4a' : '#a62a2a', fontWeight: '900' }}>
                      {testStatus === 'PASSED' ? '✓' : '✕'}
                    </span>
                    <div>
                      <strong>Test Matrix:</strong> {testStatus === 'PASSED' ? '9/9 passed in 0.09s.' : '1 failed (AssertionError).'}
                    </div>
                  </div>

                  <div style={styles.verificationItem}>
                    <span style={{ color: testStatus === 'PASSED' ? '#1b6a4a' : '#9a671a', fontWeight: '900' }}>
                      {testStatus === 'PASSED' ? '✓' : '○'}
                    </span>
                    <div>
                      <strong>Domain Contract:</strong> Physical boundary constraint envelope satisfied.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => setShowProofModal(true)}
                    className="btn-glass"
                    style={{ width: '100%', fontSize: '0.76rem', padding: '6px 12px' }}
                  >
                    🔍 View Detailed Proof Trace
                  </button>
                </div>
              </div>
            )}

          </div>
        </aside>

      </div>

      {/* 3. Verification Pipeline Strip */}
      <div className="verification-pipeline-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.06em', color: '#7a7061', textTransform: 'uppercase' }}>
            PIPELINE GATES
          </span>
        </div>

        <div className="pipeline-steps-group">
          {/* Step 1: Prompt/Diagnosis */}
          <span className="pipeline-node passed">
            <span>1. DIAGNOSIS</span>
            <strong>✓</strong>
          </span>

          <span className="pipeline-arrow">→</span>

          {/* Step 2: Patch */}
          <span className={`pipeline-node ${patchApplied || analysisPhase === 'GENERATED' ? 'passed' : 'pending'}`}>
            <span>2. PATCH GEN</span>
            <strong>{patchApplied || analysisPhase === 'GENERATED' ? '✓' : '○'}</strong>
          </span>

          <span className="pipeline-arrow">→</span>

          {/* Step 3: Test Matrix */}
          <span className={`pipeline-node ${testStatus === 'PASSED' ? 'passed' : 'failed'}`}>
            <span>3. TESTS ({testStatus === 'PASSED' ? '9/9' : '8/9'})</span>
            <strong>{testStatus === 'PASSED' ? '✓' : '✕'}</strong>
          </span>

          <span className="pipeline-arrow">→</span>

          {/* Step 4: Ready */}
          <span className={`pipeline-node ${patchApplied && testStatus === 'PASSED' ? 'passed' : 'pending'}`}>
            <span>4. READY TO DEPLOY</span>
            <strong>{patchApplied && testStatus === 'PASSED' ? '✓' : '—'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${testStatus === 'PASSED' ? 'badge-green' : testStatus === 'READY' ? 'badge-gold' : 'badge-crimson'}`} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
            {testStatus === 'PASSED' ? 'ALL GATES PASSED (0.0% ERROR)' : testStatus === 'READY' ? 'GATE 3 READY (AWAITING RUN)' : 'GATE 3 FAILED (HUMAN INTERVENTION)'}
          </span>
        </div>
      </div>

      {/* 4. Collapsible Bottom Execution Console Drawer (Terminal / Matrix / Audit) */}
      <div className="console-drawer">
        {/* Console Header Bar */}
        <div className="console-drawer-header" onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`pulse-dot ${testStatus === 'PASSED' ? 'pulse-green' : testStatus === 'READY' ? 'pulse-amber' : 'pulse-amber'}`} />
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#ebdcc3', letterSpacing: '0.04em' }}>
              TRACE & TEST MATRIX CONSOLE
            </span>
            <span className="mono-tag" style={{ fontSize: '0.68rem', background: '#352e25', color: '#ffffff' }}>
              SESSION #24
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setConsoleTab('OUTPUT')}
                className={`console-tab-btn ${consoleTab === 'OUTPUT' ? 'active' : ''}`}
              >
                Terminal Output
              </button>
              <button
                onClick={() => setConsoleTab('MATRIX')}
                className={`console-tab-btn ${consoleTab === 'MATRIX' ? 'active' : ''}`}
              >
                Test Matrix (9 Cases)
              </button>
              <button
                onClick={() => setConsoleTab('AUDIT')}
                className={`console-tab-btn ${consoleTab === 'AUDIT' ? 'active' : ''}`}
              >
                Verification Audit
              </button>
            </div>

            <span className={`badge ${testStatus === 'PASSED' ? 'badge-green' : testStatus === 'READY' ? 'badge-gold' : 'badge-crimson'}`} style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
              {testStatus === 'PASSED' ? '9 PASSED   0 FAILED   0.09s' : testStatus === 'READY' ? '9 CASES STAGED · READY' : '1 FAILED   8 PASSED   0.18s'}
            </span>

            <button
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              style={styles.collapseToggleBtn}
              title={isConsoleOpen ? 'Collapse Console Drawer' : 'Expand Console Drawer'}
            >
              {isConsoleOpen ? '˅' : '˄'}
            </button>
          </div>
        </div>

        {/* Collapsible Console Body */}
        {isConsoleOpen && (
          <div style={styles.consoleBody}>
            {/* Tab 1: Terminal Output */}
            {consoleTab === 'OUTPUT' && (
              <div>
                {testStatus === 'READY' && (
                  <div style={{ color: '#cfc4b2', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <span style={{ color: '#e0a96d' }}>[SANDBOX INITIALIZED]</span> POSIX Micro-sandbox mounted with cgroups_v2.<br />
                    <span style={{ color: '#9ca3af' }}>Target Contract:</span> <span style={{ color: '#ebdcc3' }}>contracts/corrosion_bounds.py</span><br />
                    <span style={{ color: '#9ca3af' }}>Isolation Policy:</span> <span style={{ color: '#4ade80' }}>Network Egress Disabled (--network none)</span><br />
                    <span style={{ color: '#9ca3af' }}>Test Runner:</span> Python 3.11.8 | Pytest 8.1.1-secure<br />
                    <span style={{ color: '#9ca3af' }}>Environment Status:</span> 9 test cases staged and ready for execution.<br /><br />
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>&gt; Click "▶ Run Sandbox Tests" above to execute test suite and trigger gate verification.</span>
                  </div>
                )}
                {testStatus === 'RUNNING' && (
                  <div style={{ color: '#cfc4b2' }}>
                    Mounting POSIX micro-sandbox...<br />
                    Executing pytest tests/test_corrosion_bounds.py (--network none, isolation=cgroups)...
                  </div>
                )}
                {testStatus === 'FAILED' && (
                  <div>
                    <span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_nominal_thinning</span> <span style={{ color: '#4ade80' }}>PASSED</span><br />
                    <span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_zero_wear</span> <span style={{ color: '#4ade80' }}>PASSED</span><br />
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>tests/test_corrosion_bounds.py::test_measurement_noise_physical_bound FAILED</span><br /><br />
                    <span style={{ color: '#f87171' }}>___________________ test_measurement_noise_physical_bound ____________________</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;def test_measurement_noise_physical_bound():<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Ultrasonic sensor jitter: t_current (0.2710") &gt; t_initial (0.2500")<br />
                    &gt;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;rate = calculate_corrosion_rate(0.250, 0.271, delta_years=2.0)<br />
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>E&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AssertionError: Physical violation: Negative corrosion rate (-0.0105 in/yr) detected!</span><br />
                    <span style={{ color: '#f87171' }}>E&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Statutory standard API 510 §7.1.1 mandates that corrosion rate must be &gt;= 0.0.</span><br /><br />
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>=========================== 1 failed, 8 passed in 0.18s ===========================</span>
                  </div>
                )}
                {testStatus === 'PASSED' && (
                  <div>
                    <span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_nominal_thinning</span> <span style={{ color: '#4ade80' }}>PASSED</span><br />
                    <span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_zero_wear</span> <span style={{ color: '#4ade80' }}>PASSED</span><br />
                    <span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_measurement_noise_physical_bound</span> <span style={{ color: '#4ade80' }}>PASSED</span><br /><br />
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>=========================== 9 passed in 0.09s ===========================</span><br />
                    <span style={{ color: '#ebdcc3' }}>✓ API 510 §7.1.1 physical boundary verified. 0 regressions. Exit code 0.</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Test Matrix View */}
            {consoleTab === 'MATRIX' && (
              <div style={styles.matrixContainer}>
                <div style={styles.matrixGroup}>
                  <div style={styles.matrixGroupTitle}>1. PUBLIC SUITE TESTS</div>
                  <div style={styles.matrixRow}>
                    <span>Nominal Wear Test (0.280" to 0.260" over 2.0 yrs)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (0.010 in/yr)'}
                    </span>
                  </div>
                  <div style={styles.matrixRow}>
                    <span>Zero Wear Steady-State (0.280" to 0.280" over 1.5 yrs)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (0.000 in/yr)'}
                    </span>
                  </div>
                  <div style={styles.matrixRow}>
                    <span>Severe Degradation Wear (0.320" to 0.180" over 3.0 yrs)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (0.0467 in/yr)'}
                    </span>
                  </div>
                </div>

                <div style={styles.matrixGroup}>
                  <div style={styles.matrixGroupTitle}>2. EDGE CASES & SENSOR JITTER</div>
                  <div style={styles.matrixRow}>
                    <span>Probe Oxide Jitter (t_current 0.271" &gt; t_initial 0.250")</span>
                    <span style={{ color: testStatus === 'PASSED' ? '#4ade80' : testStatus === 'READY' ? '#e0a96d' : '#f87171' }}>
                      {testStatus === 'PASSED' ? '✓ PASSED (Bounded 0.000)' : testStatus === 'READY' ? '○ STAGED' : '✕ FAILED (-0.0105 in/yr)'}
                    </span>
                  </div>
                  <div style={styles.matrixRow}>
                    <span>Zero Time Delta Rejection (delta_years = 0.0)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (ValueError)'}
                    </span>
                  </div>
                  <div style={styles.matrixRow}>
                    <span>Negative Time Delta Rejection (delta_years = -1.0)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (ValueError)'}
                    </span>
                  </div>
                </div>

                <div style={styles.matrixGroup}>
                  <div style={styles.matrixGroupTitle}>3. ISOLATED SECURITY & SANDBOX CHECKS</div>
                  <div style={styles.matrixRow}>
                    <span>AST Syscall Scan (os.system / socket / subprocess)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (0 violations)'}
                    </span>
                  </div>
                  <div style={styles.matrixRow}>
                    <span>Memory Allocation Quota (&lt; 512 MB RSS)</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (28.4 MB peak)'}
                    </span>
                  </div>
                  <div style={styles.matrixRow}>
                    <span>Network Egress Loopback Boundary</span>
                    <span style={{ color: testStatus === 'READY' ? '#e0a96d' : '#4ade80' }}>
                      {testStatus === 'READY' ? '○ STAGED' : '✓ PASSED (0 WAN packets)'}
                    </span>
                  </div>
                </div>

                <div style={styles.matrixSummaryFooter}>
                  <strong>TEST MATRIX SUMMARY:</strong>{' '}
                  <span style={{ color: testStatus === 'PASSED' ? '#4ade80' : testStatus === 'READY' ? '#e0a96d' : '#f87171', fontWeight: '800' }}>
                    {testStatus === 'PASSED' 
                      ? '9/9 TESTS PASSED (100% RELIABILITY)' 
                      : testStatus === 'READY' 
                        ? '9 CASES LOADED · READY TO EXECUTE' 
                        : '8/9 TESTS PASSED (1 FAILURE BLOCKS DEPLOYMENT)'}
                  </span>
                </div>
              </div>
            )}

            {/* Tab 3: Verification Audit */}
            {consoleTab === 'AUDIT' && (
              <div style={styles.auditContainer}>
                <div style={styles.auditRow}>
                  <span className="badge badge-green">GATE 1</span>
                  <div style={{ flex: 1 }}>
                    <strong>Security Static Analysis:</strong> AST validator verified zero forbidden syscalls.
                  </div>
                  <span style={{ color: '#4ade80' }}>PASSED</span>
                </div>
                <div style={styles.auditRow}>
                  <span className="badge badge-green">GATE 2</span>
                  <div style={{ flex: 1 }}>
                    <strong>Sandbox Isolation:</strong> Linux namespaces active, zero network egress.
                  </div>
                  <span style={{ color: '#4ade80' }}>PASSED</span>
                </div>
                <div style={styles.auditRow}>
                  <span className={`badge ${testStatus === 'PASSED' ? 'badge-green' : testStatus === 'READY' ? 'badge-gold' : 'badge-crimson'}`}>GATE 3</span>
                  <div style={{ flex: 1 }}>
                    <strong>Domain Contract Check:</strong> API 510 §7.1.1 physical non-negative wear bounds.
                  </div>
                  <span style={{ color: testStatus === 'PASSED' ? '#4ade80' : testStatus === 'READY' ? '#d97706' : '#f87171' }}>
                    {testStatus === 'PASSED' ? 'PASSED' : testStatus === 'READY' ? 'AWAITING RUN' : 'FAILED'}
                  </span>
                </div>
                <div style={styles.auditRow}>
                  <span className={`badge ${testStatus === 'PASSED' ? 'badge-green' : 'badge-gold'}`}>GATE 4</span>
                  <div style={{ flex: 1 }}>
                    <strong>Enclave Deployment Authorization:</strong> Cryptographic readiness signoff.
                  </div>
                  <span style={{ color: testStatus === 'PASSED' ? '#4ade80' : '#d97706' }}>
                    {testStatus === 'PASSED' ? 'READY' : 'PENDING GATE 3'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: View Detailed Proof Trace */}
      {showProofModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowProofModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="glass-card">
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔍</span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1a1612' }}>
                  Verification Proof Details
                </h3>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.proofItem}>
                <strong>AST Syscall Validation:</strong>
                <pre style={styles.proofPre}>
{`Checked AST nodes: 42
Forbidden calls scan: ['os.system', 'subprocess.Popen', 'socket.socket'] -> 0 DETECTED
Result: SUCCESS`}
                </pre>
              </div>

              <div style={styles.proofItem}>
                <strong>Domain Contract Model:</strong>
                <pre style={styles.proofPre}>
{`Formula: calculate_corrosion_rate(t_initial, t_current, delta_years)
Constraint: forall t_initial, t_current, delta_years > 0:
            calculate_corrosion_rate(...) >= 0.0
Evaluation: SAT (Satisfied for all real inputs)`}
                </pre>
              </div>

              <div style={styles.proofItem}>
                <strong>Sandbox Runtime Envelope:</strong>
                <pre style={styles.proofPre}>
{`Namespace Isolation: cgroups_v2 + unshare -n -u -i -p
Memory Cap: 512 MB (Peak observed: 28.4 MB)
Network Egress: 0 packets transmitted`}
                </pre>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowProofModal(false)}
                className="btn-glass btn-primary-bold"
                style={{ padding: '8px 20px', fontSize: '0.84rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Deploy Capability Confirmation */}
      {showDeployModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowDeployModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="glass-card">
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1a1612' }}>
                  Deploy Capability to Sovereign Enclave
                </h3>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {!deploySuccessId ? (
                <div>
                  <p style={{ fontSize: '0.84rem', color: '#443c30', marginBottom: '14px' }}>
                    Confirm deployment of the verified calculation module into the active offline engineering enclave:
                  </p>

                  <div style={styles.deploySummaryBox} className="glass-inset">
                    <div style={styles.deploySummaryRow}>
                      <span>Capability Name:</span>
                      <strong>calculate_corrosion_rate</strong>
                    </div>
                    <div style={styles.deploySummaryRow}>
                      <span>Input Parameters:</span>
                      <code>t_initial: float, t_current: float, delta_years: float</code>
                    </div>
                    <div style={styles.deploySummaryRow}>
                      <span>Return Type:</span>
                      <code>float (in/year, bounded &gt;= 0.0)</code>
                    </div>
                    <div style={styles.deploySummaryRow}>
                      <span>Standard Reference:</span>
                      <strong>API 510 §7.1.1 & ASME B31.3</strong>
                    </div>
                    <div style={styles.deploySummaryRow}>
                      <span>Sandbox Envelope:</span>
                      <strong>POSIX Jail (512 MB, 0 Egress)</strong>
                    </div>
                    <div style={styles.deploySummaryRow}>
                      <span>Test Matrix:</span>
                      <strong style={{ color: '#1b6a4a' }}>9/9 Passed (100%)</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.deploySuccessState}>
                  <span style={{ fontSize: '2.4rem' }}>✅</span>
                  <h4 style={{ fontSize: '1.1rem', color: '#145339', margin: '8px 0 4px 0' }}>
                    Capability Deployed Successfully!
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#443c30', marginBottom: '10px' }}>
                    Sealed into sovereign execution pool with verified cryptographic provenance.
                  </p>
                  <div className="mono-tag" style={{ fontSize: '0.84rem', padding: '6px 14px', background: '#ffffff', color: '#1a1612' }}>
                    ID: {deploySuccessId}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              {!deploySuccessId ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowDeployModal(false)}
                    className="btn-glass"
                    style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeploy}
                    className="btn-glass btn-primary-bold"
                    style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                  >
                    Confirm & Deploy
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeployModal(false)}
                  className="btn-glass btn-primary-bold"
                  style={{ padding: '8px 22px', fontSize: '0.84rem' }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '28px',
  },
  ingestionAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderRadius: '10px',
    background: 'rgba(255, 252, 240, 0.95)',
    border: '1px solid var(--accent-gold)',
    boxShadow: '0 4px 14px rgba(154, 103, 26, 0.1)',
    flexWrap: 'wrap',
    gap: '10px',
  },

  // 1. Compact Banner
  compactBanner: {
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 253, 248, 0.92)',
    flexWrap: 'wrap',
    gap: '14px',
  },
  bannerLeft: {
    flex: 1,
    minWidth: '320px',
  },
  bannerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    fontWeight: '800',
    color: '#1a1612',
    letterSpacing: '-0.01em',
  },
  chipsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  bannerSubtext: {
    fontSize: '0.8rem',
    color: '#5c5244',
    margin: 0,
    lineHeight: '1.3',
  },
  bannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryActionButton: {
    padding: '8px 18px',
    fontSize: '0.84rem',
    cursor: 'pointer',
  },
  resetButton: {
    padding: '8px 14px',
    fontSize: '0.8rem',
  },

  // Column 1: Left File Explorer
  leftCol: {
    padding: '14px',
    background: 'rgba(252, 249, 243, 0.88)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '14px',
  },
  explorerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--glass-border)',
  },
  panelTitleText: {
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: '#7a7061',
  },
  treeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
  },
  treeFolder: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  folderName: {
    fontSize: '0.74rem',
    fontWeight: '800',
    color: '#4a4135',
  },
  treeSubfolder: {
    paddingLeft: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginTop: '2px',
  },
  subfolderName: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#6e6252',
  },
  treeFileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.74rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  treeFileItemActive: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid var(--accent-gold)',
    color: '#1a1612',
    fontWeight: '700',
    boxShadow: 'var(--glass-shadow-sm)',
  },
  statusDotModified: {
    color: '#9a671a',
    fontSize: '0.85rem',
  },
  statusCheckVerified: {
    color: '#1b6a4a',
    fontWeight: '900',
    fontSize: '0.78rem',
  },
  statusDotFailed: {
    color: '#a62a2a',
    fontWeight: '900',
    fontSize: '0.85rem',
  },
  sandboxSpecCard: {
    padding: '10px 12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sandboxSpecTitle: {
    fontSize: '0.64rem',
    fontWeight: '800',
    letterSpacing: '0.06em',
    color: '#7a7061',
    marginBottom: '2px',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.68rem',
    color: '#554d42',
  },

  // Column 2: Center Editor
  centerCol: {
    padding: '16px',
    background: 'rgba(255, 253, 248, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  editorHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--glass-border)',
  },
  viewModeGroup: {
    display: 'flex',
    padding: '2px',
    borderRadius: '6px',
    gap: '2px',
  },
  viewModeBtn: {
    border: 'none',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.68rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  beforeAfterWhyContainer: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '440px',
    overflowY: 'auto',
  },
  bawSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  bawHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.04em',
  },
  bawCodePreOld: {
    margin: 0,
    padding: '10px 12px',
    background: '#241a1a',
    color: '#fca5a5',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.74rem',
    lineHeight: '1.45',
    border: '1px solid rgba(166, 42, 42, 0.4)',
  },
  bawCodePreNew: {
    margin: 0,
    padding: '10px 12px',
    background: '#15241b',
    color: '#86efac',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.74rem',
    lineHeight: '1.45',
    border: '1px solid rgba(27, 106, 74, 0.4)',
  },
  bawWhyBox: {
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
  },

  // Column 3: Right AI Engineer Panel
  rightCol: {
    padding: '16px',
    background: 'rgba(255, 253, 248, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  assistantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--glass-border)',
  },
  promptForm: {
    padding: '10px 12px',
    borderRadius: '8px',
  },
  promptInput: {
    width: '100%',
    padding: '7px 10px',
    fontSize: '0.78rem',
    fontFamily: 'var(--font-body)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    background: '#ffffff',
    outline: 'none',
  },
  suggestionPill: {
    border: 'none',
    background: 'transparent',
    color: 'var(--accent-gold)',
    fontSize: '0.68rem',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '2px 0',
  },

  // Epistemic Status Banner
  epistemicBox: {
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  epistemicItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  epistemicDivider: {
    width: '1px',
    height: '36px',
    background: 'rgba(200, 185, 160, 0.45)',
  },
  epistemicLabel: {
    fontSize: '0.62rem',
    fontWeight: '800',
    letterSpacing: '0.04em',
    color: '#7a7061',
    textTransform: 'uppercase',
  },
  epistemicValueModel: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#9a671a',
  },
  epistemicValueAssurancePass: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#1b6a4a',
  },
  epistemicValueAssuranceFail: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#a62a2a',
  },
  epistemicSubtext: {
    fontSize: '0.62rem',
    color: '#7a7061',
  },

  // Assistant Tabs
  assistantTabsBar: {
    display: 'flex',
    borderRadius: '8px',
    background: 'rgba(235, 226, 210, 0.4)',
    padding: '3px',
    gap: '3px',
  },
  tabBtn: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '5px 4px',
    borderRadius: '6px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#6e6252',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    background: '#ffffff',
    color: '#181512',
    boxShadow: 'var(--glass-shadow-sm)',
  },
  assistantTabContent: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '280px',
  },
  tabPane: {
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.15s ease-out',
  },
  sectionHeader: {
    fontSize: '0.66rem',
    fontWeight: '800',
    letterSpacing: '0.06em',
    color: '#7a7061',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  diagnosisQuoteBox: {
    padding: '10px 12px',
    background: 'rgba(166, 42, 42, 0.08)',
    border: '1px solid rgba(166, 42, 42, 0.3)',
    borderRadius: '6px',
    fontSize: '0.76rem',
    color: '#2a1a1a',
    lineHeight: '1.4',
    marginBottom: '10px',
  },
  formulaInline: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    background: '#ffffff',
    padding: '1px 5px',
    borderRadius: '4px',
    color: '#8b4513',
  },
  appliedBanner: {
    padding: '8px 12px',
    background: 'rgba(27, 106, 74, 0.1)',
    border: '1px solid rgba(27, 106, 74, 0.4)',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: '700',
    color: '#145339',
    textAlign: 'center',
  },

  // Evidence Tab
  evidenceTable: {
    padding: '10px 12px',
    background: 'rgba(245, 238, 226, 0.6)',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.74rem',
  },
  evidenceGroupHeader: {
    fontSize: '0.64rem',
    fontWeight: '800',
    letterSpacing: '0.06em',
    color: '#7a7061',
    marginBottom: '3px',
  },
  evidenceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  evidenceKey: {
    color: '#6e6252',
  },
  evidenceVal: {
    fontWeight: '700',
    color: '#1a1612',
  },

  // Patch Tab
  diffContainer: {
    padding: '10px 12px',
    background: '#1a1815',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    lineHeight: '1.45',
    overflowX: 'auto',
    border: '1px solid #3d352b',
    marginBottom: '8px',
  },

  // Verification Tab
  verificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  verificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '0.74rem',
    color: '#383025',
    lineHeight: '1.35',
  },

  // Console Styles
  collapseToggleBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ebdcc3',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '800',
  },
  consoleBody: {
    padding: '14px 18px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.76rem',
    lineHeight: '1.5',
    color: '#ebdcc3',
    maxHeight: '220px',
    overflowY: 'auto',
    animation: 'fadeIn 0.2s ease-out',
  },

  // Test Matrix
  matrixContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  matrixGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  matrixGroupTitle: {
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#e0a96d',
    borderBottom: '1px solid #332d25',
    paddingBottom: '2px',
  },
  matrixRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.74rem',
    color: '#cfc4b2',
  },
  matrixSummaryFooter: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid #443c32',
    fontSize: '0.76rem',
  },

  // Audit Tab in Console
  auditContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  auditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.76rem',
    color: '#cfc4b2',
  },

  // Modals
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(25, 20, 15, 0.45)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '560px',
    background: 'rgba(255, 253, 248, 0.98)',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 20px 50px rgba(35, 25, 15, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--glass-border)',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    color: '#7a7061',
  },
  modalBody: {
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  proofItem: {
    fontSize: '0.78rem',
    color: '#2d2721',
  },
  proofPre: {
    margin: '4px 0 0 0',
    padding: '8px 10px',
    background: '#1a1815',
    color: '#4ade80',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    lineHeight: '1.4',
  },
  deploySummaryBox: {
    padding: '12px 14px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  deploySummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.76rem',
    color: '#2d2721',
  },
  deploySuccessState: {
    textAlign: 'center',
    padding: '16px 0',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '12px',
    borderTop: '1px solid var(--glass-border)',
  }
};
