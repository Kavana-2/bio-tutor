import { useState, useEffect, useRef } from "react";
import api from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Timer, Play, Pause, RotateCcw, Volume2, ArrowRight } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";

const TOPICS = [
  ["all", "All Topics"],
  ["photosynthesis", "Photosynthesis"],
  ["digestion", "Digestive System"],
  ["respiratory", "Respiratory System"],
];

export default function Revision() {
  const [topic, setTopic] = useState("all");
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(300);
  const timerRef = useRef(null);
  const { speak, supported } = useSpeech();

  const load = async (t) => {
    const { data } = await api.get("/flashcards/generate", { params: { topic: t, count: 15 } });
    setCards(data.flashcards);
    setIdx(0);
  };

  useEffect(() => {
    load(topic);
  }, [topic]);

  useEffect(() => {
    if (running && seconds > 0) {
      timerRef.current = setTimeout(() => setSeconds((s) => s - 1), 1000);
    } else if (seconds === 0) setRunning(false);
    return () => clearTimeout(timerRef.current);
  }, [running, seconds]);

  const start = () => {
    setRunning(true);
    if (seconds === 0) setSeconds(300);
  };

  const reset = () => {
    setRunning(false);
    setSeconds(300);
    setIdx(0);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!cards.length)
    return (
      <Page title="5-Minute Rapid Revision">
        <Spinner />
      </Page>
    );

  const c = cards[idx];

  return (
    <Page
      title="5-Minute Rapid Revision"
      subtitle="Rapid Concept Recap"
      testid="revision-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-52 h-10 rounded-xl bg-card border-border font-semibold text-xs" data-testid="revision-topic">
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
        {/* Timer Card */}
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-extrabold tracking-tight font-display text-foreground tabular-nums" data-testid="revision-timer">
                {mm}:{ss}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Session countdown timer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!running ? (
              <Button size="sm" onClick={start} className="h-10 px-5 font-semibold shadow-md shadow-primary/20" data-testid="revision-start">
                <Play className="h-4 w-4 mr-1.5" /> Start Timer
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setRunning(false)} className="h-10 px-5 font-semibold">
                <Pause className="h-4 w-4 mr-1.5" /> Pause
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={reset} className="h-10 w-10">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Rapid Point Card */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
              Point {idx + 1} of {cards.length}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">{c.topic}</span>
          </div>

          <h3 className="text-lg font-bold tracking-tight text-foreground font-display mb-2">{c.front}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.back}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-4 border-t border-border/60">
            {supported ? (
              <Button size="sm" variant="outline" className="font-semibold text-xs h-9" onClick={() => speak(`${c.front}. ${c.back}`)} data-testid="revision-speak">
                <Volume2 className="h-4 w-4 mr-1.5 text-primary" /> Read Aloud
              </Button>
            ) : <div />}

            <Button size="sm" className="font-semibold text-xs h-9 shadow-sm" onClick={() => setIdx((i) => (i + 1) % cards.length)} data-testid="revision-next">
              Next Rapid Point <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}

