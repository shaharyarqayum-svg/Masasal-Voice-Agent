export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  tone: string;
}

export type GeminiVoice = VoiceProfile;

/**
 * Standard voice agent persona profiles available for local simulated generation.
 */
export const MASASAL_VOICE_PROFILES: readonly VoiceProfile[] = [
  { id: 'Puck', name: 'Puck', tone: 'Upbeat & Lively', description: 'Energetic, playful, and animated persona' },
  { id: 'Charon', name: 'Charon', tone: 'Informative & Calm', description: 'Measured, clear, and professional persona' },
  { id: 'Kore', name: 'Kore', tone: 'Firm & Confident', description: 'Strong, articulate, and expressive persona' },
  { id: 'Fenrir', name: 'Fenrir', tone: 'Excitable & Dynamic', description: 'Passionate, energetic, and intense persona' },
  { id: 'Zephyr', name: 'Zephyr', tone: 'Bright & Clear', description: 'Crisp, natural, and engaging persona' },
  { id: 'Aoede', name: 'Aoede', tone: 'Breezy & Natural', description: 'Conversational, thoughtful, and smooth persona' },
  { id: 'Enceladus', name: 'Enceladus', tone: 'Breathy & Warm', description: 'Intimate, soft, and resonant persona' },
  { id: 'Achernar', name: 'Achernar', tone: 'Soft & Approachable', description: 'Gentle, friendly, and balanced persona' },
  { id: 'Autonoe', name: 'Autonoe', tone: 'Bright & Resonant', description: 'Wise, thoughtful, and mature persona' },
  { id: 'Laomedeia', name: 'Laomedeia', tone: 'Upbeat & Cheerful', description: 'Lively, friendly, and optimistic persona' },
  { id: 'Orus', name: 'Orus', tone: 'Firm & Mature', description: 'Deeper, resonant, and authoritative persona' },
  { id: 'Alnilam', name: 'Alnilam', tone: 'Firm & Energetic', description: 'Confident, clear, and excited persona' },
  { id: 'Callirrhoe', name: 'Callirrhoe', tone: 'Confident & Clear', description: 'Professional, articulate, and energetic persona' },
  { id: 'Umbriel', name: 'Umbriel', tone: 'Smooth & Authoritative', description: 'Rich, friendly, and commanding persona' },
  { id: 'Sulafat', name: 'Sulafat', tone: 'Warm & Articulate', description: 'Persuasive, intelligent, and confident persona' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', tone: 'Dramatic & Thoughtful', description: 'Expressive, calm, and reassuring persona' },
  { id: 'Achird', name: 'Achird', tone: 'Youthful & Inquisitive', description: 'Friendly, bright, and inquisitive persona' },
  { id: 'Algenib', name: 'Algenib', tone: 'Warm & Authoritative', description: 'Confident, friendly, and grounded persona' },
] as const;

export const GEMINI_TTS_VOICES = MASASAL_VOICE_PROFILES;
export const DEFAULT_VOICE_ID = 'Puck';
