"""PDF-grounded quiz helpers. The selected PDF is always the source of truth."""
import hashlib
import re


_QUESTION_STOP_WORDS = {
    "about", "after", "again", "also", "among", "because", "before", "being", "between",
    "could", "during", "every", "from", "having", "into", "itself", "other", "should",
    "their", "there", "these", "those", "through", "under", "using", "which", "while",
    "where", "when", "what", "with", "without", "would", "following", "process", "system",
    "occurs", "happens", "helps", "formed", "called", "known", "result", "results", "produces",
    "provides", "important", "different", "several", "specific", "particular", "usually", "mainly",
}


def fingerprint(question: str) -> str:
    return hashlib.sha256(question.strip().lower().encode()).hexdigest()


def context_from_chunks(chunks: list[dict], max_chars: int = 18000) -> str:
    output = []
    size = 0
    for chunk in chunks:
        text = (chunk.get("text") or "").strip()
        if not text:
            continue
        entry = f"[Page {chunk.get('page', '?')}] {text}"
        if size + len(entry) > max_chars:
            break
        output.append(entry)
        size += len(entry)
    return "\n\n".join(output)


def _sentences(text: str) -> list[str]:
    return [sentence.strip(" \t\r\n•-") for sentence in re.split(r"(?<=[.!?])\s+|[\n;]+", text)
            if len(sentence.strip()) >= 35]


def _terms(sentence: str) -> list[str]:
    terms = []
    for term in re.findall(r"\b[A-Za-z][A-Za-z-]{4,}\b", sentence):
        if term.casefold() not in _QUESTION_STOP_WORDS and term.casefold() not in {t.casefold() for t in terms}:
            terms.append(term.strip("-"))
    return terms


def fallback_questions(chunks: list[dict], count: int, excluded: set[str], difficulty: str = "medium") -> list[dict]:
    """Build quiz items only from facts and vocabulary present in the selected document."""
    facts = []
    vocabulary = []
    for chunk in chunks:
        source = chunk.get("source_label") or f"Page {chunk.get('page', '?')}"
        for sentence in _sentences(chunk.get("text") or ""):
            terms = _terms(sentence)
            if not terms:
                continue
            facts.append((source, sentence, terms))
            for term in terms:
                if term.casefold() not in {item.casefold() for item in vocabulary}:
                    vocabulary.append(term)

    result = []
    seen = set(excluded)
    blanks_per_sentence = {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2)
    for fact_index, (source, sentence, terms) in enumerate(facts):
        for term_index, answer in enumerate(terms[:blanks_per_sentence]):
            masked = re.sub(re.escape(answer), "_____", sentence, count=1, flags=re.IGNORECASE)
            distractors = [word for word in vocabulary if word.casefold() != answer.casefold()]
            # Rotate distractors so nearby questions do not all have the same choices.
            if distractors:
                offset = (fact_index + term_index) % len(distractors)
                distractors = (distractors[offset:] + distractors[:offset])[:3]
            use_mcq = (difficulty == "hard" or (difficulty == "medium" and (fact_index + term_index) % 2 == 0))
            if len(distractors) >= 3 and use_mcq:
                options = [answer, *distractors]
                rotation = (fact_index + term_index) % len(options)
                options = options[rotation:] + options[:rotation]
                question = f"Which term from {source} completes this sentence?\n“{masked}”"
                item_type = "mcq"
            else:
                options = []
                question = f"Complete this statement from {source}:\n“{masked}”"
                item_type = "fill_blank"
            if fingerprint(question) in seen:
                continue
            seen.add(fingerprint(question))
            result.append({
                "question": question,
                "type": item_type,
                "options": options,
                "correct_answer": answer,
                "explanation": f"Your {source} states: {sentence}",
                "topic": "Uploaded study notes",
                "concepts": [answer],
            })
            if len(result) >= count:
                return result

    # For short notes with too few extractable terms, still ask a unique passage-level question.
    for source, sentence, _ in facts:
        question = f"According to {source}, what is the key point in this sentence?\n“{sentence[:120]}”"
        if fingerprint(question) in seen:
            continue
        seen.add(fingerprint(question))
        result.append({"question": question, "type": "concept", "options": [],
                       "correct_answer": sentence[:500],
                       "explanation": f"This answer is taken directly from {source}.",
                       "topic": "Uploaded study notes", "concepts": []})
        if len(result) >= count:
            break
    return result