import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { AuthShell } from "./Login";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password reset! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Enter your new password below.">
      <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
        <div>
          <Label htmlFor="token">Reset token</Label>
          <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)}
            data-testid="reset-token" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} data-testid="reset-password" className="mt-1.5" />
        </div>
        <Button type="submit" className="w-full" disabled={loading} data-testid="reset-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">
        <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
