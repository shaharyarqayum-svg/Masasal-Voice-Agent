import { ReelScene, ReelSettings, ScriptLine } from "../types.ts";

export const GENERIC_BROLL_TEMPLATES = [
  "Talking Head / Direct to Camera (Eye-level, medium close-up)",
  "Product Close-Up / Handheld Demonstration",
  "Screen Capture / Interface Walkthrough",
  "Over-the-Shoulder Reaction / Observation",
  "Kinetic Text Card / Graphic Slate with Motion",
  "Ambient Workplace / Context & Environment B-Roll",
  "Fast Jump Cut / Dynamic Angle Switch",
];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Splits approved script text into scenes following the exact deterministic rules:
 * 1. Preserve original wording and order
 * 2. Split at paragraph boundaries first
 * 3. If a paragraph exceeds word limit, split at sentence boundaries
 * 4. Never split a word
 * 5. Never silently rewrite, summarize, delete, or add content
 * 6. If an individual sentence exceeds word limit, keep complete sentence intact and flag it
 * 7. Default scene word limit: 30 words (configurable and validated)
 */
export function splitScriptIntoScenes(
  scriptLines: ScriptLine[],
  settings: ReelSettings
): ReelScene[] {
  if (!scriptLines || scriptLines.length === 0) {
    return [];
  }

  const wordLimit = settings.sceneWordLimit > 0 ? settings.sceneWordLimit : 30;
  const wpm = settings.defaultWpm > 0 ? settings.defaultWpm : 140;
  const pauseSec = settings.defaultPauseSec >= 0 ? settings.defaultPauseSec : 0.4;

  // Gather complete text while preserving line associations
  const paragraphs: Array<{ text: string; sourceLineIds: string[] }> = [];

  for (const line of scriptLines) {
    const raw = line.text.trim();
    if (!raw) continue;

    // Split by explicit double newlines if user entered multi-paragraph dialogue
    const parts = raw.split(/\n\s*\n/).filter((p) => p.trim());
    for (const part of parts) {
      paragraphs.push({
        text: part.trim(),
        sourceLineIds: [line.id],
      });
    }
  }

  if (paragraphs.length === 0) {
    return [];
  }

  const rawSceneChunks: Array<{ text: string; sourceLineIds: string[]; isOverLimit: boolean; limitWarning?: string }> =
    [];

  for (const para of paragraphs) {
    const paraWords = countWords(para.text);

    // Rule 2: If paragraph is within word limit, keep as one scene
    if (paraWords <= wordLimit) {
      rawSceneChunks.push({
        text: para.text,
        sourceLineIds: para.sourceLineIds,
        isOverLimit: false,
      });
      continue;
    }

    // Rule 3: Split paragraph at sentence boundaries
    // Sentence regex matching sentence ending (. ! ?) followed by whitespace or end of string
    const sentenceMatches = para.text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [para.text];

    let currentBatch: string[] = [];
    let currentBatchWords = 0;

    for (const sent of sentenceMatches) {
      const cleanSent = sent.trim();
      if (!cleanSent) continue;
      const sentWords = countWords(cleanSent);

      // Rule 6: If single sentence exceeds word limit, preserve complete sentence intact and flag it
      if (sentWords > wordLimit) {
        // Flush any accumulated batch before this overlong sentence
        if (currentBatch.length > 0) {
          const batchText = currentBatch.join(" ");
          rawSceneChunks.push({
            text: batchText,
            sourceLineIds: para.sourceLineIds,
            isOverLimit: false,
          });
          currentBatch = [];
          currentBatchWords = 0;
        }

        rawSceneChunks.push({
          text: cleanSent,
          sourceLineIds: para.sourceLineIds,
          isOverLimit: true,
          limitWarning: `Exceeds ${wordLimit}-word limit (${sentWords} words) — complete sentence preserved intact per deterministic rule.`,
        });
        continue;
      }

      // Check if adding this sentence exceeds the limit
      if (currentBatchWords + sentWords <= wordLimit || currentBatch.length === 0) {
        currentBatch.push(cleanSent);
        currentBatchWords += sentWords;
      } else {
        // Flush current batch and start new batch with this sentence
        rawSceneChunks.push({
          text: currentBatch.join(" "),
          sourceLineIds: para.sourceLineIds,
          isOverLimit: false,
        });
        currentBatch = [cleanSent];
        currentBatchWords = sentWords;
      }
    }

    if (currentBatch.length > 0) {
      rawSceneChunks.push({
        text: currentBatch.join(" "),
        sourceLineIds: para.sourceLineIds,
        isOverLimit: false,
      });
    }
  }

  // Build full ReelScene array with timing, B-roll, on-screen text, and subtitles
  let runningTimeSec = 0;

  const scenes: ReelScene[] = rawSceneChunks.map((chunk, idx) => {
    const sceneWords = countWords(chunk.text);

    // Formula: (wordCount / WPM) * 60 + pause
    const rawDuration = (sceneWords / wpm) * 60 + pauseSec;
    const durationSec = Math.max(1.0, Math.round(rawDuration * 10) / 10);
    const startSec = Math.round(runningTimeSec * 10) / 10;
    const endSec = Math.round((runningTimeSec + durationSec) * 10) / 10;
    runningTimeSec += durationSec;

    // Default on-screen hook: first 4-6 words uppercase, or scene label
    const wordsArr = chunk.text.split(/\s+/);
    const hookText = wordsArr.slice(0, 5).join(" ").toUpperCase();

    // Default template suggestion cycling
    const bRollSuggestion = GENERIC_BROLL_TEMPLATES[idx % GENERIC_BROLL_TEMPLATES.length];

    return {
      id: `scene-${Date.now()}-${idx + 1}`,
      sceneNumber: idx + 1,
      sourceLineIds: chunk.sourceLineIds,
      spokenText: chunk.text,
      wordCount: sceneWords,
      isOverLimit: chunk.isOverLimit,
      limitWarning: chunk.limitWarning,
      onScreenText: hookText,
      subtitleText: chunk.text,
      shotList: `Shot #${idx + 1}: Eye-level framed for 9:16 vertical video`,
      bRollSuggestion,
      estimatedDurationSec: durationSec,
      startSec,
      endSec,
    };
  });

  return scenes;
}

