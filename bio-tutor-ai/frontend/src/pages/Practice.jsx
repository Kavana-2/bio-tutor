import { useState, useEffect, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const TOPICS = [["all", "All Topics"], ["photosynthesis", "Photosynthesis"], ["digestion", "Digestive System"], ["respiratory", "Respiratory System"]];

export default function Practice() {
  const [topic, setTopic] = useState("all");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  const loadQuestions = async (t) => {
    const reqId = ++reqRef.current;
    const { data } = await api.get("/flashcards/generate", { params: { topic: t, count: 8 } });
    if (reqId !== reqRef.current) return; // ignore stale response
    setQuestions(data.flashcards); setIdx(0); setResult(null); setAnswer("");
  };
  useEffect(() => { loadQuestions(topic); }, [topic]);

  const evaluate = async () => {
    if (!answer.trim()) return;
    const q = questions[idx];
    setLoading(true);
    try {
      const { data } = await api.post("/practice/evaluate", {
        question: q.front, student_answer: answer, model_answer: q.back, concepts: q.concepts || [], topic,
      });
      setResult(data);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const nextQ = () => {
    setResult(null); setAnswer("");
    setIdx((i) => (i + 1) % questions.length);
  };

  if (!questions.length) return <Page title="Practice"><Spinner /></Page>;
  const q = questions[idx];

  return (
    <Page title="Practice Mode" subtitle="Write & get evaluated" testid="practice-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-48" data-testid="practice-topic"><SelectValue /></SelectTrigger>
          <SelectContent>{TOPICS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      }>
      <Card className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Question {idx + 1} / {questions.length}</p>
        <p className="font-medium text-lg mb-4">{q.front}</p>
        <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer here…" disabled={!!result} data-testid="practice-answer" />
        {!result ? (
          <Button className="mt-4" onClick={evaluate} disabled={loading || !answer.trim()} data-testid="practice-evaluate">
            {loading ? <Spinner /> : "Evaluate Answer"}
          </Button>
        ) : (
          <div className="mt-5 space-y-4" data-testid="practice-result">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-black tracking-tighter ${result.percentage >= 50 ? "text-success" : "text-destructive"}`}>{result.percentage}%</div>
              <div>
                <p className="text-sm font-medium">{result.feedback}</p>
                <p className="text-xs text-muted-foreground">Semantic similarity: {(result.similarity * 100).toFixed(0)}%</p>
              </div>
            </div>
            {result.matched_concepts?.length > 0 && (
              <div><p className="text-xs font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Matched concepts</p>
                <div className="flex flex-wrap gap-1.5">{result.matched_concepts.map((c, i) => <span key={i} className="text-xs rounded-full bg-success/10 text-success px-2 py-0.5">{c}</span>)}</div></div>
            )}
            {result.missing_concepts?.length > 0 && (
              <div><p className="text-xs font-medium mb-1 flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /> Missing concepts</p>
                <div className="flex flex-wrap gap-1.5">{result.missing_concepts.map((c, i) => <span key={i} className="text-xs rounded-full bg-destructive/10 text-destructive px-2 py-0.5">{c}</span>)}</div></div>
            )}
            <div className="rounded-md border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Model answer</p>
              <p className="text-sm leading-relaxed">{result.model_answer}</p>
            </div>
            <Button onClick={nextQ} data-testid="practice-next">Next Question <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        )}
      </Card>
    </Page>
  );
}
