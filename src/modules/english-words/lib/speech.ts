export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Pronounces an English word with the browser's Web Speech API (no-op where unsupported). */
export function speak(text: string): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
