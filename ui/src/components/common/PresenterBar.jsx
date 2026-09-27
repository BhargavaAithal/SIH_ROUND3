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
    maxUnlockedStep = 1,
    ingestedFiles = [],
    stepLockNotice,
    setStepLockNotice,
  } = useWorkbenchStore();

  const hasFiles = Boolean(ingestedFiles && ingestedFiles.length > 0);
  const isStep1Blocked = demoStep === 1 && !hasFiles;
  const canGoNext = demoStep < 9 && !isStep1Blocked && demoStep < maxUnlockedStep;

  // Auto-dismiss lock notice
  useEffect(() => {
    if (stepLockNotice) {
      const timer = setTimeout(() => {
        setStepLockNotice(null);
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [stepLockNotice, setStepLockNotice]);

  // Keyboard navigation for demo presenter
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid intercepting inside textarea/input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        if (canGoNext) {
          nextDemoStep();
        } else if (isStep1Blocked) {
          setStepLockNotice('Upload inspection documents in Step 1 first before advancing to Step 2.');
        } else if (demoStep < 9) {
          setStepLockNotice(`Step ${demoStep + 1} is locked. Complete steps sequentially in order.`);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        prevDemoStep();
      } else if (e.key >= '1' && e.key <= '9') {
        const target = parseInt(e.key, 10);
        if (target === 1) {
          goToDemoStep(1);
        } else if (!hasFiles) {
          setStepLockNotice('Upload inspection documents in Step 1 first before accessing other steps.');
        } else if (target > maxUnlockedStep) {
          setStepLockNotice(`Step ${target} is locked. Complete steps sequentially (1 to ${maxUnlockedStep}).`);
        } else {
          goToDemoStep(target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextDemoStep, prevDemoStep, goToDemoStep, canGoNext, isStep1Blocked, hasFiles, maxUnlockedStep, demoStep, setStepLockNotice]);

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
        position: 'relative',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      {/* Lock Notice Toast */}
      {stepLockNotice && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            right: '20px',
            backgroundColor: '#1E1412',
            border: '1px solid #EF4444',
            color: '#FECACA',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 100,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: '13px' }}>🔒</span>
          <span>{stepLockNotice}</span>
          <button
            onClick={() => setStepLockNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: '12px',
              marginLeft: '4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

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
            {isStep1Blocked && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: '#F59E0B',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  marginLeft: '4px',
                }}
                title="Upload files in the landing zone below to unlock Step 2"
              >
                🔒 Docs Required
              </span>
            )}
          </div>

          <button
            onClick={() => {
              if (canGoNext) {
                nextDemoStep();
              } else if (isStep1Blocked) {
                setStepLockNotice('Upload inspection documents in Step 1 first to unlock Step 2.');
              } else if (demoStep < 9) {
                setStepLockNotice(`Step ${demoStep + 1} is locked. Complete the current step first.`);
              }
            }}
            disabled={!canGoNext}
            style={{
              padding: '2px 8px',
              backgroundColor: canGoNext ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.02)',
              color: canGoNext ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: `1px solid ${canGoNext ? 'var(--border-subtle)' : 'transparent'}`,
              borderRadius: '4px',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              fontWeight: 700,
              opacity: canGoNext ? 1 : 0.45,
              transition: 'all 0.15s ease',
            }}
            title={
              isStep1Blocked
                ? 'Step 2 is locked — Upload inspection documents in Step 1 first'
                : demoStep >= 9
                ? 'Final step reached'
                : !canGoNext
                ? `Step ${demoStep + 1} is locked. Complete the current step first.`
                : "Next step (or press Right Arrow / 'N')"
            }
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
          title={
            hasFiles
              ? `Unlocked steps: 1 to ${maxUnlockedStep}. Keys [1-${maxUnlockedStep}] active.`
              : 'Step 1 active. Upload documents to unlock subsequent steps.'
          }
        >
          Keys: 1{maxUnlockedStep > 1 ? `-${maxUnlockedStep}` : ''} • [←/→]
        </span>
      </div>
    </div>
  );
};
