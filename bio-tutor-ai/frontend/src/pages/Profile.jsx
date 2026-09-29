import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Page, Card } from "../components/common";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { User, Mail, Calendar, Moon, Cpu } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [evalData, setEvalData] = useState(null);

  useEffect(() => { api.get("/model/evaluation").then((r) => setEvalData(r.data)).catch(() => {}); }, []);

  return (
    <Page title="Profile & Settings" subtitle="Your account" testid="profile-page">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <div><p className="text-lg font-semibold tracking-tight">{user?.name}</p><p className="text-sm text-muted-foreground">{user?.role}</p></div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> {user?.name}</div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> {user?.email}</div>
            <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /> Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</div>
          </div>
          <Button variant="outline" className="mt-6" onClick={logout} data-testid="profile-logout">Log out</Button>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold tracking-tight mb-4">Settings</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Moon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Dark mode</span></div>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} data-testid="settings-dark-toggle" />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold tracking-tight mb-4 flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> NLP Model</h3>
            {evalData ? (
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">all-MiniLM-L6-v2</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Topic classification F1</span><span className="font-medium">{(evalData.topic_classification.f1 * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Retrieval accuracy (top-1)</span><span className="font-medium">{(evalData.retrieval.retrieval_accuracy_top1 * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Retrieval accuracy (top-3)</span><span className="font-medium">{(evalData.retrieval.retrieval_accuracy_top3 * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mean confidence</span><span className="font-medium">{(evalData.retrieval.mean_confidence * 100).toFixed(0)}%</span></div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Evaluation not available.</p>}
          </Card>
        </div>
      </div>
    </Page>
  );
}
