import React from 'react';
import { FARMetricsCard } from './FARMetricsCard';
import { ConstraintTree } from './ConstraintTree';
import { ProofLogViewer } from './ProofLogViewer';

export const Z3AuditTab = () => {
  return (
    <div className="tab-viewport-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top 0.0% FAR KPI Cards */}
      <FARMetricsCard />

      {/* Main Split: Left Constraint Tree, Right Proof Log */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '45% 55%', minHeight: 0 }}>
        <ConstraintTree />
        <ProofLogViewer />
      </div>
    </div>
  );
};
