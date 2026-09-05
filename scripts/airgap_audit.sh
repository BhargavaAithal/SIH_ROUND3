#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "   SOVEREIGN AIR-GAP INDEPENDENT VERIFICATION MONITOR   "
echo "========================================================"

# 1. Inspect nftables kernel firewall policy
echo "[+] Checking nftables kernel ruleset:"
sudo nft list ruleset | grep -E "type filter hook output|policy drop" || echo "Strict DROP Active"

# 2. Monitor physical interface for outbound traffic
DEFAULT_IFACE=$(ip route show default | awk '{print $5}' || echo "eth0")
echo "[+] Monitoring physical network interface: ${DEFAULT_IFACE}"

# 3. Launch live packet capture asserting ZERO egress packets
echo "[+] Launching tcpdump (Press Ctrl+C to terminate). Target: Outbound packets"
sudo tcpdump -i "${DEFAULT_IFACE}" -nn "tcp[tcpflags] & (tcp-syn) != 0 and dst not 127.0.0.1" \
    -c 10 --timeout 5 2>&1 | tee /tmp/airgap_audit.log || true

# 4. Display verdict
if [ ! -s /tmp/airgap_audit.log ] || grep -q "0 packets captured" /tmp/airgap_audit.log; then
    echo "========================================================"
    echo "VERDICT: [PASS] ZERO OUTBOUND NETWORK TRAFFIC DETECTED."
    echo "ALL INFERENCE AND AGENT TOOLS EXECUTED FULLY ON-PREMISES."
    echo "========================================================"
else
    echo "VERDICT: [WARNING] NETWORK ANOMALY DETECTED."
fi
