import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ShieldIcon, CheckCircleIcon, XCircleIcon } from '../../assets/icons';

export const ASTGuardViewer = () => {
  const { codeEditorContent } = useWorkbenchStore();

  const rules = [
    { category: 'Network Protocols', modules: 'socket, requests, urllib, http, aiohttp', status: 'BLOCKED' },
    { category: 'Process Execution', modules: 'subprocess, os, posix, sys, shutil', status: 'BLOCKED' },
    { category: 'Dynamic Evaluation', modules: 'eval, exec, __import__, globals, locals', status: 'BLOCKED' },
    { category: 'Object Reflection', modules: '__subclasses__, __bases__, __globals__', status: 'BLOCKED' },
  ];

  // Simple live client-side heuristic detection matching backend ast_guard
  const detectedViolations = [];
  const lowerCode = codeEditorContent.toLowerCase();

  ['socket', 'subprocess', 'os.', 'sys.', 'eval(', 'exec(', '__subclasses__', 'requests'].forEach((keyword) => {
    if (lowerCode.includes(keyword)) {
      detectedViolations.push(`Detected forbidden keyword/module: "${keyword}" [Rule: ZERO_TRUST_AST]`);
    }
  });

  const isClean = detectedViolations.length === 0;

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'var(--bg-surface-elevated)',
      borderTop: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldIcon size={16} color={isClean ? 'var(--accent-green)' : 'var(--accent-danger)'} />
          <span style={{ fontSize: '12px', fontWeight: 700 }}>
            AST Guard Real-Time Policy Inspector
          </span>
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: isClean ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
          color: isClean ? 'var(--accent-green)' : 'var(--accent-danger)',
          border: `1px solid ${isClean ? 'var(--accent-green)' : 'var(--accent-danger)'}`,
        }}>
          {isClean ? 'ALL AST POLICIES PASS' : `${detectedViolations.length} VIOLATIONS DETECTED`}
        </span>
      </div>

      {detectedViolations.length > 0 ? (
        <div style={{
          backgroundColor: 'var(--accent-danger-bg)',
          border: '1px solid var(--accent-danger)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '11px',
          color: 'var(--accent-danger)',
          fontFamily: 'var(--font-mono)',
          marginBottom: '10px',
        }}>
          {detectedViolations.map((v, i) => <div key={i}>🚫 {v}</div>)}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          fontSize: '11px',
        }}>
          {rules.map((r, idx) => (
            <div key={idx} style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '8px',
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
                {r.category}
              </div>
              <div style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '10px' }}>
                ✓ {r.status}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px' }}>
                {r.modules}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
