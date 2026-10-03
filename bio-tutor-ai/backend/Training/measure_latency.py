"""Simple runtime measurement utilities for the existing BioTutor AI retrieval pipeline.

This file does not modify the application behavior. It only measures the current,
real operations used by the system: model loading, query embedding, retrieval, and
PDF processing. Timing is done with time.perf_counter().
"""

import json
import sys
import time
from pathlib import Path

from sentence_transformers import SentenceTransformer, util

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from nlp_engine import BiologyNLPEngine
from pdf_service import process_pdf
from preprocessing import load_dataset, split_data

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BACKEND_DIR / "dataset"
MODEL_DIR = BACKEND_DIR / "Model"


def measure_model_loading(model_name="all-MiniLM-L6-v2"):
    """Measure the base model load time from the actual application dependency."""
    start = time.perf_counter()
    model = SentenceTransformer(model_name)
    elapsed = time.perf_counter() - start
    return model, elapsed


def measure_query_embedding(model, query: str):
    """Measure embedding time for a single query using the same encode call path."""
    start = time.perf_counter()
    emb = model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
    return emb, time.perf_counter() - start


def measure_retrieval(model, query: str, corpus_texts, corpus_emb, top_k=3):
    """Measure semantic retrieval time using the current implementation pattern."""
    start = time.perf_counter()
    q = model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
    hits = util.semantic_search(q, corpus_emb, top_k=top_k)[0]
    elapsed = time.perf_counter() - start
    return hits, elapsed


def measure_total_processing(model, query: str, corpus_texts, corpus_emb):
    """Measure whole retrieval pipeline from embedding to retrieval results."""
    start = time.perf_counter()
    q = model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
    hits = util.semantic_search(q, corpus_emb, top_k=3)[0]
    elapsed = time.perf_counter() - start
    return hits, elapsed


def measure_pdf_processing(file_path: str):
    """Measure PDF extraction + chunking + embedding using the live PDF pipeline."""
    data = Path(file_path).read_bytes()
    start = time.perf_counter()
    processed = process_pdf(data)
    elapsed = time.perf_counter() - start
    return processed, elapsed


def create_sample_pdf(path: Path):
    """Create a minimal sample PDF to validate the actual PDF processing pipeline."""
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Photosynthesis is the process by which plants make glucose from carbon dioxide and water using light energy.\n")
    page.insert_text((72, 120), "The chloroplast contains chlorophyll, which captures light energy for the light-dependent reactions.\n")
    page.insert_text((72, 168), "The Calvin cycle uses ATP and NADPH to build glucose.\n")
    doc.save(path)
    doc.close()


def build_corpus_for_eval():
    """Prepare the same corpus used by the biology retrieval engine."""
    _, qa = load_dataset()
    texts = [item["answer"] for item in qa]
    model, _ = measure_model_loading()
    emb = model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)
    return model, texts, emb


def main():
    print("Loading evaluation model...")
    model, model_loading_time = measure_model_loading()
    print(f"Model loading time: {model_loading_time:.6f} seconds")

    _, qa = load_dataset()
    test_questions = [item["question"] for item in qa[:5]]
    texts = [item["answer"] for item in qa]
    corpus_emb = model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)

    for idx, q in enumerate(test_questions, 1):
        emb, embed_time = measure_query_embedding(model, q)
        hits, retrieval_time = measure_retrieval(model, q, texts, corpus_emb, top_k=3)
        _, total_time = measure_total_processing(model, q, texts, corpus_emb)
        print(f"Query {idx}: {q[:80]}...")
        print(f"  Query embedding time: {embed_time:.6f} seconds")
        print(f"  Retrieval time: {retrieval_time:.6f} seconds")
        print(f"  Total retrieval time: {total_time:.6f} seconds")
        print(f"  Top-1 hit: {hits[0]['corpus_id'] if hits else 'none'}")

    pdf_path = BACKEND_DIR / "uploads" / "sample.pdf"
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if pdf_path.exists():
        processed, pdf_time = measure_pdf_processing(str(pdf_path))
        print(f"PDF processing time: {pdf_time:.6f} seconds")
        print(f"PDF chunks: {len(processed.get('chunks', []))}")
    else:
        create_sample_pdf(pdf_path)
        processed, pdf_time = measure_pdf_processing(str(pdf_path))
        print(f"PDF processing time: {pdf_time:.6f} seconds")
        print(f"PDF chunks: {len(processed.get('chunks', []))}")


if __name__ == "__main__":
    main()
