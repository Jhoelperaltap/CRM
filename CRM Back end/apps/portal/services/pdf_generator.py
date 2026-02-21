"""
PDF generation service for tenant invoices and quotes.
Uses ReportLab to generate branded PDF documents.
"""

import io
from decimal import Decimal
from typing import TYPE_CHECKING

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

if TYPE_CHECKING:
    from apps.inventory.models import TenantInvoice, TenantQuote


def _format_currency(amount: Decimal) -> str:
    """Format a decimal as currency."""
    return f"${amount:,.2f}"


def _get_tenant_logo(tenant) -> Image | None:
    """Get tenant logo as ReportLab Image, or None if not available."""
    if tenant.image:
        try:
            # Return an Image object sized appropriately
            return Image(tenant.image.path, width=1.5 * inch, height=0.75 * inch)
        except Exception:
            pass
    return None


def _build_header_table(tenant, doc_type: str, doc_number: str, doc_date, due_date=None):
    """Build the header section with tenant info and document details."""
    # Left side: Tenant info
    tenant_info = []
    tenant_info.append(tenant.name)
    if tenant.billing_street:
        tenant_info.append(tenant.billing_street)
    city_state_zip = []
    if tenant.billing_city:
        city_state_zip.append(tenant.billing_city)
    if tenant.billing_state:
        city_state_zip.append(tenant.billing_state)
    if tenant.billing_zip:
        city_state_zip.append(tenant.billing_zip)
    if city_state_zip:
        tenant_info.append(", ".join(city_state_zip))
    if tenant.billing_country and tenant.billing_country != "United States":
        tenant_info.append(tenant.billing_country)
    if tenant.phone:
        tenant_info.append(f"Phone: {tenant.phone}")
    if tenant.email:
        tenant_info.append(f"Email: {tenant.email}")

    tenant_text = "<br/>".join(tenant_info)

    # Right side: Document info
    doc_info = []
    doc_info.append(f"<b>{doc_type}</b>")
    doc_info.append(f"<b>#{doc_number}</b>")
    doc_info.append("")
    doc_info.append(f"Date: {doc_date.strftime('%B %d, %Y')}")
    if due_date:
        doc_info.append(f"Due: {due_date.strftime('%B %d, %Y')}")

    doc_text = "<br/>".join(doc_info)

    styles = getSampleStyleSheet()
    tenant_style = ParagraphStyle(
        "TenantInfo",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )
    doc_style = ParagraphStyle(
        "DocInfo",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_RIGHT,
    )

    data = [[Paragraph(tenant_text, tenant_style), Paragraph(doc_text, doc_style)]]

    table = Table(data, colWidths=[4 * inch, 3 * inch])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    return table


def _build_customer_section(customer_name, customer_address, customer_email, customer_phone):
    """Build the 'Bill To' section."""
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        "BillToHeader",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=6,
    )

    info_style = ParagraphStyle(
        "BillToInfo",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )

    customer_lines = [customer_name]
    if customer_address:
        customer_lines.append(customer_address.replace("\n", "<br/>"))
    if customer_email:
        customer_lines.append(customer_email)
    if customer_phone:
        customer_lines.append(customer_phone)

    elements = [
        Paragraph("BILL TO:", header_style),
        Paragraph("<br/>".join(customer_lines), info_style),
    ]

    return elements


def _build_line_items_table(line_items):
    """Build the line items table."""
    # Header row
    data = [["Description", "Qty", "Unit Price", "Discount", "Total"]]

    for item in line_items:
        description = item.description
        if not description:
            if item.product:
                description = item.product.name
            elif item.service:
                description = item.service.name
            else:
                description = "-"

        discount_text = f"{item.discount_percent}%" if item.discount_percent else "-"

        data.append(
            [
                description,
                f"{item.quantity:g}",
                _format_currency(item.unit_price),
                discount_text,
                _format_currency(item.total),
            ]
        )

    table = Table(
        data,
        colWidths=[3.2 * inch, 0.7 * inch, 1.1 * inch, 0.9 * inch, 1.1 * inch],
    )

    table.setStyle(
        TableStyle(
            [
                # Header styling
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                # Body styling
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
                ("TOPPADDING", (0, 1), (-1, -1), 6),
                # Alignment
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                # Grid
                ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#2563eb")),
                ("LINEBELOW", (0, 1), (-1, -2), 0.5, colors.HexColor("#e5e7eb")),
                ("LINEBELOW", (0, -1), (-1, -1), 1, colors.HexColor("#2563eb")),
            ]
        )
    )

    return table


def _build_totals_section(subtotal, tax_percent, tax_amount, discount_amount, total, amount_paid=None, amount_due=None):
    """Build the totals section."""
    data = [
        ["Subtotal:", _format_currency(subtotal)],
    ]

    if discount_amount > 0:
        data.append(["Discount:", f"-{_format_currency(discount_amount)}"])

    if tax_percent > 0:
        data.append([f"Tax ({tax_percent}%):", _format_currency(tax_amount)])

    data.append(["Total:", _format_currency(total)])

    if amount_paid is not None and amount_paid > 0:
        data.append(["Amount Paid:", _format_currency(amount_paid)])

    if amount_due is not None:
        data.append(["Amount Due:", _format_currency(amount_due)])

    table = Table(data, colWidths=[1.5 * inch, 1.2 * inch])

    # Style based on whether there's an amount due
    row_styles = [
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]

    # Bold the total row
    total_row_index = len(data) - 1
    if amount_due is not None:
        total_row_index = len(data) - 3 if amount_paid and amount_paid > 0 else len(data) - 2

    row_styles.append(("FONTNAME", (0, total_row_index), (-1, total_row_index), "Helvetica-Bold"))

    # Bold the amount due row if present
    if amount_due is not None:
        row_styles.append(("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"))
        row_styles.append(("TEXTCOLOR", (0, -1), (-1, -1), colors.HexColor("#2563eb")))

    table.setStyle(TableStyle(row_styles))

    return table


