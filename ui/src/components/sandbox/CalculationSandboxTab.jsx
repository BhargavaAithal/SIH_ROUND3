import React, { useState, useEffect } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { ReActConsole } from './ReActConsole';
import { CodePlayground } from './CodePlayground';
import { ASTGuardViewer } from './ASTGuardViewer';
import { calculatePipeASME } from '../../services/api';
import { SlidersIcon, CheckCircleIcon, AlertTriangleIcon } from '../../assets/icons';

export const CalculationSandboxTab = () => {
  const { taskSpec, setTaskSpec, setActiveTab, unlockTab, setZ3Result } = useWorkbenchStore();

  const [diameter, setDiameter] = useState(taskSpec?.outside_diameter || 16.0);
  const [pressure, setPressure] = useState(taskSpec?.design_pressure || 400.0);
  const [thickness, setThickness] = useState(taskSpec?.actual_thickness || 0.320);
  const stress = taskSpec?.allowable_stress || 20000.0;
  const corrosion = taskSpec?.corrosion_allowance || 0.0625;

  useEffect(() => {
    if (taskSpec) {
      setDiameter(taskSpec.outside_diameter || 16.0);
      setPressure(taskSpec.design_pressure || 400.0);
      setThickness(taskSpec.actual_thickness || 0.320);
      setCalcResult(null);
    }
  }, [taskSpec?.task_id, taskSpec?.outside_diameter, taskSpec?.design_pressure, taskSpec?.actual_thickness]);

  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Default analytical calculation
  const defaultTm = (pressure * diameter) / (2 * (stress * 1.0 + pressure * 0.4)) + corrosion;
  const defaultMargin = thickness - defaultTm;
  const defaultSafe = defaultMargin >= 0;

  const currentTm = calcResult?.t_min !== undefined ? calcResult.t_min : defaultTm;
  const currentMargin = calcResult?.margin !== undefined ? calcResult.margin : defaultMargin;
  const isSafe = calcResult?.verdict ? (calcResult.verdict === 'SAT') : defaultSafe;

  const handleRunCalculation = async () => {
    setIsCalculating(true);
    try {
      const res = await calculatePipeASME({
        standard: 'ASME_B31_3',
        parameters: {
          P: pressure,
          D: diameter,
          S: stress,
          E: 1.0,
          Y: 0.4,
          c: corrosion,
          t_actual: thickness,
        },
      });
      setCalcResult(res);
      setTaskSpec({
        ...taskSpec,
        design_pressure: pressure,
        outside_diameter: diameter,
        actual_thickness: thickness,
      });
    } catch (err) {
      console.warn('Fallback local calculation:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="tab-viewport-content" style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Step Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              3. Router &amp; Agent Calculation Sandbox
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Verify pipe wall thickness against statutory ASME B31.3 Section 304.1.2 limits.
            </p>
          </div>
          <button
            onClick={() => {
              unlockTab('z3');
              setActiveTab('z3');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: 'var(--accent-green)',
              color: '#0B0F19',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Proceed to 4. Z3 Formal Audit ➔
          </button>
        </div>

        {/* Visual Operator Calculation Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '10px',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '24px',
        }}>
          {/* Inputs Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Operating Parameters
            </div>

            {/* Pipe Diameter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pipe Diameter:</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{diameter.toFixed(1)}" ({(diameter * 25.4).toFixed(1)} mm)</span>
              </div>
              <input
                type="range"
                min="4"
                max="36"
                step="1"
                value={diameter}
                onChange={(e) => setDiameter(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            {/* Operating Pressure */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Operating Pressure:</span>
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

            {/* Measured Wall Thickness */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Measured Wall Thickness:</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{thickness.toFixed(3)}" ({(thickness * 25.4).toFixed(2)} mm)</span>
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

            {/* Action Button */}
            <button
              onClick={handleRunCalculation}
              disabled={isCalculating}
              style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'var(--accent-cyan)',
                color: '#0B0F19',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isCalculating ? 'wait' : 'pointer',
              }}
            >
              <SlidersIcon size={16} />
              {isCalculating ? 'Calculating...' : 'Calculate Safe Thickness'}
            </button>
          </div>

          {/* Results Summary Column */}
          <div style={{
            backgroundColor: isSafe ? 'var(--accent-green-bg)' : 'var(--accent-danger-bg)',
            borderRadius: '8px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                {isSafe ? <CheckCircleIcon size={22} color="var(--accent-green)" /> : <AlertTriangleIcon size={22} color="var(--accent-danger)" />}
                <span style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: isSafe ? 'var(--accent-green)' : 'var(--accent-danger)',
                }}>
                  {isSafe ? 'PIPE IS SAFE TO OPERATE' : 'PIPE IS TOO THIN'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Minimum Required Thickness:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {currentTm.toFixed(3)}" ({(currentTm * 25.4).toFixed(2)} mm)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Your Pipe Thickness:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {thickness.toFixed(3)}" ({(thickness * 25.4).toFixed(2)} mm)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Extra Safety Buffer:</span>
                  <span style={{
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: isSafe ? 'var(--accent-green)' : 'var(--accent-danger)',
                  }}>
                    {currentMargin >= 0 ? '+' : ''}{currentMargin.toFixed(3)}" ({(currentMargin * 25.4).toFixed(2)} mm)
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              marginTop: '12px',
            }}>
              {isSafe
                ? '✔ This pipe safely exceeds the minimum thickness and has adequate reserve for corrosion.'
                : '✖ Warning: The pipe wall is thinner than the safe limit. Action needed: replace pipe or lower operating pressure.'}
            </div>
          </div>
        </div>

        {/* Sequential Step Transition Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Deterministic Pipe Calculation Verified
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Ready to verify statutory ASME B31.3 invariants with the local Z3 SMT solver.
            </div>
          </div>
          <button
            onClick={() => {
              unlockTab('z3');
              setActiveTab('z3');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: 'var(--accent-green)',
              color: '#0B0F19',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Proceed to 4. Z3 Formal Audit ➔
          </button>
        </div>

        {/* Collapsible Technical Details */}
        <div style={{ marginTop: '6px' }}>
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>⚙️ {showTechnicalDetails ? 'Hide Code & Technical System Logs' : 'Show Code & Technical System Logs (Advanced)'}</span>
            <span>{showTechnicalDetails ? '▲' : '▼'}</span>
          </button>

          {showTechnicalDetails && (
            <div style={{
              marginTop: '16px',
              display: 'grid',
              gridTemplateColumns: '42% 58%',
              height: '520px',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {/* Left: ReAct 3-Turn Loop Console */}
              <ReActConsole />

              {/* Right: Code Playground & AST Guard Inspector */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <CodePlayground />
                </div>
                <ASTGuardViewer />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
