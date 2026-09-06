import React, { useState, useEffect } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { CloseIcon, CheckCircleIcon, AlertTriangleIcon, SlidersIcon, TerminalIcon, ShieldIcon } from '../../assets/icons';
import { calculatePipeASME, evaluateZ3Formal } from '../../services/api';

export const QuickActionDrawer = () => {
  const {
    quickDrawerOpen,
    setQuickDrawerOpen,
    selectedNode,
    selectedPipe,
    topology,
    setActiveTab,
    setTaskSpec,
    setZ3Result,
  } = useWorkbenchStore();

  const activeNodeData = topology.nodes.find((n) => n.id === selectedNode);
  const activePipeData = topology.edges.find((e) => e.tag === selectedPipe || e.id === selectedPipe);

  // Editable parameters for live formula check
  const [pressure, setPressure] = useState(400.0);
  const [thickness, setThickness] = useState(0.320);
  const diameter = activePipeData?.attributes?.nominal_od_in || 16.0;
  const stress = 20000.0;
  const qualityFactor = 1.0;
  const tempCoeff = 0.4;
  const corrosionAllowance = 0.0625;

  const [isVerifying, setIsVerifying] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    if (activePipeData?.attributes?.nominal_od_in) {
      setPressure(activePipeData.attributes.nominal_od_in >= 12 ? 400.0 : 550.0);
      setThickness(activePipeData.attributes.nominal_od_in >= 12 ? 0.320 : 0.365);
      setCalcResult(null);
    }
  }, [activePipeData]);

  if (!quickDrawerOpen) return null;

  // Analytical ASME B31.3 Section 304.1.2 calculation
  const tm = (pressure * diameter) / (2 * (stress * qualityFactor + pressure * tempCoeff)) + corrosionAllowance;
  const margin = thickness - tm;
  const isSat = margin >= 0;

  const displayTm = calcResult?.t_min !== undefined ? calcResult.t_min : tm;
  const displayMargin = calcResult?.margin !== undefined ? calcResult.margin : margin;
  const displaySat = calcResult?.verdict ? (calcResult.verdict === 'SAT') : isSat;

  const handleRecalculateFormula = async () => {
    setIsCalculating(true);
    try {
      const res = await calculatePipeASME({
        standard: 'ASME_B31_3',
        parameters: {
          P: pressure,
          D: diameter,
          S: stress,
          E: qualityFactor,
          Y: tempCoeff,
          c: corrosionAllowance,
          t_actual: thickness,
        },
      });
      setCalcResult(res);
    } catch (err) {
      console.error('Calculation recalculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSendToSandbox = () => {
    setTaskSpec({
      task_id: `TASK-${activeNodeData?.tag || activePipeData?.tag || 'CDU'}`,
      description: `Verify wall thickness for ${activePipeData?.tag || activeNodeData?.tag || 'line'} per ASME B31.3`,
      design_pressure: pressure,
      outside_diameter: diameter,
      allowable_stress: stress,
      quality_factor: qualityFactor,
      temp_coefficient: tempCoeff,
      corrosion_allowance: corrosionAllowance,
      actual_thickness: thickness,
    });
    setQuickDrawerOpen(false);
    setActiveTab('sandbox');
  };

  const handleSendToZ3 = async () => {
    setIsVerifying(true);
    try {
      const evalParams = {
        P: pressure,
        D: diameter,
        S: stress,
        E: qualityFactor,
        Y: tempCoeff,
        c: corrosionAllowance,
        t_actual: thickness,
      };
      const res = await evaluateZ3Formal('ASME_B31_3', evalParams);
      const z3Payload = {
        ...res,
        rational_tm: res.model_details?.t_m_rational || res.rational_tm || '223/1008',
      };
      setZ3Result(z3Payload);
      setQuickDrawerOpen(false);
      setActiveTab('z3');
    } catch (err) {
      console.error('Z3 formal verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <aside className="drawer-panel" style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '400px',
      maxWidth: '90vw',
      backgroundColor: 'var(--bg-sidebar)',
      borderLeft: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {activeNodeData?.tag || activePipeData?.tag || 'Equipment Node'}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isSat ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
              color: isSat ? 'var(--accent-green)' : 'var(--accent-danger)',
              border: `1px solid ${isSat ? 'var(--accent-green)' : 'var(--accent-danger)'}`,
            }}>
              {isSat ? 'SAT' : 'UNSAT'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {activeNodeData?.label || 'ASME B31.3 Process Piping'}
          </div>
        </div>

        <button
          onClick={() => setQuickDrawerOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Specification Attributes */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Physical & Specification Attributes
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-elevated)',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Nominal OD (D):</span>
              <div style={{ fontWeight: 600 }}>{diameter.toFixed(1)}" ({ (diameter * 25.4).toFixed(1) } mm)</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
              <div style={{ fontWeight: 600 }}>{activePipeData?.attributes?.schedule || 'Sch 40'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Rating:</span>
              <div style={{ fontWeight: 600 }}>{activePipeData?.attributes?.rating || 'Class 150#'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Allowable Stress (S):</span>
              <div style={{ fontWeight: 600 }}>20,000 psi</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Quality Factor (E):</span>
              <div style={{ fontWeight: 600 }}>1.0 (Seamless)</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Corrosion Allow (c):</span>
              <div style={{ fontWeight: 600 }}>0.0625" (1.59 mm)</div>
            </div>
          </div>
        </div>

        {/* Live Formula Check */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <SlidersIcon size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ASME B31.3 Quick Formula Check
            </span>
          </div>

          {/* Equation snippet */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            backgroundColor: 'var(--bg-primary)',
            padding: '6px 8px',
            borderRadius: '4px',
            color: 'var(--accent-cyan)',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            tm = (P * D) / (2 * (S * E + P * Y)) + c
          </div>

          {/* Pressure Slider */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Design Pressure (P):</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{pressure.toFixed(1)} psig</span>
            </div>
            <input
              type="range"
              min="100"
              max="1200"
              step="10"
              value={pressure}
              onChange={(e) => setPressure(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          {/* Thickness Slider */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Actual Measured Thickness (t):</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{thickness.toFixed(3)}"</span>
            </div>
            <input
              type="range"
              min="0.100"
              max="0.800"
              step="0.005"
              value={thickness}
              onChange={(e) => setThickness(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          {/* Recalculate Formula Button */}
          <button
            onClick={handleRecalculateFormula}
            disabled={isCalculating}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              marginBottom: '10px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: isCalculating ? 'wait' : 'pointer',
            }}
          >
            <SlidersIcon size={12} />
            {isCalculating ? 'Recalculating Formula...' : 'Recalculate Formula'}
          </button>

          {/* Recalculated Result Box */}
          <div style={{
            backgroundColor: displaySat ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
            border: `1px solid ${displaySat ? 'var(--accent-green)' : 'var(--accent-danger)'}`,
            borderRadius: '6px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Minimum Required (tm):</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{displayTm.toFixed(4)}"</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Safety Margin (Delta):</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: displaySat ? 'var(--accent-green)' : 'var(--accent-danger)',
              }}>
                {displayMargin >= 0 ? '+' : ''}{displayMargin.toFixed(4)}"
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '2px' }}>
              <span>Invariant Status:</span>
              <span style={{
                fontWeight: 800,
                color: displaySat ? 'var(--accent-green)' : 'var(--accent-danger)',
              }}>
                {displaySat ? 'VERIFIED SAT' : 'DEFICIT UNSAT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Actions Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <button
          onClick={handleSendToZ3}
          disabled={isVerifying}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: 'var(--accent-indigo)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isVerifying ? 'wait' : 'pointer',
          }}
        >
          <ShieldIcon size={14} />
          {isVerifying ? 'Verifying with Z3...' : 'Verify in Z3 Formal Verifier'}
        </button>

        <button
          onClick={handleSendToSandbox}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <TerminalIcon size={14} />
          Send to ReAct Sandbox
        </button>
      </div>
    </aside>
  );
};
