import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dna, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background font-sans selection:bg-primary/20">
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-sm mx-auto my-auto animate-fade-up">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-8 group">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <Dna className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight font-display text-foreground">BioTutor AI</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1.5 mb-8 leading-relaxed">{subtitle}</p>
          {children}
        </div>
        <div className="text-xs text-muted-foreground text-center mt-8">
          BioTutor AI · Custom Offline Biology NLP Platform
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-7 relative border-l border-border overflow-hidden bg-card">
        <img
          src="https://images.unsplash.com/photo-1564632720996-d3bf0b286a56?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Biology research & study"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-primary/10" />
        <div className="absolute bottom-12 left-12 right-12 p-8 rounded-3xl glass-panel border border-border/80 shadow-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary mb-3">
            Academic Project Demonstration
          </span>
          <h2 className="text-2xl font-extrabold text-foreground font-display mb-2">
            AI-Based Biology Learning Assistant
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sentence embedding retrieval for Photosynthesis, Digestive System, and Respiratory System notes — with 0 API dependencies.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your Biology study sessions.">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div>
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
            placeholder="student@university.edu"
            className="mt-1.5 h-11 rounded-xl bg-card border-border focus:border-primary"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">Forgot password?</Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password"
            placeholder="••••••••"
            className="mt-1.5 h-11 rounded-xl bg-card border-border focus:border-primary"
          />
        </div>

        <Button type="submit" className="w-full h-11 font-semibold text-sm shadow-md shadow-primary/20 mt-2" disabled={loading} data-testid="login-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Log in to Dashboard <ArrowRight className="h-4 w-4 ml-1.5" /></>}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-6 text-center">
        Don't have an account yet?{" "}
        <Link to="/signup" className="text-primary font-bold hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

