"""
PDF generation service for rental property summaries.
Uses ReportLab to generate monthly income/expense reports.
"""

import io
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
MONTH_LABELS = {
    "jan": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr",
    "may": "May", "jun": "Jun", "jul": "Jul", "aug": "Aug",
    "sep": "Sep", "oct": "Oct", "nov": "Nov", "dec": "Dec",
}


def _format_currency(amount: Decimal | float | int) -> str:
    """Format a number as currency."""
    if amount is None:
        amount = 0
    return f"${float(amount):,.2f}"


def _get_month_value(values: dict, month: str) -> Decimal:
    """Safely get a month value from a dict."""
    val = values.get(month, 0)
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val))


def generate_rental_summary_pdf(summary_data: dict[str, Any], contact_name: str = "") -> bytes:
    """
    Generate a PDF for a rental property monthly summary.

    Args:
        summary_data: The monthly summary data dict from the API
        contact_name: The client/contact name for the header

    Returns:
        PDF content as bytes
    """
    buffer = io.BytesIO()

    # Use landscape for the wide monthly table
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    elements = []
    styles = getSampleStyleSheet()

    # Title style
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.HexColor("#1e3a5f"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=20,
    )

    # Header
    property_name = summary_data.get("property_name", "Rental Property")
    year = summary_data.get("year", "")

    elements.append(Paragraph("Rental Property Summary", title_style))
    elements.append(Paragraph(f"{property_name} - {year}", subtitle_style))

    if contact_name:
        contact_style = ParagraphStyle(
            "Contact",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.grey,
            alignment=TA_CENTER,
            spaceAfter=16,
        )
        elements.append(Paragraph(f"Prepared for: {contact_name}", contact_style))

    elements.append(Spacer(1, 10))

    # Build the monthly table
    income = summary_data.get("income", {})
    expenses = summary_data.get("expenses", [])
    total_expenses = summary_data.get("total_expenses", {})
    net_cash_flow = summary_data.get("net_cash_flow", {})

    # Table header
    header_row = ["Category"] + [MONTH_LABELS[m] for m in MONTH_NAMES] + ["TOTAL"]

    # Table data
    data = [header_row]

    # Income row
    income_row = ["INCOME"]
    for month in MONTH_NAMES:
        income_row.append(_format_currency(_get_month_value(income, month)))
    income_row.append(_format_currency(_get_month_value(income, "total")))
    data.append(income_row)

    # Expenses header row
    data.append(["EXPENSES"] + [""] * 13)

    # Expense category rows
    for expense in expenses:
        cat_name = expense.get("category_name", "")
        values = expense.get("values", {})
        row = [f"  {cat_name}"]
        for month in MONTH_NAMES:
            row.append(_format_currency(_get_month_value(values, month)))
        row.append(_format_currency(_get_month_value(values, "total")))
        data.append(row)

    # Total expenses row
    total_exp_row = ["TOTAL EXPENSES"]
    for month in MONTH_NAMES:
        total_exp_row.append(_format_currency(_get_month_value(total_expenses, month)))
    total_exp_row.append(_format_currency(_get_month_value(total_expenses, "total")))
    data.append(total_exp_row)

    # Net cash flow row
    net_row = ["NET CASH FLOW"]
    for month in MONTH_NAMES:
        net_row.append(_format_currency(_get_month_value(net_cash_flow, month)))
    net_row.append(_format_currency(_get_month_value(net_cash_flow, "total")))
    data.append(net_row)

    # Calculate column widths
    # Category column is wider, month columns are equal, total column slightly wider
    category_width = 1.4 * inch
    month_width = 0.65 * inch
    total_width = 0.8 * inch
    col_widths = [category_width] + [month_width] * 12 + [total_width]

    table = Table(data, colWidths=col_widths)

    # Style the table
    table_style = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),

        # All cells
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("TOPPADDING", (0, 1), (-1, -1), 4),

        # Grid lines
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),

        # Income row (row 1)
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#ecfdf5")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#047857")),

        # Expenses header (row 2)
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 2), (0, 2), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (0, 2), colors.HexColor("#374151")),

        # Total column
        ("BACKGROUND", (-1, 1), (-1, -1), colors.HexColor("#f9fafb")),
        ("FONTNAME", (-1, 1), (-1, -1), "Helvetica-Bold"),
    ]

    # Total expenses row (second to last)
    total_exp_row_idx = len(data) - 2
    table_style.extend([
        ("BACKGROUND", (0, total_exp_row_idx), (-1, total_exp_row_idx), colors.HexColor("#fef2f2")),
        ("FONTNAME", (0, total_exp_row_idx), (-1, total_exp_row_idx), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, total_exp_row_idx), (-1, total_exp_row_idx), colors.HexColor("#b91c1c")),
    ])

    # Net cash flow row (last row)
    net_row_idx = len(data) - 1
    net_total = _get_month_value(net_cash_flow, "total")
    net_color = colors.HexColor("#047857") if net_total >= 0 else colors.HexColor("#b91c1c")
    table_style.extend([
        ("BACKGROUND", (0, net_row_idx), (-1, net_row_idx), colors.HexColor("#eff6ff")),
        ("FONTNAME", (0, net_row_idx), (-1, net_row_idx), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, net_row_idx), (-1, net_row_idx), net_color),
    ])

    table.setStyle(TableStyle(table_style))
    elements.append(table)

    # Summary section
    elements.append(Spacer(1, 20))

    summary_title = ParagraphStyle(
        "SummaryTitle",
        parent=styles["Heading3"],
        fontSize=12,
        textColor=colors.HexColor("#1e3a5f"),
        spaceAfter=10,
    )
    elements.append(Paragraph("Year Summary", summary_title))

    # Summary table
    income_total = _get_month_value(income, "total")
    expenses_total = _get_month_value(total_expenses, "total")
    net_total = _get_month_value(net_cash_flow, "total")

    summary_data_rows = [
        ["Total Income:", _format_currency(income_total)],
        ["Total Expenses:", _format_currency(expenses_total)],
        ["Net Cash Flow:", _format_currency(net_total)],
    ]

    summary_table = Table(summary_data_rows, colWidths=[1.5 * inch, 1.2 * inch])
    summary_style = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        # Income
        ("TEXTCOLOR", (1, 0), (1, 0), colors.HexColor("#047857")),
        # Expenses
        ("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor("#b91c1c")),
        # Net
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 2), (1, 2), net_color),
    ]
    summary_table.setStyle(TableStyle(summary_style))
    elements.append(summary_table)

    # Footer
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )
    from datetime import datetime
    generated_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    elements.append(Paragraph(f"Generated on {generated_date}", footer_style))

    # Build PDF
    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()

    return pdf_content
