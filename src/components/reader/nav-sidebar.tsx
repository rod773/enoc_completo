"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, ScrollText, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import type { BookIndex } from "@/lib/types";

interface NavSidebarProps {
  index: BookIndex;
  sectionId: string;
  chapterId: string;
  onSelect: (sectionId: string, chapterId: string) => void;
}

const GROUPS = [
  { kind: "front", label: "Introducción", icon: ScrollText },
  { kind: "book", label: "Los cinco libros", icon: BookOpen },
  { kind: "extra", label: "Anexos", icon: Sparkles },
] as const;

export function NavSidebar({ index, sectionId, chapterId, onSelect }: NavSidebarProps) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => overrides[id] ?? id === sectionId;

  useEffect(() => {
    const active = document.getElementById(`nav-${chapterId}`);
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sectionId, chapterId]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3.5">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Índice</p>
        <p className="mt-1 text-sm text-foreground/80">{index.title}</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-3 py-4">
          {GROUPS.map((group) => {
            const sections = index.sections.filter((s) => s.kind === group.kind);
            if (!sections.length) return null;
            const Icon = group.icon;
            return (
              <div key={group.kind}>
                <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <Icon className="size-3.5" />
                  {group.label}
                </p>

                <div className="space-y-1">
                  {sections.map((section) => {
                    const isActiveSection = section.id === sectionId;
                    return (
                      <Collapsible
                        key={section.id}
                        open={isOpen(section.id)}
                        onOpenChange={(value) => setOverrides((prev) => ({ ...prev, [section.id]: value }))}
                      >
                        <CollapsibleTrigger
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60",
                            isActiveSection ? "font-medium text-foreground" : "text-foreground/80"
                          )}
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 shrink-0 text-muted-foreground transition-transform",
                              (isOpen(section.id)) && "rotate-90"
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {section.num ? `${section.num}. ` : ""}
                            {section.title}
                          </span>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ms-3 mt-0.5 space-y-0.5 border-border/70 ps-2 border-s">
                            {section.chapters.map((chapter) => {
                              const isActive = chapter.id === chapterId;
                              return (
                                <button
                                  key={chapter.id}
                                  id={`nav-${chapter.id}`}
                                  onClick={() => onSelect(section.id, chapter.id)}
                                  className={cn(
                                    "relative block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                                    isActive
                                      ? "text-accent-foreground"
                                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                  )}
                                >
                                  {isActive ? (
                                    <motion.span
                                      layoutId="nav-active"
                                      className="absolute inset-0 rounded-md bg-accent"
                                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                                    />
                                  ) : null}
                                  <span className="relative z-10 line-clamp-2">
                                    {chapter.num ? `${chapter.num}. ` : ""}
                                    {chapter.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
