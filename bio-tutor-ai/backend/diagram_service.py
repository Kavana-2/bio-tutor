"""Diagram Reading: OCR labelled diagram images (Tesseract) and explain each label
using the local Biology NLP engine. No external APIs are used.
"""
import io
import re
import shutil
from pathlib import Path

import pytesseract
from PIL import Image, ImageOps, ImageFilter

from nlp_engine import engine

# common OCR noise / stop words to drop from candidate labels
STOP = {"the", "and", "for", "with", "from", "into", "figure", "fig", "diagram",
        "label", "labelled", "labeled", "structure", "human", "system", "cross",
        "section", "view", "part", "parts", "of", "in", "to", "a", "an"}


def _preprocess(img: Image.Image) -> Image.Image:
    img = img.convert("L")               # grayscale
    img = ImageOps.autocontrast(img)
    if max(img.size) < 1000:             # upscale small images for better OCR
        scale = 1000 / max(img.size)
        img = img.resize((int(img.width * scale), int(img.height * scale)))
    return img.filter(ImageFilter.SHARPEN)


def _missing_tesseract_message():
    return (
        "Image OCR requires Tesseract OCR. Install Tesseract and add it to PATH, "
        "then restart the backend to enable diagram and image reading."
    )


def _tesseract_path():
    executable = shutil.which("tesseract")
    if executable:
        return executable
    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            return candidate
    return None


def extract_labels(image_bytes: bytes):
    """OCR the image and return de-duplicated candidate label phrases."""
    if not _tesseract_path():
        return []
    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(_preprocess(img))
    except Exception:
        return []

    raw_lines = re.split(r"[\n,;|/]+", text)
    labels, seen = [], set()
    for line in raw_lines:
        line = re.sub(r"[^A-Za-z\s-]", " ", line).strip()
        line = re.sub(r"\s+", " ", line)
        if not line:
            continue
        words = [w for w in line.split() if len(w) > 2 and w.lower() not in STOP]
        if not words:
            continue
        phrase = " ".join(words[:3])     # labels are short phrases
        key = phrase.lower()
        if 2 < len(phrase) <= 40 and key not in seen:
            seen.add(key)
            labels.append(phrase)
    return labels[:20]


def explain_diagram(image_bytes: bytes):
    """Extract labels and explain the ones that fall within the Biology domain."""
    if not _tesseract_path():
        return {
            "detected_labels": [],
            "explained_labels": [],
            "overall_topic": None,
            "recognized_count": 0,
            "message": _missing_tesseract_message(),
        }

    engine.load()
    labels = extract_labels(image_bytes)
    explained, topic_counts = [], {}
    for label in labels:
        result = engine.answer(label)
        if result.get("in_domain") and result.get("source") not in ("domain_restriction", "low_confidence"):
            explained.append({
                "label": label,
                "explanation": result["answer"],
                "topic": result.get("topic"),
                "confidence": result.get("confidence"),
            })
            tk = result.get("topic_key")
            if tk:
                topic_counts[tk] = topic_counts.get(tk, 0) + 1
    overall_topic = max(topic_counts, key=topic_counts.get) if topic_counts else None
    return {
        "detected_labels": labels,
        "explained_labels": explained,
        "overall_topic": engine.display_names.get(overall_topic) if overall_topic else None,
        "recognized_count": len(explained),
        "message": None,
    }
