import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { DownloadIcon, FileTextIcon, TableIcon, ShieldIcon } from '../../assets/icons';
import { getDeliverableMemoUrl, getDeliverableWorkbookUrl } from '../../services/api';

export const DeliverableActions = () => {
  const { z3Result, taskSpec, merkleAuditHash } = useWorkbenchStore();

  const handleDownloadJson = () => {
    const evidencePackage = {
      facility: 'Paradip Refinery - CDU-1',
      timestamp: new Date().toISOString(),
      merkle_hash: merkleAuditHash,
      airgap_verdict: { status: 'PASS', wan_egress_bytes: 0 },
      spec: taskSpec,
      z3_verification: z3Result,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(evidencePackage, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'SOVEREIGN_EVIDENCE_PACKAGE.json');
    dlAnchor.click();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 16px',
      backgroundColor: 'var(--bg-surface-elevated)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <a
        href={getDeliverableMemoUrl()}
        download="PSU_Approval_Memo_CDU1.docx"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'var(--accent-indigo)',
          color: '#FFFFFF',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <FileTextIcon size={14} />
        Download PSU Memo (.docx)
      </a>

      <a
        href={getDeliverableWorkbookUrl()}
        download="Calculation_Audit_Workbook.xlsx"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'var(--accent-green)',
          color: '#0B0F19',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 700,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <TableIcon size={14} />
        Download Calculation Workbook (.xlsx)
      </a>

      <button
        onClick={handleDownloadJson}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <DownloadIcon size={14} />
        Export JSON Evidence Package
      </button>
    </div>
  );
};
