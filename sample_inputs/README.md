# SMITRACE Demo Input Files — Manual Ingestion Suite

This directory contains authentic industrial inspection datasets and codebase files designed for **manual ingestion** during the live SMITRACE Sovereign AI Workbench demonstration.

---

## Directory Structure

```
sample_inputs/
├── piping/                               # Persona: Shiva (Lead Piping Integrity Engineer)
│   ├── CML-03_Degraded_Elbow_UT_Scan.csv # NDT ultrasonic survey showing critical wall thinning (0.178" vs 0.241" t_min)
│   ├── Circ_400_ASME_B31.3_Line_List.csv # Process engineering line list with operating pressures & materials
│   └── CML-01_Feed_Pump_Discharge_UT_Scan.csv # Compliant straight pipe survey (0.342" wall)
│
└── codebase/                             # Persona: Eshwari (Core Infrastructure Developer)
    ├── corrosion_evaluator_patch.py      # Python source module with API 510 §7.1.1 calculation logic
    └── test_api510_boundary.py           # Pytest unit tests verifying statutory boundary conditions
```

---

## How to Perform Manual Ingestion During the Demo

1. **Start the Workbench**: Ensure the Vite dev server is running (`http://localhost:5173/`).
2. **Login**: Authenticate as **Shiva** (Piping Engineer) or **Eshwari** (Platform Dev).
3. **Navigate to Permitted Documents & Ingestion**:
   - In the dropzone, either:
     - **Click "Browse Local Files"** and select any file from `sample_inputs/piping/` or `sample_inputs/codebase/`.
     - **OR Drag and Drop** files directly from Windows File Explorer into the dropzone.
4. **Observe Real-Time Sovereign Mechanics**:
   - Web Crypto computes the genuine **SHA-256 Merkle leaf** hash of the file bytes on your local machine with **0 network egress**.
   - The file appears in your active enclave vault labeled with a `(Manually Ingested)` badge.
   - Open the **Audit & Telemetry Dock** at the bottom to see the real-time cryptographic audit trail:
     - `[USER] Manually ingested document: <filename>`
     - `[PLATFORM] SHA-256 Merkle leaf registered and sealed into vault`
5. **Feed Scenario**:
   - Ingesting `CML-03_Degraded_Elbow_UT_Scan.csv` immediately loads the degraded elbow into Scenario 1 for ASME B31.3 mathematical calculation and Z3 SMT formal verification!
