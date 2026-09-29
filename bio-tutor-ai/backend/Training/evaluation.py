"""Evaluate the retrieval model on the held-out test set and save metrics.
Computes retrieval accuracy, top-k retrieval accuracy, and precision/recall/F1
for topic classification. Saves Model/evaluation_results.json (served at
GET /api/model/evaluation).

Usage:
    python Training/evaluation.py
"""
import json
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer, util
from sklearn.metrics import precision_recall_fscore_support, accuracy_score

from preprocessing import load_dataset, split_data

BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BACKEND_DIR / "Model"
TRAINED_DIR = MODEL_DIR / "trained_model"


def main():
    model_path = str(TRAINED_DIR) if TRAINED_DIR.exists() else "all-MiniLM-L6-v2"
    model = SentenceTransformer(model_path)
    _, qa = load_dataset()
    splits = split_data(list(qa))
    test = splits["test"]

    # Retrieval: for each test question, retrieve nearest answer from full answer pool
    answers = [x["answer"] for x in qa]
    ans_emb = model.encode(answers, convert_to_tensor=True, normalize_embeddings=True)
    q_emb = model.encode([x["question"] for x in test], convert_to_tensor=True, normalize_embeddings=True)

    top1, top3 = 0, 0
    confidences = []
    for i, x in enumerate(test):
        gold_idx = answers.index(x["answer"])
        hits = util.semantic_search(q_emb[i], ans_emb, top_k=3)[0]
        ranked = [h["corpus_id"] for h in hits]
        confidences.append(float(hits[0]["score"]))
        if ranked and ranked[0] == gold_idx:
            top1 += 1
        if gold_idx in ranked:
            top3 += 1

    n = max(1, len(test))
    retrieval_acc = round(top1 / n, 3)
    topk_acc = round(top3 / n, 3)

    # Topic classification via nearest topic centroid
    topics = ["photosynthesis", "digestion", "respiratory"]
    centroids = {}
    for t in topics:
        idx = [i for i, x in enumerate(qa) if x["topic"] == t]
        v = ans_emb[idx].mean(dim=0)
        centroids[t] = v / v.norm()
    cen = torch.stack([centroids[t] for t in topics])
    y_true, y_pred = [], []
    for i, x in enumerate(test):
        sims = util.cos_sim(q_emb[i], cen)[0]
        y_pred.append(topics[int(torch.argmax(sims))])
        y_true.append(x["topic"])
    acc = accuracy_score(y_true, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)

    results = {
        "model": model_path,
        "test_size": len(test),
        "topic_classification": {
            "accuracy": round(float(acc), 3),
            "precision": round(float(p), 3),
            "recall": round(float(r), 3),
            "f1": round(float(f1), 3),
        },
        "retrieval": {
            "retrieval_accuracy_top1": retrieval_acc,
            "retrieval_accuracy_top3": topk_acc,
            "mean_confidence": round(float(np.mean(confidences)) if confidences else 0.0, 3),
        },
    }
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    (MODEL_DIR / "evaluation_results.json").write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
