import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">BioTutor AI</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="hidden lg:block relative border-l border-border">
        <img src="https://images.unsplash.com/photo-1564632720996-d3bf0b286a56?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Biology" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/20" />
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
    <AuthShell title="Log in" subtitle="Continue your Biology learning journey.">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email" placeholder="you@college.edu" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password" placeholder="••••••••" className="mt-1.5" />
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">
        No account? <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  );
}
