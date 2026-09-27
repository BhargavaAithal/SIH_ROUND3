import React, { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import CryptoLogin, { PERSONAS } from './components/CryptoLogin';
import Header from './components/Header';
import PermittedVault from './components/PermittedVault';
import PipelineScenario from './components/PipelineScenario';
import CodebaseScenario from './components/CodebaseScenario';
import AuditTerminalDock from './components/AuditTerminalDock';

// ── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 'ingest',   label: 'Document Ingestion', icon: '📂' },
  { id: 'scenario', label: 'Analysis & Proof',   icon: '🔬' },
  { id: 'audit',    label: 'Audit Ledger',        icon: '🔏' },
];

// ── Proceed Gate Bar ──────────────────────────────────────────────────────────
function ProceedBar({ label, sublabel, icon, onClick, secondaryLabel, onSecondary }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div style={proceedStyles.wrap}>
      <div style={proceedStyles.inner}>
        {onSecondary && (
          <button style={proceedStyles.secondaryBtn} onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
        <div style={proceedStyles.textWrap}>
          {sublabel && <span style={proceedStyles.sublabel}>{sublabel}</span>}
        </div>
        <button
          style={{ ...proceedStyles.btn, ...(hovered ? proceedStyles.btnHover : {}) }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onClick}
        >
          <span style={proceedStyles.btnIcon}>{icon}</span>
          {label}
          <span style={proceedStyles.arrow}>→</span>
        </button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('SPLASH');
  const [currentUser,   setCurrentUser]   = useState(PERSONAS[0]);
  const [isDockOpen,    setIsDockOpen]    = useState(false);
  const [lastIngestedDoc, setLastIngestedDoc] = useState(null);
  const [dashboardStep, setDashboardStep] = useState('ingest');
  const [scenarioStatus, setScenarioStatus] = useState(null);

  // Centralized live system status computation
  const getSystemStatus = () => {
    if (dashboardStep === 'ingest') {
      return {
        state: 'STANDBY',
        icon: '○',
        badgeClass: 'status-standby',
        detail: lastIngestedDoc 
          ? `MOUNTED: ${lastIngestedDoc.name}` 
          : 'AWAITING INGESTION · LOCAL VAULT OPEN',
        execution: 'STANDBY',
        execIcon: '○',
        execColor: '#9a671a',
        caseId: currentUser.id === 'engineer' ? 'CASE-2026-0091' : 'CASE-2026-API510',
      };
    }

    if (dashboardStep === 'scenario') {
      if (scenarioStatus) return scenarioStatus;
      return {
        state: 'STANDBY',
        icon: '▷',
        badgeClass: 'status-degraded',
        detail: 'AWAITING DETERMINISTIC PROOF RUN',
        execution: 'READY TO SOLVE',
        execIcon: '▷',
        execColor: '#9a671a',
        caseId: currentUser.id === 'engineer' ? 'CASE-2026-B31-03' : 'CASE-2026-API510',
      };
    }

    if (dashboardStep === 'audit') {
      return {
        state: 'SEALED',
        icon: '🔏',
        badgeClass: 'status-active',
        detail: 'ALL PROOF ARTIFACTS COMMITTED TO MERKLE WAL',
        execution: 'AUDITED & IMMUTABLE',
        execIcon: '✓',
        execColor: '#1b6a4a',
        caseId: currentUser.id === 'engineer' ? 'CASE-2026-B31-03' : 'CASE-2026-API510',
      };
    }

    return null;
  };

  const [auditLogs, setAuditLogs] = useState([
    {
      timestamp: new Date().toISOString().substring(11, 23),
      actor: 'PLATFORM',
      action: 'Sovereign hardware root of trust initialized in air-gap sandbox',
      hash: '0x94b3c8f102ad99e1',
      details: 'Host: 127.0.0.1 | WAN Egress: BLOCKED (0 packets) | Memory: Protected',
    },
    {
      timestamp: new Date().toISOString().substring(11, 23),
      actor: 'PLATFORM',
      action: 'Statutory verification rulebases mounted (ASME B31.3-2022 & API 510 §7)',
      hash: 'rules:b31_api510:sha256',
      details: 'Z3 SMT Solver engine pool initialized with 0.0% False Assurance Rate policy.',
    },
  ]);

  const addAuditLog = (logItem) => {
    setAuditLogs(prev => [
      ...prev,
      { timestamp: new Date().toISOString().substring(11, 23), ...logItem },
    ]);
  };

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goToStep = (id) => {
    setDashboardStep(id);
    setIsDockOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const proceedToScenario = () => {
    addAuditLog({
      actor: 'USER',
      action: 'Document vault sealed. Proceeding to Analysis & Proof stage.',
      hash: 'stage:ingest→scenario:' + Date.now().toString(16),
      details: lastIngestedDoc
        ? `Active document: ${lastIngestedDoc.name}`
        : 'Using pre-mounted baseline documents.',
    });
    goToStep('scenario');
  };

  const proceedToAudit = () => {
    addAuditLog({
      actor: 'USER',
      action: 'Analysis stage committed. Opening forensic audit ledger.',
      hash: 'stage:scenario→audit:' + Date.now().toString(16),
      details: 'All proof artifacts sealed into Merkle WAL.',
    });
    setIsDockOpen(false);
    goToStep('audit');
  };

  const restartFlow = () => {
    setDashboardStep('ingest');
    setLastIngestedDoc(null);
    setScenarioStatus(null);
    setIsDockOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Auth handlers ────────────────────────────────────────────────────────
  const handleSplashComplete = () => {
    setCurrentScreen('LOGIN');
    addAuditLog({
      actor: 'PLATFORM',
      action: 'Splash sequence completed. Cryptographic authentication portal activated.',
      hash: 'session:init:' + Math.random().toString(16).substr(2, 8),
      details: 'Awaiting Ed25519 sovereign persona selection.',
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
    setDashboardStep('ingest');
    addAuditLog({
      actor: 'USER',
      action: `Switched sovereign persona to ${newPersona.name} (${newPersona.title})`,
      hash: newPersona.keyFingerprint,
      details: `Scenario shifted to: ${newPersona.scenarioName}`,
    });
  };

  const handleLogout = () => {
    addAuditLog({
      actor: 'USER',
      action: `Terminated cryptographic session for ${currentUser.name}`,
      hash: 'session:closed',
      details: 'Vault memory cleared. Returned to login portal.',
    });
    setLastIngestedDoc(null);
    setDashboardStep('ingest');
    setCurrentScreen('LOGIN');
  };

  const stepIndex = STEPS.findIndex(s => s.id === dashboardStep);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.appContainer}>

      {/* Splash */}
      {currentScreen === 'SPLASH' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {/* Login */}
      {currentScreen === 'LOGIN' && (
        <CryptoLogin onLogin={handleLogin} addAuditLog={addAuditLog} />
      )}

      {/* Dashboard — linear step flow */}
      {currentScreen === 'DASHBOARD' && (
        <div style={styles.dashboardLayout}>

          {/* Sticky sovereign header */}
          <Header
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
            auditCount={auditLogs.length}
            isDockOpen={isDockOpen}
            onToggleDock={() => setIsDockOpen(!isDockOpen)}
            systemStatus={getSystemStatus()}
          />

          {/* Step progress strip */}
          <div style={styles.stepBarWrap}>
            <div style={styles.stepBar}>
              {STEPS.map((step, idx) => {
                const isActive = step.id === dashboardStep;
                const isDone   = idx < stepIndex;
                return (
                  <React.Fragment key={step.id}>
                    <div style={{
                      ...styles.stepChip,
                      ...(isActive ? styles.stepChipActive : {}),
                      ...(isDone   ? styles.stepChipDone   : {}),
                    }}>
                      <span style={styles.stepIcon}>{isDone ? '✓' : step.icon}</span>
                      <span style={styles.stepLabel}>
                        <span style={styles.stepNum}>Step {idx + 1}</span>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{
                        ...styles.stepConnector,
                        ...(isDone ? styles.stepConnectorDone : {}),
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Main content — only active step rendered */}
          <main style={styles.mainContent}>

            {/* STEP 1 — Document Ingestion */}
            {dashboardStep === 'ingest' && (
              <>
                <PermittedVault
                  currentUser={currentUser}
                  onDocumentIngested={setLastIngestedDoc}
                  addAuditLog={addAuditLog}
                />
                <ProceedBar
                  label="Proceed to Analysis & Proof"
                  sublabel={
                    lastIngestedDoc
                      ? `Active: ${lastIngestedDoc.name}`
                      : 'Using pre-mounted baseline documents'
                  }
                  icon="🔬"
                  onClick={proceedToScenario}
                />
              </>
            )}

            {/* STEP 2 — Scenario Analysis */}
            {dashboardStep === 'scenario' && (
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
                <ProceedBar
                  label="Proceed to Audit Ledger"
                  sublabel="Seal proof artifacts into the Merkle forensic log"
                  icon="🔏"
                  onClick={proceedToAudit}
                  secondaryLabel="← Back to Document Ingestion"
                  onSecondary={() => goToStep('ingest')}
                />
              </>
            )}

            {/* STEP 3 — Audit Terminal (full-page) */}
            {dashboardStep === 'audit' && (
              <div style={styles.auditStage}>
                <div style={styles.auditStageHeader}>
                  <div>
                    <h2 style={styles.auditTitle}>🔏 Forensic Audit Ledger</h2>
                    <p style={styles.auditSub}>
                      Append-only SHA-256 Merkle event chain — full session history
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      style={styles.backBtn}
                      onClick={() => goToStep('scenario')}
                    >
                      ← Back to Analysis
                    </button>
                    <button style={styles.restartBtn} onClick={restartFlow}>
                      ↩ New Mission
                    </button>
                  </div>
                </div>
                <AuditTerminalDock
                  logs={auditLogs}
                  isOpen={true}
                  embedded={true}
                  onToggle={() => {}}
                  onClearLogs={() => setAuditLogs([])}
                />
              </div>
            )}

          </main>

          {/* Collapsible dock available on steps 1 & 2 */}
          {dashboardStep !== 'audit' && (
            <AuditTerminalDock
              logs={auditLogs}
              isOpen={isDockOpen}
              onToggle={() => setIsDockOpen(!isDockOpen)}
              onClearLogs={() => setAuditLogs([])}
            />
          )}

        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  appContainer: {
    minHeight: '100vh',
    position: 'relative',
  },
  dashboardLayout: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '24px',
  },

  /* Step progress bar */
  stepBarWrap: {
    position: 'sticky',
    top: 0,
    zIndex: 60,
    background: 'rgba(18, 14, 10, 0.94)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderBottom: '1px solid rgba(255,200,80,0.10)',
    padding: '10px 20px',
  },
  stepBar: {
    maxWidth: '1360px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
  },
  stepChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(255,200,80,0.12)',
    background: 'rgba(255,255,255,0.03)',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  stepChipActive: {
    border: '1px solid rgba(255,190,40,0.55)',
    background: 'rgba(255,190,40,0.10)',
    boxShadow: '0 0 18px rgba(255,190,40,0.14)',
  },
  stepChipDone: {
    border: '1px solid rgba(80,200,120,0.38)',
    background: 'rgba(80,200,120,0.06)',
  },
  stepIcon: {
    fontSize: '1rem',
    lineHeight: 1,
  },
  stepLabel: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 600,
  },
  stepNum: {
    fontSize: '0.58rem',
    color: 'rgba(255,200,80,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    fontWeight: 700,
  },
  stepConnector: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.07)',
    margin: '0 10px',
    minWidth: '20px',
    maxWidth: '80px',
  },
  stepConnectorDone: {
    background: 'rgba(80,200,120,0.32)',
  },

  /* Main content */
  mainContent: {
    flex: 1,
    maxWidth: '1360px',
    width: '100%',
    margin: '0 auto',
    padding: '0 20px 40px 20px',
  },

  /* Audit stage */
  auditStage: {
    marginTop: '24px',
  },
  auditStageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  auditTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#15120e',
    letterSpacing: '-0.02em',
    fontFamily: "'Outfit', sans-serif",
  },
  auditSub: {
    margin: '6px 0 0 0',
    fontSize: '0.85rem',
    color: '#554c3d',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
  },
  restartBtn: {
    padding: '10px 20px',
    border: '1.5px solid #d97706',
    borderRadius: '8px',
    background: '#d97706',
    color: '#ffffff',
    fontSize: '0.86rem',
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 2px 10px rgba(217, 119, 6, 0.35)',
    transition: 'all 0.2s',
  },
  backBtn: {
    padding: '10px 20px',
    border: '1.5px solid #c5baa8',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#15120e',
    fontSize: '0.86rem',
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 1px 4px rgba(45, 36, 25, 0.08)',
    transition: 'all 0.2s',
  },
};

const proceedStyles = {
  wrap: {
    marginTop: '36px',
    padding: '24px 0 12px 0',
    borderTop: '1px solid #dcd3c4',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '16px',
    flexWrap: 'wrap',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  sublabel: {
    fontSize: '0.84rem',
    color: '#554c3d',
    fontFamily: "'JetBrains Mono', monospace",
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 700,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 34px',
    border: '2px solid #d97706',
    borderRadius: '10px',
    background: '#d97706',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 18px rgba(217, 119, 6, 0.45)',
    whiteSpace: 'nowrap',
    fontFamily: "'Outfit', sans-serif",
  },
  btnHover: {
    background: '#b45309',
    border: '2px solid #b45309',
    boxShadow: '0 6px 24px rgba(217, 119, 6, 0.65)',
    transform: 'translateY(-2px)',
  },
  btnIcon: {
    fontSize: '1.2rem',
  },
  arrow: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    padding: '12px 22px',
    border: '1.5px solid #c5baa8',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#15120e',
    fontSize: '0.86rem',
    cursor: 'pointer',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 4px rgba(45, 36, 25, 0.08)',
    transition: 'all 0.2s',
  },
};
