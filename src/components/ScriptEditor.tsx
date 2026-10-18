import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Clock,
  Sparkles,
  MessageSquarePlus,
  BookOpen,
  Sliders,
  AlertCircle,
  HelpCircle,
  Mic2,
} from "lucide-react";
import { ScriptLine, SpeakerSlot } from "../types.ts";

interface ScriptEditorProps {
  lines: ScriptLine[];
  speakerSlots: SpeakerSlot[];
  onUpdateLine: (updatedLine: ScriptLine) => void;
  onAddLine: (afterIndex?: number) => void;
  onDeleteLine: (lineId: string) => void;
  onMoveLine: (index: number, direction: "up" | "down") => void;
  onLoadTemplate: (templateKey: "support" | "briefing" | "multiagent") => void;
  disabled?: boolean;
}

const COMMON_EMOTIONS = [
  "Neutral / Matter-of-fact",
  "Warm & Welcoming",
  "Empathetic & Attentive",
  "Urgent & Direct",
  "Confident & Authoritative",
  "Playful & Animated",
  "Calm & Reassuring",
];

export default function ScriptEditor({
  lines,
  speakerSlots,
  onUpdateLine,
  onAddLine,
  onDeleteLine,
  onMoveLine,
  onLoadTemplate,
  disabled = false,
}: ScriptEditorProps) {
  // Compute script summary
  const totalWords = lines.reduce(
    (acc, l) => acc + l.text.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  const totalChars = lines.reduce((acc, l) => acc + l.text.length, 0);

  /**
   * Exact required Voice Director formula:
   * Estimated duration in seconds = (word count ÷ visible words-per-minute setting) × 60 + total pause duration in seconds.
   */
  const calculateTurnDuration = (
    wordCount: number,
    wpmSetting: number,
    pauseSeconds: number
  ): number => {
    // Validate positive WPM to prevent division by zero
    const safeWpm = typeof wpmSetting === "number" && wpmSetting > 0 ? wpmSetting : 140;
    const safePause = typeof pauseSeconds === "number" && pauseSeconds >= 0 ? pauseSeconds : 0.4;

    if (wordCount === 0) return safePause;
    const spokenSec = (wordCount / safeWpm) * 60;
    return Math.round((spokenSec + safePause) * 10) / 10;
  };

  const totalEstimatedSeconds = lines.reduce((acc, l) => {
    const slot = speakerSlots.find((s) => s.id === l.speakerSlotId) || speakerSlots[0];
    const words = l.text.trim().split(/\s+/).filter(Boolean).length;
    // Visible WPM: use line-specific WPM if set, otherwise slot pace * 140 base WPM
    const wpm = l.wpm || Math.round(140 * (slot?.pace || 1.0));
    const pause = l.pauseAfterSeconds ?? 0.4;
    return acc + calculateTurnDuration(words, wpm, pause);
  }, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Header bar with Mandatory Capability Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Voice Director & Multi-Turn Script ({lines.length} {lines.length === 1 ? "Turn" : "Turns"})
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
            Local rule-based tool – no model connected
          </span>
        </div>

        {/* Quick Template Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
            Presets:
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onLoadTemplate("support")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Support Call
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onLoadTemplate("briefing")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Voice Briefing
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onLoadTemplate("multiagent")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Multi-Agent
          </button>
        </div>
      </div>

      {/* Script Metrics Bar & Visible Formula Assumptions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs px-3 py-2 bg-slate-950/70 border border-slate-800/80 rounded-xl text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span>
            <strong className="text-slate-200">{lines.length}</strong> turns
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-200">{totalWords}</strong> words
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-200">{totalChars}</strong> chars
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-indigo-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Est. ~{Math.round(totalEstimatedSeconds * 10) / 10}s</span>
          </div>
          {/* Mandatory duration label */}
          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-amber-300 border border-slate-800 font-medium">
            Rough estimate only — not measured audio.
          </span>
        </div>
      </div>

      {/* Visible Formula Explanation Banner */}
      <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Voice Director Duration Formula & Assumptions:</span>
          </span>
          <span className="font-mono text-[10px] text-indigo-300">
            (word count ÷ visible WPM) × 60 + pause (s)
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-normal">
          Assumptions: Each turn is estimated strictly using its visible Words-Per-Minute (WPM) setting and trailing pause duration. Actual speaking duration may differ, especially for Urdu, Roman Urdu, English, and code-switched scripts.
        </p>
      </div>

      {/* Empty State */}
      {lines.length === 0 && (
        <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-center gap-3">
          <BookOpen className="w-8 h-8 text-slate-600" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-300">The script is currently empty</span>
            <p className="text-xs text-slate-500 max-w-sm">
              Add dialogue turns manually or load a pre-configured template to test the local voice agent workflow.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAddLine()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Line</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onLoadTemplate("support")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample Script</span>
            </button>
          </div>
        </div>
      )}

      {/* Dialogue Line Cards with Voice Director Per-Turn Planning */}
      <div className="flex flex-col gap-3">
        {lines.map((line, index) => {
          const assignedSlot =
            speakerSlots.find((s) => s.id === line.speakerSlotId) || speakerSlots[0];
          const words = line.text.trim().split(/\s+/).filter(Boolean).length;

          // Default WPM from slot pace (140 * pace) or line-specific override
          const currentWpm = line.wpm || Math.round(140 * (assignedSlot?.pace || 1.0));
          const currentPause = line.pauseAfterSeconds ?? 0.4;
          const turnDuration = calculateTurnDuration(words, currentWpm, currentPause);

          return (
            <div
              key={line.id}
              className="bg-slate-900/90 rounded-xl border border-slate-700/80 p-3 sm:p-4 flex flex-col gap-2.5 shadow-sm hover:border-slate-600/80 transition-colors"
            >
              {/* Line Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">
                    Turn #{index + 1}
                  </span>

                  {/* Speaker slot selector */}
                  <select
                    value={line.speakerSlotId}
                    disabled={disabled}
                    onChange={(e) => {
                      const newSlot = speakerSlots.find((s) => s.id === e.target.value);
                      const updatedWpm = newSlot ? Math.round(140 * (newSlot.pace || 1.0)) : currentWpm;
                      onUpdateLine({
                        ...line,
                        speakerSlotId: e.target.value,
                        wpm: updatedWpm,
                      });
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  >
                    {speakerSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.name} ({slot.voiceProfileId} • {slot.pace}x)
                      </option>
                    ))}
                  </select>

                  <span className="hidden sm:inline text-[10px] text-slate-400 italic truncate">
                    {assignedSlot?.delivery} • {assignedSlot?.tone}
                  </span>
                </div>

                {/* Turn Actions: Up, Down, Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => onMoveLine(index, "up")}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Move turn up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === lines.length - 1}
                    onClick={() => onMoveLine(index, "down")}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Move turn down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onDeleteLine(line.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40 transition-colors cursor-pointer ml-1"
                    title="Delete turn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dialogue Textarea */}
              <div className="flex flex-col gap-1">
                <textarea
                  value={line.text}
                  disabled={disabled}
                  rows={2}
                  onChange={(e) => onUpdateLine({ ...line, text: e.target.value })}
                  placeholder={`Enter spoken dialogue for ${assignedSlot?.name || "this speaker"}...`}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
                />
              </div>

              {/* Voice Director Per-Turn Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-800/80">
                {/* 1. Emotion / Delivery preset */}
                <div className="flex flex-col gap-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Emotion / Delivery Note:
                  </span>
                  <input
                    type="text"
                    value={line.deliveryNotes || line.emotion || ""}
                    disabled={disabled}
                    onChange={(e) =>
                      onUpdateLine({
                        ...line,
                        deliveryNotes: e.target.value,
                        emotion: e.target.value,
                      })
                    }
                    placeholder="e.g. Warm welcoming, pause for emphasis"
                    className="bg-transparent border-0 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none w-full"
                  />
                </div>

                {/* 2. Emphasis & Performance notes */}
                <div className="flex flex-col gap-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Emphasis & Performance:
                  </span>
                  <input
                    type="text"
                    value={line.emphasisNotes || ""}
                    disabled={disabled}
                    onChange={(e) => onUpdateLine({ ...line, emphasisNotes: e.target.value })}
                    placeholder="e.g. Stress [Masasal], slower ending"
                    className="bg-transparent border-0 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none w-full"
                  />
                </div>

                {/* 3. Pace (WPM) & Pause input with exact formula display */}
                <div className="flex flex-col gap-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Pace & Pause:</span>
                    <span className="text-indigo-300 font-mono">
                      ~{turnDuration}s est.
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">WPM:</span>
                      <input
                        type="number"
                        min={50}
                        max={300}
                        value={currentWpm}
                        disabled={disabled}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          // Prevent non-positive WPM or division by zero
                          if (!isNaN(val) && val > 0) {
                            onUpdateLine({ ...line, wpm: val });
                          }
                        }}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">Pause:</span>
                      <select
                        value={currentPause}
                        disabled={disabled}
                        onChange={(e) =>
                          onUpdateLine({
                            ...line,
                            pauseAfterSeconds: parseFloat(e.target.value),
                          })
                        }
                        className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[10px] cursor-pointer"
                      >
                        <option value="0.0">0.0s</option>
                        <option value="0.2">0.2s</option>
                        <option value="0.4">0.4s</option>
                        <option value="0.8">0.8s</option>
                        <option value="1.2">1.2s</option>
                        <option value="2.0">2.0s</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Turn Duration Estimate Footer with mandatory label */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 px-0.5">
                <span>
                  Calculation: ({words} words ÷ {currentWpm} WPM) × 60 + {currentPause}s pause = ~{turnDuration}s
                </span>
                <span className="text-amber-400 font-medium">
                  Rough estimate only — not measured audio.
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add turn button */}
      {lines.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddLine()}
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/80 hover:bg-slate-900/60 text-slate-400 hover:text-indigo-300 flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer mt-1"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Add Dialogue Turn</span>
        </button>
      )}
    </div>
  );
}
