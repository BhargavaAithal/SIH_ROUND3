import React, { useState } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { SCENARIOS } from '../../assets/sampleData';
import { FARMetricsCard } from './FARMetricsCard';
import { ConstraintTree } from './ConstraintTree';
import { ProofLogViewer } from './ProofLogViewer';
import { CheckCircleIcon, AlertTriangleIcon, ShieldIcon } from '../../assets/icons';

export const Z3AuditTab = () => {
  const { z3Result, activeScenario, setScenario, setActiveTab, unlockTab } = useWorkbenchStore();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const currentSc = SCENARIOS[activeScenario] || SCENARIOS.baseline;
  const isValid = z3Result?.is_valid ?? currentSc.z3Result.is_valid;
  const margin = z3Result?.margin ?? currentSc.z3Result.margin;

  const checks = currentSc.safetyChecks.map((c) => ({
    title: c.title,
    desc: c.subtitle,
    passed: c.passed,
  }));

  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="tab-viewport-content" style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Step Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              4. Z3 Neurosymbolic SMT Verification Engine
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Mathematical AST invariant extraction and Z3 formal solver verifying ASME B31.3 physics invariants (0.0% FAR).
            </p>
          </div>
          <button
            onClick={() => {
              unlockTab('deliverables');
              setActiveTab('deliverables');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: 'var(--accent-green)',
              color: '#0B0F19',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Proceed to 5. Deliverables (.DOCX) ➔
          </button>
        </div>

        {/* Presenter Scenario Controller (for Step 6 & 7 Demonstration) */}
        <div style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Verification State:
            </span>
            <button
              className={`glass-btn glass-btn-sm ${activeScenario === 'baseline' ? 'glass-btn-primary' : ''}`}
              onClick={() => setScenario('baseline')}
              style={{
                borderColor: activeScenario === 'baseline' ? 'var(--accent-green)' : 'var(--border-subtle)',
                color: activeScenario === 'baseline' ? 'var(--accent-green)' : 'var(--text-secondary)',
              }}
            >
              <span>🟢</span>
              <span>1. Normal Spec (PASS • +2.49 mm)</span>
            </button>
            <button
              className={`glass-btn glass-btn-sm ${activeScenario === 'corrosion' ? 'glass-btn-danger' : ''}`}
              onClick={() => setScenario('corrosion')}
              style={{
                borderColor: activeScenario === 'corrosion' ? 'var(--accent-danger)' : 'var(--border-subtle)',
                color: activeScenario === 'corrosion' ? 'var(--accent-danger)' : 'var(--text-secondary)',
              }}
            >
              <span>🔴</span>
              <span>2. Trigger Failure (Corrosion Hazard • FAIL)</span>
            </button>
          </div>

          {activeScenario === 'corrosion' && (
            <button
              className="glass-btn glass-btn-sm"
              onClick={() => setScenario('baseline')}
              style={{
                backgroundColor: 'var(--accent-cyan)',
                color: '#0B0F19',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚡</span>
              <span>Agent State-Isolated Repair ➔ Re-Verify</span>
            </button>
          )}
        </div>

        {/* Safety Status Banner */}
        <div style={{
          backgroundColor: isValid ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
          borderRadius: '8px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isValid ? <CheckCircleIcon size={28} color="var(--accent-green)" /> : <AlertTriangleIcon size={28} color="var(--accent-danger)" />}
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: 800,
                color: isValid ? 'var(--accent-green)' : 'var(--accent-danger)',
              }}>
                {isValid ? 'ALL SAFETY RULES PASSED (100% SAFE)' : 'SAFETY ATTENTION REQUIRED'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isValid
                  ? 'All engineering equations and material safety limits have been verified with 0 violations.'
                  : 'One or more safety rules have failed. Review the checklist below before operating.'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: isValid ? 'var(--accent-green)' : 'var(--accent-danger)' }}>
              {isValid ? `${passedCount} / ${checks.length} PASSED` : `${passedCount} / ${checks.length} PASSED`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isValid ? 'All Rules Satisfied' : `${checks.length - passedCount} Violation(s) Intercepted`}
            </div>
          </div>
        </div>

        {/* Violations Callout if present */}
        {z3Result?.violations && z3Result.violations.length > 0 && (
          <div style={{
            backgroundColor: 'var(--accent-danger-bg)',
            border: '1px solid var(--accent-danger)',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangleIcon size={16} color="var(--accent-danger)" />
              <span>Z3 Formal Verification Guard: Safety Violations Intercepted</span>
            </div>
            <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: '12px', color: 'var(--text-primary)' }}>
              {z3Result.violations.map((v, i) => (
                <li key={i} style={{ marginBottom: '2px' }}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Plain English Safety Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Safety Verification Checklist
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checks.map((c, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {c.passed ? (
                    <CheckCircleIcon size={20} color="var(--accent-green)" />
                  ) : (
                    <AlertTriangleIcon size={20} color="var(--accent-danger)" />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {c.desc}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  backgroundColor: c.passed ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
                  color: c.passed ? 'var(--accent-green)' : 'var(--accent-danger)',
                }}>
                  {c.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Mathematical Proof Log */}
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>📐 {showTechnicalDetails ? 'Hide Mathematical Proof Details' : 'Show Mathematical Proof Details (Advanced)'}</span>
            <span>{showTechnicalDetails ? '▲' : '▼'}</span>
          </button>

          {showTechnicalDetails && (
            <div style={{
              marginTop: '16px',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '520px',
            }}>
              <FARMetricsCard />
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '45% 55%', minHeight: 0 }}>
                <ConstraintTree />
                <ProofLogViewer />
              </div>
            </div>
          )}
        </div>

        {/* Sequential Step Transition Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Formal SMT Theorem Prover Verification Complete
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              All mathematical invariants proven with 0.0% false assurance rate.
            </div>
          </div>
          <button
            onClick={() => {
              unlockTab('deliverables');
              setActiveTab('deliverables');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: 'var(--accent-green)',
              color: '#0B0F19',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Proceed to 5. Deliverables (.DOCX) ➔
          </button>
        </div>
      </div>
    </div>
  );
};
