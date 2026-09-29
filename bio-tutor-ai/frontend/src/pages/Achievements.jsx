import { useEffect, useState } from "react";
import api from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Trophy, Lock } from "lucide-react";

const ALL = [
  { key: "first_question", title: "Curious Mind", description: "Ask your first question" },
  { key: "first_pdf", title: "Note Taker", description: "Upload your first PDF" },
  { key: "quiz_starter", title: "Quiz Starter", description: "Complete your first quiz" },
  { key: "scholar", title: "Scholar", description: "Complete 5 quizzes" },
];

export default function Achievements() {
  const [earned, setEarned] = useState(null);
  useEffect(() => { api.get("/achievements").then((r) => setEarned(r.data.map((a) => a.key))); }, []);
  if (earned === null) return <Page title="Achievements"><Spinner /></Page>;

  return (
    <Page title="Achievements" subtitle="Milestones" testid="achievements-page">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL.map((a) => {
          const got = earned.includes(a.key);
          return (
            <Card key={a.key} className={got ? "" : "opacity-60"} data-testid={`achievement-${a.key}`}>
              <div className={`h-12 w-12 rounded-md flex items-center justify-center mb-3 ${got ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {got ? <Trophy className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
              </div>
              <p className="font-semibold tracking-tight">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.description}</p>
              {got && <span className="inline-block mt-3 text-xs rounded-full bg-success/10 text-success px-2 py-0.5 font-medium">Unlocked</span>}
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
