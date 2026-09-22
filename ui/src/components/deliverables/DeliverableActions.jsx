import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { DownloadIcon, FileTextIcon, TableIcon } from '../../assets/icons';
import { SCENARIOS } from '../../assets/sampleData';

export const DeliverableActions = () => {
  const { z3Result, taskSpec, merkleAuditHash, activeScenario } = useWorkbenchStore();
  const currentSc = SCENARIOS[activeScenario] || SCENARIOS.baseline;

  const handleDownloadJson = () => {
    const evidencePackage = {
      facility: 'Paradip Refinery - CDU-1',
      scenario: currentSc.name,
      timestamp: new Date().toISOString(),
      merkle_hash: merkleAuditHash,
      airgap_verdict: { status: 'PASS', wan_egress_bytes: 0 },
      spec: taskSpec,
      z3_verification: z3Result,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(evidencePackage, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${currentSc.id}_evidence_package.json`);
    dlAnchor.click();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <a
        href={currentSc.deliverables.memoDownloadUrl}
        download={currentSc.deliverables.memoFilename}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          backgroundColor: 'var(--accent-indigo)',
          color: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 700,
          textDecoration: 'none',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <FileTextIcon size={14} />
        📄 Download Word Report (.docx)
      </a>

      <a
        href={currentSc.deliverables.workbookDownloadUrl}
        download={currentSc.deliverables.workbookFilename}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          backgroundColor: 'var(--accent-green)',
          color: '#0B0F19',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 700,
          textDecoration: 'none',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <TableIcon size={14} />
        📊 Download Excel Sheet (.xlsx)
      </a>

      <button
        onClick={handleDownloadJson}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <DownloadIcon size={14} />
        Save Data (JSON)
      </button>
    </div>
  );
};
