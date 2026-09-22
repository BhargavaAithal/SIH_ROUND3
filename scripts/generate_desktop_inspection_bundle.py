"""
Script to generate the 6 real inspection files for Unit 3 Line 1042:
1. PID_Unit3_Line1042_scan.pdf — P&ID drawing schematic
2. UT_Inspection_Log_14Sep2026.jpg — photo of handwritten thickness-reading log page
3. Corrosion_Trend_2019-2025.xlsx — 6-year historical UT spreadsheet
4. MillCert_A106GrB_Heat4471.pdf — material test certificate
5. SitePhoto_CorrosionSpot.jpg — photo of flagged corrosion section
6. PrevApprovalNote_2025.docx — last year's sign-off memo
"""
import os
import sys
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def get_desktop_dir():
    # Target desktop path
    desktop = Path(r"c:\Users\Vinyas G M\OneDrive\Desktop\Inspection_Files_Line1042")
    desktop.mkdir(parents=True, exist_ok=True)
    return desktop

def get_public_bundle_dir():
    # Also copy to UI public folder for easy in-app access/fallback
    pub = Path(__file__).resolve().parent.parent / "ui" / "public" / "inspection_bundle"
    pub.mkdir(parents=True, exist_ok=True)
    return pub

# -------------------------------------------------------------
# 1. PID_Unit3_Line1042_scan.pdf
# -------------------------------------------------------------
def generate_pid_pdf(dest_paths):
    for dest in dest_paths:
        c = canvas.Canvas(str(dest), pagesize=landscape(letter))
        width, height = landscape(letter)

        # Background - slight warm paper tint to look scanned
        c.setFillColor(colors.HexColor('#FCFBF7'))
        c.rect(0, 0, width, height, fill=True, stroke=False)

        # Drawing outer border
        c.setStrokeColor(colors.HexColor('#1E293B'))
        c.setLineWidth(2)
        c.rect(20, 20, width - 40, height - 40)
        c.rect(24, 24, width - 48, height - 48)

        # Title Block bottom right
        tb_w, tb_h = 280, 95
        tb_x, tb_y = width - 24 - tb_w, 24
        c.rect(tb_x, tb_y, tb_w, tb_h)
        c.line(tb_x, tb_y + 65, tb_x + tb_w, tb_y + 65)
        c.line(tb_x, tb_y + 40, tb_x + tb_w, tb_y + 40)
        c.line(tb_x, tb_y + 20, tb_x + tb_w, tb_y + 20)
        c.line(tb_x + 140, tb_y, tb_x + 140, tb_y + 65)

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor('#0F172A'))
        c.drawString(tb_x + 10, tb_y + 73, "INDIAN OIL CORPORATION LTD • REFINERY")
        c.setFont("Helvetica", 8)
        c.drawString(tb_x + 10, tb_y + 50, "DWG: PID-CDU3-1042-REV4")
        c.drawString(tb_x + 145, tb_y + 50, "AREA: UNIT 3 PREHEAT")
        c.drawString(tb_x + 10, tb_y + 27, "SERVICE: CRUDE CHARGE")
        c.drawString(tb_x + 145, tb_y + 27, "DESIGN: 400 PSIG @ 350°F")
        c.setFont("Helvetica-Bold", 8)
        c.drawString(tb_x + 10, tb_y + 7, "LINE TAG: 12\"-P-1042-CS-150-H")
        c.drawString(tb_x + 145, tb_y + 7, "INSPECTION REF: UT-1042")

        # Top banner
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, height - 45, "PIPING & INSTRUMENTATION DIAGRAM — UNIT 3 CRUDE PRE-HEAT TRAIN")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor('#475569'))
        c.drawString(40, height - 58, "CRITICAL SERVICE CORROSION MONITORING LOOP (ASME B31.3 PROCESS PIPING)")

        # Draw Equipment: Column V-101
        c.setStrokeColor(colors.HexColor('#0F172A'))
        c.setLineWidth(1.5)
        c.roundRect(80, 180, 90, 240, 15, stroke=True, fill=False)
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor('#0F172A'))
        c.drawCentredString(125, 305, "V-101")
        c.setFont("Helvetica", 8)
        c.drawCentredString(125, 290, "CRUDE TOWER")

        # Heat Exchanger E-101
        c.circle(360, 300, 45, stroke=True, fill=False)
        c.line(315, 300, 405, 300)
        c.line(360, 255, 360, 345)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(360, 310, "E-101")
        c.setFont("Helvetica", 8)
        c.drawCentredString(360, 285, "PREHEATER")

        # Pump P-102A
        c.circle(570, 300, 30, stroke=True, fill=False)
        p1 = c.beginPath()
        p1.moveTo(565, 300)
        p1.lineTo(595, 315)
        p1.lineTo(595, 285)
        p1.close()
        c.drawPath(p1, stroke=1, fill=1)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(550, 340, "P-102A")
        c.setFont("Helvetica", 7)
        c.drawString(540, 260, "CRUDE BOOSTER")

        # Main Process Line: Line 1042
        c.setStrokeColor(colors.HexColor('#0284C7'))
        c.setLineWidth(3)
        c.line(170, 300, 315, 300)
        c.line(405, 300, 540, 300)

        # Branch & Flagged Corrosion Inspection Callout
        c.setStrokeColor(colors.HexColor('#DC2626'))
        c.setLineWidth(2)
        c.circle(245, 300, 12, stroke=True, fill=False)
        c.line(245, 312, 245, 375)
        c.setFillColor(colors.HexColor('#FEF2F2'))
        c.rect(180, 375, 150, 40, stroke=True, fill=True)

        c.setFillColor(colors.HexColor('#991B1B'))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(186, 402, "FLAGGED CML SPOT: CML-03")
        c.setFont("Helvetica", 7)
        c.drawString(186, 390, "LINE 1042 (12\" SCH 40 A106-B)")
        c.drawString(186, 380, "INSPECTED: 14-SEP-2026")

        # Line specification label
        c.setFillColor(colors.HexColor('#0369A1'))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(185, 285, "12\"-P-1042-CS-150")
        c.drawString(425, 285, "12\"-P-1042-CS-150")

        # Valves
        c.setStrokeColor(colors.HexColor('#0F172A'))
        c.setLineWidth(1)
        p2 = c.beginPath()
        p2.moveTo(200, 306)
        p2.lineTo(220, 294)
        p2.lineTo(220, 306)
        p2.lineTo(200, 294)
        p2.close()
        c.drawPath(p2, stroke=1, fill=0)
        c.line(210, 300, 210, 315)
        c.line(205, 315, 215, 315)

        # Stamp
        c.setStrokeColor(colors.HexColor('#15803D'))
        c.setFillColor(colors.HexColor('#15803D'))
        c.setFont("Helvetica-Bold", 10)
        c.rect(40, 50, 180, 45)
        c.drawString(50, 80, "AS-BUILT PLANT SCHEMATIC")
        c.setFont("Helvetica", 8)
        c.drawString(50, 68, "CONTROLLED DOCUMENT // PSU DIVISION")
        c.drawString(50, 56, "VERIFIED FOR UT AUDIT — 2026")

        c.save()

