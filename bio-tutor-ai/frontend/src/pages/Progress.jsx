import { useEffect, useState } from "react";
import api from "../lib/api";
import { Page, Card, EmptyState, Skeleton } from "../components/common";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { TrendingUp, MessageSquare, FileText, Layers, Flame, Dna, AlertCircle } from "lucide-react";

const LABEL = { photosynthesis: "Photosynthesis", digestion: "Digestive System", respiratory: "Respiratory System" };

export default function Progress() {
  const [p, setP] = useState(null);

  useEffect(() => {
    api.get("/progress").then((r) => setP(r.data));
  }, []);

  if (!p)
    return (
      <Page title="Progress & Analytics" subtitle="Student Performance Dashboard">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </Page>
    );

  const chartData = Object.entries(p.topic_scores).map(([k, v]) => ({ name: LABEL[k] || k, score: v }));

  return (
    <Page title="Progress & Analytics" subtitle="Student Performance Dashboard" testid="progress-page">
      {/* Stat Bar */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          [Flame, "Study Streak", `${p.study_streak} Days`, "text-amber-600 bg-amber-500/10 dark:text-amber-400"],
          [MessageSquare, "Questions Answered", p.questions_answered, "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"],
          [FileText, "PDF Notes Studied", p.pdfs_studied, "text-teal-600 bg-teal-500/10 dark:text-teal-400"],
          [Layers, "Flashcards Mastered", p.flashcards_mastered, "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400"]
        ].map(([Icon, l, v, colorClass], i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className={`h-11 w-11 rounded-2xl ${colorClass} flex items-center justify-center shrink-0`}>
              <Icon className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tracking-tight font-display text-foreground">{v}</p>
              <p className="text-xs font-semibold text-muted-foreground">{l}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Performance Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-base tracking-tight font-display mb-6 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-primary" /> Topic Mastery Score (%)
          </h3>

          {chartData.length === 0 ? (
            <EmptyState title="No quiz data recorded yet" description="Complete quiz sessions to generate your topic mastery chart." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    color: "hsl(var(--foreground))"
                  }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.score >= 70 ? "#10b981" : d.score >= 45 ? "#f59e0b" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-base tracking-tight font-display mb-3 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-rose-500" /> Weak Concepts Identified
            </h3>
            {p.weak_concepts?.length ? (
              <div className="flex flex-wrap gap-2">
                {p.weak_concepts.map((c, i) => (
                  <span key={i} className="text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">No weak concept areas detected yet. Keep up the high quiz scores!</p>
            )}
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <h3 className="font-bold text-base tracking-tight font-display mb-2 flex items-center gap-2">
              <Dna className="h-4.5 w-4.5 text-primary" /> Recommended Study Focus
            </h3>
            <div className="rounded-xl bg-card border border-primary/20 p-3 font-bold text-sm text-primary">
              {LABEL[p.recommended_topic] || "Photosynthesis"}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

