import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GEMINI_TTS_VOICES } from "./src/voices.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// Foundation Mode: No real API keys, no external services, no real TTS models
app.use(express.json({ limit: "1mb" }));

// Health check endpoint indicating Foundation Only mode
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "Masasal Voice Agent",
    mode: "foundation-only",
    geminiTtsEnabled: false,
    externalApis: "disabled",
  });
});

// Endpoint to fetch available voice profiles for local preview
app.get("/api/voices", (_req: Request, res: Response) => {
  res.json({ voices: GEMINI_TTS_VOICES });
});

// Network-capable voice-generation paths are completely disabled
app.all("/api/tts/generate", (_req: Request, res: Response) => {
  res.status(403).json({
    error: "Network-capable TTS generation is disabled in Masasal Voice Agent — Foundation Only mode.",
    mode: "SIMULATED — FOUNDATION MODE",
    realAudioGenerated: false,
    status: "disabled",
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Masasal Voice Agent (Foundation Only) running on port ${PORT}`);
  });
}

startServer();
