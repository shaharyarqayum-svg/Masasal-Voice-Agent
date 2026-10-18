import { useState, FormEvent } from "react";
import {
  BookA,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ListFilter,
  Info,
  ShieldCheck,
} from "lucide-react";
import { PronunciationEntry, ScriptLine } from "../types.ts";
import {
  DOCUMENTED_PRONUNCIATION_PATTERNS,
  scanTermsRequiringReview,
  FlaggedPronunciationTerm,
} from "../utils/pronunciationRules.ts";

interface PronunciationWorkspaceProps {
  dictionary: PronunciationEntry[];
  overrides: PronunciationEntry[];
  scriptLines: ScriptLine[];
  onUpdateDictionary: (updated: PronunciationEntry[]) => void;
  onUpdateOverrides: (updated: PronunciationEntry[]) => void;
  disabled?: boolean;
}

export default function PronunciationWorkspace({
  dictionary,
  overrides,
  scriptLines,
  onUpdateDictionary,
  onUpdateOverrides,
  disabled = false,
}: PronunciationWorkspaceProps) {
  // New entry form state
  const [newTerm, setNewTerm] = useState("");
  const [newReading, setNewReading] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newIsOverride, setNewIsOverride] = useState(false);

  // Edit modal / inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [activeTab, setActiveTab] = useState<"dictionary" | "overrides" | "scanner">("dictionary");

  // Run deterministic scan for terms needing review
  const flaggedTerms: FlaggedPronunciationTerm[] = scanTermsRequiringReview(
    scriptLines,
    dictionary,
    overrides
  );

  // Handle Add Entry
  const handleAddEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newReading.trim()) return;

    const newEntry: PronunciationEntry = {
      id: `pron-${Date.now()}`,
      term: newTerm.trim(),
      reading: newReading.trim(),
      notes: newNotes.trim() || undefined,
      isOverride: newIsOverride,
    };

    if (newIsOverride) {
      onUpdateOverrides([...overrides, newEntry]);
    } else {
      onUpdateDictionary([...dictionary, newEntry]);
    }

    setNewTerm("");
    setNewReading("");
    setNewNotes("");
  };

  // Handle Delete
  const handleDeleteEntry = (id: string, isOverride: boolean) => {
    if (isOverride) {
      onUpdateOverrides(overrides.filter((o) => o.id !== id));
    } else {
      onUpdateDictionary(dictionary.filter((d) => d.id !== id));
    }
  };

  // Start inline editing
  const startEdit = (entry: PronunciationEntry) => {
    setEditingId(entry.id);
    setEditTerm(entry.term);
    setEditReading(entry.reading);
    setEditNotes(entry.notes || "");
  };

  // Save inline edit
  const saveEdit = (isOverride: boolean) => {
    if (!editingId) return;
    if (isOverride) {
      onUpdateOverrides(
        overrides.map((o) =>
          o.id === editingId
            ? { ...o, term: editTerm.trim(), reading: editReading.trim(), notes: editNotes.trim() || undefined }
            : o
        )
      );
    } else {
      onUpdateDictionary(
        dictionary.map((d) =>
          d.id === editingId
            ? { ...d, term: editTerm.trim(), reading: editReading.trim(), notes: editNotes.trim() || undefined }
            : d
        )
      );
    }
    setEditingId(null);
  };

  // Quick-add from flagged scanner term
  const handleQuickAddFromFlag = (term: string, defaultReason: string) => {
    setNewTerm(term);
    setNewReading("");
    setNewNotes(`Flagged via: ${defaultReason}`);
    setNewIsOverride(false);
    setActiveTab("dictionary");
  };

  return (
    <section
      id="pronunciation-workspace-section"
      aria-labelledby="pronunciation-title"
      className="bg-slate-900/85 rounded-2xl border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm"
    >
      {/* Header with Mandatory Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BookA className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="pronunciation-title" className="text-sm font-bold text-white tracking-wide">
                Pronunciation Workspace
              </h3>
              {/* Mandatory label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
                Local rule-based tool – no model connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Maintain project pronunciation spellings and script overrides. Original text is never altered.
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("dictionary")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "dictionary"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white bg-slate-800/60"
          }`}
        >
          <span>Global Dictionary ({dictionary.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("overrides")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "overrides"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white bg-slate-800/60"
          }`}
        >
          <span>Script Overrides ({overrides.length})</span>
          {overrides.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              Priority
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scanner")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "scanner"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white bg-slate-800/60"
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Rule Scanner Flags ({flaggedTerms.length})</span>
        </button>
      </div>

      {/* Tab 1 & 2: Dictionary or Overrides List */}
      {(activeTab === "dictionary" || activeTab === "overrides") && (
        <div className="flex flex-col gap-4">
          {/* Add Entry Form */}
          <form
            onSubmit={handleAddEntry}
            className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                Add New Pronunciation Guidance
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={newIsOverride}
                  onChange={(e) => setNewIsOverride(e.target.checked)}
                  disabled={disabled}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Script Override (Takes precedence)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Script Term (e.g. Masasal, V2, ASR)"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                disabled={disabled}
                required
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="text"
                placeholder="Preferred Reading (e.g. Muh-SAH-sal)"
                value={newReading}
                onChange={(e) => setNewReading(e.target.value)}
                disabled={disabled}
                required
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  disabled={disabled}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1"
                />
                <button
                  type="submit"
                  disabled={disabled || !newTerm.trim() || !newReading.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </form>

          {/* List of Entries */}
          {((activeTab === "dictionary" ? dictionary : overrides).length === 0) ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
              {activeTab === "dictionary"
                ? "No global dictionary entries defined. Add terms above or select from the Rule Scanner."
                : "No script-level overrides currently active. Script overrides take precedence over global dictionary defaults."}
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {(activeTab === "dictionary" ? dictionary : overrides).map((entry) => {
                const isEditing = editingId === entry.id;
                const isOverridden =
                  activeTab === "dictionary" &&
                  overrides.some((o) => o.term.toLowerCase() === entry.term.toLowerCase());

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                      isOverridden
                        ? "bg-slate-950/50 border-amber-800/50 opacity-75"
                        : "bg-slate-950/80 border-slate-800"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                        <input
                          type="text"
                          value={editTerm}
                          onChange={(e) => setEditTerm(e.target.value)}
                          className="w-full sm:w-1/3 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={editReading}
                          onChange={(e) => setEditReading(e.target.value)}
                          className="w-full sm:w-1/3 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full sm:w-1/3 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(Boolean(entry.isOverride))}
                          className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{entry.term}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                              "{entry.reading}"
                            </span>
                          </div>

                          {entry.notes && (
                            <span className="text-[11px] text-slate-400 italic truncate max-w-xs">
                              {entry.notes}
                            </span>
                          )}

                          {isOverridden && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/80 shrink-0 font-medium">
                              Overridden by Script Setting
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            disabled={disabled}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id, Boolean(entry.isOverride))}
                            disabled={disabled}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40 cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Rule Scanner Flags & Documented Patterns */}
      {activeTab === "scanner" && (
        <div className="flex flex-col gap-4">
          {/* Documented Fixed Pattern List */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Documented Fixed Problem Patterns (Used for Automatic Flagging)</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {DOCUMENTED_PRONUNCIATION_PATTERNS.map((p) => (
                <div key={p.id} className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col gap-0.5">
                  <span className="font-bold text-slate-200">{p.name}</span>
                  <span className="text-slate-400 text-[10px]">{p.description}</span>
                  <code className="text-indigo-300 text-[10px] mt-0.5">Examples: {p.example}</code>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 italic mt-1">
              Terms are flagged strictly when they match one of these documented patterns or an explicit [review: word] tag. No guessing or artificial inference is performed.
            </p>
          </div>

          {/* Scanned Script Matches */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Script Terms Matching Documented Patterns ({flaggedTerms.length})
              </span>
              <span className="text-[10px] text-slate-500">
                Click "Add Reading" to define guidance
              </span>
            </div>

            {flaggedTerms.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                No terms in the current script match the documented problem patterns.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {flaggedTerms.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="font-bold text-white text-sm">{flag.term}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-700">
                        {flag.patternDescription}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Line(s): {flag.lineIndices.join(", ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {flag.resolvedReading ? (
                        <span className="font-mono text-emerald-300 text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          Reading: {flag.resolvedReading}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickAddFromFlag(flag.term, flag.patternDescription)}
                          className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold cursor-pointer"
                        >
                          Add Reading
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Notice */}
      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          Pronunciation notes are stored in session memory and included in project JSON exports. They provide script preparation notes and do not synthesize speech.
        </span>
      </div>
    </section>
  );
}
