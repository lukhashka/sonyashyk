/** Deterministic quote for a study day (yyyy-MM-dd): same quote all day, rotates daily. */
export function pickQuote(quotes: string[], studyDay: string): string {
  if (quotes.length === 0) return '';
  const n = Number(studyDay.replaceAll('-', ''));
  return quotes[n % quotes.length] ?? '';
}
