import {
  ClaimPhrase,
  ClaimReviewStatus,
  MaivcChecklistItem,
  ScriptLine,
  ScriptClaimMatch,
  ComplianceReviewJsonData,
} from "../types.ts";

export type { ScriptClaimMatch };

export const DEFAULT_CLAIM_PHRASES: readonly ClaimPhrase[] = [
  {
    id: "claim-1",
    phrase: "guaranteed",
    category: "Guarantee",
    reviewStatus: "unreviewed",
    notes: "Requires formal warranty terms or explicit legal disclaimer.",
  },
  {
    id: "claim-2",
    phrase: "100%",
    category: "Performance",
    reviewStatus: "unreviewed",
    notes: "Absolute numerical percentage claims must be supported by empirical testing data.",
  },
  {
    id: "claim-3",
    phrase: "best ever",
    category: "Comparative",
    reviewStatus: "unreviewed",
    notes: "Superlative claim; require audited industry benchmark or rephrase to subjective preference.",
  },
  {
    id: "claim-4",
    phrase: "miracle",
    category: "Exaggeration",
    reviewStatus: "unreviewed",
    notes: "Prohibited puffery; replace with factual description of capabilities.",
  },
  {
    id: "claim-5",
    phrase: "revolutionary",
    category: "Comparative",
    reviewStatus: "unreviewed",
    notes: "Flagged promotional term; verify actual technical differentiator.",
  },
  {
    id: "claim-6",
    phrase: "instant",
    category: "Performance",
    reviewStatus: "unreviewed",
    notes: "Verify operational timing against measured system latency benchmarks.",
  },
  {
    id: "claim-7",
    phrase: "effortless",
    category: "Usability",
    reviewStatus: "unreviewed",
    notes: "Verify usability claim against documented user onboarding prerequisites.",
  },
  {
    id: "claim-8",
    phrase: "never before seen",
    category: "Novelty",
    reviewStatus: "unreviewed",
    notes: "Prior art and market novelty review required before publication.",
  },
] as const;

export const DEFAULT_MAIVC_CHECKLIST: readonly MaivcChecklistItem[] = [
  {
    id: "maivc-01",
    code: "MAIVC-01",
    label: "Synthetic Voice & Foundation Disclosure",
    description: "Clear on-screen or audio disclosure that speech is simulated/synthetic, complying with platform disclosure standards.",
    checked: false,
    notes: "",
    severity: "required",
  },
  {
    id: "maivc-02",
    code: "MAIVC-02",
    label: "Product Claims Substantiation",
    description: "All product specifications, performance numbers, pricing, and benefits are grounded in verified documentation without invented claims.",
    checked: false,
    notes: "",
    severity: "required",
  },
  {
    id: "maivc-03",
    code: "MAIVC-03",
    label: "Persona & Consent Alignment",
    description: "Speaker slots, voice personas, and performance direction respect authorized voice usage and contain zero unauthorized voice clones.",
    checked: false,
    notes: "",
    severity: "required",
  },
  {
    id: "maivc-04",
    code: "MAIVC-04",
    label: "Pronunciation & Brand Name Accuracy",
    description: "Brand terms, technical terminology, and acronyms have verified pronunciations entered in the local pronunciation dictionary.",
    checked: false,
    notes: "",
    severity: "recommended",
  },
  {
    id: "maivc-05",
    code: "MAIVC-05",
    label: "Reel Cadence & Duration Limits",
    description: "Speaking cadence (WPM) and pause timings fit Instagram Reel time constraints (<60s or <90s) with clean caption sync.",
    checked: false,
    notes: "",
    severity: "recommended",
  },
  {
    id: "maivc-06",
    code: "MAIVC-06",
    label: "Zero External Audio Leakage",
    description: "Verified all reference audio files and project scripts remain 100% within browser memory with no external egress.",
    checked: false,
    notes: "",
    severity: "required",
  },
] as const;

export function cloneDefaultClaimPhrases(): ClaimPhrase[] {
  return DEFAULT_CLAIM_PHRASES.map((item) => ({ ...item }));
}

export function cloneDefaultMaivcChecklist(): MaivcChecklistItem[] {
  return DEFAULT_MAIVC_CHECKLIST.map((item) => ({ ...item }));
}

/**
 * Deterministically scans script lines for occurrences of registered claim phrases.
 */
