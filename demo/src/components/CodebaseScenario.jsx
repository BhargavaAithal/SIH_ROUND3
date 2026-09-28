import React, { useState, useRef, useCallback, useEffect } from 'react';
import WorkspaceModal, { PRESET_WORKSPACES } from './WorkspaceModal';
import OfflineSkillsModal, { INITIAL_SKILLS } from './OfflineSkillsModal';
import BackgroundAgentsDeck, { INITIAL_SUBAGENTS } from './BackgroundAgentsDeck';

const FILES_DATABASE = {
  'src/physics/corrosion_evaluator.py': {
    id: 'corrosion_evaluator',
    name: 'corrosion_evaluator.py',
    dir: 'src/physics/',
    lang: 'Python 3.11.8',
    version: 'v1.7.2',
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
    version: 'v1.2.0',
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
    version: 'v1.4.0',
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
    version: 'v1.3.2',
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
    version: 'v2.1',
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
    version: 'v1.0',
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

  // Progressive test execution & delay state
  const [testProgress, setTestProgress] = useState(0);
  const [testStage, setTestStage] = useState('');
  const [testLiveLogs, setTestLiveLogs] = useState([]);
  const [hasRunTests, setHasRunTests] = useState(false);
  const [patchProgress, setPatchProgress] = useState(0);
  const [patchStage, setPatchStage] = useState('');

  // Official deliverable reports generation state (matching Shiva persona)
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);
  const [generatingStage, setGeneratingStage] = useState('');
  const [hasGeneratedReports, setHasGeneratedReports] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState('docx');
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    if (!onStatusChange) return;

    if (testStatus === 'RUNNING') {
      onStatusChange({
        state: 'RUNNING',
        icon: '⚡',
        badgeClass: 'status-running',
        detail: `${testStage || 'EXECUTING PYTEST IN MICRO-SANDBOX...'} (${testProgress}%)`,
        execution: 'SANDBOX ACTIVE',
        execIcon: '⚡',
        execColor: '#2563eb',
        caseId: 'CASE-2026-API510',
      });
      return;
    }

    if (isGeneratingReports) {
      onStatusChange({
        state: 'RUNNING',
        icon: '📄',
        badgeClass: 'status-running',
        detail: generatingStage || 'COMPILING STATUTORY CAPABILITY REPORTS...',
        execution: 'GENERATING',
        execIcon: '📄',
        execColor: '#1b6a4a',
        caseId: 'CASE-2026-API510',
      });
      return;
    }

    if (testStatus === 'READY') {
      onStatusChange({
        state: 'STANDBY',
        icon: '▷',
        badgeClass: 'status-degraded',
        detail: patchApplied 
          ? 'PATCH APPLIED · READY FOR VERIFICATION SUITE' 
          : 'API 510 REPO LOADED · AWAITING TEST SUITE',
        execution: 'READY TO RUN',
        execIcon: '▷',
        execColor: '#9a671a',
        caseId: 'CASE-2026-API510',
      });
      return;
    }

    if (testStatus === 'PASSED') {
      onStatusChange({
        state: 'PASSED',
        icon: '●',
        badgeClass: 'status-active',
        detail: `PASSED · ALL API 510 CONSTRAINTS SATISFIED (9/9)${hasGeneratedReports ? ' · REPORTS SEALED' : ''}`,
        execution: 'ACTIVE',
        execIcon: '●',
        execColor: '#1b6a4a',
        caseId: 'CASE-2026-API510',
      });
      return;
    }

    if (testStatus === 'FAILED') {
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
      return;
    }
  }, [testStatus, testStage, testProgress, isGeneratingReports, generatingStage, hasGeneratedReports, patchApplied, onStatusChange]);
  
  // AI Engineer Prompt Box State
  const [promptInput, setPromptInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState('READY'); // 'READY', 'ANALYZING', 'GENERATED'
  
  // Editor view modes: 'STANDARD', 'DIFF', 'BEFORE_AFTER_WHY', 'EDIT'
  const [editorViewMode, setEditorViewMode] = useState('DIFF');
  
  // AI Engineer tabs: 'DIAGNOSIS', 'EVIDENCE', 'PATCH', 'VERIFICATION', 'ASK'
  const [assistantTab, setAssistantTab] = useState('DIAGNOSIS');

  // Interactive Sovereign AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-init',
      sender: 'ai',
      text: 'Sovereign AI Engineer initialized in-enclave (Laya-14B). I have full context of corrosion_evaluator.py, AST invariants, and API 510 §7.1.1 constraints. How can I assist you with this codebase?',
      timestamp: '16:12'
    }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleSendChatMessage = (text) => {
    if (!text || !text.trim()) return;
    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAiThinking(true);

    if (addAuditLog) {
      addAuditLog({
        actor: 'USER',
        action: `Queried Sovereign AI Specialist: "${text.substring(0, 45)}${text.length > 45 ? '...' : ''}"`,
        hash: 'query:ai:' + Math.random().toString(16).substring(2, 8),
        details: 'Model: Laya-14B | In-Enclave Inference | 0 WAN'
      });
    }

    setTimeout(() => {
      setIsAiThinking(false);
      const query = text.toLowerCase();
      let replyText = '';
      let actionObj = null;

      if (query.includes('fail') || query.includes('noise') || query.includes('jitter') || query.includes('error')) {
        replyText = `The test test_measurement_noise_physical_bound fails because ultrasonic probe surface oxidation causes apparent thickness growth (t_current = 0.271" vs t_initial = 0.250").\n\nThe unpatched code computes: (0.250 - 0.271) / 2.0 = -0.0105 in/yr. In physical reality, pipe material never spontaneously regenerates. API 510 §7.1.1 prohibits negative rates.`;
        actionObj = {
          label: 'Review Proposed Diff ➔',
          onClick: () => {
            setAssistantTab('PATCH');
            setEditorViewMode('DIFF');
          }
        };
      } else if (query.includes('api 510') || query.includes('statutory') || query.includes('standard') || query.includes('bound')) {
        replyText = `Under API 510 Section 7.1.1 ("Corrosion Rate Determination"), remaining equipment life must be calculated using actual non-negative metal loss rates.\n\nWhen ultrasonic measurement variance yields negative rate values, statutory regulations mandate clamping to a zero wear rate (rate >= 0.0) to prevent false assurance of vessel longevity.`;
      } else if (query.includes('ast') || query.includes('guard') || query.includes('security') || query.includes('safe')) {
        replyText = `The AST Security Guard intercepts all forbidden syscalls (e.g. os.system, subprocess.Popen, socket.socket, urllib.request).\n\nExecution occurs strictly in a zero-network POSIX cgroups micro-sandbox with a 512MB RAM cap and read-only rootfs. 0 outbound WAN bytes are guaranteed.`;
      } else if (query.includes('patch') || query.includes('fix') || query.includes('how to')) {
        replyText = `The surgical patch wraps raw corrosion calculation with two statutory safeguards:\n1. Strict validation: delta_years must be > 0.0\n2. Zero-wear clamp: max(0.0, round(raw_rate, 4))\n\nThis completely satisfies API 510 while maintaining 100% compatibility.`;
        actionObj = {
          label: 'Apply Patch ➔',
          onClick: () => {
            setAssistantTab('PATCH');
            handleApplyPatch();
          }
        };
      } else if (query.includes('test') || query.includes('verify') || query.includes('sandbox')) {
        replyText = `The PyTest suite runs 9 test cases in the POSIX jail covering nominal thinning, steady state, and probe noise.\n\nRunning the sandbox will verify the 9/9 pass matrix and satisfy Gate 3.`;
        actionObj = {
          label: 'Run Sandbox ➔',
          onClick: () => {
            handleRunSandbox();
          }
        };
      } else {
        replyText = `Analyzed your query: "${text}".\n\nThe active file src/physics/corrosion_evaluator.py has an unhandled physical edge case in calculate_corrosion_rate. We can review the proposed surgical patch or run background verification subagents.`;
        actionObj = {
          label: 'View Patch ➔',
          onClick: () => setAssistantTab('PATCH')
        };
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: replyText,
          action: actionObj,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 450);
  };

  // Repository tabs: 'EXPLORER', 'CHANGES', 'HISTORY', 'SKILLS'
  const [repoTab, setRepoTab] = useState('EXPLORER');

  // VS Code File Tree Expansion State
  const [openFolders, setOpenFolders] = useState({
    'root': true,
    'src': true,
    'src/physics': true,
    'src/verification': true,
    'src/security': true,
    'tests': true,
    'config': true,
    'docs': true,
    'custom': true
  });

  const toggleFolder = (folderKey) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  const isAllExpanded = Object.values(openFolders).every(Boolean);
  const toggleAllFolders = () => {
    const nextState = !isAllExpanded;
    setOpenFolders({
      'root': nextState,
      'src': nextState,
      'src/physics': nextState,
      'src/verification': nextState,
      'src/security': nextState,
      'tests': nextState,
      'config': nextState,
      'docs': nextState,
      'custom': nextState
    });
  };
  
  // Bottom execution console drawer state:
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);
  const [consoleTab, setConsoleTab] = useState('OUTPUT'); // 'OUTPUT', 'MATRIX', 'AUDIT'

  // Modals
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [deploySuccessId, setDeploySuccessId] = useState(null);

  // Sovereign Workspace & Offline Extensions Substrate
  const [currentWorkspace, setCurrentWorkspace] = useState(PRESET_WORKSPACES[0]);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  // Background Multi-Agent Fleet State
  const [subagents, setSubagents] = useState(INITIAL_SUBAGENTS);
  const [isAgentsDeckExpanded, setIsAgentsDeckExpanded] = useState(false);

  // Interactive Code Authoring Buffer State
  const [fileBuffers, setFileBuffers] = useState(() => {
    const initial = {};
    Object.keys(FILES_DATABASE).forEach(k => {
      initial[k] = {
        code: FILES_DATABASE[k].initialCode || FILES_DATABASE[k].code || '',
        isDirty: false,
        lastSavedAt: null
      };
    });
    return initial;
  });

  const [customFiles, setCustomFiles] = useState([]);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Resizable Panel State (percentage of container width)
  const [panelWidths, setPanelWidths] = useState({ left: 22, right: 28 });
  const layoutRef = useRef(null);
  const dragRef = useRef({ active: null, startX: 0, startLeft: 0, startRight: 0 });

  const handleDragStart = useCallback((e, handle) => {
    e.preventDefault();
    dragRef.current = {
      active: handle,
      startX: e.clientX,
      startLeft: panelWidths.left,
      startRight: panelWidths.right,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidths]);

  useEffect(() => {
    const handleDragMove = (e) => {
      const drag = dragRef.current;
      if (!drag.active || !layoutRef.current) return;
      const containerWidth = layoutRef.current.offsetWidth;
      const deltaPercent = ((e.clientX - drag.startX) / containerWidth) * 100;

      if (drag.active === 'left') {
        const newLeft = Math.max(12, Math.min(35, drag.startLeft + deltaPercent));
        setPanelWidths(prev => ({ ...prev, left: newLeft }));
      } else if (drag.active === 'right') {
        const newRight = Math.max(18, Math.min(45, drag.startRight - deltaPercent));
        setPanelWidths(prev => ({ ...prev, right: newRight }));
      }
    };

    const handleDragEnd = () => {
      dragRef.current.active = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  const activeFileData = FILES_DATABASE[activeFileKey] || 
    customFiles.find(f => f.id === activeFileKey || f.name === activeFileKey) || 
    FILES_DATABASE['src/physics/corrosion_evaluator.py'];

  const currentBuffer = fileBuffers[activeFileKey] || { code: activeFileData.code || '', isDirty: false };
  const activeCode = currentBuffer.code;
  const isBufferDirty = !!currentBuffer.isDirty;

  const handleCodeChange = (newCode) => {
    setFileBuffers(prev => ({
      ...prev,
      [activeFileKey]: {
        code: newCode,
        isDirty: true,
        lastSavedAt: prev[activeFileKey]?.lastSavedAt || null
      }
    }));
  };

  const handleSaveCode = () => {
    const buf = fileBuffers[activeFileKey];
    if (!buf) return;
    setFileBuffers(prev => ({
      ...prev,
      [activeFileKey]: {
        ...prev[activeFileKey],
        isDirty: false,
        lastSavedAt: new Date().toLocaleTimeString()
      }
    }));

    if (activeFileKey === 'src/physics/corrosion_evaluator.py') {
      const code = buf.code || '';
      if (code.includes('max(0.0') || code.includes('round(') || code.includes('if delta_years')) {
        setPatchApplied(true);
      }
    }

    addAuditLog({
      actor: 'USER',
      action: `Saved interactive code changes to ${activeFileKey}`,
      hash: 'file:save:' + Math.random().toString(16).substr(2, 8),
      details: `Workspace: ${currentWorkspace.name} | Lines: ${activeCode.split('\n').length} | AST Validated`
    });
  };

  const handleRevertCode = () => {
    const orig = FILES_DATABASE[activeFileKey]?.initialCode || FILES_DATABASE[activeFileKey]?.code || '';
    setFileBuffers(prev => ({
      ...prev,
      [activeFileKey]: {
        code: orig,
        isDirty: false,
        lastSavedAt: null
      }
    }));
    if (activeFileKey === 'src/physics/corrosion_evaluator.py') {
      setPatchApplied(false);
    }
  };

  const handleMergeAgentPatch = (patch) => {
    setFileBuffers(prev => ({
      ...prev,
      [patch.targetFile]: {
        code: patch.code,
        isDirty: false,
        lastSavedAt: new Date().toLocaleTimeString()
      }
    }));
    setActiveFileKey(patch.targetFile);
    setPatchApplied(true);
    setEditorViewMode('DIFF');
    addAuditLog({
      actor: 'SUBAGENT',
      action: `Merged differential patch from subagent into ${patch.targetFile}`,
      hash: 'subagent:merge:' + Math.random().toString(16).substr(2, 8),
      details: patch.diffSummary
    });
  };

  const handleCreateNewFile = (e) => {
    if (e) e.preventDefault();
    if (!newFileName.trim()) return;
    let path = newFileName.trim();
    if (!path.includes('/')) path = 'src/physics/' + path;
    const name = path.split('/').pop();
    const newEntry = {
      id: path,
      name,
      dir: path.substring(0, path.lastIndexOf('/') + 1),
      lang: path.endsWith('.py') ? 'Python 3.11.8' : 'Text',
      version: 'v1.0.0',
      status: 'USER_CREATED',
      code: `# File: ${path}\n# Created in workspace: ${currentWorkspace.name}\n\ndef main():\n    pass\n`
    };
    setCustomFiles(prev => [...prev, newEntry]);
    setFileBuffers(prev => ({
      ...prev,
      [path]: {
        code: newEntry.code,
        isDirty: false,
        lastSavedAt: new Date().toLocaleTimeString()
      }
    }));
    setActiveFileKey(path);
    setEditorViewMode('EDIT');
    setShowNewFileModal(false);
    setNewFileName('');
    addAuditLog({
      actor: 'USER',
      action: `Created new file in workspace: ${path}`,
      hash: 'fs:newfile:' + Math.random().toString(16).substr(2, 8),
      details: `Scoped within root: ${currentWorkspace.path}`
    });
  };

  const getProblemsInfo = () => {
    if (activeFileKey === 'src/physics/corrosion_evaluator.py') {
      const code = fileBuffers[activeFileKey]?.code || activeCode;
      if (code.includes('corrosion_rate = (t_initial - t_current) / delta_years') && !code.includes('max(0.0')) {
        return { count: 1, message: 'API 510 §7.1.1: Missing non-negative boundary constraint' };
      }
    }
    return { count: 0, message: null };
  };

  const problemsInfo = getProblemsInfo();

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
    setPatchProgress(20);
    setPatchStage('Parsing AST & isolating calculate_corrosion_rate in src/physics/...');

    addAuditLog({
      actor: 'USER',
      action: 'Initiated surgical patch for src/physics/corrosion_evaluator.py',
      hash: 'git:apply:patch:init',
      details: 'Remediation: Enforce API 510 §7.1.1 non-negative bound on ultrasonic jitter.'
    });

    setTimeout(() => {
      setPatchProgress(60);
      setPatchStage('Injecting API 510 §7.1.1 bounded constraint: max(0.0, round(raw_rate, 4))...');
    }, 450);

    setTimeout(() => {
      setPatchProgress(90);
      setPatchStage('Validating AST syntax integrity against sovereign sandbox policies...');
    }, 900);

    setTimeout(() => {
      setPatchApplied(true);
      setIsPatching(false);
      setFileBuffers(prev => ({
        ...prev,
        'src/physics/corrosion_evaluator.py': {
          code: FILES_DATABASE['src/physics/corrosion_evaluator.py'].patchedCode,
          isDirty: false,
          lastSavedAt: new Date().toLocaleTimeString()
        }
      }));
      setPatchStage('');
      setPatchProgress(100);
      setTestStatus('READY');
      setHasGeneratedReports(false);
      setAssistantTab('PATCH');

      addAuditLog({
        actor: 'USER',
        action: 'Applied surgical patch to src/physics/corrosion_evaluator.py',
        hash: 'git:apply:patch:0x89e2',
        details: 'Lines modified: 6 | Code AST validated by offline security guard'
      });
    }, 1350);
  };

  const handleRunSandbox = () => {
    setTestStatus('RUNNING');
    setHasRunTests(true);
    setHasGeneratedReports(false);
    setTestProgress(18);
    setTestStage('Mounting POSIX micro-sandbox (cgroups v2, no-network jail)...');
    setTestLiveLogs([
      `[0.00s] [SANDBOX] Initializing POSIX namespace jail with cgroups_v2...`,
      `[0.05s] [ISOLATION] Enforcing security envelope: --network none, 512MB RAM cap`
    ]);

    addAuditLog({
      actor: 'USER',
      action: 'Executed test matrix in isolated micro-sandbox',
      hash: 'sandbox:run:' + Math.random().toString(16).substr(2, 8),
      details: 'Target: tests/test_corrosion_bounds.py | Isolation: --network none, 512MB RAM'
    });

    // Stage 2: 550ms
    setTimeout(() => {
      setTestProgress(48);
      setTestStage('Scanning AST security interceptor for forbidden syscalls (0 detected)...');
      setTestLiveLogs(prev => [
        ...prev,
        `[0.55s] [AST-GUARD] Inspected 42 syntax nodes in src/physics/corrosion_evaluator.py`,
        `[0.58s] [AST-GUARD] Forbidden calls scan: os.system=0, socket=0, popen=0 -> CLEAN ✓`
      ]);
    }, 550);

    // Stage 3: 1100ms
    setTimeout(() => {
      setTestProgress(76);
      setTestStage('Executing pytest test matrix in isolated runtime (9 statutory cases)...');
      setTestLiveLogs(prev => [
        ...prev,
        `[1.10s] [PYTEST] Spawning pytest 8.1.1 on tests/test_corrosion_bounds.py...`,
        `[1.15s] [RUNNER] Executing suite: 3 nominal cases, 3 boundary cases, 3 security invariants`
      ]);
    }, 1100);

    // Stage 4: 1650ms
    setTimeout(() => {
      setTestProgress(92);
      setTestStage('Validating API 510 §7.1.1 physical boundary compliance & zero jitter...');
      setTestLiveLogs(prev => [
        ...prev,
        `[1.65s] [CONTRACT] Validating API 510 §7.1.1 statutory invariant: rate >= 0.0 in/yr`
      ]);
    }, 1650);

    // Stage 5: 2150ms Completion
    setTimeout(() => {
      setTestProgress(100);
      setTestStage('');

      const hasValidBoundaryClamp = 
        patchApplied || 
        (activeFileKey === 'src/physics/corrosion_evaluator.py' && (
          (fileBuffers['src/physics/corrosion_evaluator.py']?.code || '').includes('max(0.0') ||
          (fileBuffers['src/physics/corrosion_evaluator.py']?.code || '').includes('if delta_years')
        ));

      if (hasValidBoundaryClamp) {
        setTestStatus('PASSED');
        setAssistantTab('VERIFICATION');
        setTestLiveLogs(prev => [
          ...prev,
          `[2.10s] [VERIFIED] All 9 test cases passed cleanly. Exit code 0.`,
          `[2.15s] [LEDGER] Competency signature verified and sealed to ${currentUser.name}`
        ]);
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
      } else {
        setTestStatus('FAILED');
        setAssistantTab('DIAGNOSIS');
        setTestLiveLogs(prev => [
          ...prev,
          `[2.10s] [FAILURE] test_measurement_noise_physical_bound FAILED: AssertionError`,
          `[2.15s] [ERROR] Raw rate -0.0105 in/yr violates API 510 §7.1.1 non-negative bound.`
        ]);
        addAuditLog({
          actor: 'SANDBOX',
          action: 'Micro-sandbox returned non-zero exit code: AssertionError',
          hash: 'sandbox:err:0x7b12',
          details: 'AssertionError: Negative corrosion rate (-0.0105 in/yr) violates physical boundary!'
        });
      }
    }, 2150);
  };

  const handleGenerateReports = () => {
    setIsGeneratingReports(true);
    setGeneratingStage('1/3 Structuring API 510 statutory compliance memorandum...');

    addAuditLog({
      actor: 'PLATFORM',
      action: 'Initiated official capability deliverable compilation for API 510 Suite',
      hash: 'report:compile:init:' + Math.random().toString(16).substr(2, 8),
      details: 'Structuring Statutory Capability Note (.docx) and Test Matrix Audit Workbook (.xlsx)'
    });

    setTimeout(() => {
      setGeneratingStage('2/3 Compiling .docx Approval Note & .xlsx test matrix spreadsheet...');
    }, 550);

    setTimeout(() => {
      setGeneratingStage(`3/3 Counter-signing deliverables with ${currentUser.name}'s Ed25519 key...`);
    }, 1100);

    setTimeout(() => {
      setIsGeneratingReports(false);
      setHasGeneratedReports(true);
      setShowReportsModal(true);
      setGeneratingStage('');
      addAuditLog({
        actor: 'PLATFORM',
        action: 'Cryptographically counter-signed official safety deliverables (.docx & .xlsx)',
        hash: 'ed25519:sign:' + (currentUser.keyFingerprint ? currentUser.keyFingerprint.substring(0, 20) : '0x94b3c8f1'),
        details: 'Capability deliverable package sealed into sovereign vault. Ref: CAP-API510-2026'
      });
    }, 1700);
  };

  const handleSimulateDownload = (type) => {
    setIsExporting(true);
    addAuditLog({
      actor: 'USER',
      action: `Exported deliverable file: API510_Capability_Verification_Audit.${type}`,
      hash: 'export:sha256:' + Math.random().toString(16).substr(2, 12),
      details: `Format: ${type.toUpperCase()} | Cryptographically counter-signed | Local storage save only.`
    });
    setTimeout(() => {
      setIsExporting(false);
      const element = document.createElement('a');
      const file = new Blob([
        type === 'docx' 
          ? `OFFICIAL TECHNICAL MEMORANDUM\nREFINERIES ENCLAVE - API 510 VERIFICATION\nStatus: PASSED (9/9 Tests)\nSigner: ${currentUser.name}\nKey: ${currentUser.keyFingerprint}`
          : `Test Case,Component,Standard,Result,Status,Runtime\nNominal Wear,Corrosion Model,API 510 §7.1.1,0.010 in/yr,PASS,12ms\nZero Wear,Corrosion Model,API 510 §7.1.1,0.000 in/yr,PASS,9ms\nProbe Jitter Bound,Corrosion Model,API 510 §7.1.1,0.000 in/yr,PASS,14ms\nDelta Zero Rejection,Corrosion Model,API 510 §7.1.1,ValueError,PASS,8ms\nDelta Negative Rejection,Corrosion Model,API 510 §7.1.1,ValueError,PASS,8ms\nAST Syscall Scan,Security Guard,Enclave Sandbox,0 Violations,PASS,22ms\nMemory Allocation,Cgroups v2,Enclave Sandbox,28.4MB,PASS,11ms\nNetwork Egress,Loopback Boundary,Enclave Sandbox,0 Packets,PASS,0ms`
      ], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `API510_Capability_Verification_Audit.${type}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 600);
  };

  const handleReset = () => {
    setPatchApplied(false);
    setTestStatus('READY');
    setTestProgress(0);
    setTestStage('');
    setTestLiveLogs([]);
    setHasRunTests(false);
    setIsGeneratingReports(false);
    setHasGeneratedReports(false);
    setAssistantTab('DIAGNOSIS');
    setAnalysisPhase('READY');
    setPromptInput('');
    setDeploySuccessId(null);
    setRepoTab('EXPLORER');
    setEditorViewMode('DIFF');
    setFileBuffers(prev => ({
      ...prev,
      'src/physics/corrosion_evaluator.py': {
        code: FILES_DATABASE['src/physics/corrosion_evaluator.py'].initialCode,
        isDirty: false,
        lastSavedAt: null
      }
    }));
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

  // Primary Action Button text (Following Strict State Machine)
  let primaryActionLabel = '▶ Run Sandbox';
  let primaryActionHandler = handleRunSandbox;
  let primaryActionClass = 'btn-glass btn-primary-bold';

  if (testStatus === 'RUNNING') {
    primaryActionLabel = (
      <span>⚙️ [{testProgress}%] {testStage || 'Running Tests in Sandbox...'}</span>
    );
    primaryActionHandler = () => {};
  } else if (isPatching) {
    primaryActionLabel = (
      <span>⚙️ [{patchProgress}%] {patchStage || 'Applying Patch...'}</span>
    );
    primaryActionHandler = () => {};
  } else if (!patchApplied && testStatus === 'FAILED') {
    if (assistantTab === 'DIAGNOSIS') {
      primaryActionLabel = '⚡ Review Diff';
      primaryActionHandler = () => {
        setAssistantTab('PATCH');
        setEditorViewMode('DIFF');
      };
      primaryActionClass = 'btn-glass btn-primary-bold';
    } else {
      primaryActionLabel = '⚡ Apply Patch';
      primaryActionHandler = handleApplyPatch;
      primaryActionClass = 'btn-glass btn-primary-bold';
    }
  } else if (patchApplied && testStatus !== 'PASSED') {
    primaryActionLabel = '⚡ Verify Patch';
    primaryActionHandler = handleRunSandbox;
    primaryActionClass = 'btn-glass btn-primary-bold';
  } else if (patchApplied && testStatus === 'PASSED') {
    primaryActionLabel = '🚀 Deploy Capability';
    primaryActionHandler = () => setShowDeployModal(true);
    primaryActionClass = 'btn-glass btn-primary-bold';
  }

  // Split lines for editor line numbering
  const codeLines = activeCode.split('\n');

  // VS Code File Tree Icons & Helpers
  const PythonIcon = () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7.9 1C5.2 1 4.5 2.1 4.5 3.3v1.4h3.6v.5H3.3C2 5.2 1 6.1 1 8.2c0 2.2 1 3 2.3 3h1.2v-1.4c0-1.3.8-2.5 2.4-2.5h3.6V5.4c0-1.8-1.5-2.9-3.4-2.9h.8zm-1.1 1.1a.7.7 0 110 1.4.7.7 0 010-1.4z" fill="#387eb8"/>
      <path d="M8.1 15c2.7 0 3.4-1.1 3.4-2.3v-1.4H7.9v-.5h4.8c1.3 0 2.3-.9 2.3-3 0-2.2-1-3-2.3-3h-1.2v1.4c0 1.3-.8 2.5-2.4 2.5H5.6v1.9c0 1.8 1.5 2.9 3.4 2.9h-.9zm1.1-1.1a.7.7 0 110-1.4.7.7 0 010 1.4z" fill="#f59e0b"/>
    </svg>
  );

  const MarkdownIcon = () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="#64748b" style={{ flexShrink: 0 }}>
      <path d="M1 3.5A1.5 1.5 0 012.5 2h11A1.5 1.5 0 0115 3.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9zM3 10V6h1.5l1.5 2 1.5-2H9v4H7.5V7.8L6 9.8 4.5 7.8V10H3zm8.5-4h-1.2v2.5H9L11 11l2-2.5h-1.3V6z"/>
    </svg>
  );

  const renderFolderItem = (folderKey, folderName, depth = 0, count = null) => {
    const isOpen = !!openFolders[folderKey];
    return (
      <div
        key={folderKey}
        onClick={() => toggleFolder(folderKey)}
        className="tree-folder-row"
        style={{
          paddingLeft: `${depth * 14 + 6}px`,
        }}
        title={`${folderName}/ (click to ${isOpen ? 'collapse' : 'expand'})`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            fontSize: '0.55rem', 
            color: '#8c7e6c', 
            display: 'inline-flex', 
            alignItems: 'center',
            justifyContent: 'center',
            width: '10px', 
            transform: isOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.12s ease'
          }}>
            ▶
          </span>
          <span style={{ fontSize: '0.82rem', lineHeight: 1 }}>{isOpen ? '📂' : '📁'}</span>
          <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: '#4a4033' }}>
            {folderName}
          </span>
        </div>
        {count && (
          <span style={{ fontSize: '0.62rem', color: '#9a8f7e', paddingRight: '4px' }}>
            {count}
          </span>
        )}
      </div>
    );
  };

  const renderFileItem = (fileKey, fileName, icon, statusBadge, depth = 1) => {
    const isActive = activeFileKey === fileKey;
    const isModified = fileKey === 'src/physics/corrosion_evaluator.py' ? !patchApplied || patchApplied : false;
    return (
      <div
        key={fileKey}
        onClick={() => setActiveFileKey(fileKey)}
        className={`tree-row ${isActive ? 'active' : ''}`}
        style={{
          paddingLeft: `${depth * 14 + 18}px`,
        }}
        title={`${fileKey} · Click to edit in Code Lab`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', flexShrink: 0 }}>
            {icon}
          </span>
          <span 
            style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: isActive 
                ? '#1a1612' 
                : (fileKey === 'src/physics/corrosion_evaluator.py' && (!patchApplied || patchApplied))
                  ? '#b45309' 
                  : '#3d352b'
            }}
          >
            {fileName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, paddingRight: '4px' }}>
          {statusBadge}
        </div>
      </div>
    );
  };

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

      {/* 1. Operational Top Bar */}
      <div style={styles.compactBanner} className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.96rem', fontWeight: '800', color: '#1a1612', letterSpacing: '-0.01em' }}>
              ENGINEERING CODE LAB
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: '#8c7e6c', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              CASE / PSU-2026-0017 / {activeFileData.name}
            </span>
          </div>

          <div style={styles.chipsGroup}>
            <span className="badge badge-cipher" style={{ padding: '2px 6px', fontSize: '0.62rem' }}>
              POSIX JAIL
            </span>
            <span className="badge badge-crimson" style={{ padding: '2px 6px', fontSize: '0.62rem' }}>
              0 WAN
            </span>
            <span className="badge badge-gold" style={{ padding: '2px 6px', fontSize: '0.62rem' }}>
              QWEN 2.5
            </span>
          </div>
        </div>

        <div style={styles.bannerActions}>
          <button
            onClick={primaryActionHandler}
            disabled={testStatus === 'RUNNING' || isPatching}
            className={primaryActionClass}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            {primaryActionLabel}
          </button>
          
          {patchApplied && testStatus === 'PASSED' && (
            <>
              <button
                onClick={() => {
                  if (!hasGeneratedReports) {
                    handleGenerateReports();
                  } else {
                    setShowReportsModal(true);
                  }
                }}
                disabled={isGeneratingReports}
                className="btn-glass"
                style={{ padding: '6px 11px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Official capability deliverable reports (.docx & .xlsx)"
              >
                <span>📄</span>
                <span>{isGeneratingReports ? 'Compiling...' : hasGeneratedReports ? 'Official Reports' : 'Generate Reports'}</span>
              </button>
              <button
                onClick={handleRunSandbox}
                disabled={testStatus === 'RUNNING'}
                className="btn-glass"
                style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                title="Re-run sandbox test suite"
              >
                ↻ Re-run
              </button>
            </>
          )}

          <button
            onClick={handleReset}
            className="btn-glass"
            style={{ padding: '6px 10px', fontSize: '0.74rem' }}
            title="Reset repository to initial failing commit"
          >
            ↺ Reset
          </button>
        </div>

        {/* Real-time Progressive Delay Banner / Progress Bar */}
        {(testStatus === 'RUNNING' || isPatching) && (
          <div style={{
            width: '100%',
            padding: '3px 8px',
            borderRadius: '4px',
            background: 'rgba(28, 24, 20, 0.04)',
            border: '1px solid rgba(180, 160, 130, 0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', fontSize: '0.66rem' }}>
              <span style={{ fontWeight: '700', color: '#1a1612' }}>
                {testStatus === 'RUNNING' ? (testStage || 'Running tests...') : (patchStage || 'Patching...')}
              </span>
              <span className="mono-tag" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                {testStatus === 'RUNNING' ? `${testProgress}%` : `${patchProgress}%`}
              </span>
            </div>
            <div style={{ height: '3px', background: 'rgba(45, 36, 25, 0.12)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${testStatus === 'RUNNING' ? testProgress : patchProgress}%`,
                background: testStatus === 'RUNNING' ? 'linear-gradient(90deg, #181512, #9a671a)' : 'linear-gradient(90deg, #181512, #1b6a4a)',
                transition: 'width 0.35s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* 2. Main 3-Column Coordinated Workspaces Layout */}
      <div className="cockpit-layout-3col" ref={layoutRef}>
        
        {/* Column 1: Repository Explorer + Changes + History + Sandbox Card */}
        <aside style={{ ...styles.leftCol, width: `${panelWidths.left}%`, minWidth: '220px', flexShrink: 0 }} className="glass-card">
          <div style={styles.explorerHeader}>
            {/* Workspace Selector Bar */}
            <div 
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '6px',
                border: '1px solid rgba(195,182,160,0.5)',
                marginBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onClick={() => setIsWorkspaceModalOpen(true)}
              title="Click to specify or switch workspace root"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.82rem' }}>📁</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1a1612', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {currentWorkspace.name}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8b4513', fontFamily: 'var(--font-mono)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {currentWorkspace.path}
                  </div>
                </div>
              </div>
              <span className="mono-tag" style={{ fontSize: '0.58rem', padding: '1px 5px', flexShrink: 0 }}>
                Switch ⌄
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={styles.panelTitleText}>REPOSITORY</span>
              <span className="mono-tag" style={{ fontSize: '0.62rem', padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {patchApplied ? '⎇ main • 1 change' : '⎇ main • clean'}
              </span>
            </div>

            <div style={styles.repoNavTabs}>
              <button
                onClick={() => setRepoTab('EXPLORER')}
                style={{
                  ...styles.repoNavBtn,
                  color: repoTab === 'EXPLORER' ? '#1a1612' : '#7a7061',
                  borderBottom: repoTab === 'EXPLORER' ? '2px solid #1a1612' : '2px solid transparent',
                  fontWeight: repoTab === 'EXPLORER' ? '800' : '600'
                }}
              >
                EXPLORER
              </button>
              <button
                onClick={() => setRepoTab('CHANGES')}
                style={{
                  ...styles.repoNavBtn,
                  color: repoTab === 'CHANGES' ? '#1a1612' : '#7a7061',
                  borderBottom: repoTab === 'CHANGES' ? '2px solid #1a1612' : '2px solid transparent',
                  fontWeight: repoTab === 'CHANGES' ? '800' : '600'
                }}
              >
                CHANGES <span style={{ fontSize: '0.6rem', background: '#e2dac9', padding: '1px 5px', borderRadius: '4px' }}>1</span>
              </button>
              <button
                onClick={() => setRepoTab('HISTORY')}
                style={{
                  ...styles.repoNavBtn,
                  color: repoTab === 'HISTORY' ? '#1a1612' : '#7a7061',
                  borderBottom: repoTab === 'HISTORY' ? '2px solid #1a1612' : '2px solid transparent',
                  fontWeight: repoTab === 'HISTORY' ? '800' : '600'
                }}
              >
                HISTORY
              </button>
              <button
                onClick={() => setRepoTab('SKILLS')}
                style={{
                  ...styles.repoNavBtn,
                  color: repoTab === 'SKILLS' ? '#1a1612' : '#7a7061',
                  borderBottom: repoTab === 'SKILLS' ? '2px solid #1a1612' : '2px solid transparent',
                  fontWeight: repoTab === 'SKILLS' ? '800' : '600'
                }}
              >
                SKILLS <span style={{ fontSize: '0.6rem', background: '#e2dac9', padding: '1px 5px', borderRadius: '4px' }}>{skills.filter(s => s.installed && s.enabled).length}</span>
              </button>
            </div>
          </div>

          {/* Explorer Tab View (VS Code / Modern IDE Interface) */}
          {repoTab === 'EXPLORER' && (
            <div style={styles.treeContainer}>
              {/* VS Code Workspace Section Header */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '3px 6px',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  color: '#655a4b',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                  borderBottom: '1px solid rgba(195,182,160,0.35)',
                  marginBottom: '4px'
                }}
              >
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                  onClick={() => toggleFolder('root')}
                >
                  <span style={{ 
                    fontSize: '0.55rem', 
                    color: '#8c7e6c',
                    display: 'inline-block',
                    transform: openFolders['root'] ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.12s ease'
                  }}>
                    ▶
                  </span>
                  <span>{currentWorkspace.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowNewFileModal(true); }}
                    className="tree-action-btn"
                    title="New File"
                  >
                    +
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleAllFolders(); }}
                    className="tree-action-btn"
                    title={isAllExpanded ? "Collapse All Folders" : "Expand All Folders"}
                  >
                    {isAllExpanded ? '⤹⤸' : '⤥⤦'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsWorkspaceModalOpen(true); }}
                    className="tree-action-btn"
                    title="Switch Workspace"
                  >
                    📁
                  </button>
                </div>
              </div>

              {openFolders['root'] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {/* src/ */}
                  {renderFolderItem('src', 'src', 0, '3')}
                  {openFolders['src'] && (
                    <div className="tree-indent-guide">
                      {/* src/physics/ */}
                      {renderFolderItem('src/physics', 'physics', 0, '1')}
                      {openFolders['src/physics'] && (
                        <div className="tree-indent-guide">
                          {renderFileItem(
                            'src/physics/corrosion_evaluator.py',
                            'corrosion_evaluator.py',
                            <PythonIcon />,
                            patchApplied && testStatus === 'PASSED' ? (
                              <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.72rem' }} title="Verified Invariant">✓</span>
                            ) : (
                              <span 
                                style={{ 
                                  color: '#b45309', 
                                  fontWeight: '800', 
                                  fontSize: '0.66rem', 
                                  background: 'rgba(180, 83, 9, 0.14)', 
                                  padding: '0 4px', 
                                  borderRadius: '3px' 
                                }} 
                                title={patchApplied ? "Patched · Ready for test suite" : "Modified Working Copy"}
                              >
                                M
                              </span>
                            ),
                            0
                          )}
                        </div>
                      )}

                      {/* src/verification/ */}
                      {renderFolderItem('src/verification', 'verification', 0, '1')}
                      {openFolders['src/verification'] && (
                        <div className="tree-indent-guide">
                          {renderFileItem(
                            'src/verification/asme_b31_solver.py',
                            'asme_b31_solver.py',
                            <PythonIcon />,
                            <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.72rem' }} title="Verified">✓</span>,
                            0
                          )}
                        </div>
                      )}

                      {/* src/security/ */}
                      {renderFolderItem('src/security', 'security', 0, '1')}
                      {openFolders['src/security'] && (
                        <div className="tree-indent-guide">
                          {renderFileItem(
                            'src/security/ast_guard.py',
                            'ast_guard.py',
                            <PythonIcon />,
                            <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.72rem' }} title="Enclave Invariant">✓</span>,
                            0
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* tests/ */}
                  {renderFolderItem('tests', 'tests', 0, '1')}
                  {openFolders['tests'] && (
                    <div className="tree-indent-guide">
                      {renderFileItem(
                        'tests/test_corrosion_bounds.py',
                        'test_corrosion_bounds.py',
                        <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>🧪</span>,
                        testStatus === 'PASSED' ? (
                          <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.72rem' }} title="All 9 Tests Passed">✓</span>
                        ) : testStatus === 'FAILED' ? (
                          <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '0.72rem' }} title="Assertion Failure on Noise Jitter">⚠</span>
                        ) : (
                          <span style={{ color: '#8c7e6c', fontSize: '0.72rem' }} title="Ready">○</span>
                        ),
                        0
                      )}
                    </div>
                  )}

                  {/* config/ */}
                  {renderFolderItem('config', 'config', 0, '1')}
                  {openFolders['config'] && (
                    <div className="tree-indent-guide">
                      {renderFileItem(
                        'config/sovereign_sandboxes.json',
                        'sovereign_sandboxes.json',
                        <span style={{ color: '#d97706', fontSize: '0.68rem', fontWeight: '800', fontFamily: 'monospace' }}>{`{ }`}</span>,
                        <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.72rem' }} title="Verified Config">✓</span>,
                        0
                      )}
                    </div>
                  )}

                  {/* docs/ */}
                  {renderFolderItem('docs', 'docs', 0, '1')}
                  {openFolders['docs'] && (
                    <div className="tree-indent-guide">
                      {renderFileItem(
                        'docs/api510_clause7_specification.md',
                        'api510_spec.md',
                        <MarkdownIcon />,
                        <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.72rem' }} title="Specification">✓</span>,
                        0
                      )}
                    </div>
                  )}

                  {/* custom/ */}
                  {customFiles.length > 0 && (
                    <>
                      {renderFolderItem('custom', 'custom', 0, `${customFiles.length}`)}
                      {openFolders['custom'] && (
                        <div className="tree-indent-guide">
                          {customFiles.map(cf =>
                            renderFileItem(
                              cf.id,
                              cf.name,
                              <span>📝</span>,
                              <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '0.64rem', background: 'rgba(22, 163, 74, 0.12)', padding: '0 4px', borderRadius: '3px' }}>U</span>,
                              0
                            )
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* + New File button */}
              <button
                onClick={() => setShowNewFileModal(true)}
                className="btn-glass"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.72rem', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                title="Create a new code file in this workspace"
              >
                <span>+</span>
                <span>New File</span>
              </button>
            </div>
          )}

          {/* Changes View */}
          {repoTab === 'CHANGES' && (
            <div style={{ padding: '8px 0', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ fontWeight: '800', color: '#1a1612', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>CHANGESET CS-00918</span>
                <span className="mono-tag" style={{ fontSize: '0.62rem' }}>{patchApplied ? 'APPLIED' : 'REVIEW'}</span>
              </div>
              <div
                onClick={() => { setActiveFileKey('src/physics/corrosion_evaluator.py'); setEditorViewMode('DIFF'); }}
                style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#1a1612', fontSize: '0.76rem' }}>M corrosion_evaluator.py</strong>
                  <span style={{ fontSize: '0.7rem', color: '#1b6a4a', fontWeight: 'bold' }}>+6 / -2</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#685e50', marginTop: '3px' }}>
                  {patchApplied ? 'Applied to working copy' : 'AI-generated · Waiting for review'}
                </div>
              </div>
              <div
                onClick={() => { setActiveFileKey('tests/test_corrosion_bounds.py'); }}
                style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#1a1612', fontSize: '0.76rem' }}>M test_corrosion_bounds.py</strong>
                  <span style={{ fontSize: '0.7rem', color: testStatus === 'PASSED' ? '#1b6a4a' : '#a62a2a', fontWeight: 'bold' }}>
                    {testStatus === 'PASSED' ? '9/9 PASS' : '8/9 PASS'}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#685e50', marginTop: '3px' }}>
                  Statutory boundary verification suite
                </div>
              </div>
            </div>
          )}

          {/* History View */}
          {repoTab === 'HISTORY' && (
            <div style={{ padding: '8px 0', fontSize: '0.74rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ fontWeight: '800', color: '#1a1612', marginBottom: '8px' }}>
                COMMITTED REVISIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.6)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontWeight: '700', color: '#1a1612' }}>fix(physics): API 510 bound</div>
                  <div style={{ color: '#7a7061', fontSize: '0.66rem' }}>rev: 0x89e2 • {patchApplied ? 'Staged' : 'Upstream'}</div>
                </div>
                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.6)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontWeight: '700', color: '#1a1612' }}>sec(guard): AST interceptor</div>
                  <div style={{ color: '#7a7061', fontSize: '0.66rem' }}>rev: 0x7b10 • Verified</div>
                </div>
                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.6)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontWeight: '700', color: '#1a1612' }}>init: API 510 baseline</div>
                  <div style={{ color: '#7a7061', fontSize: '0.66rem' }}>rev: 0x44a1 • Genesis</div>
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab View */}
          {repoTab === 'SKILLS' && (
            <div style={{ padding: '8px 0', fontSize: '0.74rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '800', color: '#1a1612' }}>WORKSPACE SKILLS</span>
                <span className="mono-tag" style={{ fontSize: '0.6rem' }}>.agents/skills/</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {skills.filter(s => s.installed).map(skill => (
                  <div
                    key={skill.id}
                    style={{
                      padding: '8px',
                      background: 'rgba(255,255,255,0.7)',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#1a1612', fontSize: '0.74rem' }}>{skill.name}</div>
                      <div style={{ fontSize: '0.62rem', color: '#7a7061' }}>{skill.version} • {skill.statutoryTier}</div>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.62rem', 
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        background: skill.enabled ? 'rgba(27,106,74,0.15)' : 'rgba(100,100,100,0.15)',
                        color: skill.enabled ? '#1b6a4a' : '#666',
                        fontWeight: 'bold'
                      }}
                    >
                      {skill.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setIsSkillsModalOpen(true)}
                className="btn-glass btn-primary-bold"
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.72rem', marginTop: '10px' }}
              >
                🧩 Manage Extensions & Skills
              </button>
            </div>
          )}

          {/* Operational Sandbox Specification Card */}
          <div style={styles.sandboxSpecCard} className="glass-inset">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={styles.sandboxSpecTitle}>SANDBOX</span>
              <span className="mono-tag" style={{ fontSize: '0.62rem', background: '#e2dac9' }}>POSIX JAIL</span>
            </div>
            <div style={styles.specRow}>
              <span>Memory:</span>
              <strong>512 MB</strong>
            </div>
            <div style={styles.specRow}>
              <span>CPU:</span>
              <strong>10 sec</strong>
            </div>
            <div style={styles.specRow}>
              <span>Network:</span>
              <strong>NONE</strong>
            </div>
            <div style={styles.specRow}>
              <span>Filesystem:</span>
              <strong>READ-ONLY</strong>
            </div>
            <div style={styles.specRow}>
              <span>Processes:</span>
              <strong>BLOCKED</strong>
            </div>
            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(195,182,160,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#1b6a4a', fontSize: '0.75rem' }}>●</span>
              <span style={{ fontSize: '0.66rem', fontWeight: '800', color: '#1b6a4a' }}>POLICY COMPLIANT</span>
            </div>
          </div>
        </aside>

        {/* Resize Handle: Left ↔ Center */}
        <div
          className={`panel-resize-handle${dragRef.current.active === 'left' ? ' dragging' : ''}`}
          onMouseDown={(e) => handleDragStart(e, 'left')}
          title="Drag to resize panels"
        />

        {/* Column 2: Center Code Editor with 3 Layers */}
        <section style={{ ...styles.centerCol, flex: 1, minWidth: 0 }} className="glass-card">
          {/* Layer 1: Header */}
          <div style={styles.editorHeaderBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>📄</span>
              <span style={{ fontWeight: '800', fontSize: '0.86rem', color: '#1a1612' }}>
                {activeFileData.name}
              </span>
              <span className="mono-tag" style={{ fontSize: '0.66rem' }}>
                {activeFileData.lang}
              </span>
              <span className="mono-tag" style={{ fontSize: '0.66rem' }}>
                {activeFileData.version || 'v1.0'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {activeFileKey === 'src/physics/corrosion_evaluator.py' ? (
                <span
                  className={`badge ${patchApplied && testStatus === 'PASSED' ? 'badge-green' : patchApplied ? 'badge-gold' : 'badge-crimson'}`}
                  style={{ fontSize: '0.64rem', padding: '2px 7px' }}
                >
                  {patchApplied && testStatus === 'PASSED' ? '● VERIFIED' : patchApplied ? '● PATCHED' : '● WORKING COPY'}
                </span>
              ) : activeFileKey === 'tests/test_corrosion_bounds.py' ? (
                <span
                  className={`badge ${testStatus === 'PASSED' ? 'badge-green' : testStatus === 'FAILED' ? 'badge-crimson' : 'badge-gold'}`}
                  style={{ fontSize: '0.64rem', padding: '2px 7px' }}
                >
                  {testStatus === 'PASSED' ? '● VERIFIED' : testStatus === 'FAILED' ? '⚠ FAILING' : '○ READY'}
                </span>
              ) : (
                <span className="badge badge-green" style={{ fontSize: '0.64rem', padding: '2px 7px' }}>
                  ● VERIFIED
                </span>
              )}
            </div>
          </div>

          {/* Layer 2: Editor Diagnostics & View Controls (Directly Below File Name) */}
          <div style={styles.editorToolbarBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#685e50' }}>
                Problems: <strong style={{ color: problemsInfo.count > 0 ? '#a62a2a' : '#1a1612' }}>{problemsInfo.count}</strong>
              </span>
              {problemsInfo.message && (
                <span style={{ fontSize: '0.66rem', color: '#a62a2a', fontWeight: 'bold' }}>
                  ({problemsInfo.message})
                </span>
              )}
              <span style={{ color: '#d0c6b6' }}>|</span>
              <span style={{ fontSize: '0.72rem', color: '#685e50' }}>Warnings: <strong style={{ color: '#1a1612' }}>0</strong></span>
              <span style={{ color: '#d0c6b6' }}>|</span>
              <span style={{ fontSize: '0.72rem', color: '#1b6a4a', fontWeight: '700' }}>UTF-8</span>
              {isBufferDirty && (
                <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                  ● UNSAVED
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setEditorViewMode('EDIT')}
                className="btn-glass"
                style={{
                  padding: '2px 9px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  background: editorViewMode === 'EDIT' ? '#181512' : 'transparent',
                  color: editorViewMode === 'EDIT' ? '#ffffff' : 'inherit'
                }}
                title="Interactive Code Editor: Edit code directly with line numbers & live validation"
              >
                ✏️ Edit Code
              </button>
              <button
                onClick={() => setEditorViewMode('STANDARD')}
                className="btn-glass"
                style={{
                  padding: '2px 9px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  background: editorViewMode === 'STANDARD' ? '#181512' : 'transparent',
                  color: editorViewMode === 'STANDARD' ? '#ffffff' : 'inherit'
                }}
              >
                Code
              </button>
              <button
                onClick={() => setEditorViewMode('DIFF')}
                className="btn-glass"
                style={{
                  padding: '2px 9px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  background: editorViewMode === 'DIFF' ? '#181512' : 'transparent',
                  color: editorViewMode === 'DIFF' ? '#ffffff' : 'inherit'
                }}
              >
                Inline Diff
              </button>
              <button
                onClick={() => setEditorViewMode('BEFORE_AFTER_WHY')}
                className="btn-glass"
                style={{
                  padding: '2px 9px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  background: editorViewMode === 'BEFORE_AFTER_WHY' ? '#181512' : 'transparent',
                  color: editorViewMode === 'BEFORE_AFTER_WHY' ? '#ffffff' : 'inherit'
                }}
              >
                Compare
              </button>

              {(editorViewMode === 'EDIT' || isBufferDirty) && (
                <>
                  <button
                    onClick={handleSaveCode}
                    className={`btn-glass ${isBufferDirty ? 'btn-primary-bold' : ''}`}
                    style={{
                      padding: '2px 9px',
                      fontSize: '0.7rem',
                      background: isBufferDirty ? '#1b6a4a' : 'transparent',
                      color: isBufferDirty ? '#ffffff' : 'inherit',
                      borderColor: isBufferDirty ? '#1b6a4a' : 'var(--glass-border)'
                    }}
                    title="Save buffer (Ctrl+S)"
                  >
                    💾 Save
                  </button>
                  {isBufferDirty && (
                    <button
                      onClick={handleRevertCode}
                      className="btn-glass"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#a62a2a' }}
                      title="Revert changes"
                    >
                      Revert
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Layer 3: Monospace Code Body */}
          {editorViewMode === 'EDIT' ? (
            <div className="editor-window">
              <div className="editor-gutter">
                {codeLines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              <div className="editor-code-container" style={{ padding: '10px 14px', display: 'flex' }}>
                <textarea
                  className="editor-textarea"
                  value={activeCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                      e.preventDefault();
                      handleSaveCode();
                    }
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      const val = activeCode;
                      const newVal = val.substring(0, start) + '    ' + val.substring(end);
                      handleCodeChange(newVal);
                      setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd = start + 4;
                      }, 0);
                    }
                  }}
                  spellCheck="false"
                  placeholder="# Write or edit code here..."
                />
              </div>
            </div>
          ) : editorViewMode === 'BEFORE_AFTER_WHY' && activeFileKey === 'src/physics/corrosion_evaluator.py' ? (
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
                <p style={{ fontSize: '0.76rem', color: '#2d2721', margin: 0, lineHeight: '1.4' }}>
                  Ultrasonic probe oxide layers cause apparent thickness growth (<code>t_current &gt; t_initial</code>). API 510 mandates non-negative corrosion rates (<code>rate &gt;= 0.0</code>) to prevent mathematical falsification of remaining equipment life.
                </p>
              </div>
            </div>
          ) : (
            <div className="editor-window">
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

        {/* Resize Handle: Center ↔ Right */}
        <div
          className={`panel-resize-handle${dragRef.current.active === 'right' ? ' dragging' : ''}`}
          onMouseDown={(e) => handleDragStart(e, 'right')}
          title="Drag to resize panels"
        />

        {/* Column 3: AI Engineer Diagnostic Workspace */}
        <aside style={{ ...styles.rightCol, width: `${panelWidths.right}%`, minWidth: '260px', flexShrink: 0 }} className="glass-card">
          <div className="ai-panel-wrapper">
            {/* Zone 1: Fixed Header */}
            <div className="ai-panel-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.66rem', fontWeight: '800' }}>
                  AI ENGINEER
                </span>
                <span className="mono-tag" style={{ fontSize: '0.64rem' }}>
                  API 510 §7.1.1
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1a1612', marginTop: '6px' }}>
                {testStatus === 'PASSED' ? (
                  <span style={{ color: '#1b6a4a' }}>● VERIFICATION PASSED (9/9)</span>
                ) : patchApplied ? (
                  <span style={{ color: '#9a671a' }}>● PATCH APPLIED (UNVERIFIED)</span>
                ) : testStatus === 'FAILED' ? (
                  <span style={{ color: '#a62a2a' }}>● PATCH PROPOSED</span>
                ) : (
                  <span style={{ color: '#685e50' }}>● STANDBY (AWAITING RUN)</span>
                )}
              </div>
            </div>

            {/* Zone 2: Fixed Mode Tabs */}
            <div className="ai-panel-tabs">
              <button
                onClick={() => setAssistantTab('DIAGNOSIS')}
                style={{
                  ...styles.tabBtn,
                  flex: 1,
                  background: assistantTab === 'DIAGNOSIS' ? '#181512' : 'transparent',
                  color: assistantTab === 'DIAGNOSIS' ? '#faf7f2' : '#5c5244',
                }}
              >
                Diagnose
              </button>
              <button
                onClick={() => setAssistantTab('EVIDENCE')}
                style={{
                  ...styles.tabBtn,
                  flex: 1,
                  background: assistantTab === 'EVIDENCE' ? '#181512' : 'transparent',
                  color: assistantTab === 'EVIDENCE' ? '#faf7f2' : '#5c5244',
                }}
              >
                Evidence
              </button>
              <button
                onClick={() => setAssistantTab('PATCH')}
                style={{
                  ...styles.tabBtn,
                  flex: 1,
                  background: assistantTab === 'PATCH' ? '#181512' : 'transparent',
                  color: assistantTab === 'PATCH' ? '#faf7f2' : '#5c5244',
                }}
              >
                Patch
              </button>
              <button
                onClick={() => setAssistantTab('VERIFICATION')}
                style={{
                  ...styles.tabBtn,
                  flex: 1,
                  background: assistantTab === 'VERIFICATION' ? '#181512' : 'transparent',
                  color: assistantTab === 'VERIFICATION' ? '#faf7f2' : '#5c5244',
                }}
              >
                Verify
              </button>
              <button
                onClick={() => setAssistantTab('ASK')}
                style={{
                  ...styles.tabBtn,
                  flex: 1.15,
                  background: assistantTab === 'ASK' ? '#181512' : 'transparent',
                  color: assistantTab === 'ASK' ? '#faf7f2' : '#9a671a',
                  fontWeight: '800',
                  letterSpacing: '-0.01em'
                }}
              >
                Ask AI ✨
              </button>
            </div>

            {/* Zone 3: Scrollable Content - Only shows active mode! */}
            <div className="ai-panel-body">
              {assistantTab === 'DIAGNOSIS' && (
                <div style={styles.tabPane}>
                  <div style={styles.sectionHeader}>ROOT CAUSE</div>
                  <div style={styles.diagnosisQuoteBox}>
                    <strong>Negative corrosion rate caused by measurement noise.</strong><br />
                    <span style={{ color: '#7a7061', fontSize: '0.72rem' }}>
                      Affected: <code>corrosion_evaluator.py</code>
                    </span>
                  </div>

                  <div style={{ ...styles.sectionHeader, marginTop: '8px' }}>EVIDENCE SUMMARY</div>
                  <div style={{ fontSize: '0.74rem', color: '#443c30', fontFamily: 'var(--font-mono)', lineHeight: '1.5' }}>
                    t_initial = 0.2500 in<br />
                    t_current = 0.2710 in<br />
                    Δt = 2.0 yr<br />
                    raw_rate = -0.0105 in/yr (violation)
                  </div>

                  <div style={{ ...styles.sectionHeader, marginTop: '8px' }}>STATUTORY MANDATE</div>
                  <p style={{ fontSize: '0.75rem', color: '#443c30', margin: '2px 0', lineHeight: '1.4' }}>
                    API 510 §7.1.1 mandates corrosion rate ≥ 0.0. Jitter cannot be used to artificially project remaining equipment life.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setAssistantTab('ASK');
                      handleSendChatMessage('Explain why measurement noise causes the negative rate error in corrosion_evaluator.py');
                    }}
                    style={{
                      marginTop: '10px',
                      background: 'rgba(154, 103, 26, 0.08)',
                      border: '1px solid rgba(154, 103, 26, 0.3)',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      color: '#9a671a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>💬</span>
                    <span>Ask AI Specialist to explain this root cause in depth ➔</span>
                  </button>
                </div>
              )}

              {assistantTab === 'EVIDENCE' && (
                <div style={styles.tabPane}>
                  <div style={styles.sectionHeader}>SUPPORTING DATA READINGS</div>
                  <div style={styles.evidenceTable}>
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
                    <div style={styles.evidenceRow}>
                      <span style={styles.evidenceKey}>raw_rate:</span>
                      <span style={{ ...styles.evidenceVal, color: '#a62a2a', fontWeight: '800' }}>-0.0105 in/yr</span>
                    </div>
                    <div style={styles.evidenceRow}>
                      <span style={styles.evidenceKey}>API 510 bound:</span>
                      <span style={{ ...styles.evidenceVal, color: '#1b6a4a', fontWeight: '800' }}>rate &ge; 0.0</span>
                    </div>
                    <div style={styles.evidenceRow}>
                      <span style={styles.evidenceKey}>Source:</span>
                      <span style={styles.evidenceVal}>CML_UT_Survey_2026.csv</span>
                    </div>
                  </div>

                  <div style={{ ...styles.sectionHeader, marginTop: '10px' }}>EPISTEMIC SEPARATION</div>
                  <div style={styles.evidenceTable}>
                    <div style={styles.evidenceRow}>
                      <span style={styles.evidenceKey}>MODEL SIGNAL:</span>
                      <span style={{ ...styles.evidenceVal, color: '#9a671a' }}>98.4% extraction</span>
                    </div>
                    <div style={styles.evidenceRow}>
                      <span style={styles.evidenceKey}>ASSURANCE:</span>
                      <span style={{ ...styles.evidenceVal, color: testStatus === 'PASSED' ? '#1b6a4a' : '#a62a2a', fontWeight: '800' }}>
                        {testStatus === 'PASSED' ? 'PASS (9/9 Tests)' : 'FAIL (Jitter Violation)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {assistantTab === 'PATCH' && (
                <div style={styles.tabPane}>
                  <div style={styles.sectionHeader}>PROPOSED SURGICAL DIFF</div>
                  <div style={{ fontSize: '0.72rem', color: '#7a7061', marginBottom: '4px' }}>
                    corrosion_evaluator.py <span style={{ color: '#1b6a4a', fontWeight: 'bold' }}>+6 / -2 lines</span>
                  </div>
                  
                  <div style={styles.diffContainer}>
                    <div style={{ color: '#f87171' }}>-    corrosion_rate = (t_initial - t_current) / delta_years</div>
                    <div style={{ color: '#f87171' }}>-    return corrosion_rate</div>
                    <div style={{ color: '#4ade80' }}>+    if delta_years &lt;= 0:</div>
                    <div style={{ color: '#4ade80' }}>+        raise ValueError("delta_years must be &gt; 0")</div>
                    <div style={{ color: '#4ade80' }}>+    raw_rate = (t_initial - t_current) / delta_years</div>
                    <div style={{ color: '#4ade80' }}>+    return max(0.0, round(raw_rate, 4))</div>
                  </div>

                  <div style={{ ...styles.sectionHeader, marginTop: '6px' }}>WHY</div>
                  <p style={{ fontSize: '0.74rem', color: '#443c30', lineHeight: '1.4', margin: '2px 0 6px 0' }}>
                    Enforces lower-bound constraint: <code>corrosion_rate &ge; 0</code>
                  </p>

                  <div style={{ ...styles.sectionHeader, marginTop: '4px' }}>SOURCE</div>
                  <p style={{ fontSize: '0.74rem', color: '#443c30', margin: '2px 0' }}>
                    API 510 §7.1.1 Physical Boundary
                  </p>
                </div>
              )}

              {assistantTab === 'VERIFICATION' && (
                <div style={styles.tabPane}>
                  <div style={styles.sectionHeader}>VERIFICATION GATES</div>
                  <div style={styles.verificationList}>
                    <div style={styles.verificationItem}>
                      <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                      <div><strong>AST Security:</strong> 0 forbidden calls. Clean.</div>
                    </div>
                    <div style={styles.verificationItem}>
                      <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                      <div><strong>Sandbox:</strong> POSIX jail, 0 WAN egress.</div>
                    </div>
                    <div style={styles.verificationItem}>
                      <span style={{ color: testStatus === 'PASSED' ? '#1b6a4a' : '#a62a2a', fontWeight: '900' }}>
                        {testStatus === 'PASSED' ? '✓' : '✕'}
                      </span>
                      <div><strong>Test Matrix:</strong> {testStatus === 'PASSED' ? '9/9 passed in 0.09s' : '1 failed (AssertionError)'}</div>
                    </div>
                    <div style={styles.verificationItem}>
                      <span style={{ color: testStatus === 'PASSED' ? '#1b6a4a' : '#9a671a', fontWeight: '900' }}>
                        {testStatus === 'PASSED' ? '✓' : '○'}
                      </span>
                      <div><strong>Domain SMT:</strong> Physical boundary satisfied.</div>
                    </div>
                  </div>
                </div>
              )}

              {assistantTab === 'ASK' && (
                <div style={styles.tabPane}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#7a7061', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      IN-ENCLAVE SOVEREIGN ASSISTANT
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>
                      LAYA-14B · ON-DEVICE
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div style={styles.chatFeedContainer}>
                    {chatMessages.map(msg => (
                      <div 
                        key={msg.id} 
                        style={msg.sender === 'user' ? styles.chatMsgUser : styles.chatMsgAi}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.64rem', fontWeight: '800', color: msg.sender === 'user' ? '#9a671a' : '#1b6a4a' }}>
                            {msg.sender === 'user' ? 'OPERATOR (ESHWARI)' : '⚡ LAYA AI SPECIALIST'}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#948b7d' }}>{msg.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#1a1612', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                          {msg.text}
                        </div>
                        {msg.action && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              type="button"
                              onClick={msg.action.onClick}
                              className="btn-glass btn-primary-bold"
                              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                            >
                              {msg.action.label}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {isAiThinking && (
                      <div style={styles.chatMsgAi}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#7a7061' }}>
                          <span className="pulse-dot pulse-amber" style={{ width: '6px', height: '6px' }} />
                          <span>Laya reasoning specialist analyzing AST & physics constraints...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Prompt Chips */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: '800', color: '#7a7061', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Suggested Queries
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        'Why did test_measurement_noise fail?',
                        'Explain API 510 §7.1.1 physical boundary',
                        'How does the AST guard verify safety?',
                        'Show me how to patch this bug'
                      ].map((promptText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendChatMessage(promptText)}
                          className="btn-glass"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.7)',
                            color: '#3c362f',
                            textAlign: 'left'
                          }}
                        >
                          💡 {promptText}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Zone 4: Fixed Action Bar at Bottom */}
            <div className="ai-panel-footer">
              {assistantTab === 'DIAGNOSIS' && (
                <button
                  onClick={() => { setAssistantTab('PATCH'); setEditorViewMode('DIFF'); }}
                  className="btn-glass btn-primary-bold"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  Review Diff ➔
                </button>
              )}

              {assistantTab === 'EVIDENCE' && (
                <button
                  onClick={() => setAssistantTab('PATCH')}
                  className="btn-glass btn-primary-bold"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  View Patch ➔
                </button>
              )}

              {assistantTab === 'PATCH' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!patchApplied ? (
                    <>
                      <button
                        onClick={() => setAssistantTab('DIAGNOSIS')}
                        className="btn-glass"
                        style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={handleApplyPatch}
                        disabled={isPatching}
                        className="btn-glass btn-primary-bold"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        {isPatching ? 'Applying...' : 'Apply Patch'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleRunSandbox}
                      disabled={testStatus === 'RUNNING'}
                      className="btn-glass btn-primary-bold"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                    >
                      ⚡ Verify Patch in Sandbox
                    </button>
                  )}
                </div>
              )}

              {assistantTab === 'VERIFICATION' && (
                <button
                  onClick={() => setShowProofModal(true)}
                  className="btn-glass"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.78rem' }}
                >
                  🔍 View Detailed Proof Trace
                </button>
              )}

              {assistantTab === 'ASK' && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (promptInput.trim()) {
                      handleSendChatMessage(promptInput.trim());
                      setPromptInput('');
                    }
                  }}
                  style={{ display: 'flex', gap: '6px', width: '100%' }}
                >
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Ask AI about code, physics, tests..."
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(195,182,160,0.75)',
                      background: 'rgba(255,255,255,0.95)',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!promptInput.trim() || isAiThinking}
                    className="btn-glass btn-primary-bold"
                    style={{ padding: '7px 14px', fontSize: '0.75rem' }}
                  >
                    Ask ➔
                  </button>
                </form>
              )}
            </div>
          </div>
        </aside>

      </div>

      {/* 3. Sleek Unified Bottom Dock Bar (Single 32px Bar with on-demand drawers) */}
      <div style={styles.bottomDockBar} className="glass-card">
        {/* Left: Compact Verification Pipeline Nodes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.64rem', fontWeight: '800', letterSpacing: '0.06em', color: '#7a7061', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            PIPELINE:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.64rem' }}>
            <span style={{ color: '#1b6a4a', fontWeight: '700' }}>AST ✓</span>
            <span style={{ color: '#a09482' }}>→</span>
            <span style={{ color: '#1b6a4a', fontWeight: '700' }}>SANDBOX ✓</span>
            <span style={{ color: '#a09482' }}>→</span>
            <span style={{ 
              color: testStatus === 'PASSED' ? '#1b6a4a' : testStatus === 'FAILED' ? '#a62a2a' : '#9a671a',
              fontWeight: '800'
            }}>
              TESTS ({testStatus === 'PASSED' ? '9/9 ✓' : testStatus === 'FAILED' ? '8/9 ✕' : '9 ○'})
            </span>
            <span style={{ color: '#a09482' }}>→</span>
            <span style={{ color: testStatus === 'PASSED' ? '#1b6a4a' : '#9a671a', fontWeight: '700' }}>
              SMT {testStatus === 'PASSED' ? '✓' : '○'}
            </span>
          </div>

          <span 
            className={`badge ${testStatus === 'PASSED' ? 'badge-green' : testStatus === 'READY' ? 'badge-gold' : 'badge-crimson'}`}
            style={{ fontSize: '0.62rem', padding: '1px 6px', whiteSpace: 'nowrap' }}
          >
            {testStatus === 'PASSED' ? 'COMMIT READY ✓' : testStatus === 'READY' ? 'AWAITING RUN' : 'GATE 3 FAILING'}
          </span>
        </div>

        {/* Center & Right: Drawer Toggles & Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Background Agents Fleet Toggle */}
          <button
            onClick={() => {
              setIsAgentsDeckExpanded(!isAgentsDeckExpanded);
              if (!isAgentsDeckExpanded) setIsConsoleOpen(false);
            }}
            className="btn-glass"
            style={{ 
              padding: '2px 8px', 
              fontSize: '0.68rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px',
              background: isAgentsDeckExpanded ? '#181512' : 'transparent',
              color: isAgentsDeckExpanded ? '#ffffff' : 'inherit'
            }}
            title="Toggle autonomous background agent fleet"
          >
            <span>🤖 Fleet ({subagents.length})</span>
            <span style={{ fontSize: '0.6rem' }}>{isAgentsDeckExpanded ? '▼' : '▲'}</span>
          </button>

          {/* Console Drawer Toggle */}
          <button
            onClick={() => {
              setIsConsoleOpen(!isConsoleOpen);
              if (!isConsoleOpen) setIsAgentsDeckExpanded(false);
            }}
            className="btn-glass"
            style={{ 
              padding: '2px 8px', 
              fontSize: '0.68rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px',
              background: isConsoleOpen ? '#181512' : 'transparent',
              color: isConsoleOpen ? '#ffffff' : 'inherit'
            }}
            title="Toggle execution console & test matrix output"
          >
            <span className={`pulse-dot ${testStatus === 'PASSED' ? 'pulse-green' : 'pulse-amber'}`} style={{ width: '5px', height: '5px' }} />
            <span>🖥️ Console ({consoleTab.toLowerCase()})</span>
            <span style={{ fontSize: '0.6rem' }}>{isConsoleOpen ? '▼' : '▲'}</span>
          </button>

          {testStatus === 'PASSED' && (
            <button
              onClick={() => setShowReportsModal(true)}
              className="btn-glass"
              style={{ padding: '2px 8px', fontSize: '0.68rem', color: '#1b6a4a', fontWeight: 'bold' }}
              title="View compiled capability verification reports"
            >
              📄 Reports
            </button>
          )}
        </div>
      </div>

      {/* Slide-up Background Agents Deck (when toggled open) */}
      {isAgentsDeckExpanded && (
        <div style={{ height: '240px', maxHeight: '280px', overflowY: 'auto', flexShrink: 0, borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.96)', boxShadow: '0 -6px 22px rgba(25, 20, 15, 0.18)' }}>
          <BackgroundAgentsDeck
            agents={subagents}
            setAgents={setSubagents}
            onMergePatch={handleMergeAgentPatch}
            addAuditLog={addAuditLog}
            isExpanded={true}
            onToggleExpanded={() => setIsAgentsDeckExpanded(false)}
          />
        </div>
      )}

      {/* Slide-up Execution Console (when toggled open) */}
      {isConsoleOpen && (
        <div 
          className="console-drawer" 
          style={{ 
            height: isConsoleMaximized ? '380px' : '285px',
            maxHeight: isConsoleMaximized ? '460px' : '320px',
            flexShrink: 0, 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 -8px 30px rgba(25, 20, 15, 0.38)',
            borderTop: '2px solid rgba(224, 169, 109, 0.5)',
            transition: 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div className="console-drawer-header" style={{ padding: '6px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`pulse-dot ${testStatus === 'PASSED' ? 'pulse-green' : 'pulse-amber'}`} />
              <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#ebdcc3', letterSpacing: '0.04em' }}>
                EXECUTION CONSOLE #24
              </span>
              <span className="mono-tag" style={{ fontSize: '0.58rem', background: '#352e25', color: '#e0a96d', border: '1px solid #4a3e30' }}>
                POSIX JAIL · 0 WAN
              </span>
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                onClick={() => setConsoleTab('OUTPUT')}
                className={`console-tab-btn ${consoleTab === 'OUTPUT' ? 'active' : ''}`}
                style={{ fontSize: '0.68rem', padding: '3px 9px' }}
              >
                Output
              </button>
              <button
                onClick={() => setConsoleTab('MATRIX')}
                className={`console-tab-btn ${consoleTab === 'MATRIX' ? 'active' : ''}`}
                style={{ fontSize: '0.68rem', padding: '3px 9px' }}
              >
                Matrix (9)
              </button>
              <button
                onClick={() => setConsoleTab('AUDIT')}
                className={`console-tab-btn ${consoleTab === 'AUDIT' ? 'active' : ''}`}
                style={{ fontSize: '0.68rem', padding: '3px 9px' }}
              >
                Audit
              </button>
              <button
                onClick={() => setIsConsoleMaximized(!isConsoleMaximized)}
                style={{ ...styles.collapseToggleBtn, marginLeft: '6px', fontSize: '0.74rem', padding: '2px 6px' }}
                title={isConsoleMaximized ? "Restore standard console height" : "Maximize console height"}
              >
                {isConsoleMaximized ? '⊡' : '⤢'}
              </button>
              <button
                onClick={() => setIsConsoleOpen(false)}
                style={{ ...styles.collapseToggleBtn, fontSize: '0.75rem', padding: '2px 6px' }}
                title="Close console"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="console-drawer-body" style={{ ...styles.consoleBody, flex: 1, minHeight: 0, maxHeight: 'none', padding: '12px 16px', overflowY: 'auto' }}>
            {/* Tab 1: Terminal Output */}
            {consoleTab === 'OUTPUT' && (
              <div>
                {testStatus === 'READY' && (
                  <div style={{ color: '#cfc4b2', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: '1.6' }}>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>$ sandbox status --envelope posix_jail</div>
                    <div><span style={{ color: '#e0a96d' }}>[SANDBOX INITIALIZED]</span> POSIX micro-sandbox mounted with cgroups_v2.</div>
                    <div>Target: <span style={{ color: '#ebdcc3' }}>tests/test_corrosion_bounds.py</span> (Python 3.11.8 | Pytest 8.1.1-secure)</div>
                    <div>Isolation: <span style={{ color: '#4ade80' }}>--network none, 512MB RAM cap, READ-ONLY rootfs</span></div>
                    <div style={{ marginTop: '8px', color: '#fbbf24', fontWeight: 'bold' }}>
                      &gt; Click "▶ Run Sandbox" above to execute test suite and trigger gate verification.
                    </div>
                  </div>
                )}
                {testStatus === 'RUNNING' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #3d352b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pulse-dot pulse-amber" style={{ width: '8px', height: '8px' }} />
                        <span style={{ color: '#e0a96d', fontWeight: 'bold' }}>MICRO-SANDBOX EXECUTING ({testProgress}%)</span>
                      </div>
                      <span className="mono-tag" style={{ fontSize: '0.68rem', background: '#2c251e', color: '#ebdcc3', border: '1px solid #4a3e30' }}>
                        POSIX JAIL · 0 WAN
                      </span>
                    </div>

                    {testLiveLogs.map((log, idx) => (
                      <div key={idx} style={{ color: '#ebdcc3', marginBottom: '3px' }}>
                        {log}
                      </div>
                    ))}

                    <div style={{ marginTop: '10px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${testProgress}%`,
                        background: 'linear-gradient(90deg, #8a5715 0%, #e0a96d 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.35s ease',
                        boxShadow: '0 0 8px rgba(224, 169, 109, 0.4)'
                      }} />
                    </div>
                  </div>
                )}
                {testStatus === 'FAILED' && (
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '6px' }}>$ sandbox run tests/test_corrosion_bounds.py</div>
                    <div><span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_nominal_thinning</span> <span style={{ color: '#4ade80' }}>PASSED</span></div>
                    <div><span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_zero_wear</span> <span style={{ color: '#4ade80' }}>PASSED</span></div>
                    <div style={{ color: '#f87171', fontWeight: 'bold', marginTop: '4px' }}>✕ tests/test_corrosion_bounds.py::test_measurement_noise_physical_bound FAILED</div>
                    <div style={{ color: '#f87171', margin: '6px 0', padding: '6px 10px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '4px' }}>
                      AssertionError: Physical violation: Negative corrosion rate (-0.0105 in/yr) detected!<br />
                      Statutory standard API 510 §7.1.1 mandates that corrosion rate must be &gt;= 0.0.
                    </div>
                    <div style={{ color: '#f87171', fontWeight: 'bold' }}>=========================== 1 failed, 8 passed in 0.18s ===========================</div>
                  </div>
                )}
                {testStatus === 'PASSED' && (
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '6px' }}>$ sandbox run tests/test_corrosion_bounds.py</div>
                    <div><span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_nominal_thinning</span> <span style={{ color: '#4ade80' }}>PASSED [0.010 in/yr]</span></div>
                    <div><span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_zero_wear</span> <span style={{ color: '#4ade80' }}>PASSED [0.000 in/yr]</span></div>
                    <div><span style={{ color: '#e0a96d' }}>tests/test_corrosion_bounds.py::test_measurement_noise_physical_bound</span> <span style={{ color: '#4ade80' }}>PASSED [0.000 in/yr bounded]</span></div>
                    <div style={{ color: '#4ade80', fontWeight: 'bold', margin: '6px 0' }}>=========================== 9 passed in 0.09s ===========================</div>
                    <div style={{ color: '#ebdcc3' }}>✓ API 510 §7.1.1 physical boundary verified. 0 regressions. Exit code 0.</div>
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
        </div>
      )}

      {/* MODAL 0: Official Capability Deliverables Deck */}
      {showReportsModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowReportsModal(false)}>
          <div 
            style={{ ...styles.modalContent, maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }} 
            onClick={(e) => e.stopPropagation()} 
            className="glass-card"
          >
            <div style={styles.deliverablesHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">
                    ✓ OFFICIAL DELIVERABLES GENERATED
                  </span>
                  <span className="mono-tag" style={{ fontSize: '0.72rem' }}>
                    ED25519 SIGNED
                  </span>
                  <button
                    onClick={handleGenerateReports}
                    disabled={isGeneratingReports}
                    className="btn-glass"
                    style={{ fontSize: '0.72rem', padding: '3px 10px', cursor: 'pointer' }}
                    title="Re-compile official capability reports"
                  >
                    {isGeneratingReports ? 'Compiling...' : '↻ Re-generate'}
                  </button>
                </div>
                <h3 style={styles.deliverablesTitle}>
                  Official Capability Verification Reports
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#5c5244', margin: '2px 0 0 0' }}>
                  Statutory verification reports counter-signed and ready for deployment to the sovereign enclave.
                </p>
              </div>

              {/* Tab Switcher & Export */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={styles.tabPillGroup} className="glass-inset">
                  <button
                    onClick={() => setActiveReportTab('docx')}
                    style={{
                      ...styles.tabBtn,
                      background: activeReportTab === 'docx' ? '#181512' : 'transparent',
                      color: activeReportTab === 'docx' ? '#faf7f2' : '#443d33',
                    }}
                  >
                    📄 Verification Note (.docx)
                  </button>
                  <button
                    onClick={() => setActiveReportTab('xlsx')}
                    style={{
                      ...styles.tabBtn,
                      background: activeReportTab === 'xlsx' ? '#181512' : 'transparent',
                      color: activeReportTab === 'xlsx' ? '#faf7f2' : '#443d33',
                    }}
                  >
                    📊 Test Matrix Sheet (.xlsx)
                  </button>
                </div>

                <button
                  onClick={() => handleSimulateDownload(activeReportTab)}
                  disabled={isExporting}
                  className="btn-glass btn-primary-bold"
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  {isExporting ? 'Saving...' : `💾 Download .${activeReportTab}`}
                </button>

                <button
                  onClick={() => setShowReportsModal(false)}
                  style={styles.modalCloseBtn}
                  title="Close reports modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab 1: Software Verification Note (.docx) */}
            {activeReportTab === 'docx' && (
              <div style={styles.docxPreview} className="glass-inset">
                <div style={styles.letterhead}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={styles.orgTitle}>SOFTWARE INTEGRITY DIRECTORATE // REFINERIES ENCLAVE</div>
                      <div style={styles.docSubtitle}>STATUTORY CAPABILITY VERIFICATION & TECHNICAL AUDIT NOTE</div>
                    </div>
                    <div style={styles.docRefBox}>
                      <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#7a7061' }}>REF NUMBER</div>
                      <div className="mono-tag" style={{ fontSize: '0.74rem' }}>CAP-VERIFY-2026/API510/CR-400</div>
                    </div>
                  </div>
                  <div style={{ borderBottom: '2px solid #383228', margin: '14px 0 16px 0' }} />
                </div>

                <div style={styles.memoBody}>
                  <p><strong>SUBJECT:</strong> STATUTORY CAPABILITY AUDIT & PRODUCTION ENCLAVE AUTHORIZATION</p>
                  <p style={{ marginTop: '8px' }}>
                    <strong>TARGET MODULE:</strong> <code>src/physics/corrosion_evaluator.py::calculate_corrosion_rate</code><br />
                    <strong>STATUTORY MANDATE:</strong> API 510 Section 7.1.1 & ASME B31.3 Section 304.1.2<br />
                    <strong>RUNTIME ENVELOPE:</strong> Isolated POSIX Micro-sandbox (cgroups_v2, 512MB RAM, 0 WAN Egress)
                  </p>

                  <div style={styles.findingBox}>
                    <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#1b6a4a' }}>VERIFICATION RESULT: PASSED (9/9 TESTS CLEAN)</div>
                    <div style={{ fontSize: '0.82rem', color: '#2b261f', marginTop: '4px' }}>
                      Remediation diff verified by offline AST security guard (42 nodes inspected, 0 forbidden syscalls detected). Ultrasonic sensor jitter anomaly bounded to <code>0.0000 in/yr</code> in compliance with API 510 §7.1.1. Zero regressions detected across full test suite.
                    </div>
                  </div>

                  <p style={{ marginTop: '12px' }}>
                    <strong>RECOMMENDED ACTION:</strong> Module authorized for deployment into sovereign refinery production enclave. Capability cryptographic signature sealed to enclave key.
                  </p>

                  <div style={styles.signatureBlock}>
                    <div style={{ fontSize: '0.72rem', color: '#7a7061', fontWeight: '700' }}>
                      CRYPTOGRAPHICALLY COUNTER-SIGNED:
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1612' }}>
                      {currentUser.name} — {currentUser.title}
                    </div>
                    <div className="mono-tag" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                      FINGERPRINT: {currentUser.keyFingerprint}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Test Matrix Workbook (.xlsx) */}
            {activeReportTab === 'xlsx' && (
              <div style={styles.xlsxPreview} className="glass-inset">
                <div style={styles.sheetHeader}>
                  <span className="mono-tag" style={{ fontSize: '0.75rem', background: '#217346', color: '#ffffff' }}>
                    EXCEL LIVE TEST MATRIX ENGINE
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#554c3d' }}>
                    Sheet 1: <code>API510_TestSuite_Results</code>
                  </span>
                </div>

                <div style={styles.tableScroll}>
                  <table style={styles.auditTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Test Case ID</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Standard Mandate</th>
                        <th style={styles.th}>Input Conditions</th>
                        <th style={styles.th}>Expected Output</th>
                        <th style={styles.th}>Measured Output</th>
                        <th style={styles.th}>Runtime</th>
                        <th style={styles.th}>Gate Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-API510-01</td>
                        <td style={styles.td}>Nominal Thinning</td>
                        <td style={styles.td}>API 510 §7.1.1</td>
                        <td style={styles.td}>0.280" to 0.260", 2.0y</td>
                        <td style={styles.td}>0.0100 in/yr</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>0.0100 in/yr</td>
                        <td style={styles.td}>12 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-API510-02</td>
                        <td style={styles.td}>Zero Wear Steady-State</td>
                        <td style={styles.td}>API 510 §7.1.1</td>
                        <td style={styles.td}>0.280" to 0.280", 1.5y</td>
                        <td style={styles.td}>0.0000 in/yr</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>0.0000 in/yr</td>
                        <td style={styles.td}>9 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-API510-03</td>
                        <td style={styles.td}>Severe Degradation</td>
                        <td style={styles.td}>API 510 §7.1.1</td>
                        <td style={styles.td}>0.320" to 0.180", 3.0y</td>
                        <td style={styles.td}>0.0467 in/yr</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>0.0467 in/yr</td>
                        <td style={styles.td}>11 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-API510-04</td>
                        <td style={styles.td}>Probe Oxide Jitter Bound</td>
                        <td style={styles.td}>API 510 Physical Bound</td>
                        <td style={styles.td}>0.250" to 0.271", 2.0y</td>
                        <td style={styles.td}>&gt;= 0.0000 in/yr</td>
                        <td style={{ ...styles.td, fontWeight: '800', color: 'var(--accent-green)' }}>0.0000 in/yr</td>
                        <td style={styles.td}>14 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-API510-05</td>
                        <td style={styles.td}>Zero Time Delta</td>
                        <td style={styles.td}>Math Invariant</td>
                        <td style={styles.td}>delta_years = 0.0</td>
                        <td style={styles.td}>ValueError</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>ValueError</td>
                        <td style={styles.td}>8 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-API510-06</td>
                        <td style={styles.td}>Negative Time Delta</td>
                        <td style={styles.td}>Math Invariant</td>
                        <td style={styles.td}>delta_years = -1.0</td>
                        <td style={styles.td}>ValueError</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>ValueError</td>
                        <td style={styles.td}>8 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-SEC-01</td>
                        <td style={styles.td}>AST Syscall Interceptor</td>
                        <td style={styles.td}>Sovereign Security</td>
                        <td style={styles.td}>42 AST Nodes</td>
                        <td style={styles.td}>0 Violations</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>0 Violations</td>
                        <td style={styles.td}>22 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-SEC-02</td>
                        <td style={styles.td}>Sandbox Memory Quota</td>
                        <td style={styles.td}>Cgroups v2 Limits</td>
                        <td style={styles.td}>512 MB Max Limit</td>
                        <td style={styles.td}>&lt; 512 MB</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>28.4 MB (Peak)</td>
                        <td style={styles.td}>11 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                      <tr>
                        <td style={styles.td} className="mono-tag">TC-SEC-03</td>
                        <td style={styles.td}>Network Egress Boundary</td>
                        <td style={styles.td}>Air-Gap Policy</td>
                        <td style={styles.td}>--network none</td>
                        <td style={styles.td}>0 WAN Packets</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--accent-green)' }}>0 Packets</td>
                        <td style={styles.td}>0 ms</td>
                        <td style={styles.td}><span className="badge badge-green">PASSED</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Workspace Selector Modal */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => {
          setCurrentWorkspace(ws);
          addAuditLog({
            actor: 'USER',
            action: `Switched active workspace root to ${ws.name}`,
            hash: 'ws:switch:' + ws.id,
            details: `Path: ${ws.path} | Path Traversal Protection: ACTIVE`
          });
        }}
        addAuditLog={addAuditLog}
      />

      {/* Offline Extensions & Skills Modal */}
      <OfflineSkillsModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        skills={skills}
        onToggleSkill={(id) => {
          setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
        }}
        onInstallSkill={(id) => {
          setSkills(prev => prev.map(s => s.id === id ? { ...s, installed: true, enabled: true } : s));
        }}
        addAuditLog={addAuditLog}
      />

      {/* New File Creation Modal */}
      {showNewFileModal && (
        <div className="modal-backdrop" style={{ zIndex: 1500 }} onClick={() => setShowNewFileModal(false)}>
          <div className="modal-card glass-card" style={{ maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>📄</span>
                <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#1a1612' }}>Create New Code File</h4>
              </div>
              <button onClick={() => setShowNewFileModal(false)} className="btn-glass" style={{ padding: '2px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateNewFile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1a1612', display: 'block', marginBottom: '4px' }}>
                  Relative Path in Workspace
                </label>
                <input
                  type="text"
                  placeholder="e.g. src/physics/wall_loss_model.py"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(195,182,160,0.6)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', outline: 'none' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button type="button" onClick={() => setShowNewFileModal(false)} className="btn-glass" style={{ padding: '5px 12px', fontSize: '0.76rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={!newFileName.trim()} className="btn-glass btn-primary-bold" style={{ padding: '5px 14px', fontSize: '0.76rem' }}>
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: {
    height: '100%',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  ingestionAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 252, 240, 0.72)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--accent-gold)',
    boxShadow: 'var(--glass-shadow-sm)',
    flexShrink: 0,
    gap: '8px',
  },

  // 1. Compact Banner
  compactBanner: {
    padding: '6px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow-sm)',
    flexShrink: 0,
    gap: '8px',
    borderRadius: '10px',
  },
  bannerLeft: {
    flex: 1,
    minWidth: '280px',
  },
  breadcrumbRow: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.64rem',
    color: '#8c7e6c',
    letterSpacing: '0.02em',
    marginBottom: '2px',
    textTransform: 'uppercase',
  },
  bannerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: '800',
    color: '#1a1612',
    letterSpacing: '-0.01em',
  },
  chipsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  bannerSubtext: {
    fontSize: '0.74rem',
    color: '#5c5244',
    margin: 0,
    lineHeight: '1.2',
  },
  bannerSubtextRow: {
    fontSize: '0.7rem',
    color: '#5c5244',
    marginTop: '2px',
    lineHeight: '1.2',
  },
  bannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  primaryActionButton: {
    padding: '6px 14px',
    fontSize: '0.78rem',
    cursor: 'pointer',
  },
  resetButton: {
    padding: '6px 10px',
    fontSize: '0.74rem',
  },

  // Column 1: Left File Explorer
  leftCol: {
    padding: '8px 10px',
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    boxShadow: 'var(--glass-shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    gap: '6px',
  },
  explorerHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingBottom: '6px',
    borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0,
  },
  repoNavTabs: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  repoNavBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '0.68rem',
    letterSpacing: '0.06em',
    padding: '4px 2px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
    gap: '6px',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: '2px',
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
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid var(--accent-gold)',
    color: '#1a1612',
    fontWeight: '700',
    boxShadow: '0 2px 10px rgba(184, 134, 11, 0.15), inset 0 1px 1px #ffffff',
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
    padding: '6px 8px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexShrink: 0,
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
    padding: '8px 12px',
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    boxShadow: 'var(--glass-shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    gap: '4px',
  },
  editorHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    paddingBottom: '6px',
    borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0,
  },
  editorToolbarBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'var(--glass-bg-inset)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    flexShrink: 0,
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
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minHeight: 0,
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
    padding: '8px 10px',
    background: 'rgba(36, 26, 26, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#fca5a5',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    lineHeight: '1.4',
    border: '1px solid rgba(166, 42, 42, 0.45)',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
  },
  bawCodePreNew: {
    margin: 0,
    padding: '8px 10px',
    background: 'rgba(21, 36, 27, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#86efac',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    lineHeight: '1.4',
    border: '1px solid rgba(27, 106, 74, 0.45)',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
  },
  bawWhyBox: {
    padding: '8px 10px',
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    boxShadow: 'var(--glass-shadow-sm)',
  },

  // Column 3: Right AI Engineer Panel
  rightCol: {
    padding: '8px 12px',
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    boxShadow: 'var(--glass-shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    gap: '0',
  },
  bottomDockBar: {
    padding: '4px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    flexShrink: 0,
    gap: '8px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow-sm)',
  },
  assistantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0,
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
    background: 'var(--glass-bg-inset)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
    boxSizing: 'border-box',
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
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#181512',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow-sm), inset 0 1px 1px #ffffff',
  },
  assistantTabContent: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '280px',
  },
  tabPane: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    animation: 'fadeIn 0.15s ease-out',
  },
  chatFeedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minHeight: '60px',
    overflowY: 'auto',
    padding: '2px',
  },
  chatMsgUser: {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '8px',
    padding: '8px 10px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03), inset 0 1px 1px #ffffff',
  },
  chatMsgAi: {
    background: 'rgba(245, 240, 230, 0.68)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '8px 10px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
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
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(166, 42, 42, 0.35)',
    borderRadius: '6px',
    fontSize: '0.76rem',
    color: '#2a1a1a',
    lineHeight: '1.4',
    marginBottom: '10px',
  },
  formulaInline: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    background: 'var(--glass-bg-inset)',
    backdropFilter: 'blur(6px)',
    padding: '1px 5px',
    borderRadius: '4px',
    color: '#8b4513',
    border: '1px solid var(--glass-border)',
  },
  appliedBanner: {
    padding: '8px 12px',
    background: 'rgba(27, 106, 74, 0.12)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
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
    background: 'var(--glass-bg-inset)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
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
    background: 'rgba(26, 24, 21, 0.88)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    lineHeight: '1.45',
    overflowX: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)',
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
    padding: '12px 16px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    lineHeight: '1.5',
    color: '#ebdcc3',
    overflowY: 'auto',
    animation: 'fadeIn 0.2s ease-out',
  },

  // Test Matrix
  matrixContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  matrixGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  matrixGroupTitle: {
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#e0a96d',
    borderBottom: '1px solid #332d25',
    paddingBottom: '3px',
    letterSpacing: '0.04em',
  },
  matrixRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.73rem',
    color: '#cfc4b2',
    padding: '1px 0',
  },
  matrixSummaryFooter: {
    marginTop: '6px',
    padding: '6px 10px',
    borderTop: '1px solid #443c32',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '4px',
    fontSize: '0.76rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    background: 'rgba(25, 20, 15, 0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '560px',
    background: 'rgba(255, 252, 246, 0.88)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 24px 60px rgba(40, 30, 20, 0.22), inset 0 1px 2px #ffffff',
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
    background: 'rgba(26, 24, 21, 0.9)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#4ade80',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    lineHeight: '1.4',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
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
  },

  // Official Capability Deliverables Deck
  reportsLockedCard: {
    padding: '16px 20px',
    background: 'rgba(255, 252, 240, 0.62)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px dashed rgba(160, 140, 110, 0.45)',
    borderRadius: '12px',
    marginTop: '6px',
  },
  generateReportCard: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 252, 242, 0.78)',
    backdropFilter: 'blur(20px) saturate(170%)',
    WebkitBackdropFilter: 'blur(20px) saturate(170%)',
    border: '1.5px solid var(--accent-gold)',
    boxShadow: '0 8px 30px rgba(154, 103, 26, 0.15), inset 0 1px 2px #ffffff',
    borderRadius: '14px',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '6px',
    animation: 'pulseGlow 2.5s infinite',
  },
  generateReportCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    minWidth: '280px',
  },
  generateReportTitle: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#1a1612',
    letterSpacing: '-0.01em',
  },
  generateReportSub: {
    fontSize: '0.82rem',
    color: '#5c5244',
    marginTop: '3px',
    lineHeight: '1.4',
  },
  generateReportBtn: {
    padding: '12px 24px',
    fontSize: '0.94rem',
    background: 'linear-gradient(135deg, rgba(27, 106, 74, 0.95) 0%, rgba(20, 83, 57, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 6px 20px rgba(27, 106, 74, 0.35), inset 0 1px 1px #ffffff',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  deliverablesContainer: {
    padding: '24px',
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    borderRadius: '14px',
    boxShadow: 'var(--glass-shadow-sm)',
    marginTop: '6px',
  },
  deliverablesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  deliverablesTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#1a1612',
    margin: '6px 0 2px 0',
  },
  tabPillGroup: {
    display: 'flex',
    padding: '3px',
    borderRadius: '8px',
    gap: '4px',
  },
  docxPreview: {
    padding: '28px 32px',
    background: 'rgba(255, 255, 255, 0.78)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    color: '#1a1612',
    boxShadow: '0 12px 36px rgba(40, 30, 20, 0.08), inset 0 1px 2px #ffffff',
  },
  letterhead: {
    marginBottom: '16px',
  },
  orgTitle: {
    fontSize: '0.95rem',
    fontWeight: '900',
    letterSpacing: '0.04em',
    color: '#1a1612',
  },
  docSubtitle: {
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#7a7061',
    letterSpacing: '0.08em',
    marginTop: '2px',
  },
  docRefBox: {
    textAlign: 'right',
  },
  memoBody: {
    fontSize: '0.86rem',
    lineHeight: '1.6',
    color: '#2d2721',
  },
  findingBox: {
    padding: '14px 18px',
    background: 'rgba(27, 106, 74, 0.08)',
    border: '1.5px solid var(--accent-green)',
    borderRadius: '8px',
    margin: '14px 0',
  },
  signatureBlock: {
    marginTop: '24px',
    paddingTop: '14px',
    borderTop: '1px solid #d4c8b8',
  },
  xlsxPreview: {
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.78)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    boxShadow: '0 12px 36px rgba(40, 30, 20, 0.08), inset 0 1px 2px #ffffff',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5ded4',
  },
  tableScroll: {
    overflowX: 'auto',
  },
  auditTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.82rem',
    textAlign: 'left',
  },
  th: {
    padding: '8px 12px',
    background: 'rgba(244, 239, 232, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#443c32',
    fontWeight: '800',
    borderBottom: '2px solid rgba(212, 200, 184, 0.8)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(236, 228, 216, 0.6)',
    color: '#1a1612',
    whiteSpace: 'nowrap',
  }
};
