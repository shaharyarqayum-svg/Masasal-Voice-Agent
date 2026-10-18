import { useState, useEffect, useMemo } from "react";
import { Play, Pause, AlertTriangle, ShieldCheck, FileText, Activity } from "lucide-react";
import { SimulatedGenerationResult } from "../types.ts";

interface AudioPlayerProps {
  mockResult: SimulatedGenerationResult;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function AudioPlayer({ mockResult }: AudioPlayerProps) {
  const [isSimulatingPlay, setIsSimulatingPlay] = useState(false);
  const [simulatedCurrentTime, setSimulatedCurrentTime] = useState(0);
  const totalDuration = mockResult.simulatedDurationSeconds;

  // Visual simulated waveform bar heights (deterministic based on transcript length)
  const waveformBars = useMemo(() => {
    const bars: number[] = [];
    const seed = mockResult.dialogue.length + mockResult.voiceId.charCodeAt(0);
    for (let i = 0; i < 32; i++) {
      const pseudoRand = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
      bars.push(Math.max(15, Math.floor(pseudoRand * 100)));
    }
    return bars;
  }, [mockResult]);

  // Handle simulated silent playback progress purely in browser memory
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSimulatingPlay) {
      interval = setInterval(() => {
        setSimulatedCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsSimulatingPlay(false);
            return 0;
          }
          return Math.min(prev + 0.1, totalDuration);
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulatingPlay, totalDuration]);

  // Reset progress when result changes
  useEffect(() => {
    setIsSimulatingPlay(false);
    setSimulatedCurrentTime(0);
  }, [mockResult]);

  const toggleSimulatedPlay = () => {
    if (simulatedCurrentTime >= totalDuration) {
      setSimulatedCurrentTime(0);
    }
    setIsSimulatingPlay(!isSimulatingPlay);
  };

  const progressPercent = totalDuration > 0 ? (simulatedCurrentTime / totalDuration) * 100 : 0;

  return (
    <div id="simulated-result-container" className="flex flex-col gap-4">
      {/* Prominent Foundation Mode Disclaimer */}
      <div
        id="foundation-mode-badge"
        role="alert"
        className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/80 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-md"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <div className="font-bold uppercase tracking-wider text-amber-300 text-xs flex items-center gap-2">
            <span>SIMULATED — FOUNDATION MODE</span>
            <span className="px-1.5 py-0.2 bg-amber-900/80 rounded border border-amber-700 text-[10px]">
              Mock Result
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-200/90">
            Real Gemini TTS calls, external APIs, and network voice-generation paths are disabled.
            This simulated result contains mock parameters and local timing calculations only; <strong>never real audio</strong>.
          </p>
        </div>
      </div>

      {/* Mock Result Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg flex flex-col gap-4">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Simulated Voice Agent Output
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
            SILENT MOCK
          </span>
        </div>

        {/* Mock Waveform Simulation Visualizer */}
        <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-[11px] font-mono text-indigo-300">
              Mock Waveform Visualizer
            </span>
            <span className="text-[10px] text-amber-400 font-medium">
              (No sound generated — simulation only)
            </span>
          </div>

          {/* Waveform graphic */}
          <div className="h-16 flex items-center justify-between gap-1 px-1">
            {waveformBars.map((height, idx) => {
              const barProgress = (idx / waveformBars.length) * 100;
              const isPassed = barProgress <= progressPercent;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-full transition-all duration-150"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isPassed ? "#6366f1" : "#334155",
                    opacity: isPassed ? 1 : 0.45,
                  }}
                />
              );
            })}
          </div>

          {/* Silent playback simulation controls */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              id="simulated-play-toggle-btn"
              onClick={toggleSimulatedPlay}
              aria-label={isSimulatingPlay ? "Pause silent simulation" : "Play silent simulation"}
              className="w-9 h-9 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 transition-colors border border-indigo-500/30 cursor-pointer"
            >
              {isSimulatingPlay ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
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
                <span>{formatTime(simulatedCurrentTime)}</span>
                <span className="text-slate-400">
                  {isSimulatingPlay ? "Simulating silent playback..." : "Silent preview"}
                </span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mock Parameter Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Voice Persona
            </span>
            <span className="font-semibold text-slate-200 mt-0.5 truncate">
              {mockResult.voiceName}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {mockResult.voiceTone}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Word Count
            </span>
            <span className="font-semibold text-slate-200 mt-0.5">
              {mockResult.wordCount} words
            </span>
            <span className="text-[10px] text-slate-400">
              {mockResult.charCount} chars
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Est. Duration
            </span>
            <span className="font-semibold text-slate-200 mt-0.5">
              ~{mockResult.simulatedDurationSeconds}s
            </span>
            <span className="text-[10px] text-slate-400">
              @ 140 WPM pace
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Network Status
            </span>
            <span className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Isolated
            </span>
            <span className="text-[10px] text-slate-400">
              0 bytes sent
            </span>
          </div>
        </div>

        {/* Direction & Dialogue Echo */}
        {mockResult.voiceDirection && (
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
              Simulated Direction
            </span>
            <p className="text-slate-300 italic">"{mockResult.voiceDirection}"</p>
          </div>
        )}

        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
            Simulated Transcript
          </span>
          <p className="text-slate-200 font-medium whitespace-pre-wrap">
            {mockResult.dialogue}
          </p>
        </div>

        {/* Foundation Mode Isolation Notice */}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Foundation-Only mode active. Audio synthesis, uploads, external services, and persistent storage are disabled.
          </span>
        </div>
      </div>
    </div>
  );
}
