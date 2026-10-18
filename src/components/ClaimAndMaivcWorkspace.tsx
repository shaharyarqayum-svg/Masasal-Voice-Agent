import { useMemo, useState } from "react";
import { ClaimPhrase, MaivcChecklistItem, ScriptLine } from "../types.ts";

import { DEFAULT_CLAIM_PHRASES, DEFAULT_MAIVC_CHECKLIST } from "../utils/claimMaivc.ts";
const idFor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function phraseRegex(phrase: string): RegExp {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "[\\s-]+");
  let core = escaped;
  if (/^guarantee$/i.test(phrase)) core = "guarantee(?:s|d|ing)?";
  else if (/^result$/i.test(phrase)) core = "results?";
  else if (/^cure$/i.test(phrase)) core = "cures?";
  return new RegExp("(^|[^\\p{L}\\p{N}])(" + core + ")(?=$|[^\\p{L}\\p{N}])", "giu");
}

export default function ClaimAndMaivcWorkspace({ scriptLines, projectTitle, phrases, setPhrases, checklist, setChecklist }: { scriptLines: ScriptLine[]; projectTitle: string; phrases: ClaimPhrase[]; setPhrases: React.Dispatch<React.SetStateAction<ClaimPhrase[]>>; checklist: MaivcChecklistItem[]; setChecklist: React.Dispatch<React.SetStateAction<MaivcChecklistItem[]>> }) {
  const [newPhrase, setNewPhrase] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const script = scriptLines.map((line, index) => ({ turn: index + 1, text: line.text, id: line.id }));
  const matches = useMemo(() => {
    const found: Array<{ phraseId: string; phrase: string; turn: number; excerpt: string; match: string; start: number; reviewed: boolean }> = [];
    for (const phrase of phrases) {
      let re: RegExp;
      try { re = phraseRegex(phrase.phrase); } catch { continue; }
      for (const line of script) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line.text)) !== null) {
          const start = Math.max(0, m.index - 45), end = Math.min(line.text.length, m.index + m[0].length + 45);
          found.push({ phraseId: phrase.id, phrase: phrase.phrase, turn: line.turn, excerpt: line.text.slice(start, end), match: m[2] || m[0], start: m.index + (m[1]?.length || 0), reviewed: phrase.reviewed });
          if (m[0].length === 0) re.lastIndex++;
        }
      }
    }
    return found;
  }, [phrases, scriptLines]);

  const download = (kind: "json" | "txt") => {
    const payload = {
      project: projectTitle, exportedAt: new Date().toISOString(), scriptLines: script,
      claimMatches: matches, phrases: phrases.map(({id, phrase, reviewed}) => ({id, phrase, reviewed})),
      checklist: checklist.map(({id,label,checked,note}) => ({id,label,checked,note})),
      uncheckedWarnings: checklist.filter(x => !x.checked).map(x => x.label),
      caveats: [
        "Phrase matching is not factual, legal, scientific, regulatory or product-evidence verification.",
        "Reviewed means a human looked at the flag; it does not mean the claim is substantiated.",
        "Checklist ticks are human attestations, not proof or an automatic compliance determination.",
        "Timing estimates are not measured audio.",
      ],
    };
    const text = kind === "json" ? JSON.stringify(payload, null, 2) :
      ["MAIVC REVIEW EXPORT", "Project: " + projectTitle, "Exported: " + payload.exportedAt, "",
       "SCRIPT", ...script.map(x => "Turn " + x.turn + ": " + x.text), "",
       "CLAIM FLAGS", ...(matches.length ? matches.map(m => "Turn " + m.turn + " — “" + m.match + "” [" + m.phrase + "] — " + (m.reviewed ? "phrase marked reviewed" : "needs human review") + "\n  " + m.excerpt) : ["No configured phrase matches found."]), "",
       "CHECKLIST", ...checklist.map(x => (x.checked ? "[x] " : "[ ] ") + x.label + (x.note ? " — " + x.note : "")), "",
       "UNCHECKED ITEMS", ...(payload.uncheckedWarnings.length ? payload.uncheckedWarnings.map(x => "- " + x) : ["None"]), "",
       "CAVEATS", ...payload.caveats.map(x => "- " + x)].join("\n");
    const url = URL.createObjectURL(new Blob([text], {type: kind === "json" ? "application/json" : "text/plain;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = (idFor(projectTitle || "masasal-project") || "masasal-project") + "-maivc-review." + kind;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setExportNotice(kind.toUpperCase() + " review export generated locally. " + (payload.uncheckedWarnings.length ? payload.uncheckedWarnings.length + " checklist item(s) remain unchecked." : "All checklist items are checked; this is not automatic approval."));
  };

  const addPhrase = () => {
    const value = newPhrase.trim();
    if (!value) return;
    if (phrases.some(p => p.phrase.toLowerCase() === value.toLowerCase())) { setExportNotice("That phrase already exists."); return; }
    setPhrases(prev => [...prev, { id: idFor(value) + "-" + Date.now(), phrase: value, reviewed: false }]);
    setNewPhrase("");
  };

  return <section className="flex flex-col gap-5">
    <div className="rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 text-sm text-amber-100">
      <strong>Local rule-based tool – no model connected.</strong>
      <p className="mt-1 text-xs text-amber-200/80">Flags are review prompts, not evidence checks or compliance approval. State and custom phrases remain in this session unless exported.</p>
    </div>
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col gap-3">
      <h2 className="font-bold text-white">Product Claim Checker</h2>
      <p className="text-xs text-slate-400">Whole-word phrase matching with simple documented variations. No automatic script edits.</p>
      <div className="flex gap-2"><input aria-label="Custom phrase" value={newPhrase} onChange={e => setNewPhrase(e.target.value)} placeholder="Add review phrase" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"/><button type="button" onClick={addPhrase} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Add</button></div>
      <p className="text-xs text-amber-300">Custom claim-checker phrases are stored only in this session and will be lost on refresh unless you export the project.</p>
      <div className="flex flex-col gap-2">{phrases.map(p => <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 p-2 text-sm"><span className="flex-1 text-slate-200">{p.phrase}</span><label className="flex items-center gap-1 text-xs text-slate-400"><input type="checkbox" checked={p.reviewed} onChange={e => setPhrases(prev => prev.map(x => x.id === p.id ? {...x, reviewed:e.target.checked} : x))}/> Mark phrase reviewed</label><button type="button" onClick={() => { const value = window.prompt("Edit phrase", p.phrase); if (value?.trim()) setPhrases(prev => prev.map(x => x.id === p.id ? {...x, phrase:value.trim(), reviewed:false} : x)); }} className="text-xs text-indigo-300">Edit</button><button type="button" onClick={() => setPhrases(prev => prev.filter(x => x.id !== p.id))} className="text-xs text-rose-300">Remove</button></div>)}</div>
      <h3 className="font-semibold text-slate-200">Matches ({matches.length})</h3>
      {matches.length === 0 ? <p className="text-sm text-slate-400">No configured phrases matched the current script. This does not establish that the script's claims are accurate.</p> : matches.map((m,i) => <div key={m.phraseId + "-" + m.turn + "-" + m.start + "-" + i} className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong className="text-amber-200">Turn {m.turn}: “{m.match}”</strong><span className="text-xs text-slate-400">{m.reviewed ? "Phrase marked reviewed" : "Human review needed"} · position {m.start + 1}</span></div><p className="mt-1 text-xs text-slate-300">Matched phrase: {m.phrase}</p><p className="mt-1 text-xs text-slate-400">{m.excerpt}</p></div>)}
      <p className="text-xs text-slate-500">“Reviewed” records only that a human looked at this phrase flag. It does not substantiate or approve the claim.</p>
    </section>
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-white">MAIVC Pre-publish Checklist</h2><strong className="text-sm text-indigo-300">{checklist.filter(x=>x.checked).length}/10</strong></div>
      {checklist.map(item => <div key={item.id} className="rounded-lg border border-slate-800 p-3"><label className="flex items-start gap-2 text-sm text-slate-200"><input type="checkbox" className="mt-1" checked={item.checked} onChange={e=>setChecklist(prev=>prev.map(x=>x.id===item.id?{...x,checked:e.target.checked}:x))}/><span>{item.label}</span></label><input aria-label={"Review note: "+item.label} value={item.note} onChange={e=>setChecklist(prev=>prev.map(x=>x.id===item.id?{...x,note:e.target.value}:x))} placeholder="Optional review note" className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"/></div>)}
      {checklist.some(x=>!x.checked) && <div role="alert" className="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-200">Export warning: {checklist.filter(x=>!x.checked).length} item(s) remain unchecked. Checklist completion is not automatic compliance approval.</div>}
    </section>
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col gap-3"><h2 className="font-bold text-white">MAIVC Review Export</h2><p className="text-xs text-slate-400">Generates files locally; no upload or external transmission.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>download("json")} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Export Review JSON</button><button type="button" onClick={()=>download("txt")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200">Export Review Text</button></div>{exportNotice && <p role="status" className="text-xs text-emerald-300">{exportNotice}</p>}</section>
  </section>;
}
