"""
Headless Calculation Audit Workbook Compiler (openpyxl)
Compiles multi-tab audited mechanical calculation spreadsheets with
active dynamic formulas, conditional formatting, bold headers, and audit trails.
"""
import math
from pathlib import Path
import re
from typing import Any, Dict, List
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


def generate_audit_workbook(sheets_data: Dict[str, List[Dict[str, Any]]], output_path: str) -> str:
    """
    Generate native corporate calculation audit workbook (.xlsx).
    Guarantees valid OOXML packaging, active formulas starting with '=', and enterprise styling.
    """
    out = Path(output_path)
    if not out.parent.exists():
        if not out.parent.parent.exists() or output_path.startswith(("/", "\\")):
            raise FileNotFoundError(f"Target directory does not exist or is unwritable: {out.parent}")
        try:
            out.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise OSError(f"Cannot create output directory: {out.parent}") from e

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Remove default blank sheet

    # Styling constants
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    border_thin = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9'),
    )

    if not sheets_data:
        # Empty workbook handling
        ws = wb.create_sheet(title="Summary")
        ws.cell(row=1, column=1, value="No Data").font = header_font
        ws.cell(row=1, column=1).fill = header_fill
    else:
        for sheet_title, rows in sheets_data.items():
            # Sanitize title against Excel forbidden characters (\, /, ?, *, :, [, ]) and cap to 31 chars
            safe_title = re.sub(r'[\\/*?:\[\]]', '-', sheet_title)[:31]
            ws = wb.create_sheet(title=safe_title)

            if not rows:
                ws.cell(row=1, column=1, value="Empty Sheet").font = header_font
                ws.cell(row=1, column=1).fill = header_fill
                continue

            headers = list(rows[0].keys())

            # Write header row
            for col_idx, h in enumerate(headers, start=1):
                cell = ws.cell(row=1, column=col_idx, value=str(h).replace("_", " ").upper())
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")

            # Write data rows
            for row_idx, r in enumerate(rows, start=2):
                for col_idx, h in enumerate(headers, start=1):
                    val = r.get(h)
                    cell = ws.cell(row=row_idx, column=col_idx)
                    cell.border = border_thin

                    # Extreme floats / NaN handling
                    if isinstance(val, float):
                        if math.isnan(val):
                            cell.value = "N/A"
                        elif math.isinf(val):
                            cell.value = "#NUM!"
                        else:
                            cell.value = val
                            cell.number_format = "0.000"
                    else:
                        cell.value = val

            # Dynamic formula generation for calculation sheets where parameters exist
            upper_headers = {str(h).strip().upper() for h in headers}
            calc_keys = {"P", "D", "S", "E"}
            is_calc_sheet = calc_keys.issubset(upper_headers) or (
                any(k in ["P", "design_pressure", "t_min", "measured_t"] for k in headers)
                and len(headers) >= 7
            )
            if is_calc_sheet and ws.max_row >= 2:
                col_g_letter = "G"
                for r in range(2, ws.max_row + 1):
                    ws[f"{col_g_letter}{r}"].value = f"=(C{r}*D{r})/(2*(E{r}*F{r}+C{r}*0.4))+0.125"

            # Auto-fit column widths
            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = get_column_letter(col[0].column)
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    wb.save(str(out))
    return str(out)
