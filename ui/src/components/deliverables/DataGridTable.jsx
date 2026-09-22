import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { SAMPLE_WORKBOOK_DATA, SCENARIOS } from '../../assets/sampleData';

export const DataGridTable = () => {
  const { activeWorkbookSheet, setActiveWorkbookSheet, activeScenario } = useWorkbenchStore();
  const currentSc = SCENARIOS[activeScenario] || SCENARIOS.baseline;

  const sheets = ['Summary', 'ASME_B31_3_Piping', 'API_510_Vessels'];

  let activeRows = [];
  if (activeWorkbookSheet === 'Summary') {
    activeRows = [
      { Parameter: 'Facility / Refinery', Value: 'Paradip Refinery - CDU-1' },
      { Parameter: 'Operational Scenario', Value: currentSc.name },
      { Parameter: 'Target Equipment / Line', Value: currentSc.targetPipe },
      { Parameter: 'Governing Standard', Value: 'ASME B31.3 Section 304.1.2 & API 570' },
      { Parameter: 'Formal Solver Verification', Value: 'Z3 SMT Solver (0.0000% FAR)' },
      { Parameter: 'WAN Network Egress', Value: '0 Bytes (Air-Gap Enforced)' },
      { Parameter: 'Inspection Status', Value: currentSc.calculation.is_safe ? 'Safe' : 'Needs Attention' },
    ];
  } else if (activeWorkbookSheet === 'ASME_B31_3_Piping') {
    activeRows = [
      {
        Point_ID: 'UT-PT-01',
        Line_Tag: '16"-P-101-CS-150',
        Pressure_psi: 400.0,
        OD_in: 16.0,
        Stress_psi: 20000.0,
        E: 1.0,
        Y: 0.4,
        CA_in: 0.0625,
        t_actual_in: 0.320,
        t_min_in: '= (C2*D2)/(2*(E2*F2 + C2*G2)) + H2',
        Margin_in: '= I2 - J2',
        Status: 'Safe',
      },
      {
        Point_ID: 'UT-PT-02',
        Line_Tag: '12"-P-105-CS-150',
        Pressure_psi: 355.0,
        OD_in: 12.75,
        Stress_psi: 20000.0,
        E: 1.0,
        Y: 0.4,
        CA_in: 0.125,
        t_actual_in: 0.210,
        t_min_in: '= (C3*D3)/(2*(E3*F3 + C3*G3)) + H3',
        Margin_in: '= I3 - J3',
        Status: 'Needs Attention',
      },
      {
        Point_ID: 'UT-PT-03',
        Line_Tag: '10"-P-103-CS-300',
        Pressure_psi: activeScenario === 'surge' ? 650.0 : 550.0,
        OD_in: 10.75,
        Stress_psi: 20000.0,
        E: 1.0,
        Y: 0.4,
        CA_in: 0.125,
        t_actual_in: 0.365,
        t_min_in: '= (C4*D4)/(2*(E4*F4 + C4*G4)) + H4',
        Margin_in: '= I4 - J4',
        Status: activeScenario === 'surge' ? 'Needs Attention' : 'Safe',
      },
    ];
  } else {
    activeRows = SAMPLE_WORKBOOK_DATA[activeWorkbookSheet] || [];
  }

  const columns = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
    }}>
      {/* Sheet Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px 0 16px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface-elevated)',
        gap: '4px',
      }}>
        {sheets.map((sheet) => {
          const isActive = activeWorkbookSheet === sheet;
          return (
            <button
              key={sheet}
              onClick={() => setActiveWorkbookSheet(sheet)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid var(--border-subtle)',
                borderBottom: isActive ? '1px solid var(--bg-surface)' : '1px solid var(--border-subtle)',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
              }}
            >
              {sheet.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      {/* Table Canvas */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={{
                  backgroundColor: '#1F497D',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  fontWeight: 700,
                  textAlign: 'left',
                  border: '1px solid #17375E',
                  whiteSpace: 'nowrap',
                }}>
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row, rIdx) => {
              const isEven = rIdx % 2 === 0;
              const isTargetLine = row.Line_Tag === currentSc.targetPipe;
              return (
                <tr
                  key={rIdx}
                  style={{
                    backgroundColor: isTargetLine
                      ? 'rgba(99, 102, 241, 0.1)'
                      : isEven ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                    borderLeft: isTargetLine ? '3px solid var(--accent-indigo)' : 'none',
                  }}
                >
                  {columns.map((col) => {
                    const val = row[col];
                    const isFormula = typeof val === 'string' && val.startsWith('=');
                    const isSat = val === 'SAT' || val === 'Safe';
                    const isUnsat = val === 'UNSAT' || val === 'Needs Attention';
                    const displayVal = val === 'SAT' ? 'Safe' : val === 'UNSAT' ? 'Needs Attention' : val;

                    return (
                      <td
                        key={col}
                        title={isFormula ? `Formula: ${val}` : undefined}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--border-subtle)',
                          fontFamily: isFormula || typeof val === 'number' ? 'var(--font-mono)' : 'inherit',
                          color: isSat
                            ? 'var(--accent-green)'
                            : isUnsat
                            ? 'var(--accent-danger)'
                            : isFormula
                            ? 'var(--accent-cyan)'
                            : 'var(--text-primary)',
                          fontWeight: isSat || isUnsat || isTargetLine ? 700 : 400,
                        }}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
