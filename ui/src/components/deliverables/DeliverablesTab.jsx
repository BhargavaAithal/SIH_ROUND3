import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { DeliverableActions } from './DeliverableActions';
import { DocxPreviewer } from './DocxPreviewer';
import { DataGridTable } from './DataGridTable';

export const DeliverablesTab = () => {
  const { activeDeliverableTab, setActiveDeliverableTab } = useWorkbenchStore();

  return (
    <div className="tab-viewport-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top View Switcher & Actions Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveDeliverableTab('docx')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeDeliverableTab === 'docx' ? 700 : 500,
              backgroundColor: activeDeliverableTab === 'docx' ? 'var(--accent-indigo)' : 'var(--bg-surface-elevated)',
              color: activeDeliverableTab === 'docx' ? '#FFFFFF' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            PSU Approval Memo (.docx)
          </button>
          <button
            onClick={() => setActiveDeliverableTab('xlsx')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeDeliverableTab === 'xlsx' ? 700 : 500,
              backgroundColor: activeDeliverableTab === 'xlsx' ? 'var(--accent-green)' : 'var(--bg-surface-elevated)',
              color: activeDeliverableTab === 'xlsx' ? '#0B0F19' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Audited Calculation Workbook (.xlsx)
          </button>
        </div>

        <DeliverableActions />
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeDeliverableTab === 'docx' ? <DocxPreviewer /> : <DataGridTable />}
      </div>
    </div>
  );
};
