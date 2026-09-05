"""
Sovereign AI Execution Plane & Industrial Workbench — CLI Entry Point
Provides unified interface for air-gapped engineering inference,
P&ID topology extraction, neurosymbolic verification, and report compilation.
"""
import argparse
import sys

from sovereign.sandbox import audit_network_egress
from sovereign.verifier import verify_asme_b31_3, verify_python_ast


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="sovereign",
        description="Sovereign AI Execution Plane & Industrial Workbench CLI"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Audit command
    audit_parser = subparsers.add_parser("audit", help="Run air-gap zero-egress audit")
    audit_parser.add_argument("--log", default="/tmp/airgap_audit.log", help="Path to audit log")

    # Verify command
    verify_parser = subparsers.add_parser("verify", help="Run ASME B31.3 neurosymbolic verification")
    verify_parser.add_argument("-P", "--pressure", type=float, required=True, help="Design pressure (MPa or psi)")
    verify_parser.add_argument("-D", "--diameter", type=float, required=True, help="Outside diameter (mm or in)")
    verify_parser.add_argument("-S", "--stress", type=float, default=137.9, help="Allowable stress")
    verify_parser.add_argument("-E", "--quality", type=float, default=1.0, help="Joint quality factor")
    verify_parser.add_argument("-Y", "--temp-coeff", type=float, default=0.4, help="Temperature coefficient")
    verify_parser.add_argument("-c", "--corrosion", type=float, default=3.0, help="Corrosion allowance")
    verify_parser.add_argument("-t", "--thickness", type=float, required=True, help="Actual measured thickness")

    args = parser.parse_args()

    if args.command == "audit":
        verdict = audit_network_egress(args.log)
        print(f"Air-Gap Status: {verdict.status}")
        print(f"Packets Captured: {verdict.packets_captured}")
        print(f"Egress Detected: {verdict.egress_detected}")
        return 0 if verdict.status == "PASS" else 1

    elif args.command == "verify":
        res = verify_asme_b31_3(
            design_pressure=args.pressure,
            outside_diameter=args.diameter,
            allowable_stress=args.stress,
            quality_factor=args.quality,
            temp_coefficient=args.temp_coeff,
            corrosion_allowance=args.corrosion,
            actual_thickness=args.thickness,
        )
        print(f"Status: {res.status}")
        print(f"t_min: {res.t_min}")
        print(f"t_actual: {res.t_actual}")
        print(f"Margin: {res.margin}")
        print(f"Violations: {res.violations}")
        return 0 if res.is_valid else 1

    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
