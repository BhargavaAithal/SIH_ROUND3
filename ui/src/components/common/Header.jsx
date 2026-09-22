import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ShieldIcon, SunIcon, MoonIcon } from '../../assets/icons';

export const Header = () => {
  const {
    activeTab,
    setActiveTab,
    unlockedTabs,
    theme,
    toggleTheme,
    currentBeat,
    activeCaseId,
    resetToBeat1,
    egressBytes,
    setEbpfModalOpen,
  } = useWorkbenchStore();

  const allTabs = [
    { id: 'ingest', label: '1. Ingestion', icon: '📁' },
    { id: 'pid', label: '2. P&ID Spatial Graph', icon: '📐' },
    { id: 'sandbox', label: '3. Router & Agent', icon: '⚡' },
    { id: 'z3', label: '4. Z3 Formal Audit', icon: '🛡️' },
    { id: 'deliverables', label: '5. Deliverables (.DOCX)', icon: '📄' },
  ];

  // Only display tabs that have been reached / unlocked sequentially
  const visibleTabs = allTabs.filter((t) => (unlockedTabs || ['ingest']).includes(t.id));

  return (
    <header style={{
      height: '56px',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'relative',
      zIndex: 50,
      userSelect: 'none',
    }}>
      {/* Left: Sovereign Brand & Active Case Identifier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          onClick={() => setActiveTab('ingest')}
        >
          <ShieldIcon size={22} color="var(--accent-green)" />
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            SMITRACE
          </span>
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        }}>
          CDU-3 • Refinery
        </span>

        {activeCaseId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(6, 182, 212, 0.10)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: 'var(--accent-cyan)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
            <span>{activeCaseId}</span>
          </div>
        )}
      </div>

      {/* Center: Sequentially Unlocked Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-default)' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Controls & Air-Gap Sovereignty Seal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Air-Gap Verification Pill */}
        <button
          onClick={() => setEbpfModalOpen(true)}
          title="Inspect eBPF kernel network monitor and air-gap proof"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span className="airgap-indicator-dot" style={{ width: '8px', height: '8px' }} />
          <span>AIR-GAP: {egressBytes} B WAN</span>
        </button>

        {currentBeat > 1 && (
          <button
            className="glass-btn glass-btn-sm"
            onClick={resetToBeat1}
            title="Start new case"
          >
            <span>↻</span>
            <span>New Case</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          className="glass-btn glass-btn-sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Modern Light' : 'Industrial Dark'} theme`}
          style={{ padding: '6px 9px' }}
        >
          {theme === 'dark' ? <SunIcon size={14} color="var(--accent-amber)" /> : <MoonIcon size={14} color="var(--accent-indigo)" />}
        </button>
      </div>
    </header>
  );
};

