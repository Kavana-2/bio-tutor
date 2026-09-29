"""Precompute and cache embeddings for the entire Biology knowledge base.
Uses the fine-tuned model in Model/trained_model if present, otherwise the base
all-MiniLM-L6-v2. Saves embeddings to Model/embeddings/corpus_embeddings.pkl so
the API can load them instantly at startup.

Usage:
    python Training/build_embeddings.py
"""
import pickle
from pathlib import Path

from sentence_transformers import SentenceTransformer

from preprocessing import load_dataset

BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BACKEND_DIR / "Model"
TRAINED_DIR = MODEL_DIR / "trained_model"
EMB_DIR = MODEL_DIR / "embeddings"


def main():
    EMB_DIR.mkdir(parents=True, exist_ok=True)
    model_path = str(TRAINED_DIR) if TRAINED_DIR.exists() else "all-MiniLM-L6-v2"
    print(f"Loading model: {model_path}")
    model = SentenceTransformer(model_path)

    passages, qa = load_dataset()
    texts = []
    for p in passages:
        texts.append(p["title"] + ". " + p["text"])
    for x in qa:
        texts.append(x["question"] + " " + x["answer"])

    emb = model.encode(texts, convert_to_tensor=True, normalize_embeddings=True,
                       show_progress_bar=True)
    with open(EMB_DIR / "corpus_embeddings.pkl", "wb") as f:
        pickle.dump({"n": len(texts), "emb": emb}, f)
    print(f"Saved {len(texts)} embeddings to {EMB_DIR / 'corpus_embeddings.pkl'}")


if __name__ == "__main__":
    main()
