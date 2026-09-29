"""Data loading, cleaning and train/val/test splitting for the Biology dataset.
Prevents data leakage by splitting Q&A pairs before any embedding is computed.
"""
import json
import random
import re
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BACKEND_DIR / "dataset"
SEED = 42

TOPIC_FILES = {
    "photosynthesis": "photosynthesis.json",
    "digestion": "digestion.json",
    "respiratory": "respiratory.json",
}


def clean_text(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def load_dataset():
    """Load all three topic files and return passages and QA lists."""
    passages, qa = [], []
    for topic, fname in TOPIC_FILES.items():
        data = json.loads((DATASET_DIR / fname).read_text())
        for p in data.get("passages", []):
            passages.append({"topic": topic, "title": clean_text(p["title"]),
                             "text": clean_text(p["text"]), "concept": p.get("concept", "")})
        for item in data.get("qa", []):
            qa.append({"topic": topic, "question": clean_text(item["question"]),
                       "answer": clean_text(item["answer"]), "concepts": item.get("concepts", []),
                       "type": item.get("type", ""), "difficulty": item.get("difficulty", "beginner")})
    return passages, qa


def split_data(items, ratios=(0.7, 0.15, 0.15)):
    """Reproducible train/val/test split with no leakage (disjoint items)."""
    random.Random(SEED).shuffle(items)
    n = len(items)
    n_train = int(n * ratios[0])
    n_val = int(n * ratios[1])
    return {
        "train": items[:n_train],
        "val": items[n_train:n_train + n_val],
        "test": items[n_train + n_val:],
    }


if __name__ == "__main__":
    passages, qa = load_dataset()
    splits = split_data(list(qa))
    print(f"Passages: {len(passages)} | QA: {len(qa)}")
    print(f"Train/Val/Test: {len(splits['train'])}/{len(splits['val'])}/{len(splits['test'])}")
