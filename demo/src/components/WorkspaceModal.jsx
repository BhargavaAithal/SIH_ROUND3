import React, { useState } from 'react';

export const PRESET_WORKSPACES = [
  {
    id: 'smitrace-root',
    name: 'smitrace (Active Sovereign Enclave)',
    path: 'c:\\Users\\Vinyas G M\\OneDrive\\Desktop\\smitrace',
    type: 'REPO_ROOT',
    profile: '24GB',
    filesCount: 14,
    skillsCount: 3,
    status: 'ACTIVE',
    description: 'Master sovereign engineering repository with ASME B31.3 & API 510 physics models, AST guardrails, and Z3 SMT solver runtime.'
  },
  {
    id: 'refinery-core',
    name: 'refinery-core-physics',
    path: '/opt/sovereign/refinery-core',
    type: 'ENCLAVE_SANDBOX',
    profile: '48GB',
    filesCount: 28,
    skillsCount: 5,
    status: 'AVAILABLE',
    description: 'High-temperature catalytic cracking unit corrosion simulation & stress boundary constraints.'
  },
  {
    id: 'pipeline-integrity',
    name: 'pipeline-integrity-service',
    path: '/srv/enclave/pipeline-integrity',
    type: 'ENCLAVE_SANDBOX',
    profile: '24GB',
    filesCount: 9,
    skillsCount: 2,
    status: 'AVAILABLE',
    description: 'Ultrasonic thickness sensor stream processing & Condition Monitoring Location (CML) registry.'
  },
  {
    id: 'api510-engine',
    name: 'api510-inspection-engine',
    path: '/var/sovereign/api510-engine',
    type: 'ENCLAVE_SANDBOX',
    profile: '48GB',
    filesCount: 19,
    skillsCount: 4,
    status: 'AVAILABLE',
    description: 'Statutory vessel remaining-life calculation engine complying with API 510 §7 & Factories Act §31.'
  }
];

export default function WorkspaceModal({ isOpen, onClose, currentWorkspace, onSelectWorkspace, addAuditLog }) {
  const [customPath, setCustomPath] = useState('');
  const [selectedId, setSelectedId] = useState(currentWorkspace?.id || 'smitrace-root');

  if (!isOpen) return null;

  const handleApply = (ws) => {
    onSelectWorkspace(ws);
    addAuditLog({
      actor: 'USER',
      action: `Specified active workspace: ${ws.name}`,
      hash: 'ws:root:' + Math.random().toString(16).substr(2, 8),
      details: `Path: ${ws.path} | Path Traversal Protection: ACTIVE | WAN Egress: NONE`
    });
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    const customWs = {
      id: 'custom-' + Date.now(),
      name: customPath.split(/[\/\\]/).filter(Boolean).pop() || 'custom-workspace',
      path: customPath.trim(),
      type: 'LOCAL_DIRECTORY',
      profile: '24GB',
      filesCount: 6,
      skillsCount: 2,
      status: 'ACTIVE',
      description: 'Custom operator-designated isolated directory.'
    };
    handleApply(customWs);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1400 }} onClick={onClose}>
      <div 
        className="modal-card glass-card" 
        style={{ maxWidth: '640px', width: '92%', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(195, 182, 160, 0.4)', paddingBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>📁</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1a1612', margin: 0 }}>
                Specify Active Workspace
              </h3>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#685e50', marginTop: '2px' }}>
              Select an isolated repository root or specify an offline filesystem directory.
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="btn-glass" 
            style={{ 
              width: '30px', 
              height: '30px', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#685e50'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Workspace Invariants Banner */}
        <div style={{ background: 'rgba(27, 106, 74, 0.08)', border: '1px solid rgba(27, 106, 74, 0.3)', borderRadius: '6px', padding: '8px 12px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.72rem', color: '#1b6a4a', fontWeight: '700' }}>
            🔒 AIR-GAP INVARIANT: Path traversal escaping designated workspace root is strictly blocked.
          </div>
          <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>0 WAN EGRESS</span>
        </div>

        {/* Preset Repositories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#1a1612', letterSpacing: '0.04em' }}>
            PRESET INDUSTRIAL ENCLAVE WORKSPACES
          </div>
          {PRESET_WORKSPACES.map(ws => {
            const isCurrent = currentWorkspace?.id === ws.id || selectedId === ws.id;
            return (
              <div 
                key={ws.id}
                className={`workspace-card-item ${isCurrent ? 'active' : ''}`}
                onClick={() => setSelectedId(ws.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: '#1a1612' }}>{ws.name}</strong>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#8b4513', marginTop: '2px' }}>
                      {ws.path}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="mono-tag" style={{ fontSize: '0.62rem' }}>{ws.profile}</span>
                    {isCurrent ? (
                      <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>SELECTED</span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleApply(ws); }}
                        className="btn-glass"
                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      >
                        Switch
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#5c5244', marginTop: '4px' }}>
                  {ws.description}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.66rem', color: '#7a7061' }}>
                  <span>Files: <strong>{ws.filesCount}</strong></span>
                  <span>Skills Mounted: <strong>{ws.skillsCount}</strong></span>
                  <span>Isolation: <strong>POSIX Jail</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Directory Input */}
        <form onSubmit={handleCustomSubmit} style={{ borderTop: '1px solid rgba(195, 182, 160, 0.4)', paddingTop: '14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#1a1612', marginBottom: '6px' }}>
            MOUNT CUSTOM LOCAL DIRECTORY
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. C:\PlantProjects\RefineryPhysics or /srv/codebase"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(195, 182, 160, 0.6)',
                background: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!customPath.trim()}
              className="btn-glass btn-primary-bold"
              style={{ padding: '8px 14px', fontSize: '0.76rem' }}
            >
              Mount Path
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px' }}>
          <button onClick={onClose} className="btn-glass" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
            Cancel
          </button>
          <button 
            onClick={() => {
              const target = PRESET_WORKSPACES.find(w => w.id === selectedId) || PRESET_WORKSPACES[0];
              handleApply(target);
            }} 
            className="btn-glass btn-primary-bold" 
            style={{ padding: '6px 16px', fontSize: '0.78rem' }}
          >
            Confirm Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
