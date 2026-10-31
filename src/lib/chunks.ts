import type { Chunk, Unit } from "@/lib/types";

const MAX = 175;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…:»])\s+(?=[A-ZÁÉÍÓÚÜÑ"«¡¿(])/g);
}

export function buildChunks(units: Unit[]): Chunk[] {
  const chunks: Chunk[] = [];

  units.forEach((unit, unitIndex) => {
    const parts: string[] = [];
    for (const sentence of splitSentences(unit.text)) {
      if (sentence.length <= MAX) {
        parts.push(sentence);
        continue;
      }
      let buffer = "";
      for (const word of sentence.split(/\s+/)) {
        if (`${buffer} ${word}`.trim().length > MAX) {
          if (buffer) parts.push(buffer.trim());
          buffer = word;
        } else {
          buffer = `${buffer} ${word}`.trim();
        }
      }
      if (buffer) parts.push(buffer.trim());
    }

    let buffer = "";
    for (const part of parts) {
      if (`${buffer} ${part}`.trim().length <= MAX) {
        buffer = `${buffer} ${part}`.trim();
      } else {
        if (buffer) chunks.push({ text: buffer, unit: unitIndex });
        buffer = part;
      }
    }
    if (buffer) chunks.push({ text: buffer, unit: unitIndex });
    if (!parts.length) chunks.push({ text: unit.text, unit: unitIndex });
  });

  return chunks;
}

export function firstChunkOfUnit(chunks: Chunk[], unitIndex: number): number {
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].unit >= unitIndex) return i;
  }
  return Math.max(chunks.length - 1, 0);
}
