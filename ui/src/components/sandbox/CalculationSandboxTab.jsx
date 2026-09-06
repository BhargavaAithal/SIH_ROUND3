import React from 'react';
import { ReActConsole } from './ReActConsole';
import { CodePlayground } from './CodePlayground';
import { ASTGuardViewer } from './ASTGuardViewer';

export const CalculationSandboxTab = () => {
  return (
    <div className="tab-viewport-content" style={{ display: 'grid', gridTemplateColumns: '42% 58%', height: '100%' }}>
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
  );
};
