import { useEffect, useState } from "react";
import api from "../lib/api";
import { Page, Card, EmptyState } from "../components/common";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { TrendingUp, MessageSquare, FileText, Layers, Flame } from "lucide-react";

const LABEL = { photosynthesis: "Photosynthesis", digestion: "Digestion", respiratory: "Respiratory" };

export default function Progress() {
  const [p, setP] = useState(null);
  useEffect(() => { api.get("/progress").then((r) => setP(r.data)); }, []);
  if (!p) return <Page title="Progress"><div className="h-40" /></Page>;

  const chartData = Object.entries(p.topic_scores).map(([k, v]) => ({ name: LABEL[k] || k, score: v }));

  return (
    <Page title="Progress & Analytics" subtitle="Your performance" testid="progress-page">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[[Flame, "Study streak", p.study_streak], [MessageSquare, "Questions", p.questions_answered],
          [FileText, "PDFs studied", p.pdfs_studied], [Layers, "Cards mastered", p.flashcards_mastered]].map(([Icon, l, v], i) => (
          <Card key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center"><Icon className="h-5 w-5 text-accent-foreground" /></div>
            <div><p className="text-2xl font-bold tracking-tight">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold tracking-tight mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Topic Mastery</h3>
          {chartData.length === 0 ? (
            <EmptyState title="No quiz data yet" description="Take quizzes to build your topic mastery chart." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.score >= 70 ? "hsl(158 64% 40%)" : d.score >= 45 ? "hsl(221 83% 53%)" : "hsl(0 72% 51%)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold tracking-tight mb-3">Weak Areas</h3>
            {p.weak_concepts?.length ? (
              <div className="flex flex-wrap gap-2">{p.weak_concepts.map((c, i) => <span key={i} className="text-xs rounded-full bg-destructive/10 text-destructive px-2 py-1">{c}</span>)}</div>
            ) : <p className="text-sm text-muted-foreground">No weak areas identified yet.</p>}
          </Card>
          <Card>
            <h3 className="font-semibold tracking-tight mb-3">Recommended Focus</h3>
            <div className="rounded-md bg-accent px-4 py-3 font-medium text-accent-foreground">{LABEL[p.recommended_topic] || "Photosynthesis"}</div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
