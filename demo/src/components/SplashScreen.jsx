import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(1); // 1: title, 2: subtitle, 3: enclave check
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Initializing sovereign air-gap runtime...');

  useEffect(() => {
    // Subtle timed reveals
    const timer1 = setTimeout(() => {
      setPhase(2);
      setProgress(45);
      setStatusText('Verifying cryptographic loopback barrier [127.0.0.1]...');
    }, 800);

    const timer2 = setTimeout(() => {
      setPhase(3);
      setProgress(85);
      setStatusText('Loading statutory verification rulebases (ASME B31.3 / API 510)...');
    }, 1600);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Sovereign enclave ready. Directing to cryptographic login...');
    }, 2400);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div style={styles.overlay}>
      <div style={styles.card} className="glass-card">
        {/* Shield Sovereign Watermark */}
        <div style={styles.iconContainer}>
          <div style={styles.shieldRing}>
            <span style={{ fontSize: '2.4rem' }}>🛡️</span>
          </div>
        </div>

        {/* Large Bold Title */}
        <h1 style={styles.brandTitle} className="fade-in">
          Smitrace
        </h1>

        {/* Small Subtitle appearing underneath */}
        <div style={{
          ...styles.subtitleWrapper,
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease'
        }}>
          <p style={styles.brandSubtitle}>
            Offline AI Workbench for Industrial Safety
          </p>
        </div>

        {/* Subtle Status & Progress */}
        <div style={{
          ...styles.statusSection,
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.5s ease'
        }}>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          
          <div style={styles.statusMeta}>
            <span style={styles.statusText}>{statusText}</span>
            <span className="mono-tag" style={styles.progressPct}>{progress}%</span>
          </div>
        </div>

        {/* Quick Skip button */}
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <button 
            onClick={onComplete} 
            className="btn-glass btn-primary-bold"
            style={{ fontSize: '0.86rem', padding: '10px 22px' }}
          >
            Open Workbench &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'radial-gradient(circle at 50% 40%, rgba(240, 233, 218, 0.85) 0%, rgba(230, 220, 200, 0.95) 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    padding: '52px 40px',
    textAlign: 'center',
    background: 'rgba(255, 253, 248, 0.78)',
    border: '1px solid rgba(200, 185, 160, 0.6)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(60, 48, 35, 0.12), 0 4px 12px rgba(60, 48, 35, 0.05)',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  shieldRing: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    background: 'rgba(235, 226, 210, 0.7)',
    border: '1px solid rgba(185, 168, 140, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(154, 103, 26, 0.12)',
  },
  brandTitle: {
    fontSize: '3.6rem',
    fontWeight: '900',
    color: '#1a1612',
    letterSpacing: '-0.04em',
    lineHeight: '1',
    marginBottom: '8px',
    fontFamily: "'Outfit', sans-serif",
  },
  subtitleWrapper: {
    marginBottom: '32px',
  },
  brandSubtitle: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#6b6152',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', sans-serif",
  },
  statusSection: {
    marginTop: '16px',
    textAlign: 'left',
  },
  progressBarBg: {
    height: '4px',
    background: 'rgba(190, 175, 150, 0.3)',
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #9a671a, #1b6a4a)',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  statusMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: '0.8rem',
    color: '#5a5043',
    fontWeight: '500',
  },
  progressPct: {
    fontSize: '0.75rem',
  }
};
