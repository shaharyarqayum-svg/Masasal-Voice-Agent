import { useState, useId, FormEvent } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Download,
  Info,
  Check,
  ListChecks,
  Search,
  FileCheck2,
} from "lucide-react";
import {
  ClaimPhrase,
  ClaimReviewStatus,
  MaivcChecklistItem,
  ScriptLine,
} from "../types.ts";
import {
  scanScriptForClaims,
  generateComplianceReport,
  generateComplianceReviewJson,
  cloneDefaultClaimPhrases,
} from "../utils/claimCompliance.ts";

interface ClaimCheckerWorkspaceProps {
  projectTitle: string;
  projectDescription: string;
  scriptLines: ScriptLine[];
  claimPhrases: ClaimPhrase[];
  maivcChecklist: MaivcChecklistItem[];
  onUpdateClaimPhrases: (claims: ClaimPhrase[]) => void;
  onUpdateMaivcChecklist: (checklist: MaivcChecklistItem[]) => void;
  disabled?: boolean;
}

export default function ClaimCheckerWorkspace({
  projectTitle,
  projectDescription,
  scriptLines,
  claimPhrases,
  maivcChecklist,
  onUpdateClaimPhrases,
  onUpdateMaivcChecklist,
  disabled = false,
}: ClaimCheckerWorkspaceProps) {
  const formId = useId();
  const [activeSubTab, setActiveSubTab] = useState<"claims" | "checklist" | "occurrences">("claims");
  const [newPhrase, setNewPhrase] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Performance");
  const [newNotes, setNewNotes] = useState<string>("");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Scan script for registered claims
  const scan = scanScriptForClaims(scriptLines, claimPhrases);

  // Summary statistics
  const totalClaims = claimPhrases.length;
  const approvedClaims = claimPhrases.filter((c) => c.reviewStatus === "approved").length;
  const flaggedClaims = claimPhrases.filter((c) => c.reviewStatus === "flagged").length;
  const rejectedClaims = claimPhrases.filter((c) => c.reviewStatus === "rejected").length;
  const unreviewedClaims = claimPhrases.filter((c) => c.reviewStatus === "unreviewed").length;

  const totalChecklist = maivcChecklist.length;
  const checkedChecklist = maivcChecklist.filter((i) => i.checked).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((checkedChecklist / totalChecklist) * 100) : 0;

  // Handlers for Claim Phrases
  const handleStatusChange = (claimId: string, status: ClaimReviewStatus) => {
    onUpdateClaimPhrases(
      claimPhrases.map((c) => (c.id === claimId ? { ...c, reviewStatus: status } : c))
    );
  };

  const handleNotesChange = (claimId: string, notes: string) => {
    onUpdateClaimPhrases(
      claimPhrases.map((c) => (c.id === claimId ? { ...c, notes } : c))
    );
  };

  const handleDeleteClaim = (claimId: string) => {
    onUpdateClaimPhrases(claimPhrases.filter((c) => c.id !== claimId));
  };

  const handleAddClaim = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newPhrase.trim();
    if (!trimmed) return;

    const newClaim: ClaimPhrase = {
      id: `claim-${Date.now()}`,
      phrase: trimmed,
      category: newCategory.trim() || "General",
      reviewStatus: "unreviewed",
      notes: newNotes.trim() || undefined,
    };

    onUpdateClaimPhrases([...claimPhrases, newClaim]);
    setNewPhrase("");
    setNewNotes("");
  };

  const handleRestoreDefaultClaims = () => {
    onUpdateClaimPhrases(cloneDefaultClaimPhrases());
  };

  // Handlers for MAIVC Checklist
  const handleToggleChecklist = (itemId: string) => {
    onUpdateMaivcChecklist(
      maivcChecklist.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleChecklistNotesChange = (itemId: string, notes: string) => {
    onUpdateMaivcChecklist(
      maivcChecklist.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  // Handlers for Local Review Export
  const handleExportReviewReport = () => {
    try {
      const reportText = generateComplianceReport(
        projectTitle,
        projectDescription,
        scriptLines,
        claimPhrases,
        maivcChecklist
      );

      const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const safeTitle = (projectTitle || "masasal-compliance")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-");
      const filename = `${safeTitle}-compliance-review-${Date.now()}.txt`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported local compliance review report as ${filename}`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error("Failed to export compliance review report:", err);
      setExportNotice("Failed to generate export file.");
    }
  };

  const handleExportReviewJson = () => {
    try {
      const reportJson = generateComplianceReviewJson(
        projectTitle,
        projectDescription,
        scriptLines,
        claimPhrases,
        maivcChecklist
      );

      const blob = new Blob([reportJson], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const safeTitle = (projectTitle || "masasal-compliance")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-");
      const filename = `${safeTitle}-compliance-review-${Date.now()}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported local compliance review JSON as ${filename}`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error("Failed to export compliance review JSON:", err);
      setExportNotice("Failed to generate JSON export file.");
    }
  };

  return (
    <section
      id="claim-checker-section"
      aria-labelledby="claim-checker-title"
      className="bg-slate-900/85 rounded-2xl border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm"
    >
      {/* Header & Mandatory Rule Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="claim-checker-title" className="text-sm font-bold text-white tracking-wide">
                Product Claim Checker & MAIVC Compliance
              </h3>
              {/* Mandatory label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
                Local rule-based tool – no model connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic claim tracking, verification audit, and Instagram Reel voice compliance checklist
            </p>
          </div>
        </div>

        {/* Local Review Export Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportReviewReport}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            title="Export local compliance and claim review report to a text file (.txt)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Review (TXT)</span>
          </button>
          <button
            type="button"
            onClick={handleExportReviewJson}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer"
            title="Export full structured compliance audit and claim matches as JSON (.json)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Review (JSON)</span>
          </button>
        </div>
      </div>

      {/* Export notification notice */}
      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/70 text-emerald-200 text-xs flex items-center justify-between gap-2">
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-xs text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">MAIVC Progress</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-white">{checkedChecklist}/{totalChecklist}</span>
            <span className="text-[11px] text-emerald-400 font-medium">({checklistPercent}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Claims Tracked</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-white">{totalClaims}</span>
            <span className="text-[11px] text-slate-400">phrases</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">
            {approvedClaims} approved • {flaggedClaims} flagged
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Pending Review</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${unreviewedClaims > 0 ? "text-amber-300" : "text-emerald-400"}`}>
              {unreviewedClaims}
            </span>
            <span className="text-[11px] text-slate-400">unreviewed</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {rejectedClaims} rejected
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Script Occurrences</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${scan.totalMatches > 0 ? "text-indigo-300" : "text-slate-400"}`}>
              {scan.totalMatches}
            </span>
            <span className="text-[11px] text-slate-400">matches</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Across {scriptLines.length} turns
          </span>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab("claims")}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === "claims"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Product Claims ({totalClaims})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("checklist")}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === "checklist"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>MAIVC Checklist ({checkedChecklist}/{totalChecklist})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("occurrences")}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === "occurrences"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Script Occurrences ({scan.totalMatches})</span>
        </button>
      </div>

      {/* SubTab 1: Product Claim Phrases */}
      {activeSubTab === "claims" && (
        <div className="flex flex-col gap-3">
          {/* Add Claim Form */}
          <form
            onSubmit={handleAddClaim}
            className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 text-xs"
          >
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="New claim phrase (e.g. 'unmatched performance')..."
                disabled={disabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                disabled={disabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
              >
                <option value="Performance">Performance</option>
                <option value="Guarantee">Guarantee</option>
                <option value="Comparative">Comparative</option>
                <option value="Exaggeration">Exaggeration</option>
                <option value="Usability">Usability</option>
                <option value="Novelty">Novelty</option>
                <option value="Pricing">Pricing</option>
                <option value="General">General</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional review notes / guidelines..."
                disabled={disabled}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-44"
              />
              <button
                type="submit"
                disabled={disabled || !newPhrase.trim()}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Claim</span>
              </button>
            </div>
          </form>

          {/* Claim Phrases List */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {claimPhrases.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/60 flex flex-col items-center gap-2">
                <span>No claim phrases registered.</span>
                <button
                  type="button"
                  onClick={handleRestoreDefaultClaims}
                  className="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Load Default Claim Phrases
                </button>
              </div>
            ) : (
              claimPhrases.map((claim) => {
                const hits = scan.claimMatchCounts[claim.id] || 0;
                return (
                  <div
                    key={claim.id}
                    className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col gap-2 transition-colors hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs font-mono">
                          "{claim.phrase}"
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {claim.category || "General"}
                        </span>
                        {hits > 0 ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center gap-1">
                            <span>{hits} in script</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-mono">
                            0 in script
                          </span>
                        )}
                      </div>

                      {/* Status Selector & Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <label htmlFor={`${formId}-status-${claim.id}`} className="sr-only">
                          Review status for {claim.phrase}
                        </label>
                        <select
                          id={`${formId}-status-${claim.id}`}
                          value={claim.reviewStatus}
                          onChange={(e) => handleStatusChange(claim.id, e.target.value as ClaimReviewStatus)}
                          disabled={disabled}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold border cursor-pointer focus:outline-none ${
                            claim.reviewStatus === "approved"
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                              : claim.reviewStatus === "flagged"
                              ? "bg-amber-950/80 text-amber-300 border-amber-700"
                              : claim.reviewStatus === "rejected"
                              ? "bg-rose-950/80 text-rose-300 border-rose-700"
                              : "bg-slate-900 text-slate-300 border-slate-700"
                          }`}
                        >
                          <option value="unreviewed">⏳ Unreviewed</option>
                          <option value="approved">✓ Approved</option>
                          <option value="flagged">⚠ Flagged</option>
                          <option value="rejected">✕ Rejected</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteClaim(claim.id)}
                          disabled={disabled}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete claim phrase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Notes Input */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold shrink-0">Notes:</span>
                      <input
                        type="text"
                        value={claim.notes || ""}
                        onChange={(e) => handleNotesChange(claim.id, e.target.value)}
                        placeholder="Auditor rationale, substantiation reference, or disclaimer requirement..."
                        disabled={disabled}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-500">
            <span>{claimPhrases.length} registered claims</span>
            <button
              type="button"
              onClick={handleRestoreDefaultClaims}
              disabled={disabled}
              className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Reset to Default Claim Phrases
            </button>
          </div>
        </div>
      )}

      {/* SubTab 2: MAIVC Compliance Checklist */}
      {activeSubTab === "checklist" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
            <span className="text-slate-400">
              Complete these verification items prior to Instagram Reel publication.
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {checkedChecklist} of {totalChecklist} verified
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
            {maivcChecklist.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex flex-col gap-2 transition-colors ${
                  item.checked
                    ? "bg-emerald-950/20 border-emerald-800/60"
                    : "bg-slate-950/70 border-slate-800"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id={`check-${item.id}`}
                    checked={item.checked}
                    onChange={() => handleToggleChecklist(item.id)}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor={`check-${item.id}`}
                        className={`text-xs font-bold cursor-pointer ${
                          item.checked ? "text-emerald-300 line-through opacity-85" : "text-white"
                        }`}
                      >
                        {item.code}: {item.label}
                      </label>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                          item.severity === "required"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                            : "bg-sky-950/80 text-sky-300 border border-sky-800"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Auditor Notes Input */}
                <div className="flex items-center gap-2 text-xs pl-6">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold shrink-0">Notes:</span>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleChecklistNotesChange(item.id, e.target.value)}
                    placeholder="Verification notes or compliance proof..."
                    disabled={disabled}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 3: Script Occurrences */}
      {activeSubTab === "occurrences" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
            <span className="text-slate-400">
              Dialogue lines in active script matching registered claim phrases
            </span>
            <span className="font-mono text-indigo-300 font-bold">
              {scan.totalMatches} matches found
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {scan.matches.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/60">
                ✓ No registered claim phrases were detected in the current script dialogue.
              </div>
            ) : (
              scan.matches.map((m, idx) => (
                <div
                  key={`${m.lineId}-${idx}`}
                  className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-300">Turn #{m.turnIndex}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                        Speaker: {m.speakerSlotId}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        m.reviewStatus === "approved"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : m.reviewStatus === "flagged"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : m.reviewStatus === "rejected"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-slate-900 text-slate-400 border border-slate-700"
                      }`}
                    >
                      Matched: "{m.matchedPhrase}" ({m.reviewStatus})
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-mono bg-slate-900/60 p-2 rounded border border-slate-800 leading-relaxed">
                    {m.contextText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer isolation notice */}
      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>
          Compliance checks are deterministic and conducted entirely in-browser. All statuses, checked items, and notes are preserved in session memory and can be exported via JSON or the Review Report.
        </span>
      </div>
    </section>
  );
}
