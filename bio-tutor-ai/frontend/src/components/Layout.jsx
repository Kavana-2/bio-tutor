import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar, { MobileTopbar } from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Layout() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading || user === null)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopbar setMobileOpen={setMobileOpen} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
