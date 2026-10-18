import { useState } from "react";
import {
  Stethoscope,
  Scissors,
  Maximize2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Info,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { ScriptLine } from "../types.ts";
import {
  shortenScriptText,
  expandScriptText,
  detectRepeatedWords,
  detectPromotionalLanguage,
  countWords,
  ShortenResult,
  ExpandResult,
  RepeatedWordIssue,
  PromotionalWordIssue,
} from "../utils/scriptDoctor.ts";

interface ScriptDoctorWorkspaceProps {
  scriptLines: ScriptLine[];
  onUpdateLines: (newLines: ScriptLine[]) => void;
  disabled?: boolean;
}

export default function ScriptDoctorWorkspace({
  scriptLines,
  onUpdateLines,
  disabled = false,
}: ScriptDoctorWorkspaceProps) {
  // Target line selection: "all" or specific line id
  const [selectedTarget, setSelectedTarget] = useState<string>("all");

  // Shorten / Expand config
  const [targetWordCount, setTargetWordCount] = useState<number>(20);

  // Active suggestions & review state
  const [shortenResult, setShortenResult] = useState<ShortenResult | null>(null);
  const [expandResult, setExpandResult] = useState<ExpandResult | null>(null);

  // Reversible history in session memory
  const [previousAcceptedLines, setPreviousAcceptedLines] = useState<ScriptLine[] | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Helper to extract text under review
  const getWorkingText = (): string => {
    if (selectedTarget === "all") {
      return scriptLines.map((l) => l.text).join("\n\n");
    }
    const found = scriptLines.find((l) => l.id === selectedTarget);
    return found ? found.text : "";
  };

  const currentText = getWorkingText();
  const currentWords = countWords(currentText);

  // Run analysis
  const repeatedIssues: RepeatedWordIssue[] = detectRepeatedWords(currentText);
  const promotionalIssues: PromotionalWordIssue[] = detectPromotionalLanguage(currentText);

  // Action: Shorten
  const handleRunShorten = () => {
    const result = shortenScriptText(currentText, targetWordCount);
    setShortenResult(result);
    setExpandResult(null);
    setActionNotice(null);
  };

  // Action: Expand
  const handleRunExpand = () => {
    const result = expandScriptText(currentText, targetWordCount);
    setExpandResult(result);
    setShortenResult(null);
    setActionNotice(null);
  };

  // Action: Accept Suggestion
  const handleAcceptSuggestion = (suggestedText: string) => {
    // Save previous state for reversibility
    setPreviousAcceptedLines([...scriptLines]);

    if (selectedTarget === "all") {
      // If single line script, replace directly; if multi-line, distribute across lines or replace first line
      if (scriptLines.length === 1) {
        onUpdateLines([{ ...scriptLines[0], text: suggestedText }]);
      } else {
        // Split by double newline or replace lines proportionally
        const chunks = suggestedText.split(/\n\s*\n/).filter(Boolean);
        const updated = scriptLines.map((line, idx) => ({
          ...line,
          text: chunks[idx] !== undefined ? chunks[idx] : line.text,
        }));
        onUpdateLines(updated);
      }
    } else {
      onUpdateLines(
        scriptLines.map((l) => (l.id === selectedTarget ? { ...l, text: suggestedText } : l))
      );
    }

    setShortenResult(null);
    setExpandResult(null);
    setActionNotice("Suggestion accepted and applied to working script. You can revert this change if needed.");
  };

  // Action: Reject Suggestion
  const handleRejectSuggestion = () => {
    setShortenResult(null);
    setExpandResult(null);
    setActionNotice("Suggestion rejected. Working script remains unchanged.");
  };

  // Action: Revert
  const handleRevert = () => {
    if (!previousAcceptedLines) return;
    onUpdateLines(previousAcceptedLines);
    setPreviousAcceptedLines(null);
    setShortenResult(null);
    setExpandResult(null);
    setActionNotice("Previous accepted script version has been restored.");
  };

  // Action: Fix consecutive duplicate words
  const handleFixConsecutiveDuplicate = (duplicateWord: string) => {
    setPreviousAcceptedLines([...scriptLines]);
    const regex = new RegExp(`\\b(${duplicateWord})\\s+\\1\\b`, "gi");
    const updated = scriptLines.map((line) => {
      if (selectedTarget === "all" || line.id === selectedTarget) {
        return { ...line, text: line.text.replace(regex, "$1") };
      }
      return line;
    });
    onUpdateLines(updated);
    setActionNotice(`Removed consecutive duplicate "${duplicateWord}".`);
  };

  return (
    <section
      id="script-doctor-section"
      aria-labelledby="script-doctor-title"
      className="bg-slate-900/85 rounded-2xl border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm"
    >
      {/* Required Capability Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="script-doctor-title" className="text-sm font-bold text-white tracking-wide">
                Script Doctor
              </h3>
              {/* Mandatory label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
                Local rule-based tool – no model connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic, content-preserving helpers for word count, repetition cleanup, and claim checks
            </p>
          </div>
        </div>

        {/* Revert Button if previous version exists in session */}
        {previousAcceptedLines && (
          <button
            type="button"
            onClick={handleRevert}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
            title="Revert to previously accepted script version"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Revert to Previous</span>
          </button>
        )}
      </div>

      {/* Action notification banner */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/70 text-indigo-200 text-xs flex items-center justify-between gap-2">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs text-indigo-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Target Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Scope:</span>
          <select
            value={selectedTarget}
            onChange={(e) => {
              setSelectedTarget(e.target.value);
              setShortenResult(null);
              setExpandResult(null);
            }}
            disabled={disabled}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
          >
            <option value="all">Entire Script ({scriptLines.length} turns)</option>
            {scriptLines.map((line, idx) => (
              <option key={line.id} value={line.id}>
                Turn #{idx + 1} ({countWords(line.text)} words)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Current: <strong className="text-white">{currentWords}</strong> words</span>
        </div>
      </div>

      {/* Helpers Grid: 1. Shorten & Expand, 2. Repetition & Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Word Count Transformation Controls */}
        <div className="flex flex-col gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-indigo-400" />
              <span>Deterministic Length Controls</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Preserves facts & wording
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-[11px] text-slate-400 shrink-0">Target Word Count:</label>
            <input
              type="number"
              min={1}
              max={500}
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={disabled}
              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-[11px] text-slate-500">words</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={handleRunShorten}
              disabled={disabled || currentWords === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Shorten Toward Target</span>
            </button>

            <button
              type="button"
              onClick={handleRunExpand}
              disabled={disabled || currentWords === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand Contractions</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Shortening condenses verbose phrases and filler adverbs. Expansion only unrolls contractions (e.g. "don't" → "do not"); requests requiring invented facts or filler will be refused.
          </p>
        </div>

        {/* Right Column: Rule-Based Checks (Repeated words & Promotional language) */}
        <div className="flex flex-col gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Automated Rule Checks</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Fixed patterns only
            </span>
          </div>

          {/* Repeated Words Check */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400">Repeated Words / Duplicates:</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                repeatedIssues.length > 0
                  ? "bg-amber-950/60 text-amber-300 border-amber-800"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              }`}>
                {repeatedIssues.length > 0 ? `${repeatedIssues.length} flagged` : "None detected"}
              </span>
            </div>

            {repeatedIssues.length > 0 && (
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                {repeatedIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-slate-900 rounded border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="text-amber-200 truncate">
                      {issue.type === "consecutive" ? `Duplicate: "${issue.word} ${issue.word}"` : `Repeated: "${issue.word}"`}
                    </span>
                    {issue.type === "consecutive" && (
                      <button
                        type="button"
                        onClick={() => handleFixConsecutiveDuplicate(issue.word)}
                        className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold shrink-0 hover:bg-indigo-500 cursor-pointer"
                      >
                        Remove Duplicate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Promotional Language Check */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400">Promotional / Hype Terms:</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                promotionalIssues.length > 0
                  ? "bg-rose-950/60 text-rose-300 border-rose-800"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              }`}>
                {promotionalIssues.length > 0 ? `${promotionalIssues.length} flagged` : "None detected"}
              </span>
            </div>

            {promotionalIssues.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                {promotionalIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-rose-950/30 rounded border border-rose-900/60 text-[11px] flex flex-col gap-0.5 text-rose-200"
                  >
                    <div className="flex items-center justify-between font-bold text-rose-300">
                      <span>Term: "{issue.term}"</span>
                      <span className="text-[10px] uppercase font-normal text-rose-400">Manual review</span>
                    </div>
                    <p className="text-[10px] text-rose-300/80 leading-normal">
                      {issue.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggestion & Side-by-Side Comparison Preview */}
      {(shortenResult || expandResult) && (
        <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/50 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {shortenResult ? "Shorten Suggestion Preview" : "Expand Suggestion Preview"}
              </h4>
            </div>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
              Deterministic Suggestion
            </span>
          </div>

          {/* If expansion was refused */}
          {expandResult && !expandResult.success && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex flex-col gap-1">
              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                {expandResult.explanation}
              </span>
              <p className="text-[11px] text-rose-300/90 pl-5">
                {expandResult.refusalReason}
              </p>
            </div>
          )}

          {/* Side-by-Side Comparison */}
          {((shortenResult && shortenResult.suggestedText !== shortenResult.originalText) ||
            (expandResult && expandResult.success && expandResult.suggestedText !== expandResult.originalText)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Original */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                  <span>Original Version</span>
                  <span>{shortenResult?.originalWords || expandResult?.originalWords} words</span>
                </div>
                <p className="text-slate-300 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {shortenResult?.originalText || expandResult?.originalText}
                </p>
              </div>

              {/* Suggested */}
              <div className="p-3 bg-indigo-950/30 rounded-lg border border-indigo-700/60 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-indigo-300">
                  <span>Suggested Version</span>
                  <span>{shortenResult?.suggestedWords || expandResult?.suggestedWords} words</span>
                </div>
                <p className="text-slate-100 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {shortenResult?.suggestedText || expandResult?.suggestedText}
                </p>
              </div>
            </div>
          )}

          {/* Applied rules list */}
          {((shortenResult?.rulesApplied.length ?? 0) > 0 || (expandResult?.rulesApplied.length ?? 0) > 0) && (
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300 block mb-1">Applied Rules:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {(shortenResult?.rulesApplied || expandResult?.rulesApplied || []).map((rule, idx) => (
                  <li key={idx} className="text-slate-300">{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Accept / Reject Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleRejectSuggestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Reject Suggestion</span>
            </button>

            {((shortenResult && shortenResult.suggestedText !== shortenResult.originalText) ||
              (expandResult && expandResult.success && expandResult.suggestedText !== expandResult.originalText)) && (
              <button
                type="button"
                onClick={() =>
                  handleAcceptSuggestion(
                    shortenResult ? shortenResult.suggestedText : expandResult!.suggestedText
                  )
                }
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Suggestion</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer isolation notice */}
      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>
          Script Doctor performs deterministic transformations inside your browser. No model is connected, no external services are contacted, and original text is never altered without explicit acceptance.
        </span>
      </div>
    </section>
  );
}
