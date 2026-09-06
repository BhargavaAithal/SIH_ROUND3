import React from 'react';

// Equipment Vector Symbols (ISA-5.1 compliant)
export const VesselSymbol = ({ x, y, width = 140, height = 240, label = 'Vessel', isSelected = false, onClick }) => {
  const r = width / 2;
  const strokeColor = isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)';
  const strokeWidth = isSelected ? 3 : 2;

  return (
    <g transform={`translate(${x - r}, ${y - height / 2})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Top Head (Elliptical) */}
      <path
        d={`M 0 ${r} C 0 0, ${width} 0, ${width} ${r}`}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Cylindrical Shell */}
      <rect
        x="0"
        y={r}
        width={width}
        height={height - 2 * r}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Bottom Head (Elliptical) */}
      <path
        d={`M 0 ${height - r} C 0 ${height}, ${width} ${height}, ${width} ${height - r}`}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Center Line & Demister */}
      <line x1={width * 0.15} y1={height * 0.3} x2={width * 0.85} y2={height * 0.3} stroke="var(--border-default)" strokeDasharray="3 3" strokeWidth="1.5" />
      <line x1={width * 0.15} y1={height * 0.35} x2={width * 0.85} y2={height * 0.35} stroke="var(--border-default)" strokeDasharray="3 3" strokeWidth="1.5" />
      {/* Label */}
      <text x={r} y={height / 2} fill="var(--text-primary)" fontSize="13" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  );
};

export const PumpSymbol = ({ x, y, radius = 45, label = 'Pump', isSelected = false, onClick }) => {
  const strokeColor = isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)';
  const strokeWidth = isSelected ? 3 : 2;

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Pump Casing Circle */}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Tangential Discharge Triangle */}
      <polygon
        points={`0,${-radius} ${radius * 1.1},${-radius * 0.3} 0,${radius * 0.5}`}
        fill="var(--bg-surface)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Suction & Impeller Center */}
      <circle cx="0" cy="0" r="8" fill={strokeColor} />
      {/* Label */}
      <text x="0" y={radius + 18} fill="var(--text-primary)" fontSize="12" fontWeight="700" textAnchor="middle">
        {label}
      </text>
    </g>
  );
};

export const HeatExchangerSymbol = ({ x, y, width = 200, height = 110, label = 'Exchanger', isSelected = false, onClick }) => {
  const strokeColor = isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)';
  const strokeWidth = isSelected ? 3 : 2;

  return (
    <g transform={`translate(${x - width / 2}, ${y - height / 2})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Shell Body */}
      <rect
        x={width * 0.15}
        y="0"
        width={width * 0.7}
        height={height}
        rx="15"
        ry="15"
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Channel Head (Left) */}
      <path
        d={`M ${width * 0.15} 0 C 0 0, 0 ${height}, ${width * 0.15} ${height} Z`}
        fill="var(--bg-surface)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Floating Head (Right) */}
      <path
        d={`M ${width * 0.85} 0 C ${width} 0, ${width} ${height}, ${width * 0.85} ${height} Z`}
        fill="var(--bg-surface)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Tube Bundle Lines */}
      <line x1={width * 0.15} y1={height * 0.3} x2={width * 0.85} y2={height * 0.3} stroke="var(--border-default)" strokeWidth="1.5" />
      <line x1={width * 0.15} y1={height * 0.5} x2={width * 0.85} y2={height * 0.5} stroke="var(--border-default)" strokeWidth="1.5" />
      <line x1={width * 0.15} y1={height * 0.7} x2={width * 0.85} y2={height * 0.7} stroke="var(--border-default)" strokeWidth="1.5" />
      {/* Label */}
      <text x={width / 2} y={height / 2 + 4} fill="var(--text-primary)" fontSize="12" fontWeight="700" textAnchor="middle">
        {label}
      </text>
    </g>
  );
};

export const ValveSymbol = ({ x, y, width = 36, height = 24, label = 'Valve', isSelected = false, onClick }) => {
  const strokeColor = isSelected ? 'var(--accent-cyan)' : 'var(--accent-amber)';
  const strokeWidth = isSelected ? 2.5 : 2;

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Bowtie valve body */}
      <polygon
        points={`-${width / 2},-${height / 2} -${width / 2},${height / 2} 0,0`}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <polygon
        points={`${width / 2},-${height / 2} ${width / 2},${height / 2} 0,0`}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Actuator stem and diaphragm */}
      <line x1="0" y1="0" x2="0" y2={-height * 1.1} stroke={strokeColor} strokeWidth={strokeWidth} />
      <path
        d={`M -${width / 3} -${height * 1.1} Q 0 -${height * 1.7} ${width / 3} -${height * 1.1} Z`}
        fill="var(--bg-surface)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Label */}
      <text x="0" y={height + 14} fill="var(--text-primary)" fontSize="11" fontWeight="600" textAnchor="middle">
        {label}
      </text>
    </g>
  );
};

export const TankSymbol = ({ x, y, width = 200, height = 180, label = 'Tank', isSelected = false, onClick }) => {
  const strokeColor = isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)';
  const strokeWidth = isSelected ? 3 : 2;

  return (
    <g transform={`translate(${x - width / 2}, ${y - height / 2})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Tank Body */}
      <rect
        x="0"
        y="20"
        width={width}
        height={height - 20}
        fill="var(--bg-surface-elevated)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Conical Roof */}
      <polygon
        points={`0,20 ${width / 2},0 ${width},20`}
        fill="var(--bg-surface)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Label */}
      <text x={width / 2} y={height / 2 + 10} fill="var(--text-primary)" fontSize="13" fontWeight="700" textAnchor="middle">
        {label}
      </text>
    </g>
  );
};
