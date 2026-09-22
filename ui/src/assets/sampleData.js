// Ground-truth engineering models and P&ID topology for CDU-1
export const SAMPLE_TOPOLOGY = {
  drawing_id: 'PID-CDU-01-REV4',
  title: 'Atmospheric Distillation Unit Crude Ingestion & Pre-Heat Train',
  dimensions: { width: 4000, height: 3000 },
  nodes: [
    {
      id: 'V-101',
      tag: 'V-101',
      type: 'equipment',
      equipment_type: 'vessel',
      label: 'Crude Surge Drum',
      centroid: [600, 1400],
      bbox: [480, 1200, 720, 1600],
      status: 'OPERATIONAL',
      attributes: {
        design_pressure: 1.96,
        outside_diameter: 2400.0,
        material: 'SA-516 Gr. 70',
        measured_thickness: 24.5,
        nominal_thickness: 25.0,
        t_min: 18.2,
        corrosion_rate: 0.12,
        corrosion_allowance: 3.0,
      }
    },
    {
      id: '10-P-101A',
      tag: '10-P-101A',
      type: 'equipment',
      equipment_type: 'pump',
      label: 'Crude Charge Pump A',
      centroid: [1400, 2100],
      bbox: [1300, 2020, 1500, 2180],
      status: 'OPERATIONAL',
      attributes: {
        service: 'Crude Ingestion',
        capacity_m3h: 650.0,
        differential_head_m: 145.0,
        motor_power_kw: 315.0,
        casing_material: 'ASTM A216 WCB',
        suction_flange: '16" 150# RF',
        discharge_flange: '10" 300# RF'
      }
    },
    {
      id: '10-P-101B',
      tag: '10-P-101B',
      type: 'equipment',
      equipment_type: 'pump',
      label: 'Crude Charge Pump B (Standby)',
      centroid: [1400, 2550],
      bbox: [1300, 2470, 1500, 2630],
      status: 'STANDBY',
      attributes: {
        service: 'Crude Ingestion Standby',
        capacity_m3h: 650.0,
        differential_head_m: 145.0,
        motor_power_kw: 315.0,
        casing_material: 'ASTM A216 WCB',
        suction_flange: '16" 150# RF',
        discharge_flange: '10" 300# RF'
      }
    },
    {
      id: 'E-101',
      tag: 'E-101',
      type: 'equipment',
      equipment_type: 'exchanger',
      label: 'Crude / Residue Preheater',
      centroid: [2400, 1400],
      bbox: [2220, 1250, 2580, 1550],
      status: 'OPERATIONAL',
      attributes: {
        type: 'Shell & Tube (AES)',
        shell_id_mm: 1100.0,
        shell_design_pressure: 2.45,
        tube_design_pressure: 3.80,
        shell_material: 'SA-516 Gr. 70',
        tube_material: 'Carbon Steel seamless',
        duty_mw: 14.8
      }
    },
    {
      id: 'FCV-202',
      tag: 'FCV-202',
      type: 'valve',
      equipment_type: 'valve',
      label: 'Crude Flow Control Valve',
      centroid: [1950, 1400],
      bbox: [1900, 1360, 2000, 1440],
      status: 'OPERATIONAL',
      attributes: {
        size: '10"',
        rating: 'Class 300#',
        actuator: 'Pneumatic Diaphragm',
        fail_action: 'Fail Open (FO)',
        cv_rating: 420.0
      }
    },
    {
      id: 'TK-500',
      tag: 'TK-500',
      type: 'equipment',
      equipment_type: 'tank',
      label: 'Crude Feed Storage Tank',
      centroid: [3300, 1200],
      bbox: [3150, 1050, 3450, 1350],
      status: 'OPERATIONAL',
      attributes: {
        type: 'External Floating Roof',
        diameter_m: 48.0,
        height_m: 18.0,
        capacity_m3: 32000.0,
        design_standard: 'API 650'
      }
    }
  ],
  edges: [
    {
      id: 'pipe-16-cr-101',
      source: 'V-101',
      target: '10-P-101A',
      tag: '16"-P-101-CS-150',
      color: '#10B981',
      verdict: 'SAT',
      path: [[720, 1400], [1050, 1400], [1050, 2100], [1300, 2100]],
      attributes: {
        outside_diameter: 406.4,
        nominal_od_in: 16.0,
        design_pressure: 1.96,
        allowable_stress: 137.9,
        quality_factor: 1.0,
        temp_coefficient: 0.4,
        corrosion_allowance: 3.0,
        measured_thickness: 9.52,
        t_min: 5.86,
        margin: 3.66,
        schedule: 'Sch 40',
        rating: 'Class 150#'
      }
    },
    {
      id: 'pipe-16-cr-102',
      source: 'V-101',
      target: '10-P-101B',
      tag: '16"-P-102-CS-150',
      color: '#10B981',
      verdict: 'SAT',
      path: [[1050, 2100], [1050, 2550], [1300, 2550]],
      attributes: {
        outside_diameter: 406.4,
        nominal_od_in: 16.0,
        design_pressure: 1.96,
        allowable_stress: 137.9,
        quality_factor: 1.0,
        temp_coefficient: 0.4,
        corrosion_allowance: 3.0,
        measured_thickness: 9.52,
        t_min: 5.86,
        margin: 3.66,
        schedule: 'Sch 40',
        rating: 'Class 150#'
      }
    },
    {
      id: 'pipe-10-cr-103',
      source: '10-P-101A',
      target: 'FCV-202',
      tag: '10"-P-103-CS-300',
      color: '#06B6D4',
      verdict: 'SAT',
      path: [[1500, 2100], [1750, 2100], [1750, 1400], [1900, 1400]],
      attributes: {
        outside_diameter: 273.0,
        nominal_od_in: 10.0,
        design_pressure: 3.80,
        allowable_stress: 137.9,
        quality_factor: 1.0,
        temp_coefficient: 0.4,
        corrosion_allowance: 3.0,
        measured_thickness: 9.27,
        t_min: 6.71,
        margin: 2.56,
        schedule: 'Sch 40',
        rating: 'Class 300#'
      }
    },
    {
      id: 'pipe-10-cr-104',
      source: 'FCV-202',
      target: 'E-101',
      tag: '10"-P-104-CS-300',
      color: '#06B6D4',
      verdict: 'SAT',
      path: [[2000, 1400], [2220, 1400]],
      attributes: {
        outside_diameter: 273.0,
        nominal_od_in: 10.0,
        design_pressure: 3.80,
        allowable_stress: 137.9,
        quality_factor: 1.0,
        temp_coefficient: 0.4,
        corrosion_allowance: 3.0,
        measured_thickness: 9.27,
        t_min: 6.71,
        margin: 2.56,
        schedule: 'Sch 40',
        rating: 'Class 300#'
      }
    },
    {
      id: 'pipe-12-cr-105',
      source: 'E-101',
      target: 'TK-500',
      tag: '12"-P-105-CS-150',
      color: '#EF4444',
      verdict: 'UNSAT',
      path: [[2580, 1400], [2850, 1400], [2850, 1200], [3150, 1200]],
      attributes: {
        outside_diameter: 323.8,
        nominal_od_in: 12.0,
        design_pressure: 2.45,
        allowable_stress: 137.9,
        quality_factor: 1.0,
        temp_coefficient: 0.4,
        corrosion_allowance: 3.0,
        measured_thickness: 5.20,
        t_min: 5.85,
        margin: -0.65,
        schedule: 'Sch 20',
        rating: 'Class 150#'
      }
    }
  ]
};

