import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { AuthShell } from "./Login";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toast.success("Reset link generated. Check console/email.");
      if (data.dev_token) setDevToken(data.dev_token);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="We'll generate a reset link for your account.">
      <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="forgot-email" placeholder="you@college.edu" className="mt-1.5" />
        </div>
        <Button type="submit" className="w-full" disabled={loading} data-testid="forgot-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
        </Button>
      </form>
      {devToken && (
        <div className="mt-5 rounded-md border border-border bg-secondary p-4 text-sm" data-testid="dev-token">
          <p className="font-medium mb-1">Dev reset link (no email provider configured):</p>
          <Link to={`/reset-password?token=${devToken}`} className="text-primary break-all hover:underline">
            /reset-password?token={devToken}
          </Link>
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-6 text-center">
        <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
