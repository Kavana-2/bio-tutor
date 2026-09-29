import asyncio

from services import openai_service


def test_example_uses_local_grounded_fallback_when_no_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("EMERGENT_LLM_KEY", raising=False)

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("OpenAI must not be called when no key is configured")

    monkeypatch.setattr(openai_service, "_complete", fail_if_called)
    result = asyncio.run(openai_service.generate_example(
        "What is photosynthesis?", "Plants use light to make glucose.", "", "Give an example"))

    assert "Plants use light to make glucose" in result
    assert "photosynthesis" in result.lower()


def test_example_uses_configured_openai(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "unit-test-placeholder")
    calls = []

    async def fake_complete(prompt, session_id):
        calls.append((prompt, session_id))
        return "A green plant in sunlight makes glucose from carbon dioxide and water."

    monkeypatch.setattr(openai_service, "_complete", fake_complete)
    result = asyncio.run(openai_service.generate_example(
        "What is photosynthesis?", "Plants use light to make glucose.", "Notes about chloroplasts", "Give an example"))

    assert "green plant" in result
    assert len(calls) == 1
    assert "chloroplasts" in calls[0][0]
    assert calls[0][1].startswith("bio-example-")