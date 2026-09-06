import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ZoomInIcon, ZoomOutIcon, RotateCcwIcon, MaximizeIcon } from '../../assets/icons';

export const PIDToolbar = () => {
  const {
    zoomLevel,
    setZoomLevel,
    setPanOffset,
    visibleLayers,
    toggleLayer,
  } = useWorkbenchStore();

  const handleZoomIn = () => setZoomLevel(zoomLevel * 1.25);
  const handleZoomOut = () => setZoomLevel(zoomLevel / 1.25);
  const handleReset = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleFit = () => {
    setZoomLevel(0.35);
    setPanOffset({ x: 200, y: 100 });
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      borderRadius: '8px',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Zoom Controls */}
      <button
        onClick={handleZoomIn}
        title="Zoom In (Wheel Up)"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ZoomInIcon size={16} />
      </button>

      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '42px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        onClick={handleZoomOut}
        title="Zoom Out (Wheel Down)"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ZoomOutIcon size={16} />
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)' }} />

      <button
        onClick={handleReset}
        title="Reset 100%"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <RotateCcwIcon size={16} />
      </button>

      <button
        onClick={handleFit}
        title="Fit Flowsheet"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <MaximizeIcon size={16} />
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)' }} />

      {/* Layer Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={visibleLayers.equipment}
            onChange={() => toggleLayer('equipment')}
          />
          Equipment
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={visibleLayers.piping}
            onChange={() => toggleLayer('piping')}
          />
          Piping
        </label>
      </div>
    </div>
  );
};
