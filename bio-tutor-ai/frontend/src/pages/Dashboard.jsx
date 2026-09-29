import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Page, Card, Skeleton } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { Flame, BookOpen, MessageSquare, Trophy, Target, FileText, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";

const TOPIC_LABEL = { photosynthesis: "Photosynthesis", digestion: "Digestive System", respiratory: "Respiratory System" };

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="h-11 w-11 rounded-md bg-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-accent-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
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
      <Page title="Dashboard" subtitle="Overview">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </Page>
    );

  const goalPct = Math.min(100, Math.round((data.today_goal.done / data.today_goal.target) * 100));
  const topicScores = data.topic_scores || {};

  return (
    <Page title={`Welcome back, ${user?.name?.split(" ")[0] || "Student"}`} subtitle="Dashboard"
      testid="dashboard-page">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Flame} label="Day study streak" value={data.study_streak} />
        <Stat icon={BookOpen} label="Topics covered" value={data.topics_covered} />
        <Stat icon={MessageSquare} label="Questions answered" value={data.questions_answered} />
        <Stat icon={Trophy} label="Achievements" value={data.achievements?.length || 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold tracking-tight">Today's Goal</h3>
            <span className="ml-auto text-sm text-muted-foreground">{data.today_goal.done}/{data.today_goal.target} questions</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {goalPct >= 100 ? "Goal reached! 🎯 Keep the momentum." : `${100 - goalPct}% to go — ask a few more questions today.`}
          </p>

          <h3 className="font-semibold tracking-tight mt-8 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Quiz Performance
          </h3>
          {Object.keys(topicScores).length === 0 ? (
            <p className="text-sm text-muted-foreground">No quizzes yet. <Link to="/app/quiz" className="text-primary hover:underline">Take a quiz</Link> to see performance.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(topicScores).map(([t, s]) => (
                <div key={t}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{TOPIC_LABEL[t] || t}</span>
                    <span className="font-medium">{s}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${s >= 70 ? "bg-success" : s >= 45 ? "bg-primary" : "bg-destructive"}`} style={{ width: `${s}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold tracking-tight mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Recommended</h3>
            <p className="text-sm text-muted-foreground mb-4">Focus next on your weakest area:</p>
            <div className="rounded-md bg-accent px-4 py-3 font-medium text-accent-foreground mb-4">
              {TOPIC_LABEL[data.recommended_topic] || "Photosynthesis"}
            </div>
            <Link to="/app/quiz"><Button className="w-full" data-testid="dash-quiz-cta">Practice now <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          </Card>

          <Card>
            <h3 className="font-semibold tracking-tight mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Continue Learning</h3>
            {data.recent_pdf ? (
              <>
                <p className="text-sm font-medium truncate">{data.recent_pdf.filename}</p>
                <p className="text-xs text-muted-foreground mb-4">{data.recent_pdf.num_pages} pages · {data.recent_pdf.topic_name}</p>
                <Link to="/app/teach"><Button variant="outline" className="w-full">Resume teaching</Button></Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">Upload your notes to start AI teaching.</p>
                <Link to="/app/pdf"><Button variant="outline" className="w-full" data-testid="dash-upload-cta">Upload notes</Button></Link>
              </>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <h3 className="font-semibold tracking-tight mb-4">Recent Activity</h3>
        {data.recent_activity?.length ? (
          <ul className="space-y-2">
            {data.recent_activity.map((a, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="capitalize font-medium">{a.kind?.replace("_", " ")}</span>
                <span className="text-muted-foreground truncate">{a.detail}</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet. Start by asking a question!</p>
        )}
      </Card>
    </Page>
  );
}
