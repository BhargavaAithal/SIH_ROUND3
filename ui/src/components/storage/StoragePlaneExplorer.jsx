import React, { useState } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { SCENARIOS } from '../../assets/sampleData';
import { ShieldIcon, TableIcon } from '../../assets/icons';

export const StoragePlaneExplorer = () => {
  const { topology, activeScenario, merkleAuditHash } = useWorkbenchStore();
  const currentSc = SCENARIOS[activeScenario] || SCENARIOS.baseline;

  const [activeLayer, setActiveLayer] = useState('graph'); // 'graph' | 'tables' | 'wal'

  const layers = [
    { id: 'graph', label: 'Layer 1: Spatial Topology Graph', icon: '🕸️', count: `${topology.nodes.length} Nodes • ${topology.edges.length} Edges` },
    { id: 'tables', label: 'Layer 2: Tabular Inspection DB', icon: '📊', count: '3 UT Gauging Points' },
    { id: 'wal', label: 'Layer 3: Cryptographic Merkle WAL', icon: '🔐', count: '4 Append-Only Blocks' },
  ];

  const walBlocks = [
    {
      block_id: '001-GENESIS',
      timestamp: '2026-09-09 11:15:00',
      operation: 'AIRGAP_KERNEL_INIT',
      details: 'Host air-gap enforced (nftables DROP). Local loopback socket pool active.',
      hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    },
    {
      block_id: '002-INGEST',
      timestamp: '2026-09-09 11:20:05',
      operation: 'DOCUMENT_VLM_INGESTION',
      details: 'Ingested 4 multi-source asset files. Extracted 72 entities into spatial graph.',
      hash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
    },
    {
      block_id: '003-SMT-VERIFY',
      timestamp: '2026-09-09 11:25:30',
      operation: 'Z3_FORMAL_AUDIT',
      details: `ASME B31.3 Section 304.1.2 theorem evaluation: ${currentSc.z3Result.status} (FAR: 0.000%).`,
      hash: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012',
    },
    {
      block_id: '004-DELIVERABLE',
      timestamp: '2026-09-09 11:28:10',
      operation: 'OOXML_SEAL_ATTACHED',
      details: 'Compiled official PSU approval memorandum (.docx) and audited calculation sheet (.xlsx).',
      hash: merkleAuditHash,
    },
  ];

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-canvas)',
      padding: '20px 24px',
      overflowY: 'auto',
    }}>
      {/* Top Layer Selector Pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '18px',
        backgroundColor: 'var(--bg-surface)',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-default)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {layers.map((l) => {
            const isActive = activeLayer === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLayer(l.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
                <span style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                }}>
                  {l.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
          <ShieldIcon size={14} color="var(--accent-green)" />
          <span>Sovereign Storage: Local SQLite & In-Memory Graph (0 Bytes WAN)</span>
        </div>
      </div>

      {/* Layer 1: Spatial Topology Graph View */}
      {activeLayer === 'graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '18px', flex: 1 }}>
          
          {/* Equipment Nodes */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
              Extracted ISA-5.1 Equipment Nodes ({topology.nodes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '420px' }}>
              {topology.nodes.map((n) => (
                <div key={n.id} style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>{n.tag} — {n.label}</span>
                    <span style={{ color: 'var(--accent-cyan)', fontSize: '11px', textTransform: 'uppercase' }}>{n.equipment_type}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Centroid: [{n.centroid[0]}, {n.centroid[1]}] • Status: {n.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Piping Connectivity Edges */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '10px' }}>
              Topological Piping Edges & Attributes ({topology.edges.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '420px' }}>
              {topology.edges.map((e) => (
                <div key={e.id} style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{e.tag}</span>
                    <span style={{ color: e.verdict === 'SAT' ? 'var(--accent-green)' : 'var(--accent-danger)' }}>{e.verdict}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Vector: {e.source} ➔ {e.target}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    OD: {e.attributes.outside_diameter} mm • P: {e.attributes.design_pressure} MPa • t: {e.attributes.measured_thickness} mm
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Layer 2: Tabular Inspection DB View */}
      {activeLayer === 'tables' && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '18px',
          flex: 1,
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px' }}>
            SQLite Inspection Database: `ut_thickness_measurements` table
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid var(--border-default)' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F497D', color: '#FFFFFF' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Point ID</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Target Line Tag</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Design Pressure (psig)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Outside Diameter (in)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Measured Wall (in)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Corrosion Allowance (in)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>UT-PT-01</td>
                <td style={{ padding: '8px 12px' }}>16"-P-101-CS-150</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>400.0</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>16.0</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>0.320</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>0.0625</td>
                <td style={{ padding: '8px 12px', color: 'var(--accent-green)', fontWeight: 700 }}>Safe</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>UT-PT-02</td>
                <td style={{ padding: '8px 12px' }}>12"-P-105-CS-150</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>355.0</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>12.75</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-danger)', fontWeight: 800 }}>0.210</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>0.1250</td>
                <td style={{ padding: '8px 12px', color: 'var(--accent-danger)', fontWeight: 700 }}>Needs Attention</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>UT-PT-03</td>
                <td style={{ padding: '8px 12px' }}>10"-P-103-CS-300</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>550.0</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>10.75</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>0.365</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>0.1250</td>
                <td style={{ padding: '8px 12px', color: 'var(--accent-green)', fontWeight: 700 }}>Safe</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Layer 3: Cryptographic Merkle WAL Ledger View */}
      {activeLayer === 'wal' && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '18px',
          flex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-green)' }}>
              SHA-256 Tamper-Evident Write-Ahead Log (WAL)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Non-Repudiation Audit Trail • Formally Sealed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {walBlocks.map((b) => (
              <div key={b.block_id} style={{
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    BLOCK #{b.block_id} — {b.operation}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {b.timestamp}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {b.details}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  HASH: {b.hash}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
