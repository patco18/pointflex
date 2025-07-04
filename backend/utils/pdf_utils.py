"""
PDF Generation Utilities using ReportLab
"""
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from datetime import datetime

def build_pdf_document(buffer: BytesIO, story: list, title: str = "Rapport", author: str = "PointFlex SaaS") -> BytesIO:
    """
    Builds a PDF document with the given story elements.
    Includes a basic header and page numbers.
    """
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=1*inch, bottomMargin=1*inch,
                            title=title, author=author)

    def header_footer(canvas, doc_template):
        canvas.saveState()
        styles = getSampleStyleSheet()

        # Header
        header_text = title
        p_header = Paragraph(header_text, styles['Normal'])
        w_header, h_header = p_header.wrapOn(canvas, doc_template.width, doc_template.topMargin)
        p_header.drawOn(canvas, doc_template.leftMargin, doc_template.height + doc_template.topMargin - h_header - 0.1*inch)

        # Footer - Page Number
        page_num_text = f"Page {doc_template.page}"
        p_footer = Paragraph(page_num_text, styles['Normal'])
        w_footer, h_footer = p_footer.wrapOn(canvas, doc_template.width, doc_template.bottomMargin)
        p_footer.drawOn(canvas, doc_template.leftMargin, h_footer - 0.1*inch) # Draw at bottom

        canvas.restoreState()

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    buffer.seek(0)
    return buffer

def create_styled_table(data: list, col_widths: list | None = None, style_commands: list | None = None) -> Table:
    """
    Creates a ReportLab Table with default and custom styles.
    """
    table = Table(data, colWidths=col_widths)

    default_styles = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        # Header row style
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        # Alternating row colors for data rows
        # ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
    ]

    # Apply default styles
    table_style = TableStyle(default_styles)

    # Apply custom styles if provided
    if style_commands:
        for cmd in style_commands:
            table_style.add(*cmd)

    table.setStyle(table_style)
    return table

def get_report_styles() -> dict:
    """Returns a dictionary of commonly used ParagraphStyles."""
    styles = getSampleStyleSheet()
    custom_styles = {
        'Title': ParagraphStyle(name='Title', parent=styles['h1'], alignment=1, spaceAfter=0.2*inch),
        'SubTitle': ParagraphStyle(name='SubTitle', parent=styles['h2'], alignment=1, spaceAfter=0.1*inch),
        'ReportInfo': ParagraphStyle(name='ReportInfo', parent=styles['Normal'], spaceBefore=0.1*inch, spaceAfter=0.2*inch),
        'NormalCentered': ParagraphStyle(name='NormalCentered', parent=styles['Normal'], alignment=1),
        'SmallText': ParagraphStyle(name='SmallText', parent=styles['Normal'], fontSize=7, leading=9),
    }
    # Combine standard styles with custom ones for easy access
    final_styles = {k: v for k, v in styles.items()}
    final_styles.update(custom_styles)
    return final_styles

def generate_report_title_elements(title_str:str, period_str:str, company_name:str | None = None) -> list:
    """Generates standard title, subtitle, and info Paragraphs for a report."""
    styles = get_report_styles()
    elements = []

    if company_name:
        elements.append(Paragraph(company_name, styles['Title']))
        elements.append(Paragraph(title_str, styles['SubTitle']))
    else:
        elements.append(Paragraph(title_str, styles['Title']))

    elements.append(Paragraph(f"Période: {period_str}", styles['ReportInfo']))
    elements.append(Paragraph(f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", styles['ReportInfo']))
    elements.append(Spacer(1, 0.2*inch))
    return elements

if __name__ == '__main__':
    # Example Usage (for testing this module directly)
    buffer = BytesIO()
    styles = get_report_styles()

    story = generate_report_title_elements(
        title_str="Exemple de Rapport",
        period_str="01/01/2023 - 31/01/2023",
        company_name="Mon Entreprise Fantastique"
    )

    story.append(Paragraph("Ceci est un paragraphe d'introduction.", styles['Normal']))
    story.append(Spacer(1, 0.1*inch))

    data = [
        ["ID", "Nom", "Valeur"],
        ["1", Paragraph("Produit A très long nom qui devrait wrapper correctement", styles['SmallText']), "100.00"],
        ["2", "Produit B", "150.50"],
        ["3", "Produit C", "75.25"],
        ["", "Total", "325.75"]
    ]

    col_widths = [0.5*inch, 2.5*inch, 1*inch]

    # Example custom style commands
    custom_table_styles = [
        ('ALIGN', (2, 1), (2, -1), 'RIGHT'), # Align 'Valeur' column to the right
        ('SPAN', (-2, -1), (-1, -1)), # Span 'Total' text
        ('ALIGN', (-2, -1), (-2, -1), 'RIGHT'), # Align 'Total' text to right
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'), # Bold last row
    ]

    example_table = create_styled_table(data, col_widths=col_widths, style_commands=custom_table_styles)
    story.append(example_table)
    story.append(PageBreak())
    story.append(Paragraph("Ceci est sur la deuxième page.", styles['Normal']))

    # Build the PDF with header/footer
    build_pdf_document(buffer, story, title="Rapport d'Exemple", author="Test Auteur")

    with open("example_report.pdf", "wb") as f:
        f.write(buffer.getvalue())
    print("Example report 'example_report.pdf' generated.")
