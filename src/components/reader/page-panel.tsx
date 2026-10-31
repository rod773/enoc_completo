"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "cn";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";

interface PagePanelProps {
  page: number;
  pages: number[];
  onPageSelect?: (page: number) => void;
}

const pad = (value: number) => String(value).padStart(3, "0");

export function PagePanel({ page, pages, onPageSelect }: PagePanelProps) {
  const { ref: viewerRef, scrollTo: viewerScrollTo } = useSmoothScroll<HTMLDivElement>("y");
  const { ref: stripRef, centerElement: stripCenter } = useSmoothScroll<HTMLDivElement>("x");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    viewerScrollTo(0, 0.45);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const container = stripRef.current;
    const thumb = container?.querySelector<HTMLElement>(`[data-thumb="${page}"]`);
    if (container && thumb) stripCenter(thumb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col border-border lg:border-s">
      <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">
          Página <span className="text-sm font-semibold text-foreground tabular-nums">{page}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {pages.length} {pages.length === 1 ? "página" : "páginas"} en este capítulo
        </p>
      </div>

      <div ref={viewerRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {!failed ? (
              <img
                src={`/paginas/pagina_${pad(page)}.png`}
                alt={`Página ${page} del libro`}
                onError={() => setFailed(true)}
                className="w-full rounded-md border border-border bg-background shadow-sm"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                Vista previa de la página no disponible
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={stripRef}
        className="relative flex gap-1.5 overflow-x-auto border-border border-t px-3 py-2"
      >
        {pages.map((p) => (
          <button
            key={p}
            data-thumb={p}
            onClick={() => onPageSelect?.(p)}
            title={`Ir a la página ${p}`}
            className={cn(
              "relative shrink-0 overflow-hidden rounded border transition-all duration-200",
              p === page
                ? "border-primary ring-2 ring-primary/30"
                : "border-border opacity-70 hover:opacity-100"
            )}
          >
            <img
              src={`/paginas/pagina_${pad(p)}.png`}
              alt=""
              loading="lazy"
              className="h-14 w-10 bg-background object-cover object-top"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-px text-center text-[9px] text-white tabular-nums">
              {p}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
