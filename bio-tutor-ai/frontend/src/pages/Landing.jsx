import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare, GraduationCap, FileText, Mic, ShieldCheck, ArrowRight, Brain, Leaf, Wind, Utensils } from "lucide-react";
import { Button } from "../components/ui/button";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

const features = [
  { icon: Brain, title: "Custom NLP Model", desc: "A real semantic model (MiniLM + sentence transformers) — not a chatbot wrapper. Runs fully offline." },
  { icon: MessageSquare, title: "Confidence-Based Answers", desc: "Answers only from a verified Biology knowledge base. Refuses when unsure — never hallucinates." },
  { icon: FileText, title: "Learn From Your Notes", desc: "Upload PDFs. Text is extracted, chunked and embedded to become your personal knowledge source." },
  { icon: GraduationCap, title: "AI Teaching", desc: "Automatic lesson plans built from your actual notes, with context-aware doubt clearing." },
  { icon: Mic, title: "Voice Teaching", desc: "Browser-native speech: the AI reads lessons aloud and you can ask doubts by voice." },
  { icon: ShieldCheck, title: "Progress & Adaptive", desc: "Quizzes, practice evaluation and adaptive recommendations from your real performance." },
];

const topics = [
  { icon: Leaf, name: "Photosynthesis" },
  { icon: Utensils, name: "Digestive System" },
  { icon: Wind, name: "Respiratory System" },
];

export default function Landing() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">BioTutor AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} data-testid="landing-theme-toggle" className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/login"><Button variant="ghost" data-testid="landing-login">Log in</Button></Link>
            <Link to="/signup"><Button data-testid="landing-signup">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Custom Biology NLP · No external LLM APIs
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.05]">
            Your AI study partner for <span className="text-primary">Biology</span>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
            A domain-restricted NLP study assistant for Photosynthesis, the Digestive System and the Respiratory System.
            Ask questions, upload your notes, and let the AI teach you — with voice, quizzes and progress tracking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup"><Button size="lg" data-testid="hero-cta">Start Learning <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">I already have an account</Button></Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {topics.map((t) => (
              <div key={t.name} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium">
                <t.icon className="h-4 w-4 text-primary" /> {t.name}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
          <img
            src="https://images.unsplash.com/photo-1513258496099-48168024aec0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
            alt="Student studying"
            className="rounded-xl border border-border shadow-sm object-cover w-full h-[420px]"
          />
        </motion.div>
      </section>

      <section className="border-t border-border bg-[hsl(var(--surface))]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Capabilities</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10">Everything a final-year project needs</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-card p-6 hover:-translate-y-0.5 transition-transform">
                <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="font-semibold tracking-tight mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-muted-foreground flex flex-wrap justify-between gap-4">
          <span>BioTutor AI — AI-Based Study Assistant using a Custom NLP Model</span>
          <span>Photosynthesis · Digestion · Respiration</span>
        </div>
      </footer>
    </div>
  );
}
