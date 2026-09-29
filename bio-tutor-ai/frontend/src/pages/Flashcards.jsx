import { useState, useEffect } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RotateCw, ChevronLeft, ChevronRight, Check, AlertTriangle, Bookmark } from "lucide-react";
import { toast } from "sonner";

const TOPICS = [["all", "All Topics"], ["photosynthesis", "Photosynthesis"], ["digestion", "Digestive System"], ["respiratory", "Respiratory System"]];

export default function Flashcards() {
  const [topic, setTopic] = useState("all");
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const load = async (t) => {
    const { data } = await api.get("/flashcards/generate", { params: { topic: t, count: 12 } });
    setCards(data.flashcards); setIdx(0); setFlipped(false);
  };
  useEffect(() => { load(topic); }, [topic]);

  const mark = async (status) => {
    const c = cards[idx];
    try {
      await api.post("/flashcards/status", { front: c.front, back: c.back, topic: c.topic, status });
      toast.success(`Marked as ${status}`);
      next();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };
  const next = () => { setFlipped(false); setIdx((i) => (i + 1) % cards.length); };
  const prev = () => { setFlipped(false); setIdx((i) => (i - 1 + cards.length) % cards.length); };

  if (!cards.length) return <Page title="Flashcards"><Spinner /></Page>;
  const c = cards[idx];

  return (
    <Page title="Flashcards" subtitle="Active recall" testid="flashcards-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-48" data-testid="flash-topic"><SelectValue /></SelectTrigger>
          <SelectContent>{TOPICS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      }>
      <div className="max-w-2xl mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-4">Card {idx + 1} of {cards.length}</p>
        <button onClick={() => setFlipped((f) => !f)} data-testid="flashcard"
          className="w-full min-h-[16rem] rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center transition-shadow hover:shadow-sm">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">{flipped ? "Answer" : "Question"}</span>
          <p className="text-lg font-medium leading-relaxed">{flipped ? c.back : c.front}</p>
          <span className="mt-6 text-xs text-muted-foreground flex items-center gap-1"><RotateCw className="h-3 w-3" /> Tap to flip</span>
        </button>

        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" size="icon" onClick={prev} data-testid="flash-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => mark("mastered")} data-testid="flash-mastered"><Check className="h-4 w-4 mr-1 text-success" /> Mastered</Button>
            <Button variant="outline" size="sm" onClick={() => mark("difficult")} data-testid="flash-difficult"><AlertTriangle className="h-4 w-4 mr-1 text-destructive" /> Difficult</Button>
            <Button variant="outline" size="sm" onClick={() => mark("bookmark")} data-testid="flash-bookmark"><Bookmark className="h-4 w-4 mr-1 text-primary" /> Save</Button>
          </div>
          <Button variant="outline" size="icon" onClick={next} data-testid="flash-next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </Page>
  );
}
