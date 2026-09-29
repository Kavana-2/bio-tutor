"""OpenAI-backed, Biology-restricted example generation."""
import os


BIOLOGY_SYSTEM = """You are BioTutor's domain-controlled Biology tutor.
Only answer questions about Biology, especially Photosynthesis, the Human Digestive System,
the Human Respiratory System, and the supplied study notes. Never act as a general chatbot.
If a request is unrelated to Biology, politely say that BioTutor is restricted to Biology topics.
For explanations, stay faithful to the supplied answer and notes. Never invent facts not supported
by the notes when the notes are the requested source. Use plain, encouraging student-friendly language.
"""


def is_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY"))


async def _complete_openai(prompt: str) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": BIOLOGY_SYSTEM}, {"role": "user", "content": prompt}],
    )
    return (response.choices[0].message.content or "").strip()


async def _complete_emergent(prompt: str, session_id: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=session_id,
                   system_message=BIOLOGY_SYSTEM).with_model("openai", "gpt-5.4")
    parts = []
    async for event in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(event, TextDelta):
            parts.append(event.content)
        elif isinstance(event, StreamDone):
            break
    return "".join(parts).strip()


async def _complete(prompt: str, session_id: str) -> str:
    # Own OpenAI key takes priority (local runs); Emergent universal key is the fallback.
    if os.environ.get("OPENAI_API_KEY"):
        return await _complete_openai(prompt)
    if os.environ.get("EMERGENT_LLM_KEY"):
        return await _complete_emergent(prompt, session_id)
    raise RuntimeError("Set OPENAI_API_KEY (or EMERGENT_LLM_KEY) in backend/.env to enable AI-generated examples")


async def generate_example(question: str, previous_answer: str, pdf_context: str, request: str) -> str:
    """Generate an example from Biology material, using OpenAI only when configured."""
    material = (pdf_context or previous_answer).strip()
    if not is_configured():
        excerpt = " ".join(material.split())[:500]
        if not excerpt:
            excerpt = previous_answer.strip()[:500]
        return f"For example, consider this Biology case: {excerpt} This illustrates {question}."

    prompt = f"""The student asked: {question}
Grounded answer from the local Biology system: {previous_answer}
Their uploaded Biology notes, when selected: {pdf_context[:12000]}
Student request: {request}

Give exactly one concrete, student-friendly Biology example that illustrates the answer.
Use only facts supported by the answer or notes. Keep it concise and do not add unrelated facts.
Return only the example, with no preamble."""
    return await _complete(prompt, f"bio-example-{abs(hash(question))}")