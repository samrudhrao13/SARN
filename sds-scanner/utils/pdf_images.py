import fitz  # PyMuPDF
import numpy as np
from PIL import Image
import io


def render_pages_to_images(pdf_path: str, dpi: int = 150) -> list:
    """
    Render each PDF page to a numpy RGB image array.
    Higher DPI = better quality for OpenCV detection but slower.
    150 DPI is a good balance for A4 SDS documents.
    """
    doc = fitz.open(pdf_path)
    images = []
    scale = dpi / 72.0
    mat = fitz.Matrix(scale, scale)

    for page in doc:
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        images.append(np.array(pil_img))

    doc.close()
    return images


def extract_embedded_images(pdf_path: str) -> list:
    """
    Extract raster images embedded directly in the PDF.
    Returns list of dicts with page, size, and numpy array.
    """
    doc = fitz.open(pdf_path)
    results = []

    for page_num, page in enumerate(doc):
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            try:
                base = doc.extract_image(xref)
                w, h = base["width"], base["height"]
                if w < 20 or h < 20:
                    continue
                arr = np.frombuffer(base["image"], dtype=np.uint8)
                results.append({
                    "page": page_num + 1,
                    "width": w,
                    "height": h,
                    "data": arr,
                    "ext": base["ext"],
                })
            except Exception:
                pass

    doc.close()
    return results
