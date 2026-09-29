import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { AuthShell } from "./Login";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created!");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Start learning Biology with your AI tutor.">
      <form onSubmit={submit} className="space-y-4" data-testid="signup-form">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
            data-testid="signup-name" placeholder="Jane Student" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="signup-email" placeholder="you@college.edu" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="signup-password" placeholder="At least 6 characters" className="mt-1.5" />
        </div>
        <Button type="submit" className="w-full" disabled={loading} data-testid="signup-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Already registered? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
