import os
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Canvas for adding page numbers 'Page X of Y' and corporate header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#005A9C")) # Corporate Primary Accent
        
        # Header banner text
        self.drawString(36, 576, "ENTERPRISE PERFORMANCE TRACKER ANALYTICS REPORT")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#666666"))
        self.drawRightString(756, 576, datetime.now().strftime("%B %d, %Y - %H:%M:%S"))
        
        # Header dividing line
        self.setStrokeColor(colors.HexColor("#005A9C"))
        self.setLineWidth(0.75)
        self.line(36, 570, 756, 570)
        
        # Footer dividing line
        self.setStrokeColor(colors.HexColor("#CCCCCC"))
        self.setLineWidth(0.5)
        self.line(36, 36, 756, 36)
        
        # Footer page numbers
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#777777"))
        self.drawString(36, 24, "Confidential - Internal Corporate Document")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(756, 24, page_str)
        self.restoreState()

def generate_pdf_report(records: list, summary: dict, columns: list) -> bytes:
    """Generate a high-quality corporate landscape PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1A2530"),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#555555"),
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#005A9C"),
        spaceBefore=8,
        spaceAfter=6
    )

    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#222222")
    )

    header_cell_style = ParagraphStyle(
        'HeaderCellText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    story = []

    # Title & Executive Meta
    story.append(Paragraph("Performance Tracker Executive Summary", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')} | Source: Master Excel Database", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E0E0E0"), spaceAfter=10))

    # Executive Summary Statistics Cards (2x4 Table Layout)
    story.append(Paragraph("Executive Key Performance Indicators (KPIs)", section_heading))
    
    summary_data = [
        [
            Paragraph("<b>Total Interns:</b>", cell_style), str(summary.get("total_interns", 0)),
            Paragraph("<b>Physical Visits:</b>", cell_style), str(summary.get("total_physical_visits", 0)),
            Paragraph("<b>Telecalling Count:</b>", cell_style), str(summary.get("total_telecalling", 0)),
            Paragraph("<b>Weekly Visits:</b>", cell_style), str(summary.get("total_weekly_visits", 0)),
        ],
        [
            Paragraph("<b>Leads Achieved:</b>", cell_style), str(summary.get("total_leads_achieved", 0)),
            Paragraph("<b>Marketing Activities:</b>", cell_style), str(summary.get("total_marketing_activities", 0)),
            Paragraph("<b>DSA / Connectors:</b>", cell_style), str(summary.get("total_dsa_connectors", 0)),
            Paragraph("<b>Promoters / Builders:</b>", cell_style), str(summary.get("total_promoters_builders", 0)),
        ]
    ]

    summary_table = Table(summary_data, colWidths=[90, 85, 90, 85, 90, 85, 100, 95])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F4F7F9")),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#1A2530")),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D9E0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # Complete Data Records Table
    story.append(Paragraph("Complete Intern Performance Records", section_heading))

    table_cols = [c for c in columns if c != "Insight"]  # We place key numerical metrics first
    if "Insight" in columns:
        table_cols.append("Insight")

    header_row = [Paragraph(c, header_cell_style) for c in table_cols]
    table_data = [header_row]

    for rec in records:
        row = []
        for c in table_cols:
            val = str(rec.get(c, ""))
            row.append(Paragraph(val, cell_style))
        table_data.append(row)

    # Dynamic Column Widths for Landscape Page (Total width = 720pt)
    col_widths = []
    num_cols = len(table_cols)
    for c in table_cols:
        if c == "S.No.":
            col_widths.append(32)
        elif c == "Intern Name":
            col_widths.append(90)
        elif c == "Branch":
            col_widths.append(95)
        elif c == "Insight":
            col_widths.append(130)
        else:
            col_widths.append(50)

    # Adjust remaining width to fit 720pt perfectly
    current_total = sum(col_widths)
    if current_total != 720 and num_cols > 0:
        diff = (720 - current_total) / num_cols
        col_widths = [max(30, w + diff) for w in col_widths]

    records_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    records_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#005A9C")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    story.append(records_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
