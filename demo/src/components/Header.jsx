import React, { useState, useEffect, useRef } from 'react';
import { PERSONAS } from './CryptoLogin';

export default function Header({ 
  currentUser, 
  onSwitchUser, 
  onLogout, 
  auditCount, 
  isDockOpen, 
  onToggleDock,
  activeCaseId,
  systemStatus,
  activeTab,
  onSelectTab,
  lastIngestedDoc,
}) {
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [demoStateIndex, setDemoStateIndex] = useState(0); // 0: BLOCKED, 1: DEGRADED, 2: ACTIVE
  const dropdownRef = useRef(null);

  const alternatePersona = PERSONAS.find(p => p.id !== currentUser.id);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCryptoDropdown(false);
      }
    };
    if (showCryptoDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCryptoDropdown]);

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUser.keyFingerprint);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // 3-State Semantic Hierarchy Definition
  const DEMO_STATES = [
    {
      state: 'FAILED',
      icon: '■',
      badgeClass: 'status-blocked',
      detail: 'FAILED · REPAIR NEEDED',
      execution: 'HALTED',
      execIcon: '■',
      execColor: '#a62a2a',
    },
    {
      state: 'WARNING',
      icon: '▲',
      badgeClass: 'status-degraded',
      detail: 'WARNING · NEAR LIMIT',
      execution: 'DEGRADED',
      execIcon: '▲',
      execColor: '#9a671a',
    },
    {
      state: 'PASSED',
      icon: '●',
      badgeClass: 'status-active',
      detail: 'PASSED · SAFE TO OPERATE',
      execution: 'ACTIVE',
      execIcon: '●',
      execColor: '#1b6a4a',
    }
  ];

  const currentAssurance = DEMO_STATES[demoStateIndex];
  const activeAssurance = systemStatus || currentAssurance;

  // Cycle states on click for hackathon jury demonstrations
  const handleCycleAssurance = () => {
    setDemoStateIndex((prev) => (prev + 1) % DEMO_STATES.length);
  };

  // Case identifier
  const caseIdDisplay = systemStatus?.caseId || activeCaseId || (currentUser.id === 'engineer' ? 'CASE-2026-0091' : 'CASE-2026-API510');
  const roleLabel = currentUser.id === 'engineer' ? 'PIPING ENGINEER' : 'CORE DEVELOPER';

  return (
    <header style={{
      ...styles.headerPanel,
      ...(activeTab === 'analysis' ? {
        margin: '4px 14px 4px 14px',
        padding: '5px 14px 4px 14px',
        width: 'calc(100% - 28px)',
        top: '4px',
        gap: '2px',
        flexShrink: 0,
      } : {})
    }} className="instrument-panel">
      {/* ===================================================================
          UPPER DECK: BRAND, TELEMETRY BAY, OPERATOR IDENTITY
          =================================================================== */}
      <div style={styles.upperDeck}>
        
        {/* 1. Left: Engineering Brand (No shield, high typography hierarchy) */}
        <div style={styles.brandBox}>
          <div style={styles.brandTitleRow}>
            <span style={styles.brandTitle}>SMITRACE</span>
            <span style={styles.stationBadge}>STATION 01</span>
          </div>
          <div style={styles.brandSubtitle}>OFFLINE SAFETY WORKBENCH</div>
        </div>

        {/* 2. Center: Instrument Panel (Semantic Hierarchy: Normal, Attention, Blocking) */}
        <div style={styles.telemetryBay}>
          <div style={styles.telemetryHeader}>SYSTEM STATUS</div>
          <div style={styles.telemetryRows}>
            {/* Row 1: Air-Gap Status (Normal State) */}
            <div style={styles.telemetryRow}>
              <span className="instrument-status-badge status-active" style={styles.statusBadge}>
                <span style={{ fontSize: '0.62rem' }}>●</span>
                <span>OFFLINE (NO DATA SHARED)</span>
              </span>
              <span style={styles.monoParam}>LOCAL HOST</span>
            </div>

            {/* Row 2: Assurance Status (Blocking / Attention / Normal) */}
            <div style={styles.telemetryRow}>
              <button 
                onClick={handleCycleAssurance}
                className={`instrument-status-badge ${activeAssurance.badgeClass || 'status-degraded'}`}
                style={{ ...styles.statusBadge, cursor: 'pointer', border: undefined }}
                title="System Assurance Status (Click to cycle demo states)"
              >
                <span style={{ fontSize: '0.65rem' }}>{activeAssurance.icon}</span>
                <span>SAFETY {activeAssurance.state}</span>
              </button>
              <span style={styles.detailText}>
                {activeAssurance.detail}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Right: Compact Operator Identity with Dropdown */}
        <div style={styles.operatorContainer} ref={dropdownRef}>
          <div 
            style={styles.operatorProfile} 
            onClick={() => setShowCryptoDropdown(!showCryptoDropdown)}
            title="Click to view cryptographic identity"
          >
            <div style={styles.avatarCircle}>
              {currentUser.name.charAt(0)}
            </div>
            <div style={styles.operatorText}>
              <div style={styles.operatorName}>{currentUser.name}</div>
              <div style={styles.operatorRoleRow}>
                <span style={styles.operatorRole}>{roleLabel}</span>
                <span style={styles.dropdownChevron}>{showCryptoDropdown ? '▲' : '⌄'}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Identity Popover */}
          {showCryptoDropdown && (
            <div style={styles.cryptoPopover} className="glass-elevated">
              <div style={styles.popoverHeader}>
                <span>USER PROFILE & SECURITY</span>
                <span style={styles.popoverSecurityPill}>OFFLINE SECURE</span>
              </div>
              
              <div style={styles.popoverBody}>
                <div style={styles.keyLabel}>Digital Security Key ID:</div>
                <div style={styles.keyFingerprintBox}>
                  <code>{currentUser.keyFingerprint}</code>
                </div>

                <div style={styles.popoverMetaRow}>
                  <span style={styles.metaLabel}>ACCESS LEVEL:</span>
                  <span style={styles.metaValue}>{currentUser.clearance.split('//')[0]}</span>
                </div>

                <div style={styles.popoverMetaRow}>
                  <span style={styles.metaLabel}>AUTHENTICATION:</span>
                  <span style={styles.metaValue}>Local Hardware Key</span>
                </div>

                <div style={styles.popoverMetaRow}>
                  <span style={styles.metaLabel}>INTERNET ACCESS:</span>
                  <span style={{ ...styles.metaValue, color: '#1b6a4a', fontWeight: '800' }}>BLOCKED (100% Offline)</span>
                </div>

                <div style={styles.popoverActions}>
                  <button 
                    onClick={handleCopyKey}
                    className="btn-glass"
                    style={styles.popoverBtn}
                  >
                    {copiedKey ? '✓ Key ID Copied' : '📋 Copy Key ID'}
                  </button>

                  <button
                    onClick={() => {
                      setShowCryptoDropdown(false);
                      onLogout();
                    }}
                    className="btn-glass"
                    style={styles.popoverLogoutBtn}
                    title="Sign out of workbench"
                  >
                    <span>🔒 Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ===================================================================
          LOWER DECK: CASE TICKER & RUNTIME CONTROLS
          =================================================================== */}
      <div style={styles.lowerDeck}>
        {/* Left: Active Case & Execution State */}
        <div style={styles.caseTicker}>
          <span style={{ color: activeAssurance.execColor || '#8a7d6a', fontSize: '0.75rem', marginRight: '6px' }}>
            {activeAssurance.execIcon || '○'}
          </span>
          <span style={styles.caseIdText}>{caseIdDisplay}</span>
          <span style={styles.tickerDivider}>•</span>
          <span style={{ ...styles.executionStatusText, color: activeAssurance.execColor || '#8a7d6a' }}>
            EXECUTION {activeAssurance.execution}
          </span>
        </div>

        {/* Center: View Navigation Switcher */}
        {activeTab && onSelectTab && (
          <div style={styles.viewTabs}>
            <button
              onClick={() => onSelectTab('vault')}
              className={`btn-glass ${activeTab === 'vault' ? 'btn-primary-bold' : ''}`}
              style={{
                padding: '3px 12px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                background: activeTab === 'vault' 
                  ? 'linear-gradient(135deg, rgba(28, 24, 20, 0.94) 0%, rgba(18, 15, 12, 0.98) 100%)' 
                  : 'rgba(255, 255, 255, 0.45)',
                color: activeTab === 'vault' ? '#faf7f2' : 'var(--text-main)',
                borderColor: activeTab === 'vault' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontWeight: '700',
                cursor: 'pointer',
              }}
              title="Return to Document Ingestion Vault"
            >
              {activeTab === 'analysis' ? '← Back to Document Vault' : '📂 Document Vault'}
            </button>
            <button
              onClick={() => onSelectTab('analysis')}
              className={`btn-glass ${activeTab === 'analysis' ? 'btn-primary-bold' : ''}`}
              style={{
                padding: '3px 12px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                background: activeTab === 'analysis' 
                  ? 'linear-gradient(135deg, rgba(28, 24, 20, 0.94) 0%, rgba(18, 15, 12, 0.98) 100%)' 
                  : 'rgba(255, 255, 255, 0.45)',
                color: activeTab === 'analysis' ? '#faf7f2' : 'var(--text-main)',
                borderColor: activeTab === 'analysis' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              ⚡ Analysis Cockpit
            </button>
          </div>
        )}

        {/* Right: Functional Controls & Fixture Ingestion Status */}
        <div style={styles.controlsGroup}>
          {activeTab === 'analysis' && (
            lastIngestedDoc ? (
              <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                ⚡ Ingested: {lastIngestedDoc.name}
              </span>
            ) : (
              <span className="mono-tag" style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
                Sovereign Fixtures Active
              </span>
            )
          )}

          <button
            onClick={onToggleDock}
            className="btn-glass"
            style={{
              ...styles.auditBtn,
              background: isDockOpen ? 'rgba(214, 168, 98, 0.35)' : 'rgba(255, 255, 255, 0.65)',
              border: isDockOpen ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.85)',
              outline: isDockOpen ? '1px solid var(--accent-gold)' : '1px solid rgba(195, 180, 155, 0.4)',
              boxShadow: isDockOpen ? '0 0 12px rgba(154, 103, 26, 0.3)' : '0 1px 4px rgba(45, 36, 25, 0.05)',
            }}
            title={isDockOpen ? "Close forensic audit ledger" : "Open forensic audit ledger"}
          >
            <span className="pulse-dot pulse-green" style={{ width: '6px', height: '6px' }} />
            <span style={{ fontWeight: '800', letterSpacing: '0.04em' }}>AUDIT LOG</span>
            <span style={styles.auditCountTag}>{auditCount}</span>
            <span style={{ fontSize: '0.7rem' }}>{isDockOpen ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const styles = {
  headerPanel: {
    position: 'sticky',
    top: '6px',
    width: 'calc(100% - 32px)',
    margin: '6px 16px 14px 16px',
    padding: '8px 18px 6px 18px',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxSizing: 'border-box',
  },
  upperDeck: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    position: 'relative',
  },
  brandBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 'auto',
  },
  brandTitleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '5px',
  },
  brandTitle: {
    fontSize: '1.16rem',
    fontWeight: '900',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '-0.02em',
    color: '#15120e',
    lineHeight: '1.1',
  },
  stationBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: '#8a7e6b',
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid rgba(255, 255, 255, 0.65)',
  },
  brandSubtitle: {
    fontSize: '0.55rem',
    fontWeight: '800',
    letterSpacing: '0.11em',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#706554',
    textTransform: 'uppercase',
    marginTop: '1px',
  },
  telemetryBay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(245, 238, 224, 0.30) 0%, rgba(235, 226, 210, 0.16) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.65)',
    boxShadow: 'inset 0 1px 1px rgba(45, 36, 25, 0.02), 0 1px 3px rgba(255, 255, 255, 0.6)',
    borderRadius: '7px',
    padding: '2px 10px',
    minWidth: 'min(100%, 250px)',
  },
  telemetryHeader: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.52rem',
    fontWeight: '800',
    letterSpacing: '0.09em',
    color: '#827563',
    marginBottom: '1px',
    textTransform: 'uppercase',
  },
  telemetryRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    width: '100%',
  },
  telemetryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  statusBadge: {
    minWidth: '115px',
    justifyContent: 'flex-start',
  },
  monoParam: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    fontWeight: '700',
    color: '#4f473b',
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '1px 5px',
    borderRadius: '3px',
    border: '1px solid rgba(255, 255, 255, 0.75)',
  },
  detailText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    fontWeight: '700',
    letterSpacing: '0.03em',
    color: '#6e6252',
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '1px 5px',
    borderRadius: '3px',
    border: '1px solid rgba(255, 255, 255, 0.75)',
  },
  operatorContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  operatorProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '7px',
    background: 'linear-gradient(135deg, rgba(248, 242, 230, 0.40) 0%, rgba(240, 232, 218, 0.22) 100%)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    boxShadow: '0 1px 4px rgba(50, 42, 30, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  avatarCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#9a671a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '0.66rem',
    fontFamily: "'Outfit', sans-serif",
  },
  operatorText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: '1.15',
  },
  operatorName: {
    fontSize: '0.74rem',
    fontWeight: '800',
    color: '#1a1612',
    fontFamily: "'Outfit', sans-serif",
  },
  operatorRoleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  operatorRole: {
    fontSize: '0.55rem',
    fontWeight: '800',
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.05em',
    color: '#706554',
    textTransform: 'uppercase',
  },
  dropdownChevron: {
    fontSize: '0.60rem',
    color: '#8a7d6a',
    fontWeight: '800',
  },
  cryptoPopover: {
    position: 'absolute',
    top: 'calc(100% + 5px)',
    right: '0',
    width: '300px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.95)',
    outline: '1px solid rgba(195, 180, 155, 0.4)',
    boxShadow: '0 16px 40px rgba(40, 32, 22, 0.16), inset 0 1px 1px #ffffff',
    zIndex: 250,
    background: 'rgba(254, 251, 245, 0.88)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  },
  popoverHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '5px',
    borderBottom: '1px solid rgba(200, 185, 160, 0.35)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    fontWeight: '800',
    color: '#554c3e',
  },
  popoverSecurityPill: {
    fontSize: '0.54rem',
    background: 'rgba(27, 106, 74, 0.1)',
    color: '#1b6a4a',
    padding: '1px 4px',
    borderRadius: '3px',
    border: '1px solid rgba(27, 106, 74, 0.3)',
    fontWeight: '800',
  },
  popoverBody: {
    marginTop: '7px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  keyLabel: {
    fontSize: '0.60rem',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#706554',
    fontWeight: '700',
  },
  keyFingerprintBox: {
    background: 'rgba(237, 230, 216, 0.6)',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(180, 165, 140, 0.4)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    color: '#24201a',
    wordBreak: 'break-all',
  },
  popoverMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.62rem',
    fontFamily: "'JetBrains Mono', monospace",
  },
  metaLabel: {
    color: '#827563',
    fontWeight: '700',
  },
  metaValue: {
    color: '#26211a',
    fontWeight: '700',
  },
  popoverActions: {
    marginTop: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  popoverBtn: {
    padding: '4px 8px',
    fontSize: '0.68rem',
    width: '100%',
    justifyContent: 'center',
  },
  lowerDeck: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '4px',
    borderTop: '1px solid rgba(200, 185, 160, 0.25)',
  },
  caseTicker: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    fontWeight: '700',
  },
  viewTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  caseIdText: {
    color: '#1e1a15',
    fontWeight: '800',
  },
  tickerDivider: {
    color: '#a89d8c',
    margin: '0 2px',
  },
  executionStatusText: {
    fontWeight: '800',
    letterSpacing: '0.04em',
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  auditBtn: {
    padding: '3px 8px',
    fontSize: '0.65rem',
    borderRadius: '6px',
    minHeight: '22px',
    gap: '4px',
    color: '#181512',
  },
  auditCountTag: {
    background: '#38322a',
    color: '#f7f4ee',
    padding: '0 3px',
    fontSize: '0.62rem',
    borderRadius: '3px',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: '700',
  },
  popoverLogoutBtn: {
    padding: '6px 10px',
    fontSize: '0.68rem',
    width: '100%',
    justifyContent: 'center',
    background: 'rgba(166, 42, 42, 0.12)',
    color: '#8a1f1f',
    border: '1px solid rgba(166, 42, 42, 0.35)',
    fontWeight: '800',
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: '4px',
    cursor: 'pointer',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};