export const INITIAL_REACT_TURNS = [
  {
    turn: 1,
    category: 'AST_VIOLATION',
    status: 'BLOCKED',
    thought: 'Synthesizing calculation script. Querying external API for temperature stress curves.',
    script: 'import socket\nimport json\ns = socket.socket()\nprint("Fetching curves...")',
    violations: ['Forbidden module: socket [Rule: ZERO_WAN_EGRESS]'],
    hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    stalled: false,
  },
  {
    turn: 2,
    category: 'RUNTIME_ERROR',
    status: 'RECOVERING',
    thought: 'Removing socket import. Calculating using local ASME formula with uninitialized variable.',
    script: 'import json\nt_m = (P * D) / (2 * S)\nprint(t_m)',
    violations: [],
    stderr: "NameError: name 'P' is not defined",
    hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    stalled: false,
  },
  {
    turn: 3,
    category: 'CONVERGED',
    status: 'SAT',
    thought: 'Correcting parameter bindings. Initializing all variables explicitly from ImmutableSpec.',
    script: 'import json\nP, D, S, E, Y, c, t_act = 400.0, 16.0, 20000.0, 1.0, 0.4, 0.0625, 0.320\nt_m = (P * D) / (2 * (S * E + P * Y)) + c\nmargin = t_act - t_m\nout = {"tag": "16-P-101", "t_min": t_m, "margin": margin, "verdict": "SAT"}\nprint(json.dumps(out))',
    violations: [],
    stdout: '{"tag": "16-P-101", "t_min": 0.2217, "margin": 0.0983, "verdict": "SAT"}',
    duration_sec: 0.018,
    memory_peak_mb: 14.2,
    hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    stalled: false,
  }
];

