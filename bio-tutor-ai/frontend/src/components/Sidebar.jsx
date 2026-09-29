import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard, MessageSquare, GraduationCap, FileText, ListChecks,
  Layers, Timer, ClipboardList, PenLine, TrendingUp, Bookmark, Trophy,
  User, Moon, Sun, LogOut, Menu, X, Sparkles, Network, ScanText
} from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/ask", label: "Ask AI", icon: MessageSquare },
  { to: "/app/teach", label: "Teach Me", icon: GraduationCap },
  { to: "/app/pdf", label: "PDF Study", icon: FileText },
  { to: "/app/quiz", label: "Quiz", icon: ListChecks },
  { to: "/app/flashcards", label: "Flashcards", icon: Layers },
  { to: "/app/revision", label: "Revision", icon: Timer },
  { to: "/app/exam", label: "Exam Mode", icon: ClipboardList },
  { to: "/app/practice", label: "Practice", icon: PenLine },
  { to: "/app/concept-map", label: "Concept Map", icon: Network },
  { to: "/app/diagram", label: "Diagram Reading", icon: ScanText },
  { to: "/app/progress", label: "Progress", icon: TrendingUp },
  { to: "/app/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/app/achievements", label: "Achievements", icon: Trophy },
  { to: "/app/profile", label: "Profile", icon: User },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const onLogout = async () => { await logout(); navigate("/login"); };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        data-testid="sidebar"
        className={`fixed z-40 lg:static inset-y-0 left-0 w-64 shrink-0 border-r border-pink-100 bg-white flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="h-20 flex items-center gap-2 px-5 border-b border-pink-100">
          <div className="h-9 w-9 rounded-2xl bg-pink-100 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-pink-500" />
          </div>
          <div className="leading-tight">
            <p className="font-bold tracking-tight text-sm">BioTutor AI</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Study Assistant</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} data-testid="close-sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-pink-100 text-pink-700" : "text-muted-foreground hover:bg-sky-50 hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={onLogout} data-testid="logout-btn" title="Logout" className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileTopbar({ setMobileOpen }) {
  return (
    <div className="lg:hidden h-14 border-b border-border flex items-center px-4 gap-3 bg-card sticky top-0 z-20">
      <button onClick={() => setMobileOpen(true)} data-testid="open-sidebar"><Menu className="h-5 w-5" /></button>
      <span className="font-bold tracking-tight">BioTutor AI</span>
    </div>
  );
}
