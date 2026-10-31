"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";

export interface AudioBarProps {
  playing: boolean;
  paused: boolean;
  supported: boolean;
  progress: number;
  position: string;
  status: string;
  voices: SpeechSynthesisVoice[];
  voiceURI: string | null;
  rate: number;
  canPrevUnit: boolean;
  canNextUnit: boolean;
  canPrevChapter: boolean;
  canNextChapter: boolean;
  onToggle: () => void;
  onStop: () => void;
  onPrevUnit: () => void;
  onNextUnit: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onVoiceChange: (voiceURI: string) => void;
  onRateChange: (rate: number) => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

function cleanVoiceName(name: string) {
  return name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s+(Desktop|Online)\s*$/i, "")
    .replace(/\s+-\s+.*$/, "");
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
  variant = "ghost",
  className,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant={variant} size="icon" disabled={disabled} onClick={onClick} className={className} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AudioBar(props: AudioBarProps) {
  const {
    playing,
    paused,
    supported,
    progress,
    position,
    status,
    voices,
    voiceURI,
    rate,
    canPrevUnit,
    canNextUnit,
    canPrevChapter,
    canNextChapter,
    onToggle,
    onStop,
    onPrevUnit,
    onNextUnit,
    onPrevChapter,
    onNextChapter,
    onVoiceChange,
    onRateChange,
  } = props;

  return (
    <footer className="relative z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <Progress value={progress} className="w-full gap-0 rounded-none [&_[data-slot=progress-track]]:h-[3px] [&_[data-slot=progress-track]]:rounded-none" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-3 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <IconButton label="Capítulo anterior" disabled={!canPrevChapter || !supported} onClick={onPrevChapter}>
            <SkipBack className="size-4" />
          </IconButton>
          <IconButton label="Unidad anterior" disabled={!canPrevUnit || !supported} onClick={onPrevUnit}>
            <ChevronLeft className="size-5" />
          </IconButton>

          <Button
            onClick={onToggle}
            disabled={!supported}
            size="icon"
            aria-label={playing && !paused ? "Pausar" : "Reproducir"}
            className={cn(
              "mx-1 size-11 rounded-full",
              playing && !paused && "bg-primary text-primary-foreground hover:bg-primary/85"
            )}
          >
            {playing && !paused ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
          </Button>

          <IconButton label="Unidad siguiente" disabled={!canNextUnit || !supported} onClick={onNextUnit}>
            <ChevronRight className="size-5" />
          </IconButton>
          <IconButton label="Capítulo siguiente" disabled={!canNextChapter || !supported} onClick={onNextChapter}>
            <SkipForward className="size-4" />
          </IconButton>
          <IconButton label="Detener" disabled={!playing || !supported} onClick={onStop}>
            <Square className="size-3.5" />
          </IconButton>
        </div>

        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-medium text-foreground">{status}</p>
          <p className="truncate text-xs text-muted-foreground">
            {supported ? position : "Este navegador no admite lectura por voz"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={String(rate)} onValueChange={(value) => onRateChange(Number(value))}>
            <SelectTrigger size="sm" className="w-20" aria-label="Velocidad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATES.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={voiceURI ?? ""} onValueChange={(value) => value && onVoiceChange(value)}>
            <SelectTrigger size="sm" className="w-44 max-w-44" aria-label="Voz">
              <SelectValue placeholder="Voz" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                  <span className="truncate">
                    {cleanVoiceName(voice.name)}
                    <span className="text-muted-foreground"> · {voice.lang}</span>
                  </span>
                </SelectItem>
              ))}
              {!voices.length ? (
                <SelectItem value="__none__" disabled>
                  Cargando voces…
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </div>
    </footer>
  );
}
