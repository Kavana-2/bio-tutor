"""Custom domain-restricted Biology NLP engine.
Uses sentence-transformers/all-MiniLM-L6-v2 for semantic retrieval over a curated
Biology knowledge base (Photosynthesis, Digestion, Respiratory system).
No external LLM APIs are used. Everything runs locally on CPU or GPU.
"""
import json
import os
import pickle
import re
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer, util

ROOT_DIR = Path(__file__).parent
DATASET_DIR = ROOT_DIR / "dataset"
MODEL_DIR = ROOT_DIR / "Model"
EMB_DIR = MODEL_DIR / "embeddings"
EMB_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = "all-MiniLM-L6-v2"
# Confidence thresholds tuned for MiniLM cosine similarity
DOMAIN_THRESHOLD = 0.30   # below this => out of domain / refuse
CONFIDENCE_THRESHOLD = 0.38  # below this => not enough info

DOMAIN_MESSAGE = "I am trained only on Photosynthesis, Digestive System, and Respiratory System."
LOW_CONF_MESSAGE = "I couldn't find enough information in my Biology knowledge base to answer that accurately."

TOPIC_FILES = {
    "photosynthesis": "photosynthesis.json",
    "digestion": "digestion.json",
    "respiratory": "respiratory.json",
}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


class BiologyNLPEngine:
    def __init__(self):
        self.model = None
        self.corpus = []          # list of dicts: text, answer, topic, concepts, source, kind
        self.corpus_emb = None
        self.topic_centroids = {}
        self.display_names = {}
        self.keywords = {}
        self._loaded = False

    def load(self):
        if self._loaded:
            return
        self.model = SentenceTransformer(MODEL_NAME)
        self._build_corpus()
        self._loaded = True

    def _build_corpus(self):
        corpus = []
        for topic, fname in TOPIC_FILES.items():
            data = json.loads((DATASET_DIR / fname).read_text())
            self.display_names[topic] = data.get("display_name", topic)
            self.keywords[topic] = [k.lower() for k in data.get("keywords", [])]
            for p in data.get("passages", []):
                corpus.append({
                    "retrieval_text": _clean(p["title"] + ". " + p["text"]),
                    "answer": _clean(p["text"]),
                    "topic": topic,
                    "concepts": [p.get("concept", "")],
                    "source": f"Biology dataset · {data.get('display_name')} · {p.get('title')}",
                    "kind": "passage",
                    "title": p.get("title", ""),
                })
            for qa in data.get("qa", []):
                corpus.append({
                    "retrieval_text": _clean(qa["question"] + " " + qa["answer"]),
                    "answer": _clean(qa["answer"]),
                    "topic": topic,
                    "concepts": qa.get("concepts", []),
                    "source": f"Biology dataset · {data.get('display_name')} · Q&A",
                    "kind": "qa",
                    "question": qa.get("question", ""),
                    "qtype": qa.get("type", ""),
                    "difficulty": qa.get("difficulty", "beginner"),
                })
        self.corpus = corpus

        cache = EMB_DIR / "corpus_embeddings.pkl"
        texts = [c["retrieval_text"] for c in corpus]
        if cache.exists():
            with open(cache, "rb") as f:
                saved = pickle.load(f)
            if saved.get("n") == len(texts):
                self.corpus_emb = saved["emb"]
        if self.corpus_emb is None:
            self.corpus_emb = self.model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)
            with open(cache, "wb") as f:
                pickle.dump({"n": len(texts), "emb": self.corpus_emb}, f)

        # topic centroids for classification
        for topic in TOPIC_FILES:
            idx = [i for i, c in enumerate(corpus) if c["topic"] == topic]
            vecs = self.corpus_emb[idx]
            centroid = vecs.mean(dim=0)
            centroid = centroid / centroid.norm()
            self.topic_centroids[topic] = centroid

    def classify_topic(self, query):
        q = self.model.encode(_clean(query), convert_to_tensor=True, normalize_embeddings=True)
        scores = {t: float(util.cos_sim(q, c)[0][0]) for t, c in self.topic_centroids.items()}
        best = max(scores, key=scores.get)
        return best, scores, q

    def answer(self, query, extra_corpus=None):
        """Answer a question restricted to Biology domain.
        extra_corpus: optional list of dicts with 'text' and pre-computed 'emb' (tensor) from user PDF.
        """
        self.load()
        topic, topic_scores, q = self.classify_topic(query)
        best_topic_sim = topic_scores[topic]

        # semantic search over dataset
        hits = util.semantic_search(q, self.corpus_emb, top_k=5)[0]
        top = hits[0]
        top_item = self.corpus[top["corpus_id"]]
        top_score = float(top["score"])

        # keyword signal for domain check
        kw_hit = any(kw in query.lower() for kws in self.keywords.values() for kw in kws)

        # Out of domain: low topic similarity AND low retrieval score AND no keyword
        if best_topic_sim < DOMAIN_THRESHOLD and top_score < DOMAIN_THRESHOLD and not kw_hit:
            return {
                "answer": DOMAIN_MESSAGE,
                "topic": None,
                "confidence": round(top_score, 3),
                "supporting_concepts": [],
                "source": "domain_restriction",
                "in_domain": False,
            }

        if top_score < CONFIDENCE_THRESHOLD and not kw_hit:
            return {
                "answer": LOW_CONF_MESSAGE,
                "topic": self.display_names.get(topic),
                "confidence": round(top_score, 3),
                "supporting_concepts": [],
                "source": "low_confidence",
                "in_domain": True,
            }

        supporting = []
        for h in hits[:3]:
            supporting.extend(self.corpus[h["corpus_id"]].get("concepts", []))
        supporting = [s for s in dict.fromkeys([c for c in supporting if c])][:6]

        return {
            "answer": top_item["answer"],
            "topic": self.display_names.get(top_item["topic"]),
            "topic_key": top_item["topic"],
            "confidence": round(top_score, 3),
            "supporting_concepts": supporting,
            "source": top_item["source"],
            "in_domain": True,
        }

    def encode(self, texts):
        self.load()
        return self.model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)

    def search_chunks(self, query, chunks, chunk_emb, top_k=3):
        """Semantic search over user PDF chunks. chunk_emb is a tensor."""
        self.load()
        q = self.model.encode(_clean(query), convert_to_tensor=True, normalize_embeddings=True)
        hits = util.semantic_search(q, chunk_emb, top_k=min(top_k, len(chunks)))[0]
        return [{"chunk": chunks[h["corpus_id"]], "score": float(h["score"]), "idx": h["corpus_id"]} for h in hits]

    def evaluate_answer(self, student_answer, model_answer, expected_concepts):
        """Practice evaluation via semantic similarity + concept coverage."""
        self.load()
        emb = self.model.encode([_clean(student_answer), _clean(model_answer)],
                                convert_to_tensor=True, normalize_embeddings=True)
        sim = float(util.cos_sim(emb[0], emb[1])[0][0])
        sa = student_answer.lower()
        matched = [c for c in expected_concepts if c and c.lower() in sa]
        missing = [c for c in expected_concepts if c and c.lower() not in sa]
        concept_cov = len(matched) / max(1, len(expected_concepts))
        score = 0.6 * max(0.0, sim) + 0.4 * concept_cov
        score = min(1.0, max(0.0, score))
        return {
            "score": round(score, 3),
            "percentage": round(score * 100, 1),
            "similarity": round(sim, 3),
            "matched_concepts": matched,
            "missing_concepts": missing,
            "model_answer": model_answer,
        }

    def get_topic_questions(self, topic=None, difficulty=None, qtypes=None, limit=10):
        self.load()
        items = [c for c in self.corpus if c["kind"] == "qa"]
        if topic and topic != "all":
            items = [c for c in items if c["topic"] == topic]
        if difficulty and difficulty != "all":
            items = [c for c in items if c.get("difficulty") == difficulty]
        if qtypes:
            items = [c for c in items if c.get("qtype") in qtypes]
        return items[:limit]

    def build_mcqs(self, topic=None, difficulty=None, limit=5):
        """Build MCQs by sampling QAs and using same-topic answers as distractors."""
        self.load()
        import random
        qa_items = [c for c in self.corpus if c["kind"] == "qa"]
        pool = [c for c in qa_items if (not topic or topic == "all" or c["topic"] == topic)]
        if difficulty and difficulty != "all":
            filtered = [c for c in pool if c.get("difficulty") == difficulty]
            pool = filtered or pool
        random.shuffle(pool)
        pool = pool[:limit]
        mcqs = []
        for item in pool:
            same_topic = [d["answer"] for d in qa_items
                          if d["topic"] == item["topic"] and d["answer"] != item["answer"]]
            other = [d["answer"] for d in qa_items if d["answer"] != item["answer"]]
            random.shuffle(same_topic)
            random.shuffle(other)
            distractors = (same_topic + other)[:3]
            opts = [item["answer"]] + distractors
            random.shuffle(opts)
            mcqs.append({
                "question": item.get("question"),
                "options": opts,
                "correct_answer": item["answer"],
                "correct_index": opts.index(item["answer"]),
                "topic": self.display_names.get(item["topic"]),
                "concepts": item.get("concepts", []),
            })
        return mcqs


engine = BiologyNLPEngine()
