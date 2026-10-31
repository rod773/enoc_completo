"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "cn";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import type { Chapter, SectionMeta } from "@/lib/types";

interface ReaderViewProps {
  section?: SectionMeta | null;
  chapter?: Chapter | null;
  loading: boolean;
  activeUnit: number;
  onUnitClick: (unitIndex: number) => void;
}

export function ReaderView({ section, chapter, loading, activeUnit, onUnitClick }: ReaderViewProps) {
  const { ref, scrollToElement } = useSmoothScroll<HTMLDivElement>();

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const element = container.querySelector<HTMLElement>(`[data-unit="${activeUnit}"]`);
    scrollToElement(element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnit, chapter?.id]);

  if (loading || !chapter) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden px-6 py-10 lg:px-12">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${90 - (i % 4) * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative h-full overflow-y-auto scroll-smooth"
      data-slot="reader-scroll"
    >
      <div className="mx-auto w-full max-w-3xl px-5 pt-8 pb-40 sm:px-8 lg:px-10">
        <motion.header
          key={`${chapter.id}-header`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 border-b pb-6"
        >
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {section?.title}
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {chapter.title}
          </h1>
          {chapter.subtitle && chapter.subtitle !== chapter.title ? (
            <p className="reading mt-2 text-lg text-muted-foreground italic">{chapter.subtitle}</p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {chapter.count} {chapter.count === 1 ? "unidad" : "unidades"} · página {chapter.page ?? section?.page}
          </p>
        </motion.header>

        <motion.div
          key={chapter.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-1.5"
        >
          {chapter.units.map((unit, i) => {
            const isActive = i === activeUnit;
            return (
              <div
                key={i}
                data-unit={i}
                onClick={() => onUnitClick(i)}
                className={cn(
                  "relative cursor-pointer rounded-lg px-4 py-2.5 transition-colors duration-200",
                  isActive ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-unit-bar"
                    className="absolute top-1 bottom-1 -left-1 w-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <p className={cn("reading text-[1.075rem] leading-7", isActive ? "text-foreground" : "text-foreground/85")}>
                  {unit.n !== null ? (
                    <span className="mr-2 inline-block min-w-5 text-xs font-semibold text-primary tabular-nums align-top">
                      {unit.n}
                    </span>
                  ) : null}
                  {unit.text}
                </p>
              </div>
            );
          })}
        </motion.div>

        <div className="h-8" />
      </div>
    </div>
  );
}
