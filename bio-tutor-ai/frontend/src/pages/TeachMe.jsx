import { useState, useEffect, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { EmptyState, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Volume2, Pause, Play, Square, Mic, MicOff, ChevronRight, ChevronLeft,
  GraduationCap, Send, FileText, RotateCcw, Sparkles, Lightbulb, BookOpen, Loader2, Bot, User, CheckCircle2
} from "lucide-react";
import { useSpeech, useSpeechInput } from "../hooks/useSpeech";
import TutorAvatar from "../components/TutorAvatar";
import { toast } from "sonner";

export default function TeachMe() {
  const [pdfs, setPdfs] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/pdfs").then((r) => setPdfs(r.data)).catch(() => setPdfs([]));
  }, []);

  const startLearning = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/pdfs/${id}`);
      setPdf(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-12 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  if (!pdf) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-up" data-testid="teach-page">
        <div className="mb-6 pb-4 border-b border-border/50">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary mb-1.5">
            Interactive AI Study Mode
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Teach Me From My Notes
          </h1>
        </div>

        {pdfs === null ? (
          <Spinner />
        ) : pdfs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No study documents uploaded yet"
            description="Upload your Biology lecture notes, PDFs, or PPTs in PDF Study. The AI will generate a structured step-by-step lesson plan."
            action={<a href="/app/pdf"><Button className="font-semibold shadow-md shadow-primary/20">Go to PDF Study Library</Button></a>}
            testid="teach-empty"
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {pdfs.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col hover:border-primary/30 transition-all shadow-sm group" data-testid="teach-pdf-card">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileText className="h-5.5 w-5.5" />
                </div>
                <p className="font-bold text-base text-foreground truncate">{p.filename}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-5">{p.num_pages} pages · {p.topic_name}</p>
                <Button className="mt-auto font-semibold shadow-sm" onClick={() => startLearning(p.id)} data-testid="start-learning-btn">
                  <GraduationCap className="h-4 w-4 mr-2" /> Start AI Lesson
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
  const [focusedPanel, setFocusedPanel] = useState(null);
  const doubtEndRef = useRef(null);

  const { supported: ttsSupported, speaking, paused, speak, pause, resume, stop } = useSpeech();
  const { listening, start, stop: stopMic, supported: sttSupported } = useSpeechInput((t) => setDoubt(t));

  const lesson = plan[lessonIdx] || { title: "", content: [], pages: [] };
  const content = lesson.content || [];
  const currentText = content[contentIdx] || "This lesson has no extractable content.";
  const displayText = simple ? `In simple terms: ${currentText}` : currentText;

  useEffect(() => {
    doubtEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [doubts, asking]);

  useEffect(() => {
    stop();
  }, [lessonIdx, contentIdx]); // eslint-disable-line

  const next = () => {
    if (contentIdx < content.length - 1) setContentIdx((i) => i + 1);
    else if (lessonIdx < plan.length - 1) {
      setLessonIdx((i) => i + 1);
      setContentIdx(0);
    } else toast.info("You've completed all lessons for this document! Start revision.");
  };

  const prev = () => {
    if (contentIdx > 0) setContentIdx((i) => i - 1);
    else if (lessonIdx > 0) {
      const pl = plan[lessonIdx - 1];
      setLessonIdx((i) => i - 1);
      setContentIdx((pl.content?.length || 1) - 1);
    }
  };

  const nextTopic = () => {
    if (lessonIdx < plan.length - 1) {
      setLessonIdx((i) => i + 1);
      setContentIdx(0);
    }
  };

  const prevTopic = () => {
    if (lessonIdx > 0) {
      setLessonIdx((i) => i - 1);
      setContentIdx(0);
    }
  };

  const askDoubt = async (text, isExample = false) => {
    const question = (text ?? doubt).trim();
    if (!question) return;
    setDoubts((d) => [...d, { role: "user", text: question }]);
    setDoubt("");
    setAsking(true);
    try {
      const { data } = await api.post(`/pdfs/${pdf.id}/teach/ask`, {
        question,
        context: currentText.slice(0, 400),
        is_example: isExample,
      });
      setDoubts((d) => [
        ...d,
        { role: "ai", text: data.answer, source: data.source, confidence: data.confidence },
      ]);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setAsking(false);
    }
  };

  const totalSteps = plan.reduce((a, l) => a + (l.content?.length || 0), 0) || 1;
  const doneSteps =
    plan.slice(0, lessonIdx).reduce((a, l) => a + (l.content?.length || 0), 0) + contentIdx + 1;
  const progress = Math.round((doneSteps / totalSteps) * 100);

  const focusModeClass = focusedPanel ? "lg:grid-cols-1" : "lg:grid-cols-12";
  const showLessonSidebar = !focusedPanel;
  const showMainLesson = !focusedPanel || focusedPanel === "lesson";
  const showDoubtPanel = !focusedPanel || focusedPanel === "doubts";

  return (
    <div className={`h-[calc(100vh-3.5rem)] lg:h-screen grid grid-cols-1 ${focusModeClass} overflow-hidden bg-background min-h-0`} data-testid="teaching-room">
      {/* LEFT: Notes / Lesson Tree Sidebar */}
      {showLessonSidebar ? (
        <div className="hidden lg:flex lg:col-span-3 border-r border-border flex-col overflow-hidden bg-card min-h-0">
        <div className="h-14 border-b border-border flex items-center px-4 gap-2.5">
          <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
          <span className="text-xs font-bold truncate flex-1 font-display text-foreground">{pdf.filename}</span>
          <button
            onClick={onExit}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
            data-testid="teach-exit"
          >
            Exit Room
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">Lesson Units</p>
          {plan.map((l, i) => (
            <button
              key={i}
              onClick={() => {
                setLessonIdx(i);
                setContentIdx(0);
              }}
              data-testid={`lesson-${i}`}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all ${
                i === lessonIdx
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <p className="font-bold truncate">{l.title}</p>
              <p className={`text-[11px] truncate mt-0.5 ${i === lessonIdx ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {l.subtitle}
              </p>
            </button>
          ))}
        </div>
        </div>
      ) : null}

      {/* CENTER: AI Teaching Content Room */}
      {showMainLesson ? (
      <div className={`${focusedPanel === "lesson" ? "lg:col-span-1" : "lg:col-span-6"} border-r border-border flex flex-col overflow-hidden relative bg-card min-h-0`}>
        <div className="h-14 border-b border-border flex items-center px-5 gap-4 bg-card">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate font-display">{lesson.title}</p>
            <div className="h-1.5 w-full max-w-xs rounded-full bg-muted mt-1 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={focusedPanel === "lesson" ? "default" : "outline"}
              className="h-8 px-2 text-[11px]"
              onClick={() => setFocusedPanel((p) => (p === "lesson" ? null : "lesson"))}
              data-testid="teach-focus-lesson"
            >
              {focusedPanel === "lesson" ? "Restore view" : "Focus lesson"}
            </Button>
            <Button
              size="sm"
              variant={focusedPanel === "doubts" ? "default" : "outline"}
              className="h-8 px-2 text-[11px]"
              onClick={() => setFocusedPanel((p) => (p === "doubts" ? null : "doubts"))}
              data-testid="teach-focus-doubts"
            >
              {focusedPanel === "doubts" ? "Restore view" : "Focus doubts"}
            </Button>
          </div>
          <span className="text-xs font-bold text-primary shrink-0">{progress}% complete</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Concept Step {contentIdx + 1} of {content.length || 1}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-display">
            {lesson.title?.replace(/^Lesson \d+ — /, "")}
          </h2>

          <div className="p-5 rounded-2xl border border-border bg-muted/20 text-sm leading-relaxed text-foreground shadow-2xs whitespace-pre-line" data-testid="teach-content">
            {displayText}
          </div>

          {(lesson.sources?.length > 0 || lesson.pages?.length > 0) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Extracted from document · {(lesson.sources || lesson.pages.map((n) => `Page ${n}`)).join(", ")}</span>
            </p>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="border-t border-border p-4 space-y-3 bg-card">
          <div className="flex flex-wrap gap-2">
            {ttsSupported ? (
              <>
                {!speaking && (
                  <Button size="sm" className="font-semibold shadow-sm" onClick={() => speak(displayText)} data-testid="teach-speak">
                    <Volume2 className="h-4 w-4 mr-1.5" /> Read Aloud
                  </Button>
                )}
                {speaking && !paused && (
                  <Button size="sm" variant="outline" onClick={pause} data-testid="teach-pause">
                    <Pause className="h-4 w-4 mr-1.5" /> Pause
                  </Button>
                )}
                {speaking && paused && (
                  <Button size="sm" variant="outline" onClick={resume} data-testid="teach-resume">
                    <Play className="h-4 w-4 mr-1.5" /> Resume
                  </Button>
                )}
                {speaking && (
                  <Button size="sm" variant="ghost" onClick={stop} data-testid="teach-stop">
                    <Square className="h-4 w-4 mr-1.5" /> Stop
                  </Button>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Voice not supported in this browser</span>
            )}
            <Button size="sm" variant="outline" onClick={() => speak(displayText)} data-testid="teach-explain-again">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Repeat
            </Button>
            <Button size="sm" variant={simple ? "default" : "outline"} onClick={() => setSimple((s) => !s)} data-testid="teach-simplify">
              <Lightbulb className="h-4 w-4 mr-1.5" /> Simplify
            </Button>
            <Button size="sm" variant="outline" onClick={() => askDoubt(`Give me an example related to: ${lesson.title}`, true)} data-testid="teach-example">
              <Sparkles className="h-4 w-4 mr-1.5" /> Example
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            <Button size="sm" variant="outline" onClick={prev} disabled={lessonIdx === 0 && contentIdx === 0} data-testid="teach-prev">
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button size="sm" className="font-semibold shadow-sm" onClick={next} data-testid="teach-continue">
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="sm" variant="ghost" onClick={prevTopic} data-testid="teach-prev-topic">Prev Unit</Button>
            <Button size="sm" variant="ghost" onClick={nextTopic} data-testid="teach-next-topic">Next Unit</Button>
          </div>
        </div>
      </div>
      ) : null}

      {/* RIGHT: Avatar & Doubt Clearing Panel */}
      {showDoubtPanel ? (
      <div className={`${focusedPanel === "doubts" ? "lg:col-span-1" : "lg:col-span-3"} flex flex-col overflow-hidden bg-card min-h-0`}>
        <TutorAvatar speaking={speaking} paused={paused} lessonTitle={lesson.title?.replace(/^Lesson \d+ — /, "") || "Biology"} />

        <div className="h-12 border-b border-t border-border flex items-center px-4 gap-2 bg-muted/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold font-display text-foreground flex-1">Ask Doubts & Clarifications</span>
          {focusedPanel === "doubts" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-[11px]"
              onClick={() => setFocusedPanel(null)}
              data-testid="teach-restore-doubts"
            >
              Restore view
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" data-testid="doubt-messages">
          {doubts.length === 0 && (
            <p className="text-xs text-muted-foreground leading-relaxed p-2">
              Ask doubts anytime — e.g. "Explain ATP synthesis", "What is photolysis?", or click "Give Example".
            </p>
          )}
          {doubts.map((d, i) => (
            <div key={i} className={d.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                  d.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                    : "border border-border bg-muted/40 rounded-tl-xs text-foreground"
                }`}
              >
                <p>{d.text}</p>
                {d.role === "ai" && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] pt-1 border-t border-border/40">
                    {ttsSupported && (
                      <button onClick={() => speak(d.text)} className="text-primary font-semibold hover:underline flex items-center gap-1">
                        <Volume2 className="h-3 w-3" /> Speak
                      </button>
                    )}
                    {d.source && <span className="text-muted-foreground truncate">{d.source}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Thinking…
            </div>
          )}
          <div ref={doubtEndRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); askDoubt(); }} className="border-t border-border p-3 flex gap-2 mt-auto">
          {sttSupported && (
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "outline"}
              onClick={listening ? stopMic : start}
              className="h-10 w-10 shrink-0"
              data-testid="doubt-voice"
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Input
            value={doubt}
            onChange={(e) => setDoubt(e.target.value)}
            placeholder="Type a doubt…"
            className="h-10 rounded-xl bg-muted/40 text-xs"
            data-testid="doubt-input"
          />
          <Button type="submit" size="icon" disabled={asking} className="h-10 w-10 shrink-0" data-testid="doubt-send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      ) : null}
    </div>
  );
}

