import { useCallback, useEffect, useRef, useState } from "react";

// Browser-native SpeechSynthesis (TTS) + SpeechRecognition (STT). No external APIs.
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.pitch = 1;
    u.onstart = () => { setSpeaking(true); setPaused(false); };
    u.onend = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(u);
  }, [supported]);

  const pause = useCallback(() => { if (supported) { window.speechSynthesis.pause(); setPaused(true); } }, [supported]);
  const resume = useCallback(() => { if (supported) { window.speechSynthesis.resume(); setPaused(false); } }, [supported]);
  const stop = useCallback(() => { if (supported) { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); } }, [supported]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, speaking, paused, speak, pause, resume, stop };
}

export function useSpeechInput(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;

  const start = useCallback(() => {
    if (!supported) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, SR, onResult]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  return { supported, listening, start, stop };
}
