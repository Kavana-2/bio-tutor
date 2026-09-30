import { useState, useEffect, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CheckCircle2, XCircle, ArrowRight, PenTool, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

const TOPICS = [
  ["all", "All Topics"],
  ["photosynthesis", "Photosynthesis"],
  ["digestion", "Digestive System"],
  ["respiratory", "Respiratory System"],
];

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
    try {
      const { data } = await api.get("/flashcards/generate", { params: { topic: t, count: 8 } });
      if (reqId !== reqRef.current) return;
      setQuestions(data.flashcards);
      setIdx(0);
      setResult(null);
      setAnswer("");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  useEffect(() => {
    loadQuestions(topic);
  }, [topic]);

  const evaluate = async () => {
    if (!answer.trim()) return;
    const q = questions[idx];
    setLoading(true);
    try {
      const { data } = await api.post("/practice/evaluate", {
        question: q.front,
        student_answer: answer,
        model_answer: q.back,
        concepts: q.concepts || [],
        topic,
      });
      setResult(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const nextQ = () => {
    setResult(null);
    setAnswer("");
    setIdx((i) => (i + 1) % questions.length);
  };

  if (!questions.length)
    return (
      <Page title="Subjective Practice Evaluation">
        <Spinner />
      </Page>
    );

  const q = questions[idx];

  return (
    <Page
      title="Subjective Practice Mode"
      subtitle="Write Answers & Get NLP Feedback"
      testid="practice-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-52 h-10 rounded-xl bg-card border-border font-semibold text-xs" data-testid="practice-topic">
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
      <Card className="max-w-2xl mx-auto shadow-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
            Question {idx + 1} of {questions.length}
          </span>
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <PenTool className="h-3.5 w-3.5 text-primary" /> Natural Language Evaluation
          </span>
        </div>

        <h3 className="font-bold text-base sm:text-lg text-foreground font-display mb-4 leading-relaxed">
          {q.front}
        </h3>

        <Textarea
          rows={5}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your explanation here in your own words..."
          disabled={!!result}
          className="rounded-xl border-border bg-muted/20 focus:border-primary text-sm leading-relaxed"
          data-testid="practice-answer"
        />

        {!result ? (
          <Button
            className="mt-5 w-full h-11 font-semibold shadow-md shadow-primary/20"
            onClick={evaluate}
            disabled={loading || !answer.trim()}
            data-testid="practice-evaluate"
          >
            {loading ? <Spinner /> : <><Sparkles className="h-4 w-4 mr-2" /> Evaluate Answer with Custom Model</>}
          </Button>
        ) : (
          <div className="mt-6 space-y-5 pt-4 border-t border-border" data-testid="practice-result">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20">
              <div
                className={`text-3xl lg:text-4xl font-extrabold tracking-tight font-display ${
                  result.percentage >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {result.percentage}%
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">{result.feedback}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  Semantic similarity match: {(result.similarity * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {result.matched_concepts?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Matched Concepts Included
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_concepts.map((c, i) => (
                    <span key={i} className="text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.missing_concepts?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-rose-500" /> Key Concepts Missing
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.missing_concepts.map((c, i) => (
                    <span key={i} className="text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Reference Model Answer
              </p>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">{result.model_answer}</p>
            </div>

            <Button onClick={nextQ} className="w-full h-11 font-semibold shadow-md shadow-primary/20" data-testid="practice-next">
              Next Practice Question <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}
      </Card>
    </Page>
  );
}

