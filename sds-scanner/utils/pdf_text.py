import pdfplumber


def extract_text(pdf_path: str) -> str:
    """Extract all text from a PDF using pdfplumber."""
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def is_scanned_pdf(text: str, threshold: int = 200) -> bool:
    """Return True if the PDF appears to be image-based (scanned)."""
    return len(text.strip()) < threshold
