import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Upload, FileAudio, Trash2, CheckCircle2, AlertOctagon, Info, Volume2, ShieldCheck, Activity } from "lucide-react";
import { WavMetadata } from "../types.ts";
import { validateLocalWav } from "../utils/wavValidator.ts";

export default function LocalWavInspector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<WavMetadata | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Revoke object URL on cleanup or when a new file is loaded
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous states & revoke previous URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setValidationError(null);
    setMetadata(null);
    setSelectedFile(file);
    setIsValidating(true);

    try {
      const result = await validateLocalWav(file);
      if (result.isValid && result.metadata) {
        setMetadata(result.metadata);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
      } else {
        setValidationError(result.error || "File is not a valid RIFF/WAVE audio file.");
      }
    } catch (err: any) {
      setValidationError(`Inspection failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setAudioUrl(null);
    setSelectedFile(null);
    setMetadata(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section
      id="local-wav-inspector-section"
      aria-labelledby="local-wav-title"
      className="bg-slate-900/80 rounded-2xl border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-4 shadow-lg backdrop-blur-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileAudio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="local-wav-title" className="text-sm font-bold text-white tracking-wide">
                Local Audio Inspector & Reference Preview
              </h3>
              {/* Mandatory label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
                Local rule-based tool – no model connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Validate local RIFF headers, inspect sample parameters, and preview playback entirely in browser
            </p>
          </div>
        </div>

        {selectedFile && (
          <button
            type="button"
            id="clear-wav-btn"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 border border-slate-700 text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
            title="Clear loaded audio and release memory"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear WAV</span>
          </button>
        )}
      </div>

      {/* File input / Dropzone */}
      {!selectedFile && (
        <label
          htmlFor="wav-file-input"
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-colors text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-indigo-950/50 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 border border-slate-700 group-hover:border-indigo-800 transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
              Choose a local WAV file to inspect
            </span>
            <span className="text-xs text-slate-400">
              Supports standard uncompressed RIFF/WAVE (Linear PCM, IEEE Float, 8/16/24/32-bit)
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-mono text-slate-400 border border-slate-700 mt-1">
            Zero network uploads • Browser-only verification
          </span>
          <input
            ref={fileInputRef}
            id="wav-file-input"
            type="file"
            accept=".wav,audio/wav,audio/x-wav"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      )}

      {/* Validating indicator */}
      {isValidating && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-slate-300 text-xs">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Validating RIFF headers and audio chunks...</span>
        </div>
      )}

      {/* Error state */}
      {validationError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 shadow-sm"
        >
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-rose-300 block mb-0.5">WAV Validation Failed</span>
            {validationError}
            <div className="mt-2 text-[11px] text-rose-300/80">
              Try selecting a standard PCM or IEEE Float WAV file. Non-WAV, compressed, or corrupted files will be safely rejected without crashing.
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-rose-400 hover:text-white px-2 py-1 text-[11px] rounded bg-rose-900/60 border border-rose-700 cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* Validated Metadata & Audio Player */}
      {metadata && audioUrl && (
        <div className="flex flex-col gap-3">
          {/* Validation success badge */}
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-300 truncate max-w-[240px] sm:max-w-md">
                {metadata.fileName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700 shrink-0">
              RIFF VALIDATED
            </span>
          </div>

          {/* Technical Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Format
              </span>
              <span className="font-semibold text-slate-200 mt-0.5 truncate">
                {metadata.audioFormatName}
              </span>
              <span className="text-[10px] text-slate-400">
                Code {metadata.audioFormat}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Sample Rate / Depth
              </span>
              <span className="font-semibold text-slate-200 mt-0.5">
                {(metadata.sampleRate / 1000).toFixed(1)} kHz
              </span>
              <span className="text-[10px] text-slate-400">
                {metadata.bitDepth}-bit {metadata.channels === 1 ? "Mono" : metadata.channels === 2 ? "Stereo" : `${metadata.channels}ch`}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Duration
              </span>
              <span className="font-semibold text-slate-200 mt-0.5">
                {metadata.durationSeconds}s
              </span>
              <span className="text-[10px] text-slate-400">
                {(metadata.fileSizeBytes / 1024).toFixed(1)} KB file
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Security & Data
              </span>
              <span className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Client Only
              </span>
              <span className="text-[10px] text-slate-400">
                0 bytes transmitted
              </span>
            </div>
          </div>

          {/* Real Audio Player (HTML5 Audio for reference file) */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reference Audio Playback</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                REAL AUDIO (User Reference)
              </span>
            </div>
            <audio
              ref={audioRef}
              controls
              src={audioUrl}
              className="w-full h-10 rounded-lg focus:outline-none accent-indigo-500"
            />
          </div>

          {/* Unsupported Advanced Acoustic Metrics Table (Honest capability classification) */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Advanced Acoustic Analysis Status</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-slate-900 rounded border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Loudness (LUFS / RMS)</span>
                <span className="text-slate-400 font-mono text-[11px] mt-0.5">Not supported</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">True-Peak / Clipping</span>
                <span className="text-slate-400 font-mono text-[11px] mt-0.5">Not supported</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Noise Floor Analysis</span>
                <span className="text-slate-400 font-mono text-[11px] mt-0.5">Not supported</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Silence Detection</span>
                <span className="text-slate-400 font-mono text-[11px] mt-0.5">Not supported</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-0.5">
              Specialized DSP loudness, clipping, and noise floor metrics are not supported in this lightweight browser validator. Only RIFF header integrity, format, sample rate, bit depth, and duration are parsed.
            </p>
          </div>
        </div>
      )}

      {/* Footer notice */}
      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>
          WAV files selected here are inspected solely inside your local browser runtime. They are never uploaded or retained in browser storage.
        </span>
      </div>
    </section>
  );
}
