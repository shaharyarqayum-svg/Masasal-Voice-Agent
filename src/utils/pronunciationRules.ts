import { PronunciationEntry } from "../types.ts";

export interface FlaggedPronunciationTerm {
  term: string;
  patternType: "explicit_tag" | "acronym" | "alphanumeric" | "hyphen_apostrophe" | "documented_loanword";
  patternDescription: string;
  hasDictionaryEntry: boolean;
  hasOverride: boolean;
  resolvedReading?: string;
  lineIndices: number[];
}

export interface DocumentedPatternRule {
  id: string;
  name: string;
  description: string;
  example: string;
}

export const DOCUMENTED_PRONUNCIATION_PATTERNS: DocumentedPatternRule[] = [
  {
    id: "explicit_tag",
    name: "Explicit User Tag",
    description: "Terms enclosed in explicit review tags like [review: word]",
    example: "[review: Masasal]",
  },
  {
    id: "acronym",
    name: "All-Caps Acronyms (3+ Letters)",
    description: "Capitalized abbreviations that may be spelled out letter-by-letter or as words",
    example: "TTS, WPM, PCM, ASR, API, JSON",
  },
  {
    id: "alphanumeric",
    name: "Mixed Alphanumeric Codes",
    description: "Version numbers, model IDs, and technical codes with letters and digits",
    example: "V2, GPT4, H264, MP3, 4K, 1080p",
  },
  {
    id: "hyphen_apostrophe",
    name: "Hyphenated or Apostrophized Words",
    description: "Compound or contracted words with interior hyphens or apostrophes",
    example: "e-commerce, state-of-the-art, O'Connor",
  },
  {
    id: "documented_loanword",
    name: "Documented Regional / Loan Words",
    description: "Documented fixed vocabulary list of Urdu, Arabic, and regional brand terms",
    example: "Masasal, Urdu, Khuda, Shukriya, Inshallah, Zabardast, Assalam, Alaikum",
  },
];

export const DOCUMENTED_LOANWORDS: readonly string[] = [
  "Masasal",
  "Urdu",
  "Khuda",
  "Shukriya",
  "Inshallah",
  "Zabardast",
  "Assalam",
  "Alaikum",
  "Chai",
  "Biryani",
  "Dukaan",
  "Kareem",
] as const;

/**
 * Default global pronunciation dictionary entries for the project.
 */
export const DEFAULT_PRONUNCIATION_DICTIONARY: PronunciationEntry[] = [
  {
    id: "dict-1",
    term: "Masasal",
    reading: "Muh-SAH-sal",
    notes: "Arabic / Urdu loanword meaning continuous or persistent; stress second syllable",
    isOverride: false,
    flagReason: "Documented Regional / Loan Words",
  },
  {
    id: "dict-2",
    term: "TTS",
    reading: "T-T-S",
    notes: "Text-to-speech acronym, read as individual letters",
    isOverride: false,
    flagReason: "All-Caps Acronyms (3+ Letters)",
  },
  {
    id: "dict-3",
    term: "WPM",
    reading: "W-P-M",
    notes: "Words per minute acronym, read as individual letters",
    isOverride: false,
    flagReason: "All-Caps Acronyms (3+ Letters)",
  },
  {
    id: "dict-4",
    term: "PCM",
    reading: "P-C-M",
    notes: "Pulse Code Modulation, read as individual letters",
    isOverride: false,
    flagReason: "All-Caps Acronyms (3+ Letters)",
  },
];

/**
 * Scans script lines for words requiring pronunciation review according ONLY to:
 * 1. Explicit user markup [review: term]
 * 2. Documented fixed problem patterns
 * Never guesses or infers arbitrary words.
 */
export function scanTermsRequiringReview(
  scriptLines: Array<{ id: string; text: string }>,
  globalDictionary: PronunciationEntry[],
  scriptOverrides: PronunciationEntry[]
): FlaggedPronunciationTerm[] {
  const termMap = new Map<string, FlaggedPronunciationTerm>();

  const acronymRegex = /\b[A-Z]{3,}\b/g;
  const alphanumericRegex = /\b([a-zA-Z]+[0-9]+|[0-9]+[a-zA-Z]+)[a-zA-Z0-9]*\b/g;
  const hyphenApostropheRegex = /\b[a-zA-Z]+[-'][a-zA-Z]+\b/g;
  const explicitTagRegex = /\[review:\s*([^\]]+)\]/gi;

  scriptLines.forEach((line, lineIdx) => {
    const text = line.text;

    // 1. Explicit tags: [review: term]
    let match: RegExpExecArray | null;
    while ((match = explicitTagRegex.exec(text)) !== null) {
      const term = match[1].trim();
      addOrUpdateTerm(term, "explicit_tag", "Explicit user tag in script text", lineIdx);
    }

    // 2. Acronyms
    while ((match = acronymRegex.exec(text)) !== null) {
      const term = match[0];
      addOrUpdateTerm(term, "acronym", "All-caps acronym (3+ letters)", lineIdx);
    }

    // 3. Mixed alphanumeric
    while ((match = alphanumericRegex.exec(text)) !== null) {
      const term = match[0];
      addOrUpdateTerm(term, "alphanumeric", "Mixed letters and digits code", lineIdx);
    }

    // 4. Hyphenated / apostrophized
    while ((match = hyphenApostropheRegex.exec(text)) !== null) {
      const term = match[0];
      addOrUpdateTerm(term, "hyphen_apostrophe", "Interior hyphen or apostrophe", lineIdx);
    }

    // 5. Documented loanwords
    for (const loanword of DOCUMENTED_LOANWORDS) {
      const escaped = loanword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const loanRegex = new RegExp(`\\b${escaped}\\b`, "gi");
      if (loanRegex.test(text)) {
        addOrUpdateTerm(loanword, "documented_loanword", "Documented regional vocabulary word", lineIdx);
      }
    }
  });

  function addOrUpdateTerm(
    term: string,
    patternType: FlaggedPronunciationTerm["patternType"],
    patternDescription: string,
    lineIdx: number
  ) {
    const key = term.toLowerCase();
    const existing = termMap.get(key);

    const override = scriptOverrides.find((o) => o.term.toLowerCase() === key);
    const globalEntry = globalDictionary.find((g) => g.term.toLowerCase() === key);
    const resolvedReading = override?.reading || globalEntry?.reading;

    if (existing) {
      if (!existing.lineIndices.includes(lineIdx + 1)) {
        existing.lineIndices.push(lineIdx + 1);
      }
    } else {
      termMap.set(key, {
        term,
        patternType,
        patternDescription,
        hasDictionaryEntry: Boolean(globalEntry),
        hasOverride: Boolean(override),
        resolvedReading,
        lineIndices: [lineIdx + 1],
      });
    }
  }

  return Array.from(termMap.values());
}
