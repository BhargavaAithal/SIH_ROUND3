import React, { useEffect } from 'react';
import { useWorkbenchStore } from './store/useWorkbenchStore';
import { Header } from './components/common/Header';
import { AirgapModal } from './components/common/AirgapModal';
import { PIDViewerTab } from './components/pid/PIDViewerTab';
import { CalculationSandboxTab } from './components/sandbox/CalculationSandboxTab';
import { Z3AuditTab } from './components/z3/Z3AuditTab';
import { DeliverablesTab } from './components/deliverables/DeliverablesTab';
import { sseClient } from './services/sseClient';

export const App = () => {
  const { activeTab } = useWorkbenchStore();

  useEffect(() => {
    sseClient.connect();
    return () => sseClient.disconnect();
  }, []);

  const renderActiveViewport = () => {
    switch (activeTab) {
      case 'pid':
        return <PIDViewerTab />;
      case 'sandbox':
        return <CalculationSandboxTab />;
      case 'z3':
        return <Z3AuditTab />;
      case 'deliverables':
        return <DeliverablesTab />;
      default:
        return <PIDViewerTab />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Header />
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {renderActiveViewport()}
      </main>
      <AirgapModal />
    </div>
  );
};

export default App;
