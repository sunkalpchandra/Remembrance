"use client";
import { useEffect, useState } from "react";

const PHRASES = [
  "What did I love doing on weekends?",
  "Who were the people closest to me?",
  "What places have always felt like home?",
];

const TYPE_SPEED = 48;
const DELETE_SPEED = 28;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

export function useTypewriter() {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const target = PHRASES[phraseIdx];

    if (typing) {
      if (displayed.length < target.length) {
        const t = setTimeout(
          () => setDisplayed(target.slice(0, displayed.length + 1)),
          TYPE_SPEED,
        );
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), PAUSE_AFTER_TYPE);
        return () => clearTimeout(t);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(
          () => setDisplayed(displayed.slice(0, -1)),
          DELETE_SPEED,
        );
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => {
          setPhraseIdx((i) => (i + 1) % PHRASES.length);
          setTyping(true);
        }, PAUSE_AFTER_DELETE);
        return () => clearTimeout(t);
      }
    }
  }, [displayed, typing, phraseIdx]);

  return displayed;
}
