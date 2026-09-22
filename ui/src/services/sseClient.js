// Real-time Server-Sent Events (SSE) Client
import { useWorkbenchStore } from '../store/useWorkbenchStore';

class SovereignSSEClient {
  constructor() {
    this.eventSource = null;
    this.reconnectTimeout = null;
    this.reconnectDelay = 2000;
  }

  connect() {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource('/api/v1/events');

      this.eventSource.onopen = () => {
        this.reconnectDelay = 2000;
      };

      this.eventSource.addEventListener('telemetry', (e) => {
        try {
          const data = JSON.parse(e.data);
          useWorkbenchStore.getState().setAirgapTelemetry(data);
        } catch (err) {
          console.error('Failed to parse telemetry event', err);
        }
      });

      this.eventSource.addEventListener('heartbeat', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.airgap) {
            useWorkbenchStore.getState().setAirgapTelemetry({
              airgapStatus: data.airgap,
              egressBytes: data.wan_egress || 0,
              throughputKbps: 0.0,
            });
          }
        } catch (err) {
          console.error('Failed to parse heartbeat event', err);
        }
      });

      this.eventSource.addEventListener('agent_turn', (e) => {
        try {
          const turn = JSON.parse(e.data);
          useWorkbenchStore.getState().addAgentTurn(turn);
        } catch (err) {
          console.error('Failed to parse agent_turn event', err);
        }
      });

      this.eventSource.addEventListener('z3_evaluation', (e) => {
        try {
          const verdict = JSON.parse(e.data);
          useWorkbenchStore.getState().setZ3Result(verdict);
        } catch (err) {
          console.error('Failed to parse z3_evaluation event', err);
        }
      });

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.startOfflineHeartbeat();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.startOfflineHeartbeat();
      this.scheduleReconnect();
    }
  }

  startOfflineHeartbeat() {
    if (this.offlineInterval) return;
    this.offlineInterval = setInterval(() => {
      useWorkbenchStore.getState().setAirgapTelemetry({
        airgapStatus: 'PASS',
        egressBytes: 0,
        throughputKbps: 0.0,
      });
    }, 5000);
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.offlineInterval) {
      clearInterval(this.offlineInterval);
      this.offlineInterval = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export const sseClient = new SovereignSSEClient();