export function scanScriptForClaims(
  scriptLines: ScriptLine[],
  claimPhrases: ClaimPhrase[]
): {
  matches: ScriptClaimMatch[];
  claimMatchCounts: Record<string, number>;
  totalMatches: number;
} {
  const matches: ScriptClaimMatch[] = [];
  const claimMatchCounts: Record<string, number> = {};

  for (const claim of claimPhrases) {
    claimMatchCounts[claim.id] = 0;
  }

  for (let idx = 0; idx < scriptLines.length; idx++) {
    const line = scriptLines[idx];
    if (!line.text || !line.text.trim()) continue;

    for (const claim of claimPhrases) {
      if (!claim.phrase || !claim.phrase.trim()) continue;

      const trimmed = claim.phrase.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const prefix = /^\w/.test(trimmed) ? "\\b" : "(?<!\\w)";
      const suffix = /\w$/.test(trimmed) ? "\\b" : "(?!\\w)";
      const regex = new RegExp(`${prefix}${escaped}${suffix}`, "gi");

      let match: RegExpExecArray | null;
      while ((match = regex.exec(line.text)) !== null) {
        claimMatchCounts[claim.id] = (claimMatchCounts[claim.id] || 0) + 1;
        matches.push({
          lineId: line.id,
          turnIndex: idx + 1,
          speakerSlotId: line.speakerSlotId,
          matchedPhrase: match[0],
          claimId: claim.id,
          contextText: line.text,
          reviewStatus: claim.reviewStatus,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  return {
    matches,
    claimMatchCounts,
    totalMatches: matches.length,
  };
}

/**
 * Validates and sanitizes imported claim phrases.
 * If input is undefined or null, returns cloned defaults for backward compatibility.
 * Accepts GitHub's legacy 'reviewed' boolean and 'note' string alongside 'reviewStatus' and 'notes'.
 * Throws an Error if input is present but invalid.
 */
export function validateClaimPhrases(input: unknown): ClaimPhrase[] {
  if (input === undefined || input === null) {
    return cloneDefaultClaimPhrases();
  }

  if (!Array.isArray(input)) {
    throw new Error("Invalid project structure: 'claimPhrases' must be an array.");
  }

  return input.map((item: any, idx: number) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Invalid claim phrase at index ${idx}: Expected an object.`);
    }

    const phrase = String(item.phrase || "").trim();
    if (!phrase) {
      throw new Error(`Invalid claim phrase at index ${idx}: 'phrase' must not be empty.`);
    }

    const validStatuses: ClaimReviewStatus[] = ["unreviewed", "approved", "flagged", "rejected"];
    let status: ClaimReviewStatus = "unreviewed";

    if (item.reviewStatus && validStatuses.includes(item.reviewStatus)) {
      status = item.reviewStatus;
    } else if (typeof item.reviewed === "boolean") {
      // Legacy GitHub compatibility: 'reviewed' boolean flag maps to approved or unreviewed
      status = item.reviewed ? "approved" : "unreviewed";
    }

    const noteText =
      typeof item.notes === "string"
        ? item.notes
        : typeof item.note === "string"
        ? item.note
        : "";

    return {
      id: String(item.id || `claim-${Date.now()}-${idx}`),
      phrase,
      category: item.category ? String(item.category) : "General",
      reviewStatus: status,
      reviewed: status === "approved",
      notes: noteText,
      note: noteText,
    };
  });
}

/**
 * Validates and sanitizes imported MAIVC checklist.
 * If input is undefined or null, returns cloned defaults for backward compatibility.
 * Accepts GitHub's legacy 'note' field alongside 'notes'.
 * Throws an Error if input is present but invalid.
 */
export function validateMaivcChecklist(input: unknown): MaivcChecklistItem[] {
  if (input === undefined || input === null) {
    return cloneDefaultMaivcChecklist();
  }

  if (!Array.isArray(input)) {
    throw new Error("Invalid project structure: 'maivcChecklist' must be an array.");
  }

  return input.map((item: any, idx: number) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Invalid MAIVC checklist item at index ${idx}: Expected an object.`);
    }

    const label = String(item.label || "").trim();
    if (!label) {
      throw new Error(`Invalid MAIVC checklist item at index ${idx}: 'label' must not be empty.`);
    }

    const noteText =
      typeof item.notes === "string"
        ? item.notes
        : typeof item.note === "string"
        ? item.note
        : "";

    const fallbackCode = `MAIVC-${String(idx + 1).padStart(2, "0")}`;
    const code = item.code ? String(item.code) : fallbackCode;

    const severity =
      item.severity === "recommended" || item.severity === "advisory"
        ? item.severity
        : "required";

    return {
      id: String(item.id || `maivc-${idx + 1}`),
      code,
      label,
      description: String(item.description || ""),
      checked: Boolean(item.checked),
      notes: noteText,
      note: noteText,
      severity,
    };
  });
}

/**
 * Generates a comprehensive, human-readable local review export report.
 */
export function generateComplianceReport(
  projectTitle: string,
  projectDescription: string,
  scriptLines: ScriptLine[],
  claimPhrases: ClaimPhrase[],
  maivcChecklist: MaivcChecklistItem[]
): string {
  const timestamp = new Date().toISOString();
  const scan = scanScriptForClaims(scriptLines, claimPhrases);

  const totalClaims = claimPhrases.length;
  const approvedClaims = claimPhrases.filter((c) => c.reviewStatus === "approved").length;
  const flaggedClaims = claimPhrases.filter((c) => c.reviewStatus === "flagged").length;
  const rejectedClaims = claimPhrases.filter((c) => c.reviewStatus === "rejected").length;
  const unreviewedClaims = claimPhrases.filter((c) => c.reviewStatus === "unreviewed").length;

  const totalChecklist = maivcChecklist.length;
  const checkedCount = maivcChecklist.filter((i) => i.checked).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

  const lines: string[] = [
    "================================================================================",
    "MASASAL VOICE AGENT — PRODUCT CLAIM & MAIVC COMPLIANCE REVIEW REPORT",
    "================================================================================",
    `Generated At:        ${timestamp}`,
    `Project Title:       ${projectTitle || "Masasal Voice Agent Workflow"}`,
    `Project Notes:       ${projectDescription || "(None)"}`,
    `Isolation Status:    100% In-Browser Memory (Foundation Mode - Zero Network Egress)`,
    "Rule Label:          Local rule-based tool – no model connected",
    "",
    "--------------------------------------------------------------------------------",
    "1. EXECUTIVE COMPLIANCE SUMMARY",
    "--------------------------------------------------------------------------------",
    `• MAIVC Checklist Progress:   ${checkedCount}/${totalChecklist} items verified (${checklistPercent}%)`,
    `• Registered Claim Phrases:   ${totalClaims} tracked`,
    `  - Approved:                 ${approvedClaims}`,
    `  - Flagged for Review:       ${flaggedClaims}`,
    `  - Rejected:                 ${rejectedClaims}`,
    `  - Pending Review:           ${unreviewedClaims}`,
    `• Claims Detected in Script:  ${scan.totalMatches} match(es) across ${scriptLines.length} script turn(s)`,
    "",
    "--------------------------------------------------------------------------------",
    "2. MAIVC (MASASAL AI VOICE COMPLIANCE) CHECKLIST AUDIT",
    "--------------------------------------------------------------------------------",
  ];

  maivcChecklist.forEach((item) => {
    const statusMark = item.checked ? "[X] COMPLIANT" : "[ ] PENDING";
    lines.push(`${statusMark}  ${item.code}: ${item.label} (${item.severity.toUpperCase()})`);
    lines.push(`     Requirement: ${item.description}`);
    if (item.notes && item.notes.trim()) {
      lines.push(`     Auditor Notes: ${item.notes.trim()}`);
    } else {
      lines.push("     Auditor Notes: (None recorded)");
    }
    lines.push("");
  });

  lines.push("--------------------------------------------------------------------------------");
  lines.push("3. PRODUCT CLAIM PHRASES & VERIFICATION STATUS");
  lines.push("--------------------------------------------------------------------------------");

  claimPhrases.forEach((claim) => {
    const count = scan.claimMatchCounts[claim.id] || 0;
    lines.push(`• Phrase: "${claim.phrase}" [${claim.category || "General"}]`);
    lines.push(`  Review Status:   ${claim.reviewStatus.toUpperCase()}`);
    lines.push(`  Detected Hits:   ${count} occurrence(s) in active script`);
    lines.push(`  Review Notes:    ${claim.notes ? claim.notes.trim() : "(No specific notes recorded)"}`);
    lines.push("");
  });

  lines.push("--------------------------------------------------------------------------------");
  lines.push("4. DETECTED SCRIPT OCCURRENCES");
  lines.push("--------------------------------------------------------------------------------");

  if (scan.matches.length === 0) {
    lines.push("No registered claim phrases were detected in the current script dialogue.");
  } else {
    scan.matches.forEach((m, idx) => {
      lines.push(`[Occurrence #${idx + 1}] Turn #${m.turnIndex} (Speaker: ${m.speakerSlotId})`);
      lines.push(`  Matched Phrase:  "${m.matchedPhrase}" (Status: ${m.reviewStatus.toUpperCase()})`);
      lines.push(`  Turn Dialogue:   "${m.contextText}"`);
      lines.push("");
    });
  }

  lines.push("================================================================================");
  lines.push("DISCLAIMER:");
  lines.push("This report was produced deterministically by browser-side rule checkers.");
  lines.push("No AI model or remote service was connected. This tool flags terms for manual");
  lines.push("human review and does not constitute formal legal verification.");
  lines.push("================================================================================");

  return lines.join("\n");
}

export const LEGAL_CAVEATS: readonly string[] = [
  "This review report was produced deterministically by browser-side rule checkers with zero external network egress or model calls.",
  "Deterministic phrase matching is an aid for human verification and does not constitute formal legal clearance or warranty.",
  "User and publisher retain full responsibility for marketing claims substantiation, voice consent disclosures, and compliance with platform and statutory advertising regulations.",
  "No warranty of merchantability, regulatory approval, or fitness for publication is implied.",
] as const;

/**
 * Builds structured review report data suitable for JSON export or programmatic validation.
 * Includes script lines, claim matches with character offsets, review statuses and notes,
 * checklist states and notes, pre-publishing warnings for unchecked/flagged items, and legal caveats.
 */
export function generateComplianceReviewData(
  projectTitle: string,
  projectDescription: string,
  scriptLines: ScriptLine[],
  claimPhrases: ClaimPhrase[],
  maivcChecklist: MaivcChecklistItem[]
): ComplianceReviewJsonData {
  const timestamp = new Date().toISOString();
  const scan = scanScriptForClaims(scriptLines, claimPhrases);

  const totalClaims = claimPhrases.length;
  const approvedClaims = claimPhrases.filter((c) => c.reviewStatus === "approved").length;
  const flaggedClaims = claimPhrases.filter((c) => c.reviewStatus === "flagged").length;
  const rejectedClaims = claimPhrases.filter((c) => c.reviewStatus === "rejected").length;
  const unreviewedClaims = claimPhrases.filter((c) => c.reviewStatus === "unreviewed").length;

  const totalChecklist = maivcChecklist.length;
  const checkedCount = maivcChecklist.filter((i) => i.checked).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

  // Compile pre-publishing warnings
  const uncheckedWarnings: string[] = [];

  // 1. Checklist warnings
  maivcChecklist
    .filter((item) => !item.checked)
    .forEach((item) => {
      uncheckedWarnings.push(
        `[CHECKLIST ${item.severity.toUpperCase()}] ${item.code || item.id}: "${item.label}" is unchecked prior to publishing.`
      );
    });

  // 2. Claim verification warnings for detected matches
  scan.matches.forEach((m) => {
    if (m.reviewStatus === "rejected") {
      uncheckedWarnings.push(
        `[REJECTED CLAIM DETECTED] Turn #${m.turnIndex}: Line contains rejected claim phrase "${m.matchedPhrase}".`
      );
    } else if (m.reviewStatus === "flagged") {
      uncheckedWarnings.push(
        `[FLAGGED CLAIM DETECTED] Turn #${m.turnIndex}: Line contains flagged claim phrase "${m.matchedPhrase}" requiring legal review.`
      );
    } else if (m.reviewStatus === "unreviewed") {
      uncheckedWarnings.push(
        `[UNREVIEWED CLAIM DETECTED] Turn #${m.turnIndex}: Line contains unreviewed claim phrase "${m.matchedPhrase}".`
      );
    }
  });

  const claimPhrasesWithCounts = claimPhrases.map((c) => ({
    ...c,
    reviewed: c.reviewStatus === "approved",
    note: c.notes || "",
    matchCount: scan.claimMatchCounts[c.id] || 0,
  }));

  const maivcChecklistWithNote = maivcChecklist.map((item) => ({
    ...item,
    note: item.notes || "",
  }));

  return {
    version: "1.0.0",
    generatedAt: timestamp,
    project: {
      title: projectTitle || "Masasal Voice Agent Workflow",
      description: projectDescription || "",
    },
    isolation: "100% In-Browser Memory (Foundation Mode - Zero Network Egress)",
    ruleLabel: "Local rule-based tool – no model connected",
    summary: {
      maivcProgress: {
        total: totalChecklist,
        checked: checkedCount,
        percentage: checklistPercent,
        fullyCompliant: totalChecklist > 0 && checkedCount === totalChecklist,
      },
      claimsSummary: {
        total: totalClaims,
        approved: approvedClaims,
        flagged: flaggedClaims,
        rejected: rejectedClaims,
        unreviewed: unreviewedClaims,
      },
      scriptMatchesSummary: {
        totalMatches: scan.totalMatches,
        scriptLineCount: scriptLines.length,
      },
    },
    scriptLines,
    claimPhrases: claimPhrasesWithCounts,
    claimMatches: scan.matches,
    maivcChecklist: maivcChecklistWithNote,
    uncheckedWarnings,
    legalCaveats: [...LEGAL_CAVEATS],
  };
}

/**
 * Returns formatted JSON string of the compliance review report.
 */
export function generateComplianceReviewJson(
  projectTitle: string,
  projectDescription: string,
  scriptLines: ScriptLine[],
  claimPhrases: ClaimPhrase[],
  maivcChecklist: MaivcChecklistItem[]
): string {
  const data = generateComplianceReviewData(
    projectTitle,
    projectDescription,
    scriptLines,
    claimPhrases,
    maivcChecklist
  );
  return JSON.stringify(data, null, 2);
}
