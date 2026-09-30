from text_formatter import format_for_learning


def test_reflows_broken_words_and_presents_sentences_in_sections():
    source = (
        "Photo-\nsynthesis uses light to create chemical energy.\n"
        "Chlorophyll absorbs sunlight in the chloroplasts."
    )
    formatted = format_for_learning(source)

    assert "photosynthesis" in formatted.lower()
    assert "Key statement from your notes:" in formatted
    assert "Key ideas:" in formatted
    assert "• Chlorophyll absorbs sunlight in the chloroplasts." in formatted
    assert "Photo-\nsynthesis" not in formatted


def test_formats_ordered_process_as_steps_without_rewriting_the_facts():
    source = "First, light is absorbed. Next, ATP is produced. Finally, glucose is made."
    formatted = format_for_learning(source)

    assert formatted.startswith("Steps from your notes:")
    assert "1. First, light is absorbed." in formatted
    assert "2. Next, ATP is produced." in formatted
    assert "3. Finally, glucose is made." in formatted


def test_single_sentence_is_not_expanded_or_paraphrased():
    source = "Chlorophyll absorbs sunlight."
    assert format_for_learning(source) == source


def test_keeps_multiple_concepts_in_point_form_for_easy_reading():
    source = (
        "Photosynthesis happens in chloroplasts. It converts light energy into chemical energy. "
        "The process has two stages. Light reactions begin when chlorophyll absorbs sunlight."
    )
    formatted = format_for_learning(source)

    assert "Key ideas:" in formatted
    assert "•" in formatted
    assert "Photosynthesis happens in chloroplasts." in formatted
