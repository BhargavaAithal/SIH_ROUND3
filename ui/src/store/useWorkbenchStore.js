import { create } from 'zustand';
import { SAMPLE_TOPOLOGY, INITIAL_REACT_TURNS, SCENARIOS } from '../assets/sampleData';

export const useWorkbenchStore = create((set, get) => ({
  // 0. Presentation Scenario State
  activeScenario: 'baseline', // 'baseline' | 'corrosion' | 'surge'
  setScenario: (scenarioId) => {
    const sc = SCENARIOS[scenarioId];
    if (!sc) return;
    set((state) => {
      const p = sc.taskSpec.design_pressure;
      const d = sc.taskSpec.outside_diameter;
      const s = sc.taskSpec.allowable_stress;
      const e = sc.taskSpec.quality_factor;
      const y = sc.taskSpec.temp_coefficient;
      const c = sc.taskSpec.corrosion_allowance;
      const t_act = sc.taskSpec.actual_thickness;
      const code = `# ASME B31.3 Process Piping Thickness Calculation - ${sc.name}
import json

P = ${p.toFixed(1)}       # Design pressure (psig)
D = ${d.toFixed(2)}       # Outside diameter (in)
S = ${s.toFixed(1)}     # Allowable stress (psi)
E = ${e.toFixed(2)}         # Quality factor
Y = ${y.toFixed(2)}         # Temp coefficient
c = ${c.toFixed(4)}      # Corrosion allowance (in)
t_actual = ${t_act.toFixed(3)} # Measured thickness (in)

# Governing Equation: tm = (P * D) / (2 * (S * E + P * Y)) + c
t_m = (P * D) / (2 * (S * E + P * Y)) + c
margin = t_actual - t_m
verdict = "${sc.calculation.is_safe ? 'SAT' : 'UNSAT'}"

result = {
    "standard": "ASME_B31_3",
    "pipe_tag": "${sc.targetPipe}",
    "t_min": round(t_m, 4),
    "t_actual": round(t_actual, 4),
    "margin": round(margin, 4),
    "verdict": verdict
}
print(json.dumps(result))
`;

      return {
        activeScenario: scenarioId,
        selectedPipe: sc.targetPipe,
        selectedNode: sc.targetNode,
        taskSpec: sc.taskSpec,
        z3Result: sc.z3Result,
        turns: sc.turns,
        codeEditorContent: code,
        codeExecutionResult: {
          tag: sc.targetPipe,
          t_min: sc.calculation.t_min,
          t_actual: sc.calculation.t_actual,
          margin: sc.calculation.margin,
          verdict: sc.calculation.is_safe ? 'SAT' : 'UNSAT',
          output: `{"tag": "${sc.targetPipe}", "t_min": ${sc.calculation.t_min}, "margin": ${sc.calculation.margin}, "verdict": "${sc.calculation.is_safe ? 'SAT' : 'UNSAT'}"}`
        },
        quickDrawerOpen: true,
      };
    });
  },

  // 1. Navigation & Sequential Progression
  activeTab: 'ingest', // 'ingest' | 'pid' | 'sandbox' | 'z3' | 'deliverables'
  unlockedTabs: ['ingest'], // Strictly starts with only 'ingest' unlocked
  theme: 'dark',       // 'dark' | 'light'
  quickDrawerOpen: false,
  ebpfModalOpen: false,
  storageView: 'schematic', // 'schematic' | 'graph' | 'tables' | 'wal'

  setActiveTab: (tab) => set((state) => ({
    activeTab: tab,
    unlockedTabs: state.unlockedTabs.includes(tab) ? state.unlockedTabs : [...state.unlockedTabs, tab],
  })),
  unlockTab: (tabId) => set((state) => ({
    unlockedTabs: state.unlockedTabs.includes(tabId) ? state.unlockedTabs : [...state.unlockedTabs, tabId],
  })),
  setStorageView: (view) => set({ storageView: view }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    return { theme: nextTheme };
  }),
  setQuickDrawerOpen: (open) => set({ quickDrawerOpen: open }),
  setEbpfModalOpen: (open) => set({ ebpfModalOpen: open }),

  // 1.2. Guided Presenter Mode State (9 Defined Steps with Pauses)
  demoStep: 1, // 1 to 9
  showPresenterScript: true,
  setShowPresenterScript: (val) => set({ showPresenterScript: val }),

  goToDemoStep: (stepNum) => {
    const s = Math.max(1, Math.min(9, stepNum));
    const state = get();

    if (s === 1) {
      set({
        demoStep: 1,
        activeTab: 'ingest',
        currentBeat: 1,
        unlockedTabs: ['ingest'],
        showSystemLogs: false,
        ebpfModalOpen: false,
      });
      state.setScenario('baseline');
    } else if (s === 2) {
      set((st) => ({
        demoStep: 2,
        activeTab: 'ingest',
        currentBeat: 2,
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid'])),
        showSystemLogs: true,
        ebpfModalOpen: false,
      }));
    } else if (s === 3) {
      set((st) => ({
        demoStep: 3,
        activeTab: 'pid',
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid'])),
        ebpfModalOpen: false,
      }));
    } else if (s === 4) {
      set((st) => ({
        demoStep: 4,
        activeTab: 'sandbox',
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid', 'sandbox'])),
        quickDrawerOpen: false,
        ebpfModalOpen: false,
      }));
    } else if (s === 5) {
      set((st) => ({
        demoStep: 5,
        activeTab: 'sandbox',
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid', 'sandbox'])),
        quickDrawerOpen: true,
        ebpfModalOpen: false,
      }));
    } else if (s === 6) {
      state.setScenario('baseline');
      set((st) => ({
        demoStep: 6,
        activeTab: 'z3',
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid', 'sandbox', 'z3'])),
        ebpfModalOpen: false,
      }));
    } else if (s === 7) {
      state.setScenario('corrosion');
      set((st) => ({
        demoStep: 7,
        activeTab: 'z3',
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid', 'sandbox', 'z3'])),
        ebpfModalOpen: false,
      }));
    } else if (s === 8) {
      set((st) => ({
        demoStep: 8,
        activeTab: 'deliverables',
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid', 'sandbox', 'z3', 'deliverables'])),
        ebpfModalOpen: false,
      }));
    } else if (s === 9) {
      set((st) => ({
        demoStep: 9,
        unlockedTabs: Array.from(new Set([...st.unlockedTabs, 'ingest', 'pid', 'sandbox', 'z3', 'deliverables'])),
        ebpfModalOpen: true,
      }));
    }
  },

  nextDemoStep: () => {
    const next = Math.min(9, get().demoStep + 1);
    get().goToDemoStep(next);
  },

  prevDemoStep: () => {
    const prev = Math.max(1, get().demoStep - 1);
    get().goToDemoStep(prev);
  },

  // 1.5. 4-Beat Sovereign Pipeline Slice
  currentBeat: 1, // 1: Dump, 2: Vault, 3: Work, 4: Payoff
  activeCaseId: null, // null until Beat 2 ('CASE-2026-0091')
  casePath: '/srv/smitrace/cases/CASE-2026-0091/',
  showMathProofDrawer: false,
  showSystemLogs: false,
  ingestedFiles: [], // Starts strictly blank until user drops files
  caseFiles: [],
  isAnalyzing: false,
  analysisStep: 0, // 0 to 9
  analysisChecklist: [
    { id: 1, text: 'Scanned Inspection PDF — Ingestion & Memory Buffer', status: 'pending' },
    { id: 2, text: 'Local OCR + Vision — On-Premise Vision Processing (0 WAN)', status: 'pending' },
    { id: 3, text: 'Document Structure Extraction — CML Grids & Pipe Specs', status: 'pending' },
    { id: 4, text: 'Evidence Graph / Local RAG — Topology & Knowledge Grounding', status: 'pending' },
    { id: 5, text: 'Task Planner — Dispatching Reasoning Model, Knowledge Base & Calculation Tool', status: 'pending' },
    { id: 6, text: 'Verification (PASS / FAIL) — Formal Z3 SMT Solver (+2.06 mm, 0.0% FAR)', status: 'pending' },
    { id: 7, text: 'Approval Note Generator — PSU Statutory Memorandum Formatter', status: 'pending' },
    { id: 8, text: '.DOCX Deliverable — Native ISO/IEC 29500 OOXML Compilation', status: 'pending' },
    { id: 9, text: 'Cryptographic Execution Trace — SHA-256 Merkle WAL Sealed', status: 'pending' },
  ],
  // Backward compatibility aliases
  isAutonomousRunning: false,
  autonomousStep: 0,
  autonomousChecklist: [],
  systemLogs: [],

  setCurrentBeat: (beat) => set({ currentBeat: beat }),
  setActiveCaseId: (id) => set({ activeCaseId: id }),
  setShowMathProofDrawer: (show) => set({ showMathProofDrawer: show }),
  setShowSystemLogs: (show) => set({ showSystemLogs: show }),
  setIngestedFiles: (files) => set({ ingestedFiles: files }),
  setCaseFiles: (files) => set({ caseFiles: files }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val, isAutonomousRunning: val }),
  setAnalysisStep: (step) => set({ analysisStep: step, autonomousStep: step }),
  setAnalysisChecklist: (updater) => set((state) => {
    const nextChecklist = typeof updater === 'function' ? updater(state.analysisChecklist) : updater;
    return { analysisChecklist: nextChecklist, autonomousChecklist: nextChecklist };
  }),
  // Backward compatibility setters
  setIsAutonomousRunning: (val) => set({ isAnalyzing: val, isAutonomousRunning: val }),
  setAutonomousStep: (step) => set({ analysisStep: step, autonomousStep: step }),
  setAutonomousChecklist: (updater) => set((state) => {
    const nextChecklist = typeof updater === 'function' ? updater(state.analysisChecklist) : updater;
    return { analysisChecklist: nextChecklist, autonomousChecklist: nextChecklist };
  }),
  addSystemLog: (log) => set((state) => ({ systemLogs: [...state.systemLogs, log] })),
  clearSystemLogs: () => set({ systemLogs: [] }),

  resetToBeat1: () => set({
    currentBeat: 1,
    activeCaseId: null,
    activeTab: 'ingest',
    unlockedTabs: ['ingest'],
    ingestedFiles: [],
    caseFiles: [],
    isAnalyzing: false,
    analysisStep: 0,
    isAutonomousRunning: false,
    autonomousStep: 0,
    showMathProofDrawer: false,
    showSystemLogs: false,
    analysisChecklist: [
      { id: 1, text: 'Scanned Inspection PDF — Ingestion & Memory Buffer', status: 'pending' },
      { id: 2, text: 'Local OCR + Vision — On-Premise Vision Processing (0 WAN)', status: 'pending' },
      { id: 3, text: 'Document Structure Extraction — CML Grids & Pipe Specs', status: 'pending' },
      { id: 4, text: 'Evidence Graph / Local RAG — Topology & Knowledge Grounding', status: 'pending' },
      { id: 5, text: 'Task Planner — Dispatching Reasoning Model, Knowledge Base & Calculation Tool', status: 'pending' },
      { id: 6, text: 'Verification (PASS / FAIL) — Formal Z3 SMT Solver (+2.06 mm, 0.0% FAR)', status: 'pending' },
      { id: 7, text: 'Approval Note Generator — PSU Statutory Memorandum Formatter', status: 'pending' },
      { id: 8, text: '.DOCX Deliverable — Native ISO/IEC 29500 OOXML Compilation', status: 'pending' },
      { id: 9, text: 'Cryptographic Execution Trace — SHA-256 Merkle WAL Sealed', status: 'pending' },
    ],
    autonomousChecklist: [
      { id: 1, text: 'Scanned Inspection PDF — Ingestion & Memory Buffer', status: 'pending' },
      { id: 2, text: 'Local OCR + Vision — On-Premise Vision Processing (0 WAN)', status: 'pending' },
      { id: 3, text: 'Document Structure Extraction — CML Grids & Pipe Specs', status: 'pending' },
      { id: 4, text: 'Evidence Graph / Local RAG — Topology & Knowledge Grounding', status: 'pending' },
      { id: 5, text: 'Task Planner — Dispatching Reasoning Model, Knowledge Base & Calculation Tool', status: 'pending' },
      { id: 6, text: 'Verification (PASS / FAIL) — Formal Z3 SMT Solver (+2.06 mm, 0.0% FAR)', status: 'pending' },
      { id: 7, text: 'Approval Note Generator — PSU Statutory Memorandum Formatter', status: 'pending' },
      { id: 8, text: '.DOCX Deliverable — Native ISO/IEC 29500 OOXML Compilation', status: 'pending' },
      { id: 9, text: 'Cryptographic Execution Trace — SHA-256 Merkle WAL Sealed', status: 'pending' },
    ],
    systemLogs: [],
    demoStep: 1,
    activeScenario: 'baseline',
    quickDrawerOpen: false,
  }),

  // 2. Air-Gap Sovereignty Telemetry
  airgapStatus: 'PASS',
  egressBytes: 0,
  throughputKbps: 0.0,
  openWanSockets: 0,
  openSockets: [
    { pid: 18700, laddr: '127.0.0.1:5173', raddr: '-', status: 'LISTEN', process: 'node (Vite SPA)' },
    { pid: 19996, laddr: '127.0.0.1:8000', raddr: '-', status: 'LISTEN', process: 'python (FastAPI Core)' },
  ],
  lastAuditTimestamp: new Date().toISOString(),
  merkleAuditHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',

  setAirgapTelemetry: (telemetry) => set((state) => ({
    ...state,
    ...telemetry,
    lastAuditTimestamp: new Date().toISOString(),
  })),

  // 3. P&ID Topology & Selection
  topology: SAMPLE_TOPOLOGY,
  selectedNode: 'V-101',
  selectedPipe: '16"-P-101-CS-150',
  zoomLevel: 0.38,
  panOffset: { x: 60, y: 30 },
  visibleLayers: { equipment: true, piping: true, tags: true, annotations: true },

  setTopology: (topology) => set({ topology }),
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId, quickDrawerOpen: true }),
  setSelectedPipe: (pipeTag) => set({ selectedPipe: pipeTag, quickDrawerOpen: true }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(0.2, Math.min(5.0, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setCanvasState: (zoom, pan) => set({
    zoomLevel: Math.max(0.2, Math.min(5.0, zoom)),
    panOffset: pan,
  }),
  toggleLayer: (layer) => set((state) => ({
    visibleLayers: { ...state.visibleLayers, [layer]: !state.visibleLayers[layer] }
  })),

  // 4. ReAct Calculation Sandbox
  taskSpec: {
    task_id: 'TASK-CDU-ASME-01',
    description: 'Verify CDU-1 crude charge line wall thickness per ASME B31.3 Section 304.1.2',
    design_pressure: 400.0,
    outside_diameter: 16.0,
    allowable_stress: 20000.0,
    quality_factor: 1.0,
    temp_coefficient: 0.4,
    corrosion_allowance: 0.0625,
    actual_thickness: 0.320,
  },
  turns: INITIAL_REACT_TURNS,
  activeTurnIndex: 2,
  isExecutingAgent: false,
  codeEditorContent: `# ASME B31.3 Process Piping Thickness Calculation
import json

P = 400.0       # Design pressure (psig)
D = 16.0        # Outside diameter (in)
S = 20000.0     # Allowable stress (psi)
E = 1.0         # Quality factor
Y = 0.4         # Temp coefficient
c = 0.0625      # Corrosion allowance (in)
t_actual = 0.320 # Measured thickness (in)

# Governing Equation: tm = (P * D) / (2 * (S * E + P * Y)) + c
t_m = (P * D) / (2 * (S * E + P * Y)) + c
margin = t_actual - t_m
verdict = "SAT" if margin >= 0 else "UNSAT"

result = {
    "standard": "ASME_B31_3",
    "t_min": round(t_m, 4),
    "t_actual": round(t_actual, 4),
    "margin": round(margin, 4),
    "verdict": verdict
}
print(json.dumps(result))
`,
  codeExecutionResult: null,

  setTaskSpec: (spec) => set((state) => ({ taskSpec: { ...state.taskSpec, ...spec } })),
  setActiveTurnIndex: (index) => set({ activeTurnIndex: index }),
  setExecutingAgent: (executing) => set({ isExecutingAgent: executing }),
  addAgentTurn: (turnData) => set((state) => ({ turns: [...state.turns, turnData] })),
  setCodeEditorContent: (code) => set({ codeEditorContent: code }),
  setCodeExecutionResult: (res) => set({ codeExecutionResult: res }),

  // 5. Neurosymbolic Z3 Verifier
  z3Result: {
    status: 'SAT',
    is_valid: true,
    t_min: 0.22123015873,
    t_actual: 0.32,
    margin: 0.09876984127,
    violations: [],
    rational_tm: '223/1008',
    model_details: {
      P: 400.0,
      D: 16.0,
      S: 20000.0,
      E: 1.0,
      Y: 0.4,
      c: 0.0625,
      pressure_ratio: 0.01984,
    },
    proof_log: `;; Formal SMT-LIB2 / Z3 Assertion Transcript
(declare-const tm Real)
(assert (= tm (+ (/ (* 400.0 16.0) (* 2.0 (+ (* 20000.0 1.0) (* 400.0 0.4)))) (/ 1 16))))
(assert (>= 0.32 tm))
(check-sat)
;; Result: SAT
;; Exact rational tm = 223/1008 in (0.2212301587301587 in)
;; Proof Margin = +0.0987698412698413 in
;; Physical Constraints: P>0 [SAT], D>0 [SAT], S>0 [SAT], 0<E<=1 [SAT], 0<=Y<=1 [SAT], c>=0 [SAT], t_actual>=tm [SAT]
;; False Assurance Rate: 0.000% across all evaluated boundaries`,
    far_rate: 0.0,
    cumulative_trials: 2200,
  },

  setZ3Result: (result) => set({ z3Result: result }),

  // 6. Deliverables Slice
  activeDeliverableTab: 'docx', // 'docx' | 'xlsx'
  activeWorkbookSheet: 'ASME_B31_3_Piping',
  isGeneratingDeliverable: false,

  setActiveDeliverableTab: (tab) => set({ activeDeliverableTab: tab }),
  setActiveWorkbookSheet: (sheet) => set({ activeWorkbookSheet: sheet }),
  setGeneratingDeliverable: (gen) => set({ isGeneratingDeliverable: gen }),
}));
