import { Plus, Trash2, Users, SlidersHorizontal, Sparkles } from "lucide-react";
import { SpeakerSlot } from "../types.ts";
import { MASASAL_VOICE_PROFILES } from "../voices.ts";

interface SpeakerSlotManagerProps {
  speakerSlots: SpeakerSlot[];
  onUpdateSlot: (updatedSlot: SpeakerSlot) => void;
  onAddSlot: () => void;
  onDeleteSlot: (slotId: string) => void;
  disabled?: boolean;
}

const TONE_PRESETS = [
  "Warm & Professional",
  "Calm & Reassuring",
  "Bright & Direct",
  "Empathetic & Attentive",
  "Authoritative & Confident",
  "Lively & Animated",
  "Subdued & Measured",
];

const DELIVERY_STYLES = [
  "Conversational",
  "Customer Support",
  "Technical Explainer",
  "Roleplay Dialogue",
  "Broadcast Announcement",
  "Subdued / Whispered",
];

const PACE_OPTIONS = [
  { value: 0.75, label: "0.75x (Slow)" },
  { value: 0.9, label: "0.90x (Deliberate)" },
  { value: 1.0, label: "1.00x (Natural)" },
  { value: 1.1, label: "1.10x (Brisk)" },
  { value: 1.25, label: "1.25x (Fast)" },
  { value: 1.5, label: "1.50x (Rapid)" },
];

const SLOT_COLORS = [
  { id: "indigo", bg: "bg-indigo-950/70", border: "border-indigo-600/60", badge: "bg-indigo-600 text-white" },
  { id: "emerald", bg: "bg-emerald-950/70", border: "border-emerald-600/60", badge: "bg-emerald-600 text-white" },
  { id: "amber", bg: "bg-amber-950/70", border: "border-amber-600/60", badge: "bg-amber-600 text-white" },
  { id: "sky", bg: "bg-sky-950/70", border: "border-sky-600/60", badge: "bg-sky-600 text-white" },
  { id: "rose", bg: "bg-rose-950/70", border: "border-rose-600/60", badge: "bg-rose-600 text-white" },
  { id: "purple", bg: "bg-purple-950/70", border: "border-purple-600/60", badge: "bg-purple-600 text-white" },
];

export default function SpeakerSlotManager({
  speakerSlots,
  onUpdateSlot,
  onAddSlot,
  onDeleteSlot,
  disabled = false,
}: SpeakerSlotManagerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Speaker Slots & Persona Config ({speakerSlots.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={onAddSlot}
          disabled={disabled || speakerSlots.length >= 6}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Speaker Slot</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {speakerSlots.map((slot, index) => {
          const colorTheme = SLOT_COLORS.find((c) => c.id === slot.color) || SLOT_COLORS[index % SLOT_COLORS.length];
          const matchedProfile = MASASAL_VOICE_PROFILES.find((v) => v.id === slot.voiceProfileId);

          return (
            <div
              key={slot.id}
              className={`rounded-xl border ${colorTheme.border} ${colorTheme.bg} p-3.5 flex flex-col gap-3 shadow-md transition-all`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colorTheme.badge} shrink-0`}>
                    Slot {index + 1}
                  </span>
                  <input
                    type="text"
                    value={slot.name}
                    disabled={disabled}
                    onChange={(e) => onUpdateSlot({ ...slot, name: e.target.value })}
                    placeholder="Speaker label (e.g. Agent Alex)"
                    className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1 min-w-0"
                  />
                </div>

                {speakerSlots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteSlot(slot.id)}
                    disabled={disabled}
                    className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    title={`Delete ${slot.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Persona Profile Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Voice Persona</span>
                  <span className="text-[10px] font-normal normal-case text-slate-500">
                    {matchedProfile?.tone || "Standard"}
                  </span>
                </label>
                <select
                  value={slot.voiceProfileId}
                  disabled={disabled}
                  onChange={(e) => {
                    const profile = MASASAL_VOICE_PROFILES.find((p) => p.id === e.target.value);
                    onUpdateSlot({
                      ...slot,
                      voiceProfileId: e.target.value,
                      tone: profile ? profile.tone : slot.tone,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                >
                  {MASASAL_VOICE_PROFILES.map((vp) => (
                    <option key={vp.id} value={vp.id}>
                      {vp.name} — {vp.tone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Controls: Tone, Pace, Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Tone Preset / Custom */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Tone / Emotion
                  </label>
                  <select
                    value={TONE_PRESETS.includes(slot.tone) ? slot.tone : "Custom"}
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.value !== "Custom") {
                        onUpdateSlot({ ...slot, tone: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  >
                    {TONE_PRESETS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    {!TONE_PRESETS.includes(slot.tone) && <option value="Custom">Custom: {slot.tone}</option>}
                  </select>
                </div>

                {/* Delivery Style */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Delivery Style
                  </label>
                  <select
                    value={slot.delivery}
                    disabled={disabled}
                    onChange={(e) => onUpdateSlot({ ...slot, delivery: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  >
                    {DELIVERY_STYLES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pace Slider & Tag */}
              <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                    <span>Speaking Pace Multiplier</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-300">
                    {slot.pace.toFixed(2)}x (~{Math.round(140 * slot.pace)} WPM)
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-1">
                  {PACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onUpdateSlot({ ...slot, pace: opt.value })}
                      className={`py-1 px-1.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                        Math.abs(slot.pace - opt.value) < 0.01
                          ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {opt.value}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
