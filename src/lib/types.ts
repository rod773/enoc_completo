export type SectionKind = "front" | "book" | "extra";

export interface Unit {
  n: number | null;
  text: string;
  page: number;
}

export interface ChapterMeta {
  id: string;
  num?: number;
  title: string;
  subtitle?: string;
  page?: number;
  count: number;
}

export interface Chapter extends ChapterMeta {
  units: Unit[];
}

export interface SectionMeta {
  id: string;
  kind: SectionKind;
  num?: number;
  title: string;
  page: number;
  chapters: ChapterMeta[];
}

export interface BookIndex {
  title: string;
  subtitle: string;
  sections: SectionMeta[];
}

export interface SectionData {
  id: string;
  kind: SectionKind;
  title: string;
  chapters: Chapter[];
}

export interface Chunk {
  text: string;
  unit: number;
}
