"""Evaluate current threshold-gating behavior on a separate evaluation dataset.

This script intentionally preserves the existing application behavior and thresholds:
- Biology domain gate uses DOMAIN_THRESHOLD = 0.30
- Low-confidence gate uses CONFIDENCE_THRESHOLD = 0.38
- PDF retrieval threshold is preserved at 0.35 in the server logic

It does not tune or alter these values.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from nlp_engine import BiologyNLPEngine, DOMAIN_THRESHOLD, CONFIDENCE_THRESHOLD

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BACKEND_DIR / "dataset"
EVAL_PATH = BACKEND_DIR / "Training" / "evaluation_dataset.json"


def load_eval_dataset(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def evaluate_thresholds():
    engine = BiologyNLPEngine()
    engine.load()
    questions = load_eval_dataset(EVAL_PATH)
    rows = []
    accepted = 0
    refused = 0
    false_accept = 0
    false_reject = 0

    for item in questions:
        result = engine.answer(item["question"])
        predicted_accept = bool(result.get("in_domain"))
        expected_accept = item["expected_behavior"] == "accept"

        if expected_accept and predicted_accept:
            accepted += 1
        elif not expected_accept and not predicted_accept:
            refused += 1
        elif expected_accept and not predicted_accept:
            false_reject += 1
        elif not expected_accept and predicted_accept:
            false_accept += 1

        rows.append({
            "id": item["id"],
            "question": item["question"],
            "expected_category": item["expected_topic"],
            "domain": item["domain"],
            "expected_behavior": item["expected_behavior"],
            "predicted_in_domain": predicted_accept,
            "predicted_topic": result.get("topic"),
            "prediction": result.get("answer"),
            "confidence": result.get("confidence"),
            "domain_threshold": DOMAIN_THRESHOLD,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
        })

    total = len(questions)
    decision_accuracy = (accepted + refused) / total if total else 0.0

    return {
        "total_questions": total,
        "accepted_in_domain": accepted,
        "refused_out_of_domain": refused,
        "false_acceptance": false_accept,
        "false_rejection": false_reject,
        "decision_accuracy": decision_accuracy,
        "false_acceptance_rate": false_accept / total if total else 0.0,
        "false_rejection_rate": false_reject / total if total else 0.0,
        "rows": rows,
    }


if __name__ == "__main__":
    result = evaluate_thresholds()
    print(json.dumps({
        "total_questions": result["total_questions"],
        "accepted_in_domain": result["accepted_in_domain"],
        "refused_out_of_domain": result["refused_out_of_domain"],
        "false_acceptance": result["false_acceptance"],
        "false_rejection": result["false_rejection"],
        "decision_accuracy": round(result["decision_accuracy"], 4),
        "false_acceptance_rate": round(result["false_acceptance_rate"], 4),
        "false_rejection_rate": round(result["false_rejection_rate"], 4),
        "domain_threshold": DOMAIN_THRESHOLD,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }, indent=2))
