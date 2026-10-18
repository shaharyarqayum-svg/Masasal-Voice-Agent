import { ClaimPhrase, MaivcChecklistItem } from "../types.ts";

export const DEFAULT_CLAIM_PHRASES: ClaimPhrase[] = [
  "guaranteed", "clinically proven", "instant results", "cure", "permanent results",
  "100% effective", "zero side effects",
].map((phrase) => ({
  id: phrase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  phrase,
  reviewed: false,
}));

const CHECKLIST_LABELS = [
  "Exact product name, size and variant verified",
  "Current price/offer checked against an authoritative current source",
  "Product availability confirmed",
  "Claims checked against authoritative product information",
  "No invented product facts, results, testimonials or unsupported demonstrations",
  "Pronunciation and delivery reviewed",
  "On-screen text and captions checked",
  "CTA clear and appropriate",
  "Final rendered video, audio and captions reviewed",
  "Owner final approval obtained",
];

export const DEFAULT_MAIVC_CHECKLIST: MaivcChecklistItem[] = CHECKLIST_LABELS.map((label, i) => ({
  id: "maivc-" + i,
  label,
  checked: false,
  note: "",
}));
