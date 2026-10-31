"use client";

import { cn } from "cn";

interface PageThumbsProps {
  page: number;
  pages: number[];
  onPageSelect?: (page: number) => void;
}

const pad = (value: number) => String(value).padStart(3, "0");

export function PageThumbs({ page, pages, onPageSelect }: PageThumbsProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-border lg:border-s">
      <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">
          Página <span className="text-sm font-semibold text-foreground tabular-nums">{page}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {pages.length} {pages.length === 1 ? "página" : "páginas"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-4 gap-2 xl:grid-cols-5 2xl:grid-cols-6">
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageSelect?.(p)}
              title={`Ir a la página ${p}`}
              className={cn(
                "relative shrink-0 overflow-hidden rounded border transition-opacity duration-150",
                p === page
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- páginas escaneadas del PDF */}
              <img
                src={`/paginas/pagina_${pad(p)}.png`}
                alt=""
                loading="lazy"
                className="h-16 w-12 bg-background object-cover object-top"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-px text-center text-[9px] text-white tabular-nums">
                {p}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
