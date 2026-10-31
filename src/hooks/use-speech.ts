"use client";

import { useEffect, useRef, useState } from "react";

export interface SpeechCallbacks {
  onChunk?: (index: number) => void;
  onComplete?: () => void;
}

export interface SpeechOptions {
  voiceURI: string | null;
  rate: number;
}

const MALE_HINT =
  /(sebastian|sebasti[aá]n|alvaro|[aá]lvaro|alonso|jorge|miguel|ra[uú]l|diego|david|andrew|guy|roger|male|hombre)/i;
const FEMALE_HINT = /(helena|sabina|paloma|paola|m[oó]nica|laura|esperanza|elvira|carmen|isidora|camila|female|mujer)/i;

export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.toLowerCase();
    let s = 0;
    if (lang.startsWith("es")) s += 100;
    if (lang === "es-es") s += 10;
    if (MALE_HINT.test(v.name)) s += 50;
    if (FEMALE_HINT.test(v.name)) s -= 60;
    if (v.localService) s += 5;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a));
}

export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): string | null {
  const ranked = rankVoices(voices);
  const maleSpanish = ranked.find((v) => v.lang.toLowerCase().startsWith("es") && MALE_HINT.test(v.name));
  const spanish = ranked.find((v) => v.lang.toLowerCase().startsWith("es"));
  return (maleSpanish ?? spanish ?? ranked[0] ?? null)?.voiceURI ?? null;
}

export function useSpeech(options: SpeechOptions) {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  const chunksRef = useRef<string[]>([]);
  const epochRef = useRef(0);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const callbacksRef = useRef<SpeechCallbacks>({});
  const voiceURIRef = useRef<string | null>(options.voiceURI);
  const rateRef = useRef(options.rate);

  voiceURIRef.current = options.voiceURI;
  rateRef.current = options.rate;

  const voiceByURI = (uri: string | null) =>
    uri ? voices.find((v) => v.voiceURI === uri) ?? null : null;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    let done = false;
    const load = () => {
      const list = synth.getVoices();
      if (!list.length || (done && list.length === voices.length)) return;
      if (list.length) {
        done = true;
        setVoices(rankVoices(list));
      }
    };
    load();
    synth.addEventListener("voiceschanged", load);
    const poll = window.setInterval(load, 250);
    const timeout = window.setTimeout(() => window.clearInterval(poll), 4000);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const timer = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (playingRef.current && !pausedRef.current && synth.speaking && !synth.paused) {
        synth.resume();
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      playingRef.current = false;
    };
  }, []);

  function speakChunk(chunkIndex: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const text = chunksRef.current[chunkIndex];

    if (text === undefined) {
      playingRef.current = false;
      pausedRef.current = false;
      setPlaying(false);
      setPaused(false);
      callbacksRef.current.onComplete?.();
      return;
    }

    const epoch = ++epochRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voiceByURI(voiceURIRef.current);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "es-ES";
    }
    utterance.rate = Math.min(Math.max(rateRef.current, 0.5), 3);
    utterance.pitch = 1;

    utterance.onend = () => {
      if (epoch !== epochRef.current || !playingRef.current) return;
      speakChunk(chunkIndex + 1);
    };
    utterance.onerror = (event) => {
      if (epoch !== epochRef.current || !playingRef.current) return;
      if (event.error === "interrupted" || event.error === "canceled") return;
      speakChunk(chunkIndex + 1);
    };

    setIndex(chunkIndex);
    callbacksRef.current.onChunk?.(chunkIndex);
    synth.speak(utterance);
  }

  function speak(chunks: string[], callbacks: SpeechCallbacks = {}, startIndex = 0) {
    if (!chunks.length) {
      callbacks.onComplete?.();
      return;
    }
    const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    if (!synth) {
      setSupported(false);
      callbacks.onComplete?.();
      return;
    }
    epochRef.current += 1;
    synth.cancel();
    chunksRef.current = chunks;
    callbacksRef.current = callbacks;
    playingRef.current = true;
    pausedRef.current = false;
    setPlaying(true);
    setPaused(false);
    setIndex(startIndex);
    // A short delay lets the cancel() above settle in Chromium.
    window.setTimeout(() => {
      if (playingRef.current) speakChunk(startIndex);
    }, 60);
  }

  function pause() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    pausedRef.current = true;
    setPaused(true);
  }

  function resume() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    pausedRef.current = false;
    setPaused(false);
    playingRef.current = true;
    setPlaying(true);
  }

  function stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      epochRef.current += 1;
      window.speechSynthesis.cancel();
    }
    playingRef.current = false;
    pausedRef.current = false;
    setPlaying(false);
    setPaused(false);
  }

  function jump(chunkIndex: number, shouldPlay = true) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const wasPlaying = playingRef.current;
    epochRef.current += 1;
    window.speechSynthesis.cancel();
    setIndex(chunkIndex);
    if (shouldPlay && wasPlaying) {
      pausedRef.current = false;
      setPaused(false);
      playingRef.current = true;
      window.setTimeout(() => {
        if (playingRef.current) speakChunk(chunkIndex);
      }, 60);
    }
  }

  return {
    supported,
    voices,
    playing,
    paused,
    index,
    speak,
    pause,
    resume,
    stop,
    jump,
  };
}
