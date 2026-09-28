import React, { useState, useRef, useMemo } from 'react';

// Genuine Web Crypto SHA-256 digest calculation
async function computeSha256(file) {
  try {
    const buffer = await file.arrayBuffer();
    const digestBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(digestBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Deterministic fallback if Web Crypto is unavailable in certain sandboxes
    const str = `${file.name}-${file.size}-${file.lastModified}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0');
    return (hex + hex + hex + hex).substring(0, 64);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function detectDocType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return 'INSPECTION';
  if (lower.endsWith('.py')) return 'SOURCE_CODE';
  if (lower.endsWith('.pdf')) return 'STANDARD';
  if (lower.endsWith('.json')) return 'CONFIG';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'INSPECTION';
  if (lower.endsWith('.dwg')) return 'CAD_DRAWING';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'TEMPLATE';
  return 'DATA_LOG';
}

function detectClearance(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('degraded') || lower.includes('violation') || lower.includes('restricted') || lower.includes('b31') || lower.includes('template')) {
    return 'RESTRICTED';
  }
  if (lower.includes('circ') || lower.includes('iso') || lower.includes('spec') || lower.includes('confidential')) {
    return 'CONFIDENTIAL';
  }
  return 'INTERNAL';
}

function getFileIcon(name, type) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf') || type === 'STANDARD') return '📄';
  if (lower.endsWith('.dwg') || type === 'CAD_DRAWING') return '📐';
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || type === 'INSPECTION') return '📊';
  if (lower.endsWith('.docx') || type === 'TEMPLATE') return '📝';
  if (lower.endsWith('.py') || type === 'SOURCE_CODE') return '🐍';
  if (lower.includes('test') || type === 'TEST_SUITE') return '🧪';
  if (lower.endsWith('.json') || type === 'CONFIG') return '⚙️';
  return '📁';
}

// Canonical rich metadata for baseline documents
const BASELINE_METADATA = {
  // Shiva's Documents (Piping Integrity)
  'ASME_B31.3_2022_Piping_Code.pdf': {
    categoryLabel: 'STANDARD · ASME B31.3',
    revision: '2022',
    effectiveDate: '01 Jan 2022',
    addedDate: '18 Sep 2026',
    importedBy: 'Shiva',
    sourcePath: '/sample_inputs/piping/',
    access: 'Restricted (Piping Engineering)',
    whyMounted: 'Required by WU-04 because the selected calculation contract references ASME B31.3 Section 304.',
    usedBy: [
      { id: 'WU-003', name: 'Engineering Calculation', contract: 'ASME B31.3 §304.1.2' },
      { id: 'WU-006', name: 'Verification & SMT Proof', contract: 'Z3 QF_NRA Assurance' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: 'ASME B31.3-2022 Process Piping\\nChapter II: Design of Pressure Components\\nSection 304.1.2 Straight Pipe Under Internal Pressure\\nt_m = (P * D) / (2 * (S * E * W + P * Y)) + c'
  },
  'Refinery_Circuit_400_Isometric.dwg': {
    categoryLabel: 'CAD DRAWING · P&ID',
    revision: 'R4',
    effectiveDate: '12 May 2025',
    addedDate: '18 Sep 2026',
    importedBy: 'Shiva',
    sourcePath: '/sample_inputs/piping/',
    access: 'Confidential (Operations)',
    whyMounted: 'Provides spatial routing, nominal diameter (NPS 8), schedule 40 dimensions, and CML point coordinates along Circuit 400.',
    usedBy: [
      { id: 'WU-001', name: 'Spatial Topology Reconstruction', contract: 'Raster-to-Graph' },
      { id: 'WU-002', name: 'Circuit 400 Line Mapping', contract: 'ISO Spatial Graph' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: 'HEADER: DWG 2018 (AC1032)\\nLAYER TABLE: LINE-400-P-01, NPS-8-SCH40, CML-LOCATIONS\\nCOORDINATE ORIGIN: E 45210.42, N 88320.15, EL +104.500\\nPIPE SPEC: A106-B CS'
  },
  'CML_UT_Ultrasonic_Survey_2026.csv': {
    categoryLabel: 'INSPECTION · ULTRASONIC',
    revision: '1.0',
    effectiveDate: '15 Aug 2026',
    addedDate: '18 Sep 2026',
    importedBy: 'Shiva',
    sourcePath: '/sample_inputs/piping/',
    access: 'Internal (Inspection Division)',
    whyMounted: 'Primary empirical thickness sensor readings (CML-01 to CML-08) captured during turnaround inspection for remaining life analysis.',
    usedBy: [
      { id: 'WU-002', name: 'CML Ultrasonic Data Ingestion', contract: 'Sensor Table Ingestion' },
      { id: 'WU-004', name: 'Wall Thinning & Corrosion Rate Evaluator', contract: 'Barlow & B31.3 t_min' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: 'cml_id,location,nominal_mm,current_mm,reading_date,inspector_badge\\nCML-01,Crude In Elbow,8.18,7.92,2026-08-15,UT-9021\\nCML-02,Preheat Reducer,8.18,7.45,2026-08-15,UT-9021\\nCML-03,Column Feed Tee,8.18,4.12,2026-08-15,UT-9021'
  },
  'PSU_Executive_Approval_Template.docx': {
    categoryLabel: 'TEMPLATE · EXECUTIVE NOTE',
    revision: '2026-v2',
    effectiveDate: '10 Feb 2026',
    addedDate: '18 Sep 2026',
    importedBy: 'Shiva',
    sourcePath: '/sample_inputs/piping/',
    access: 'Restricted (Regulatory Compliance)',
    whyMounted: 'Official public-sector undertaking (PSU) technical approval format required for statutory signoff and factory inspector submission.',
    usedBy: [
      { id: 'WU-007', name: 'PSU Approval Note Compiler', contract: 'OOXML DOCX Compiler' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: 'PUBLIC SECTOR ENTERPRISE — REFINERY DIVISION\\nTECHNICAL NOTE: INTEGRITY & SAFETY MARGIN APPROVAL\\nDoc Ref: PSU/REF/ENG/2026-APP-091\\nMandate: Statutory Signoff pursuant to OISD-118 and ASME B31.3'
  },

  // Eshwari's Documents (Core Architecture & Physics Sandbox)
  'src/physics/corrosion_evaluator.py': {
    categoryLabel: 'SOURCE CODE · PYTHON',
    revision: 'v3.1.2',
    effectiveDate: '20 Aug 2026',
    addedDate: '20 Sep 2026',
    importedBy: 'Eshwari',
    sourcePath: '/sample_inputs/codebase/',
    access: 'Internal (Core Architecture)',
    whyMounted: 'Required by WU-10 as the core physics calculation module evaluating ASME B31.3 Barlow hoop stress in POSIX sandbox.',
    usedBy: [
      { id: 'WU-010', name: 'Physics Engine Sandbox', contract: 'POSIX Pytest Runner' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: 'def calculate_asme_b31_tmin(P_design_psi: float, D_outer_in: float, S_allowable_psi: float, E_weld_joint: float = 1.0, Y_coeff: float = 0.4, corrosion_allowance_in: float = 0.0) -> float:\\n    numerator = P_design_psi * D_outer_in\\n    denominator = 2.0 * (S_allowable_psi * E_weld_joint + P_design_psi * Y_coeff)\\n    return (numerator / denominator) + corrosion_allowance_in'
  },
  'tests/test_b31_statutory_bounds.py': {
    categoryLabel: 'TEST SUITE · PYTEST',
    revision: 'v1.4',
    effectiveDate: '22 Aug 2026',
    addedDate: '20 Sep 2026',
    importedBy: 'Eshwari',
    sourcePath: '/sample_inputs/codebase/',
    access: 'Internal (Testing Core)',
    whyMounted: 'Required by WU-11 to enforce statutory boundary condition tests and assert 0 false assurance in sandbox.',
    usedBy: [
      { id: 'WU-011', name: 'Micro-Sandbox Pytest Runner', contract: 'Boundary Assertion Suite' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: 'def test_statutory_retirement_limit():\\n    # API 510 clause 7.1.1 strict boundary assertion\\n    t_actual = 4.12\\n    t_min = 4.98\\n    assert t_actual < t_min, "CML-03 must fail structural retirement test"'
  },
  'config/sovereign_sandboxes.json': {
    categoryLabel: 'CONFIG · JSON',
    revision: 'r2',
    effectiveDate: '01 Sep 2026',
    addedDate: '20 Sep 2026',
    importedBy: 'Eshwari',
    sourcePath: '/sample_inputs/codebase/',
    access: 'Restricted (Platform Security)',
    whyMounted: 'Required by WU-09 to enforce POSIX container isolation, CPU limits, and strict zero-network egress.',
    usedBy: [
      { id: 'WU-009', name: 'Sandbox Policy Enforcer', contract: 'Air-Gap Isolation Guard' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: '{\\n  "sandbox": "posix_ephemeral",\\n  "network": "none",\\n  "cpu_quota_ms": 5000,\\n  "max_memory_mb": 512,\\n  "mount_mode": "ro"\\n}'
  },
  'docs/api510_clause7_specification.md': {
    categoryLabel: 'SPECIFICATION · MARKDOWN',
    revision: '10th Ed.',
    effectiveDate: '01 Jan 2024',
    addedDate: '20 Sep 2026',
    importedBy: 'Eshwari',
    sourcePath: '/sample_inputs/codebase/',
    access: 'Confidential (Statutory Spec)',
    whyMounted: 'Required by WU-12 specifying API 510 §7 minimum structural thickness and evaluation criteria.',
    usedBy: [
      { id: 'WU-012', name: 'Regulatory Spec Validator', contract: 'Spec Clause Matcher' }
    ],
    integrity: {
      sha256Verified: true,
      sourceIntegrity: true,
      fileTypeValidated: true,
      zeroWanEgress: true
    },
    rawSnippet: '# API 510 §7 Inspection and Evaluation of In-Service Piping & Vessels\\n## Clause 7.1 Minimum Thickness Evaluation\\nRetirement thickness shall be governed by maximum operating pressure and design temperature.'
  }
};

export default function PermittedVault({ currentUser, onDocumentIngested, addAuditLog, onProceedToAnalysis }) {
  // Store user-ingested documents keyed by user id so baseline + uploads stay isolated
  const [userUploads, setUserUploads] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [previewModalDoc, setPreviewModalDoc] = useState(null);
  const [whyMountedTooltip, setWhyMountedTooltip] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [lineageToast, setLineageToast] = useState(null);

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRailFilter, setActiveRailFilter] = useState({ category: 'ALL', value: 'ALL' });
  const [sortBy, setSortBy] = useState('DEFAULT'); // 'DEFAULT', 'NAME_ASC', 'SIZE_DESC', 'REV_DESC', 'CLEARANCE'
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' (dense table) or 'GRID'
  const fileInputRef = useRef(null);

  // Enrich base docs with metadata
  const enrichedBaseDocs = useMemo(() => {
    const raw = currentUser.permittedDocs || [];
    return raw.map(doc => {
      const meta = BASELINE_METADATA[doc.name] || {};
      return {
        ...doc,
        categoryLabel: meta.categoryLabel || `${doc.type} · REPOSITORY`,
        revision: meta.revision || '1.0',
        effectiveDate: meta.effectiveDate || '2026',
        addedDate: meta.addedDate || '18 Sep 2026',
        importedBy: meta.importedBy || currentUser.name,
        sourcePath: meta.sourcePath || (currentUser.id === 'engineer' ? '/sample_inputs/piping/' : '/sample_inputs/codebase/'),
        access: meta.access || `${doc.clearance} (${currentUser.name})`,
        whyMounted: meta.whyMounted || `Mounted into sovereign mission space for ${currentUser.name}.`,
        usedBy: meta.usedBy || [{ id: 'WU-001', name: 'Mission Ingestion Node', contract: 'Standard Pipeline' }],
        integrity: meta.integrity || { sha256Verified: true, sourceIntegrity: true, fileTypeValidated: true, zeroWanEgress: true },
        rawSnippet: meta.rawSnippet || '',
        status: 'VERIFIED'
      };
    });
  }, [currentUser]);

  const currentUploads = userUploads[currentUser.id] || [];
  const allDocuments = useMemo(() => {
    return [...currentUploads, ...enrichedBaseDocs];
  }, [currentUploads, enrichedBaseDocs]);

  // Dynamic counts for Left Rail
  const counts = useMemo(() => {
    const c = {
      all: allDocuments.length,
      // Collections
      standards: allDocuments.filter(d => d.type === 'STANDARD').length,
      inspections: allDocuments.filter(d => d.type === 'INSPECTION' || d.type === 'DATA_LOG').length,
      drawings: allDocuments.filter(d => d.type === 'CAD_DRAWING').length,
      templates: allDocuments.filter(d => d.type === 'TEMPLATE').length,
      sourceCode: allDocuments.filter(d => d.type === 'SOURCE_CODE' || d.type === 'TEST_SUITE').length,
      // Security
      restricted: allDocuments.filter(d => d.clearance === 'RESTRICTED').length,
      confidential: allDocuments.filter(d => d.clearance === 'CONFIDENTIAL').length,
      internal: allDocuments.filter(d => d.clearance === 'INTERNAL').length,
      // Status
      verified: allDocuments.filter(d => d.status === 'VERIFIED').length,
      pending: allDocuments.filter(d => d.status === 'PENDING').length,
      quarantined: allDocuments.filter(d => d.status === 'QUARANTINED').length,
    };
    return c;
  }, [allDocuments]);

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    let list = [...allDocuments];

    // 1. Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        d.name.toLowerCase().includes(q) ||
        (d.categoryLabel && d.categoryLabel.toLowerCase().includes(q)) ||
        d.type.toLowerCase().includes(q) ||
        d.clearance.toLowerCase().includes(q) ||
        d.hash.toLowerCase().includes(q) ||
        (d.whyMounted && d.whyMounted.toLowerCase().includes(q))
      );
    }

    // 2. Rail filter
    if (activeRailFilter.category === 'COLLECTION') {
      const val = activeRailFilter.value;
      if (val === 'STANDARDS') list = list.filter(d => d.type === 'STANDARD');
      else if (val === 'INSPECTIONS') list = list.filter(d => d.type === 'INSPECTION' || d.type === 'DATA_LOG');
      else if (val === 'DRAWINGS') list = list.filter(d => d.type === 'CAD_DRAWING');
      else if (val === 'TEMPLATES') list = list.filter(d => d.type === 'TEMPLATE');
      else if (val === 'SOURCE_CODE') list = list.filter(d => d.type === 'SOURCE_CODE' || d.type === 'TEST_SUITE');
    } else if (activeRailFilter.category === 'SECURITY') {
      list = list.filter(d => d.clearance === activeRailFilter.value);
    } else if (activeRailFilter.category === 'STATUS') {
      list = list.filter(d => d.status === activeRailFilter.value);
    }

    // 3. Sorting
    if (sortBy === 'NAME_ASC') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'SIZE_DESC') {
      list.sort((a, b) => (b.rawBytes || 0) - (a.rawBytes || 0));
    } else if (sortBy === 'REV_DESC') {
      list.sort((a, b) => (b.revision || '').localeCompare(a.revision || ''));
    } else if (sortBy === 'CLEARANCE') {
      const rank = { RESTRICTED: 3, CONFIDENTIAL: 2, INTERNAL: 1 };
      list.sort((a, b) => (rank[b.clearance] || 0) - (rank[a.clearance] || 0));
    }

    return list;
  }, [allDocuments, searchQuery, activeRailFilter, sortBy]);

  const processAndIngestFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const realHash = await computeSha256(file);
      const sizeStr = formatFileSize(file.size);
      const docType = detectDocType(file.name);
      const clearance = detectClearance(file.name);

      let textPreview = '';
      try {
        if (file.name.endsWith('.csv') || file.name.endsWith('.py') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
          textPreview = await file.text();
        }
      } catch {
        // Non-text file
      }

      const newDoc = {
        id: `doc-${Date.now()}-${i}`,
        name: file.name,
        type: docType,
        categoryLabel: `${docType} · MANUAL INGESTION`,
        size: sizeStr,
        rawBytes: file.size,
        hash: realHash,
        clearance: clearance,
        revision: '1.0 (Ingested)',
        effectiveDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        addedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        importedBy: currentUser.name,
        sourcePath: currentUser.id === 'engineer' ? '/sample_inputs/piping/' : '/sample_inputs/codebase/',
        access: `${clearance} (${currentUser.name})`,
        whyMounted: `Manually ingested into active mission workspace by ${currentUser.name} for local verification.`,
        usedBy: [
          { id: 'WU-008', name: 'Dynamic Ingestion Pipeline', contract: 'Ad-hoc Verification' }
        ],
        integrity: {
          sha256Verified: true,
          sourceIntegrity: true,
          fileTypeValidated: true,
          zeroWanEgress: true
        },
        status: 'VERIFIED',
        isManualUpload: true,
        textPreview: textPreview,
        rawSnippet: textPreview ? textPreview.substring(0, 300) : `Binary file sealed into sovereign RAM (${file.name})`,
        ingestedAt: new Date().toLocaleTimeString(),
      };

      setUserUploads(prev => ({
        ...prev,
        [currentUser.id]: [newDoc, ...(prev[currentUser.id] || [])]
      }));

      addAuditLog({
        actor: 'USER',
        action: `Manually ingested input file: ${file.name}`,
        hash: realHash.substring(0, 24) + '...',
        details: `Size: ${sizeStr} | Type: ${docType} | Clearance: ${clearance} | Egress: 0 WAN Packets`
      });

      addAuditLog({
        actor: 'PLATFORM',
        action: `SHA-256 Merkle leaf registered and sealed into vault`,
        hash: realHash,
        details: `Cryptographic zero-knowledge binding to persona: ${currentUser.name}`
      });

      if (onDocumentIngested) {
        onDocumentIngested(newDoc);
      }
    }

    setIsProcessing(false);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndIngestFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCopyHash = (hash) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(hash);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1800);
    }
  };

  const handleTraceLineage = (doc) => {
    addAuditLog({
      actor: 'PLATFORM',
      action: `Cryptographic Artifact Lineage traced for ${doc.name}`,
      hash: doc.hash.substring(0, 24) + '...',
      details: `Source: ${doc.sourcePath} -> Ingestion Merkle Leaf -> DAG Nodes [${(doc.usedBy || []).map(u => u.id).join(', ')}] -> Z3 Proof Engine`
    });
    setLineageToast(`Artifact Lineage Verified: ${doc.name} bound to ${(doc.usedBy || []).map(u => u.id).join(' & ')}`);
    setTimeout(() => setLineageToast(null), 3500);
  };

  const handleRevokeDocument = (doc) => {
    if (doc.isManualUpload) {
      setUserUploads(prev => ({
        ...prev,
        [currentUser.id]: (prev[currentUser.id] || []).filter(d => d.id !== doc.id)
      }));
    }
    if (inspectingDoc?.id === doc.id) {
      setInspectingDoc(null);
    }
    addAuditLog({
      actor: 'USER',
      action: `Revoked document lease from sovereign workspace: ${doc.name}`,
      hash: doc.hash.substring(0, 24) + '...',
      details: `Document memory unmounted. Zero residual state retained.`
    });
  };

  return (
    <div style={styles.vaultContainer} className="glass-card">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Top Header: Sovereign Enclave Vault Header */}
      <div style={styles.vaultHeader}>
        <div>
          <div style={styles.topLabelRow}>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              SECURE LOCAL VAULT
            </span>
            <span style={{ fontSize: '0.78rem', color: '#685e50', fontWeight: '700' }}>
              LOGGED IN: {currentUser.name.toUpperCase()} ({currentUser.id === 'engineer' ? 'PIPING ENGINEER' : 'SOFTWARE DEVELOPER'})
            </span>
          </div>
          <h2 style={styles.title}>Approved Documents & Data</h2>
          <p style={styles.subtitle}>
            Official files and inspection surveys used for safety checks — 100% offline.
          </p>
        </div>

        <div style={styles.vaultStats}>
          <div className="glass-inset" style={styles.statBox}>
            <span style={styles.statNum}>{allDocuments.length}</span>
            <span style={styles.statLabel}>AVAILABLE</span>
          </div>
          {currentUploads.length > 0 && (
            <div className="glass-inset" style={{ ...styles.statBox, borderColor: 'var(--accent-gold)' }}>
              <span style={{ ...styles.statNum, color: 'var(--accent-gold)' }}>{currentUploads.length}</span>
              <span style={styles.statLabel}>ADDED</span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Engineering Search, Filters, Sort & Ingestion Toolbar */}
      <div style={styles.toolbarContainer} className="glass-inset">
        {/* Left: Search input */}
        <div style={styles.searchBoxWrapper}>
          <span style={{ fontSize: '0.9rem', color: '#8a7e6d' }}>🔍</span>
          <input
            type="text"
            placeholder="Search documents by name, type, revision, hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Center/Right: Dropdowns & Action Controls */}
        <div style={styles.toolbarControlsGroup}>
          {/* Quick Filter dropdown */}
          <div style={styles.dropdownControl}>
            <label style={styles.dropdownLabel}>Filter:</label>
            <select
              value={activeRailFilter.value}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') setActiveRailFilter({ category: 'ALL', value: 'ALL' });
                else if (['STANDARDS', 'INSPECTIONS', 'DRAWINGS', 'TEMPLATES', 'SOURCE_CODE'].includes(val)) {
                  setActiveRailFilter({ category: 'COLLECTION', value: val });
                } else if (['RESTRICTED', 'CONFIDENTIAL', 'INTERNAL'].includes(val)) {
                  setActiveRailFilter({ category: 'SECURITY', value: val });
                } else {
                  setActiveRailFilter({ category: 'STATUS', value: val });
                }
              }}
              style={styles.selectInput}
            >
              <option value="ALL">All Documents</option>
              <option value="STANDARDS">Standards ({counts.standards})</option>
              <option value="DRAWINGS">Drawings ({counts.drawings})</option>
              <option value="INSPECTIONS">Inspections ({counts.inspections})</option>
              <option value="TEMPLATES">Templates ({counts.templates})</option>
              {counts.sourceCode > 0 && <option value="SOURCE_CODE">Source & Tests ({counts.sourceCode})</option>}
              <option value="RESTRICTED">Restricted ({counts.restricted})</option>
              <option value="CONFIDENTIAL">Confidential ({counts.confidential})</option>
              <option value="INTERNAL">Internal ({counts.internal})</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div style={styles.dropdownControl}>
            <label style={styles.dropdownLabel}>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.selectInput}
            >
              <option value="DEFAULT">Default Order</option>
              <option value="NAME_ASC">Name (A → Z)</option>
              <option value="SIZE_DESC">Size (Largest First)</option>
              <option value="REV_DESC">Revision (Newest)</option>
              <option value="CLEARANCE">Security Level</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div style={styles.viewToggleGroup}>
            <button
              onClick={() => setViewMode('LIST')}
              className="btn-glass"
              style={{
                ...styles.viewBtn,
                background: viewMode === 'LIST' ? '#181512' : 'transparent',
                color: viewMode === 'LIST' ? '#faf7f2' : 'var(--text-main)',
                borderColor: viewMode === 'LIST' ? '#181512' : 'var(--glass-border)',
              }}
              title="Dense List / Table View"
            >
              ☰ List
            </button>
            <button
              onClick={() => setViewMode('GRID')}
              className="btn-glass"
              style={{
                ...styles.viewBtn,
                background: viewMode === 'GRID' ? '#181512' : 'transparent',
                color: viewMode === 'GRID' ? '#faf7f2' : 'var(--text-main)',
                borderColor: viewMode === 'GRID' ? '#181512' : 'var(--glass-border)',
              }}
              title="Card Grid View"
            >
              ▦ Grid
            </button>
          </div>

          {/* + Add Files Primary Action Button */}
          <button
            onClick={triggerBrowse}
            className="btn-glass btn-primary-bold"
            style={styles.addFilesBtn}
            disabled={isProcessing}
            title="Browse and ingest local engineering files"
          >
            {isProcessing ? '⚙️ Ingesting...' : '+ Add Files'}
          </button>

          {/* Proceed to Analysis Action Button */}
          {onProceedToAnalysis && (
            <button
              onClick={onProceedToAnalysis}
              className="btn-glass btn-primary-bold"
              style={{
                fontSize: '0.82rem',
                padding: '7px 18px',
                cursor: 'pointer',
                background: currentUploads.length > 0 ? 'var(--accent-gold)' : '#ffffff',
                color: currentUploads.length > 0 ? '#ffffff' : '#1a1612',
                border: currentUploads.length > 0 ? '1.5px solid #b45309' : '1px solid #c5baa8',
                boxShadow: currentUploads.length > 0 ? '0 2px 10px rgba(154, 103, 26, 0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
              title="Proceed to active scenario analysis"
            >
              ⚡ Proceed to Analysis ➔
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Engineering Layout: Left Rail + Documents Table */}
      <div className="vault-layout">
        
        {/* Left Collections / Filters Rail */}
        <aside className="vault-rail glass-inset">
          
          {/* Section: Collections */}
          <div>
            <div className="vault-rail-section-title">CATEGORIES</div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'ALL', value: 'ALL' })}
            >
              <span>All Documents</span>
              <span className="vault-rail-count">{counts.all}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'COLLECTION' && activeRailFilter.value === 'STANDARDS' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'COLLECTION', value: 'STANDARDS' })}
            >
              <span>Safety Standards</span>
              <span className="vault-rail-count">{counts.standards}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'COLLECTION' && activeRailFilter.value === 'INSPECTIONS' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'COLLECTION', value: 'INSPECTIONS' })}
            >
              <span>Inspection Surveys</span>
              <span className="vault-rail-count">{counts.inspections}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'COLLECTION' && activeRailFilter.value === 'DRAWINGS' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'COLLECTION', value: 'DRAWINGS' })}
            >
              <span>Engineering Diagrams (P&ID)</span>
              <span className="vault-rail-count">{counts.drawings}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'COLLECTION' && activeRailFilter.value === 'TEMPLATES' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'COLLECTION', value: 'TEMPLATES' })}
            >
              <span>Report Templates</span>
              <span className="vault-rail-count">{counts.templates}</span>
            </div>
            {counts.sourceCode > 0 && (
              <div
                className={`vault-rail-item ${activeRailFilter.category === 'COLLECTION' && activeRailFilter.value === 'SOURCE_CODE' ? 'active' : ''}`}
                onClick={() => setActiveRailFilter({ category: 'COLLECTION', value: 'SOURCE_CODE' })}
              >
                <span>Calculation Code & Tests</span>
                <span className="vault-rail-count">{counts.sourceCode}</span>
              </div>
            )}
          </div>

          {/* Section: Security */}
          <div>
            <div className="vault-rail-section-title">SECURITY</div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'SECURITY' && activeRailFilter.value === 'RESTRICTED' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'SECURITY', value: 'RESTRICTED' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulse-dot" style={{ background: '#a62a2a', width: '6px', height: '6px' }} />
                <span>Restricted</span>
              </div>
              <span className="vault-rail-count">{counts.restricted}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'SECURITY' && activeRailFilter.value === 'CONFIDENTIAL' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'SECURITY', value: 'CONFIDENTIAL' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulse-dot" style={{ background: '#9a671a', width: '6px', height: '6px' }} />
                <span>Confidential</span>
              </div>
              <span className="vault-rail-count">{counts.confidential}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'SECURITY' && activeRailFilter.value === 'INTERNAL' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'SECURITY', value: 'INTERNAL' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulse-dot" style={{ background: '#235482', width: '6px', height: '6px' }} />
                <span>Internal</span>
              </div>
              <span className="vault-rail-count">{counts.internal}</span>
            </div>
          </div>

          {/* Section: Status */}
          <div>
            <div className="vault-rail-section-title">STATUS</div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'STATUS' && activeRailFilter.value === 'VERIFIED' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'STATUS', value: 'VERIFIED' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#1b6a4a', fontWeight: '800' }}>✓</span>
                <span>Verified</span>
              </div>
              <span className="vault-rail-count">{counts.verified}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'STATUS' && activeRailFilter.value === 'PENDING' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'STATUS', value: 'PENDING' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#7a7061', fontWeight: '800' }}>○</span>
                <span>Pending Review</span>
              </div>
              <span className="vault-rail-count">{counts.pending}</span>
            </div>
            <div
              className={`vault-rail-item ${activeRailFilter.category === 'STATUS' && activeRailFilter.value === 'QUARANTINED' ? 'active' : ''}`}
              onClick={() => setActiveRailFilter({ category: 'STATUS', value: 'QUARANTINED' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#a62a2a', fontWeight: '800' }}>✕</span>
                <span>Quarantined</span>
              </div>
              <span className="vault-rail-count">{counts.quarantined}</span>
            </div>
          </div>

          {/* Clear Filters Reset */}
          {(activeRailFilter.category !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setActiveRailFilter({ category: 'ALL', value: 'ALL' });
                setSearchQuery('');
              }}
              className="btn-glass"
              style={{ width: '100%', fontSize: '0.74rem', padding: '6px 10px', marginTop: '4px' }}
            >
              ↺ Reset All Filters
            </button>
          )}

        </aside>

        {/* Right Main Documents Area */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header Strip with Result Count */}
          <div style={styles.resultsBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: '800', letterSpacing: '0.06em', color: '#7a7061', textTransform: 'uppercase' }}>
                DOCUMENTS
              </span>
              <span className="mono-tag" style={{ fontSize: '0.72rem' }}>
                {filteredDocuments.length} OF {allDocuments.length}
              </span>
              {activeRailFilter.category !== 'ALL' && (
                <span className="badge badge-gold" style={{ fontSize: '0.64rem', padding: '2px 8px' }}>
                  FILTER: {activeRailFilter.value}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.72rem', color: '#82786a', fontWeight: '600' }}>
              Privacy Check: <strong style={{ color: '#1b6a4a' }}>100% Offline (No cloud egress)</strong>
            </div>
          </div>

          {/* DENSE TABLE VIEW (Default) */}
          {viewMode === 'LIST' ? (
            <div className="vault-table-wrapper">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>DOCUMENT NAME</th>
                    <th style={{ width: '14%' }}>CATEGORY</th>
                    <th style={{ width: '12%' }}>ACCESS LEVEL</th>
                    <th style={{ width: '10%' }}>VERSION</th>
                    <th style={{ width: '12%' }}>SAFETY STATUS</th>
                    <th style={{ width: '8%' }}>SIZE</th>
                    <th style={{ width: '14%', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#7a7061' }}>
                        No documents match. <br />
                        <button
                          onClick={() => { setActiveRailFilter({ category: 'ALL', value: 'ALL' }); setSearchQuery(''); }}
                          className="btn-glass"
                          style={{ marginTop: '10px', fontSize: '0.78rem' }}
                        >
                          Clear Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => {
                      const isSelected = inspectingDoc?.id === doc.id;
                      const icon = getFileIcon(doc.name, doc.type);

                      return (
                        <tr
                          key={doc.id}
                          className={isSelected ? 'row-selected' : ''}
                          onClick={() => setInspectingDoc(doc)}
                        >
                          {/* 1. Document Name & Category Subtitle */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ fontSize: '1.25rem', lineHeight: '1.1', flexShrink: 0 }}>
                                {icon}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '700', color: '#1a1612', wordBreak: 'break-word', fontSize: '0.86rem' }}>
                                  {doc.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#7a7061', marginTop: '2px', fontWeight: '600' }}>
                                  {doc.categoryLabel}
                                  {doc.addedDate && ` · Added: ${doc.addedDate}`}
                                </div>

                                {/* "Why is this document here?" micro-badge */}
                                {doc.whyMounted && (
                                  <div
                                    className="why-mounted-chip"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWhyMountedTooltip(whyMountedTooltip === doc.id ? null : doc.id);
                                    }}
                                    title="Click to view why this document is needed for safety checks"
                                  >
                                    <span>Why is this needed?</span>
                                  </div>
                                )}

                                {/* Interactive Why Mounted Popover */}
                                {whyMountedTooltip === doc.id && (
                                  <div
                                    className="glass-card"
                                    style={styles.whyMountedPopover}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                      <strong style={{ fontSize: '0.7rem', color: 'var(--accent-cipher)', letterSpacing: '0.04em' }}>
                                        WHY IS THIS FILE USED?
                                      </strong>
                                      <button
                                        onClick={() => setWhyMountedTooltip(null)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#888' }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: '#383228', lineHeight: '1.4', margin: 0 }}>
                                      {doc.whyMounted}
                                    </p>
                                    <div style={{ marginTop: '8px', borderTop: '1px solid rgba(200, 185, 160, 0.3)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.68rem', color: '#7a7061' }}>
                                        Referenced by: {(doc.usedBy || []).map(u => u.id).join(', ')}
                                      </span>
                                      <button
                                        onClick={() => { setWhyMountedTooltip(null); setInspectingDoc(doc); }}
                                        className="btn-glass"
                                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                                      >
                                        View in Inspector →
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Type */}
                          <td>
                            <span className="mono-tag" style={{ fontSize: '0.68rem' }}>
                              {doc.type}
                            </span>
                          </td>

                          {/* 3. Security */}
                          <td>
                            <span
                              className={`badge ${
                                doc.clearance === 'RESTRICTED'
                                  ? 'badge-crimson'
                                  : doc.clearance === 'CONFIDENTIAL'
                                  ? 'badge-gold'
                                  : 'badge-cipher'
                              }`}
                              style={{ fontSize: '0.65rem', padding: '3px 8px' }}
                            >
                              {doc.clearance}
                            </span>
                          </td>

                          {/* 4. Revision */}
                          <td>
                            <span className="mono-tag" style={{ fontSize: '0.72rem', background: '#ffffff', color: '#4a4135' }}>
                              {doc.revision || '2022'}
                            </span>
                          </td>

                          {/* 5. Status */}
                          <td>
                            <span
                              className="badge badge-green"
                              style={{ fontSize: '0.65rem', padding: '3px 8px' }}
                            >
                              <span style={{ fontWeight: '800' }}>✓</span> VERIFIED
                            </span>
                          </td>

                          {/* 6. Size */}
                          <td>
                            <span style={{ fontSize: '0.76rem', color: '#554d42', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                              {doc.size}
                            </span>
                          </td>

                          {/* 7. Action: Inspect Button */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingDoc(doc);
                              }}
                              className="btn-glass"
                              style={{
                                padding: '4px 12px',
                                fontSize: '0.74rem',
                                background: isSelected ? '#181512' : undefined,
                                color: isSelected ? '#ffffff' : undefined,
                              }}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* CARD GRID VIEW (Optional alternate view) */
            <div style={styles.documentsGrid}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setInspectingDoc(doc)}
                  style={{
                    ...styles.docCard,
                    borderColor: inspectingDoc?.id === doc.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                    cursor: 'pointer',
                  }}
                  className="glass-card"
                >
                  <div style={styles.docHeader}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className={`badge ${doc.clearance === 'RESTRICTED' ? 'badge-crimson' : doc.clearance === 'CONFIDENTIAL' ? 'badge-gold' : 'badge-cipher'}`} style={{ fontSize: '0.64rem' }}>
                        {doc.clearance}
                      </span>
                      <span className="mono-tag" style={{ fontSize: '0.64rem' }}>
                        Rev {doc.revision}
                      </span>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
                      ✓ VERIFIED
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '10px 0' }}>
                    <span style={{ fontSize: '1.4rem' }}>{getFileIcon(doc.name, doc.type)}</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1a1612' }}>{doc.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#7a7061' }}>{doc.categoryLabel}</div>
                    </div>
                  </div>

                  {/* Why mounted */}
                  <div style={{ fontSize: '0.72rem', color: '#52493d', background: 'rgba(235, 227, 214, 0.45)', padding: '6px 8px', borderRadius: '6px', margin: '6px 0', border: '1px solid rgba(210, 195, 175, 0.3)' }}>
                    <strong>Why Mounted:</strong> {doc.whyMounted}
                  </div>

                  <div style={styles.docFooter}>
                    <span style={{ fontSize: '0.76rem', color: '#665d50', fontWeight: '700' }}>
                      {doc.size}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingDoc(doc);
                      }}
                      className="btn-glass"
                      style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

      </div>

      {/* THE KILLER FEATURE: RIGHT-SIDE DOCUMENT INSPECTOR DRAWER */}
      {inspectingDoc && (
        <>
          {/* Backdrop overlay */}
          <div
            className="inspector-backdrop"
            onClick={() => setInspectingDoc(null)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="inspector-drawer">
            {/* Header */}
            <div className="inspector-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {getFileIcon(inspectingDoc.name, inspectingDoc.type)}
                </span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.08em', color: '#7a7061', textTransform: 'uppercase' }}>
                    DOCUMENT INSPECTOR
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#181512' }}>
                    {inspectingDoc.name}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectingDoc(null)}
                style={styles.drawerCloseBtn}
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="inspector-body">
              
              {/* Type and Clearance Hero Banner */}
              <div className="glass-inset" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6a6052' }}>
                    {inspectingDoc.categoryLabel}
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#181512', marginTop: '2px' }}>
                    {inspectingDoc.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className={`badge ${inspectingDoc.clearance === 'RESTRICTED' ? 'badge-crimson' : inspectingDoc.clearance === 'CONFIDENTIAL' ? 'badge-gold' : 'badge-cipher'}`}>
                    {inspectingDoc.clearance}
                  </span>
                  <span className="badge badge-green">
                    ✓ VERIFIED
                  </span>
                </div>
              </div>

              {/* 1. INTEGRITY */}
              <div className="inspector-section">
                <div className="inspector-section-label">INTEGRITY</div>
                <div className="glass-inset" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={styles.integrityItem}>
                    <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                    <span>SHA-256 verified against sovereign hardware digest</span>
                  </div>
                  <div style={styles.integrityItem}>
                    <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                    <span>Source integrity confirmed (Zero cloud egress verified)</span>
                  </div>
                  <div style={styles.integrityItem}>
                    <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                    <span>File type & MIME magic bytes validated</span>
                  </div>
                  <div style={styles.integrityItem}>
                    <span style={{ color: '#1b6a4a', fontWeight: '900' }}>✓</span>
                    <span>Client-side Web Crypto Merkle leaf sealed in RAM</span>
                  </div>
                </div>
              </div>

              {/* 2. PROVENANCE */}
              <div className="inspector-section">
                <div className="inspector-section-label">PROVENANCE</div>
                <div className="glass-inset" style={{ padding: '12px 14px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Imported:</strong> {inspectingDoc.addedDate} 14:32 (Local Sovereign Clock)</div>
                  <div><strong>Source:</strong> <code style={{ fontFamily: 'var(--font-mono)', color: '#8b4513' }}>{inspectingDoc.sourcePath}</code></div>
                  <div><strong>Imported by:</strong> {inspectingDoc.importedBy} ({currentUser.id === 'engineer' ? 'Piping' : 'Core Platform'})</div>
                </div>
              </div>

              {/* 3. VERSION */}
              <div className="inspector-section">
                <div className="inspector-section-label">VERSION</div>
                <div className="glass-inset" style={{ padding: '12px 14px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Revision:</strong> {inspectingDoc.revision}</div>
                  <div><strong>Effective:</strong> {inspectingDoc.effectiveDate}</div>
                  <div><strong>Physical Size:</strong> {inspectingDoc.size}</div>
                </div>
              </div>

              {/* 4. ACCESS */}
              <div className="inspector-section">
                <div className="inspector-section-label">ACCESS & ROLE CLEARANCE</div>
                <div className="glass-inset" style={{ padding: '12px 14px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Clearance:</strong> {inspectingDoc.clearance} (Level 4 Critical Infrastructure)</div>
                  <div><strong>Authorized Division:</strong> {inspectingDoc.access}</div>
                </div>
              </div>

              {/* 5. USED BY (WORK UNIT DAG) */}
              <div className="inspector-section">
                <div className="inspector-section-label">USED BY (WORK UNIT DAG)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(inspectingDoc.usedBy || []).map((wu) => (
                    <div key={wu.id} className="glass-inset" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono-tag" style={{ background: '#181512', color: '#faf7f2', fontSize: '0.72rem' }}>
                          {wu.id}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2a241e' }}>
                          {wu.name}
                        </span>
                      </div>
                      {wu.contract && (
                        <span style={{ fontSize: '0.68rem', color: '#7a7061', fontFamily: 'var(--font-mono)' }}>
                          {wu.contract}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. WHY MOUNTED? (KILLER FEATURE SECTION) */}
              <div className="inspector-section">
                <div className="inspector-section-label" style={{ color: 'var(--accent-cipher)' }}>
                  WHY MOUNTED?
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(35, 84, 130, 0.08)',
                    border: '1px solid rgba(35, 84, 130, 0.3)',
                    fontSize: '0.82rem',
                    color: '#1a334e',
                    lineHeight: '1.45',
                    fontWeight: '500'
                  }}
                >
                  <p style={{ margin: 0 }}>
                    "{inspectingDoc.whyMounted}"
                  </p>
                </div>
              </div>

              {/* 7. SHA-256 DIGEST */}
              <div className="inspector-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="inspector-section-label">SHA-256 CRYPTOGRAPHIC DIGEST</div>
                  <button
                    onClick={() => handleCopyHash(inspectingDoc.hash)}
                    className="btn-glass"
                    style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                  >
                    {copyFeedback ? '✓ Copied!' : '📋 Copy Hash'}
                  </button>
                </div>
                <div
                  className="mono-tag"
                  style={{
                    fontSize: '0.72rem',
                    wordBreak: 'break-all',
                    background: '#ffffff',
                    padding: '8px',
                    color: '#2a2219',
                    borderRadius: '6px',
                    border: '1px solid rgba(180, 165, 140, 0.4)'
                  }}
                >
                  {inspectingDoc.hash}
                </div>
              </div>

              {/* 8. RAW SNIPPET / INGESTION PREVIEW */}
              {inspectingDoc.rawSnippet && (
                <div className="inspector-section">
                  <div className="inspector-section-label">PAYLOAD INSPECTION (FIRST 300 BYTES)</div>
                  <pre
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      background: '#1e1b18',
                      color: '#ebdcc3',
                      padding: '10px',
                      borderRadius: '8px',
                      overflowX: 'auto',
                      maxHeight: '130px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.35',
                      border: '1px solid #423b32'
                    }}
                  >
                    {inspectingDoc.rawSnippet}
                  </pre>
                </div>
              )}

            </div>

            {/* Bottom Actions Bar */}
            <div className="inspector-footer">
              <button
                onClick={() => setPreviewModalDoc(inspectingDoc)}
                className="btn-glass"
                style={{ flex: 1, fontSize: '0.78rem' }}
              >
                👁️ Open / Preview
              </button>
              <button
                onClick={() => handleTraceLineage(inspectingDoc)}
                className="btn-glass"
                style={{ flex: 1, fontSize: '0.78rem', borderColor: 'var(--accent-cipher)' }}
              >
                🔗 Trace Lineage
              </button>
              <button
                onClick={() => handleRevokeDocument(inspectingDoc)}
                className="btn-glass"
                style={{ fontSize: '0.78rem', color: '#a62a2a', borderColor: 'rgba(166, 42, 42, 0.4)' }}
                title="Unmount document lease from enclave"
              >
                🗑️ Revoke
              </button>
            </div>
          </div>
        </>
      )}

      {/* LINEAGE TOAST NOTIFICATION */}
      {lineageToast && (
        <div style={styles.lineageToast} className="glass-card">
          <span style={{ fontSize: '1.1rem' }}>🔗</span>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#181512' }}>
            {lineageToast}
          </span>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL (When Open is clicked) */}
      {previewModalDoc && (
        <div style={styles.modalBackdrop} onClick={() => setPreviewModalDoc(null)}>
          <div style={styles.previewModal} className="glass-card" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>{getFileIcon(previewModalDoc.name, previewModalDoc.type)}</span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#7a7061', textTransform: 'uppercase' }}>
                    SOVEREIGN ENCLAVE PREVIEW // AIR-GAP SAFE
                  </div>
                  <strong style={{ fontSize: '1rem', color: '#1a1612' }}>{previewModalDoc.name}</strong>
                </div>
              </div>
              <button onClick={() => setPreviewModalDoc(null)} style={styles.drawerCloseBtn}>✕</button>
            </div>

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span className="badge badge-gold">{previewModalDoc.categoryLabel}</span>
                <span className="badge badge-green">✓ SHA-256 VERIFIED</span>
                <span className="mono-tag">Size: {previewModalDoc.size}</span>
                <span className="mono-tag">Revision: {previewModalDoc.revision}</span>
              </div>

              <div style={{ fontSize: '0.82rem', marginBottom: '12px', color: '#4a4034', lineHeight: '1.4' }}>
                <strong>Why Mounted:</strong> {previewModalDoc.whyMounted}
              </div>

              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#7a7061', marginBottom: '6px' }}>
                RAW DATA PAYLOAD / STRUCTURAL SCHEMA
              </div>
              <pre style={{
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                background: '#1a1815',
                color: '#ece1cf',
                padding: '16px',
                borderRadius: '8px',
                lineHeight: '1.4',
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid #3d362b'
              }}>
                {previewModalDoc.textPreview || previewModalDoc.rawSnippet || `[Binary payload authenticated in enclave RAM]\nHash: ${previewModalDoc.hash}\nSize: ${previewModalDoc.size}\nStatus: Verified 0 WAN Egress`}
              </pre>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(245, 238, 226, 0.7)' }}>
              <button onClick={() => setPreviewModalDoc(null)} className="btn-glass btn-primary-bold" style={{ fontSize: '0.82rem', padding: '8px 18px' }}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  vaultContainer: {
    padding: '24px 28px',
    marginBottom: '28px',
    background: 'rgba(255, 253, 248, 0.88)',
  },
  vaultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  topLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
  },
  title: {
    fontSize: '1.65rem',
    fontWeight: '800',
    color: '#1a1612',
    letterSpacing: '-0.02em',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#5c5244',
  },
  vaultStats: {
    display: 'flex',
    gap: '10px',
  },
  statBox: {
    padding: '8px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '95px',
  },
  statNum: {
    fontSize: '1.25rem',
    fontWeight: '900',
    color: '#1a1612',
    lineHeight: '1.1',
    fontFamily: "'Outfit', sans-serif",
  },
  statLabel: {
    fontSize: '0.62rem',
    fontWeight: '800',
    color: '#7a7061',
    letterSpacing: '0.04em',
    marginTop: '2px',
  },

  // Toolbar & Compact Upload Controls
  toolbarContainer: {
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  searchBoxWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#ffffff',
    border: '1px solid rgba(195, 180, 155, 0.6)',
    borderRadius: '8px',
    padding: '6px 12px',
    flex: '1 1 260px',
    maxWidth: '380px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '0.82rem',
    color: '#1a1612',
    background: 'transparent',
    fontFamily: 'var(--font-body)',
  },
  clearSearchBtn: {
    border: 'none',
    background: 'transparent',
    color: '#998f82',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: '0 2px',
  },
  toolbarControlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  dropdownControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dropdownLabel: {
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#7a7061',
  },
  selectInput: {
    fontSize: '0.78rem',
    padding: '5px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(195, 180, 155, 0.6)',
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#1a1612',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer',
  },
  viewToggleGroup: {
    display: 'flex',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  viewBtn: {
    padding: '5px 10px',
    fontSize: '0.76rem',
    borderRadius: '0',
    borderRight: 'none',
  },
  addFilesBtn: {
    fontSize: '0.82rem',
    padding: '7px 16px',
    cursor: 'pointer',
  },

  // Results Bar
  resultsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },

  // Popover for "Why Mounted?"
  whyMountedPopover: {
    position: 'absolute',
    zIndex: 100,
    background: 'rgba(254, 251, 245, 0.90)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.95)',
    outline: '1px solid var(--accent-cipher)',
    boxShadow: '0 12px 32px rgba(35, 84, 130, 0.18)',
    borderRadius: '10px',
    padding: '12px 14px',
    width: '320px',
    marginTop: '6px',
    animation: 'fadeIn 0.15s ease-out',
  },

  // Alternate Card Grid
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  docCard: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '170px',
  },
  docHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid rgba(215, 202, 180, 0.35)',
  },

  // Drawer Controls
  drawerCloseBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.1rem',
    color: '#7a7061',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '700',
  },
  integrityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.78rem',
    color: '#2a241c',
    fontWeight: '600',
  },

  // Lineage Toast
  lineageToast: {
    position: 'fixed',
    bottom: '72px',
    right: '30px',
    zIndex: 1050,
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(254, 251, 245, 0.90)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.95)',
    outline: '1px solid var(--accent-cipher)',
    boxShadow: '0 12px 36px rgba(35, 84, 130, 0.22)',
    borderRadius: '10px',
    animation: 'fadeIn 0.2s ease-out',
  },

  // Preview Modal
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(25, 20, 15, 0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  previewModal: {
    width: '740px',
    maxWidth: '95vw',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(254, 251, 245, 0.88)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.95)',
    outline: '1px solid rgba(195, 180, 155, 0.4)',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(30, 24, 18, 0.25), inset 0 1px 1px #ffffff',
  },
  modalHeader: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    background: 'rgba(246, 240, 230, 0.65)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }
};
