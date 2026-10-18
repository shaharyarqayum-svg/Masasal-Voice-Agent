import { useState, FormEvent } from "react";
import { MASASAL_VOICE_PROFILES } from "./voices.ts";
import {
  SpeakerSlot,
  ScriptLine,
  ProjectData,
  SimulatedGenerationReport,
  SimulatedLineTiming,
  PronunciationEntry,
  ReelScene,
  ReelSettings,
  ClaimPhrase,
  MaivcChecklistItem,
} from "./types.ts";
import { DEFAULT_CLAIM_PHRASES, DEFAULT_MAIVC_CHECKLIST } from "./utils/claimMaivc.ts";
import SpeakerSlotManager from "./components/SpeakerSlotManager.tsx";
import ScriptEditor from "./components/ScriptEditor.tsx";
import LocalWavInspector from "./components/LocalWavInspector.tsx";
import ProjectActions from "./components/ProjectActions.tsx";
import SimulatedGenerationView from "./components/SimulatedGenerationView.tsx";
import ScriptDoctorWorkspace from "./components/ScriptDoctorWorkspace.tsx";
import PronunciationWorkspace from "./components/PronunciationWorkspace.tsx";
import ReelProductionCopilot from "./components/ReelProductionCopilot.tsx";
import ClaimAndMaivcWorkspace from "./components/ClaimAndMaivcWorkspace.tsx";
import { DEFAULT_PRONUNCIATION_DICTIONARY } from "./utils/pronunciationRules.ts";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  AudioWaveform,
  ShieldAlert,
  Cpu,
  Layers,
  FileAudio,
  Activity,
  Stethoscope,
  BookA,
  Film,
} from "lucide-react";

const INITIAL_SPEAKER_SLOTS: SpeakerSlot[] = [
  {
    id: "slot-agent",
    name: "Agent Jordan",
    voiceProfileId: "Charon",
    tone: "Informative & Calm",
    pace: 1.0,
    delivery: "Customer Support",
    color: "indigo",
  },
  {
    id: "slot-customer",
    name: "Customer Alex",
    voiceProfileId: "Puck",
    tone: "Upbeat & Lively",
    pace: 1.1,
    delivery: "Conversational",
    color: "emerald",
  },
];

const INITIAL_SCRIPT_LINES: ScriptLine[] = [
  {
    id: "line-1",
    speakerSlotId: "slot-agent",
    text: "Hello, thank you for contacting Masasal Voice Services. How can I assist you with your setup today?",
    deliveryNotes: "Clear greeting with welcoming tone",
    emotion: "Warm & Welcoming",
    emphasisNotes: "Stress [Masasal]",
    wpm: 140,
    pauseAfterSeconds: 0.4,
  },
  {
    id: "line-2",
    speakerSlotId: "slot-customer",
    text: "Hi Jordan! I'm reviewing our voice agent workflow parameters and wanted to verify our cadence calculations.",
    deliveryNotes: "Conversational and curious",
    emotion: "Neutral / Matter-of-fact",
    emphasisNotes: "Pause before questions",
    wpm: 154,
    pauseAfterSeconds: 0.4,
  },
  {
    id: "line-3",
    speakerSlotId: "slot-agent",
    text: "Certainly. All speaker slots, delivery styles, and local WAV validations are active right here in Foundation Mode.",
    deliveryNotes: "Confident, professional confirmation",
    emotion: "Confident & Authoritative",
    emphasisNotes: "Even cadence",
    wpm: 140,
    pauseAfterSeconds: 0.6,
  },
];

const INITIAL_REEL_SETTINGS: ReelSettings = {
  sceneWordLimit: 30,
  defaultWpm: 140,
  defaultPauseSec: 0.4,
};

