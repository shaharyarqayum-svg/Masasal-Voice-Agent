import { useRef, useState, ChangeEvent } from "react";
import { Download, Upload, RotateCcw, Check, AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { ProjectData, ScriptLine, SpeakerSlot, PronunciationEntry, ReelScene, ReelSettings, ClaimPhrase, MaivcChecklistItem } from "../types.ts";
import { DEFAULT_CLAIM_PHRASES, DEFAULT_MAIVC_CHECKLIST } from "../utils/claimMaivc.ts";

interface ProjectActionsProps {
  projectTitle: string;
  projectDescription: string;
  speakerSlots: SpeakerSlot[];
  scriptLines: ScriptLine[];
  pronunciationDictionary: PronunciationEntry[];
  pronunciationOverrides: PronunciationEntry[];
  reelScenes: ReelScene[];
  reelSettings: ReelSettings;
  claimPhrases: ClaimPhrase[];
  maivcChecklist: MaivcChecklistItem[];
  onImportProject: (data: ProjectData) => void;
  onResetProject: () => void;
  disabled?: boolean;
}

export default function ProjectActions({
  projectTitle,
  projectDescription,
  speakerSlots,
  scriptLines,
  pronunciationDictionary,
  pronunciationOverrides,
  reelScenes,
  reelSettings,
  claimPhrases,
  maivcChecklist,
  onImportProject,
  onResetProject,
  disabled = false,
}: ProjectActionsProps) {
  const [importError, setImportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Export current in-memory state to a downloadable JSON file
  const handleExport = () => {
    try {
      const projectPayload: ProjectData = {
        version: "1.0.0",
        title: projectTitle || "Masasal Voice Agent Project",
        description: projectDescription || "Local voice agent script and persona configuration",
        speakerSlots,
        scriptLines,
        pronunciationDictionary,
        pronunciationOverrides,
        reelScenes,
        reelSettings,
        claimPhrases,
        maivcChecklist,
        exportedAt: new Date().toISOString(),
      };

      const jsonStr = JSON.stringify(projectPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const safeTitle = (projectTitle || "masasal-project")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-");
      const filename = `${safeTitle}-${Date.now()}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err: any) {
      console.error("Export error:", err);
      setImportError(`Failed to generate export file: ${err.message || "Unknown error"}`);
    }
  };

  // Import JSON project file from user's local disk
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("Uploaded file is empty.");

        const parsed = JSON.parse(text);

        // Schema validation
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("Invalid format: Root element must be a JSON object.");
        }

        if (!Array.isArray(parsed.speakerSlots) || parsed.speakerSlots.length === 0) {
          throw new Error("Invalid project structure: Missing or empty 'speakerSlots' array.");
        }

        if (!Array.isArray(parsed.scriptLines)) {
          throw new Error("Invalid project structure: Missing 'scriptLines' array.");
        }

        // Validate individual speaker slot elements
        const validatedSlots: SpeakerSlot[] = parsed.speakerSlots.map((s: any, idx: number) => {
          if (!s.name || !s.voiceProfileId) {
            throw new Error(`Speaker slot #${idx + 1} is missing required 'name' or 'voiceProfileId'.`);
          }
          return {
            id: String(s.id || `slot-${idx + 1}`),
            name: String(s.name),
            voiceProfileId: String(s.voiceProfileId),
            tone: String(s.tone || "Standard Tone"),
            pace: typeof s.pace === "number" && s.pace > 0 ? s.pace : 1.0,
            delivery: String(s.delivery || "Conversational"),
            color: String(s.color || "indigo"),
          };
        });

        // Validate individual script lines
        const validatedLines: ScriptLine[] = parsed.scriptLines.map((l: any, idx: number) => {
          return {
            id: String(l.id || `line-${Date.now()}-${idx}`),
            speakerSlotId: String(l.speakerSlotId || validatedSlots[0].id),
            text: String(l.text || ""),
            deliveryNotes: l.deliveryNotes ? String(l.deliveryNotes) : undefined,
            emotion: l.emotion ? String(l.emotion) : undefined,
            emphasisNotes: l.emphasisNotes ? String(l.emphasisNotes) : undefined,
            wpm: typeof l.wpm === "number" && l.wpm > 0 ? l.wpm : undefined,
            pauseAfterSeconds: typeof l.pauseAfterSeconds === "number" && l.pauseAfterSeconds >= 0 ? l.pauseAfterSeconds : 0.4,
          };
        });

        // Validate pronunciation dictionary & overrides if present
        const validatedDict: PronunciationEntry[] = Array.isArray(parsed.pronunciationDictionary)
          ? parsed.pronunciationDictionary.map((p: any, idx: number) => ({
              id: String(p.id || `pron-dict-${idx}`),
              term: String(p.term || ""),
              reading: String(p.reading || ""),
              notes: p.notes ? String(p.notes) : undefined,
              isOverride: false,
              flagReason: p.flagReason ? String(p.flagReason) : undefined,
            }))
          : [];

        const validatedOverrides: PronunciationEntry[] = Array.isArray(parsed.pronunciationOverrides)
          ? parsed.pronunciationOverrides.map((p: any, idx: number) => ({
              id: String(p.id || `pron-override-${idx}`),
              term: String(p.term || ""),
              reading: String(p.reading || ""),
              notes: p.notes ? String(p.notes) : undefined,
              isOverride: true,
              flagReason: p.flagReason ? String(p.flagReason) : undefined,
            }))
          : [];

        // Validate reel scenes if present
        const validatedScenes: ReelScene[] = Array.isArray(parsed.reelScenes)
          ? parsed.reelScenes.map((s: any, idx: number) => ({
              id: String(s.id || `scene-${idx}`),
              sceneNumber: idx + 1,
              sourceLineIds: Array.isArray(s.sourceLineIds) ? s.sourceLineIds : [],
              spokenText: String(s.spokenText || ""),
              wordCount: typeof s.wordCount === "number" ? s.wordCount : 0,
              isOverLimit: Boolean(s.isOverLimit),
              limitWarning: s.limitWarning ? String(s.limitWarning) : undefined,
              onScreenText: String(s.onScreenText || ""),
              subtitleText: String(s.subtitleText || ""),
              shotList: String(s.shotList || ""),
              bRollSuggestion: String(s.bRollSuggestion || ""),
              estimatedDurationSec: typeof s.estimatedDurationSec === "number" ? s.estimatedDurationSec : 3.0,
              startSec: typeof s.startSec === "number" ? s.startSec : 0,
              endSec: typeof s.endSec === "number" ? s.endSec : 3.0,
            }))
          : [];

        const validatedSettings: ReelSettings = {
          sceneWordLimit:
            parsed.reelSettings && typeof parsed.reelSettings.sceneWordLimit === "number" && parsed.reelSettings.sceneWordLimit > 0
              ? parsed.reelSettings.sceneWordLimit
              : 30,
          defaultWpm:
            parsed.reelSettings && typeof parsed.reelSettings.defaultWpm === "number" && parsed.reelSettings.defaultWpm > 0
              ? parsed.reelSettings.defaultWpm
              : 140,
          defaultPauseSec:
            parsed.reelSettings && typeof parsed.reelSettings.defaultPauseSec === "number" && parsed.reelSettings.defaultPauseSec >= 0
              ? parsed.reelSettings.defaultPauseSec
              : 0.4,
        };

        const validatedClaimPhrases: ClaimPhrase[] = Array.isArray(parsed.claimPhrases)
          ? parsed.claimPhrases.map((p: any, idx: number) => {
              if (typeof p.phrase !== "string" || typeof p.reviewed !== "boolean") {
                throw new Error(`Claim phrase #${idx + 1} is invalid.`);
              }
              return { id: String(p.id || `claim-${idx}`), phrase: p.phrase, reviewed: p.reviewed };
            })
          : DEFAULT_CLAIM_PHRASES.map((item) => ({ ...item }));

        const validatedMaivcChecklist: MaivcChecklistItem[] = Array.isArray(parsed.maivcChecklist)
          ? parsed.maivcChecklist.map((item: any, idx: number) => {
              if (typeof item.label !== "string" || typeof item.checked !== "boolean") {
                throw new Error(`MAIVC checklist item #${idx + 1} is invalid.`);
              }
              return { id: String(item.id || `maivc-${idx}`), label: item.label, checked: item.checked, note: String(item.note || "") };
            })
          : DEFAULT_MAIVC_CHECKLIST.map((item) => ({ ...item }));

        const validatedProject: ProjectData = {
          version: "1.0.0",
          title: String(parsed.title || "Imported Voice Agent Project"),
          description: String(parsed.description || ""),
          speakerSlots: validatedSlots,
          scriptLines: validatedLines,
          pronunciationDictionary: validatedDict,
          pronunciationOverrides: validatedOverrides,
          reelScenes: validatedScenes,
          reelSettings: validatedSettings,
          claimPhrases: validatedClaimPhrases,
          maivcChecklist: validatedMaivcChecklist,
          exportedAt: parsed.exportedAt || new Date().toISOString(),
        };

        onImportProject(validatedProject);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err: any) {
        setImportError(err.message || "Failed to parse JSON project file.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setImportError("Error reading local project file.");
    };

    reader.readAsText(file);
  };

  const confirmReset = () => {
    onResetProject();
    setShowResetConfirm(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Session-only storage warning */}
      <div
        id="session-storage-notice"
        className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/70 text-slate-300 text-xs flex items-center justify-between gap-2 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] leading-tight">
            <strong>Session-Only Storage:</strong> Refreshing or closing the application will discard unsaved session data. Use <strong>Export JSON</strong> to save your work locally.
          </span>
        </div>
        <span className="hidden sm:inline px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700 shrink-0">
          No Database • No Cloud
        </span>
      </div>

      {/* Toolbar Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            id="export-project-btn"
            disabled={disabled}
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            title="Download complete project script, dictionary, and scene settings as JSON"
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export JSON</span>
              </>
            )}
          </button>

          {/* Import Button */}
          <label
            htmlFor="import-project-input"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            title="Upload and load an existing project JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import JSON</span>
            <input
              ref={fileInputRef}
              id="import-project-input"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={disabled}
              className="sr-only"
            />
          </label>
        </div>

        {/* Reset Action */}
        <div className="flex items-center gap-2">
          {!showResetConfirm ? (
            <button
              type="button"
              id="reset-project-btn"
              disabled={disabled}
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer"
              title="Reset project to default empty state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Project</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-950/80 px-2 py-1 rounded-lg border border-rose-800">
              <span className="text-[11px] text-rose-200 font-medium">Reset all?</span>
              <button
                type="button"
                onClick={confirmReset}
                className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import error message */}
      {importError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="text-xs text-rose-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
