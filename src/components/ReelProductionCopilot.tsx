import { useState } from "react";
import {
  Film,
  Scissors,
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Clock,
  Layers,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Check,
  Video,
} from "lucide-react";
import { ReelScene, ReelSettings, ScriptLine } from "../types.ts";
import {
  splitScriptIntoScenes,
  exportScenesToSrt,
  exportScenesToJson,
  exportScenesToCsv,
  GENERIC_BROLL_TEMPLATES,
  countWords,
} from "../utils/reelSplitter.ts";

interface ReelProductionCopilotProps {
  scriptLines: ScriptLine[];
  scenes: ReelScene[];
  settings: ReelSettings;
  onUpdateScenes: (newScenes: ReelScene[]) => void;
  onUpdateSettings: (newSettings: ReelSettings) => void;
  disabled?: boolean;
}

export default function ReelProductionCopilot({
  scriptLines,
  scenes,
  settings,
  onUpdateScenes,
  onUpdateSettings,
  disabled = false,
}: ReelProductionCopilotProps) {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const wordLimit = settings.sceneWordLimit > 0 ? settings.sceneWordLimit : 30;

  // Split script into scenes deterministically
  const handleGenerateScenes = () => {
    const generated = splitScriptIntoScenes(scriptLines, settings);
    onUpdateScenes(generated);
  };

  // Add empty scene
  const handleAddScene = () => {
    const nextNum = scenes.length + 1;
    const prevEnd = scenes.length > 0 ? scenes[scenes.length - 1].endSec : 0;
    const duration = 3.0;

    const newScene: ReelScene = {
      id: `scene-${Date.now()}`,
      sceneNumber: nextNum,
      sourceLineIds: [],
      spokenText: "",
      wordCount: 0,
      isOverLimit: false,
      onScreenText: `SCENE #${nextNum}`,
      subtitleText: "",
      shotList: `Shot #${nextNum}: Eye-level framed for 9:16 vertical video`,
      bRollSuggestion: GENERIC_BROLL_TEMPLATES[0],
      estimatedDurationSec: duration,
      startSec: prevEnd,
      endSec: prevEnd + duration,
    };
    onUpdateScenes([...scenes, newScene]);
  };

  // Delete scene
  const handleDeleteScene = (id: string) => {
    const remaining = scenes.filter((s) => s.id !== id);
    // Recalculate scene numbers & timings
    recalculateTimings(remaining);
  };

  // Move scene
  const handleMoveScene = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= scenes.length) return;

    const nextScenes = [...scenes];
    const temp = nextScenes[index];
    nextScenes[index] = nextScenes[target];
    nextScenes[target] = temp;
    recalculateTimings(nextScenes);
  };

  // Update scene item
  const handleUpdateScene = (updated: ReelScene) => {
    const nextScenes = scenes.map((s) => (s.id === updated.id ? updated : s));
    recalculateTimings(nextScenes);
  };

  // Helper to recalculate sequential timings and scene numbers
  const recalculateTimings = (items: ReelScene[]) => {
    let running = 0;
    const wpm = settings.defaultWpm > 0 ? settings.defaultWpm : 140;
    const pause = settings.defaultPauseSec >= 0 ? settings.defaultPauseSec : 0.4;

    const recalced = items.map((s, idx) => {
      const words = countWords(s.spokenText);
      const rawDur = (words / wpm) * 60 + pause;
      const durationSec = Math.max(1.0, Math.round(rawDur * 10) / 10);
      const startSec = Math.round(running * 10) / 10;
      const endSec = Math.round((running + durationSec) * 10) / 10;
      running += durationSec;

      return {
        ...s,
        sceneNumber: idx + 1,
        wordCount: words,
        isOverLimit: words > wordLimit,
        limitWarning:
          words > wordLimit
            ? `Exceeds ${wordLimit}-word limit (${words} words) — intact sentence preserved per deterministic rule.`
            : undefined,
        estimatedDurationSec: durationSec,
        startSec,
        endSec,
      };
    });

    onUpdateScenes(recalced);
  };

  // Local File Downloader helper (Zero network calls)
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(filename);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err: any) {
      console.error("Export download failed:", err);
    }
  };

  const totalDuration = scenes.length > 0 ? scenes[scenes.length - 1].endSec : 0;

  return (
    <section
      id="reel-production-copilot-section"
      aria-labelledby="reel-copilot-title"
      className="bg-slate-900/85 rounded-2xl border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm"
    >
      {/* Header with Mandatory Capability Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="reel-copilot-title" className="text-sm font-bold text-white tracking-wide">
                Reel Production Copilot
              </h3>
              {/* Mandatory label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
                Local rule-based tool – no model connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic scene splitting for Instagram Reels, with editable B-roll templates, on-screen text, subtitles, and local SRT/CSV exports
            </p>
          </div>
        </div>

        {/* Local Export Buttons Bar */}
        {scenes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  exportScenesToSrt(scenes),
                  `reel-subtitles-${Date.now()}.srt`,
                  "text/plain"
                )
              }
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Download local SRT subtitle file"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export SRT</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  exportScenesToCsv(scenes),
                  `reel-shotlist-${Date.now()}.csv`,
                  "text/csv"
                )
              }
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Download local CSV shot list"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  exportScenesToJson(scenes, settings),
                  `reel-production-${Date.now()}.json`,
                  "application/json"
                )
              }
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Download local JSON production file"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Download success banner */}
      {downloadSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/70 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Export generated and saved locally: <strong>{downloadSuccess}</strong> (0 bytes uploaded)</span>
          </div>
        </div>
      )}

      {/* Config Bar: Scene Word Limit & Split Action */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Scene Word Limit:</span>
            <input
              type="number"
              min={10}
              max={100}
              value={wordLimit}
              disabled={disabled}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0) {
                  onUpdateSettings({ ...settings, sceneWordLimit: val });
                }
              }}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-[11px] text-slate-500">words/scene (Default: 30)</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <span className="text-[11px] font-semibold text-slate-400">WPM:</span>
            <span className="font-mono text-slate-300">{settings.defaultWpm || 140}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateScenes}
            disabled={disabled || scriptLines.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split Script into Scenes</span>
          </button>

          <button
            type="button"
            onClick={handleAddScene}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Rules explanation disclaimer */}
      <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[10px] text-slate-500 flex flex-col gap-1">
        <span className="font-bold text-slate-400">Deterministic Splitting Rules:</span>
        <p>
          1. Wording & order preserved verbatim • 2. Splits at paragraph boundaries first • 3. Splits paragraphs at sentence boundaries if exceeding limit • 4. Never splits words • 5. Never rewrites or summarizes • 6. Overlong sentences kept intact and flagged.
        </p>
      </div>

      {/* Empty State */}
      {scenes.length === 0 && (
        <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-center gap-2.5">
          <Video className="w-8 h-8 text-slate-600" />
          <span className="text-sm font-semibold text-slate-300">No Reel scenes created yet</span>
          <p className="text-xs text-slate-500 max-w-sm">
            {scriptLines.length > 0
              ? 'Click "Split Script into Scenes" to partition your current script using the paragraph & sentence boundary rules.'
              : "Your script is empty. Add script turns in the Script & Voice Director tab first."}
          </p>
          {scriptLines.length > 0 && (
            <button
              type="button"
              onClick={handleGenerateScenes}
              className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split Script into Scenes ({wordLimit} words/scene)</span>
            </button>
          )}
        </div>
      )}

      {/* Scenes List */}
      {scenes.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Timeline Summary Bar */}
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 font-mono">
            <span className="text-slate-400">
              Total Scenes: <strong className="text-white">{scenes.length}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-indigo-300 font-bold">
                Est. Total: ~{totalDuration.toFixed(1)}s
              </span>
              <span className="text-[10px] text-amber-300 font-sans font-medium">
                Rough estimate only — not measured audio.
              </span>
            </div>
          </div>

          {/* Individual Scene Cards */}
          <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
            {scenes.map((scene, idx) => (
              <div
                key={scene.id}
                className={`bg-slate-950/90 rounded-xl border p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-sm transition-colors ${
                  scene.isOverLimit ? "border-amber-700/80" : "border-slate-800"
                }`}
              >
                {/* Scene Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-bold text-[10px]">
                      Scene #{scene.sceneNumber}
                    </span>
                    <span className="font-mono text-slate-400 text-xs">
                      {scene.startSec.toFixed(1)}s - {scene.endSec.toFixed(1)}s (~{scene.estimatedDurationSec}s)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({scene.wordCount} words)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled || idx === 0}
                      onClick={() => handleMoveScene(idx, "up")}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move scene up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || idx === scenes.length - 1}
                      onClick={() => handleMoveScene(idx, "down")}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move scene down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDeleteScene(scene.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
                      title="Delete scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Overlimit Warning Banner if single sentence exceeded word limit */}
                {scene.isOverLimit && scene.limitWarning && (
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-800/80 text-amber-200 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{scene.limitWarning}</span>
                  </div>
                )}

                {/* Spoken Text (Source Dialogue) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Spoken Script Segment
                  </label>
                  <textarea
                    rows={2}
                    value={scene.spokenText}
                    disabled={disabled}
                    onChange={(e) => handleUpdateScene({ ...scene, spokenText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>

                {/* 3-Column Production Metadata: On-screen text, Subtitles, Shot list */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* On-Screen Text */}
                  <div className="flex flex-col gap-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      On-Screen Text Hook:
                    </span>
                    <input
                      type="text"
                      value={scene.onScreenText}
                      disabled={disabled}
                      onChange={(e) => handleUpdateScene({ ...scene, onScreenText: e.target.value })}
                      placeholder="e.g. 3 KEYS TO AGENT SETUP"
                      className="bg-transparent border-0 text-[11px] text-indigo-200 font-bold focus:outline-none"
                    />
                  </div>

                  {/* Subtitle Text */}
                  <div className="flex flex-col gap-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Subtitle Line (SRT):
                    </span>
                    <input
                      type="text"
                      value={scene.subtitleText}
                      disabled={disabled}
                      onChange={(e) => handleUpdateScene({ ...scene, subtitleText: e.target.value })}
                      placeholder="Subtitle display line"
                      className="bg-transparent border-0 text-[11px] text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Shot List */}
                  <div className="flex flex-col gap-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Shot List Note:
                    </span>
                    <input
                      type="text"
                      value={scene.shotList}
                      disabled={disabled}
                      onChange={(e) => handleUpdateScene({ ...scene, shotList: e.target.value })}
                      placeholder="Camera direction"
                      className="bg-transparent border-0 text-[11px] text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Generic B-Roll Idea Template Selector */}
                <div className="flex flex-col gap-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Generic B-Roll Template Idea (Editable):
                    </span>
                    <span className="text-[10px] text-slate-500 italic">
                      Template suggestion – not a product claim
                    </span>
                  </div>
                  <select
                    value={scene.bRollSuggestion}
                    disabled={disabled}
                    onChange={(e) => handleUpdateScene({ ...scene, bRollSuggestion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {GENERIC_BROLL_TEMPLATES.map((tmpl) => (
                      <option key={tmpl} value={tmpl}>
                        {tmpl}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scene Duration Label */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>
                    Formula: ({scene.wordCount} words ÷ {settings.defaultWpm || 140} WPM) × 60 + {settings.defaultPauseSec || 0.4}s
                  </span>
                  <span className="text-amber-400 font-medium">
                    Rough estimate only — not measured audio.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
