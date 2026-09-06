import React, { useEffect } from 'react';
import { PIDCanvas } from './PIDCanvas';
import { PIDToolbar } from './PIDToolbar';
import { Minimap } from './Minimap';
import { QuickActionDrawer } from './QuickActionDrawer';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { fetchTopology } from '../../services/api';

export const PIDViewerTab = () => {
  const { setTopology } = useWorkbenchStore();

  useEffect(() => {
    // Fetch live topology from backend API and update store
    fetchTopology()
      .then((data) => {
        if (data) setTopology(data);
      })
      .catch(() => {
        // Fallback sample topology already preloaded in Zustand store
      });
  }, [setTopology]);

  return (
    <div className="tab-viewport-content" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <PIDToolbar />
      <PIDCanvas />
      <Minimap />
      <QuickActionDrawer />
    </div>
  );
};
