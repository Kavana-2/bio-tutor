import { useState, useEffect, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { EmptyState, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Volume2, Pause, Play, Square, Mic, MicOff, ChevronRight, ChevronLeft,
  GraduationCap, Send, FileText, RotateCcw, Sparkles, Lightbulb, BookOpen, Loader2
} from "lucide-react";
import { useSpeech, useSpeechInput } from "../hooks/useSpeech";
import TutorAvatar from "../components/TutorAvatar";
import { toast } from "sonner";

export default function TeachMe() {
  const [pdfs, setPdfs] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/pdfs").then((r) => setPdfs(r.data)).catch(() => setPdfs([])); }, []);

  const startLearning = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/pdfs/${id}`);
      setPdf(data);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="p-8"><Spinner /></div>;

  if (!pdf) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-up" data-testid="teach-page">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Learn Mode</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Teach Me From My Notes</h1>
        {pdfs === null ? <Spinner /> : pdfs.length === 0 ? (
          <EmptyState icon={FileText} title="Upload notes first"
            description="Head to PDF Study and upload your Biology notes. The AI will build a lesson plan from your actual content."
            action={<a href="/app/pdf"><Button>Go to PDF Study</Button></a>} testid="teach-empty" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pdfs.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-6 flex flex-col" data-testid="teach-pdf-card">
                <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="font-medium truncate">{p.filename}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{p.num_pages} pages · {p.topic_name}</p>
                <Button className="mt-auto" onClick={() => startLearning(p.id)} data-testid="start-learning-btn">
                  <GraduationCap className="h-4 w-4 mr-1" /> Start Learning
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <TeachingRoom pdf={pdf} onExit={() => setPdf(null)} />;
}

function TeachingRoom({ pdf, onExit }) {
  const plan = pdf.teaching_plan || [];
  const [lessonIdx, setLessonIdx] = useState(0);
  const [contentIdx, setContentIdx] = useState(0);
  const [doubts, setDoubts] = useState([]);
  const [doubt, setDoubt] = useState("");
  const [asking, setAsking] = useState(false);
  const [simple, setSimple] = useState(false);
  const doubtEndRef = useRef(null);

  const { supported: ttsSupported, speaking, paused, speak, pause, resume, stop } = useSpeech();
  const { listening, start, stop: stopMic, supported: sttSupported } = useSpeechInput((t) => setDoubt(t));

  const lesson = plan[lessonIdx] || { title: "", content: [], pages: [] };
  const content = lesson.content || [];
  const currentText = content[contentIdx] || "This lesson has no extractable content.";
  const displayText = simple ? `In simple terms: ${currentText}` : currentText;

  useEffect(() => { doubtEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [doubts, asking]);
  useEffect(() => { stop(); }, [lessonIdx, contentIdx]); // eslint-disable-line

  const next = () => {
    if (contentIdx < content.length - 1) setContentIdx((i) => i + 1);
    else if (lessonIdx < plan.length - 1) { setLessonIdx((i) => i + 1); setContentIdx(0); }
    else toast.info("You've reached the end. Start revision!");
  };
  const prev = () => {
    if (contentIdx > 0) setContentIdx((i) => i - 1);
    else if (lessonIdx > 0) { const pl = plan[lessonIdx - 1]; setLessonIdx((i) => i - 1); setContentIdx((pl.content?.length || 1) - 1); }
  };
  const nextTopic = () => { if (lessonIdx < plan.length - 1) { setLessonIdx((i) => i + 1); setContentIdx(0); } };
  const prevTopic = () => { if (lessonIdx > 0) { setLessonIdx((i) => i - 1); setContentIdx(0); } };

  const askDoubt = async (text, isExample = false) => {
    const question = (text ?? doubt).trim();
    if (!question) return;
    setDoubts((d) => [...d, { role: "user", text: question }]);
    setDoubt("");
    setAsking(true);
    try {
      const { data } = await api.post(`/pdfs/${pdf.id}/teach/ask`, {
        question, context: currentText.slice(0, 400), is_example: isExample,
      });
      setDoubts((d) => [...d, { role: "ai", text: data.answer, source: data.source, confidence: data.confidence }]);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setAsking(false); }
  };

  const totalSteps = plan.reduce((a, l) => a + (l.content?.length || 0), 0) || 1;
  const doneSteps = plan.slice(0, lessonIdx).reduce((a, l) => a + (l.content?.length || 0), 0) + contentIdx + 1;
  const progress = Math.round((doneSteps / totalSteps) * 100);

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden" data-testid="teaching-room">
      {/* LEFT: Notes / Pages / Lessons */}
      <div className="hidden lg:flex lg:col-span-3 border-r border-border flex-col overflow-hidden">
        <div className="h-14 border-b border-border flex items-center px-4 gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate flex-1">{pdf.filename}</span>
          <button onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground" data-testid="teach-exit">Exit</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Lesson Plan</p>
          {plan.map((l, i) => (
            <button key={i} onClick={() => { setLessonIdx(i); setContentIdx(0); }}
              data-testid={`lesson-${i}`}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${i === lessonIdx ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              <p className="font-medium truncate">{l.title}</p>
              <p className={`text-xs truncate ${i === lessonIdx ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{l.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: AI Teaching */}
      <div className="lg:col-span-6 border-r border-border flex flex-col overflow-hidden relative">
        <div className="h-14 border-b border-border flex items-center px-5 gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{lesson.title}</p>
            <div className="h-1.5 w-full max-w-xs rounded-full bg-secondary mt-1 overflow-hidden">
              <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Current Concept · Step {contentIdx + 1}/{content.length || 1}</p>
          <h2 className="text-xl font-bold tracking-tight mb-4">{lesson.title?.replace(/^Lesson \d+ — /, "")}</h2>
          <div className="prose-sm text-base leading-relaxed" data-testid="teach-content">{displayText}</div>
          {(lesson.sources?.length > 0 || lesson.pages?.length > 0) && (
            <p className="text-xs text-muted-foreground mt-6">From your notes · {(lesson.sources || lesson.pages.map((n) => `Page ${n}`)).join(", ")}</p>
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3 bg-card">
          <div className="flex flex-wrap gap-2">
            {ttsSupported ? (
              <>
                {!speaking && <Button size="sm" onClick={() => speak(displayText)} data-testid="teach-speak"><Volume2 className="h-4 w-4 mr-1" /> Speak</Button>}
                {speaking && !paused && <Button size="sm" variant="outline" onClick={pause} data-testid="teach-pause"><Pause className="h-4 w-4 mr-1" /> Pause</Button>}
                {speaking && paused && <Button size="sm" variant="outline" onClick={resume} data-testid="teach-resume"><Play className="h-4 w-4 mr-1" /> Resume</Button>}
                {speaking && <Button size="sm" variant="ghost" onClick={stop} data-testid="teach-stop"><Square className="h-4 w-4 mr-1" /> Stop</Button>}
              </>
            ) : <span className="text-xs text-muted-foreground">Voice not supported in this browser — read the text above.</span>}
            <Button size="sm" variant="outline" onClick={() => speak(displayText)} data-testid="teach-explain-again"><RotateCcw className="h-4 w-4 mr-1" /> Explain Again</Button>
            <Button size="sm" variant={simple ? "default" : "outline"} onClick={() => setSimple((s) => !s)} data-testid="teach-simplify"><Lightbulb className="h-4 w-4 mr-1" /> Simplify</Button>
            <Button size="sm" variant="outline" onClick={() => askDoubt(`Give me an example related to: ${lesson.title}`, true)} data-testid="teach-example"><Sparkles className="h-4 w-4 mr-1" /> Give Example</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={prev} disabled={lessonIdx === 0 && contentIdx === 0} data-testid="teach-prev"><ChevronLeft className="h-4 w-4" /> Back</Button>
            <Button size="sm" onClick={next} data-testid="teach-continue">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
            <Button size="sm" variant="ghost" onClick={prevTopic} data-testid="teach-prev-topic">Prev Topic</Button>
            <Button size="sm" variant="ghost" onClick={nextTopic} data-testid="teach-next-topic">Next Topic</Button>
            <Button size="sm" variant="ghost" onClick={() => { setLessonIdx(plan.length - 1); setContentIdx(0); }} data-testid="teach-revision"><BookOpen className="h-4 w-4 mr-1" /> Revision</Button>
          </div>
        </div>
      </div>

      {/* RIGHT: Doubts */}
      <div className="lg:col-span-3 flex flex-col overflow-hidden">
        <TutorAvatar speaking={speaking} paused={paused} lessonTitle={lesson.title?.replace(/^Lesson \d+ — /, "") || "Biology"} />
        <div className="h-14 border-b border-border flex items-center px-4 gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Ask a Doubt</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="doubt-messages">
          {doubts.length === 0 && (
            <p className="text-sm text-muted-foreground">Interrupt anytime — ask "What is ATP?", "Explain again", or "Give an example". Then hit Continue to resume where you left off.</p>
          )}
          {doubts.map((d, i) => (
            <div key={i} className={d.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${d.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "border border-border bg-background rounded-bl-sm"}`}>
                <p className="leading-relaxed">{d.text}</p>
                {d.role === "ai" && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {ttsSupported && <button onClick={() => speak(d.text)} className="text-primary hover:underline flex items-center gap-1"><Volume2 className="h-3 w-3" /> Speak</button>}
                    {d.source && <span className="text-muted-foreground truncate">{d.source}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {asking && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
          <div ref={doubtEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); askDoubt(); }} className="border-t border-border p-3 flex gap-2">
          {sttSupported && (
            <Button type="button" size="icon" variant={listening ? "default" : "outline"} onClick={listening ? stopMic : start} data-testid="doubt-voice">
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Input value={doubt} onChange={(e) => setDoubt(e.target.value)} placeholder="Ask a doubt…" data-testid="doubt-input" />
          <Button type="submit" size="icon" disabled={asking} data-testid="doubt-send"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
