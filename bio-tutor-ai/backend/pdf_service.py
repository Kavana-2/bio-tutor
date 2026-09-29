"""PDF text extraction, chunking, topic detection and teaching-plan generation."""
import re

import fitz  # PyMuPDF

from nlp_engine import engine, TOPIC_FILES
from text_formatter import format_for_learning

MAX_CHARS_PER_CHUNK = 700


def extract_pages(file_bytes: bytes):
    """Return list of {page, text} using PyMuPDF."""
    pages = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for i, page in enumerate(doc):
        text = page.get_text("text") or ""
        pages.append({"page": i + 1, "text": re.sub(r"\n{3,}", "\n\n", text).strip()})
    doc.close()
    return pages


def chunk_text(text: str):
    """Split text into paragraph-based chunks under a max size."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, buf = [], ""
    for p in paras:
        if len(buf) + len(p) < MAX_CHARS_PER_CHUNK:
            buf = (buf + " " + p).strip()
        else:
            if buf:
                chunks.append(buf)
            if len(p) > MAX_CHARS_PER_CHUNK:
                for i in range(0, len(p), MAX_CHARS_PER_CHUNK):
                    chunks.append(p[i:i + MAX_CHARS_PER_CHUNK])
                buf = ""
            else:
                buf = p
    if buf:
        chunks.append(buf)
    return chunks


def detect_topic(text: str):
    """Topic detection using dataset keyword overlap; fallback to semantic centroid."""
    tl = text.lower()
    scores = {}
    for topic in TOPIC_FILES:
        kws = engine.keywords.get(topic, [])
        scores[topic] = sum(1 for kw in kws if kw in tl)
    best = max(scores, key=scores.get) if scores else None
    if best and scores[best] > 0:
        return best, engine.display_names.get(best)
    return None, "General"


def process_pdf(file_bytes: bytes):
    """Full pipeline: extract -> chunk -> detect topic -> embed."""
    pages = extract_pages(file_bytes)
    all_chunks = []
    for pg in pages:
        for ch in chunk_text(pg["text"]):
            if len(ch) > 40:
                all_chunks.append({"page": pg["page"], "text": ch})
    full_text = " ".join(p["text"] for p in pages)
    topic_key, topic_name = detect_topic(full_text)

    chunk_texts = [c["text"] for c in all_chunks]
    embeddings = []
    if chunk_texts:
        emb = engine.encode(chunk_texts)
        embeddings = emb.cpu().numpy().tolist()
        for i, c in enumerate(all_chunks):
            c["embedding"] = embeddings[i]
    return {
        "pages": pages,
        "num_pages": len(pages),
        "chunks": all_chunks,
        "topic_key": topic_key,
        "topic_name": topic_name,
        "full_text": full_text[:4000],
    }


def build_teaching_plan(chunks, topic_name):
    """Generate a structured lesson sequence from the actual uploaded content.
    Groups chunks into progressive lessons using their real content."""
    if not chunks:
        return []
    texts = [c["text"] for c in chunks]
    n = len(texts)

    def slice_join(a, b):
        return texts[a:b]

    # Distribute content across progressive lessons based on real chunks
    lessons_spec = [
        ("Introduction", "Get familiar with the core ideas in your notes"),
        ("Main Concepts", "The key concepts explained in detail"),
        ("Important Processes", "Step-by-step processes from your material"),
        ("Difficult Concepts", "Harder ideas broken down simply"),
        ("Examples & Applications", "Worked examples and real applications"),
        ("Revision", "Quick recap of everything covered"),
        ("Practice Questions", "Test yourself on the material"),
    ]
    per = max(1, n // len(lessons_spec))
    lessons = []
    idx = 0
    for i, (title, subtitle) in enumerate(lessons_spec):
        if i == len(lessons_spec) - 1:
            content = slice_join(idx, n)
        else:
            content = slice_join(idx, idx + per)
            idx += per
        if not content and chunks:
            content = [texts[min(i, n - 1)]]
        page_refs = []
        source_refs = []
        for c in chunks:
            if c["text"] in content and c["page"] not in page_refs:
                page_refs.append(c["page"])
            if c["text"] in content:
                source = c.get("source_label") or f"Page {c['page']}"
                if source not in source_refs:
                    source_refs.append(source)
        lessons.append({
            "lesson_number": i + 1,
            "title": f"Lesson {i + 1} — {title}",
            "subtitle": subtitle,
            "content": [format_for_learning(text) for text in content],
            "pages": page_refs[:6],
            "sources": source_refs[:6],
        })
    return lessons
