import React, { useState, useEffect } from 'react';

export const INITIAL_SUBAGENTS = [
  {
    id: 'subagent-ast-sec',
    name: 'AST Security Auditor',
    role: 'SECURITY',
    status: 'RUNNING',
    progress: 72,
    elapsedMs: 2450,
    cpuMs: 142,
    memoryMb: 34.2,
    activeStep: 'Traversing AST Call nodes in src/physics/corrosion_evaluator.py...',
    task: 'Verify 0 forbidden syscalls (os.system, subprocess) and boundary decorators.',
    logs: [
      '[0.1s] Initialized AST security visitor with fail-closed denylist',
      '[0.8s] Parsed AST: 28 nodes, 4 functions, 2 module imports',
      '[1.9s] Verified clean: 0 forbidden syscalls in global scope',
      '[2.4s] Checking function call boundary constraints...'
    ],
    proposedPatch: null
  },
  {
    id: 'subagent-pytest-09',
    name: 'PyTest Regression Verifier',
    role: 'VERIFIER',
    status: 'RUNNING',
    progress: 88,
    elapsedMs: 3100,
    cpuMs: 280,
    memoryMb: 58.6,
    activeStep: 'Evaluating test_measurement_noise_physical_bound against ultrasonic jitter...',
    task: 'Execute 9 statutory pytest cases in isolated POSIX namespace micro-jail.',
    logs: [
      '[0.2s] Mounted ephemeral sandbox with 512MB RAM and 10s CPU quota',
      '[1.1s] test_nominal_thinning: PASSED (12ms)',
      '[1.8s] test_zero_wear: PASSED (9ms)',
      '[2.7s] Running test_measurement_noise_physical_bound...'
    ],
    proposedPatch: null
  },
  {
    id: 'subagent-z3-solver',
    name: 'Z3 Formal SMT Prover',
    role: 'SOLVER',
    status: 'COMPLETED',
    progress: 100,
    elapsedMs: 1820,
    cpuMs: 195,
    memoryMb: 41.0,
    activeStep: 'SMT-LIB2 First-Order QF_NRA Proof Synthesized: SAT (0.0% False Assurance Rate)',
    task: 'Synthesize non-linear rational arithmetic proof for API 510 §7.1.1 physical boundary.',
    logs: [
      '[0.0s] Translated API 510 §7.1.1 into Z3 Real Sorts (t_initial, t_current, delta_years)',
      '[0.6s] Asserted non-negative boundary constraint: (assert (>= corrosion_rate 0.0))',
      '[1.2s] Injected sensor jitter noise model: t_current > t_initial',
      '[1.8s] Solver emitted SAT with clamp max(0.0, raw_rate). Proof sealed.'
    ],
    proposedPatch: null
  },
  {
    id: 'subagent-qwen-patch',
    name: 'Refactor & Patch Specialist',
    role: 'REFACTOR',
    status: 'COMPLETED',
    progress: 100,
    elapsedMs: 1450,
    cpuMs: 320,
    memoryMb: 62.4,
    activeStep: 'Surgical patch synthesized (+6 / -2 lines) with API 510 §7.1.1 boundary clamp.',
    task: 'Generate minimal non-disruptive patch to clamp negative corrosion jitter to 0.0.',
    logs: [
      '[0.1s] Analyzed failing test traceback in test_corrosion_bounds.py',
      '[0.5s] Isolated root cause: raw subtraction (t_initial - t_current) / delta_years',
      '[1.1s] Synthesized patch wrapping raw_rate with max(0.0, round(raw_rate, 4))',
      '[1.4s] Differential patch verified against API 510 statutory mandate.'
    ],
    proposedPatch: {
      targetFile: 'src/physics/corrosion_evaluator.py',
      code: `# SMITRACE Physics Engine - API 510 Corrosion Model
# File: src/physics/corrosion_evaluator.py

def calculate_corrosion_rate(t_initial: float, t_current: float, delta_years: float) -> float:
    """
    Calculates annualized corrosion rate (inches/year).
    Statutory standard: API 510 Section 7.1.1
    """
    if delta_years <= 0:
        raise ValueError("delta_years must be strictly positive (> 0.0)")
    
    raw_rate = (t_initial - t_current) / delta_years
    # API 510 §7.1.1: Physical boundary constraint (rate >= 0.0)
    # Replaces negative measurement jitter with zero wear boundary
    return max(0.0, round(raw_rate, 4))
`,
      diffSummary: '+6 / -2 lines (max(0.0, round(raw_rate, 4)) boundary clamp)'
    }
  }
];

