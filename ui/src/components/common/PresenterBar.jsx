import React, { useEffect } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { SCENARIOS } from '../../assets/sampleData';

const DEMO_STEPS = [
  { step: 1, tab: 'ingest', title: '1. Ingestion: Field Documents Dump' },
  { step: 2, tab: 'ingest', title: '2. Ingestion: Vault & Merkle Trace' },
  { step: 3, tab: 'pid', title: '3. P&ID: Spatial Piping Topology' },
  { step: 4, tab: 'sandbox', title: '4. Sandbox: ASME B31.3 Parameters' },
  { step: 5, tab: 'sandbox', title: '5. Sandbox: Zero-Trust Code Execution' },
  { step: 6, tab: 'z3', title: '6. Z3 Audit: Mathematical Proof (SAT)' },
  { step: 7, tab: 'z3', title: '7. Z3 Audit: Hazard Intercept (UNSAT)' },
  { step: 8, tab: 'deliverables', title: '8. Deliverables: Official .docx & .xlsx' },
  { step: 9, tab: 'airgap', title: '9. Audit: eBPF Kernel Air-Gap Proof' },
];

export const PresenterBar = () => {
  const {
    activeScenario,
    setScenario,
    demoStep,
    goToDemoStep,
    nextDemoStep,
    prevDemoStep,
    showPresenterScript,
    setShowPresenterScript,
  } = useWorkbenchStore();

  // Keyboard navigation for demo presenter
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid intercepting inside textarea/input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        nextDemoStep();
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        prevDemoStep();
      } else if (e.key >= '1' && e.key <= '9') {
        goToDemoStep(parseInt(e.key, 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextDemoStep, prevDemoStep, goToDemoStep]);

  const currentStepObj = DEMO_STEPS.find((s) => s.step === demoStep) || DEMO_STEPS[0];

  return (
    <div
      style={{
        height: '34px',
        backgroundColor: '#090E17',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontSize: '11.5px',
        userSelect: 'none',
        zIndex: 45,
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      {/* Scenario Switcher Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
          }}
        >
          Scenario:
        </span>

        {Object.entries(SCENARIOS).map(([id, sc]) => {
          const isSelected = activeScenario === id;
          return (
            <button
              key={id}
              onClick={() => setScenario(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                color: isSelected ? sc.badgeColor || 'var(--text-primary)' : 'var(--text-secondary)',
                border: `1px solid ${isSelected ? sc.badgeColor || 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={sc.description}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: sc.badgeColor || 'var(--accent-cyan)',
                }}
              />
              <span>{sc.shortLabel || sc.name}</span>
            </button>
          );
        })}
      </div>

      {/* Guided Walkthrough Steps Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={prevDemoStep}
            disabled={demoStep <= 1}
            style={{
              padding: '2px 8px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: demoStep <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              cursor: demoStep <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
            title="Previous step (or press Left Arrow / 'P')"
          >
            ◀ Prev
          </button>

          <div
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '4px',
              padding: '2px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              Step {demoStep}/9
            </span>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {currentStepObj.title}
            </span>
          </div>

          <button
            onClick={nextDemoStep}
            disabled={demoStep >= 9}
            style={{
              padding: '2px 8px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: demoStep >= 9 ? 'var(--text-muted)' : 'var(--accent-cyan)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              cursor: demoStep >= 9 ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
            title="Next step (or press Right Arrow / 'N')"
          >
            Next ▶
          </button>
        </div>

        {/* Keyboard hint badge */}
        <span
          style={{
            fontSize: '9.5px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface)',
            padding: '2px 6px',
            borderRadius: '3px',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)',
          }}
          title="Use keys [1-9] to jump, [←/P] and [→/N] to step"
        >
          Keys: 1-9 • [←/→]
        </span>
      </div>
    </div>
  );
};