export const SAMPLE_WORKBOOK_DATA = {
  Summary: [
    { Parameter: 'Facility', Value: 'Paradip Refinery - CDU-1' },
    { Parameter: 'Governing Standards', Value: 'ASME B31.3 Section 304.1.2 / API 510' },
    { Parameter: 'Formal Verification Solver', Value: 'Z3 SMT Solver v4.12.2' },
    { Parameter: 'False Assurance Rate (FAR)', Value: '0.0000%' },
    { Parameter: 'WAN Egress Bytes', Value: '0 Bytes (Loopback Air-Gap Active)' },
  ],
  ASME_B31_3_Piping: [
    { Point_ID: 'UT-PT-01', Line_Tag: '16"-P-101-CS-150', Pressure_psi: 400.0, OD_in: 16.0, Stress_psi: 20000.0, E: 1.0, Y: 0.4, CA_in: 0.0625, t_actual_in: 0.320, t_min_in: '= (C2*D2)/(2*(E2*F2 + C2*G2)) + H2', Margin_in: '= I2 - J2', Status: 'SAT' },
    { Point_ID: 'UT-PT-02', Line_Tag: '12"-P-105-CS-150', Pressure_psi: 355.0, OD_in: 12.75, Stress_psi: 20000.0, E: 1.0, Y: 0.4, CA_in: 0.125, t_actual_in: 0.210, t_min_in: '= (C3*D3)/(2*(E3*F3 + C3*G3)) + H3', Margin_in: '= I3 - J3', Status: 'UNSAT' },
    { Point_ID: 'UT-PT-03', Line_Tag: '10"-P-103-CS-300', Pressure_psi: 550.0, OD_in: 10.75, Stress_psi: 20000.0, E: 1.0, Y: 0.4, CA_in: 0.125, t_actual_in: 0.365, t_min_in: '= (C4*D4)/(2*(E4*F4 + C4*G4)) + H4', Margin_in: '= I4 - J4', Status: 'SAT' },
  ],
  API_510_Vessels: [
    { Vessel_Tag: 'V-101', Component: 'Shell Course 1', P_Design_psi: 285.0, Radius_in: 48.0, Stress_psi: 17500.0, E: 0.85, t_actual_in: 0.965, t_min_in: '= (C2*D2)/(E2*F2 - 0.6*C2)', Corrosion_Rate_ipy: 0.005, Remaining_Life_yrs: '= (G2-H2)/I2', Status: 'SAT' },
    { Vessel_Tag: 'V-101', Component: 'Top Head (2:1)', P_Design_psi: 285.0, Radius_in: 48.0, Stress_psi: 17500.0, E: 1.00, t_actual_in: 0.820, t_min_in: '= (C3*D3)/(2*E3*F3 - 0.2*C3)', Corrosion_Rate_ipy: 0.004, Remaining_Life_yrs: '= (G3-H3)/I3', Status: 'SAT' }
  ]
};

