"""PDF helpers built on PyMuPDF (pure pip — no system dependencies, no OCR)."""
from __future__ import annotations

import base64
import re
import fitz  # PyMuPDF

from .config import settings

_QNUM_RE = re.compile(r"Question Number\s*:\s*(\d+)")


def open_pdf(data: bytes) -> fitz.Document:
    return fitz.open(stream=data, filetype="pdf")


def page_question_numbers(doc: fitz.Document, page_index: int) -> list[int]:
    """Question numbers present in a page's text layer — reliable extraction anchors."""
    text = doc[page_index].get_text()
    return [int(n) for n in _QNUM_RE.findall(text)]


def render_page_png_b64(doc: fitz.Document, page_index: int, dpi: int | None = None) -> str:
    """Render a page to a base64-encoded PNG (no data-URI prefix)."""
    dpi = dpi or settings.RENDER_DPI
    scale = dpi / 72.0
    pix = doc[page_index].get_pixmap(matrix=fitz.Matrix(scale, scale))
    return base64.b64encode(pix.tobytes("png")).decode()
