import React, { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import CryptoLogin, { PERSONAS } from './components/CryptoLogin';
import Header from './components/Header';
import PermittedVault from './components/PermittedVault';
import PipelineScenario from './components/PipelineScenario';
import CodebaseScenario from './components/CodebaseScenario';
import AuditTerminalDock from './components/AuditTerminalDock';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('SPLASH'); // 'SPLASH', 'LOGIN', 'DASHBOARD'
  const [currentUser, setCurrentUser] = useState(PERSONAS[0]);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [lastIngestedDoc, setLastIngestedDoc] = useState(null);
  const [scenarioStatus, setScenarioStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' or 'analysis'

  // Centralized live system status computation
  const getSystemStatus = () => {
    if (scenarioStatus) return scenarioStatus;
    return {
      state: 'STANDBY',
      icon: '○',
      badgeClass: 'status-standby',
      detail: lastIngestedDoc 
        ? `MOUNTED: ${lastIngestedDoc.name}` 
        : 'AWAITING INGESTION · LOCAL VAULT OPEN',
      execution: 'READY TO OPERATE',
      execIcon: '○',
      execColor: '#9a671a',
      caseId: currentUser.id === 'engineer' ? 'CASE-2026-0091' : 'CASE-2026-API510',
    };
  };

  // Universal Audit & Action Log state
  const [auditLogs, setAuditLogs] = useState([
    {
      timestamp: new Date().toISOString().substring(11, 23),
      actor: 'PLATFORM',
      action: 'Sovereign hardware root of trust initialized in air-gap sandbox',
      hash: '0x94b3c8f102ad99e1',
      details: 'Host: 127.0.0.1 | WAN Egress: BLOCKED (0 packets) | Memory: Protected'
    },
    {
      timestamp: new Date().toISOString().substring(11, 23),
      actor: 'PLATFORM',
      action: 'Statutory verification rulebases mounted (ASME B31.3-2022 & API 510 §7)',
      hash: 'rules:b31_api510:sha256',
      details: 'Z3 SMT Solver engine pool initialized with 0.0% False Assurance Rate policy.'
    }
  ]);

  const addAuditLog = (logItem) => {
    const formattedItem = {
      timestamp: new Date().toISOString().substring(11, 23),
      ...logItem,
    };
    setAuditLogs(prev => [...prev, formattedItem]);
  };

  // Auth handlers
  const handleSplashComplete = () => {
    setCurrentScreen('LOGIN');
    addAuditLog({
      actor: 'PLATFORM',
      action: 'Splash sequence completed. Cryptographic authentication portal activated.',
      hash: 'session:init:' + Math.random().toString(16).substr(2, 8),
      details: 'Awaiting Ed25519 sovereign persona selection.'
    });
  };

  const handleLogin = (persona) => {
    setCurrentUser(persona);
    setCurrentScreen('DASHBOARD');
  };

  const handleSwitchUser = (newPersona) => {
    setCurrentUser(newPersona);
    setLastIngestedDoc(null);
    setScenarioStatus(null);
    setActiveTab('vault');
    addAuditLog({
      actor: 'USER',
      action: `Switched sovereign persona to ${newPersona.name} (${newPersona.title})`,
      hash: newPersona.keyFingerprint,
      details: `Scenario shifted to: ${newPersona.scenarioName}`
    });
  };

  const handleLogout = () => {
    addAuditLog({
      actor: 'USER',
      action: `Terminated cryptographic session for ${currentUser.name}`,
      hash: 'session:closed',
      details: 'Vault memory cleared. Returned to login portal.'
    });
    setLastIngestedDoc(null);
    setScenarioStatus(null);
    setIsDockOpen(false);
    setActiveTab('vault');
    setCurrentScreen('LOGIN');
  };

  return (
    <div style={styles.appContainer}>
      {/* 1. Splash Screen Phase */}
      {currentScreen === 'SPLASH' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {/* 2. Cryptographic Login Phase */}
      {currentScreen === 'LOGIN' && (
        <CryptoLogin 
          onLogin={handleLogin} 
          addAuditLog={addAuditLog} 
        />
      )}

      {/* 3. Main Dashboard Phase */}
      {currentScreen === 'DASHBOARD' && (
        <div style={{
          ...styles.dashboardLayout,
          height: activeTab === 'analysis' && currentUser.id !== 'engineer' ? '100vh' : 'auto',
          minHeight: '100vh',
          maxHeight: activeTab === 'analysis' && currentUser.id !== 'engineer' ? '100vh' : 'none',
          overflow: activeTab === 'analysis' && currentUser.id !== 'engineer' ? 'hidden' : 'visible',
          paddingBottom: activeTab === 'analysis' && currentUser.id !== 'engineer' ? 0 : '40px',
        }}>
          {/* Top Sticky Sovereign Header */}
          <Header
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
            auditCount={auditLogs.length}
            isDockOpen={isDockOpen}
            onToggleDock={() => setIsDockOpen(!isDockOpen)}
            systemStatus={getSystemStatus()}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            lastIngestedDoc={lastIngestedDoc}
          />

          {/* Main Content Area */}
          <main style={{
            ...styles.mainContent,
            padding: activeTab === 'analysis' ? '0 14px 6px 14px' : '0 16px 40px 16px',
            gap: activeTab === 'analysis' ? '4px' : '20px',
            overflow: activeTab === 'analysis' ? (currentUser.id === 'engineer' ? 'auto' : 'hidden') : 'visible',
            flex: 1,
            minHeight: 0,
            height: activeTab === 'analysis' && currentUser.id !== 'engineer' ? '100%' : 'auto',
            maxHeight: activeTab === 'analysis' && currentUser.id !== 'engineer' ? '100%' : 'none',
          }}>
            {/* VIEW 1: Permitted Documents & Ingestion Zone */}
            {activeTab === 'vault' && (
              <>
                <PermittedVault
                  currentUser={currentUser}
                  onDocumentIngested={setLastIngestedDoc}
                  addAuditLog={addAuditLog}
                  onProceedToAnalysis={() => {
                    setActiveTab('analysis');
                    addAuditLog({
                      actor: 'USER',
                      action: `Proceeded to ${currentUser.id === 'engineer' ? 'ASME B31.3 Safety Analysis' : 'Codebase Engineering Lab'}`,
                      hash: 'flow:proceed:analysis',
                      details: `Mounted Document: ${lastIngestedDoc ? lastIngestedDoc.name : 'System Baseline'} | 0 WAN Egress`
                    });
                  }}
                />

                {/* PROCEED BUTTON AFTER INGESTION FOR ANALYSIS */}
                <div style={styles.proceedCard} className="glass-card">
                  <div style={styles.proceedCardLeft}>
                    <span style={{ fontSize: '1.6rem' }}>⚡</span>
                    <div>
                      <div style={styles.proceedTitle}>
                        {currentUser.id === 'engineer' 
                          ? 'Proceed to ASME B31.3 Pipe Safety Limit Analysis' 
                          : 'Proceed to API 510 Codebase Engineering Lab'}
                      </div>
                      <div style={styles.proceedSub}>
                        {lastIngestedDoc ? (
                          <span>
                            Live Ingested Artifact Sealed: <strong style={{ color: '#1a1612' }}>{lastIngestedDoc.name}</strong> • 
                            SHA-256: <code style={{ fontFamily: 'monospace', color: '#8b4513' }}>{lastIngestedDoc.hash.substring(0, 24)}...</code> • Client-Side Sealed
                          </span>
                        ) : (
                          <span>Sovereign Enclave Ready • Using verified standard statutory baseline datasets</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('analysis');
                      addAuditLog({
                        actor: 'USER',
                        action: `Proceeded to ${currentUser.id === 'engineer' ? 'ASME B31.3 Analysis' : 'Codebase Lab'}`,
                        hash: 'flow:proceed:analysis',
                        details: `Dataset: ${lastIngestedDoc ? lastIngestedDoc.name : 'System Baseline'} | Verified 0 WAN Egress`
                      });
                    }}
                    className="btn-glass btn-primary-bold"
                    style={styles.proceedBtn}
                    id="btn-proceed-to-analysis"
                    title="Proceed to active scenario analysis"
                  >
                    <span>Proceed to Analysis</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>➔</span>
                  </button>
                </div>
              </>
            )}

            {/* VIEW 2: Active Scenario Analysis Cockpit */}
            {activeTab === 'analysis' && (
              <>
                {currentUser.id === 'engineer' ? (
                  <PipelineScenario
                    currentUser={currentUser}
                    addAuditLog={addAuditLog}
                    lastIngestedDoc={lastIngestedDoc}
                    onStatusChange={setScenarioStatus}
                  />
                ) : (
                  <CodebaseScenario
                    currentUser={currentUser}
                    addAuditLog={addAuditLog}
                    lastIngestedDoc={lastIngestedDoc}
                    onStatusChange={setScenarioStatus}
                  />
                )}
              </>
            )}
          </main>

          {/* Expandable Bottom Terminal Dock — slides up when AUDIT LOG button clicked */}
          <AuditTerminalDock
            logs={auditLogs}
            isOpen={isDockOpen}
            onToggle={() => setIsDockOpen(!isDockOpen)}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    position: 'relative',
    width: '100%',
  },
  dashboardLayout: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '40px',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    width: '100%',
    margin: 0,
    padding: '0 16px 40px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
  },
  proceedCard: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    borderRadius: '14px',
    background: 'rgba(255, 252, 244, 0.78)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1.5px solid var(--accent-gold)',
    boxShadow: '0 8px 32px rgba(154, 103, 26, 0.15), inset 0 1px 2px #ffffff',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  proceedCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flex: '1 1 320px',
  },
  proceedTitle: {
    fontSize: '0.96rem',
    fontWeight: '800',
    color: '#1a1612',
    letterSpacing: '-0.01em',
  },
  proceedSub: {
    fontSize: '0.78rem',
    color: '#6a5e4e',
    marginTop: '3px',
    lineHeight: '1.4',
  },
  proceedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 28px',
    fontSize: '0.92rem',
    fontWeight: '800',
    borderRadius: '10px',
    boxShadow: '0 6px 20px rgba(154, 103, 26, 0.35), inset 0 1px 1px #ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.95) 0%, rgba(146, 64, 14, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#ffffff',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
  },
  analysisTopNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '-6px',
  },
  backBtn: {
    padding: '8px 18px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#2a2218',
    cursor: 'pointer',
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    boxShadow: 'var(--glass-shadow-sm), inset 0 1px 1px #ffffff',
  },
};
