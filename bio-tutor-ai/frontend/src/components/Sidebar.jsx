import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard, MessageSquare, GraduationCap, FileText, ListChecks,
  Layers, Timer, ClipboardList, PenLine, TrendingUp, Bookmark, Trophy,
  User, Moon, Sun, LogOut, Menu, X, Dna, Network, ScanText
} from "lucide-react";

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

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        data-testid="sidebar"
        className={`fixed z-40 lg:static inset-y-0 left-0 w-64 shrink-0 border-r border-border bg-card flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border/70">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
            <Dna className="h-5 w-5" />
          </div>
          <div className="leading-none">
            <p className="font-extrabold tracking-tight text-base font-display">BioTutor AI</p>
            <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-primary/80 mt-0.5">Academic NLP</p>
          </div>
          <button
            className="ml-auto lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setMobileOpen(false)}
            data-testid="close-sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-1.5 bg-muted/30">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-emerald-600" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/80">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={onLogout}
              data-testid="logout-btn"
              title="Logout"
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
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
    <div className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-card/90 backdrop-blur-md sticky top-0 z-20">
      <button
        onClick={() => setMobileOpen(true)}
        data-testid="open-sidebar"
        className="p-2 -ml-2 rounded-lg text-foreground hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <Dna className="h-4 w-4" />
        </div>
        <span className="font-extrabold tracking-tight text-sm font-display">BioTutor AI</span>
      </div>
      <div className="w-8" />
    </div>
  );
}

