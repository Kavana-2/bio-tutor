import { BookOpen, Sparkles } from "lucide-react";
import TutorAvatar3D from "./TutorAvatar3D";
import "./TutorAvatar.css";

export default function TutorAvatar({ speaking = false, paused = false, lessonTitle = "Biology" }) {
  const active = speaking && !paused;
  const status = paused ? "Paused" : active ? "Explaining your lesson" : "Ready to learn together";

  return (
    <section
      className={`tutor-avatar ${active ? "tutor-avatar--speaking" : ""} ${paused ? "tutor-avatar--paused" : ""}`}
      aria-label={`Animated Biology tutor. ${status}.`}
      data-testid="tutor-avatar"
    >
      <div className="tutor-avatar__topline">
        <span className="tutor-avatar__icon"><Sparkles size={13} aria-hidden="true" /></span>
        <span>YOUR STUDY BUDDY</span>
        <span className="tutor-avatar__live-dot" />
      </div>

      <div className="tutor-avatar__stage">
        <div className="tutor-avatar__speech" aria-live="polite">
          <span>{status}</span>
          <span className="tutor-avatar__speech-tail" />
        </div>
        <TutorAvatar3D speaking={active} paused={paused} />
        <span className="tutor-avatar__spark tutor-avatar__spark--one" aria-hidden="true">✦</span>
        <span className="tutor-avatar__spark tutor-avatar__spark--two" aria-hidden="true">✧</span>
      </div>

      <div className="tutor-avatar__caption">
        <span className="tutor-avatar__name">Mira</span>
        <span className="tutor-avatar__lesson"><BookOpen size={12} aria-hidden="true" /> {lessonTitle}</span>
      </div>
    </section>
  );
}
