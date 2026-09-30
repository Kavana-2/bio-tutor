import { useState, useEffect } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RotateCw, ChevronLeft, ChevronRight, Check, AlertTriangle, Bookmark, Layers } from "lucide-react";
import { toast } from "sonner";

const TOPICS = [
  ["all", "All Topics"],
  ["photosynthesis", "Photosynthesis"],
  ["digestion", "Digestive System"],
  ["respiratory", "Respiratory System"],
];

export default function Flashcards() {
  const [topic, setTopic] = useState("all");
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const load = async (t) => {
    try {
      const { data } = await api.get("/flashcards/generate", { params: { topic: t, count: 12 } });
      setCards(data.flashcards);
      setIdx(0);
      setFlipped(false);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  useEffect(() => {
    load(topic);
  }, [topic]);

  const mark = async (status) => {
    const c = cards[idx];
    try {
      await api.post("/flashcards/status", { front: c.front, back: c.back, topic: c.topic, status });
      toast.success(`Marked as ${status}`);
      next();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const next = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % cards.length);
  };

  const prev = () => {
    setFlipped(false);
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  };

  if (!cards.length)
    return (
      <Page title="Flashcards Deck">
        <Spinner />
      </Page>
    );

  const c = cards[idx];

  return (
    <Page
      title="Active Recall Flashcards"
      subtitle="Self-Paced Active Recall"
      testid="flashcards-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-52 h-10 rounded-xl bg-card border-border font-semibold text-xs" data-testid="flash-topic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
          <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" /> Active Recall Deck</span>
          <span>Card {idx + 1} of {cards.length}</span>
        </div>

        {/* 3D Flashcard Container */}
        <div
          onClick={() => setFlipped((f) => !f)}
          data-testid="flashcard"
          className="cursor-pointer group relative min-h-[19rem] rounded-3xl border border-border bg-card p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-md transition-all hover:shadow-xl hover:border-primary/40 select-none"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary mb-6">
            {flipped ? "Answer & Detail" : "Question Prompt"}
          </span>

          <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-relaxed font-display">
            {flipped ? c.back : c.front}
          </p>

          <span className="mt-8 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors">
            <RotateCw className="h-3.5 w-3.5" /> Tap card to flip
          </span>
        </div>

        {/* Card Controls & Mastery Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0" onClick={prev} data-testid="flash-prev">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex flex-wrap gap-2.5 justify-center w-full sm:w-auto">
            <Button variant="outline" size="sm" className="h-10 rounded-xl font-semibold text-xs" onClick={() => mark("mastered")} data-testid="flash-mastered">
              <Check className="h-4 w-4 mr-1.5 text-emerald-500" /> Mastered
            </Button>
            <Button variant="outline" size="sm" className="h-10 rounded-xl font-semibold text-xs" onClick={() => mark("difficult")} data-testid="flash-difficult">
              <AlertTriangle className="h-4 w-4 mr-1.5 text-rose-500" /> Difficult
            </Button>
            <Button variant="outline" size="sm" className="h-10 rounded-xl font-semibold text-xs" onClick={() => mark("bookmark")} data-testid="flash-bookmark">
              <Bookmark className="h-4 w-4 mr-1.5 text-primary" /> Save
            </Button>
          </div>

          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0" onClick={next} data-testid="flash-next">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Page>
  );
}