# -------------------------------------------------------------
# 2. UT_Inspection_Log_14Sep2026.jpg
# -------------------------------------------------------------
def generate_ut_log_jpg(dest_paths):
    img_w, img_h = 1600, 2200
    img = Image.new('RGB', (img_w, img_h), color=(250, 248, 242))
    draw = ImageDraw.Draw(img)

    for y in range(80, img_h - 80, 40):
        draw.line([(80, y), (img_w - 80, y)], fill=(230, 235, 240), width=1)

    draw.rectangle([(60, 60), (img_w - 60, img_h - 60)], outline=(40, 50, 70), width=3)

    draw.text((100, 100), "INDIAN OIL CORPORATION LIMITED — INSPECTION & NDT DIVISION", fill=(20, 30, 60))
    draw.text((100, 140), "ULTRASONIC THICKNESS (UT) GAUGING FIELD REPORT", fill=(10, 20, 40))
    draw.line([(80, 180), (img_w - 80, 180)], fill=(40, 50, 70), width=2)

    fields = [
        ("PLANT / REFINERY:", "PARADIP CDU-3", 100, 210),
        ("INSPECTION DATE:", "14-SEP-2026", 850, 210),
        ("LINE IDENTIFICATION:", "12\"-P-1042-CS-150 (Line 1042)", 100, 260),
        ("MATERIAL SPEC:", "ASTM A106 Grade B Seamless", 850, 260),
        ("DESIGN PRESS / TEMP:", "400 psig @ 350°F", 100, 310),
        ("NOMINAL THICKNESS:", "9.53 mm (0.375 in) Sch 40", 850, 310),
        ("UT INSTRUMENT:", "Olympus 38DL Plus / Krautkramer", 100, 360),
        ("CALIBRATION BLOCK:", "4-Step CS Wedge (2.5 - 10.0 mm)", 850, 360),
    ]

    for label, val, x, y in fields:
        draw.text((x, y), label, fill=(70, 80, 100))
        draw.text((x + 240, y - 2), val, fill=(15, 35, 120))

    draw.line([(80, 420), (img_w - 80, 420)], fill=(40, 50, 70), width=2)

    headers = [
        ("CML #", 100),
        ("LOCATION / ORIENTATION", 260),
        ("NOM (mm)", 680),
        ("2024 (mm)", 820),
        ("READING (mm)", 1000),
        ("STATUS", 1280),
    ]
    draw.rectangle([(80, 425), (img_w - 80, 475)], fill=(225, 235, 245))
    for h, x in headers:
        draw.text((x, 440), h, fill=(20, 30, 60))

    rows = [
        ("CML-01", "Upstream Elbow Top (12 o'clock)", "9.53", "8.12", "7.95 mm", "ACCEPTABLE"),
        ("CML-02", "Horizontal Spool Ext (3 o'clock)", "9.53", "8.05", "7.88 mm", "ACCEPTABLE"),
        ("CML-03", "Flagged Corrosion Spot (Bottom)", "9.53", "7.80", "7.68 mm", "FLAGGED / AUDIT"),
        ("CML-04", "Flange Neck Weld HAZ", "9.53", "8.30", "8.15 mm", "ACCEPTABLE"),
        ("CML-05", "Downstream Reducer Ext", "9.53", "8.25", "8.08 mm", "ACCEPTABLE"),
    ]

    y_pos = 490
    for r in rows:
        draw.line([(80, y_pos - 10), (img_w - 80, y_pos - 10)], fill=(200, 210, 220), width=1)
        draw.text((100, y_pos), r[0], fill=(20, 40, 120))
        draw.text((260, y_pos), r[1], fill=(15, 35, 110))
        draw.text((690, y_pos), r[2], fill=(50, 50, 50))
        draw.text((830, y_pos), r[3], fill=(40, 40, 100))
        
        if "7.68" in r[4]:
            draw.text((1000, y_pos), r[4], fill=(180, 20, 20))
            draw.text((1280, y_pos), r[5], fill=(180, 20, 20))
            draw.rectangle([(980, y_pos - 4), (1220, y_pos + 28)], outline=(180, 20, 20), width=2)
        else:
            draw.text((1000, y_pos), r[4], fill=(15, 45, 140))
            draw.text((1280, y_pos), r[5], fill=(20, 100, 40))
        y_pos += 60

    draw.line([(80, 850), (img_w - 80, 850)], fill=(40, 50, 70), width=2)
    draw.text((100, 870), "INSPECTOR NOTES & OBSERVATIONS:", fill=(30, 40, 60))
    notes = [
        "1. Surface mechanically prepared with wire brush; coupling verified with Sonatest Ultragel.",
        "2. Spot CML-03 indicates localized thinning: measured 7.68 mm (prev 7.80 mm in 2025).",
        "3. ASME B31.3 statutory minimum wall thickness calculation required.",
        "4. No laminar flaws or localized pitting detected; uniform corrosion profile.",
    ]
    ny = 910
    for n in notes:
        draw.text((120, ny), n, fill=(15, 30, 100))
        ny += 40

    draw.rectangle([(100, 1150), (700, 1320)], outline=(40, 50, 70), width=1)
    draw.text((120, 1165), "CERTIFIED NDT LEVEL II INSPECTOR:", fill=(60, 70, 80))
    draw.text((120, 1205), "R. K. Sharma (ID: NDT-UT-8842)", fill=(10, 20, 100))
    draw.text((120, 1245), "Signature: R.K.Sharma   Date: 14/09/2026", fill=(15, 35, 130))

    draw.rectangle([(850, 1150), (1450, 1320)], outline=(20, 120, 40), width=2)
    draw.text((900, 1190), "PARADIP REFINERY — QA / QC STAMPED", fill=(20, 120, 40))
    draw.text((940, 1235), "VERIFIED FIELD INSPECTION DATA", fill=(20, 120, 40))

    for dest in dest_paths:
        img.save(str(dest), quality=92)

