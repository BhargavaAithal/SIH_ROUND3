import React, { useRef, useState, useEffect } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { VesselSymbol, PumpSymbol, HeatExchangerSymbol, ValveSymbol, TankSymbol } from './EquipmentSymbols';

export const PIDCanvas = () => {
  const {
    topology,
    zoomLevel,
    setZoomLevel,
    panOffset,
    setPanOffset,
    selectedNode,
    setSelectedNode,
    selectedPipe,
    setSelectedPipe,
    visibleLayers,
  } = useWorkbenchStore();

  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(5.0, zoomLevel * zoomFactor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - panOffset.x) * (newZoom / zoomLevel);
      const newPanY = mouseY - (mouseY - panOffset.y) * (newZoom / zoomLevel);

      setZoomLevel(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    }
  };

  // Drag pan
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [zoomLevel, panOffset]);

  const { width, height } = topology.dimensions;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-canvas)',
        overflow: 'hidden',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Subtle grid pattern */}
          <pattern id="pid-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-subtle)" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>

          {/* Marker arrow for flow direction */}
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent-cyan)" />
          </marker>
        </defs>

        {/* Pan and Zoom Transformation Group */}
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
          {/* Canvas Background Boundary */}
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#pid-grid)"
            stroke="var(--border-default)"
            strokeWidth="2"
          />

          {/* Flowsheet Title block in canvas */}
          <text x="100" y="100" fill="var(--text-muted)" fontSize="28" fontWeight="800" letterSpacing="2px">
            {topology.title.toUpperCase()}
          </text>
          <text x="100" y="140" fill="var(--text-muted)" fontSize="16" fontFamily="var(--font-mono)">
            DWG NO: {topology.drawing_id} • REVISION: 04 • CLASSIFICATION: PSU AIR-GAPPED WORKBENCH
          </text>

          {/* Piping Runs Layer */}
          {visibleLayers.piping && topology.edges.map((edge) => {
            const isSelected = selectedPipe === edge.tag || selectedPipe === edge.id;
            const d = edge.path.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');

            // Compute midpoint for line tag label
            const midIndex = Math.floor(edge.path.length / 2);
            const midPt = edge.path[midIndex] || [1000, 1000];

            return (
              <g key={edge.id} onClick={(e) => { e.stopPropagation(); setSelectedPipe(edge.tag); }} style={{ cursor: 'pointer' }}>
                {/* Thick invisible click target */}
                <path d={d} fill="none" stroke="transparent" strokeWidth="24" />

                {/* Visible Pipe Line */}
                <path
                  d={d}
                  fill="none"
                  stroke={edge.color || 'var(--accent-cyan)'}
                  strokeWidth={isSelected ? 5 : 3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerMid="url(#arrow)"
                />

                {/* Line Tag Pill */}
                {visibleLayers.tags && (
                  <g transform={`translate(${midPt[0]}, ${midPt[1] - 14})`}>
                    <rect
                      x="-70"
                      y="-12"
                      width="140"
                      height="22"
                      rx="4"
                      fill="var(--bg-surface)"
                      stroke={isSelected ? 'var(--accent-cyan)' : 'var(--border-default)'}
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="3"
                      fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)'}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {edge.tag}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Equipment Nodes Layer */}
          {visibleLayers.equipment && topology.nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const [cx, cy] = node.centroid;

            switch (node.equipment_type) {
              case 'vessel':
                return (
                  <VesselSymbol
                    key={node.id}
                    x={cx}
                    y={cy}
                    label={node.tag}
                    isSelected={isSelected}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                  />
                );
              case 'pump':
                return (
                  <PumpSymbol
                    key={node.id}
                    x={cx}
                    y={cy}
                    label={node.tag}
                    isSelected={isSelected}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                  />
                );
              case 'exchanger':
                return (
                  <HeatExchangerSymbol
                    key={node.id}
                    x={cx}
                    y={cy}
                    label={node.tag}
                    isSelected={isSelected}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                  />
                );
              case 'valve':
                return (
                  <ValveSymbol
                    key={node.id}
                    x={cx}
                    y={cy}
                    label={node.tag}
                    isSelected={isSelected}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                  />
                );
              case 'tank':
                return (
                  <TankSymbol
                    key={node.id}
                    x={cx}
                    y={cy}
                    label={node.tag}
                    isSelected={isSelected}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                  />
                );
              default:
                return (
                  <circle
                    key={node.id}
                    cx={cx}
                    cy={cy}
                    r="20"
                    fill="var(--accent-cyan)"
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                  />
                );
            }
          })}
        </g>
      </svg>
    </div>
  );
};