export const SCENARIOS = {
  baseline: {
    id: 'baseline',
    name: 'Scenario 1: Normal Operating Baseline',
    shortLabel: '1. Baseline (Safe)',
    status: 'SAFE',
    verdict: 'SAT',
    badgeColor: '#10B981',
    description: 'Line 16"-P-101-CS-150: Normal crude charge line with +2.49 mm structural reserve margin.',
    targetPipe: '16"-P-101-CS-150',
    targetNode: 'V-101',
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
    calculation: {
      t_min: 0.2212,
      t_actual: 0.3200,
      margin: 0.0988,
      margin_pct: 44.7,
      verdict: 'PIPE IS SAFE TO OPERATE',
      is_safe: true,
    },
    safetyChecks: [
      { id: 'rule-thickness', title: 'Pipe Wall Thickness Check', subtitle: 'Actual 0.3200" exceeds minimum 0.2212" by +0.0988" (+2.49 mm)', passed: true },
      { id: 'rule-pressure', title: 'Operating Pressure Limit Check', subtitle: 'Pressure 400.0 psig is well within maximum allowable working pressure (578.4 psig)', passed: true },
      { id: 'rule-corrosion', title: 'Corrosion Reserve Buffer Check', subtitle: 'Corrosion allowance 0.0625" intact with 24.8 years remaining life', passed: true },
      { id: 'rule-material', title: 'Material Strength & Joint Factor Check', subtitle: 'Allowable stress 20,000 psi with joint efficiency E=1.00 fully compliant', passed: true },
    ],
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
;; Proof Margin = +0.0987698412698413 in (+2.509 mm)
;; Physical Invariant: t_actual >= tm [SAT - PROVED]
;; False Assurance Rate: 0.0000% across all evaluated boundaries`,
      far_rate: 0.0,
      cumulative_trials: 2200,
    },
    turns: INITIAL_REACT_TURNS,
    deliverables: {
      memoFilename: 'baseline_psu_memo.docx',
      memoDownloadUrl: '/deliverables/baseline_psu_memo.docx',
      workbookFilename: 'baseline_inspection_workbook.xlsx',
      workbookDownloadUrl: '/deliverables/baseline_inspection_workbook.xlsx',
      memoTitle: 'STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE',
      memoRef: 'PSU/IOCL/MECH/2026/089',
      statusText: 'SAFE FOR CONTINUED UNRESTRICTED OPERATION',
      recommendation: 'SAFE FOR CONTINUED UNRESTRICTED OPERATION. Line 16"-P-101-CS-150 demonstrates a remaining corrosion allowance margin of +2.49 mm (+0.098 in) above ASME B31.3 statutory minimum wall thickness. Formal Z3 SMT solver confirms 0.000% False Assurance Rate across all operational boundaries.',
    }
  },
  corrosion: {
    id: 'corrosion',
    name: 'Critical Pipe Thinning & Corrosion Hazard',
    shortLabel: '2. Corrosion Alert (Hazard)',
    status: 'HAZARD',
    verdict: 'UNSAT',
    badgeColor: '#EF4444',
    description: 'Line 12"-P-105-CS-150: Severe wall thinning (-0.65 mm below ASME minimum required). Execution blocked.',
    targetPipe: '12"-P-105-CS-150',
    targetNode: 'E-101',
    taskSpec: {
      task_id: 'TASK-CDU-ASME-02-ALERT',
      description: 'Audit CDU-1 preheater rundown line 12"-P-105 following localized ultrasonic corrosion scan',
      design_pressure: 355.0,
      outside_diameter: 12.75,
      allowable_stress: 20000.0,
      quality_factor: 1.0,
      temp_coefficient: 0.4,
      corrosion_allowance: 0.1250,
      actual_thickness: 0.210,
    },
    calculation: {
      t_min: 0.2304,
      t_actual: 0.2100,
      margin: -0.0204,
      margin_pct: -8.85,
      verdict: 'PIPE IS TOO THIN - IMMEDIATE ACTION REQUIRED',
      is_safe: false,
    },
    safetyChecks: [
      { id: 'rule-thickness', title: 'Pipe Wall Thickness Check', subtitle: 'CRITICAL DEFICIT: Measured 0.2100" is below required 0.2304" by -0.0204" (-0.65 mm)', passed: false },
      { id: 'rule-pressure', title: 'Operating Pressure Limit Check', subtitle: 'Working pressure 355.0 psig exceeds safe rating of degraded pipe (323.5 psig)', passed: false },
      { id: 'rule-corrosion', title: 'Corrosion Reserve Buffer Check', subtitle: 'EXHAUSTED: Structural reserve has eroded into base design thickness (0.0 yrs life)', passed: false },
      { id: 'rule-material', title: 'Material Strength & Joint Factor Check', subtitle: 'Material SA-106 B acceptable, but cross-sectional area inadequate for hoop stress', passed: true },
    ],
    z3Result: {
      status: 'UNSAT',
      is_valid: false,
      t_min: 0.2304128,
      t_actual: 0.210,
      margin: -0.0204128,
      violations: [
        'Physical Invariant `t_actual >= tm` VIOLATED: 0.2100 in < 0.2304 in (Deficit: -0.0204 in / -0.65 mm)',
        'ASME B31.3 Section 304.1.2: Operating pressure exceeds derated burst threshold',
        'Z3 Neurosymbolic Safety Gate: Execution BLOCKED to prevent false assurance'
      ],
      rational_tm: '288/1250',
      model_details: {
        P: 355.0,
        D: 12.75,
        S: 20000.0,
        E: 1.0,
        Y: 0.4,
        c: 0.1250,
        pressure_ratio: 0.0176,
      },
      proof_log: `;; Formal SMT-LIB2 / Z3 Assertion Transcript
(declare-const tm Real)
(assert (= tm (+ (/ (* 355.0 12.75) (* 2.0 (+ (* 20000.0 1.0) (* 355.0 0.4)))) (/ 1 8))))
(assert (>= 0.210 tm))
(check-sat)
;; Result: UNSAT [SAFETY INVARIANT REFUTED]
;; Required minimum tm = 0.2304128 in (5.852 mm)
;; Measured thickness = 0.2100000 in (5.207 mm)
;; Structural Deficit = -0.0204128 in (-0.645 mm)
;; Formal Refutation: Invariant \`(assert (>= 0.210 tm))\` has no satisfying assignment!
;; SMT Verdict: UNSAT — ALL AUTOMATED ACTION PERMITS FROZEN`,
      far_rate: 0.0,
      cumulative_trials: 2200,
    },
    turns: [
      {
        turn: 1,
        category: 'INPUT_INGESTION',
        status: 'ANALYZING',
        thought: 'Ingesting ultrasonic thickness report for line 12"-P-105-CS-150. Measured wall thickness: 0.210".',
        script: '# Inspecting ultrasonic gauging records\nP, D, S, c, t_act = 355.0, 12.75, 20000.0, 0.125, 0.210\nprint("Evaluating ASME B31.3 min thickness...")',
        violations: [],
        stdout: 'Evaluating ASME B31.3 min thickness...',
        duration_sec: 0.012,
        hash: '2e86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        stalled: false,
      },
      {
        turn: 2,
        category: 'SAFETY_VIOLATION',
        status: 'INTERCEPTED',
        thought: 'Calculation indicates t_m = 0.2304", which exceeds measured thickness 0.210". Z3 solver triggered.',
        script: '# AST & SMT Guard Check\nif t_act < t_m:\n    raise SafetyConstraintViolation("CRITICAL DEFICIT: -0.65mm")',
        violations: ['Z3 Formal Guard: Physical safety invariant `t_actual >= t_m` violated!'],
        stderr: 'SafetyConstraintViolation: Actual thickness 0.210" < Statutory minimum 0.2304" (Deficit: -0.0204")',
        hash: '7c884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        stalled: false,
      },
      {
        turn: 3,
        category: 'EXECUTION_BLOCKED',
        status: 'UNSAT',
        thought: 'Deterministic ASME approval BLOCKED. Synthesizing emergency repair order and PSU statutory alert memo.',
        script: '# Emergency Alert Memo Generation\nout = {"tag": "12-P-105", "verdict": "UNSAT", "action": "IMMEDIATE_SPOOL_REPLACEMENT"}\nprint(json.dumps(out))',
        violations: ['Statutory breach: Line isolated from operational permits'],
        stdout: '{"tag": "12-P-105", "verdict": "UNSAT", "action": "IMMEDIATE_SPOOL_REPLACEMENT", "deficit_mm": -0.65}',
        duration_sec: 0.015,
        hash: '9a227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        stalled: false,
      }
    ],
    deliverables: {
      memoFilename: 'corrosion_hazard_memo.docx',
      memoDownloadUrl: '/deliverables/corrosion_hazard_memo.docx',
      workbookFilename: 'corrosion_hazard_workbook.xlsx',
      workbookDownloadUrl: '/deliverables/corrosion_hazard_workbook.xlsx',
      memoTitle: 'STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE',
      memoRef: 'PSU/IOCL/CRIT-ALERT/2026/014',
      statusText: 'CRITICAL STATUTORY ALERT: IMMEDIATE LINE REPLACEMENT REQUIRED',
      recommendation: 'CRITICAL NON-COMPLIANCE: IMMEDIATE WORK PERMIT SUSPENSION & PIPE REPLACEMENT MANDATED. Line 12"-P-105-CS-150 wall thickness (0.2100 in / 5.20 mm) has degraded below the statutory minimum code threshold of 0.2304 in (5.85 mm), resulting in a severe deficit margin of -0.0204 in (-0.65 mm). The Z3 SMT formal verifier has rejected safe operation.',
    }
  },
  surge: {
    id: 'surge',
    name: 'High Pressure Surge Anomaly',
    shortLabel: '3. Pressure Surge (Anomaly)',
    status: 'WARNING',
    verdict: 'WARNING',
    badgeColor: '#F59E0B',
    description: 'Line 10"-P-103-CS-300: Transient pressure surge spike to 650 psig (design 550 psig). AI self-correction active.',
    targetPipe: '10"-P-103-CS-300',
    targetNode: 'FCV-202',
    taskSpec: {
      task_id: 'TASK-CDU-ASME-03-SURGE',
      description: 'Transient pressure surge analysis on booster pump discharge header line 10"-P-103',
      design_pressure: 650.0,
      outside_diameter: 10.75,
      allowable_stress: 20000.0,
      quality_factor: 1.0,
      temp_coefficient: 0.4,
      corrosion_allowance: 0.1250,
      actual_thickness: 0.365,
    },
    calculation: {
      t_min: 0.3802,
      t_actual: 0.3650,
      margin: -0.0152,
      margin_pct: -4.0,
      verdict: 'SURGE OVERPRESSURE - RELIEF VALVE RECALIBRATION REQUIRED',
      is_safe: false,
    },
    safetyChecks: [
      { id: 'rule-thickness', title: 'Pipe Wall Thickness Check', subtitle: 'At normal 550 psi: Safe (+0.045"). Under 650 psi surge: Deficit of -0.0152" (-0.38 mm)', passed: false },
      { id: 'rule-pressure', title: 'Operating Pressure Limit Check', subtitle: 'WARNING: Transient pressure 650 psig exceeds nominal design rating of 550 psig', passed: false },
      { id: 'rule-corrosion', title: 'Corrosion Reserve Buffer Check', subtitle: 'Base corrosion allowance 0.1250" intact; failure driven purely by surge overpressure', passed: true },
      { id: 'rule-material', title: 'Material Strength & Joint Factor Check', subtitle: 'Temporary hoop stress elevated to 118% of basic allowable stress', passed: false },
    ],
    z3Result: {
      status: 'UNSAT',
      is_valid: false,
      t_min: 0.38024,
      t_actual: 0.365,
      margin: -0.01524,
      violations: [
        'Transient overpressure of 650 psig exceeds ASME B31.3 Section 302.2.4 allowable duration limits',
        'Required wall thickness at surge peak (0.3802 in) exceeds actual ultrasonic measurement (0.3650 in)',
        'Pressure Relief Valve PRV-202 set point recalibration mandatory'
      ],
      rational_tm: '4753/12500',
      model_details: {
        P: 650.0,
        D: 10.75,
        S: 20000.0,
        E: 1.0,
        Y: 0.4,
        c: 0.1250,
        pressure_ratio: 0.0321,
      },
      proof_log: `;; Formal SMT-LIB2 / Z3 Assertion Transcript
(declare-const tm Real)
(assert (= tm (+ (/ (* 650.0 10.75) (* 2.0 (+ (* 20000.0 1.0) (* 650.0 0.4)))) (/ 1 8))))
(assert (>= 0.365 tm))
(check-sat)
;; Result: UNSAT under 650.0 psig surge
;; Required tm @ surge = 0.38024 in (9.658 mm)
;; Actual measured thickness = 0.36500 in (9.271 mm)
;; Margin = -0.01524 in (-0.387 mm)
;; Code Recommendation: Recalibrate PRV-202 to clamp peak pressure at 525 psig`,
      far_rate: 0.0,
      cumulative_trials: 2200,
    },
    turns: [
      {
        turn: 1,
        category: 'SURGE_INGESTION',
        status: 'ANALYZING',
        thought: 'SCADA transient monitor captured 650 psig surge on CDU-1 booster pump discharge.',
        script: '# Ingesting SCADA high-speed pressure logs\nP_peak = 650.0\nprint(f"Evaluating transient overpressure: {P_peak} psig")',
        violations: [],
        stdout: 'Evaluating transient overpressure: 650.0 psig',
        duration_sec: 0.014,
        hash: '3f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        stalled: false,
      },
      {
        turn: 2,
        category: 'RE-RATING_CALCULATION',
        status: 'SELF_CORRECTING',
        thought: 'Surge exceeds basic allowable stress. Calculating Maximum Allowable Working Pressure (MAWP).',
        script: '# Calculating allowable MAWP\nD, S, E, Y, c, t_act = 10.75, 20000.0, 1.0, 0.4, 0.125, 0.365\nmawp = (2 * S * E * (t_act - c)) / (D - 2 * Y * (t_act - c))\nprint(f"Safe MAWP limit: {mawp:.1f} psig")',
        violations: [],
        stdout: 'Safe MAWP limit: 588.6 psig (Surge 650 psig exceeds safe limit by 61.4 psig)',
        duration_sec: 0.016,
        hash: '8d884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        stalled: false,
      },
      {
        turn: 3,
        category: 'CONVERGED_ACTION',
        status: 'RESOLVED',
        thought: 'Deterministic engine derived safety recommendation: readjust PRV-202 set-point to 525 psig.',
        script: '# Outputting statutory mitigation mandate\nout = {"tag": "10-P-103", "verdict": "WARNING", "action": "RECALIBRATE_PRV_202", "setpoint_psig": 525.0}\nprint(json.dumps(out))',
        violations: [],
        stdout: '{"tag": "10-P-103", "verdict": "WARNING", "action": "RECALIBRATE_PRV_202", "setpoint_psig": 525.0}',
        duration_sec: 0.018,
        hash: '5b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        stalled: false,
      }
    ],
    deliverables: {
      memoFilename: 'pressure_surge_memo.docx',
      memoDownloadUrl: '/deliverables/pressure_surge_memo.docx',
      workbookFilename: 'pressure_surge_workbook.xlsx',
      workbookDownloadUrl: '/deliverables/pressure_surge_workbook.xlsx',
      memoTitle: 'STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE',
      memoRef: 'PSU/IOCL/SURGE-EVAL/2026/007',
      statusText: 'SURGE EVENT RE-EVALUATION & PRV RECALIBRATION REQUIRED',
      recommendation: 'SURGE EVENT RE-EVALUATION REQUIRED. Process control telemetry recorded a transient surge pressure spike to 650 psig (design 550 psig). AI ReAct self-correction engine evaluated allowable stress and concluded that line 10"-P-103-CS-300 requires relief valve recalibration and PRV-202 set-point readjustment to 525 psig to restore full code structural margin.',
    }
  }
};

