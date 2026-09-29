import { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Page } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Send, Loader2, ShieldAlert, Sparkles, Lightbulb } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = ["What is photosynthesis?", "Why does the stomach need HCl?", "How does gas exchange happen in alveoli?"];
const CLARIFY_ACTIONS = ["I don't understand", "Explain more simply", "Give an example", "Explain step-by-step"];

export default function AskAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [pdfId, setPdfId] = useState("");
  const endRef = useRef(null);
  useEffect(() => { api.get("/pdfs").then((r) => { setPdfs(r.data); if (r.data[0]) setPdfId(r.data[0].id); }).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const lastAnswer = () => [...messages].reverse().find((m) => m.role === "ai" && m.in_domain);

  const ask = async (value, ref, clarificationAction) => {
    const question = (value ?? input).trim();
    if (!question || loading) return;
    const prev = ref || lastAnswer();
    setMessages((m) => [...m, { role: "user", text: question }]); setInput(""); setLoading(true);
    try {
      const { data } = await api.post("/ai/ask", { question, pdf_id: pdfId || null,
        previous_question: prev?.originalQuestion || null, previous_answer: prev?.answer || null,
        clarification_action: clarificationAction || null });
      setMessages((m) => [...m, { role: "ai", ...data, originalQuestion: data.clarification ? prev?.originalQuestion || question : question }]);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
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

  return <Page title="Ask BioTutor" subtitle="Restricted Biology Q&A" testid="ask-page">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-foreground">Your Biology study desk</p><p className="text-xs text-muted-foreground">Answers come from your selected notes first, then the Biology dataset. Type "I don't understand" any time for a simpler explanation.</p></div>
      <select value={pdfId} onChange={(e) => setPdfId(e.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm" data-testid="ask-pdf-select">
        <option value="">Biology dataset only</option>{pdfs.map((pdf) => <option key={pdf.id} value={pdf.id}>{pdf.filename}</option>)}
      </select>
    </div>
    <div className="rounded-2xl border border-pink-100 bg-white/85 shadow-sm flex flex-col min-h-[calc(100vh-16rem)]" data-testid="ask-chat-panel">
      <div className="flex-1 overflow-y-auto p-5 lg:p-8 space-y-6" data-testid="ask-messages">
        {!messages.length && <div className="h-full min-h-80 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-pink-100 flex items-center justify-center mb-5"><Sparkles className="h-7 w-7 text-pink-500" /></div>
          <h2 className="text-xl font-bold">What are you exploring today?</h2><p className="text-sm text-muted-foreground mt-2 max-w-lg">Ask about Photosynthesis, the Digestive System, or the Respiratory System.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-6">{SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-sm hover:bg-pink-100 transition-colors" data-testid={`ask-suggestion-${SUGGESTIONS.indexOf(s)}`}>{s}</button>)}</div>
        </div>}
        {messages.map((m, i) => m.role === "user" ? <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-pink-500 text-white px-5 py-3 text-sm shadow-sm" data-testid={`ask-user-message-${i}`}>{m.text}</div></div> : <div key={i} className="flex justify-start"><div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-sky-100 bg-sky-50/60 px-5 py-4" data-testid={`ask-ai-message-${i}`}>
          {m.source === "domain_restriction" && <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 mb-2"><ShieldAlert className="h-4 w-4" /> Biology scope only</div>}
          <p className="text-sm leading-7 whitespace-pre-wrap">{m.answer}</p>
          {m.clarification && <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 mb-2" data-testid={`ask-clarification-badge-${i}`}><Sparkles className="h-3.5 w-3.5" />{m.example ? (m.source?.includes("OpenAI") ? " Example (OpenAI)" : " Example from your notes") : " Local explanation"}</div>}
          {m.in_domain && !m.clarification && <div className="mt-4 pt-3 border-t border-sky-200 flex flex-wrap gap-2"><span className="text-xs text-muted-foreground mr-1 self-center"><Lightbulb className="inline h-3.5 w-3.5 mr-1" />Need help?</span>{CLARIFY_ACTIONS.map((action) => <button key={action} onClick={() => clarify(m, action)} className="rounded-full bg-white border border-sky-200 px-3 py-1.5 text-xs font-medium hover:bg-pink-50 hover:border-pink-200 transition-colors" data-testid={`ask-clarify-${i}-${action.toLowerCase().replaceAll(" ", "-")}`}>{action}</button>)}</div>}
          {m.topic && !m.clarification && <p className="text-xs text-muted-foreground mt-3" data-testid={`ask-source-${i}`}>{m.source && m.source.startsWith("Your notes") ? m.source : m.topic} · Confidence {Math.round((m.confidence || 0) * 100)}%</p>}
        </div></div>)}
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="ask-loading"><Loader2 className="h-4 w-4 animate-spin text-pink-500" /> Preparing your Biology explanation…</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="border-t border-pink-100 p-4 flex gap-2" data-testid="ask-form">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a Biology question…" data-testid="ask-input" />
        <Button type="submit" disabled={loading || !input.trim()} data-testid="ask-send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  </Page>;
}