export interface RepeatedWordIssue {
  type: "consecutive" | "phrase";
  word: string;
  count: number;
  indices: number[];
  suggestion: string;
}

export interface PromotionalWordIssue {
  term: string;
  index: number;
  explanation: string;
}

export interface ShortenResult {
  originalText: string;
  suggestedText: string;
  originalWords: number;
  suggestedWords: number;
  targetWords: number;
  rulesApplied: string[];
  explanation: string;
}

export interface ExpandResult {
  success: boolean;
  originalText: string;
  suggestedText: string;
  originalWords: number;
  suggestedWords: number;
  targetWords: number;
  rulesApplied: string[];
  explanation: string;
  refusalReason?: string;
}

// Documented fixed list of wordy phrases to condense
export const WORDY_PHRASE_REPLACEMENTS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  { regex: /\bin order to\b/gi, replacement: "to", label: '"in order to" → "to"' },
  { regex: /\bdue to the fact that\b/gi, replacement: "because", label: '"due to the fact that" → "because"' },
  { regex: /\bat this point in time\b/gi, replacement: "now", label: '"at this point in time" → "now"' },
  { regex: /\bas a matter of fact\b/gi, replacement: "in fact", label: '"as a matter of fact" → "in fact"' },
  { regex: /\bfor the purpose of\b/gi, replacement: "for", label: '"for the purpose of" → "for"' },
  { regex: /\bin the event that\b/gi, replacement: "if", label: '"in the event that" → "if"' },
  { regex: /\bwith regard to\b/gi, replacement: "regarding", label: '"with regard to" → "regarding"' },
  { regex: /\bneedless to say,?\s*/gi, replacement: "", label: 'Remove "needless to say"' },
  { regex: /\bit is important to note that\s*/gi, replacement: "", label: 'Remove "it is important to note that"' },
  { regex: /\bit should be noted that\s*/gi, replacement: "", label: 'Remove "it should be noted that"' },
];

// Documented removable filler adverbs (only stripped if shortening needed)
export const FILLER_ADVERBS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\b(basically|literally|actually)\s+/gi, label: "Removable filler adverb (basically/literally/actually)" },
  { regex: /\b(very|really|quite|somewhat|simply)\s+/gi, label: "Intensifier/filler adverb (very/really/quite/simply)" },
];

// Documented fixed list of promotional / exaggerated terms
export const PROMOTIONAL_TERMS: readonly string[] = [
  "revolutionary",
  "best ever",
  "miracle",
  "guaranteed",
  "100%",
  "game-changing",
  "life-changing",
  "unbelievable",
  "secret",
  "magic",
  "instant",
  "flawless",
  "effortless",
  "never before seen",
  "ultimate",
  "perfect",
  "magic bullet",
  "breakthrough",
] as const;

