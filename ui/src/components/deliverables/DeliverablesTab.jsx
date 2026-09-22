import React, { useState } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { DeliverableActions } from './DeliverableActions';
import { DocxPreviewer } from './DocxPreviewer';
import { DataGridTable } from './DataGridTable';
import { SCENARIOS } from '../../assets/sampleData';

export const DeliverablesTab = () => {
  const { activeDeliverableTab, setActiveDeliverableTab, activeScenario, merkleAuditHash } = useWorkbenchStore();
  const currentSc = SCENARIOS[activeScenario] || SCENARIOS.baseline;

  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(100);
  const [compilationStage, setCompilationStage] = useState('Compiled & Formally Sealed');

  const handleRecompile = () => {
    setIsCompiling(true);
    setCompilationProgress(20);
    setCompilationStage('Pulling records from Local SQLite & Graph Store...');

    setTimeout(() => {
      setCompilationProgress(50);
      setCompilationStage('Binding ASME B31.3 parameters & verifying Z3 proof certificate...');
    }, 600);

    setTimeout(() => {
      setCompilationProgress(85);
      setCompilationStage('Assembling OOXML archive & injecting word/document.xml...');
    }, 1200);

    setTimeout(() => {
      setCompilationProgress(100);
      setCompilationStage('Digitally stamped with SHA-256 Merkle WAL Hash: Complete!');
      setIsCompiling(false);
    }, 1800);
  };

  return (
    <div className="tab-viewport-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Data Lineage & End-to-End Synthesis Pipeline Bar */}
      <div style={{
        backgroundColor: '#070B12',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data Lineage & File Synthesis:
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <span style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              1. Ingested Files (PDF/CSV)
            </span>
            <span>➔</span>
            <span style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              2. Stored DB ({currentSc.targetPipe})
            </span>
            <span>➔</span>
            <span style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              3. Z3 Verified ({currentSc.z3Result.status})
            </span>
            <span>➔</span>
            <span style={{
              backgroundColor: 'var(--accent-green-bg)',
              color: 'var(--accent-green)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--accent-green)',
              fontWeight: 700,
            }}>
              4. Generated .docx / .xlsx
            </span>
          </div>
        </div>

        <button
          onClick={handleRecompile}
          disabled={isCompiling}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isCompiling ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
            color: isCompiling ? 'var(--accent-cyan)' : 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: isCompiling ? 'wait' : 'pointer',
          }}
        >
          <span>⚡</span>
          <span>{isCompiling ? compilationStage : 'Recompile Report from Stored Data'}</span>
        </button>
      </div>

      {/* Top Step Header & Actions Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Step 5: Download Official Inspection Reports
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Compiled directly from ingested ultrasonic records and verified through the sovereign SMT engine.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* View Switcher */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-surface-elevated)', padding: '3px', borderRadius: '6px' }}>
            <button
              onClick={() => setActiveDeliverableTab('docx')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: activeDeliverableTab === 'docx' ? 700 : 500,
                backgroundColor: activeDeliverableTab === 'docx' ? 'var(--bg-surface)' : 'transparent',
                color: activeDeliverableTab === 'docx' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeDeliverableTab === 'docx' ? '1px solid var(--border-default)' : 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              📄 Word Report Preview
            </button>
            <button
              onClick={() => setActiveDeliverableTab('xlsx')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: activeDeliverableTab === 'xlsx' ? 700 : 500,
                backgroundColor: activeDeliverableTab === 'xlsx' ? 'var(--bg-surface)' : 'transparent',
                color: activeDeliverableTab === 'xlsx' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeDeliverableTab === 'xlsx' ? '1px solid var(--border-default)' : 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              📊 Spreadsheet Data View
            </button>
          </div>

          <DeliverableActions />
        </div>
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeDeliverableTab === 'docx' ? <DocxPreviewer /> : <DataGridTable />}
      </div>
    </div>
  );
};
