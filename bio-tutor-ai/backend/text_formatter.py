"""Offline cleanup and readable formatting for extracted Biology study text.

This formatter only restructures the source wording; it does not add facts or use an API.
"""
import re


_STEP_START = re.compile(r"^(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|next|then|after that|finally|lastly)\b", re.I)
_BULLET_START = re.compile(r"^(?:[-*•]|\d+[.)])\s+")


def _reflow(text: str) -> str:
    text = (text or "").replace("\u00ad", "")
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)
    lines = [re.sub(r"[\t ]+", " ", line).strip() for line in text.splitlines()]
    output = []
    paragraph = []

    def flush_paragraph():
        if paragraph:
            output.append(" ".join(paragraph))
            paragraph.clear()

    for line in lines:
        if not line:
            flush_paragraph()
            continue
        if _BULLET_START.match(line) or line.startswith("|"):
            flush_paragraph()
            output.append(line)
        else:
            paragraph.append(line)
    flush_paragraph()
    return "\n\n".join(output).strip()


def _split_sentences(text: str) -> list[str]:
    sentences = []
    for paragraph in text.split("\n\n"):
        if _BULLET_START.match(paragraph) or paragraph.startswith("|"):
            sentences.append(paragraph)
            continue
        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"“'(])", paragraph)
        for part in parts:
            part = re.sub(r"\s+([,.;:!?])", r"\1", part).strip()
            if part:
                sentences.append(part)
    return sentences


def format_for_learning(text: str) -> str:
    """Reflow extraction artifacts and lay out source sentences for easier reading."""
    normalized = _reflow(text)
    if not normalized:
        return ""

    paragraphs = [part.strip() for part in normalized.split("\n\n") if part.strip()]
    if len(paragraphs) > 1:
        sections = []
        for index, paragraph in enumerate(paragraphs, 1):
            sentences = _split_sentences(paragraph)
            if len(sentences) <= 1:
                sections.append(f"Point {index}:\n{paragraph}")
            else:
                first = sentences[0]
                rest = sentences[1:]
                lines = [f"• {sentence}" for sentence in rest] if rest else []
                body = first if not lines else first + "\n" + "\n".join(lines)
                sections.append(f"Point {index}:\n{body}")
        return "\n\n".join(sections)

    sentences = _split_sentences(normalized)
    if len(sentences) <= 1:
        return normalized

    step_indices = [index for index, sentence in enumerate(sentences) if _STEP_START.match(sentence)]
    if len(step_indices) >= 2:
        first_step = step_indices[0]
        intro = sentences[:first_step]
        steps = sentences[first_step:]
        sections = []
        if intro:
            sections.append("Key statement from your notes:\n" + " ".join(intro))
        sections.append("Steps from your notes:\n" + "\n".join(
            f"{index}. {sentence}" for index, sentence in enumerate(steps, 1)
        ))
        return "\n\n".join(sections)

    return "Key statement from your notes:\n" + sentences[0] + "\n\nKey ideas:\n" + "\n".join(
        f"• {sentence}" for sentence in sentences[1:]
    )
