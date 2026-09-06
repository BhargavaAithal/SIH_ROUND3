import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { TerminalIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from '../../assets/icons';

export const ReActConsole = () => {
  const { turns, activeTurnIndex, setActiveTurnIndex } = useWorkbenchStore();

  const getStatusBadge = (category, status) => {
    switch (category) {
      case 'AST_VIOLATION':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-danger-bg)',
            color: 'var(--accent-danger)',
            border: '1px solid var(--accent-danger)',
          }}>
            AST VIOLATION (BLOCKED)
          </span>
        );
      case 'RUNTIME_ERROR':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-amber-bg)',
            color: 'var(--accent-amber)',
            border: '1px solid var(--accent-amber)',
          }}>
            RUNTIME ERROR (RECOVERING)
          </span>
        );
      case 'CONVERGED':
        return (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-green-bg)',
            color: 'var(--accent-green)',
            border: '1px solid var(--accent-green)',
          }}>
            CONVERGED (SAT)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
    }}>
      {/* Console Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TerminalIcon size={16} color="var(--accent-green)" />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>
            ReAct Self-Correction Execution Trace (3-Turn Loop)
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          State-Isolated Anti-Collapse
        </span>
      </div>

      {/* Turns Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {turns.map((t, idx) => {
          const isSelected = activeTurnIndex === idx;
          return (
            <div
              key={t.turn}
              onClick={() => setActiveTurnIndex(idx)}
              style={{
                borderRadius: '8px',
                border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-primary)',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Turn Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}>
                    TURN #{t.turn}
                  </span>
                  {getStatusBadge(t.category, t.status)}
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  hash: {t.hash.substring(0, 8)}...
                </span>
              </div>

              {/* Thought Trace */}
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Thought: </strong>
                {t.thought}
              </div>

              {/* Violations or Execution Details */}
              {t.violations && t.violations.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--accent-danger-bg)',
                  border: '1px solid var(--accent-danger)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'var(--accent-danger)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {t.violations.map((v, i) => <div key={i}>⚠️ {v}</div>)}
                </div>
              )}

              {t.stderr && (
                <div style={{
                  backgroundColor: 'var(--accent-amber-bg)',
                  border: '1px solid var(--accent-amber)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'var(--accent-amber)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {t.stderr}
                </div>
              )}

              {t.stdout && (
                <div style={{
                  backgroundColor: 'var(--accent-green-bg)',
                  border: '1px solid var(--accent-green)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'var(--accent-green)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  Stdout: {t.stdout}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
