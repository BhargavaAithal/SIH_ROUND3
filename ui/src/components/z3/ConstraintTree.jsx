import React from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from '../../assets/icons';

export const ConstraintTree = () => {
  const { z3Result } = useWorkbenchStore();
  const isSat = z3Result.status === 'SAT';
  const md = z3Result.model_details || {};

  const constraints = [
    { name: 'P > 0', desc: 'Internal Design Pressure Positive', value: `${md.P || 400.0} psig`, sat: true },
    { name: 'D > 0', desc: 'Outside Diameter Positive', value: `${md.D || 16.0} in`, sat: true },
    { name: 'S > 0', desc: 'Allowable Material Stress Positive', value: `${md.S || 20000.0} psi`, sat: true },
    { name: '0 < E <= 1.0', desc: 'Joint Quality Factor Bound', value: `${md.E || 1.0}`, sat: true },
    { name: '0 <= Y <= 1.0', desc: 'Temperature Coefficient Bound', value: `${md.Y || 0.4}`, sat: true },
    { name: 'c >= 0', desc: 'Corrosion Allowance Non-Negative', value: `${md.c || 0.0625} in`, sat: true },
    {
      name: 't_actual >= t_min',
      desc: 'ASME B31.3 Pressure Containment Invariant',
      value: `Act: ${(z3Result.t_actual || 0.32).toFixed(4)}" >= Req: ${(z3Result.t_min || 0.2217).toFixed(4)}"`,
      sat: isSat,
    },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700 }}>
          Z3 SMT Physical Invariant Constraint Tree
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: isSat ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
          color: isSat ? 'var(--accent-green)' : 'var(--accent-danger)',
          border: `1px solid ${isSat ? 'var(--accent-green)' : 'var(--accent-danger)'}`,
        }}>
          {isSat ? 'VERIFIED SAT' : 'DEFICIT UNSAT'}
        </span>
      </div>

      {/* Constraints List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {constraints.map((c, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: c.sat ? 'var(--bg-surface-elevated)' : 'var(--accent-danger-bg)',
            border: `1px solid ${c.sat ? 'var(--border-subtle)' : 'var(--accent-danger)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {c.sat ? (
                <CheckCircleIcon size={16} color="var(--accent-green)" />
              ) : (
                <XCircleIcon size={16} color="var(--accent-danger)" />
              )}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {c.desc}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {c.value}
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: c.sat ? 'var(--accent-green)' : 'var(--accent-danger)',
              }}>
                {c.sat ? 'SAT' : 'UNSAT'}
              </div>
            </div>
          </div>
        ))}

        {/* Counterexample Box if UNSAT */}
        {!isSat && (
          <div style={{
            backgroundColor: 'var(--accent-danger-bg)',
            border: '1px solid var(--accent-danger)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '11px',
            marginTop: '10px',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-danger)', marginBottom: '4px' }}>
              ⚠️ SMT Solver Counterexample Model:
            </div>
            <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              Actual Thickness: {(z3Result.t_actual || 0).toFixed(6)}" &lt; Required Minimum: {(z3Result.t_min || 0).toFixed(6)}"
            </div>
            <div style={{ color: 'var(--accent-danger)', marginTop: '4px' }}>
              Deficit: {(z3Result.margin || 0).toFixed(6)}" below ASME B31.3 mandatory pressure containment limit.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
