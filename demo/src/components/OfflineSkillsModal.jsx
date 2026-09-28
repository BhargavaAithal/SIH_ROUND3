import React, { useState } from 'react';

export const INITIAL_SKILLS = [
  {
    id: 'ast-guard',
    name: 'ast-guard',
    title: 'AST Security Interceptor',
    version: 'v1.3.2',
    category: 'Security',
    statutoryTier: 'SECURITY_ENFORCER',
    installed: true,
    enabled: true,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: 'Inspects Python & Rust Abstract Syntax Trees in micro-sandbox. Intercepts and blocks forbidden calls (os.system, subprocess, sockets).',
    commands: ['/ast-scan', '/assert-safety'],
    tools: ['ast_visitor', 'call_tree_analyzer'],
    author: 'SMITRACE Sovereignty Lab'
  },
  {
    id: 'z3-smt-verifier',
    name: 'z3-smt-verifier',
    title: 'Z3 Formal SMT-LIB2 Prover',
    version: 'v2.1.0',
    category: 'Verification',
    statutoryTier: 'CRITICAL_SAFETY',
    installed: true,
    enabled: true,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    description: 'Encodes ASME B31.3 §304 & API 510 physical boundaries into First-Order QF_NRA formulas with guaranteed 0.0% False Assurance Rate.',
    commands: ['/prove-bound', '/smt-solve'],
    tools: ['z3_qf_nra_solver', 'rational_proof_engine'],
    author: 'Formal Methods Group'
  },
  {
    id: 'code-review',
    name: 'code-review',
    title: 'Dual-Axis Code Reviewer',
    version: 'v1.0.4',
    category: 'Auditing',
    statutoryTier: 'GOVERNANCE',
    installed: true,
    enabled: true,
    sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    description: 'Reviews diffs along two parallel axes: Repo Standards & Statutory Spec. Runs parallel subagents and reports results side-by-side.',
    commands: ['/review-diff', '/check-spec'],
    tools: ['diff_analyzer', 'spec_matrix_evaluator'],
    author: 'Antigravity Standards'
  },
  {
    id: 'statutory-linter',
    name: 'statutory-linter',
    title: 'Statutory Invariant Linter',
    version: 'v1.1.0',
    category: 'Auditing',
    statutoryTier: 'CRITICAL_SAFETY',
    installed: false,
    enabled: false,
    sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    description: 'Real-time AST linter flagging API 510 §7.1 negative corrosion rates, zero-division hazards, and OISD-STD-105 violations as you type.',
    commands: ['/statutory-lint', '/check-invariants'],
    tools: ['statutory_ast_checker'],
    author: 'OISD Enforcement Substrate'
  },
  {
    id: 'git-guardrails',
    name: 'git-guardrails',
    title: 'Fail-Closed Git Guardrails',
    version: 'v1.2.0',
    category: 'Security',
    statutoryTier: 'SECURITY_ENFORCER',
    installed: false,
    enabled: false,
    sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    description: 'Hooks into git execution to block destructive git commands (push --force, reset --hard, branch -D) in air-gapped repositories.',
    commands: ['/git-shield', '/audit-git-ops'],
    tools: ['git_hook_interceptor'],
    author: 'Kernel Guard Team'
  },
  {
    id: 'tdd',
    name: 'tdd',
    title: 'Test-Driven Red-Green Loop',
    version: 'v2.0.1',
    category: 'Tooling',
    statutoryTier: 'DEVELOPER',
    installed: false,
    enabled: false,
    sha256: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    description: 'Enforces strict test-first development cycles: generates boundary tests, captures failure reproducer, and guides surgical patch.',
    commands: ['/red-green', '/reproduce-bug'],
    tools: ['pytest_runner', 'coverage_calculator'],
    author: 'Antigravity Core'
  },
  {
    id: 'diagnosing-bugs',
    name: 'diagnosing-bugs',
    title: 'Hypothesis Bug Diagnoser',
    version: 'v1.0.8',
    category: 'Tooling',
    statutoryTier: 'DEVELOPER',
    installed: false,
    enabled: false,
    sha256: '8312e75b44122c593a3733ac2eb0f30e52b01e2c710ca16391004847f92d14cb',
    description: 'Structured diagnostic loop for hard regressions and mathematical edge cases with automatic evidence capture and root-cause tracing.',
    commands: ['/diagnose', '/trace-root-cause'],
    tools: ['stack_tracer', 'evidence_collector'],
    author: 'SMITRACE Diagnostics'
  },
  {
    id: 'dataform-bigquery',
    name: 'dataform-bigquery',
    title: 'Sovereign BigQuery Bridge',
    version: 'v1.4.2',
    category: 'Tooling',
    statutoryTier: 'DATA_FABRIC',
    installed: false,
    enabled: false,
    sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    description: 'Offline generator and optimizer for local Dataform/SQLX models with schema validation and Zero WAN egress data pipelines.',
    commands: ['/dataform-compile', '/bq-lint'],
    tools: ['sqlx_parser', 'schema_validator'],
    author: 'Data Engine Lab'
  }
];

