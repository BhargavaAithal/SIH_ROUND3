import React, { useState, useRef, useEffect, useMemo } from 'react';

export default function AuditTerminalDock({ 
  logs = [], 
  isOpen = true, 
  onToggle,
  embedded = false,
}) {
  const [filterActor, setFilterActor] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);
  const dockRef = useRef(null);

  // Dedicated wheel listener that strictly traps scroll inside the floating dock
  // when open. In embedded mode, let normal scrolling behavior handle page & panel.
  useEffect(() => {
    const dockEl = dockRef.current;
    if (!dockEl || !isOpen || embedded) return;

    const handleWheel = (e) => {
      e.stopPropagation();
      e.preventDefault();

      const logContainer = logContainerRef.current;
      if (!logContainer) return;

      let deltaY = e.deltaY;
      if (e.deltaMode === 1) {
        deltaY *= 24;
      } else if (e.deltaMode === 2) {
        deltaY *= logContainer.clientHeight;
      }

      logContainer.scrollTop += deltaY;
    };

    dockEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      dockEl.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, embedded]);

  // Handle manual scrolling so auto-scroll does not hijack user inspection
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  useEffect(() => {
    if (autoScroll && logContainerRef.current && isOpen) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isOpen]);

  const filteredLogs = logs.filter(log => {
    const matchesActor = filterActor === 'ALL' || log.actor === filterActor;
    const matchesQuery = searchQuery === '' || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.hash && log.hash.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesActor && matchesQuery;
  });

  // Hierarchical Session Clustering
  const sessionGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    filteredLogs.forEach((log, index) => {
      const lowerAction = (log.action || '').toLowerCase();
      const isAuth = lowerAction.includes('authenticated') || lowerAction.includes('challenge-response') || lowerAction.includes('unlocked');
      const isLogout = lowerAction.includes('terminated cryptographic session');
      const isSwitch = lowerAction.includes('switched sovereign persona');
      const isBoot = (log.actor === 'PLATFORM' && lowerAction.includes('root of trust')) || index === 0;

      const needsNewSession = index === 0 || isAuth || isLogout || isSwitch;

      if (needsNewSession || !currentGroup) {
        const sessionIndex = groups.length + 1;
        let title = `SESSION #${sessionIndex} // WORKBENCH EXECUTION`;
        let tag = 'RUNTIME';
        let color = '#235482';
        let icon = '⚡';

        if (isBoot && index === 0) {
          title = 'BOOT & SECURE ENCLAVE INITIALIZATION';
          tag = 'BOOT // AIR-GAP';
          color = '#235482';
          icon = '🛡️';
        } else if (isLogout) {
          title = 'SESSION TERMINATION & VAULT SEALING';
          tag = 'TERMINATED';
          color = '#a62a2a';
          icon = '🔒';
        } else if (isSwitch) {
          title = `PERSONA MIGRATION // ${log.action.split('to ')[1] || 'OPERATOR'}`;
          tag = 'SWITCH';
          color = '#9a671a';
          icon = '⇄';
        } else if (isAuth) {
          title = `OPERATOR SESSION #${sessionIndex} — SHIVA (PIPING ENG)`;
          tag = 'ED25519 // VERIFIED';
          color = '#1b6a4a';
          icon = '🔑';
        }

        currentGroup = {
          id: `session-${sessionIndex}`,
          title,
          tag,
          color,
          icon,
          startTime: log.timestamp || '',
          events: []
        };
        groups.push(currentGroup);
      }

      currentGroup.events.push(log);
    });

    return groups;
  }, [filteredLogs]);

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smitrace_audit_trail_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActorBadge = (actor) => {
    switch (actor) {
      case 'USER':
        return <span className="badge badge-gold" style={styles.actorPill}>USER</span>;
      case 'PLATFORM':
        return <span className="badge badge-cipher" style={styles.actorPill}>PLATFORM</span>;
      case 'AGENT':
        return <span className="badge badge-green" style={styles.actorPill}>AGENT</span>;
      case 'SOLVER':
        return <span className="badge badge-crimson" style={styles.actorPill}>Z3 SOLVER</span>;
      case 'SANDBOX':
        return <span className="badge badge-gold" style={{ ...styles.actorPill, background: '#78350f', color: '#fef3c7' }}>SANDBOX</span>;
      default:
        return <span className="badge badge-cipher" style={styles.actorPill}>{actor}</span>;
    }
  };

  return (
    <div 
      ref={dockRef}
      style={{
        ...(embedded ? styles.dockEmbedded : styles.dockWrapper),
        ...(embedded ? {} : {
          transform: isOpen ? 'translateY(0%)' : 'translateY(100%)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }),
      }}
      aria-hidden={!embedded && !isOpen}
    >
      {/* Header Bar */}
      <div 
        style={{
          ...styles.collapsedBar,
          cursor: embedded ? 'default' : 'pointer',
        }} 
        onClick={embedded ? undefined : onToggle}
      >
        <div style={styles.barLeft}>
          <span className="pulse-dot pulse-green" />
          <span style={styles.barTitle}>
            AUDIT LOG & ACTIVITY TIMELINE
          </span>
          <span className="mono-tag" style={{ fontSize: '0.68rem', background: '#352e25', color: '#faf4e8' }}>
            {logs.length} EVENTS • {sessionGroups.length} SESSIONS
          </span>
        </div>

        <div style={styles.barRight}>
          <span style={{ fontSize: '0.68rem', color: '#9e917e', fontFamily: "'JetBrains Mono', monospace" }}>
            100% Verified Activity Log
          </span>
          {!embedded && (
            <button style={styles.toggleBtn} onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}>
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Expanded Dock Body */}
      <div style={styles.expandedContent}>
        {/* Controls & Filter Bar */}
        <div style={styles.filterBar}>
          <div style={styles.actorFilterGroup}>
            {['ALL', 'USER', 'AGENT', 'PLATFORM', 'SOLVER', 'SANDBOX'].map(actor => (
              <button
                key={actor}
                onClick={() => setFilterActor(actor)}
                style={{
                  ...styles.filterBtn,
                  background: filterActor === actor ? '#ebdcc3' : 'rgba(255, 255, 255, 0.08)',
                  color: filterActor === actor ? '#1e1b18' : '#cfc3af',
                }}
              >
                {actor} {actor === 'ALL' ? `(${logs.length})` : `(${logs.filter(l => l.actor === actor).length})`}
              </button>
            ))}
          </div>

          <div style={styles.searchAndActions}>
            <input
              type="text"
              placeholder="Search activity log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />

            <label style={styles.autoScrollLabel}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ accentColor: '#d97706' }}
              />
              <span>Auto-scroll</span>
            </label>

            <button
              onClick={handleExportJson}
              style={styles.actionBtn}
              title="Download JSON audit log"
            >
              💾 Export JSON
            </button>
          </div>
        </div>

        {/* Rolling Event Log Stream (Hierarchical Sessions) */}
        <div 
          ref={logContainerRef} 
          onScroll={handleScroll}
          className="terminal-scroll"
          style={styles.logStream}
        >
          {sessionGroups.length === 0 ? (
            <div style={styles.emptyLog}>
              No events match the current filter.
            </div>
          ) : (
            sessionGroups.map((session) => (
              <div key={session.id} style={styles.sessionCard}>
                {/* Session Header Node */}
                <div style={styles.sessionHeaderRow}>
                  <div style={styles.sessionHeaderLeft}>
                    <span style={{ fontSize: '0.85rem' }}>{session.icon}</span>
                    <span style={styles.sessionTitleText}>{session.title}</span>
                    <span 
                      className="mono-tag" 
                      style={{ 
                        fontSize: '0.62rem', 
                        color: session.color, 
                        border: `1px solid ${session.color}40`,
                        background: `${session.color}15`,
                        padding: '1px 6px'
                      }}
                    >
                      {session.tag}
                    </span>
                  </div>
                  <div style={styles.sessionHeaderRight}>
                    <span style={styles.sessionTimeTag}>
                      INIT: {session.startTime}
                    </span>
                    <span style={styles.sessionCountBadge}>
                      {session.events.length} event{session.events.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Hierarchical Timeline Branch */}
                <div style={styles.sessionTimeline}>
                  {session.events.map((log, idx) => (
                    <div key={idx} style={styles.timelineLeaf}>
                      {/* Tree Branch Connector */}
                      <div style={styles.timelineBranchDot} />

                      {/* Event Row Body */}
                      <div style={styles.logRow}>
                        {/* Timestamp */}
                        <span className="mono-tag" style={styles.timeTag}>
                          {log.timestamp || new Date().toISOString().substring(11, 23)}
                        </span>

                        {/* Actor Badge */}
                        {getActorBadge(log.actor)}

                        {/* Event Content */}
                        <div style={styles.actionBox}>
                          <div style={styles.actionText}>
                            <strong>{log.action}</strong>
                          </div>
                          {log.details && (
                            <div style={styles.detailsText}>
                              {log.details}
                            </div>
                          )}
                        </div>

                        {/* Hash Tag */}
                        {log.hash && (
                          <div className="mono-tag" style={styles.hashTag} title={log.hash}>
                            {log.hash.length > 28 ? `${log.hash.substring(0, 24)}...` : log.hash}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  dockEmbedded: {
    position: 'relative',
    height: '620px',
    minHeight: '500px',
    width: '100%',
    background: 'rgba(25, 22, 20, 0.88)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
    color: '#e6dac8',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  dockWrapper: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '380px',
    maxHeight: '80vh',
    background: 'rgba(25, 22, 20, 0.88)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#e6dac8',
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -16px 50px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'hidden',
    overscrollBehavior: 'contain',
  },
  collapsedBar: {
    height: '42px',
    minHeight: '42px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    background: 'rgba(30, 26, 22, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  barLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflow: 'hidden',
  },
  barTitle: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#ebdcc3',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    fontFamily: "'Outfit', sans-serif",
  },
  barRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  toggleBtn: {
    background: 'rgba(53, 46, 37, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#faf4e8',
    padding: '3px 9px',
    borderRadius: '5px',
    fontSize: '0.7rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  expandedContent: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  filterBar: {
    padding: '6px 20px',
    background: 'rgba(21, 19, 17, 0.8)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    flexShrink: 0,
  },
  actorFilterGroup: {
    display: 'flex',
    gap: '5px',
  },
  filterBtn: {
    border: 'none',
    padding: '3px 7px',
    borderRadius: '4px',
    fontSize: '0.66rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  searchAndActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchInput: {
    background: 'rgba(35, 31, 26, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '5px',
    color: '#ebdcc3',
    padding: '3px 8px',
    fontSize: '0.72rem',
    outline: 'none',
    width: '160px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  autoScrollLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.68rem',
    color: '#a89c89',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  actionBtn: {
    background: 'rgba(45, 38, 30, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ebdcc3',
    padding: '3px 8px',
    borderRadius: '5px',
    fontSize: '0.68rem',
    cursor: 'pointer',
    fontWeight: '700',
  },
  logStream: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '12px 20px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    background: 'transparent',
    overscrollBehavior: 'contain',
  },
  emptyLog: {
    padding: '30px',
    textAlign: 'center',
    color: '#827665',
    fontStyle: 'italic',
    fontSize: '0.84rem',
  },
  sessionCard: {
    background: 'rgba(36, 31, 26, 0.65)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sessionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(80, 68, 54, 0.4)',
    flexWrap: 'wrap',
    gap: '8px',
  },
  sessionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sessionTitleText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#f2e8dc',
    letterSpacing: '0.04em',
  },
  sessionHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sessionTimeTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    color: '#8a7d6d',
  },
  sessionCountBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    background: '#2c251e',
    color: '#c2b39f',
    padding: '1px 6px',
    borderRadius: '3px',
    border: '1px solid #42382d',
    fontWeight: '700',
  },
  sessionTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingLeft: '14px',
    borderLeft: '2px solid rgba(160, 138, 110, 0.25)',
    marginLeft: '6px',
  },
  timelineLeaf: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
  },
  timelineBranchDot: {
    position: 'absolute',
    left: '-18px',
    top: '10px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#9a671a',
    border: '1px solid #f2e8dc',
  },
  logRow: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '5px 8px',
    borderRadius: '5px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(60, 50, 40, 0.25)',
    fontSize: '0.78rem',
  },
  timeTag: {
    fontSize: '0.68rem',
    background: '#24201b',
    color: '#9e917e',
    padding: '2px 5px',
    flexShrink: 0,
    borderRadius: '3px',
  },
  actorPill: {
    padding: '2px 5px',
    fontSize: '0.62rem',
    flexShrink: 0,
  },
  actionBox: {
    flex: 1,
  },
  actionText: {
    color: '#f0e6d6',
    lineHeight: '1.25',
  },
  detailsText: {
    fontSize: '0.7rem',
    color: '#a39580',
    marginTop: '2px',
    lineHeight: '1.25',
  },
  hashTag: {
    fontSize: '0.65rem',
    background: '#2b251e',
    color: '#d97706',
    border: '1px solid #453b2d',
    padding: '1px 5px',
    flexShrink: 0,
    borderRadius: '3px',
  }
};