# -------------------------------------------------------------
# 3. Corrosion_Trend_2019-2025.xlsx
# -------------------------------------------------------------
def generate_corrosion_trend_xlsx(dest_paths):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "UT_Corrosion_History"

    dark_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    warn_fill = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")
    white_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=11, bold=True)
    title_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
    border_thin = Border(left=Side(style='thin', color='CBD5E1'),
                         right=Side(style='thin', color='CBD5E1'),
                         top=Side(style='thin', color='CBD5E1'),
                         bottom=Side(style='thin', color='CBD5E1'))

    ws["A1"] = "PARADIP REFINERY — HISTORICAL CORROSION MONITORING (LINE 1042)"
    ws["A1"].font = title_font
    ws["A2"] = "Line: 12\"-P-1042-CS-150 | Material: A106 Gr B | Nominal: 9.53 mm | Min Code: 5.62 mm"
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="475569")

    headers = [
        "Year", "Survey Date", "Inspector", "CML-01 (mm)", "CML-02 (mm)", 
        "CML-03 (mm)", "CML-04 (mm)", "CML-05 (mm)", "Annual Loss (mm/yr)", "Cumulative Loss (mm)"
    ]
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.fill = dark_fill
        cell.font = white_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    data = [
        [2019, "2019-09-12", "P. Sengupta", 9.52, 9.50, 9.48, 9.53, 9.51, 0.00, 0.05],
        [2020, "2020-09-15", "P. Sengupta", 9.25, 9.28, 9.20, 9.30, 9.26, 0.28, 0.33],
        [2021, "2021-09-10", "A. K. Verma", 8.98, 9.02, 8.90, 9.05, 9.00, 0.30, 0.63],
        [2022, "2022-09-18", "A. K. Verma", 8.68, 8.75, 8.58, 8.80, 8.72, 0.32, 0.95],
        [2023, "2023-09-14", "R. K. Sharma", 8.40, 8.45, 8.28, 8.52, 8.45, 0.30, 1.25],
        [2024, "2024-09-12", "R. K. Sharma", 8.12, 8.18, 8.02, 8.30, 8.25, 0.26, 1.51],
        [2025, "2025-09-16", "R. K. Sharma", 7.95, 8.00, 7.80, 8.15, 8.08, 0.22, 1.73],
    ]

    for row_idx, row_data in enumerate(data, 5):
        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = border_thin
            cell.alignment = Alignment(horizontal="center")
            if col_idx == 6:
                cell.font = bold_font
                cell.fill = warn_fill

    ws["A13"] = "CORROSION RATE ANALYSIS (CML-03 GOVERNING LOCATION):"
    ws["A13"].font = bold_font
    ws["A14"] = "Long-Term Corrosion Rate (2019 - 2025):"
    ws["B14"] = "0.280 mm / year"
    ws["A15"] = "Short-Term Corrosion Rate (2024 - 2025):"
    ws["B15"] = "0.220 mm / year"
    ws["A16"] = "Estimated 2026 Projected Thickness:"
    ws["B16"] = "7.58 - 7.68 mm"
    ws["A17"] = "ASME B31.3 Minimum Allowed Thickness (t_min):"
    ws["B17"] = "5.62 mm"

    for r in range(14, 18):
        ws[f"B{r}"].font = bold_font

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    for dest in dest_paths:
        wb.save(str(dest))

