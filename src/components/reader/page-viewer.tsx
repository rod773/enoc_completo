"use client";

import { useEffect } from "react";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";

interface PageViewerProps {
  page: number;
  title: string;
  subtitle?: string;
  pageProgress: number;
  reading: boolean;
}

const pad = (value: number) => String(value).padStart(3, "0");

export function PageViewer({ page, title, subtitle, pageProgress, reading }: PageViewerProps) {
  const { ref, scrollTo, stop } = useSmoothScroll<HTMLDivElement>("y");

  useEffect(() => {
    stop();
    if (ref.current) ref.current.scrollTop = 0;
  }, [page, ref, stop]);

  useEffect(() => {
    if (!reading) return;
    const el = ref.current;
    if (!el) return;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    if (max < 4) return;
    scrollTo(pageProgress * max, 700);
  }, [reading, pageProgress, scrollTo, ref]);

  return (
    <div ref={ref} className="h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 p-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-sm opacity-70">{subtitle}</p> : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- páginas escaneadas del PDF */}
        <img
          src={`/paginas/pagina_${pad(page)}.png`}
          alt={`Página ${page} del libro`}
          className="max-w-full border"
        />
      </div>
    </div>
  );
}