export default function BackgroundAgentsDeck({ 
  agents, 
  setAgents, 
  onMergePatch, 
  addAuditLog, 
  isExpanded, 
  onToggleExpanded 
}) {
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [selectedAgentLogs, setSelectedAgentLogs] = useState(null);
  const [newAgentTemplate, setNewAgentTemplate] = useState('SECURITY');
  const [customPrompt, setCustomPrompt] = useState('');

  // Autonomous progress timer for running background agents
  useEffect(() => {
    const timer = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.status !== 'RUNNING') return agent;
        const newProgress = Math.min(100, agent.progress + Math.floor(Math.random() * 4 + 2));
        const isDone = newProgress >= 100;
        return {
          ...agent,
          progress: newProgress,
          status: isDone ? 'COMPLETED' : 'RUNNING',
          elapsedMs: agent.elapsedMs + 500,
          cpuMs: agent.cpuMs + Math.floor(Math.random() * 8 + 3),
          activeStep: isDone ? `Completed: ${agent.task}` : agent.activeStep
        };
      }));
    }, 600);

    return () => clearInterval(timer);
  }, [setAgents]);

  const runningCount = agents.filter(a => a.status === 'RUNNING').length;
  const completedCount = agents.filter(a => a.status === 'COMPLETED').length;

  const handleSpawnAgent = (e) => {
    e.preventDefault();
    const archetypes = {
      SECURITY: {
        name: 'AST Security Deep Scanner',
        role: 'SECURITY',
        task: customPrompt.trim() || 'Recursive AST call-graph scan for unverified system methods.',
        initialStep: 'Parsing module dependency graph...'
      },
      VERIFIER: {
        name: 'Statutory Verification Worker',
        role: 'VERIFIER',
        task: customPrompt.trim() || 'Executing API 510 boundary test assertions in ephemeral POSIX jail.',
        initialStep: 'Spawning micro-sandbox cgroups v2...'
      },
      SOLVER: {
        name: 'Z3 Non-Linear SMT Solver',
        role: 'SOLVER',
        task: customPrompt.trim() || 'Synthesizing First-Order QF_NRA mathematical constraints.',
        initialStep: 'Generating SMT-LIB2 clauses...'
      },
      REFACTOR: {
        name: 'Code Review & Refactor Agent',
        role: 'REFACTOR',
        task: customPrompt.trim() || 'Generating compliant patch diff with statutory bounds.',
        initialStep: 'Analyzing code structure...'
      }
    };

    const chosen = archetypes[newAgentTemplate] || archetypes.SECURITY;
    const newId = 'subagent-' + Date.now().toString(36);
    
    const newAgent = {
      id: newId,
      name: chosen.name,
      role: chosen.role,
      status: 'RUNNING',
      progress: 5,
      elapsedMs: 0,
      cpuMs: 12,
      memoryMb: Math.round(20 + Math.random() * 30),
      activeStep: chosen.initialStep,
      task: chosen.task,
      logs: [
        `[0.0s] Dispatched background subagent [${newId}]`,
        `[0.1s] Task: "${chosen.task}"`,
        `[0.2s] Allocation: 512MB quota | Network: NONE | Zero WAN Egress`
      ],
      proposedPatch: null
    };

    setAgents(prev => [newAgent, ...prev]);
    addAuditLog({
      actor: 'USER',
      action: `Thrown background subagent: ${chosen.name}`,
      hash: 'subagent:spawn:' + newId,
      details: `Task: ${chosen.task} | Asynchronous worker pool | 0 WAN egress`
    });

    setShowSpawnModal(false);
    setCustomPrompt('');
  };

  const handleCancelAgent = (agentId) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'FAILED', activeStep: 'Terminated by operator.' } : a));
    addAuditLog({
      actor: 'USER',
      action: `Terminated background agent: ${agentId}`,
      hash: 'subagent:cancel:' + agentId,
      details: 'Task halted. Sandbox memory released.'
    });
  };

  return (
    <div className="agents-deck-container">
      {/* Top Header Strip */}
      <div className="agents-deck-header" onClick={onToggleExpanded} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1a1612', letterSpacing: '0.04em' }}>
                BACKGROUND AGENTS FLEET
              </span>
              <span className="mono-tag" style={{ fontSize: '0.64rem', background: runningCount > 0 ? '#181512' : '#e2dac9', color: runningCount > 0 ? '#ffffff' : 'inherit' }}>
                {runningCount > 0 ? `${runningCount} RUNNING` : 'IDLE'}
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
                {completedCount} COMPLETED
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#685e50', marginTop: '2px' }}>
              Asynchronous worker pool running in background micro-sandboxes. Code interactively without interruption.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowSpawnModal(true)}
            className="btn-glass btn-primary-bold"
            style={{ padding: '5px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            id="btn-throw-agent"
          >
            <span>+ Throw Agent</span>
          </button>
          <button
            onClick={onToggleExpanded}
            className="btn-glass"
            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
          >
            {isExpanded ? '▲ Collapse' : '▼ Expand Deck'}
          </button>
        </div>
      </div>

      {/* Expanded Grid View */}
      {isExpanded && (
        <div className="agents-deck-grid">
          {agents.map(agent => {
            const isRunning = agent.status === 'RUNNING';
            const isCompleted = agent.status === 'COMPLETED';
            return (
              <div key={agent.id} className="subagent-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem' }}>
                        {agent.role === 'SECURITY' ? '🛡️' : agent.role === 'VERIFIER' ? '🧪' : agent.role === 'SOLVER' ? '📐' : '⚡'}
                      </span>
                      <strong style={{ fontSize: '0.8rem', color: '#1a1612' }}>{agent.name}</strong>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: '#8b4513', marginTop: '1px' }}>
                      {agent.id}
                    </div>
                  </div>
                  <span 
                    className={`badge ${isRunning ? 'badge-cipher' : isCompleted ? 'badge-green' : 'badge-crimson'}`}
                    style={{ fontSize: '0.58rem', padding: '1px 6px' }}
                  >
                    {agent.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#4a4237', lineHeight: '1.3' }}>
                  {agent.task}
                </div>

                {/* Progress Bar */}
                <div className="subagent-progress-bar">
                  <div 
                    className="subagent-progress-fill"
                    style={{
                      width: `${agent.progress}%`,
                      background: isCompleted ? '#1b6a4a' : 'linear-gradient(90deg, #181512, #9a671a)'
                    }}
                  />
                </div>

                {/* Active Step Feedback */}
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#685e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {agent.activeStep}
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#7a7061', borderTop: '1px solid rgba(195,182,160,0.3)', paddingTop: '6px' }}>
                  <span>CPU: <strong>{agent.cpuMs}ms</strong></span>
                  <span>RAM: <strong>{agent.memoryMb}MB</strong></span>
                  <span>Egress: <strong style={{ color: '#1b6a4a' }}>0B</strong></span>
                  <span>{agent.progress}%</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    onClick={() => setSelectedAgentLogs(agent)}
                    className="btn-glass"
                    style={{ flex: 1, padding: '3px 6px', fontSize: '0.68rem' }}
                  >
                    Logs ({agent.logs.length})
                  </button>

                  {agent.proposedPatch && (
                    <button
                      onClick={() => onMergePatch(agent.proposedPatch)}
                      className="btn-glass btn-primary-bold"
                      style={{ flex: 1.4, padding: '3px 6px', fontSize: '0.68rem', background: '#1b6a4a', color: '#ffffff', borderColor: '#1b6a4a' }}
                      title="Merge agent patch into active code buffer"
                    >
                      ⚡ Merge Patch
                    </button>
                  )}

                  {isRunning && (
                    <button
                      onClick={() => handleCancelAgent(agent.id)}
                      className="btn-glass"
                      style={{ padding: '3px 6px', fontSize: '0.68rem', color: '#a62a2a' }}
                      title="Abort task"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Spawn New Background Agent Modal */}
      {showSpawnModal && (
        <div className="modal-backdrop" style={{ zIndex: 1500 }} onClick={() => setShowSpawnModal(false)}>
          <div 
            className="modal-card"
            style={{ maxWidth: '560px', width: '92%' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚡</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1a1612', letterSpacing: '-0.01em' }}>
                  Throw Background Agent
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowSpawnModal(false)} 
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

            <p style={{ fontSize: '0.78rem', color: '#685e50', margin: '0 0 16px 0', lineHeight: '1.45' }}>
              Dispatches an autonomous subagent into the background. It will execute in an isolated micro-sandbox while you continue coding.
            </p>

            <form onSubmit={handleSpawnAgent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1a1612', display: 'block', marginBottom: '8px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  Select Agent Archetype
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { id: 'SECURITY', icon: '🛡️', title: 'AST Security Auditor', desc: 'Scan AST for unsafe syscalls' },
                    { id: 'VERIFIER', icon: '🧪', title: 'PyTest Verifier', desc: 'Run regression test matrix' },
                    { id: 'SOLVER', icon: '📐', title: 'Z3 SMT Prover', desc: 'Verify physical ASME bounds' },
                    { id: 'REFACTOR', icon: '⚡', title: 'Patch Specialist', desc: 'Synthesize surgical code fix' },
                  ].map(item => {
                    const isSelected = newAgentTemplate === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewAgentTemplate(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--glass-border)',
                          background: isSelected ? 'rgba(24, 21, 18, 0.88)' : 'rgba(255, 255, 255, 0.55)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          color: isSelected ? '#ffffff' : '#1a1612',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', lineHeight: 1.2, flexShrink: 0 }}>{item.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: isSelected ? 'rgba(255,255,255,0.75)' : '#7a7061', marginTop: '2px' }}>
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1a1612', display: 'block', marginBottom: '6px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  Custom Task Instructions <span style={{ fontWeight: '500', color: '#7a7061', textTransform: 'none' }}>(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Audit ultrasonic sensor input jitter in calculate_corrosion_rate..."
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg-inset)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.78rem',
                    color: '#1a1612',
                    lineHeight: '1.45',
                    outline: 'none',
                    resize: 'none',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#181512';
                    e.target.style.boxShadow = '0 0 0 2px rgba(24, 21, 18, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(195,182,160,0.75)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(195,182,160,0.35)', marginTop: '2px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSpawnModal(false)} 
                  className="btn-glass" 
                  style={{ padding: '8px 16px', fontSize: '0.78rem', color: '#5c5244' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-glass btn-primary-bold" 
                  style={{ padding: '8px 20px', fontSize: '0.78rem' }}
                >
                  Throw Agent ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subagent Logs Drawer Modal */}
      {selectedAgentLogs && (
        <div className="modal-backdrop" style={{ zIndex: 1500 }} onClick={() => setSelectedAgentLogs(null)}>
          <div 
            className="modal-card glass-card"
            style={{ maxWidth: '640px', width: '92%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1a1612' }}>
                  {selectedAgentLogs.name} — Execution Logs
                </h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#7a7061', marginTop: '2px' }}>
                  Task ID: {selectedAgentLogs.id} • Status: {selectedAgentLogs.status} • CPU: {selectedAgentLogs.cpuMs}ms
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedAgentLogs(null)} 
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

            <div style={{
              background: 'rgba(24, 21, 18, 0.9)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#ebdcc3',
              padding: '14px 16px',
              borderRadius: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              lineHeight: '1.6',
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)'
            }}>
              {selectedAgentLogs.logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('PASSED') || log.includes('SAT') ? '#4ade80' : log.includes('ERR') || log.includes('FAILED') ? '#f87171' : 'inherit' }}>
                  {log}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={() => setSelectedAgentLogs(null)} className="btn-glass" style={{ padding: '6px 14px', fontSize: '0.76rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
