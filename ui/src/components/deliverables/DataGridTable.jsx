import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { SAMPLE_WORKBOOK_DATA } from '../../assets/sampleData';

export const DataGridTable = () => {
  const { activeWorkbookSheet, setActiveWorkbookSheet } = useWorkbenchStore();

  const sheets = ['Summary', 'ASME_B31_3_Piping', 'API_510_Vessels'];
  const activeRows = SAMPLE_WORKBOOK_DATA[activeWorkbookSheet] || [];
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
              return (
                <tr key={rIdx} style={{
                  backgroundColor: isEven ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                }}>
                  {columns.map((col) => {
                    const val = row[col];
                    const isFormula = typeof val === 'string' && val.startsWith('=');
                    const isSat = val === 'SAT';
                    const isUnsat = val === 'UNSAT';

                    return (
                      <td
                        key={col}
                        title={isFormula ? `Excel Dynamic Formula: ${val}` : undefined}
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
                            : 'inherit',
                          fontWeight: isSat || isUnsat ? 800 : isFormula ? 600 : 'normal',
                          backgroundColor: isSat
                            ? 'var(--accent-green-bg)'
                            : isUnsat
                            ? 'var(--accent-danger-bg)'
                            : 'transparent',
                        }}
                      >
                        {val}
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
