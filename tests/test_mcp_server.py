"""
Unit Test Suite for Sovereign MCP Server, Transports & Daemon API Endpoints
Verifies:
- All 4 native tools: z3_formal_audit, pid_topology_query, asme_stress_calc, compile_ooxml_document
- JSON-RPC 2.0 protocol format
- stdio transport loop
- WebSocket transport loop
"""

import asyncio
import json
import os
import subprocess
import sys
import pytest
import websockets
from fastapi.testclient import TestClient

from sovereign.daemon.mcp_server import MCPServer
from sovereign.api.server import create_app


def test_mcp_server_direct_all_four_tools():
    mcp = MCPServer()
    tools = mcp.list_tools()
    assert len(tools) == 4

    tool_names = [t["name"] for t in tools]
    assert "z3_formal_audit" in tool_names
    assert "pid_topology_query" in tool_names
    assert "asme_stress_calc" in tool_names
    assert "compile_ooxml_document" in tool_names

    # 1. Test Z3 tool call
    res_z3 = mcp.call_tool("z3_formal_audit", {"p_design": 150, "d_outside": 4.5, "t_actual": 0.237})
    assert res_z3["success"] is True
    assert res_z3["result"]["is_safe"] is True

    # 2. Test Topology tool call
    res_top = mcp.call_tool("pid_topology_query", {"line_tag": "10-CW-2001"})
    assert res_top["success"] is True
    assert res_top["result"]["status"] == "CONNECTED"

    # 3. Test ASME stress calc tool call
    res_asme = mcp.call_tool(
        "asme_stress_calc",
        {"pressure": 250.0, "diameter": 8.625, "actual_thickness": 0.322, "allowable_stress": 20000.0},
    )
    assert res_asme["success"] is True
    assert res_asme["result"]["is_safe"] is True
    assert res_asme["result"]["t_min"] > 0
    assert res_asme["result"]["hoop_stress_psi"] > 0
    assert res_asme["result"]["status"] == "FIT_FOR_SERVICE"

    # 4. Test OOXML compile tool call
    res_doc = mcp.call_tool("compile_ooxml_document", {"doc_type": "docx", "title": "Test MCP PSU Memo"})
    assert res_doc["success"] is True
    assert res_doc["result"]["status"] == "COMPILED"


def test_mcp_jsonrpc_protocol():
    mcp = MCPServer()

    # Handshake
    init_res = mcp.handle_jsonrpc({"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert init_res["result"]["serverInfo"]["name"] == "smitrace-sovereign-mcp"
    assert "protocolVersion" in init_res["result"]

    # Tool list
    list_res = mcp.handle_jsonrpc({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    assert len(list_res["result"]["tools"]) == 4

    # Tool call
    call_res = mcp.handle_jsonrpc({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "asme_stress_calc",
            "arguments": {"pressure": 200, "diameter": 6.625, "actual_thickness": 0.280},
        },
    })
    assert call_res["result"]["isError"] is False
    content_data = json.loads(call_res["result"]["content"][0]["text"])
    assert content_data["is_safe"] is True


def test_mcp_stdio_transport():
    """Verify stdio transport communicating over child process stdin/stdout."""
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
    env = os.environ.copy()
    env["PYTHONPATH"] = src_dir + (os.pathsep + env["PYTHONPATH"] if "PYTHONPATH" in env else "")

    cmd = [sys.executable, "-m", "sovereign.daemon.mcp_server", "--transport", "stdio"]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )

    req = json.dumps({"jsonrpc": "2.0", "id": 10, "method": "tools/list"}) + "\n"
    stdout_data, _ = proc.communicate(input=req, timeout=5)

    assert stdout_data
    resp = json.loads(stdout_data.strip())
    assert resp["id"] == 10
    assert len(resp["result"]["tools"]) == 4


@pytest.mark.asyncio
async def test_mcp_websocket_transport():
    """Verify WebSocket transport receiving JSON-RPC frames and sending tool output."""
    mcp = MCPServer()
    port = 8789

    async def ws_handler(websocket):
        async for msg in websocket:
            req = json.loads(msg)
            resp = mcp.handle_jsonrpc(req)
            await websocket.send(json.dumps(resp))

    server = await websockets.serve(ws_handler, "127.0.0.1", port)
    try:
        uri = f"ws://127.0.0.1:{port}"
        async with websockets.connect(uri) as client_ws:
            # Send tools/list
            await client_ws.send(json.dumps({"jsonrpc": "2.0", "id": 42, "method": "tools/list"}))
            reply = await client_ws.recv()
            data = json.loads(reply)
            assert data["id"] == 42
            assert len(data["result"]["tools"]) == 4

            # Send tools/call for asme_stress_calc
            call_payload = {
                "jsonrpc": "2.0",
                "id": 43,
                "method": "tools/call",
                "params": {
                    "name": "asme_stress_calc",
                    "arguments": {"pressure": 150.0, "diameter": 4.5, "actual_thickness": 0.237},
                },
            }
            await client_ws.send(json.dumps(call_payload))
            call_reply = await client_ws.recv()
            call_data = json.loads(call_reply)
            assert call_data["id"] == 43
            assert call_data["result"]["isError"] is False
    finally:
        server.close()
        await server.wait_closed()


def test_mcp_api_endpoints():
    app = create_app()
    client = TestClient(app)

    # GET /api/v1/mcp/tools
    res_list = client.get("/api/v1/mcp/tools")
    assert res_list.status_code == 200
    data = res_list.json()
    assert "tools" in data
    assert len(data["tools"]) == 4

    # POST /api/v1/mcp/call (asme_stress_calc)
    res_call = client.post(
        "/api/v1/mcp/call",
        json={
            "tool_name": "asme_stress_calc",
            "arguments": {"pressure": 100, "diameter": 4.5, "actual_thickness": 0.25},
        },
    )
    assert res_call.status_code == 200
    call_data = res_call.json()
    assert call_data["success"] is True
    assert call_data["result"]["is_safe"] is True
