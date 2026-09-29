"""Domain-adapt / fine-tune sentence-transformers/all-MiniLM-L6-v2 on the Biology
Q&A dataset using MultipleNegativesRankingLoss (question -> answer pairs).
Runs on CPU and automatically uses GPU when available. Saves the trained model.

Usage:
    python Training/training.py            # fine-tune and save
    python Training/training.py --epochs 2
"""
import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

from preprocessing import load_dataset, split_data

BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BACKEND_DIR / "Model"
TRAINED_DIR = MODEL_DIR / "trained_model"
SEED = 42


def set_seed(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def main(epochs=1, base_model="all-MiniLM-L6-v2"):
    set_seed()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    _, qa = load_dataset()
    splits = split_data(list(qa))
    train = splits["train"]

    train_examples = [InputExample(texts=[x["question"], x["answer"]]) for x in train]
    print(f"Training pairs: {len(train_examples)}")

    model = SentenceTransformer(base_model, device=device)
    loader = DataLoader(train_examples, shuffle=True, batch_size=16)
    loss = losses.MultipleNegativesRankingLoss(model)

    warmup = int(len(loader) * epochs * 0.1)
    model.fit(train_objectives=[(loader, loss)], epochs=epochs,
              warmup_steps=warmup, show_progress_bar=True)

    TRAINED_DIR.mkdir(parents=True, exist_ok=True)
    model.save(str(TRAINED_DIR))

    metrics = {"base_model": base_model, "epochs": epochs, "device": device,
               "train_pairs": len(train_examples), "val": len(splits["val"]),
               "test": len(splits["test"]), "seed": SEED}
    (MODEL_DIR / "training_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"Saved fine-tuned model to {TRAINED_DIR}")
    print("Now run: python Training/build_embeddings.py && python Training/evaluation.py")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--base_model", default="all-MiniLM-L6-v2")
    args = ap.parse_args()
    main(args.epochs, args.base_model)
