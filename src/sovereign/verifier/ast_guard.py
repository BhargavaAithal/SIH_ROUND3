"""Sovereign Verifier: Python AST Security Checker.

Performs static analysis on LLM-synthesized Python calculation scripts to enforce
zero-trust air-gap security: blocks network egress, process execution, dynamic code
execution, destructive file I/O, and dunder reflection/introspection exploits.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ASTVerificationResult:
    """Result of Python AST static security verification."""

    is_safe: bool
    violations: list[str] = field(default_factory=list)
    extracted_vars: dict[str, Any] = field(default_factory=dict)

    @property
    def valid(self) -> bool:
        """Alias for backward compatibility."""
        return self.is_safe


SAFE_OPEN_MODES: frozenset[str] = frozenset({"r", "rb", "rt", "rU"})

FORBIDDEN_MODULES: frozenset[str] = frozenset({
    # Network & Protocols
    "socket", "requests", "urllib", "urllib3", "http", "ftplib", "telnetlib",
    "smtplib", "imaplib", "poplib", "nntplib", "asyncio", "aiohttp",
    "xmlrpc", "socketserver", "ssl", "websockets", "websocket", "httpx",
    "paramiko", "ftpmirror", "ipaddress",

    # Process Execution & OS Shell
    "subprocess", "os", "posix", "nt", "shutil", "pty", "commands",
    "multiprocessing", "threading", "signal", "ctypes", "cffi",
    "resource", "fcntl", "termios",

    # Dynamic Code, Compilation, Bytecode & Deserialization
    "importlib", "imp", "builtins", "__builtin__", "types", "inspect",
    "code", "codeop", "dis", "marshal", "pickle", "shelve", "dbm",

    # System & Interpreter Tampering
    "sys", "platform", "gc",
})

FORBIDDEN_BUILTINS: frozenset[str] = frozenset({
    "eval",
    "exec",
    "compile",
    "__import__",
    "globals",
    "locals",
    "vars",
    "dir",
    "getattr",
    "setattr",
    "delattr",
    "breakpoint",
    "input",
    "memoryview",
    "help",
})

FORBIDDEN_ATTRIBUTES: frozenset[str] = frozenset({
    "__class__",
    "__bases__",
    "__base__",
    "__mro__",
    "__subclasses__",
    "__globals__",
    "__code__",
    "__builtins__",
    "__closure__",
    "__func__",
    "__self__",
    "__reduce__",
    "__reduce_ex__",
    "__loader__",
    "__spec__",
    "__package__",
    "__dict__",
    "modules",  # prevents sys.modules or fake module access
})


class SecurityASTVisitor(ast.NodeVisitor):
    """AST visitor traversing nodes to detect forbidden operations."""

    def __init__(self) -> None:
        self.violations: list[str] = []
        self.extracted_vars: dict[str, Any] = {}
        self._call_func_ids: set[int] = set()

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root_module = alias.name.split(".")[0]
            if root_module in FORBIDDEN_MODULES:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden import '{alias.name}'"
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module:
            root_module = node.module.split(".")[0]
            if root_module in FORBIDDEN_MODULES:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden from-import module '{node.module}'"
                )
        for alias in node.names:
            root_name = alias.name.split(".")[0]
            if root_name in FORBIDDEN_BUILTINS or root_name in FORBIDDEN_MODULES:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden imported name '{alias.name}'"
                )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        # Track function node id so visit_Name knows it is a direct call target
        self._call_func_ids.add(id(node.func))

        # Check direct call to forbidden builtins
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name in FORBIDDEN_BUILTINS:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden call to builtin '{func_name}'"
                )
            elif func_name == "open":
                self._check_open_call(node)
        elif isinstance(node.func, ast.Attribute):
            attr_name = node.func.attr
            if attr_name in FORBIDDEN_BUILTINS:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden call to builtin '{attr_name}'"
                )
            elif attr_name in ("system", "popen", "spawn", "fork"):
                self.violations.append(
                    f"Line {node.lineno}: Forbidden process execution call '{attr_name}()'"
                )

        self.generic_visit(node)

    def _check_open_call(self, node: ast.Call) -> None:
        mode_val: str | None = None

        # Mode passed as 2nd positional argument
        if len(node.args) >= 2:
            mode_arg = node.args[1]
            if isinstance(mode_arg, ast.Constant) and isinstance(mode_arg.value, str):
                mode_val = mode_arg.value
            else:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden dynamic mode expression passed to open()"
                )
                return

        # Mode passed as keyword argument 'mode'
        for kw in node.keywords:
            if kw.arg == "mode":
                if isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    mode_val = kw.value.value
                else:
                    self.violations.append(
                        f"Line {node.lineno}: Forbidden dynamic mode expression passed to open()"
                    )
                    return

        if mode_val is not None:
            if mode_val not in SAFE_OPEN_MODES:
                self.violations.append(
                    f"Line {node.lineno}: Forbidden open() mode '{mode_val}'. Only explicit read modes ('r', 'rb', 'rt') are permitted."
                )

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if node.attr in FORBIDDEN_ATTRIBUTES:
            self.violations.append(
                f"Line {node.lineno}: Forbidden attribute access '{node.attr}'"
            )
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        if node.id in FORBIDDEN_BUILTINS:
            self.violations.append(
                f"Line {node.lineno}: Forbidden reference to '{node.id}'"
            )
        elif node.id in {"__builtins__", "globals", "locals"}:
            self.violations.append(
                f"Line {node.lineno}: Forbidden identifier reference '{node.id}'"
            )
        elif node.id == "open" and id(node) not in self._call_func_ids:
            self.violations.append(
                f"Line {node.lineno}: Forbidden reference to 'open' outside direct call"
            )
        self.generic_visit(node)

    def visit_Subscript(self, node: ast.Subscript) -> None:
        if isinstance(node.value, (ast.Name, ast.Call)):
            val_id = getattr(node.value, "id", None) or getattr(getattr(node.value, "func", None), "id", None)
            if val_id in ("globals", "locals", "__builtins__"):
                self.violations.append(
                    f"Line {node.lineno}: Forbidden subscript access to '{val_id}'"
                )
        self.generic_visit(node)


def verify_python_ast(code: str) -> ASTVerificationResult:
    """Statically analyzes and verifies Python code against industrial zero-trust security policies.

    Args:
        code: Python source code string.

    Returns:
        ASTVerificationResult indicating safety and listing any violations.
    """
    if not isinstance(code, str) or not code.strip():
        return ASTVerificationResult(
            is_safe=False,
            violations=["EmptyCodeString: No code provided"],
        )

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return ASTVerificationResult(
            is_safe=False,
            violations=[f"Line {e.lineno or 0}: SyntaxError: {e.msg}"],
        )
    except Exception as e:
        return ASTVerificationResult(
            is_safe=False,
            violations=[f"Line 0: Failed to parse AST: {str(e)}"],
        )

    visitor = SecurityASTVisitor()
    visitor.visit(tree)

    # Deduplicate while preserving order
    unique_violations = list(dict.fromkeys(visitor.violations))
    return ASTVerificationResult(
        is_safe=len(unique_violations) == 0,
        violations=unique_violations,
        extracted_vars=visitor.extracted_vars,
    )
