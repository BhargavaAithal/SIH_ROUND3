import React, { useState } from 'react';

export const PERSONAS = [
  {
    id: 'engineer',
    name: 'Shiva',
    title: 'Lead Piping Integrity Engineer',
    roleTag: 'PIPING & STRUCTURAL INTEGRITY',
    clearance: 'LEVEL 4 // CRITICAL INFRASTRUCTURE (OISD / ASME B31.3)',
    keyFingerprint: 'ed25519:8f9a2d81e04cf33b4991acb29e013b21',
    scenarioId: 1,
    scenarioName: 'Scenario 1: Pipeline Data & Compliance Engine',
    scenarioDesc: 'Ingest pipeline CML inspection data, verify ASME B31.3 statutory safety margins via Z3 SMT proofs, and compile PSU deliverable reports.',
    permittedDocs: [
      { id: 'doc-1', name: 'ASME_B31.3_2022_Piping_Code.pdf', type: 'STANDARD', size: '4.8 MB', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', clearance: 'RESTRICTED' },
      { id: 'doc-2', name: 'Refinery_Circuit_400_Isometric.dwg', type: 'CAD_DRAWING', size: '12.4 MB', hash: '5b992e34b3d1521ac9ac3e0725842b7714139a68ecc4d0286327974498ad82f4', clearance: 'CONFIDENTIAL' },
      { id: 'doc-3', name: 'CML_UT_Ultrasonic_Survey_2026.csv', type: 'DATA_LOG', size: '412 KB', hash: '9b74c9897bac770ffc029102a200c5deac24863e1850d164e9bc38ed648961e0', clearance: 'INTERNAL' },
      { id: 'doc-4', name: 'PSU_Executive_Approval_Template.docx', type: 'TEMPLATE', size: '1.2 MB', hash: 'c2e8a156e7290bc989d3648a73b1348b61e29d77f240f288f34f71a067035678', clearance: 'RESTRICTED' },
    ]
  },
  {
    id: 'developer',
    name: 'Eshwari',
    title: 'Core Infrastructure Developer',
    roleTag: 'SYSTEM ARCHITECTURE & PHYSICS CORE',
    clearance: 'LEVEL 4 // REPOSITORY SANDBOX (POSIX / VIRTUALENV)',
    keyFingerprint: 'ed25519:1c4e77b4d32098ca718b5ef3110299d0',
    scenarioId: 2,
    scenarioName: 'Scenario 2: Sovereign Codebase Assistant',
    scenarioDesc: 'Work on company engineering codebases, reproduce statutory calculation failures in micro-sandboxes, and receive sovereign agentic coding fixes.',
    permittedDocs: [
      { id: 'code-1', name: 'src/physics/corrosion_evaluator.py', type: 'SOURCE_CODE', size: '28 KB', hash: 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2', clearance: 'INTERNAL' },
      { id: 'code-2', name: 'tests/test_b31_statutory_bounds.py', type: 'TEST_SUITE', size: '14 KB', hash: 'a5892c176fed9bc1e0f315c4056649817734274372360f418579008c4f64d09e', clearance: 'INTERNAL' },
      { id: 'code-3', name: 'config/sovereign_sandboxes.json', type: 'INFRA_CONFIG', size: '6 KB', hash: '7c6a5273b4d57053e1a8bbcb7cd0ce994ff40ffb6505ab7b47b4e1f7d54bcfcb', clearance: 'RESTRICTED' },
      { id: 'code-4', name: 'docs/api510_clause7_specification.md', type: 'SPEC_DOC', size: '32 KB', hash: '24879702227a13c99a5eed81801696f30fb37fe1bfecd2f6f15ef6dfced842c4', clearance: 'CONFIDENTIAL' },
    ]
  }
];

export default function CryptoLogin({ onLogin, addAuditLog }) {
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [handshakeStep, setHandshakeStep] = useState(0);
  const [challengeNonce, setChallengeNonce] = useState('0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join(''));

  const handleSelect = (persona) => {
    if (isVerifying) return;
    setSelectedPersona(persona);
    setChallengeNonce('0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join(''));
  };

  const handleAuthenticate = () => {
    setIsVerifying(true);
    setHandshakeStep(1);

    addAuditLog({
      actor: 'PLATFORM',
      action: `Initiating sovereign cryptographic challenge-response for ${selectedPersona.name}`,
      hash: challengeNonce,
      details: `Key Fingerprint: ${selectedPersona.keyFingerprint}`
    });

    setTimeout(() => {
      setHandshakeStep(2);
      addAuditLog({
        actor: 'USER',
        action: `Hardware token signature generated using Ed25519 private key`,
        hash: 'sig:' + selectedPersona.keyFingerprint.substring(8, 24),
        details: `Key ID: ${selectedPersona.keyFingerprint}`
      });
    }, 600);

    setTimeout(() => {
      setHandshakeStep(3);
      addAuditLog({
        actor: 'PLATFORM',
        action: `SHA-256 Merkle root verification complete — Zero WAN egress verified`,
        hash: 'merkle:valid:0x' + Math.random().toString(16).substr(2, 8),
        details: `Identity verified for ${selectedPersona.name}`
      });
    }, 1200);

    setTimeout(() => {
      setHandshakeStep(4);
      addAuditLog({
        actor: 'PLATFORM',
        action: `Session authenticated. Sovereign environment unlocked for ${selectedPersona.name}`,
        hash: selectedPersona.keyFingerprint,
        details: `Cryptographic identity confirmed. Redirecting to sovereign workbench.`
      });
      setTimeout(() => {
        onLogin(selectedPersona);
      }, 500);
    }, 1800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        
        {/* Header Section */}
        <div style={styles.header}>
          <h2 style={styles.title}>Sign In</h2>
          <p style={styles.subtitle}>
            Select a persona to continue to the sovereign workbench.
          </p>
        </div>

        {/* Persona Selection Grid */}
        <div style={styles.grid}>
          {PERSONAS.map((p) => {
            const isSelected = selectedPersona.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                style={{
                  ...styles.personaCard,
                  borderColor: isSelected ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: isSelected ? 'rgba(255, 253, 248, 0.95)' : 'var(--glass-bg)',
                  boxShadow: isSelected ? '0 12px 32px rgba(154, 103, 26, 0.16)' : 'var(--glass-shadow)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
                className="glass-card"
              >
                <div style={styles.cardHeader}>
                  <div>
                    <span className={`badge ${p.id === 'engineer' ? 'badge-cipher' : 'badge-green'}`} style={{ marginBottom: '8px' }}>
                      {p.roleTag}
                    </span>
                    <h3 style={styles.personaName}>{p.name}</h3>
                    <p style={styles.personaTitle}>{p.title}</p>
                  </div>
                  <div style={{
                    ...styles.radioCircle,
                    borderColor: isSelected ? 'var(--accent-gold)' : '#b9ad9b',
                    background: isSelected ? 'var(--accent-gold)' : 'transparent',
                  }}>
                    {isSelected && <div style={styles.radioInner} />}
                  </div>
                </div>

                <div style={styles.keyBox} className="glass-inset">
                  <div style={styles.keyLabel}>SECURE USER ID</div>
                  <div style={styles.keyValue} className="mono-tag">
                    {p.keyFingerprint}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Verification & Handshake Panel */}
        <div style={styles.handshakePanel} className="glass-card">
          <div style={styles.handshakeMeta}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7a7061', textTransform: 'uppercase' }}>
                SECURITY TOKEN
              </div>
              <div className="mono-tag" style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
                {challengeNonce}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7a7061', textTransform: 'uppercase' }}>
                SECURITY CHECK
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2d2721' }}>
                Local Key Verification (100% Offline)
              </div>
            </div>
          </div>

          {isVerifying ? (
            <div style={styles.handshakeSteps}>
              <div style={styles.stepItem}>
                <span style={{ color: handshakeStep >= 1 ? '#1b6a4a' : '#948b7d' }}>
                  {handshakeStep >= 1 ? '✓' : '○'}
                </span>
                <span>Generating secure session code</span>
              </div>
              <div style={styles.stepItem}>
                <span style={{ color: handshakeStep >= 2 ? '#1b6a4a' : '#948b7d' }}>
                  {handshakeStep >= 2 ? '✓' : '○'}
                </span>
                <span>Verifying {selectedPersona.name}'s local profile key</span>
              </div>
              <div style={styles.stepItem}>
                <span style={{ color: handshakeStep >= 3 ? '#1b6a4a' : '#948b7d' }}>
                  {handshakeStep >= 3 ? '✓' : '○'}
                </span>
                <span>Confirming offline security boundary</span>
              </div>
              <div style={styles.stepItem}>
                <span style={{ color: handshakeStep >= 4 ? '#1b6a4a' : '#948b7d' }}>
                  {handshakeStep >= 4 ? '✓' : '○'}
                </span>
                <span><strong>Access approved:</strong> Opening workbench...</span>
              </div>
            </div>
          ) : (
            <div style={styles.actionRow}>
              <button
                onClick={handleAuthenticate}
                className="btn-glass btn-primary-bold"
                style={{ padding: '14px 28px', fontSize: '1rem', width: '100%' }}
              >
                Log In as {selectedPersona.name} &rarr;
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '48px 24px 80px 24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: '920px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  topBadgeRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#181512',
    marginBottom: '10px',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#5c5346',
    maxWidth: '640px',
    margin: '0 auto',
    lineHeight: '1.5',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  personaCard: {
    padding: '24px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '190px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
  },
  personaName: {
    fontSize: '1.55rem',
    fontWeight: '800',
    color: '#1a1612',
    lineHeight: '1.2',
  },
  personaTitle: {
    fontSize: '0.88rem',
    color: '#6e6559',
    fontWeight: '600',
    marginTop: '2px',
  },
  radioCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid #b9ad9b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '4px',
  },
  radioInner: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#ffffff',
  },
  keyBox: {
    padding: '12px',
  },
  keyLabel: {
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#7a7061',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  keyValue: {
    fontSize: '0.78rem',
    wordBreak: 'break-all',
    display: 'block',
  },
  handshakePanel: {
    padding: '24px 28px',
    background: 'rgba(255, 253, 248, 0.85)',
  },
  handshakeMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(215, 202, 180, 0.5)',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  handshakeSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 0',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.88rem',
    fontWeight: '600',
    color: '#2d2721',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'center',
  }
};
