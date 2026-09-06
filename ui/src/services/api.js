// API Service for local FastAPI communication (http://127.0.0.1:8000)

const BASE_URL = ''; // Relative path for proxy / static serving

export async function fetchAirgapTelemetry() {
  const response = await fetch(`${BASE_URL}/api/v1/telemetry/airgap`);
  if (!response.ok) throw new Error(`Telemetry failed: ${response.statusText}`);
  return response.json();
}

export async function fetchTopology() {
  const response = await fetch(`${BASE_URL}/api/v1/pid/topology`);
  if (!response.ok) throw new Error(`Topology failed: ${response.statusText}`);
  return response.json();
}

export async function calculatePipeASME(params) {
  const response = await fetch(`${BASE_URL}/api/v1/pid/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(`Calculation failed: ${response.statusText}`);
  return response.json();
}

export async function executeSandboxCode(code, timeoutSec = 10, memoryMb = 512) {
  const response = await fetch(`${BASE_URL}/api/v1/sandbox/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      timeout_sec: timeoutSec,
      memory_limit_mb: memoryMb,
      enforce_ast_guard: true,
    }),
  });
  return {
    status: response.status,
    ok: response.ok,
    data: await response.json(),
  };
}

export async function evaluateZ3Formal(standard, params) {
  const response = await fetch(`${BASE_URL}/api/v1/verifier/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      standard,
      parameters: params,
    }),
  });
  if (!response.ok) throw new Error(`Formal evaluation failed: ${response.statusText}`);
  return response.json();
}

export function getDeliverableMemoUrl() {
  return `${BASE_URL}/api/v1/deliverables/memo`;
}

export function getDeliverableWorkbookUrl() {
  return `${BASE_URL}/api/v1/deliverables/workbook`;
}