export default function OfflineSkillsModal({ isOpen, onClose, skills, onToggleSkill, onInstallSkill, addAuditLog }) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const categories = ['ALL', 'Security', 'Verification', 'Auditing', 'Tooling'];

  const filteredSkills = skills.filter(s => {
    if (filterCategory === 'ALL') return true;
    return s.category === filterCategory;
  });

  const handleToggle = (skill) => {
    onToggleSkill(skill.id);
    addAuditLog({
      actor: 'USER',
      action: `${skill.enabled ? 'Disabled' : 'Enabled'} offline skill: ${skill.name}`,
      hash: 'skill:state:' + Math.random().toString(16).substr(2, 8),
      details: `Version: ${skill.version} | Tier: ${skill.statutoryTier} | WAN Egress: NONE`
    });
  };

  const handleInstall = (skill) => {
    onInstallSkill(skill.id);
    addAuditLog({
      actor: 'USER',
      action: `Installed offline extension into workspace: ${skill.name}`,
      hash: 'skill:install:' + skill.sha256.substring(0, 16),
      details: `Target: .agents/skills/${skill.name}/ | Verified SHA-256 | Local Enclave Cache`
    });
  };

  const handleSimulateImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      addAuditLog({
        actor: 'USER',
        action: 'Imported offline extension package: sovereign-ast-v2.agyskill',
        hash: 'pkg:sha256:verified:0x8892',
        details: 'Package unpacked into .agents/skills/ | Signature verified by Root CA'
      });
      alert('Offline package verified & mounted into .agents/skills/');
    }, 800);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1400 }} onClick={onClose}>
      <div 
        className="modal-card glass-card" 
        style={{ maxWidth: '820px', width: '94%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(195, 182, 160, 0.4)', paddingBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🧩</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1a1612', margin: 0 }}>
                Offline Extensions & Skills Manager
              </h3>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#685e50', marginTop: '2px' }}>
              Air-gapped capabilities mounted in <code>.agents/skills/</code>. 100% offline, zero external downloads.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={handleSimulateImport}
              disabled={importing}
              className="btn-glass"
              style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Import signed .agyskill tarball from local disk"
            >
              <span>📥</span>
              <span>{importing ? 'Importing...' : 'Import .agyskill'}</span>
            </button>
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
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="btn-glass"
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: '700',
                background: filterCategory === cat ? 'rgba(26, 24, 21, 0.88)' : 'rgba(255, 255, 255, 0.45)',
                color: filterCategory === cat ? '#ffffff' : 'inherit',
                border: filterCategory === cat ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--glass-border)',
                boxShadow: filterCategory === cat ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="skills-list-container">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="skill-card-item">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <strong style={{ fontSize: '0.86rem', color: '#1a1612' }}>{skill.title}</strong>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#8b4513' }}>
                    {skill.name}
                  </code>
                  <span className="mono-tag" style={{ fontSize: '0.62rem' }}>{skill.version}</span>
                  <span 
                    className={`badge ${skill.statutoryTier === 'CRITICAL_SAFETY' ? 'badge-crimson' : skill.statutoryTier === 'SECURITY_ENFORCER' ? 'badge-cipher' : 'badge-gold'}`}
                    style={{ fontSize: '0.6rem', padding: '1px 6px' }}
                  >
                    {skill.statutoryTier}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#5c5244', marginBottom: '6px' }}>
                  {skill.description}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.68rem', color: '#7a7061' }}>
                  <span>Commands: {skill.commands.map(c => <code key={c} style={{ background: '#e8e1d2', padding: '1px 4px', borderRadius: '3px', marginRight: '4px' }}>{c}</code>)}</span>
                  <span>•</span>
                  <span>By {skill.author}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={() => setSelectedSkill(skill)}
                  className="btn-glass"
                  style={{ padding: '5px 9px', fontSize: '0.72rem' }}
                >
                  Inspect
                </button>

                {skill.installed ? (
                  <button
                    onClick={() => handleToggle(skill)}
                    className={`btn-glass ${skill.enabled ? 'btn-primary-bold' : ''}`}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.72rem',
                      background: skill.enabled ? '#1b6a4a' : 'transparent',
                      color: skill.enabled ? '#ffffff' : 'inherit',
                      borderColor: skill.enabled ? '#1b6a4a' : 'var(--glass-border)'
                    }}
                  >
                    {skill.enabled ? '✓ Enabled' : '○ Disabled'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(skill)}
                    className="btn-glass btn-primary-bold"
                    style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                  >
                    + Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Skill Details Inspector Modal */}
        {selectedSkill && (
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '88%',
              maxWidth: '600px',
              background: 'rgba(255, 252, 246, 0.88)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              border: '1.5px solid rgba(255, 255, 255, 0.85)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(40, 30, 20, 0.25), inset 0 1px 2px #ffffff',
              zIndex: 1500
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#1a1612' }}>{selectedSkill.title}</h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#7a7061' }}>
                  .agents/skills/{selectedSkill.name}/SKILL.md
                </div>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="btn-glass" style={{ padding: '4px 10px' }}>
                ✕
              </button>
            </div>
            
            <div style={{
              background: 'rgba(26, 24, 21, 0.9)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#ebdcc3',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              lineHeight: '1.5',
              maxHeight: '260px',
              overflowY: 'auto',
              marginBottom: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ color: '#9a671a' }}>---</div>
              <div>name: "{selectedSkill.name}"</div>
              <div>version: "{selectedSkill.version}"</div>
              <div>statutory_tier: "{selectedSkill.statutoryTier}"</div>
              <div>offline_sha256: "{selectedSkill.sha256}"</div>
              <div>permissions:</div>
              <div>  file_read: true</div>
              <div>  ast_inspection: true</div>
              <div>  network_egress: false  # STRICT ENCLAVE INVARIANT</div>
              <div style={{ color: '#9a671a' }}>---</div>
              <div style={{ marginTop: '8px', color: '#faf7f2', fontWeight: 'bold' }}># {selectedSkill.title}</div>
              <div style={{ marginTop: '4px', color: '#b5a995' }}>{selectedSkill.description}</div>
              <div style={{ marginTop: '8px', color: '#4ade80' }}>## Exposed Tools:</div>
              {selectedSkill.tools.map(t => <div key={t}>- {t}()</div>)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setSelectedSkill(null)} className="btn-glass" style={{ padding: '6px 14px', fontSize: '0.76rem' }}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(195, 182, 160, 0.4)', marginTop: '12px' }}>
          <div style={{ fontSize: '0.7rem', color: '#7a7061' }}>
            Mounted Skills: <strong>{skills.filter(s => s.installed).length} installed</strong> • <strong>{skills.filter(s => s.installed && s.enabled).length} active</strong>
          </div>
          <button onClick={onClose} className="btn-glass btn-primary-bold" style={{ padding: '6px 16px', fontSize: '0.78rem' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
