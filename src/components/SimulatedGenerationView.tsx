import { useState, useEffect } from "react";
import { Play, Pause, AlertTriangle, ShieldCheck, FileText, Activity, Clock, Check, Copy, User } from "lucide-react";
import { SimulatedGenerationReport } from "../types.ts";

interface SimulatedGenerationViewProps {
  report: SimulatedGenerationReport;
  onClearResult?: () => void;
}

function formatSec(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}.${tenths}`;
}

export default function SimulatedGenerationView({
  report,
  onClearResult,
}: SimulatedGenerationViewProps) {
  const [isPlayingCadence, setIsPlayingCadence] = useState<boolean>(false);
  const [currentElapsedSec, setCurrentElapsedSec] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const totalDuration = report.totalDurationSeconds;

  // Handle cadence stepping timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlayingCadence) {
      interval = setInterval(() => {
        setCurrentElapsedSec((prev) => {
          if (prev >= totalDuration) {
            setIsPlayingCadence(false);
            return totalDuration;
          }
          return Math.min(prev + 0.1, totalDuration);
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingCadence, totalDuration]);

  // Reset when report changes
  useEffect(() => {
    setIsPlayingCadence(false);
    setCurrentElapsedSec(0);
  }, [report]);

  const toggleCadencePlay = () => {
    if (currentElapsedSec >= totalDuration) {
      setCurrentElapsedSec(0);
    }
    setIsPlayingCadence(!isPlayingCadence);
  };

  const handleCopyReport = async () => {
    try {
      const summaryText = [
        `Masasal Voice Agent — Simulated Generation Report (Foundation Mode)`,
        `Generated: ${report.timestamp}`,
        `Project: ${report.projectTitle}`,
        `Total Turns: ${report.totalLines} | Total Words: ${report.totalWords} | Est. Duration: ${report.totalDurationSeconds}s`,
        `Notice: Real audio synthesis disabled. 0 network calls executed.`,
        ``,
        `=== Turn Breakdown ===`,
        ...report.lineTimings.map(
          (t, i) =>
            `[Turn #${i + 1}] ${t.speakerName} (${t.voiceName} • ${t.pace}x pace • ${t.delivery})\n` +
            `  Time: ${t.startTimeSec.toFixed(1)}s - ${t.endTimeSec.toFixed(1)}s (${t.durationSec.toFixed(1)}s duration)\n` +
            `  Dialogue: "${t.text}"`
        ),
      ].join("\n");

      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  const progressPercent = totalDuration > 0 ? (currentElapsedSec / totalDuration) * 100 : 0;

  return (
    <div id="simulated-result-container" className="flex flex-col gap-4">
      {/* Prominent Foundation Mode Disclaimer */}
      <div
        id="foundation-mode-badge"
        role="alert"
        className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-600/80 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-md"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <div className="font-bold uppercase tracking-wider text-amber-300 text-xs flex items-center gap-2">
            <span>SIMULATED — FOUNDATION MODE</span>
            <span className="px-1.5 py-0.2 bg-amber-900/90 rounded border border-amber-700 text-[10px]">
              Mock Output Only
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-200/90 leading-normal">
            Real Gemini TTS calls and external voice-generation APIs are <strong>strictly disabled</strong>.
            This report represents calculated speech timing, word cadence, and persona parameters only — <strong>never real audio</strong>.
          </p>
        </div>
      </div>

      {/* Main Simulation Report Card */}
      <div className="bg-slate-900/95 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-xl flex flex-col gap-4">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Simulated Voice Agent Cadence Report
              </h3>
              <p className="text-[11px] text-slate-400">
                Calculated in browser based on speaker pace, word count, and delivery direction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
            {onClearResult && (
              <button
                type="button"
                onClick={onClearResult}
                className="text-xs text-slate-400 hover:text-rose-300 px-2 py-1 rounded bg-slate-800 border border-slate-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Global Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Dialogue Volume
            </span>
            <span className="font-semibold text-slate-200 mt-0.5">
              {report.totalLines} turns • {report.totalWords} words
            </span>
            <span className="text-[10px] text-slate-400">
              {report.totalChars} characters
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Simulated Duration
            </span>
            <span className="font-semibold text-indigo-300 mt-0.5">
              ~{report.totalDurationSeconds}s cadence
            </span>
            <span className="text-[10px] text-slate-400">
              Includes line pauses
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Network Isolation
            </span>
            <span className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Local
            </span>
            <span className="text-[10px] text-slate-400">
              0 bytes sent
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Audio Synthesis
            </span>
            <span className="font-semibold text-amber-400 mt-0.5">
              Disabled (Mock)
            </span>
            <span className="text-[10px] text-slate-400">
              No audio generated
            </span>
          </div>
        </div>

        {/* Silent Cadence Timeline Player (Pure visual step simulator, NOT audio) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">
                Silent Cadence Timeline
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
              NO AUDIO PLAYBACK
            </span>
          </div>

          {/* Stepper bar through line timings */}
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-900 border border-slate-800 p-0.5">
            {report.lineTimings.map((timing) => {
              const widthPct = (timing.durationSec / totalDuration) * 100;
              const isPast = currentElapsedSec >= timing.endTimeSec;
              const isCurrent = currentElapsedSec >= timing.startTimeSec && currentElapsedSec < timing.endTimeSec;

              return (
                <div
                  key={timing.lineId}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full rounded-sm transition-all duration-150 ${
                    isCurrent
                      ? "bg-indigo-400 ring-2 ring-indigo-300"
                      : isPast
                      ? "bg-indigo-600/60"
                      : "bg-slate-800"
                  }`}
                  title={`${timing.speakerName}: ${timing.durationSec}s`}
                />
              );
            })}
          </div>

          {/* Play/Pause silent cadence */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="cadence-playback-toggle-btn"
              onClick={toggleCadencePlay}
              className="w-8 h-8 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 transition-colors cursor-pointer"
              title={isPlayingCadence ? "Pause silent simulation" : "Play silent cadence stepper"}
            >
              {isPlayingCadence ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>{formatSec(currentElapsedSec)}</span>
                <span className="text-slate-400 font-sans">
                  {isPlayingCadence ? "Stepping through silent cadence..." : "Silent cadence preview"}
                </span>
                <span>{formatSec(totalDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Turn-by-Turn Breakdown List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Simulated Turn Details
            </span>
            <span className="text-[10px] text-slate-500">
              Pace calculation: ~140 WPM * multiplier
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {report.lineTimings.map((timing, idx) => {
              const isCurrent =
                currentElapsedSec >= timing.startTimeSec && currentElapsedSec < timing.endTimeSec;

              return (
                <div
                  key={timing.lineId}
                  className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 transition-colors ${
                    isCurrent
                      ? "bg-indigo-950/50 border-indigo-500/70 text-slate-100"
                      : "bg-slate-950/60 border-slate-800/80 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500 font-bold">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1 font-semibold text-slate-200">
                        <User className="w-3 h-3 text-indigo-400" />
                        <span>{timing.speakerName}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded border border-slate-700">
                        Persona: {timing.voiceName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span>{timing.pace.toFixed(2)}x pace</span>
                      <span>•</span>
                      <span className="text-indigo-300 font-bold">
                        {timing.startTimeSec.toFixed(1)}s - {timing.endTimeSec.toFixed(1)}s (~{timing.durationSec.toFixed(1)}s)
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-200 font-medium whitespace-pre-wrap text-xs sm:text-sm pl-1">
                    "{timing.text}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>
                      Tone: {timing.tone} • Style: {timing.delivery}
                    </span>
                    <span>
                      {timing.wordCount} words • {timing.charCount} chars
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer isolation notice */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Masasal Voice Agent Foundation Mode: All parameters are verified in client memory without external network calls.
          </span>
        </div>
      </div>
    </div>
  );
}
