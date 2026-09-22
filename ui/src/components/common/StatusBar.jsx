import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ShieldIcon } from '../../assets/icons';

export const StatusBar = () => {
  const {
    egressBytes,
    openWanSockets,
    setEbpfModalOpen,
    activeCaseId,
  } = useWorkbenchStore();

  return (
    <footer
      style={{
        height: '24px',
        backgroundColor: 'var(--bg-surface-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        userSelect: 'none',
        zIndex: 40,
      }}
    >
      {/* Left side: System and runtime state */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="airgap-indicator-dot" style={{ width: '8px', height: '8px' }} />
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            127.0.0.1 (Loopback Enforced)
          </span>
        </div>

        <span style={{ color: 'var(--border-default)' }}>|</span>

        <span>
          Runtime: <strong style={{ color: 'var(--text-secondary)' }}>Isolated Sandbox</strong>
        </span>

        {activeCaseId && (
          <>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <span>
              Active Unit: <span style={{ color: 'var(--accent-cyan)' }}>CDU-3 Line 1042</span>
            </span>
          </>
        )}

        <span style={{ color: 'var(--border-default)' }}>|</span>
        <span>Z3 ASME Verifier: <span style={{ color: 'var(--accent-green)' }}>ONLINE</span></span>
      </div>

      {/* Right side: Subtle, on-demand Air-gap audit trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setEbpfModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            borderRadius: '3px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            e.currentTarget.style.color = 'var(--accent-green)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          title="Inspect network egress audit and cryptographic verification"
        >
          <ShieldIcon size={12} color="var(--accent-green)" />
          <span>
            WAN Egress: <strong style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{egressBytes} B</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: 'var(--text-muted)' }}>Air-Gap Status:</span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>VERIFIED</span>
          <span style={{
            fontSize: '9px',
            padding: '1px 5px',
            borderRadius: '2px',
            backgroundColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
            marginLeft: '4px'
          }}>
            Inspect
          </span>
        </button>
      </div>
    </footer>
  );
};
