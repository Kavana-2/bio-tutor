from services.quiz_service import fallback_questions, fingerprint


def test_generates_questions_from_pdf_sentences_only():
    chunks = [
        {
            "page": 1,
            "source_label": "Page 1",
            "text": (
                "Photosynthesis converts light energy into chemical energy in plants. "
                "Chlorophyll absorbs sunlight inside the chloroplasts."
            ),
        },
        {
            "page": 2,
            "source_label": "Page 2",
            "text": "The Calvin cycle fixes carbon dioxide in the stroma to produce glucose.",
        },
    ]

    questions = fallback_questions(chunks, count=5, excluded=set(), difficulty="medium")

    assert len(questions) == 5
    assert {item["type"] for item in questions} >= {"mcq", "fill_blank"}
    source_text = " ".join(chunk["text"] for chunk in chunks).casefold()
    for item in questions:
        assert item["type"] in {"mcq", "fill_blank", "concept"}
        assert item["correct_answer"].casefold() in source_text
        assert "Page " in item["question"]
        if item["type"] == "mcq":
            assert len(item["options"]) == 4
            assert item["correct_answer"] in item["options"]


def test_generator_respects_excluded_question_fingerprints():
    chunks = [{"page": 1, "text": "Chlorophyll absorbs sunlight inside the chloroplasts."}]
    first = fallback_questions(chunks, count=1, excluded=set())
    assert first

    next_questions = fallback_questions(
        chunks, count=5, excluded={fingerprint(first[0]["question"])})
    assert next_questions
    assert first[0]["question"] not in {item["question"] for item in next_questions}