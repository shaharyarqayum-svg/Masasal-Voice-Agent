import { WavMetadata } from "../types.ts";

export interface WavValidationResult {
  isValid: boolean;
  metadata?: WavMetadata;
  error?: string;
}

const AUDIO_FORMAT_NAMES: Record<number, string> = {
  1: "Linear PCM (Uncompressed)",
  3: "IEEE Float (32/64-bit)",
  6: "ITU-T G.711 A-law",
  7: "ITU-T G.711 µ-law",
  65534: "WAVE_FORMAT_EXTENSIBLE",
};

/**
 * Validates and extracts technical metadata from a local WAV file strictly in the browser.
 * Zero network requests, zero file uploads.
 */
export async function validateLocalWav(file: File): Promise<WavValidationResult> {
  if (!file) {
    return { isValid: false, error: "No file provided for inspection." };
  }

  // Basic MIME / extension check
  const isWavExt = file.name.toLowerCase().endsWith(".wav");
  if (!isWavExt && !file.type.includes("wav") && file.type !== "audio/x-wav") {
    return {
      isValid: false,
      error: `Invalid file type "${file.type || 'unknown'}". Only .wav files are supported for local inspection.`,
    };
  }

  if (file.size < 44) {
    return {
      isValid: false,
      error: `File is truncated (${file.size} bytes). Standard RIFF/WAVE files must be at least 44 bytes.`,
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // 1. Verify RIFF identifier (bytes 0-3)
    const riffHeader = getString(dataView, 0, 4);
    if (riffHeader !== "RIFF") {
      return {
        isValid: false,
        error: `Header mismatch: Expected "RIFF" signature, found "${riffHeader}". File is not a valid RIFF container.`,
      };
    }

    // 2. Verify WAVE format (bytes 8-11)
    const waveFormat = getString(dataView, 8, 4);
    if (waveFormat !== "WAVE") {
      return {
        isValid: false,
        error: `Format mismatch: Expected "WAVE" format identifier, found "${waveFormat}".`,
      };
    }

    // 3. Scan subchunks iteratively
    let offset = 12;
    let fmtParsed = false;
    let audioFormat = 1;
    let numChannels = 1;
    let sampleRate = 44100;
    let byteRate = 0;
    let bitsPerSample = 16;
    let dataSize = 0;

    while (offset + 8 <= dataView.byteLength) {
      const chunkId = getString(dataView, offset, 4);
      const chunkSize = dataView.getUint32(offset + 4, true);

      if (chunkId === "fmt ") {
        if (chunkSize < 16) {
          return {
            isValid: false,
            error: `Malformed "fmt " chunk size (${chunkSize} bytes, minimum is 16).`,
          };
        }
        audioFormat = dataView.getUint16(offset + 8, true);
        numChannels = dataView.getUint16(offset + 10, true);
        sampleRate = dataView.getUint32(offset + 12, true);
        byteRate = dataView.getUint32(offset + 16, true);
        bitsPerSample = dataView.getUint16(offset + 22, true);
        fmtParsed = true;
      } else if (chunkId === "data") {
        dataSize = chunkSize;
      }

      // Move to next chunk (padded to 2-byte boundary)
      const paddedSize = chunkSize + (chunkSize % 2);
      offset += 8 + paddedSize;
    }

    if (!fmtParsed) {
      return {
        isValid: false,
        error: 'Corrupted WAV file: Missing required "fmt " subchunk.',
      };
    }

    if (numChannels < 1 || numChannels > 32) {
      return {
        isValid: false,
        error: `Unsupported channel count (${numChannels}). Valid range is 1-32 channels.`,
      };
    }

    if (sampleRate < 4000 || sampleRate > 384000) {
      return {
        isValid: false,
        error: `Out of range sample rate (${sampleRate} Hz). Expected 4000 Hz to 384000 Hz.`,
      };
    }

    if (![8, 16, 24, 32].includes(bitsPerSample)) {
      return {
        isValid: false,
        error: `Unsupported bit depth (${bitsPerSample}-bit). Supported values: 8, 16, 24, 32 bits.`,
      };
    }

    // If data chunk size is missing or invalid, calculate from remaining buffer
    const effectiveDataSize = dataSize > 0 ? Math.min(dataSize, file.size - 44) : Math.max(0, file.size - 44);
    const calculatedByteRate = byteRate > 0 ? byteRate : sampleRate * numChannels * (bitsPerSample / 8);
    const durationSeconds = calculatedByteRate > 0 ? Math.round((effectiveDataSize / calculatedByteRate) * 100) / 100 : 0;

    const audioFormatName = AUDIO_FORMAT_NAMES[audioFormat] || `Format Code ${audioFormat}`;

    const metadata: WavMetadata = {
      fileName: file.name,
      fileSizeBytes: file.size,
      durationSeconds,
      sampleRate,
      channels: numChannels,
      bitDepth: bitsPerSample,
      audioFormat,
      audioFormatName,
      byteRate: calculatedByteRate,
    };

    return {
      isValid: true,
      metadata,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to inspect WAV binary: ${err.message || "Unknown error"}`,
    };
  }
}

function getString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    const byte = view.getUint8(offset + i);
    str += String.fromCharCode(byte);
  }
  return str;
}
