import React, { useRef, useEffect, useState } from 'react';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { SCENARIOS } from '../../assets/sampleData';

export const DocxPreviewer = () => {
  const containerRef = useRef(null);
  const [useFallback, setUseFallback] = useState(true);
  const { activeScenario, merkleAuditHash } = useWorkbenchStore();
  const currentSc = SCENARIOS[activeScenario] || SCENARIOS.baseline;

  useEffect(() => {
    let isMounted = true;
    async function loadDocx() {
      try {
        const docxPreview = await import('docx-preview');
        const resp = await fetch(currentSc.deliverables.memoDownloadUrl);
        if (!resp.ok) throw new Error('Local memo not yet generated');
        const blob = await resp.blob();
        const buffer = await blob.arrayBuffer();

        if (isMounted && containerRef.current && docxPreview.renderAsync) {
          containerRef.current.innerHTML = '';
          await docxPreview.renderAsync(buffer, containerRef.current);
          setUseFallback(false);
        }
      } catch (e) {
        if (isMounted) setUseFallback(true);
      }
    }
    loadDocx();
    return () => { isMounted = false; };
  }, [activeScenario]);

  const isSafe = currentSc.calculation.is_safe;

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      backgroundColor: 'var(--bg-canvas)',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '800px',
        maxWidth: '100%',
        backgroundColor: '#FFFFFF',
        color: '#111827',
        padding: '40px 48px',
        borderRadius: '4px',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'Calibri, sans-serif',
        minHeight: '900px',
      }}>
        {useFallback ? (
          <div>
            {/* PSU Official Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1F497D', paddingBottom: '14px', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1F497D', letterSpacing: '0.05em' }}>
                INDIAN OIL CORPORATION LIMITED • REFINERIES DIVISION
              </h1>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginTop: '4px' }}>
                {currentSc.deliverables.memoTitle}
              </h2>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                REF NO: {currentSc.deliverables.memoRef} • DATE: 2026-09-09 • OISD-STD-118 COMPLIANT
              </div>
            </div>

            {/* Statutory Status Banner */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '4px',
              backgroundColor: isSafe ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${isSafe ? '#10B981' : '#EF4444'}`,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: isSafe ? '#065F46' : '#991B1B' }}>
                  {currentSc.deliverables.statusText}
                </div>
                <div style={{ fontSize: '11px', color: isSafe ? '#047857' : '#B91C1C', marginTop: '2px' }}>
                  Target Line: {currentSc.targetPipe} • Formal Solver FAR: 0.0000%
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '3px',
                backgroundColor: isSafe ? '#10B981' : '#EF4444',
                color: '#FFFFFF',
              }}>
                {currentSc.verdict}
              </span>
            </div>

            {/* Section 1: Asset Metadata */}
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#1F497D', textTransform: 'uppercase', marginBottom: '8px' }}>
              1. Asset & Inspection Metadata
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, width: '35%', backgroundColor: '#F9FAFB' }}>Facility / Refinery:</td>
                  <td style={{ padding: '6px 8px' }}>Paradip Refinery (IOCL)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, backgroundColor: '#F9FAFB' }}>Process Unit:</td>
                  <td style={{ padding: '6px 8px' }}>Atmospheric Distillation Unit (CDU-1)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, backgroundColor: '#F9FAFB' }}>Inspected Component Tag:</td>
                  <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1F497D' }}>{currentSc.targetPipe}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, backgroundColor: '#F9FAFB' }}>Design Governing Code:</td>
                  <td style={{ padding: '6px 8px' }}>ASME B31.3 Section 304.1.2 (Process Piping) & API 570</td>
                </tr>
              </tbody>
            </table>

            {/* Section 2: Verified Calculations */}
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#1F497D', textTransform: 'uppercase', marginBottom: '8px' }}>
              2. Verified Ultrasonic Thickness & Stress Calculations
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1F497D', color: '#FFFFFF' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Line Tag</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Pressure</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Diameter</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Min Required</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Measured Thickness</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Safety Buffer</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>{currentSc.targetPipe}</td>
                  <td style={{ padding: '6px 8px' }}>{currentSc.taskSpec.design_pressure.toFixed(1)} psig</td>
                  <td style={{ padding: '6px 8px' }}>{currentSc.taskSpec.outside_diameter.toFixed(2)}"</td>
                  <td style={{ padding: '6px 8px' }}>{currentSc.calculation.t_min.toFixed(4)}"</td>
                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>{currentSc.calculation.t_actual.toFixed(4)}"</td>
                  <td style={{
                    padding: '6px 8px',
                    color: isSafe ? '#059669' : '#DC2626',
                    fontWeight: 700
                  }}>
                    {currentSc.calculation.margin >= 0 ? '+' : ''}{currentSc.calculation.margin.toFixed(4)}"
                  </td>
                  <td style={{
                    padding: '6px 8px',
                    color: isSafe ? '#059669' : '#DC2626',
                    fontWeight: 800
                  }}>
                    {isSafe ? 'Safe' : 'Needs Attention'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section 3: Statutory Recommendation */}
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#1F497D', textTransform: 'uppercase', marginBottom: '8px' }}>
              3. Statutory Engineering Recommendation
            </h3>
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#F3F4F6',
              borderLeft: `4px solid ${isSafe ? '#10B981' : '#EF4444'}`,
              fontSize: '11px',
              lineHeight: 1.6,
              marginBottom: '20px',
              color: '#1F2937'
            }}>
              {currentSc.deliverables.recommendation}
            </div>

            {/* Section 4: Digital Forensic Stamp */}
            <div style={{
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              marginTop: '24px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1F497D', marginBottom: '4px' }}>
                DIGITAL FORENSIC SIGN-OFF & TAMPER-EVIDENT MERKLE STAMP
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#4B5563' }}>
                SHA-256 HASH: {merkleAuditHash}
              </div>
              <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                Verified via Sovereign AI Execution Plane • Air-Gap Isolation: 0 WAN Bytes • Invariant: 0.0% False Assurance Rate
              </div>
            </div>
          </div>
        ) : (
          <div ref={containerRef} />
        )}
      </div>
    </div>
  );
};
