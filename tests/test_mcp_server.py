"""
Unit Test Suite for Sovereign MCP Server & Daemon API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from sovereign.daemon.mcp_server import MCPServer
from sovereign.api.server import create_app


def test_mcp_server_direct():
    mcp = MCPServer()
    tools = mcp.list_tools()
    assert len(tools) >= 3

    tool_names = [t["name"] for t in tools]
    assert "z3_formal_audit" in tool_names
    assert "pid_topology_query" in tool_names

    # Test Z3 tool call
    res_z3 = mcp.call_tool("z3_formal_audit", {"p_design": 150, "d_outside": 4.5, "t_actual": 0.237})
    assert res_z3["success"] is True
    assert res_z3["result"]["is_safe"] is True

    # Test Topology tool call
    res_top = mcp.call_tool("pid_topology_query", {"line_tag": "10-CW-2001"})
    assert res_top["success"] is True
    assert res_top["result"]["status"] == "CONNECTED"


def test_mcp_api_endpoints():
    app = create_app()
    client = TestClient(app)

    # GET /api/v1/mcp/tools
    res_list = client.get("/api/v1/mcp/tools")
    assert res_list.status_code == 200
    data = res_list.json()
    assert "tools" in data
    assert len(data["tools"]) >= 3

    # POST /api/v1/mcp/call
    res_call = client.post(
        "/api/v1/mcp/call",
        json={
            "tool_name": "z3_formal_audit",
            "arguments": {"p_design": 100, "d_outside": 4.5, "t_actual": 0.25},
        },
    )
    assert res_call.status_code == 200
    call_data = res_call.json()
    assert call_data["success"] is True
    assert call_data["result"]["is_safe"] is True
