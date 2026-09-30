import { useState, useEffect } from "react";
import api from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { ClipboardList, Volume2, HelpCircle, CheckCircle2 } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";

const TOPICS = [
  ["all", "All Topics"],
  ["photosynthesis", "Photosynthesis"],
  ["digestion", "Digestive System"],
  ["respiratory", "Respiratory System"],
];

export default function ExamMode() {
  const [topic, setTopic] = useState("all");
  const [data, setData] = useState(null);
  const { speak, supported } = useSpeech();

  useEffect(() => {
    setData(null);
    api.get("/exam/generate", { params: { topic } }).then((r) => setData(r.data));
  }, [topic]);

  return (
    <Page
      title="Exam Practice & Preparation"
      subtitle="Structured Exam Questions & Answers"
      testid="exam-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-52 h-10 rounded-xl bg-card border-border font-semibold text-xs" data-testid="exam-topic">
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
      {!data ? (
        <Spinner />
      ) : (
        <Tabs defaultValue="marks" className="max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-3 h-11 p-1 rounded-2xl bg-muted/60 max-w-md mb-6" data-testid="exam-tabs">
            <TabsTrigger value="marks" className="rounded-xl font-bold text-xs">Descriptive Qs</TabsTrigger>
            <TabsTrigger value="mcqs" className="rounded-xl font-bold text-xs">Exam MCQs</TabsTrigger>
            <TabsTrigger value="viva" className="rounded-xl font-bold text-xs">Viva Voce</TabsTrigger>
          </TabsList>

          <TabsContent value="marks" className="space-y-6">
            {[
              ["two_mark", "2-Mark Short Answer Questions"],
              ["five_mark", "5-Mark Medium Explanations"],
              ["ten_mark", "10-Mark Comprehensive Essays"]
            ].map(([k, label]) => (
              <Card key={k}>
                <h3 className="font-bold text-base tracking-tight font-display mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4.5 w-4.5 text-primary" /> {label}
                </h3>
                <div className="space-y-3">
                  {(data[k] || []).map((q, i) => (
                    <details key={i} className="group rounded-xl border border-border bg-card p-4 transition-all">
                      <summary className="font-bold text-xs sm:text-sm cursor-pointer text-foreground flex items-center justify-between">
                        <span>{i + 1}. {q.question}</span>
                        <span className="text-xs text-primary font-semibold group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-3 pt-3 border-t border-border/50 leading-relaxed">
                        <span className="font-bold text-foreground block mb-1">Model Answer:</span>
                        {q.answer}
                      </p>
                    </details>
                  ))}
                  {(data[k] || []).length === 0 && <p className="text-xs text-muted-foreground py-2">No questions available for this category.</p>}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mcqs" className="space-y-4">
            {data.mcqs.map((m, i) => (
              <Card key={i}>
                <p className="font-bold text-sm text-foreground mb-3">{i + 1}. {m.question}</p>
                <ul className="space-y-1.5 text-xs font-semibold">
                  {m.options.map((o, j) => (
                    <li
                      key={j}
                      className={`p-2.5 rounded-xl border ${
                        j === m.correct_index
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-border/60 text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + j)}. {o}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="viva" className="space-y-4">
            {data.viva.map((v, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-sm text-foreground">Q: {v.question}</p>
                    <p className="text-muted-foreground leading-relaxed">A: {v.answer}</p>
                  </div>
                  {supported && (
                    <button
                      onClick={() => speak(`${v.question}. ${v.answer}`)}
                      className="p-2 rounded-xl text-primary hover:bg-primary/10 shrink-0 transition-colors"
                      title="Read aloud"
                    >
                      <Volume2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </Page>
  );
}

