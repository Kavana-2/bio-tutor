import { useState, useEffect } from "react";
import api from "../lib/api";
import { Page, Card, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { ClipboardList, Volume2 } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";

const TOPICS = [["all", "All Topics"], ["photosynthesis", "Photosynthesis"], ["digestion", "Digestive System"], ["respiratory", "Respiratory System"]];

export default function ExamMode() {
  const [topic, setTopic] = useState("all");
  const [data, setData] = useState(null);
  const { speak, supported } = useSpeech();

  useEffect(() => { setData(null); api.get("/exam/generate", { params: { topic } }).then((r) => setData(r.data)); }, [topic]);

  return (
    <Page title="Exam Mode" subtitle="Exam preparation" testid="exam-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-48" data-testid="exam-topic"><SelectValue /></SelectTrigger>
          <SelectContent>{TOPICS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      }>
      {!data ? <Spinner /> : (
        <Tabs defaultValue="marks">
          <TabsList data-testid="exam-tabs">
            <TabsTrigger value="marks">Marks</TabsTrigger>
            <TabsTrigger value="mcqs">MCQs</TabsTrigger>
            <TabsTrigger value="viva">Viva</TabsTrigger>
          </TabsList>

          <TabsContent value="marks" className="space-y-4 mt-4">
            {[["two_mark", "2-Mark Questions"], ["five_mark", "5-Mark Questions"], ["ten_mark", "10-Mark Questions"]].map(([k, label]) => (
              <Card key={k}>
                <h3 className="font-semibold tracking-tight mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> {label}</h3>
                <div className="space-y-3">
                  {(data[k] || []).map((q, i) => (
                    <details key={i} className="rounded-md border border-border p-3">
                      <summary className="font-medium cursor-pointer text-sm">{i + 1}. {q.question}</summary>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{q.answer}</p>
                    </details>
                  ))}
                  {(data[k] || []).length === 0 && <p className="text-sm text-muted-foreground">No questions available.</p>}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mcqs" className="space-y-3 mt-4">
            {data.mcqs.map((m, i) => (
              <Card key={i}>
                <p className="font-medium mb-2">{i + 1}. {m.question}</p>
                <ul className="space-y-1 text-sm">{m.options.map((o, j) => (
                  <li key={j} className={j === m.correct_index ? "text-success font-medium" : "text-muted-foreground"}>{String.fromCharCode(65 + j)}. {o}</li>
                ))}</ul>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="viva" className="space-y-3 mt-4">
            {data.viva.map((v, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Q: {v.question}</p>
                    <p className="text-sm text-muted-foreground mt-1">A: {v.answer}</p>
                  </div>
                  {supported && <button onClick={() => speak(`${v.question}. ${v.answer}`)} className="text-primary shrink-0"><Volume2 className="h-4 w-4" /></button>}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </Page>
  );
}
