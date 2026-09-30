import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar, { MobileTopbar } from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./common";

export default function Layout() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading || user === null)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card shadow-sm">
          <Spinner className="h-8 w-8" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Loading BioTutor AI…</p>
        </div>
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-background font-sans antialiased text-foreground">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <MobileTopbar setMobileOpen={setMobileOpen} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

