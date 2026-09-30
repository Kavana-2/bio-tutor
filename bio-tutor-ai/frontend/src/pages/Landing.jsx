import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Dna, MessageSquare, GraduationCap, FileText, Mic, ShieldCheck, ArrowRight,
  Brain, Leaf, Wind, Utensils, Sparkles, CheckCircle2, Moon, Sun, BookOpen
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useTheme } from "../context/ThemeContext";

const features = [
  { icon: Brain, title: "Custom NLP Model", desc: "Built with sentence-transformers & MiniLM. Runs fully offline with zero reliance on external LLM APIs." },
  { icon: MessageSquare, title: "Domain-Restricted Answers", desc: "Answers strictly from verified Biology datasets. Refuses off-topic prompts to eliminate hallucinations." },
  { icon: FileText, title: "Learn From Your Notes", desc: "Supports PDF, Word, PowerPoint, Excel, text, and images. Text is extracted, chunked, and embedded into your library." },
  { icon: GraduationCap, title: "AI Guided Lessons", desc: "Automatic step-by-step lesson plans generated directly from your actual notes with context-aware doubt clearing." },
  { icon: Mic, title: "Interactive Voice Tutor", desc: "Browser-native speech synthesis reads lessons aloud, while speech recognition lets you ask doubts naturally." },
  { icon: ShieldCheck, title: "Adaptive Progress & Practice", desc: "Quiz generation, subjective practice evaluation, and weak-concept recommendations based on your performance." },
];

const topics = [
  { icon: Leaf, name: "Photosynthesis" },
  { icon: Utensils, name: "Digestive System" },
  { icon: Wind, name: "Respiratory System" },
];

export default function Landing() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Dna className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight font-display">BioTutor AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggle}
              data-testid="landing-theme-toggle"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-emerald-600" />}
            </button>
            <Link to="/login">
              <Button variant="ghost" className="font-medium" data-testid="landing-login">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button className="font-semibold shadow-md shadow-primary/20" data-testid="landing-signup">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 lg:pt-20 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-7"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Academic AI Project · Domain-Restricted NLP Engine</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] font-display">
            Your AI Study Assistant for <span className="text-gradient">Biology & Life Sciences</span>.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Master Photosynthesis, the Digestive System, and the Respiratory System with a localized NLP study tutor.
            Upload your lecture notes, listen to interactive voice lessons, solve auto-generated quizzes, and clear your doubts instantly.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-6 text-base font-semibold shadow-lg shadow-primary/25" data-testid="hero-cta">
                Start Learning Now <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base font-semibold">
                Sign In to Account
              </Button>
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-border/60">
            <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-3">Target Biology Topics</p>
            <div className="flex flex-wrap gap-2.5">
              {topics.map((t) => (
                <div key={t.name} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold shadow-sm">
                  <t.icon className="h-4 w-4 text-primary" /> {t.name}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Hero Visual Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative rounded-3xl border border-border bg-card p-3 shadow-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1513258496099-48168024aec0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
              alt="Biology student studying notes"
              className="rounded-2xl border border-border object-cover w-full h-[380px] lg:h-[430px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl glass-panel border border-border/80 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Interactive AI Teaching</p>
                  <p className="text-[11px] text-muted-foreground">Speech-enabled doubt clearing & study notes extraction</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Capabilities Section */}
      <section className="border-t border-border bg-muted/30 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary mb-3">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">
              Designed for Final-Year Project Demonstration
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3">
              A comprehensive EdTech application combining custom NLP retrieval, OCR note extraction, and interactive learning tools.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-bold text-lg tracking-tight mb-2 font-display">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Highlights Banner */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-8 lg:p-12 shadow-md">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-3">
                Built for IEEE & College Panel Presentations
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                BioTutor AI demonstrates real NLP engineering: sentence embeddings, top-k cosine similarity retrieval, custom topic classifier, document parsing (.pdf, .docx, .pptx), and automated performance metrics.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {[
                  "Domain-restricted accuracy validation",
                  "No API costs or external LLM locks",
                  "PDF page & slide-level attribution",
                  "Speech synthesis & microphone STT"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 font-semibold shadow-md shadow-primary/20">
                  Launch BioTutor AI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dna className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">BioTutor AI</span>
            <span>— AI-Powered Biology Study Assistant</span>
          </div>
          <span>Photosynthesis · Digestive System · Respiratory System</span>
        </div>
      </footer>
    </div>
  );
}

