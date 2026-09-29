import { useState, useEffect, useRef } from "react";
import api from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Timer, Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";

const TOPICS = [["all", "All Topics"], ["photosynthesis", "Photosynthesis"], ["digestion", "Digestive System"], ["respiratory", "Respiratory System"]];

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
    setCards(data.flashcards); setIdx(0);
  };
  useEffect(() => { load(topic); }, [topic]);

  useEffect(() => {
    if (running && seconds > 0) {
      timerRef.current = setTimeout(() => setSeconds((s) => s - 1), 1000);
    } else if (seconds === 0) setRunning(false);
    return () => clearTimeout(timerRef.current);
  }, [running, seconds]);

  const start = () => { setRunning(true); if (seconds === 0) setSeconds(300); };
  const reset = () => { setRunning(false); setSeconds(300); setIdx(0); };
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!cards.length) return <Page title="Revision"><Spinner /></Page>;
  const c = cards[idx];

  return (
    <Page title="5-Minute Revision" subtitle="Rapid recap" testid="revision-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-48" data-testid="revision-topic"><SelectValue /></SelectTrigger>
          <SelectContent>{TOPICS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      }>
      <div className="max-w-2xl mx-auto">
        <Card className="flex items-center justify-center gap-4 mb-6">
          <Timer className="h-6 w-6 text-primary" />
          <span className="text-4xl font-black tracking-tighter tabular-nums" data-testid="revision-timer">{mm}:{ss}</span>
          <div className="flex gap-2 ml-4">
            {!running ? <Button size="sm" onClick={start} data-testid="revision-start"><Play className="h-4 w-4 mr-1" /> Start</Button>
              : <Button size="sm" variant="outline" onClick={() => setRunning(false)}><Pause className="h-4 w-4 mr-1" /> Pause</Button>}
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Point {idx + 1} / {cards.length}</p>
          <p className="font-medium mb-2">{c.front}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.back}</p>
          <div className="flex items-center gap-2 mt-4">
            {supported && <Button size="sm" variant="outline" onClick={() => speak(`${c.front}. ${c.back}`)} data-testid="revision-speak"><Volume2 className="h-4 w-4 mr-1" /> Speak</Button>}
            <Button size="sm" onClick={() => setIdx((i) => (i + 1) % cards.length)} data-testid="revision-next">Next point</Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
