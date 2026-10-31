"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ImageIcon, Menu, Moon, PanelLeft, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AudioBar } from "@/components/reader/audio-bar";
import { NavSidebar } from "@/components/reader/nav-sidebar";
import { PagePanel } from "@/components/reader/page-panel";
import { ReaderView } from "@/components/reader/reader-view";
import { firstChunkOfUnit, buildChunks } from "@/lib/chunks";
import { loadPrefs, loadProgress, savePrefs, saveProgress, type Prefs } from "@/lib/prefs";
import { pickDefaultVoice } from "@/hooks/use-speech";
import { useSpeech } from "@/hooks/use-speech";
import type { BookIndex, SectionData, SectionMeta } from "@/lib/types";

interface FlatChapter {
  sectionId: string;
  chapterId: string;
  index: number;
}

export default function HomePage() {
  const [index, setIndex] = useState<BookIndex | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  const [sectionId, setSectionId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [data, setData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeUnit, setActiveUnit] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(true);

  const cacheRef = useRef<Record<string, SectionData>>({});
  const pendingPlayRef = useRef(false);

  const speech = useSpeech({
    voiceURI: prefs?.voiceURI ?? null,
    rate: prefs?.rate ?? 1,
  });

  const section: SectionMeta | null = useMemo(
    () => index?.sections.find((s) => s.id === sectionId) ?? null,
    [index, sectionId]
  );
  const chapter = useMemo(
    () => data?.chapters.find((c) => c.id === chapterId) ?? null,
    [data, chapterId]
  );
  const chunks = useMemo(() => (chapter ? buildChunks(chapter.units) : []), [chapter]);

  const activePage = chapter?.units[activeUnit]?.page ?? chapter?.page ?? section?.page ?? 1;
  const chapterPages = useMemo(() => {
    if (!chapter) return [];
    const pages = new Set<number>();
    for (const unit of chapter.units) pages.add(unit.page);
    if (chapter.page) pages.add(chapter.page);
    return [...pages].sort((a, b) => a - b);
  }, [chapter]);

  const flatChapters: FlatChapter[] = useMemo(() => {
    if (!index) return [];
    const list: FlatChapter[] = [];
    index.sections.forEach((s) => {
      s.chapters.forEach((c, i) => list.push({ sectionId: s.id, chapterId: c.id, index: i }));
    });
    return list;
  }, [index]);

  const positionInFlat = flatChapters.findIndex((c) => c.chapterId === chapterId);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const openChapter = useCallback(
    (nextSectionId: string, nextChapterId: string, options?: { unit?: number; autoplay?: boolean }) => {
      speech.stop();
      setChunkIndex(0);
      setActiveUnit(options?.unit ?? 0);
      setSectionId(nextSectionId);
      setChapterId(nextChapterId);
      setNavSheetOpen(false);
      if (options?.autoplay) pendingPlayRef.current = true;
    },
    [speech]
  );

  const startPlayback = useCallback(
    (fromUnit: number) => {
      if (!chunks.length) return;
      const start = firstChunkOfUnit(chunks, fromUnit);
      speech.speak(
        chunks.map((c) => c.text),
        {
          onChunk: (i) => {
            const chunk = chunks[i];
            if (chunk) {
              setChunkIndex(i);
              setActiveUnit(chunk.unit);
            }
          },
          onComplete: () => {
            const current = positionInFlat;
            const next = flatChapters[current + 1];
            if (next) openChapter(next.sectionId, next.chapterId, { autoplay: true });
          },
        },
        start
      );
    },
    [chunks, speech, openChapter, positionInFlat, flatChapters]
  );

  useEffect(() => {
    const stored = loadPrefs();
    setPrefs(stored);
    document.documentElement.classList.toggle("dark", stored.theme === "dark");
    setSidebarOpen(stored.sidebar);
    setImageOpen(stored.showImage);

    let cancelled = false;
    fetch("/data/index.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<BookIndex>;
      })
      .then((idx) => {
        if (cancelled) return;
        setIndex(idx);
        const progress = loadProgress();
        const valid =
          progress &&
          idx.sections.some((s) => s.id === progress.sectionId && s.chapters.some((c) => c.id === progress.chapterId));
        if (valid && progress) {
          setSectionId(progress.sectionId);
          setChapterId(progress.chapterId);
          setActiveUnit(progress.unit);
        } else {
          const fallback = idx.sections.find((s) => s.id === "acerca") ?? idx.sections[0];
          const firstChapter = fallback?.chapters[0];
          if (fallback && firstChapter) {
            setSectionId(fallback.id);
            setChapterId(firstChapter.id);
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el índice del libro.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    const cached = cacheRef.current[sectionId];
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/data/${sectionId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SectionData>;
      })
      .then((sectionData) => {
        if (cancelled) return;
        cacheRef.current[sectionId] = sectionData;
        setData(sectionData);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError("No se pudo cargar el contenido de esta sección.");
      });
    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  useEffect(() => {
    if (!prefs || !speech.voices.length) return;
    const known = prefs.voiceURI && speech.voices.some((v) => v.voiceURI === prefs.voiceURI);
    if (known) return;
    const chosen = pickDefaultVoice(speech.voices);
    if (chosen && chosen !== prefs.voiceURI) updatePrefs({ voiceURI: chosen });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, speech.voices]);

  useEffect(() => {
    if (!ready || !sectionId || !chapterId) return;
    saveProgress({ sectionId, chapterId, unit: activeUnit });
  }, [ready, sectionId, chapterId, activeUnit]);

  useEffect(() => {
    if (!pendingPlayRef.current || loading || !chapter || !chunks.length) return;
    pendingPlayRef.current = false;
    const timer = window.setTimeout(() => startPlayback(0), 120);
    return () => window.clearTimeout(timer);
  }, [pendingPlayRef, loading, chapter, chunks, startPlayback]);

  const handleTogglePlayback = () => {
    if (speech.playing) {
      if (speech.paused) speech.resume();
      else speech.pause();
      return;
    }
    startPlayback(activeUnit);
  };

  const handleStop = () => speech.stop();

  const goToUnit = (unitIndex: number, autoplayIfPlaying = true) => {
    if (!chapter) return;
    const target = Math.max(0, Math.min(unitIndex, chapter.units.length - 1));
    const start = firstChunkOfUnit(chunks, target);
    setActiveUnit(target);
    setChunkIndex(start);
    if (speech.playing && autoplayIfPlaying) speech.jump(start);
  };

  const goToAdjacentUnit = (delta: number) => goToUnit(activeUnit + delta);

  const goToAdjacentChapter = (delta: number) => {
    const current = flatChapters.findIndex((c) => c.chapterId === chapterId);
    const next = flatChapters[current + delta];
    if (next) openChapter(next.sectionId, next.chapterId, { autoplay: speech.playing });
  };

  const handleRateChange = (rate: number) => {
    updatePrefs({ rate });
    if (speech.playing) window.setTimeout(() => speech.jump(chunkIndex), 0);
  };

  const handleVoiceChange = (voiceURI: string) => {
    updatePrefs({ voiceURI });
    if (speech.playing) window.setTimeout(() => speech.jump(chunkIndex), 0);
  };

  const toggleTheme = () => {
    if (!prefs) return;
    const theme = prefs.theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    updatePrefs({ theme });
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      savePrefs({ ...prefs!, sidebar: !prev });
      return !prev;
    });
  };

  const toggleImage = () => {
    const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches;
    if (wide) {
      setImageOpen((prev) => {
        savePrefs({ ...prefs!, showImage: !prev });
        return !prev;
      });
    } else {
      setImageSheetOpen(true);
    }
  };

  const handlePageSelect = (page: number) => {
    if (!chapter) return;
    const unit = chapter.units.findIndex((u) => u.page === page);
    if (unit >= 0) goToUnit(unit, speech.playing);
  };

  const status = section && chapter ? `${section.title} · ${chapter.title}` : "El Libro Completo de Enoc";
  const progress =
    chunks.length > 0 ? Math.round(((chunkIndex + 1) / chunks.length) * 100) : 0;
  const unitLabel = chapter
    ? chapter.units[activeUnit]?.n != null
      ? `Versículo ${chapter.units[activeUnit].n}`
      : `Unidad ${activeUnit + 1}`
    : "";

  const imagePanel = chapter ? (
    <PagePanel page={activePage} pages={chapterPages} onPageSelect={handlePageSelect} />
  ) : (
    <Skeleton className="m-3 h-[calc(100%-1.5rem)] rounded-md" />
  );

  if (!ready || !index) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <BookOpen className="size-9 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">El Libro Completo de Enoc</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "Cargando índice, capítulos y páginas…"}
          </p>
        </motion.div>
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setNavSheetOpen(true)}
          aria-label="Abrir índice"
        >
          <Menu className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={toggleSidebar}
          aria-label="Mostrar u ocultar índice"
        >
          <PanelLeft className="size-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <BookOpen className="hidden size-5 shrink-0 text-primary sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-sm leading-tight font-semibold">{index.title}</h1>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{index.subtitle}</p>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={toggleImage} aria-label="Imagen de la página" />}>
            <ImageIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Imagen de la página</TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
          {prefs?.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      <AudioBar
        playing={speech.playing}
        paused={speech.paused}
        supported={speech.supported}
        progress={progress}
        position={chapter ? `Unidad ${activeUnit + 1} de ${chapter.count} · ${progress}%` : ""}
        status={status + (unitLabel ? ` — ${unitLabel}` : "")}
        voices={speech.voices}
        voiceURI={prefs?.voiceURI ?? null}
        rate={prefs?.rate ?? 1}
        canPrevUnit={activeUnit > 0}
        canNextUnit={!!chapter && activeUnit < chapter.units.length - 1}
        canPrevChapter={positionInFlat > 0}
        canNextChapter={positionInFlat >= 0 && positionInFlat < flatChapters.length - 1}
        onToggle={handleTogglePlayback}
        onStop={handleStop}
        onPrevUnit={() => goToAdjacentUnit(-1)}
        onNextUnit={() => goToAdjacentUnit(1)}
        onPrevChapter={() => goToAdjacentChapter(-1)}
        onNextChapter={() => goToAdjacentChapter(1)}
        onVoiceChange={handleVoiceChange}
        onRateChange={handleRateChange}
      />

      <div className="flex min-h-0 flex-1">
        {sidebarOpen ? (
          <aside className="hidden w-72 shrink-0 border-border border-e lg:block">
            <NavSidebar
              index={index}
              sectionId={sectionId ?? ""}
              chapterId={chapterId ?? ""}
              onSelect={(sid, cid) => openChapter(sid, cid)}
            />
          </aside>
        ) : null}

        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={error ?? "reader"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              {error && !chapter ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {error}
                </div>
              ) : (
                <ReaderView
                  section={section}
                  chapter={chapter}
                  loading={loading || !chapter}
                  activeUnit={activeUnit}
                  onUnitClick={(unit) => goToUnit(unit, speech.playing)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {imageOpen ? (
          <aside className="hidden w-[360px] shrink-0 xl:block 2xl:w-[420px]">{imagePanel}</aside>
        ) : null}
      </div>

      <Sheet open={navSheetOpen} onOpenChange={setNavSheetOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-72">
          <SheetTitle className="sr-only">Índice</SheetTitle>
          <NavSidebar
            index={index}
            sectionId={sectionId ?? ""}
            chapterId={chapterId ?? ""}
            onSelect={(sid, cid) => openChapter(sid, cid)}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={imageSheetOpen} onOpenChange={setImageSheetOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Página escaneada</SheetTitle>
          <div className="min-h-0 flex-1">{imagePanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
