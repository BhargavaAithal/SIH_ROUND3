import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';

export const Minimap = () => {
  const { topology, zoomLevel, panOffset, selectedNode } = useWorkbenchStore();

  const mapWidth = 180;
  const mapHeight = 135;
  const scaleX = mapWidth / topology.dimensions.width;
  const scaleY = mapHeight / topology.dimensions.height;

  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      zIndex: 20,
      width: `${mapWidth}px`,
      height: `${mapHeight}px`,
      backgroundColor: 'var(--bg-canvas)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '6px',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      opacity: 0.88,
      pointerEvents: 'none',
    }}>
      <svg width={mapWidth} height={mapHeight} viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
        {/* Draw pipes */}
        {topology.edges.map((edge) => {
          const d = edge.path.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0] * scaleX} ${pt[1] * scaleY}`).join(' ');
          return <path key={edge.id} d={d} fill="none" stroke={edge.color || 'var(--border-default)'} strokeWidth="1.2" />;
        })}

        {/* Draw equipment nodes */}
        {topology.nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          return (
            <circle
              key={node.id}
              cx={node.centroid[0] * scaleX}
              cy={node.centroid[1] * scaleY}
              r={isSelected ? 4 : 2.5}
              fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'}
            />
          );
        })}

        {/* Current viewport outline indicator */}
        <rect
          x={Math.max(0, -panOffset.x * scaleX / zoomLevel)}
          y={Math.max(0, -panOffset.y * scaleY / zoomLevel)}
          width={Math.min(mapWidth, (800 / zoomLevel) * scaleX)}
          height={Math.min(mapHeight, (600 / zoomLevel) * scaleY)}
          fill="rgba(6, 182, 212, 0.15)"
          stroke="var(--accent-cyan)"
          strokeWidth="1"
        />
      </svg>
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '4px',
        fontSize: '8px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        4000x3000
      </div>
    </div>
  );
};