# -------------------------------------------------------------
# 4. MillCert_A106GrB_Heat4471.pdf
# -------------------------------------------------------------
def generate_mill_cert_pdf(dest_paths):
    for dest in dest_paths:
        doc = SimpleDocTemplate(str(dest), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        styles = getSampleStyleSheet()

        header_style = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            alignment=1,
            textColor=colors.HexColor('#0F172A')
        )
        sub_style = ParagraphStyle(
            'SubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=colors.HexColor('#475569')
        )

        elements.append(Paragraph("JINDAL SAW LIMITED • SEAMLESS PIPE DIVISION", header_style))
        elements.append(Paragraph("MILL TEST CERTIFICATE — EN 10204 3.1 INSPECTION CERTIFICATE", sub_style))
        elements.append(Spacer(1, 15))

        meta_data = [
            ["Customer:", "Indian Oil Corporation Ltd", "Cert No:", "MTC-JSL-2021-44719"],
            ["Product:", "Seamless Carbon Steel Pipe", "Date:", "12-MAR-2021"],
            ["Specification:", "ASTM A106 / ASME SA106 Grade B", "Heat No:", "4471"],
            ["Dimensions:", "12\" NPS (323.8 mm OD) x Sch 40 (9.53 mm WT)", "Lot / Bundle:", "B-8841-A"],
        ]
        t_meta = Table(meta_data, colWidths=[90, 180, 80, 190])
        t_meta.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1E293B')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,-1), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ]))
        elements.append(t_meta)
        elements.append(Spacer(1, 15))

        elements.append(Paragraph("<b>1. CHEMICAL COMPOSITION (HEAT ANALYSIS %)</b>", styles['Normal']))
        elements.append(Spacer(1, 6))
        chem_data = [
            ["Element", "C", "Mn", "P", "S", "Si", "Cr", "Cu", "Ni", "Mo", "V"],
            ["Actual %", "0.21", "0.88", "0.012", "0.008", "0.22", "0.08", "0.12", "0.06", "0.02", "0.01"],
            ["Code Max", "0.30", "1.06", "0.035", "0.035", "0.10 min", "0.40", "0.40", "0.40", "0.15", "0.08"],
        ]
        t_chem = Table(chem_data, colWidths=[64] + [48]*9)
        t_chem.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_chem)
        elements.append(Spacer(1, 15))

        elements.append(Paragraph("<b>2. MECHANICAL PROPERTIES & TESTS</b>", styles['Normal']))
        elements.append(Spacer(1, 6))
        mech_data = [
            ["Property Tested", "Specified Requirement (ASTM A106 Gr B)", "Measured Value", "Result"],
            ["Tensile Strength", "min 415 MPa (60,000 psi)", "485 MPa (70,340 psi)", "PASSED"],
            ["Yield Strength", "min 240 MPa (35,000 psi)", "310 MPa (44,960 psi)", "PASSED"],
            ["Elongation in 2 in", "min 30.0 %", "34.5 %", "PASSED"],
            ["Hydrostatic Test", "min 2,500 psig (hold 5s)", "2,850 psig (10s hold)", "PASSED"],
            ["Flattening Test", "Per ASTM A530 Section 10", "No cracks observed", "PASSED"],
        ]
        t_mech = Table(mech_data, colWidths=[130, 200, 130, 80])
        t_mech.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('ALIGN', (2,1), (3,-1), 'CENTER'),
            ('TEXTCOLOR', (3,1), (3,-1), colors.HexColor('#16A34A')),
            ('FONTNAME', (3,1), (3,-1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t_mech)
        elements.append(Spacer(1, 20))

        elements.append(Paragraph(
            "<b>CERTIFICATION:</b> We hereby certify that the material described above has been manufactured, "
            "sampled, tested, and inspected in accordance with specification ASTM A106 / ASME SA106 Grade B "
            "and satisfies all mandatory physical, chemical, and hydrostatic requirements.",
            ParagraphStyle('Cert', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#334155'))
        ))
        elements.append(Spacer(1, 25))

        sig_data = [
            ["Quality Assurance Manager:", "Dr. K. N. Rao", "Authorized Inspection Stamp:"],
            ["Signature / Digital Seal:", "K.N. Rao (Digitally Signed)", "[ GOVERNMENT APPROVED NDT AGENCY ]"],
        ]
        t_sig = Table(sig_data, colWidths=[180, 180, 180])
        t_sig.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ]))
        elements.append(t_sig)

        doc.build(elements)