def _build_notes_section(notes, terms_conditions):
    """Build notes and terms section."""
    styles = getSampleStyleSheet()
    elements = []

    note_header = ParagraphStyle(
        "NoteHeader",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.grey,
        spaceBefore=12,
        spaceAfter=4,
    )

    note_body = ParagraphStyle(
        "NoteBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
    )

    if notes:
        elements.append(Paragraph("NOTES:", note_header))
        elements.append(Paragraph(notes.replace("\n", "<br/>"), note_body))

    if terms_conditions:
        elements.append(Paragraph("TERMS & CONDITIONS:", note_header))
        elements.append(Paragraph(terms_conditions.replace("\n", "<br/>"), note_body))

    return elements


def generate_invoice_pdf(invoice: "TenantInvoice") -> bytes:
    """
    Generate a PDF for a tenant invoice.

    Args:
        invoice: The TenantInvoice instance

    Returns:
        PDF content as bytes
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    elements = []
    tenant = invoice.tenant

    # Logo (if available)
    logo = _get_tenant_logo(tenant)
    if logo:
        elements.append(logo)
        elements.append(Spacer(1, 12))

    # Header with tenant info and invoice details
    header = _build_header_table(
        tenant,
        "INVOICE",
        invoice.invoice_number,
        invoice.invoice_date,
        invoice.due_date,
    )
    elements.append(header)
    elements.append(Spacer(1, 24))

    # Bill To section
    customer_section = _build_customer_section(
        invoice.customer_name,
        invoice.customer_address,
        invoice.customer_email,
        invoice.customer_phone,
    )
    elements.extend(customer_section)
    elements.append(Spacer(1, 20))

    # Line items
    if invoice.line_items.exists():
        items_table = _build_line_items_table(invoice.line_items.all())
        elements.append(items_table)
        elements.append(Spacer(1, 12))

    # Totals (right-aligned)
    totals = _build_totals_section(
        invoice.subtotal,
        invoice.tax_percent,
        invoice.tax_amount,
        invoice.discount_amount,
        invoice.total,
        invoice.amount_paid,
        invoice.amount_due,
    )

    # Create a table to right-align the totals
    totals_wrapper = Table([[totals]], colWidths=[7 * inch])
    totals_wrapper.setStyle(TableStyle([("ALIGN", (0, 0), (0, 0), "RIGHT")]))
    elements.append(totals_wrapper)

    # Notes and terms
    notes_elements = _build_notes_section(invoice.notes, invoice.terms_conditions)
    elements.extend(notes_elements)

    # Build PDF
    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()

    return pdf_content


def generate_quote_pdf(quote: "TenantQuote") -> bytes:
    """
    Generate a PDF for a tenant quote.

    Args:
        quote: The TenantQuote instance

    Returns:
        PDF content as bytes
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    elements = []
    tenant = quote.tenant

    # Logo (if available)
    logo = _get_tenant_logo(tenant)
    if logo:
        elements.append(logo)
        elements.append(Spacer(1, 12))

    # Header with tenant info and quote details
    header = _build_header_table(
        tenant,
        "QUOTE / ESTIMATE",
        quote.quote_number,
        quote.quote_date,
        quote.valid_until,
    )
    elements.append(header)
    elements.append(Spacer(1, 24))

    # Bill To section
    customer_section = _build_customer_section(
        quote.customer_name,
        quote.customer_address,
        quote.customer_email,
        quote.customer_phone,
    )
    elements.extend(customer_section)
    elements.append(Spacer(1, 20))

    # Line items
    if quote.line_items.exists():
        items_table = _build_line_items_table(quote.line_items.all())
        elements.append(items_table)
        elements.append(Spacer(1, 12))

    # Totals (right-aligned)
    totals = _build_totals_section(
        quote.subtotal,
        quote.tax_percent,
        quote.tax_amount,
        quote.discount_amount,
        quote.total,
    )

    # Create a table to right-align the totals
    totals_wrapper = Table([[totals]], colWidths=[7 * inch])
    totals_wrapper.setStyle(TableStyle([("ALIGN", (0, 0), (0, 0), "RIGHT")]))
    elements.append(totals_wrapper)

    # Valid until notice
    if quote.valid_until:
        styles = getSampleStyleSheet()
        validity_style = ParagraphStyle(
            "Validity",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#2563eb"),
            spaceBefore=16,
            alignment=TA_CENTER,
        )
        elements.append(
            Paragraph(
                f"This quote is valid until {quote.valid_until.strftime('%B %d, %Y')}.",
                validity_style,
            )
        )

    # Notes and terms
    notes_elements = _build_notes_section(quote.notes, quote.terms_conditions)
    elements.extend(notes_elements)

    # Build PDF
    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()

    return pdf_content
