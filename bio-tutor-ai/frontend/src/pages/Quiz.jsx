import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, Trophy, FileText, Sparkles, HelpCircle, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Quiz() {
  const [pdfs, setPdfs] = useState(null);
  const [pdfId, setPdfId] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("5");
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/pdfs").then((r) => setPdfs(r.data)).catch(() => setPdfs([]));
  }, []);

  const generate = async () => {
    if (!pdfId) return toast.error("Select a Biology document first");
    setLoading(true);
    setResult(null);
    setAnswers({});
    try {
      const { data } = await api.get("/quiz/generate", { params: { pdf_id: pdfId, difficulty, count } });
      setQuestions(data.questions);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    const payload = questions.map((q, i) => ({
      question: q.question,
      selected: answers[i] || "",
      correct_answer: q.correct_answer,
      correct: answers[i] === q.correct_answer,
      concepts: q.concepts,
      explanation: q.explanation,
      topic: q.topic,
    }));
    try {
      const { data } = await api.post("/quiz/submit", { pdf_id: pdfId, topic: "uploaded_pdf", answers: payload });
      setResult(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuestions(null);
    setResult(null);
    setAnswers({});
  };

  if (pdfs === null)
    return (
      <Page title="Study Notes Quiz">
        <Spinner />
      </Page>
    );

  return (
    <Page title="Study Notes Quiz Generator" subtitle="Automatic Question Generation from Your Notes" testid="quiz-page">
      {!questions && !result && (
        <div className="grid lg:grid-cols-12 gap-6 max-w-5xl">
          <Card className="lg:col-span-7 bg-card border-border">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight font-display text-foreground">Build a New Quiz</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
              Questions are constructed directly from sentences and key terms extracted from your uploaded Biology notes. Question history prevents duplicate questions across sessions.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Select Study Document</label>
                <select
                  value={pdfId}
                  onChange={(e) => setPdfId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
                  data-testid="quiz-pdf-select"
                >
                  <option value="">Choose uploaded document</option>
                  {pdfs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.filename} · {p.num_units ?? p.num_pages} {p.document_type === "pptx" ? "slides" : "pages"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
                    data-testid="quiz-difficulty-select"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Number of Questions</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
                    data-testid="quiz-count-select"
                  >
                    {[3, 5, 8, 10].map((n) => (
                      <option key={n} value={n}>{n} Questions</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={generate}
                disabled={loading || !pdfs.length}
                className="w-full h-11 font-semibold shadow-md shadow-primary/20"
                data-testid="quiz-start"
              >
                {loading ? <Spinner /> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Quiz from Document</>}
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-5 bg-muted/20">
            <h3 className="font-bold text-base tracking-tight font-display mb-4">Grounded Verification System</h3>
            <div className="space-y-4 text-xs text-muted-foreground">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p><span className="font-semibold text-foreground">Extracted Grounding:</span> Questions use sentences strictly pulled from your uploaded document.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <RotateCcw className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <p><span className="font-semibold text-foreground">Fresh History:</span> Keeps track of served questions to avoid repetition.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p><span className="font-semibold text-foreground">Detailed Feedback:</span> Answers are scored with concept explanations & weak area analytics.</p>
              </div>
            </div>
            {!pdfs.length && (
              <div className="mt-4">
                <EmptyState title="No documents uploaded" description="Upload a Biology PDF in Study Library to begin." testid="quiz-no-pdfs" />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Active Question List */}
      {questions && !result && (
        <div className="max-w-3xl mx-auto space-y-5" data-testid="quiz-questions">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card">
            <div>
              <p className="text-sm font-bold text-foreground">{questions.length} Questions · Difficulty: <span className="capitalize text-primary">{difficulty}</span></p>
              <p className="text-xs text-muted-foreground">Select your answers based on your study notes.</p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} data-testid="quiz-cancel">Cancel Quiz</Button>
          </div>

          {questions.map((q, i) => (
            <Card key={i} data-testid={`quiz-question-${i}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Question {i + 1} of {questions.length}
                </span>
                <span className="text-xs text-muted-foreground">{q.type || "concept"}</span>
              </div>

              <p className="font-bold text-base text-foreground leading-relaxed mb-4">{q.question}</p>

              {q.options?.length ? (
                <div className="grid gap-2.5">
                  {q.options.map((option, optIdx) => {
                    const selected = answers[i] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: option }))}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between ${
                          selected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-muted/40 text-foreground"
                        }`}
                        data-testid={`quiz-q${i}-option-${optIdx}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-6 w-6 rounded-full border text-[11px] flex items-center justify-center ${selected ? "border-primary bg-primary text-primary-foreground font-bold" : "border-border text-muted-foreground"}`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{option}</span>
                        </div>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={answers[i] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
                  placeholder="Write your answer..."
                  data-testid={`quiz-q${i}-input`}
                />
              )}
            </Card>
          ))}

          <Button
            onClick={submit}
            disabled={loading || Object.keys(answers).length !== questions.length}
            className="w-full h-11 font-semibold shadow-md shadow-primary/20"
            data-testid="quiz-submit"
          >
            {loading ? <Spinner /> : "Submit & Evaluate Quiz"}
          </Button>
        </div>
      )}

      {/* Quiz Submission Result Screen */}
      {result && (
        <div className="max-w-3xl mx-auto space-y-6" data-testid="quiz-result">
          <Card className="text-center p-8 bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <Trophy className="h-12 w-12 mx-auto text-amber-500 mb-3" />
            <p className="text-5xl font-extrabold tracking-tight font-display text-foreground">{result.percentage}%</p>
            <p className="text-xs font-semibold text-muted-foreground mt-2">
              {result.correct} Correct · {result.incorrect} Incorrect · Out of {result.total} Questions
            </p>
            <p className="text-xs font-medium text-foreground mt-4 max-w-md mx-auto p-3 rounded-xl bg-card border border-border">
              {result.recommendation}
            </p>
          </Card>

          <div className="space-y-4">
            <h3 className="font-bold text-base tracking-tight font-display">Question Breakdown & Explanations</h3>
            {questions.map((q, i) => {
              const correct = answers[i] === q.correct_answer;
              return (
                <Card key={i} data-testid={`quiz-review-${i}`}>
                  <div className="flex items-start gap-3">
                    {correct ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-sm text-foreground">{i + 1}. {q.question}</p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Your answer: </span>
                        <span className={correct ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                          {answers[i] || "(No answer)"}
                        </span>
                      </p>
                      {!correct && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Correct answer: </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{q.correct_answer}</span>
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-muted-foreground pt-2 border-t border-border/50 leading-relaxed">
                          <span className="font-semibold text-foreground">Explanation: </span>{q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Button onClick={reset} className="w-full h-11 font-semibold shadow-md shadow-primary/20" data-testid="quiz-retry">
            <RotateCcw className="h-4 w-4 mr-2" /> Start Another Document Quiz
          </Button>
        </div>
      )}
    </Page>
  );
}