import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ShieldIcon } from '../../assets/icons';

export const ProofLogViewer = () => {
  const { z3Result } = useWorkbenchStore();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldIcon size={16} color="var(--accent-indigo)" />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>
            Formal SMT Solver Proof Log (Exact Rational Arithmetic Q)
          </span>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
          Exact tm = {z3Result.rational_tm || '223/1008'} in
        </span>
      </div>

      {/* Proof Log Content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <pre style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          lineHeight: '1.6',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          height: '100%',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {z3Result.proof_log}
        </pre>
      </div>
    </div>
  );
};
