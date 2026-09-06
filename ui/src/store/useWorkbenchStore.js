import { create } from 'zustand';
import { SAMPLE_TOPOLOGY, INITIAL_REACT_TURNS } from '../assets/sampleData';

export const useWorkbenchStore = create((set, get) => ({
  // 1. Navigation & Theme
  activeTab: 'pid', // 'pid' | 'sandbox' | 'z3' | 'deliverables'
  theme: 'dark',    // 'dark' | 'light'
  quickDrawerOpen: false,
  ebpfModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    return { theme: nextTheme };
  }),
  setQuickDrawerOpen: (open) => set({ quickDrawerOpen: open }),
  setEbpfModalOpen: (open) => set({ ebpfModalOpen: open }),

  // 2. Air-Gap Sovereignty Telemetry
  airgapStatus: 'PASS',
  egressBytes: 0,
  throughputKbps: 0.0,
  openWanSockets: 0,
  openSockets: [
    { pid: 1028, laddr: '127.0.0.1:8000', raddr: '0.0.0.0:0', status: 'LISTEN', process: 'uvicorn (FastAPI Core)' },
    { pid: 1042, laddr: '127.0.0.1:5173', raddr: '0.0.0.0:0', status: 'LISTEN', process: 'vite (Workbench SPA)' },
    { pid: 1055, laddr: '127.0.0.1:54321', raddr: '127.0.0.1:8000', status: 'ESTABLISHED', process: 'msedge (Client IPC)' }
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