export default function App() {
  const [projectTitle, setProjectTitle] = useState<string>("Customer Voice Agent Workflow");
  const [projectDescription, setProjectDescription] = useState<string>(
    "Local multi-turn script with configured speaker slots, pacing, pronunciation rules, and Instagram Reel production assets."
  );

  const [speakerSlots, setSpeakerSlots] = useState<SpeakerSlot[]>(INITIAL_SPEAKER_SLOTS);
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>(INITIAL_SCRIPT_LINES);

  // New Production Utilities State
  const [pronunciationDictionary, setPronunciationDictionary] = useState<PronunciationEntry[]>(
    DEFAULT_PRONUNCIATION_DICTIONARY
  );
  const [pronunciationOverrides, setPronunciationOverrides] = useState<PronunciationEntry[]>([]);
  const [reelScenes, setReelScenes] = useState<ReelScene[]>([]);
  const [reelSettings, setReelSettings] = useState<ReelSettings>(INITIAL_REEL_SETTINGS);
  const [claimPhrases, setClaimPhrases] = useState<ClaimPhrase[]>(DEFAULT_CLAIM_PHRASES);
  const [maivcChecklist, setMaivcChecklist] = useState<MaivcChecklistItem[]>(DEFAULT_MAIVC_CHECKLIST);

  const [activeTab, setActiveTab] = useState<
    "workflow" | "doctor" | "pronunciation" | "reel" | "wav" | "report" | "maivc"
  >("workflow");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-memory ephemeral simulation report (never stored in database/localStorage)
  const [simulatedReport, setSimulatedReport] = useState<SimulatedGenerationReport | null>(null);

  // Speaker Slot Handlers
  const handleUpdateSlot = (updatedSlot: SpeakerSlot) => {
    setSpeakerSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
  };

  const handleAddSlot = () => {
    const slotNum = speakerSlots.length + 1;
    const defaultProfile = MASASAL_VOICE_PROFILES[(slotNum - 1) % MASASAL_VOICE_PROFILES.length];
    const colors = ["indigo", "emerald", "amber", "sky", "rose", "purple"];
    const color = colors[(slotNum - 1) % colors.length];

    const newSlot: SpeakerSlot = {
      id: `slot-${Date.now()}`,
      name: `Speaker ${slotNum}`,
      voiceProfileId: defaultProfile.id,
      tone: defaultProfile.tone,
      pace: 1.0,
      delivery: "Conversational",
      color,
    };
    setSpeakerSlots((prev) => [...prev, newSlot]);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (speakerSlots.length <= 1) return;
    const remainingSlots = speakerSlots.filter((s) => s.id !== slotId);
    setSpeakerSlots(remainingSlots);

    // Reassign orphaned script lines to the first remaining slot
    const fallbackSlotId = remainingSlots[0].id;
    setScriptLines((prev) =>
      prev.map((l) => (l.speakerSlotId === slotId ? { ...l, speakerSlotId: fallbackSlotId } : l))
    );
  };

  // Script Line Handlers
  const handleUpdateLine = (updatedLine: ScriptLine) => {
    setScriptLines((prev) => prev.map((l) => (l.id === updatedLine.id ? updatedLine : l)));
  };

  const handleAddLine = (afterIndex?: number) => {
    const defaultSlot = speakerSlots[0] || INITIAL_SPEAKER_SLOTS[0];
    const newLine: ScriptLine = {
      id: `line-${Date.now()}`,
      speakerSlotId: defaultSlot.id,
      text: "",
      wpm: Math.round(140 * (defaultSlot.pace || 1.0)),
      pauseAfterSeconds: 0.4,
    };

    if (typeof afterIndex === "number" && afterIndex >= 0) {
      const nextLines = [...scriptLines];
      nextLines.splice(afterIndex + 1, 0, newLine);
      setScriptLines(nextLines);
    } else {
      setScriptLines((prev) => [...prev, newLine]);
    }
  };

  const handleDeleteLine = (lineId: string) => {
    setScriptLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const handleMoveLine = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scriptLines.length) return;

    const nextLines = [...scriptLines];
    const temp = nextLines[index];
    nextLines[index] = nextLines[targetIndex];
    nextLines[targetIndex] = temp;
    setScriptLines(nextLines);
  };

  // Preset Template Loader
  const handleLoadTemplate = (templateKey: "support" | "briefing" | "multiagent") => {
    if (templateKey === "support") {
      setSpeakerSlots(INITIAL_SPEAKER_SLOTS);
      setScriptLines(INITIAL_SCRIPT_LINES);
      setProjectTitle("Customer Support Dialogue");
      setProjectDescription("Standard two-speaker support and escalation workflow.");
    } else if (templateKey === "briefing") {
      setSpeakerSlots([
        {
          id: "slot-briefing",
          name: "Briefing Assistant",
          voiceProfileId: "Zephyr",
          tone: "Bright & Clear",
          pace: 1.05,
          delivery: "Broadcast Announcement",
          color: "sky",
        },
      ]);
      setScriptLines([
        {
          id: "line-b1",
          speakerSlotId: "slot-briefing",
          text: "Good morning. Here is your daily operational summary for Masasal Voice services.",
          deliveryNotes: "Direct, articulate opening",
          emotion: "Confident & Authoritative",
          wpm: 147,
          pauseAfterSeconds: 0.5,
        },
        {
          id: "line-b2",
          speakerSlotId: "slot-briefing",
          text: "All local test workflows are running within expected latency limits, with zero remote network egress.",
          deliveryNotes: "Measured cadence",
          emotion: "Calm & Reassuring",
          wpm: 147,
          pauseAfterSeconds: 0.5,
        },
        {
          id: "line-b3",
          speakerSlotId: "slot-briefing",
          text: "Please inspect your reference WAV samples below if acoustic comparison is needed.",
          deliveryNotes: "Polite conclusion",
          emotion: "Warm & Welcoming",
          wpm: 147,
          pauseAfterSeconds: 0.3,
        },
      ]);
      setProjectTitle("Voice Assistant Morning Briefing");
      setProjectDescription("Single-speaker informational broadcast script.");
    } else if (templateKey === "multiagent") {
      setSpeakerSlots([
        {
          id: "slot-triage",
          name: "Triage Bot",
          voiceProfileId: "Puck",
          tone: "Upbeat & Lively",
          pace: 1.1,
          delivery: "Technical Explainer",
          color: "indigo",
        },
        {
          id: "slot-expert",
          name: "Specialist Rachel",
          voiceProfileId: "Kore",
          tone: "Firm & Confident",
          pace: 1.0,
          delivery: "Customer Support",
          color: "purple",
        },
        {
          id: "slot-user",
          name: "Caller Sam",
          voiceProfileId: "Achernar",
          tone: "Soft & Approachable",
          pace: 0.95,
          delivery: "Conversational",
          color: "amber",
        },
      ]);
      setScriptLines([
        {
          id: "line-m1",
          speakerSlotId: "slot-user",
          text: "Hi, I need assistance routing my account credentials securely.",
          pauseAfterSeconds: 0.3,
          wpm: 133,
        },
        {
          id: "line-m2",
          speakerSlotId: "slot-triage",
          text: "Understood Sam. I am transferring your session to Specialist Rachel right now.",
          pauseAfterSeconds: 0.5,
          wpm: 154,
        },
        {
          id: "line-m3",
          speakerSlotId: "slot-expert",
          text: "Hello Sam, Rachel here. I have received your request and can confirm our Foundation workflow is 100% isolated.",
          pauseAfterSeconds: 0.4,
          wpm: 140,
        },
        {
          id: "line-m4",
          speakerSlotId: "slot-user",
          text: "That is perfect. I see the simulated cadence report updating in real time.",
          pauseAfterSeconds: 0.3,
          wpm: 133,
        },
        {
          id: "line-m5",
          speakerSlotId: "slot-expert",
          text: "Exactly. You can export our conversation JSON anytime using the local actions toolbar.",
          pauseAfterSeconds: 0.4,
          wpm: 140,
        },
      ]);
      setProjectTitle("Multi-Agent Escalation Simulation");
      setProjectDescription(
        "3-speaker dialogue featuring automated triage, specialist transfer, and caller response."
      );
    }
  };

  // JSON Import & Reset Handlers
  const handleImportProject = (data: ProjectData) => {
    setProjectTitle(data.title);
    setProjectDescription(data.description);
    setSpeakerSlots(data.speakerSlots);
    setScriptLines(data.scriptLines);
    if (data.pronunciationDictionary) {
      setPronunciationDictionary(data.pronunciationDictionary);
    }
    if (data.pronunciationOverrides) {
      setPronunciationOverrides(data.pronunciationOverrides);
    }
    if (data.reelScenes) {
      setReelScenes(data.reelScenes);
    }
    if (data.reelSettings) {
      setReelSettings(data.reelSettings);
    }
    setClaimPhrases(data.claimPhrases ?? DEFAULT_CLAIM_PHRASES.map((item) => ({ ...item })));
    setMaivcChecklist(data.maivcChecklist ?? DEFAULT_MAIVC_CHECKLIST.map((item) => ({ ...item })));
    setSimulatedReport(null);
    setErrorMessage(null);
  };

  const handleResetProject = () => {
    setProjectTitle("New Voice Agent Script");
    setProjectDescription("");
    setSpeakerSlots(INITIAL_SPEAKER_SLOTS);
    setScriptLines([]);
    setPronunciationOverrides([]);
    setReelScenes([]);
    setClaimPhrases(DEFAULT_CLAIM_PHRASES.map((item) => ({ ...item })));
    setMaivcChecklist(DEFAULT_MAIVC_CHECKLIST.map((item) => ({ ...item })));
    setSimulatedReport(null);
    setErrorMessage(null);
  };

  // Run Simulated Generation (Strictly in Browser, Never Real Audio)
  const handleSimulatedGeneration = async (e: FormEvent) => {
    e.preventDefault();
    if (isSimulating) return;

    setErrorMessage(null);

    if (speakerSlots.length === 0) {
      setErrorMessage("At least one speaker slot is required.");
      return;
    }

    if (scriptLines.length === 0) {
      setErrorMessage("Script is empty. Please add at least one dialogue turn.");
      return;
    }

    const emptyLineIdx = scriptLines.findIndex((l) => !l.text.trim());
    if (emptyLineIdx !== -1) {
      setErrorMessage(
        `Dialogue turn #${emptyLineIdx + 1} is empty. Please provide text or remove the turn.`
      );
      return;
    }

    setIsSimulating(true);

    try {
      // Simulate brief local execution delay (250ms)
      await new Promise((resolve) => setTimeout(resolve, 250));

      let currentTimer = 0;
      const lineTimings: SimulatedLineTiming[] = [];
      const speakerStats: SimulatedGenerationReport["speakerStats"] = {};

      for (const line of scriptLines) {
        const slot = speakerSlots.find((s) => s.id === line.speakerSlotId) || speakerSlots[0];
        const profile = MASASAL_VOICE_PROFILES.find((v) => v.id === slot.voiceProfileId) || {
          id: slot.voiceProfileId,
          name: slot.voiceProfileId,
          tone: slot.tone,
          description: "",
        };

        const words = line.text.trim().split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const charCount = line.text.length;
        const pace = slot.pace || 1.0;
        const wpm = line.wpm || Math.round(140 * pace);

        // Exact formula: (wordCount ÷ visible WPM) * 60
        const spokenSec = wpm > 0 ? (wordCount / wpm) * 60 : 0;
        const pauseAfterSec = line.pauseAfterSeconds ?? 0.4;
        const durationSec = Math.round((spokenSec + pauseAfterSec) * 10) / 10;

        const startTimeSec = Math.round(currentTimer * 10) / 10;
        const endTimeSec = Math.round((currentTimer + durationSec) * 10) / 10;
        currentTimer += durationSec;

        lineTimings.push({
          lineId: line.id,
          speakerSlotId: slot.id,
          speakerName: slot.name,
          voiceName: profile.name,
          tone: slot.tone,
          pace,
          delivery: slot.delivery,
          text: line.text.trim(),
          wordCount,
          charCount,
          startTimeSec,
          durationSec,
          endTimeSec,
          pauseAfterSec,
        });

        if (!speakerStats[slot.id]) {
          speakerStats[slot.id] = {
            speakerName: slot.name,
            voiceName: profile.name,
            lineCount: 0,
            wordCount: 0,
            durationSec: 0,
          };
        }
        speakerStats[slot.id].lineCount += 1;
        speakerStats[slot.id].wordCount += wordCount;
        speakerStats[slot.id].durationSec =
          Math.round((speakerStats[slot.id].durationSec + durationSec) * 10) / 10;
      }

      const totalWords = lineTimings.reduce((acc, t) => acc + t.wordCount, 0);
      const totalChars = lineTimings.reduce((acc, t) => acc + t.charCount, 0);
      const totalDurationSeconds = Math.round(currentTimer * 10) / 10;

      const report: SimulatedGenerationReport = {
        isSimulatedMock: true,
        projectTitle: projectTitle || "Masasal Voice Agent Workflow",
        totalLines: lineTimings.length,
        totalWords,
        totalChars,
        totalDurationSeconds,
        lineTimings,
        speakerStats,
        timestamp: new Date().toISOString(),
        foundationWarning: "SIMULATED — FOUNDATION MODE: Real voice generation disabled.",
      };

      setSimulatedReport(report);
      setActiveTab("report");
    } catch (err: any) {
      console.error("Simulation error:", err);
      setErrorMessage("Simulation calculation failed in browser.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1120] text-slate-200 font-sans flex flex-col items-center px-3 sm:px-6 py-6 sm:py-8">
      <div className="w-full max-w-4xl flex flex-col gap-5">
        {/* Foundation Mode Persistent Warning Banner */}
        <aside
          id="foundation-mode-global-warning"
          aria-label="Foundation Mode Notice"
          className="p-3 rounded-xl bg-amber-950/70 border border-amber-600/80 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="leading-snug">
              <span className="font-bold tracking-wide uppercase text-amber-300">
                SIMULATED — FOUNDATION MODE
              </span>
              <span className="hidden sm:inline text-amber-200/90 ml-2">
                • Real Gemini TTS and external API calls are disabled • Local production utilities only
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-900/90 text-[10px] font-mono font-bold text-amber-300 border border-amber-700 shrink-0">
            LOCAL ISOLATED
          </span>
        </aside>

        {/* Application Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <AudioWaveform className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 id="app-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Masasal Voice Agent
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Local Production Utilities & Script Cadence Simulator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 bg-slate-800/90 rounded-full text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Foundation Only</span>
            </span>
          </div>
        </header>

        {/* JSON Export/Import & Reset Toolbar */}
        <ProjectActions
          projectTitle={projectTitle}
          projectDescription={projectDescription}
          speakerSlots={speakerSlots}
          scriptLines={scriptLines}
          pronunciationDictionary={pronunciationDictionary}
          pronunciationOverrides={pronunciationOverrides}
          reelScenes={reelScenes}
          reelSettings={reelSettings}
          claimPhrases={claimPhrases}
          maivcChecklist={maivcChecklist}
          onImportProject={handleImportProject}
          onResetProject={handleResetProject}
          disabled={isSimulating}
        />

        {/* Local Error notification */}
        {errorMessage && (
          <div
            id="error-banner"
            role="alert"
            className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold block mb-0.5">Workflow Notice</span>
              {errorMessage}
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-rose-200 p-1 rounded cursor-pointer"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs (Responsive & Scrollable on Mobile) */}
        <nav
          aria-label="Production Workspace Tabs"
          className="flex items-center gap-1.5 border-b border-slate-800 pb-1 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            onClick={() => setActiveTab("workflow")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "workflow"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Script & Voice Director</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
              {scriptLines.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctor")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "doctor"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-indigo-300" />
            <span>Script Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pronunciation")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "pronunciation"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BookA className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pronunciation</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
              {pronunciationDictionary.length + pronunciationOverrides.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reel")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "reel"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span>Reel Copilot</span>
            {reelScenes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
                {reelScenes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("maivc")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${activeTab === "maivc" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Claims & MAIVC QC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("wav")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "wav"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Audio Inspector</span>
          </button>

          {simulatedReport && (
            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                activeTab === "report"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-300" />
              <span>Simulated Cadence</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                Mock
              </span>
            </button>
          )}
        </nav>

        {/* Tab 1: Script Editing, Speaker Slots & Voice Director */}
        {activeTab === "workflow" && (
          <form onSubmit={handleSimulatedGeneration} className="flex flex-col gap-6">
            {/* Project metadata */}
            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Project Title (e.g. Support Voice Agent)"
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1"
                />
              </div>
              <input
                type="text"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief project notes or scenario description..."
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            {/* Speaker Slots Section */}
            <SpeakerSlotManager
              speakerSlots={speakerSlots}
              onUpdateSlot={handleUpdateSlot}
              onAddSlot={handleAddSlot}
              onDeleteSlot={handleDeleteSlot}
              disabled={isSimulating}
            />

            {/* Voice Director Script Lines Editor */}
            <ScriptEditor
              lines={scriptLines}
              speakerSlots={speakerSlots}
              onUpdateLine={handleUpdateLine}
              onAddLine={handleAddLine}
              onDeleteLine={handleDeleteLine}
              onMoveLine={handleMoveLine}
              onLoadTemplate={handleLoadTemplate}
              disabled={isSimulating}
            />

            {/* Run Simulated Generation Action */}
            <div className="pt-2">
              <button
                type="submit"
                id="run-simulated-generation-btn"
                disabled={isSimulating || scriptLines.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Calculating Simulated Cadence...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-indigo-200" />
                    <span>Run Simulated Generation</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-2">
                Simulated execution runs 100% locally in browser memory. Never generates real audio in Foundation Mode.
              </p>
            </div>
          </form>
        )}

        {/* Tab 2: Script Doctor */}
        {activeTab === "doctor" && (
          <ScriptDoctorWorkspace
            scriptLines={scriptLines}
            onUpdateLines={(newLines) => setScriptLines(newLines)}
            disabled={isSimulating}
          />
        )}

        {/* Tab 3: Pronunciation Workspace */}
        {activeTab === "pronunciation" && (
          <PronunciationWorkspace
            dictionary={pronunciationDictionary}
            overrides={pronunciationOverrides}
            scriptLines={scriptLines}
            onUpdateDictionary={setPronunciationDictionary}
            onUpdateOverrides={setPronunciationOverrides}
            disabled={isSimulating}
          />
        )}

        {/* Tab 4: Reel Production Copilot */}
        {activeTab === "reel" && (
          <ReelProductionCopilot
            scriptLines={scriptLines}
            scenes={reelScenes}
            settings={reelSettings}
            onUpdateScenes={setReelScenes}
            onUpdateSettings={setReelSettings}
            disabled={isSimulating}
          />
        )}

        {/* Product Claim Checker and MAIVC quality-control workspace */}
        {activeTab === "maivc" && (
          <ClaimAndMaivcWorkspace scriptLines={scriptLines} projectTitle={projectTitle} phrases={claimPhrases} setPhrases={setClaimPhrases} checklist={maivcChecklist} setChecklist={setMaivcChecklist} />
        )}

        {/* Tab 5: Local Audio Inspector & Reference Preview */}
        {activeTab === "wav" && (
          <div className="flex flex-col gap-4">
            <LocalWavInspector />
          </div>
        )}

        {/* Tab 6: Simulated Generation Output Report */}
        {activeTab === "report" && simulatedReport && (
          <div className="flex flex-col gap-4">
            <SimulatedGenerationView
              report={simulatedReport}
              onClearResult={() => {
                setSimulatedReport(null);
                setActiveTab("workflow");
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