/**
 * Formats seconds into standard SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Exports scenes into valid SubRip Subtitle (.srt) format.
 */
export function exportScenesToSrt(scenes: ReelScene[]): string {
  if (scenes.length === 0) return "";

  const blocks = scenes.map((scene, idx) => {
    const start = formatSrtTimestamp(scene.startSec);
    const end = formatSrtTimestamp(scene.endSec);
    const text = scene.subtitleText.trim() || scene.spokenText.trim();
    return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
  });

  return blocks.join("\n");
}

/**
 * Exports scenes into structured JSON format.
 */
export function exportScenesToJson(scenes: ReelScene[], settings: ReelSettings): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalScenes: scenes.length,
    sceneWordLimit: settings.sceneWordLimit,
    wordsPerMinuteAssumption: settings.defaultWpm,
    totalEstimatedDurationSec: scenes.length > 0 ? scenes[scenes.length - 1].endSec : 0,
    label: "Rough estimate only — not measured audio",
    scenes,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Exports scenes into valid CSV format.
 */
export function exportScenesToCsv(scenes: ReelScene[]): string {
  const headers = [
    "Scene Number",
    "Start Time (s)",
    "End Time (s)",
    "Estimated Duration (s)",
    "Word Count",
    "Spoken Dialogue",
    "On-Screen Text",
    "Subtitles",
    "Shot List Notes",
    "Generic B-Roll Template",
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = scenes.map((s) => [
    s.sceneNumber,
    s.startSec,
    s.endSec,
    s.estimatedDurationSec,
    s.wordCount,
    escapeCsv(s.spokenText),
    escapeCsv(s.onScreenText),
    escapeCsv(s.subtitleText),
    escapeCsv(s.shotList),
    escapeCsv(s.bRollSuggestion),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
