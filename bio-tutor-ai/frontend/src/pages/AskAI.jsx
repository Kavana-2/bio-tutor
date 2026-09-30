import { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Page } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Send, Loader2, ShieldAlert, Sparkles, Lightbulb, Bot, User, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "What is photosynthesis?",
  "Why does the stomach need HCl?",
  "How does gas exchange happen in alveoli?",
];
const CLARIFY_ACTIONS = ["I don't understand", "Explain more simply", "Give an example", "Explain step-by-step"];

export default function AskAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [pdfId, setPdfId] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/pdfs").then((r) => {
      setPdfs(r.data);
      if (r.data[0]) setPdfId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lastAnswer = () => [...messages].reverse().find((m) => m.role === "ai" && m.in_domain);

  const ask = async (value, ref, clarificationAction) => {
    const question = (value ?? input).trim();
    if (!question || loading) return;
    const prev = ref || lastAnswer();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/ai/ask", {
        question,
        pdf_id: pdfId || null,
        previous_question: prev?.originalQuestion || null,
        previous_answer: prev?.answer || null,
        clarification_action: clarificationAction || null,
      });
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          ...data,
          originalQuestion: data.clarification ? prev?.originalQuestion || question : question,
        },
      ]);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const clarify = (message, request) => {
    const actions = {
      "Give an example": "example",
      "Explain more simply": "simplify",
      "Explain step-by-step": "step_by_step",
      "I don't understand": "repeat",
    };
    ask(request, message, actions[request]);
  };

  return (
    <Page title="Ask BioTutor AI" subtitle="Domain-Restricted Q&A" testid="ask-page">
      {/* Scope Header Bar */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-sm">
        <div>
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Verified Biology Knowledge Base
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Answers are retrieved from your selected document notes first, then verified Biology datasets.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground hidden sm:inline-block" />
          <select
            value={pdfId}
            onChange={(e) => setPdfId(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
            data-testid="ask-pdf-select"
          >
            <option value="">Biology Dataset (Default)</option>
            {pdfs.map((pdf) => (
              <option key={pdf.id} value={pdf.id}>
                {pdf.filename}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chat Panel Container */}
      <div
        className="rounded-2xl border border-border bg-card shadow-sm flex flex-col min-h-[calc(100vh-17rem)] overflow-hidden"
        data-testid="ask-chat-panel"
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="ask-messages">
          {!messages.length && (
            <div className="h-full min-h-80 flex flex-col items-center justify-center text-center p-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 shadow-sm">
                <Bot className="h-8 w-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-display">
                What topic are you studying today?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
                Ask any question about <span className="font-semibold text-foreground">Photosynthesis</span>, the{" "}
                <span className="font-semibold text-foreground">Digestive System</span>, or the{" "}
                <span className="font-semibold text-foreground">Respiratory System</span>.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
                    data-testid={`ask-suggestion-${SUGGESTIONS.indexOf(s)}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end gap-3">
                <div
                  className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-5 py-3.5 text-sm shadow-sm leading-relaxed"
                  data-testid={`ask-user-message-${i}`}
                >
                  {m.text}
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 self-end">
                  <User className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div
                  className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tl-xs border border-border bg-muted/30 p-5 shadow-sm space-y-3"
                  data-testid={`ask-ai-message-${i}`}
                >
                  {m.source === "domain_restriction" && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full w-fit">
                      <ShieldAlert className="h-4 w-4" /> Biology Domain Scope Required
                    </div>
                  )}

                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{m.answer}</p>

                  {m.clarification && (
                    <div
                      className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg w-fit"
                      data-testid={`ask-clarification-badge-${i}`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {m.example
                        ? m.source?.includes("OpenAI")
                          ? "Example (AI Model)"
                          : "Example from Document Notes"
                        : "Simplified Explanation"}
                    </div>
                  )}

                  {m.in_domain && !m.clarification && (
                    <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" /> Follow-up:
                      </span>
                      {CLARIFY_ACTIONS.map((action) => (
                        <button
                          key={action}
                          onClick={() => clarify(m, action)}
                          className="rounded-full bg-card border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xs"
                          data-testid={`ask-clarify-${i}-${action.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  {m.topic && !m.clarification && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50" data-testid={`ask-source-${i}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{m.source && m.source.startsWith("Your notes") ? m.source : m.topic}</span>
                      <span>·</span>
                      <span>Confidence: {Math.round((m.confidence || 0) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground bg-muted/40 p-3 rounded-2xl w-fit" data-testid="ask-loading">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Retrieving & synthesizing Biology response…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="border-t border-border p-3 sm:p-4 bg-card flex gap-2"
          data-testid="ask-form"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask any question about Photosynthesis, Digestion, or Respiration…"
            className="h-11 rounded-xl bg-muted/40 border-border focus:border-primary text-sm"
            data-testid="ask-input"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-11 px-5 rounded-xl font-semibold shadow-md shadow-primary/20 shrink-0"
            data-testid="ask-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Page>
  );
}