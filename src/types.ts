export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  tone: string;
}

export type GeminiVoice = VoiceProfile;

export interface SpeakerSlot {
  id: string;
  name: string;
  voiceProfileId: string;
  tone: string;
  pace: number; // e.g. 0.75, 1.0, 1.25, 1.5
  delivery: string; // e.g. "Conversational", "Empathetic", "Urgent", "Authoritative", "Technical", "Subdued"
  color: string; // badge color theme
}

export interface ScriptLine {
  id: string;
  speakerSlotId: string;
  text: string;
  deliveryNotes?: string;
  emotion?: string;
  emphasisNotes?: string;
  wpm?: number; // visible words-per-minute setting (default 140)
  pauseAfterSeconds?: number;
}

export interface PronunciationEntry {
  id: string;
  term: string;
  reading: string;
  notes?: string;
  isOverride?: boolean; // script-level override vs global dictionary
  flagReason?: string;
}

export interface ReelScene {
  id: string;
  sceneNumber: number;
  sourceLineIds: string[];
  spokenText: string;
  wordCount: number;
  isOverLimit: boolean;
  limitWarning?: string;
  onScreenText: string;
  subtitleText: string;
  shotList: string;
  bRollSuggestion: string;
  estimatedDurationSec: number;
  startSec: number;
  endSec: number;
}

export interface ReelSettings {
  sceneWordLimit: number; // default 30
  defaultWpm: number; // default 140
  defaultPauseSec: number; // default 0.4
}

export interface ClaimPhrase {\n  id: string;\n  phrase: string;\n  reviewed: boolean;\n}\n\nexport interface MaivcChecklistItem {\n  id: string;\n  label: string;\n  checked: boolean;\n  note: string;\n}\n\nexport interface ProjectData {
  version: "1.0.0";
  title: string;
  description: string;
  speakerSlots: SpeakerSlot[];
  scriptLines: ScriptLine[];
  pronunciationDictionary?: PronunciationEntry[];
  pronunciationOverrides?: PronunciationEntry[];
  reelScenes?: ReelScene[];
  reelSettings?: ReelSettings;\n  claimPhrases?: ClaimPhrase[];\n  maivcChecklist?: MaivcChecklistItem[];
  exportedAt: string;
}

export interface WavMetadata {
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number;
  sampleRate: number;
  channels: number; // 1 = Mono, 2 = Stereo, etc.
  bitDepth: number; // 8, 16, 24, 32
  audioFormat: number; // 1 = PCM, 3 = IEEE Float, etc.
  audioFormatName: string;
  byteRate: number;
}

export interface SimulatedLineTiming {
  lineId: string;
  speakerSlotId: string;
  speakerName: string;
  voiceName: string;
  tone: string;
  pace: number;
  delivery: string;
  text: string;
  wordCount: number;
  charCount: number;
  startTimeSec: number;
  durationSec: number;
  endTimeSec: number;
  pauseAfterSec: number;
}

export interface SimulatedGenerationReport {
  isSimulatedMock: true;
  projectTitle: string;
  totalLines: number;
  totalWords: number;
  totalChars: number;
  totalDurationSeconds: number;
  lineTimings: SimulatedLineTiming[];
  speakerStats: Record<
    string,
    {
      speakerName: string;
      voiceName: string;
      lineCount: number;
      wordCount: number;
      durationSec: number;
    }
  >;
  timestamp: string;
  foundationWarning: string;
}

// Kept for backward compatibility if referenced
export interface SimulatedGenerationResult {
  voiceId: string;
  voiceName: string;
  voiceTone: string;
  voiceDirection: string;
  dialogue: string;
  wordCount: number;
  charCount: number;
  simulatedDurationSeconds: number;
  timestamp: string;
  foundationWarning: string;
  isSimulatedMock: true;
}
