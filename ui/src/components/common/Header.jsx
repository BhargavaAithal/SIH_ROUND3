import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ShieldIcon, SunIcon, MoonIcon, ActivityIcon } from '../../assets/icons';

export const Header = () => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    airgapStatus,
    throughputKbps,
    egressBytes,
    setEbpfModalOpen,
  } = useWorkbenchStore();

  const tabs = [
    { id: 'pid', label: '1. P&ID Viewer Canvas' },
    { id: 'sandbox', label: '2. Calculation Sandbox' },
    { id: 'z3', label: '3. Z3 Formal Audit' },
    { id: 'deliverables', label: '4. Deliverables' },
  ];

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
      {/* Left: Brand & Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setActiveTab('pid')}>
          <ShieldIcon size={22} color="var(--accent-green)" />
          <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
            SMITRACE
          </span>
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        }}>
          Paradip Refinery • CDU-1
        </div>
      </div>

      {/* Center: 4-Viewport Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-green)' : '2px solid transparent',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right: Sovereignty Badge & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Sovereignty Pulsing Badge */}
        <div
          onClick={() => setEbpfModalOpen(true)}
          title="Click to view kernel eBPF socket inspection and air-gap audit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            backgroundColor: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green)',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
          }}
        >
          <span className="airgap-indicator-dot" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-green)', letterSpacing: '0.04em' }}>
            AIR-GAP ACTIVE: {egressBytes} BYTES WAN
          </span>
          <span style={{ color: 'var(--border-default)', fontSize: '11px' }}>|</span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
            {throughputKbps.toFixed(2)} KB/s
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Modern Light' : 'Industrial Dark'} theme`}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          {theme === 'dark' ? <SunIcon size={16} color="var(--accent-amber)" /> : <MoonIcon size={16} color="var(--accent-indigo)" />}
        </button>
      </div>
    </header>
  );
};
