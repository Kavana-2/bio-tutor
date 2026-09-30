import { useEffect, useState } from "react";
import api from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";

const ALL = [
  { key: "first_question", title: "Curious Mind", description: "Ask your first question in Ask AI" },
  { key: "first_pdf", title: "Note Taker", description: "Upload your first study document to PDF Study" },
  { key: "quiz_starter", title: "Quiz Starter", description: "Complete your first generated quiz" },
  { key: "scholar", title: "Biology Scholar", description: "Complete 5 quiz sessions with high scores" },
];

export default function Achievements() {
  const [earned, setEarned] = useState(null);

  useEffect(() => {
    api.get("/achievements").then((r) => setEarned(r.data.map((a) => a.key)));
  }, []);

  if (earned === null)
    return (
      <Page title="Student Achievements">
        <Spinner />
      </Page>
    );

  return (
    <Page title="Student Milestones & Badges" subtitle="Academic Progress Rewards" testid="achievements-page">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ALL.map((a) => {
          const got = earned.includes(a.key);
          return (
            <Card
              key={a.key}
              className={`flex flex-col justify-between transition-all ${
                got ? "border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm" : "opacity-60 bg-muted/20"
              }`}
              data-testid={`achievement-${a.key}`}
            >
              <div>
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
                    got
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {got ? <Trophy className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <p className="font-bold text-base text-foreground font-display">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-border/50">
                {got ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

