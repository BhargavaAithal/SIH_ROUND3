import React, { useEffect, useState } from 'react';
import { PIDCanvas } from './PIDCanvas';
import { PIDToolbar } from './PIDToolbar';
import { Minimap } from './Minimap';
import { QuickActionDrawer } from './QuickActionDrawer';
import { StoragePlaneExplorer } from '../storage/StoragePlaneExplorer';
import { PixiPIDCanvas } from './PixiPIDCanvas';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { fetchTopology } from '../../services/api';

export const PIDViewerTab = () => {
  const { setTopology, storageView, setStorageView, setActiveTab, unlockTab } = useWorkbenchStore();
  const [activeSubView, setActiveSubView] = useState('schematic'); // 'schematic' | 'storage' | 'gpu'
  const [topology, setTopologyLocal] = useState({ nodes: [], edges: [] });

  useEffect(() => {
    fetchTopology()
      .then((data) => {
        if (data) {
          setTopology(data);
          setTopologyLocal(data);
        }
      })
      .catch(() => {});
  }, [setTopology]);

  return (
    <div className="tab-viewport-content" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top View Switcher Header Bar */}
      <div style={{
        height: '42px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveSubView('schematic')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: activeSubView === 'schematic' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              backgroundColor: activeSubView === 'schematic' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeSubView === 'schematic' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeSubView === 'schematic' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span>📐</span>
            <span>P&ID Flowsheet Schematic</span>
          </button>

          <button
            onClick={() => setActiveSubView('storage')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: activeSubView === 'storage' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              backgroundColor: activeSubView === 'storage' ? 'var(--bg-surface-elevated)' : 'transparent',
              color: activeSubView === 'storage' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeSubView === 'storage' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span>🗄️</span>
            <span>Sovereign Storage Plane Explorer (Graph / Tables / WAL)</span>
          </button>
          <button
            onClick={() => setActiveSubView('gpu')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: activeSubView === 'gpu' ? '1px solid var(--accent-violet, #a855f7)' : '1px solid var(--border-subtle)',
              backgroundColor: activeSubView === 'gpu' ? 'rgba(168,85,247,0.12)' : 'transparent',
              color: activeSubView === 'gpu' ? '#a855f7' : 'var(--text-secondary)',
              fontWeight: activeSubView === 'gpu' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span>⚡</span>
            <span>GPU Viewport (WebGL 2.0 · 50k+ elements)</span>
          </button>
        </div>

        <button
          onClick={() => {
            unlockTab('sandbox');
            setActiveTab('sandbox');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            backgroundColor: 'var(--accent-green)',
            color: '#0B0F19',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Proceed to 3. Router & Agent ➔
        </button>
      </div>

      {/* Main Viewport Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeSubView === 'schematic' ? (
          <>
            <PIDToolbar />
            <PIDCanvas />
            <Minimap />
            <QuickActionDrawer />
          </>
        ) : activeSubView === 'gpu' ? (
          <PixiPIDCanvas
            nodes={topology.nodes || []}
            edges={topology.edges || []}
            onNodeSelect={(node) => console.log('[GPU] selected:', node)}
            onNodeHover={(node) => {}}
          />
        ) : (
          <StoragePlaneExplorer />
        )}
      </div>

    </div>
  );
};
