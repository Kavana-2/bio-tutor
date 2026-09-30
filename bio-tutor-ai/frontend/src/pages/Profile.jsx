import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Page, Card } from "../components/common";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { User, Mail, Calendar, Moon, Cpu, ShieldCheck, Dna } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [evalData, setEvalData] = useState(null);

  useEffect(() => {
    api.get("/model/evaluation").then((r) => setEvalData(r.data)).catch(() => {});
  }, []);

  return (
    <Page title="Profile & Model System Metrics" subtitle="Student Account & NLP Diagnostics" testid="profile-page">
      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Account Details Card */}
        <Card>
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
            <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-extrabold shadow-md shadow-primary/20 font-display">
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground font-display">{user?.name}</p>
              <p className="text-xs font-semibold text-primary capitalize mt-0.5">{user?.role || "Student User"}</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
              <User className="h-4 w-4 text-primary" />
              <span className="text-foreground">{user?.name}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Registered: </span>
              <span className="text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active"}</span>
            </div>
          </div>

          <Button variant="outline" className="mt-6 w-full font-semibold text-destructive hover:bg-destructive/10 border-destructive/30" onClick={logout} data-testid="profile-logout">
            Log Out Account
          </Button>
        </Card>

        {/* System & Model Evaluation Card */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-base tracking-tight font-display mb-4">Interface Preferences</h3>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Dark Theme Interface</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} data-testid="settings-dark-toggle" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <h3 className="font-bold text-base tracking-tight font-display mb-4 flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-primary" /> Local NLP Engine Evaluation
            </h3>
            {evalData ? (
              <div className="text-xs space-y-2.5">
                <div className="flex justify-between p-2.5 rounded-lg bg-card border border-border/50">
                  <span className="text-muted-foreground font-semibold">Semantic Model Architecture</span>
                  <span className="font-bold text-foreground">all-MiniLM-L6-v2</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-card border border-border/50">
                  <span className="text-muted-foreground font-semibold">Topic Classifier F1 Score</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{(evalData.topic_classification.f1 * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-card border border-border/50">
                  <span className="text-muted-foreground font-semibold">Top-1 Retrieval Accuracy</span>
                  <span className="font-bold text-foreground">{(evalData.retrieval.retrieval_accuracy_top1 * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-card border border-border/50">
                  <span className="text-muted-foreground font-semibold">Top-3 Retrieval Accuracy</span>
                  <span className="font-bold text-foreground">{(evalData.retrieval.retrieval_accuracy_top3 * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-card border border-border/50">
                  <span className="text-muted-foreground font-semibold">Mean Cosine Confidence</span>
                  <span className="font-bold text-foreground">{(evalData.retrieval.mean_confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Evaluation metrics loading...</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

