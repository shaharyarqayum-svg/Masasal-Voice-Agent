import { useState } from "react";
import { Terminal, Copy, Check, AlertTriangle, XCircle, Info, ShieldAlert } from "lucide-react";

export interface DiagnosticsInfo {
  statusCode: number;
  model: string;
  isRateLimit: boolean;
  failureClassification: string;
  exactApiErrorMessage: string;
  quotaInfo: any;
  timestamp: string;
}

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticsInfo;
  onDismiss?: () => void;
}

export default function DiagnosticsPanel({
  diagnostics,
  onDismiss,
}: DiagnosticsPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const text = JSON.stringify(diagnostics, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy diagnostic info:", err);
    }
  };

  return (
    <div
      id="diagnostics-panel"
      role="region"
      aria-label="Generation Failure Diagnostics"
      className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm transition-all"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Developer Diagnostics
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Temporary
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Diagnostic details for the current generation failure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="copy-diagnostics-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Copy diagnostics JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
          {onDismiss && (
            <button
              type="button"
              id="dismiss-diagnostics-btn"
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Dismiss diagnostics"
              title="Dismiss diagnostics"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Failure Classification Banner */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          diagnostics.isRateLimit
            ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
            : "bg-rose-950/40 border-rose-800/80 text-rose-200"
        }`}
      >
        <div className="flex items-start gap-2.5">
          {diagnostics.isRateLimit ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              Failure Classification
            </div>
            <div className="text-sm font-semibold mt-0.5">
              {diagnostics.isRateLimit ? (
                <span className="text-amber-300">
                  Rate-Limit / Quota Error (HTTP 429)
                </span>
              ) : (
                <span className="text-rose-300">
                  {diagnostics.failureClassification || `HTTP ${diagnostics.statusCode} Failure`}
                </span>
              )}
            </div>
            {diagnostics.isRateLimit ? (
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                Gemini API free tier imposes a quota limit of <strong>3 requests per minute (RPM)</strong>. Please wait a few moments before trying again.
              </p>
            ) : (
              <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                This is a non-quota error. Review the exact API error message below.
              </p>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-1 shrink-0 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            HTTP Status
          </span>
          <span
            className={`px-2.5 py-1 rounded-md font-mono text-sm font-bold border ${
              diagnostics.isRateLimit
                ? "bg-amber-900/60 text-amber-200 border-amber-700"
                : "bg-rose-900/60 text-rose-200 border-rose-700"
            }`}
          >
            {diagnostics.statusCode || "N/A"}
          </span>
        </div>
      </div>

      {/* Grid of details: Model Name, Timestamp, Rate-limit Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Gemini Model Being Called */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Gemini Model
          </span>
          <div className="flex items-center gap-1.5">
            <code className="font-mono text-xs text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/50">
              {diagnostics.model || "gemini-3.1-flash-tts-preview"}
            </code>
          </div>
        </div>

        {/* Timestamp */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Failure Timestamp
          </span>
          <span className="font-mono text-xs text-slate-300">
            {diagnostics.timestamp
              ? new Date(diagnostics.timestamp).toLocaleTimeString() +
                " (" +
                diagnostics.timestamp +
                ")"
              : new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Exact API Error Message returned by Gemini */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
          Exact API Error Message
        </label>
        <div className="relative">
          <pre
            id="exact-api-error-message"
            className="w-full max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-rose-200 whitespace-pre-wrap break-words selection:bg-rose-900/60"
          >
            {diagnostics.exactApiErrorMessage || "No specific error message was returned."}
          </pre>
        </div>
      </div>

      {/* Available Quota / Rate-limit Information */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1 flex items-center gap-1.5">
            <span>Quota & Rate-Limit Details</span>
            {diagnostics.isRateLimit && (
              <span className="text-[10px] font-semibold text-amber-400 lowercase font-sans">
                (active quota block)
              </span>
            )}
          </label>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 max-h-40 overflow-y-auto">
          {diagnostics.quotaInfo ? (
            <pre className="whitespace-pre-wrap break-words">
              {typeof diagnostics.quotaInfo === "string"
                ? diagnostics.quotaInfo
                : JSON.stringify(diagnostics.quotaInfo, null, 2)}
            </pre>
          ) : (
            <span className="text-slate-500 italic font-sans text-xs">
              No additional quota headers or structured rate-limit details were provided by the upstream response.
            </span>
          )}
        </div>
      </div>

      {/* Security & Non-retry notice */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          Secrets and <code>GEMINI_API_KEY</code> are redacted. No automatic retries are executed.
        </span>
      </div>
    </div>
  );
}
