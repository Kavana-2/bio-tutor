import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Page, Card, Skeleton } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { Flame, BookOpen, MessageSquare, Trophy, Target, FileText, TrendingUp, ArrowRight, Sparkles, Dna, Activity } from "lucide-react";
import { Button } from "../components/ui/button";

const TOPIC_LABEL = { photosynthesis: "Photosynthesis", digestion: "Digestive System", respiratory: "Respiratory System" };

function StatWidget({ icon: Icon, label, value, hint, colorClass = "text-primary bg-primary/10" }) {
  return (
    <Card className="flex items-center gap-4 relative overflow-hidden group">
      <div className={`h-12 w-12 rounded-2xl ${colorClass} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground truncate">{label}</p>
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data)
    return (
      <Page title="Dashboard" subtitle="Student Overview">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
      </Page>
    );

  const goalPct = Math.min(100, Math.round((data.today_goal.done / data.today_goal.target) * 100));
  const topicScores = data.topic_scores || {};

  return (
    <Page
      title={`Welcome back, ${user?.name?.split(" ")[0] || "Student"}`}
      subtitle="Study Desk Overview"
      testid="dashboard-page"
    >
      {/* Top Stat Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatWidget icon={Flame} label="Study Streak" value={`${data.study_streak} Days`} colorClass="text-amber-600 bg-amber-500/10 dark:text-amber-400" />
        <StatWidget icon={BookOpen} label="Topics Covered" value={data.topics_covered} colorClass="text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" />
        <StatWidget icon={MessageSquare} label="Questions Answered" value={data.questions_answered} colorClass="text-teal-600 bg-teal-500/10 dark:text-teal-400" />
        <StatWidget icon={Trophy} label="Achievements Unlocked" value={data.achievements?.length || 0} colorClass="text-indigo-600 bg-indigo-500/10 dark:text-indigo-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2-Col: Daily Goal & Performance */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight font-display">Daily Study Goal</h3>
                  <p className="text-xs text-muted-foreground">Target: {data.today_goal.target} practice questions today</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {data.today_goal.done} / {data.today_goal.target} Qs
              </span>
            </div>

            <div className="h-3.5 rounded-full bg-muted overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-medium">
              {goalPct >= 100
                ? "🎯 Daily study goal achieved! Excellent momentum."
                : `${100 - goalPct}% remaining — ask a few more Biology questions today.`}
            </p>

            {/* Quiz Performance Bar Stack */}
            <div className="pt-6 mt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base tracking-tight font-display flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" /> Topic Mastery Breakdown
                </h3>
                <Link to="/app/progress" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  View Analytics <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {Object.keys(topicScores).length === 0 ? (
                <div className="py-6 text-center border border-dashed border-border rounded-xl">
                  <p className="text-xs text-muted-foreground">No quiz data recorded yet. <Link to="/app/quiz" className="text-primary font-semibold hover:underline">Take your first quiz</Link> to generate topic mastery levels.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(topicScores).map(([t, s]) => (
                    <div key={t} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{TOPIC_LABEL[t] || t}</span>
                        <span className={s >= 70 ? "text-emerald-600 dark:text-emerald-400 font-bold" : s >= 45 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                          {s}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            s >= 70 ? "bg-emerald-500" : s >= 45 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${s}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <h3 className="font-bold text-base tracking-tight font-display mb-4 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-primary" /> Recent Study Activity
            </h3>
            {data.recent_activity?.length ? (
              <ul className="space-y-3">
                {data.recent_activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm shadow-primary/50" />
                    <div className="min-w-0 flex-1">
                      <span className="capitalize font-bold text-foreground mr-1.5">{a.kind?.replace("_", " ")}</span>
                      <span className="text-muted-foreground">{a.detail}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No activity logged yet. Start by asking a question or uploading notes!</p>
            )}
          </Card>
        </div>

        {/* Right 1-Col: Recommendations & Notes Quick Access */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <h3 className="font-bold text-base tracking-tight font-display mb-2 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" /> Recommended Focus
            </h3>
            <p className="text-xs text-muted-foreground mb-4">AI recommendation based on your recent quiz scores:</p>
            <div className="rounded-xl bg-card border border-primary/20 p-3.5 font-bold text-sm text-primary mb-4 flex items-center gap-2 shadow-sm">
              <Dna className="h-4 w-4 shrink-0" />
              <span>{TOPIC_LABEL[data.recommended_topic] || "Photosynthesis"}</span>
            </div>
            <Link to="/app/quiz">
              <Button className="w-full font-semibold shadow-md shadow-primary/20" data-testid="dash-quiz-cta">
                Practice Topic Now <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </Card>

          <Card>
            <h3 className="font-bold text-base tracking-tight font-display mb-3 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-primary" /> Continue Note Study
            </h3>
            {data.recent_pdf ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-border bg-muted/30">
                  <p className="text-xs font-bold text-foreground truncate">{data.recent_pdf.filename}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{data.recent_pdf.num_pages} pages · {data.recent_pdf.topic_name}</p>
                </div>
                <Link to="/app/teach">
                  <Button variant="outline" className="w-full font-semibold">
                    Resume AI Lesson
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Upload your lecture notes, PDFs, or PPTs to let the AI build custom lesson plans.
                </p>
                <Link to="/app/pdf">
                  <Button variant="outline" className="w-full font-semibold" data-testid="dash-upload-cta">
                    Upload Notes Library
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

