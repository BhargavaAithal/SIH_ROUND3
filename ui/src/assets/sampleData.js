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