# -------------------------------------------------------------
# 5. SitePhoto_CorrosionSpot.jpg
# -------------------------------------------------------------
def generate_site_photo_jpg(dest_paths):
    img_w, img_h = 1600, 1200
    img = Image.new('RGB', (img_w, img_h), color=(55, 65, 75))
    draw = ImageDraw.Draw(img)

    for y in range(0, img_h, 8):
        shade = 50 + (y % 20)
        draw.line([(0, y), (img_w, y)], fill=(shade, shade + 5, shade + 10))

    pipe_top = 350
    pipe_bottom = 850
    for y in range(pipe_top, pipe_bottom):
        ratio = (y - pipe_top) / (pipe_bottom - pipe_top)
        intensity = int(80 + 110 * (1.0 - (2 * ratio - 1)**2))
        r = min(255, intensity + 30)
        g = min(255, intensity + 15)
        b = min(255, intensity)
        draw.line([(0, y), (img_w, y)], fill=(r, g, b))

    draw.polygon([(0, pipe_top - 40), (450, pipe_top - 40), (380, pipe_bottom + 40), (0, pipe_bottom + 40)], fill=(170, 175, 180))
    draw.line([(450, pipe_top - 40), (380, pipe_bottom + 40)], fill=(120, 125, 130), width=4)

    spot_cx, spot_cy = 900, 600
    for i in range(180, 0, -4):
        tint = (160 - i//3, 70 - i//5, 40)
        draw.ellipse([(spot_cx - i*1.8, spot_cy - i), (spot_cx + i*1.8, spot_cy + i)], fill=tint)

    draw.ellipse([(spot_cx - 260, spot_cy - 140), (spot_cx + 260, spot_cy + 140)], outline=(245, 245, 220), width=5)
    draw.text((spot_cx - 220, spot_cy - 210), "UT CML-03 // 14-SEP-2026", fill=(255, 255, 230))
    draw.text((spot_cx - 160, spot_cy + 160), "t = 7.68 mm (SCH 40)", fill=(255, 255, 230))

    draw.rectangle([(200, 950), (1400, 1020)], fill=(234, 179, 8), outline=(0, 0, 0), width=2)
    for tick in range(220, 1380, 40):
        draw.line([(tick, 950), (tick, 975)], fill=(0, 0, 0), width=2)
        draw.text((tick - 8, 980), f"{int((tick-220)/10)}", fill=(0, 0, 0))

    draw.rectangle([(40, 40), (480, 160)], fill=(0, 0, 0))
    draw.text((60, 55), "FACILITY: PARADIP REFINERY CDU-3", fill=(255, 255, 255))
    draw.text((60, 80), "ASSET: LINE 12\"-P-1042-CS-150", fill=(255, 255, 255))
    draw.text((60, 105), "DATE: 2026-09-14 09:42 IST", fill=(255, 255, 255))
    draw.text((60, 130), "GPS: 20°17'42\" N, 86°40'15\" E", fill=(255, 255, 255))

    for dest in dest_paths:
        img.save(str(dest), quality=90)

# -------------------------------------------------------------
# 6. PrevApprovalNote_2025.docx
# -------------------------------------------------------------
def generate_prev_approval_docx(dest_paths):
    for dest in dest_paths:
        doc = docx.Document()

        for section in doc.sections:
            section.top_margin = Inches(1.0)
            section.bottom_margin = Inches(1.0)
            section.left_margin = Inches(1.0)
            section.right_margin = Inches(1.0)

        h1 = doc.add_paragraph()
        h1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = h1.add_run("INDIAN OIL CORPORATION LIMITED\n")
        r1.bold = True
        r1.font.size = Pt(14)
        r1.font.color.rgb = RGBColor(31, 73, 125)

        r2 = h1.add_run("ANNUAL STATUTORY INSPECTION & FITNESS-FOR-SERVICE APPROVAL NOTE (2025)\n")
        r2.bold = True
        r2.font.size = Pt(12)
        r2.font.color.rgb = RGBColor(15, 23, 42)

        r3 = h1.add_run("REFERENCE: PSU/IOCL/UNIT3/2025/112  •  DATE: 18-SEP-2025\n")
        r3.font.size = Pt(9)
        r3.font.color.rgb = RGBColor(100, 116, 139)

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

        table = doc.add_table(rows=4, cols=2)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        fields = [
            ("Plant / Refinery Unit:", "Paradip Refinery • CDU-3 Crude Pre-Heat Train"),
            ("Piping System Tag:", "12\"-P-1042-CS-150 (Unit 3 Line 1042)"),
            ("Governing Code:", "ASME B31.3 Process Piping / API Standard 570"),
            ("Previous Approval Status:", "APPROVED WITH MANDATORY 12-MONTH RE-SURVEY (SEP 2026)"),
        ]
        for idx, (label, val) in enumerate(fields):
            row = table.rows[idx]
            row.cells[0].paragraphs[0].add_run(label).bold = True
            row.cells[1].paragraphs[0].add_run(val)

        doc.add_paragraph().paragraph_format.space_after = Pt(12)

        p_exec = doc.add_paragraph()
        p_exec.add_run("1. EXECUTIVE SUMMARY & 2025 FITNESS-FOR-SERVICE VERDICT\n").bold = True
        p_exec.add_run(
            "During the scheduled statutory turnaround inspection on 16-Sep-2025, ultrasonic thickness gauging "
            "was performed across 5 Condition Monitoring Locations (CMLs) on crude line 12\"-P-1042-CS-150. "
            "The minimum recorded wall thickness was 7.80 mm at CML-03 (governing lower quadrant). "
            "The calculated ASME B31.3 statutory minimum required wall thickness is 5.62 mm, demonstrating "
            "a compliant structural margin of +2.18 mm and an estimated remaining life of 7.4 years at an "
            "evaluated corrosion rate of 0.22 mm/year."
        )

        doc.add_paragraph().paragraph_format.space_after = Pt(8)
        p_cond = doc.add_paragraph()
        p_cond.add_run("2. STATUTORY APPROVAL CONDITIONS & RE-INSPECTION MANDATE\n").bold = True
        p_cond.add_run(
            "Continued operation is formally authorized for 12 calendar months subject to the following statutory stipulations:\n"
            "• Operating pressure shall not exceed 400 psig at 350°F.\n"
            "• Ultrasonic thickness re-gauging must be conducted no later than September 2026.\n"
            "• If measured thickness at CML-03 falls below 7.00 mm, comprehensive fitness-for-service re-evaluation "
            "per API 570 Section 7 is mandatory prior to permit renewal."
        )

        doc.add_paragraph().paragraph_format.space_after = Pt(16)

        p_sig = doc.add_paragraph()
        p_sig.add_run("FORMALLY APPROVED BY:\n\n").bold = True
        p_sig.add_run("Er. R. K. Sharma\n").bold = True
        p_sig.add_run("Superintending Engineer (Inspection & NDT)\n")
        p_sig.add_run("Indian Oil Corporation Ltd, Paradip Refinery")

        doc.save(str(dest))

def main():
    desktop_dir = get_desktop_dir()
    pub_dir = get_public_bundle_dir()

    print(f"Generating 6 real inspection files to:\n  -> Desktop: {desktop_dir}\n  -> UI Public: {pub_dir}")

    targets = [
        ("PID_Unit3_Line1042_scan.pdf", generate_pid_pdf),
        ("UT_Inspection_Log_14Sep2026.jpg", generate_ut_log_jpg),
        ("Corrosion_Trend_2019-2025.xlsx", generate_corrosion_trend_xlsx),
        ("MillCert_A106GrB_Heat4471.pdf", generate_mill_cert_pdf),
        ("SitePhoto_CorrosionSpot.jpg", generate_site_photo_jpg),
        ("PrevApprovalNote_2025.docx", generate_prev_approval_docx),
    ]

    for fname, gen_func in targets:
        d1 = desktop_dir / fname
        d2 = pub_dir / fname
        gen_func([d1, d2])
        size1 = d1.stat().st_size
        sha = hashlib.sha256(d1.read_bytes()).hexdigest()
        print(f"Generated: {fname} ({size1:,} bytes) - SHA-256: {sha[:12]}...")

    print("All 6 inspection files successfully generated!")

if __name__ == "__main__":
    main()