// Contraction expansion map for factual, content-preserving expansion
export const CONTRACTION_EXPANSIONS: Record<string, string> = {
  "don't": "do not",
  "can't": "cannot",
  "won't": "will not",
  "it's": "it is",
  "we're": "we are",
  "they'll": "they will",
  "you've": "you have",
  "i'm": "I am",
  "let's": "let us",
  "that's": "that is",
  "there's": "there is",
  "what's": "what is",
  "who's": "who is",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "couldn't": "could not",
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Detects consecutive duplicated words (e.g. "the the") and frequent repeated phrases.
 */
export function detectRepeatedWords(text: string): RepeatedWordIssue[] {
  const issues: RepeatedWordIssue[] = [];
  if (!text.trim()) return issues;

  // 1. Consecutive identical words (case-insensitive)
  const consecutiveRegex = /\b([a-zA-Z0-9]+)\s+\1\b/gi;
  let match: RegExpExecArray | null;
  while ((match = consecutiveRegex.exec(text)) !== null) {
    issues.push({
      type: "consecutive",
      word: match[1],
      count: 2,
      indices: [match.index],
      suggestion: `Remove duplicate "${match[1]}"`,
    });
  }

  // 2. Exact word repetition across close distance (e.g. within 5 words)
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const commonStopWords = new Set(["the", "and", "that", "this", "with", "from", "for", "have", "are", "was"]);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (commonStopWords.has(w)) continue;
    for (let j = i + 1; j < Math.min(i + 5, words.length); j++) {
      if (words[j] === w) {
        // Only add if not already caught as consecutive
        if (j > i + 1) {
          issues.push({
            type: "phrase",
            word: w,
            count: 2,
            indices: [i, j],
            suggestion: `Word "${w}" repeated within short distance (${j - i} words apart)`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Flags potentially exaggerated or promotional language for manual review using the fixed documented list.
 */
export function detectPromotionalLanguage(text: string): PromotionalWordIssue[] {
  const issues: PromotionalWordIssue[] = [];
  if (!text.trim()) return issues;

  for (const term of PROMOTIONAL_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        term: match[0],
        index: match.index,
        explanation:
          "Flagged for manual review: Potential promotional or exaggerated claim. Note: This flag is a reminder for human review, not proof that the statement is false.",
      });
    }
  }

  return issues;
}

/**
 * Shortens text toward a user-selected target word count using deterministic, content-preserving rules.
 */
export function shortenScriptText(text: string, targetWords: number): ShortenResult {
  const originalWords = countWords(text);
  if (!text.trim() || targetWords <= 0) {
    return {
      originalText: text,
      suggestedText: text,
      originalWords,
      suggestedWords: originalWords,
      targetWords,
      rulesApplied: [],
      explanation: "No shortening performed: text is empty or target count is invalid.",
    };
  }

  if (originalWords <= targetWords) {
    return {
      originalText: text,
      suggestedText: text,
      originalWords,
      suggestedWords: originalWords,
      targetWords,
      rulesApplied: [],
      explanation: `Text is already within target word count (${originalWords} <= ${targetWords} words).`,
    };
  }

  let working = text;
  const applied: string[] = [];

  // Step 1: Replace verbose wordy phrases
  for (const item of WORDY_PHRASE_REPLACEMENTS) {
    if (item.regex.test(working)) {
      working = working.replace(item.regex, item.replacement);
      applied.push(`Condensed phrase: ${item.label}`);
      item.regex.lastIndex = 0;
    }
  }

  // Clean extra spaces
  working = working.replace(/\s{2,}/g, " ").trim();
  let currentCount = countWords(working);

  // Step 2: Remove filler adverbs if still over target
  if (currentCount > targetWords) {
    for (const item of FILLER_ADVERBS) {
      if (currentCount <= targetWords) break;
      if (item.regex.test(working)) {
        working = working.replace(item.regex, "");
        applied.push(`Trimmed ${item.label}`);
        working = working.replace(/\s{2,}/g, " ").trim();
        currentCount = countWords(working);
        item.regex.lastIndex = 0;
      }
    }
  }

  // Step 3: If still over target, retain whole sentences up to target limit (never cutting mid-sentence)
  if (currentCount > targetWords) {
    const sentences = working.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [working];
    let gathered = "";
    let gatheredCount = 0;
    const retainedSentences: string[] = [];

    for (const sent of sentences) {
      const sentWords = countWords(sent);
      if (gatheredCount + sentWords <= targetWords || gatheredCount === 0) {
        retainedSentences.push(sent.trim());
        gatheredCount += sentWords;
      } else {
        break;
      }
    }

    if (retainedSentences.length > 0 && gatheredCount < currentCount) {
      working = retainedSentences.join(" ");
      applied.push(
        `Retained first ${retainedSentences.length} complete sentence(s) to honor target limit without truncating words`
      );
    }
  }

  const suggestedWords = countWords(working);

  return {
    originalText: text,
    suggestedText: working,
    originalWords,
    suggestedWords,
    targetWords,
    rulesApplied: applied,
    explanation:
      applied.length > 0
        ? `Shortened from ${originalWords} to ${suggestedWords} words using ${applied.length} deterministic rule(s).`
        : `Could not shorten further without deleting factual content. Current count: ${originalWords} words.`,
  };
}

/**
 * Expands text using deterministic, content-preserving contraction expansions ONLY.
 * Refuses requests that would require invented or filler content.
 */
export function expandScriptText(text: string, targetWords: number): ExpandResult {
  const originalWords = countWords(text);

  if (!text.trim()) {
    return {
      success: false,
      originalText: text,
      suggestedText: text,
      originalWords: 0,
      suggestedWords: 0,
      targetWords,
      rulesApplied: [],
      explanation: "Cannot expand empty text.",
      refusalReason: "Script text is empty.",
    };
  }

  if (targetWords <= originalWords) {
    return {
      success: true,
      originalText: text,
      suggestedText: text,
      originalWords,
      suggestedWords: originalWords,
      targetWords,
      rulesApplied: [],
      explanation: `Text already meets or exceeds target words (${originalWords} >= ${targetWords}).`,
    };
  }

  // Expand contractions deterministically
  let working = text;
  const applied: string[] = [];

  for (const [contraction, expansion] of Object.entries(CONTRACTION_EXPANSIONS)) {
    const regex = new RegExp(`\\b${contraction}\\b`, "gi");
    if (regex.test(working)) {
      working = working.replace(regex, expansion);
      applied.push(`Expanded contraction "${contraction}" → "${expansion}"`);
    }
  }

  const suggestedWords = countWords(working);

  // If after expanding contractions the text still doesn't reach target words:
  // Non-negotiable constraint: REFUSE EXPANSION. Do not pad with meaningless filler or invent claims!
  if (suggestedWords < targetWords) {
    return {
      success: false,
      originalText: text,
      suggestedText: working !== text ? working : text,
      originalWords,
      suggestedWords,
      targetWords,
      rulesApplied: applied,
      explanation:
        "Expansion Refused: Deterministic rule-based expansion cannot invent new claims, specifications, benefits, or filler text. To preserve script factual integrity, expansion is refused.",
      refusalReason:
        `Requested ${targetWords} words, but safe deterministic expansion (contractions only) reaches only ${suggestedWords} words. Inventing content or inserting filler is prohibited.`,
    };
  }

  return {
    success: true,
    originalText: text,
    suggestedText: working,
    originalWords,
    suggestedWords,
    targetWords,
    rulesApplied: applied,
    explanation: `Successfully expanded from ${originalWords} to ${suggestedWords} words using contraction expansions.`,
  };
}
