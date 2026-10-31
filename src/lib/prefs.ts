export interface Prefs {
  voiceURI: string | null;
  rate: number;
  showImage: boolean;
  theme: "light" | "dark";
  sidebar: boolean;
}

export interface Progress {
  sectionId: string;
  chapterId: string;
  unit: number;
}

export const DEFAULT_PREFS: Prefs = {
  voiceURI: null,
  rate: 1,
  showImage: true,
  theme: "light",
  sidebar: true,
};

const PREFS_KEY = "enoc.prefs.v1";
const PROGRESS_KEY = "enoc.progress.v1";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function loadPrefs(): Prefs {
  return { ...DEFAULT_PREFS, ...(read<Prefs>(PREFS_KEY) ?? {}) };
}

export function savePrefs(prefs: Prefs) {
  write(PREFS_KEY, prefs);
}

export function loadProgress(): Progress | null {
  return read<Progress>(PROGRESS_KEY);
}

export function saveProgress(progress: Progress) {
  write(PROGRESS_KEY, progress);
}
